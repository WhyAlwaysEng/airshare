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

    console.log("[FileSender] Computing hash for", file.name);
    const sha256 = await computeFileHash(file);
    console.log("[FileSender] Hash computed, sending metadata");

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
    console.log("[FileSender] Metadata sent, starting chunks...");

    // Consent already handled via WebSocket — send chunks immediately
    const startTime = Date.now();
    let bytesSent = 0;
    console.log(`[FileSender] Starting chunk send: ${totalChunks} chunks, ${file.size} bytes`);

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      if (this.cancelled) return;

      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      const buffer = await chunk.arrayBuffer();

      // Wait for backpressure to clear
      let retries = 0;
      while (!this.webrtc.sendBinary(this.peerId, buffer)) {
        if (retries === 0) {
          console.log(`[FileSender] Backpressure: waiting... chunk ${chunkIndex}/${totalChunks}`);
        }
        retries++;
        if (retries > 100) {
          console.error("[FileSender] Backpressure timeout (too many retries)");
          this.callbacks.onError?.(fileIndex, "Transfer stalled: backpressure timeout");
          return;
        }
        await this.webrtc.waitForBufferDrain(this.peerId);
        if (this.cancelled) return;
      }

      bytesSent += buffer.byteLength;

      // Report progress
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = elapsed > 0 ? bytesSent / elapsed : 0;
      const progress = (bytesSent / file.size) * 100;

      if (chunkIndex % 10 === 0 || chunkIndex === totalChunks - 1) {
        console.log(`[FileSender] Sent chunk ${chunkIndex + 1}/${totalChunks} (${Math.round(progress)}%)`);
      }

      this.callbacks.onProgress?.(fileIndex, progress, speed);
    }

    // Signal completion
    this.webrtc.sendMessage(this.peerId, {
      type: "complete",
      transferId: this.transferId,
      fileIndex,
    });

    this.callbacks.onProgress?.(fileIndex, 100, 0);
    console.log("[FileSender] File complete:", file.name);
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
  private unsubMessage: (() => void) | null = null;
  private unsubBinary: (() => void) | null = null;
  private unsubChannel: (() => void) | null = null;

  constructor(peerId: string, callbacks: TransferCallbacks = {}) {
    this.peerId = peerId;
    this.callbacks = callbacks;
  }

  start() {
    // Listen for text messages (metadata, complete) via WebRTC manager
    this.unsubMessage = this.webrtc.onMessage((peerId, message) => {
      if (peerId !== this.peerId) return;
      this.handleMessage(message);
    });

    // Listen for binary messages via WebRTC manager
    this.unsubBinary = this.webrtc.onBinary((peerId, data) => {
      if (peerId !== this.peerId) return;
      this.handleBinary(data);
    });

    // Also listen for channel open to set up binary listener
    this.unsubChannel = this.webrtc.onChannel((pid, channel) => {
      if (pid === this.peerId) {
        this.setupBinaryListener(channel);
      }
    });

    // Check if channel is already open
    const stats = this.webrtc.getChannelStats(this.peerId);
    if (stats && stats.readyState === "open") {
      // Channel already open — need to access it directly
      // The onChannel handler from usePeers already set up text handling
      // Binary handling is done via onBinary which was registered above
    }
  }

  private setupBinaryListener(channel: RTCDataChannel) {
    // Override onmessage to also handle binary
    const originalOnMessage = channel.onmessage;
    channel.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        this.handleBinary(event.data);
      } else if (originalOnMessage) {
        // Text message — let the normal handler process it
        originalOnMessage.call(channel, event);
      }
    };
  }

  stop() {
    this.unsubMessage?.();
    this.unsubBinary?.();
    this.unsubChannel?.();
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

    console.log("[FileReceiver] Received metadata:", meta.name, `(${meta.size} bytes, ${meta.totalChunks} chunks)`);
  }

  handleBinary(data: ArrayBuffer) {
    // Find the active (incomplete) file transfer
    const keys = Array.from(this.incomingFiles.keys());
    const activeKey = keys.find((k) => {
      const state = this.incomingFiles.get(k);
      return state && !state.complete && state.receivedChunks < state.metadata.totalChunks;
    });

    if (!activeKey) {
      console.warn("[FileReceiver] Binary data received but no active file transfer");
      return;
    }

    const state = this.incomingFiles.get(activeKey)!;
    state.chunks.push(data);
    state.receivedChunks++;

    // Progress
    const progress = (state.receivedChunks / state.metadata.totalChunks) * 100;
    if (state.receivedChunks % 10 === 0 || state.receivedChunks === state.metadata.totalChunks) {
      console.log(`[FileReceiver] Received chunk ${state.receivedChunks}/${state.metadata.totalChunks} (${Math.round(progress)}%)`);
    }
    this.callbacks.onProgress?.(state.metadata.fileIndex, progress, 0);
  }

  private async handleComplete(transferId: string, fileIndex: number) {
    const key = `${transferId}_${fileIndex}`;
    const state = this.incomingFiles.get(key);
    if (!state) {
      console.warn("[FileReceiver] Complete received but no state for", key);
      return;
    }

    state.complete = true;
    console.log("[FileReceiver] Transfer complete, assembling file...");

    // Assemble chunks into Blob
    const blob = new Blob(state.chunks, { type: state.metadata.mime });

    // Verify SHA-256
    this.callbacks.onProgress?.(fileIndex, 100, 0);

    try {
      const receivedHash = await computeBlobHash(blob);
      if (receivedHash !== state.metadata.sha256) {
        console.error("[FileReceiver] SHA-256 mismatch!", receivedHash, "!=", state.metadata.sha256);
        this.callbacks.onError?.(fileIndex, "File integrity check failed (SHA-256 mismatch)");
        return;
      }

      console.log("[FileReceiver] SHA-256 verified, triggering download");
      triggerDownload(blob, state.metadata.name);

      this.callbacks.onFileReady?.(fileIndex, blob, state.metadata.name);
      this.callbacks.onComplete?.(transferId);
    } catch (err) {
      this.callbacks.onError?.(fileIndex, `Verification failed: ${err}`);
    } finally {
      this.incomingFiles.delete(key);
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
    const key = `${transferId}_${fileIndex}`;
    this.incomingFiles.delete(key);
  }
}
