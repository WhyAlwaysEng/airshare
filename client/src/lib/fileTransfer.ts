import { getWebRTCManager } from "./webrtc";
import { computeFileHash, computeBlobHash } from "./crypto";
import { triggerDownload } from "./sanitize";
import type { DataChannelMessage, FileMetadataMessage } from "@/types";

const CHUNK_SIZE = 32 * 1024; // 32KB chunks

export interface TransferCallbacks {
  onProgress?: (fileIndex: number, progress: number, speed: number) => void;
  onFileReady?: (fileIndex: number, blob: Blob, filename: string) => void;
  onConsentRequired?: (
    transferId: string,
    peerId: string,
    files: { name: string; size: number; mime: string }[]
  ) => void;
  onError?: (fileIndex: number, error: string) => void;
  onComplete?: (transferId: string) => void;
}

// ─── Sender Engine ─────────────────────────────────────────

export class FileSender {
  private webrtc = getWebRTCManager();
  private transferId: string;
  private peerId: string;
  private files: File[];
  private callbacks: TransferCallbacks;
  private cancelled = false;

  constructor(
    transferId: string,
    peerId: string,
    files: File[],
    callbacks: TransferCallbacks = {}
  ) {
    this.transferId = transferId;
    this.peerId = peerId;
    this.files = files;
    this.callbacks = callbacks;
  }

  async start() {
    for (let i = 0; i < this.files.length; i++) {
      if (this.cancelled) break;
      await this.sendFile(i);
    }
  }

  private async sendFile(fileIndex: number) {
    const file = this.files[fileIndex];
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    // Compute SHA-256 hash of the entire file
    const sha256 = await computeFileHash(file);

    // Send metadata
    this.webrtc.sendMessage(this.peerId, {
      type: "metadata",
      transferId: this.transferId,
      fileIndex,
      name: file.name,
      size: file.size,
      mime: file.type || "application/octet-stream",
      sha256,
      totalChunks,
    });

    // Wait for accept
    const accepted = await this.waitForAccept(fileIndex);
    if (!accepted || this.cancelled) return;

    // Send chunks with backpressure
    const startTime = Date.now();
    let bytesSent = 0;

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      if (this.cancelled) return;

      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      const buffer = await chunk.arrayBuffer();

      // Wait for backpressure to clear
      while (!this.webrtc.sendBinary(this.peerId, buffer)) {
        await this.webrtc.waitForBufferDrain(this.peerId);
        if (this.cancelled) return;
      }

      bytesSent += buffer.byteLength;

      // Report progress
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = elapsed > 0 ? bytesSent / elapsed : 0;
      const progress = (bytesSent / file.size) * 100;

      this.callbacks.onProgress?.(fileIndex, progress, speed);
    }

    // Signal completion
    this.webrtc.sendMessage(this.peerId, {
      type: "complete",
      transferId: this.transferId,
      fileIndex,
    });

    this.callbacks.onProgress?.(fileIndex, 100, 0);
  }

  private waitForAccept(fileIndex: number): Promise<boolean> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        unsub();
        resolve(false);
      }, 30000); // 30s timeout

      const unsub = this.webrtc.onMessage((peerId, message) => {
        if (peerId !== this.peerId) return;
        if (
          message.type === "accept" &&
          (message as any).transferId === this.transferId &&
          (message as any).fileIndex === fileIndex
        ) {
          clearTimeout(timeout);
          unsub();
          resolve(true);
        }
        if (
          message.type === "decline" &&
          (message as any).transferId === this.transferId &&
          (message as any).fileIndex === fileIndex
        ) {
          clearTimeout(timeout);
          unsub();
          resolve(false);
        }
      });
    });
  }

  cancel() {
    this.cancelled = true;
  }
}

// ─── Receiver Engine ───────────────────────────────────────

interface IncomingFileState {
  metadata: FileMetadataMessage;
  chunks: ArrayBuffer[];
  receivedChunks: number;
  complete: boolean;
}

export class FileReceiver {
  private webrtc = getWebRTCManager();
  private peerId: string;
  private callbacks: TransferCallbacks;
  private incomingFiles = new Map<string, IncomingFileState>(); // key: `${transferId}_${fileIndex}`
  private binaryBuffer = new Map<string, Uint8Array[]>(); // binary chunk accumulator
  private unsubMessage: (() => void) | null = null;
  private unsubBinary: (() => void) | null = null;

  constructor(peerId: string, callbacks: TransferCallbacks = {}) {
    this.peerId = peerId;
    this.callbacks = callbacks;
  }

  start() {
    this.unsubMessage = this.webrtc.onMessage((peerId, message) => {
      if (peerId !== this.peerId) return;
      this.handleMessage(message);
    });

    // Listen for binary data via the raw channel
    // We need to access the DataChannel directly for binary messages
    const channel = (this.webrtc as any).channels.get(this.peerId) as RTCDataChannel | undefined;
    if (channel) {
      this.setupBinaryListener(channel);
    }
  }

  private setupBinaryListener(channel: RTCDataChannel) {
    // Override onmessage to also handle binary
    const originalOnMessage = channel.onmessage;
    channel.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        this.handleBinary(event.data);
      } else {
        // Text message — let the normal handler process it
        originalOnMessage?.call(channel, event);
      }
    };
  }

  stop() {
    this.unsubMessage?.();
    this.unsubBinary?.();
  }

  // Wait for metadata from sender before accepting
  waitForMetadata(): Promise<FileMetadataMessage> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        unsub();
        reject(new Error("Timeout waiting for metadata (15s)"));
      }, 15000);

      const unsub = this.webrtc.onMessage((peerId, message) => {
        if (peerId !== this.peerId) return;
        if (message.type === "metadata") {
          clearTimeout(timeout);
          unsub();
          resolve(message);
        }
      });
    });
  }

  private handleMessage(message: DataChannelMessage) {
    switch (message.type) {
      case "metadata":
        this.handleMetadata(message);
        break;
      case "complete":
        this.handleComplete(message.transferId, message.fileIndex);
        break;
    }
  }

  private handleMetadata(meta: FileMetadataMessage) {
    const key = `${meta.transferId}_${meta.fileIndex}`;

    this.incomingFiles.set(key, {
      metadata: meta,
      chunks: [],
      receivedChunks: 0,
      complete: false,
    });

    this.binaryBuffer.set(key, []);

    // Notify consent required
    this.callbacks.onConsentRequired?.(meta.transferId, this.peerId, [
      { name: meta.name, size: meta.size, mime: meta.mime },
    ]);
  }

  handleBinary(data: ArrayBuffer) {
    // We need to figure out which file this binary chunk belongs to.
    // Since DataChannel messages are ordered, the last metadata/complete
    // message tells us which file we're receiving chunks for.
    // For simplicity, we assume one file at a time.
    const keys = Array.from(this.incomingFiles.keys());
    const activeKey = keys.find((k) => {
      const state = this.incomingFiles.get(k);
      return state && !state.complete && state.receivedChunks < state.metadata.totalChunks;
    });

    if (!activeKey) return;

    const state = this.incomingFiles.get(activeKey)!;
    state.chunks.push(data);
    state.receivedChunks++;

    // Progress
    const progress = (state.receivedChunks / state.metadata.totalChunks) * 100;
    this.callbacks.onProgress?.(state.metadata.fileIndex, progress, 0);
  }

  private async handleComplete(transferId: string, fileIndex: number) {
    const key = `${transferId}_${fileIndex}`;
    const state = this.incomingFiles.get(key);
    if (!state) return;

    state.complete = true;

    // Assemble chunks into Blob
    const blob = new Blob(state.chunks, { type: state.metadata.mime });

    // Verify SHA-256
    this.callbacks.onProgress?.(fileIndex, 100, 0); // Show verifying state

    try {
      const receivedHash = await computeBlobHash(blob);
      if (receivedHash !== state.metadata.sha256) {
        this.callbacks.onError?.(fileIndex, "File integrity check failed (SHA-256 mismatch)");
        return;
      }

      // Hash matches — trigger download
      triggerDownload(blob, state.metadata.name);

      this.callbacks.onFileReady?.(fileIndex, blob, state.metadata.name);
      this.callbacks.onComplete?.(transferId);
    } catch (err) {
      this.callbacks.onError?.(fileIndex, `Verification failed: ${err}`);
    } finally {
      // Cleanup
      this.incomingFiles.delete(key);
      this.binaryBuffer.delete(key);
    }
  }

  acceptFile(transferId: string, fileIndex: number) {
    this.webrtc.sendMessage(this.peerId, {
      type: "accept",
      transferId,
      fileIndex,
    });
  }

  declineFile(transferId: string, fileIndex: number) {
    this.webrtc.sendMessage(this.peerId, {
      type: "decline",
      transferId,
      fileIndex,
    });
    // Cleanup
    const key = `${transferId}_${fileIndex}`;
    this.incomingFiles.delete(key);
    this.binaryBuffer.delete(key);
  }
}
