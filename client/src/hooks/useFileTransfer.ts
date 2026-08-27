import { useEffect, useRef, useCallback } from "react";
import { FileSender, FileReceiver } from "@/lib/fileTransfer";
import { getWebRTCManager } from "@/lib/webrtc";
import { getSignalingClient } from "@/lib/signaling";
import { useAppStore } from "@/store/appStore";
import type { Transfer } from "@/types";

let transferIdCounter = 0;

/**
 * Wait for a DataChannel to open for the given peer.
 * Handles race conditions: channel may already be open when this is called,
 * or it may open while we're waiting.
 */
function waitForDataChannel(
  webrtcManager: ReturnType<typeof getWebRTCManager>,
  peerId: string,
  timeoutMs = 20000
): Promise<void> {
  return new Promise((resolve, reject) => {
    // 1) Check if DataChannel is ALREADY open (race condition guard)
    const existing = webrtcManager.getChannelStats(peerId);
    if (existing && existing.readyState === "open") {
      console.log(`[WebRTC] DataChannel already open for ${peerId}`);
      resolve();
      return;
    }

    let resolved = false;
    const cleanup = () => {
      resolved = true;
      clearTimeout(timer);
      unsubChannel();
      unsubState();
    };

    const timer = setTimeout(() => {
      if (!resolved) {
        cleanup();
        reject(new Error(`DataChannel timeout (${timeoutMs}ms) for ${peerId}`));
      }
    }, timeoutMs);

    const unsubChannel = webrtcManager.onChannel((pid) => {
      if (pid === peerId && !resolved) {
        console.log(`[WebRTC] ✅ DataChannel opened for ${peerId}`);
        cleanup();
        resolve();
      }
    });

    const unsubState = webrtcManager.onStateChange((pid, state) => {
      if (pid === peerId && state === "failed" && !resolved) {
        console.error(`[WebRTC] ❌ Connection failed for ${peerId}`);
        cleanup();
        reject(new Error(`WebRTC connection failed for ${peerId}`));
      }
    });

    // 2) Periodic check as backup (in case event was missed)
    const poll = setInterval(() => {
      if (resolved) {
        clearInterval(poll);
        return;
      }
      const stats = webrtcManager.getChannelStats(peerId);
      if (stats && stats.readyState === "open") {
        console.log(`[WebRTC] ✅ DataChannel detected open (poll) for ${peerId}`);
        cleanup();
        clearInterval(poll);
        resolve();
      }
    }, 500);
  });
}

export function useFileTransfer() {
  const {
    addTransfer,
    updateTransfer,
    updateTransferFileProgress,
    completeTransfer,
    failTransfer,
    setPendingConsentRequest,
    addToast,
  } = useAppStore();

  const webrtc = useRef(getWebRTCManager());
  const signaling = useRef(getSignalingClient());
  const receivers = useRef<Map<string, FileReceiver>>(new Map());

  // Listen for incoming transfer requests via signaling
  useEffect(() => {
    const unsub = signaling.current.onMessage((message) => {
      if (message.type !== "TRANSFER_REQUEST") return;

      const { fromId, request } = message;
      const peers = useAppStore.getState().peers;
      const peer = peers.get(fromId);

      console.log("[Transfer] 📥 Incoming request from", peer?.name);

      setPendingConsentRequest({
        transferId: request.id,
        peerId: fromId,
        peerName: peer?.name || "Unknown",
        files: request.files,
      });
    });

    return () => unsub();
  }, []);

  // ─── SEND FILES ─────────────────────────────────────────

  const sendFiles = useCallback(
    async (peerId: string, files: File[]) => {
      const transferId = `transfer_${++transferIdCounter}`;
      const peerName = useAppStore.getState().peers.get(peerId)?.name || "Unknown";

      console.log("[Transfer] 📤 Sending to", peerName, files.map(f => f.name));

      const transfer: Transfer = {
        id: transferId,
        direction: "send",
        peerId,
        peerName,
        status: "sending_metadata",
        files: files.map((f) => ({
          name: f.name,
          size: f.size,
          mime: f.type,
          progress: 0,
        })),
        startedAt: Date.now(),
      };

      addTransfer(transfer);

      // Step 1: Request consent via WebSocket
      signaling.current.send("TRANSFER_REQUEST", {
        targetId: peerId,
        files: files.map((f) => ({
          name: f.name,
          size: f.size,
          mime: f.type,
        })),
      });

      // Step 2: Wait for consent via WebSocket
      console.log("[Transfer] ⏳ Waiting for consent...");
      const accepted = await new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
          unsub();
          resolve(false);
        }, 30000);

        const unsub = signaling.current.onMessage((msg) => {
          if (msg.type === "TRANSFER_RESPONSE" && msg.fromId === peerId) {
            console.log("[Transfer] ✅ Consent:", msg.accepted);
            clearTimeout(timeout);
            unsub();
            resolve(msg.accepted);
          }
        });
      });

      if (!accepted) {
        failTransfer(transferId, "Transfer declined");
        addToast({ type: "warning", title: "Transfer declined" });
        return;
      }

      // Step 3: Establish WebRTC connection
      console.log("[Transfer] 🔗 Establishing WebRTC (sender creates offer)...");
      updateTransfer(transferId, { status: "transferring" });

      try {
        // Clean up any old PC for this peer
        webrtc.current.removePeer(peerId);

        // Sender creates offer (with DataChannel inside)
        const offer = await webrtc.current.createOffer(peerId);
        signaling.current.send("SIGNAL", {
          targetId: peerId,
          signal: offer,
        });

        console.log("[Transfer] ⏳ Offer sent, waiting for DataChannel...");

        // Wait for DataChannel to open (with race condition guard)
        await waitForDataChannel(webrtc.current, peerId, 20000);

        console.log("[Transfer] ✅ DataChannel ready!");
      } catch (err) {
        console.error("[Transfer] ❌ WebRTC failed:", err);
        failTransfer(transferId, "WebRTC connection failed");
        addToast({ type: "error", title: "Connection failed" });
        return;
      }

      // Step 4: Send files via DataChannel
      console.log("[Transfer] 🚀 Sending files...");
      const sender = new FileSender(transferId, peerId, files, {
        onProgress: (fileIndex, progress, speed) => {
          updateTransferFileProgress(transferId, fileIndex, progress, speed);
          updateTransfer(transferId, { status: "transferring" });
        },
        onComplete: (tid) => {
          completeTransfer(tid);
          addToast({ type: "success", title: "File sent!" });
        },
        onError: (fileIndex, error) => {
          failTransfer(transferId, error);
          addToast({ type: "error", title: "Transfer failed", message: error });
        },
      });

      sender.start();
    },
    [addTransfer, updateTransfer, updateTransferFileProgress, completeTransfer, failTransfer, addToast]
  );

  // ─── ACCEPT TRANSFER ───────────────────────────────────

  const acceptTransfer = useCallback(
    async (serverTransferId: string, peerId: string) => {
      console.log("[Transfer] ✅ Accepting from", peerId);
      const pending = useAppStore.getState().pendingConsentRequest;
      setPendingConsentRequest(null);

      // Step 1: Create receiver and start listening BEFORE consent response
      // This ensures the receiver is ready when the sender's offer arrives
      const clientTransferId = `recv_${++transferIdCounter}`;
      const receiver = new FileReceiver(peerId, {
        onProgress: (fileIndex, progress) => {
          updateTransferFileProgress(clientTransferId, fileIndex, progress);
        },
        onComplete: () => {
          completeTransfer(clientTransferId);
          addToast({ type: "success", title: "File received!" });
        },
        onError: (fileIndex, error) => {
          failTransfer(clientTransferId, error);
          addToast({ type: "error", title: "Transfer failed", message: error });
        },
      });

      receivers.current.set(clientTransferId, receiver);
      receiver.start();

      addTransfer({
        id: clientTransferId,
        direction: "receive",
        peerId,
        peerName: pending?.peerName || "Unknown",
        status: "transferring",
        files: (pending?.files || []).map((f) => ({ ...f, progress: 0 })),
        startedAt: Date.now(),
      });

      // Step 2: Send consent via WebSocket
      signaling.current.send("TRANSFER_RESPONSE", {
        requestId: serverTransferId,
        accepted: true,
      });

      // Step 3: Wait for DataChannel to open (sender creates offer, we receive it)
      console.log("[Transfer] ⏳ Waiting for sender's WebRTC connection...");
      try {
        await waitForDataChannel(webrtc.current, peerId, 25000);
        console.log("[Transfer] ✅ DataChannel ready (receiver)!");
      } catch (err) {
        console.error("[Transfer] ❌ WebRTC failed on receiver:", err);
        addToast({ type: "error", title: "Connection failed" });
        return;
      }
    },
    [addTransfer, updateTransferFileProgress, completeTransfer, failTransfer, addToast, setPendingConsentRequest]
  );

  // ─── DECLINE ────────────────────────────────────────────

  const declineTransfer = useCallback(
    (_transferId: string, _peerId: string) => {
      setPendingConsentRequest(null);
      addToast({ type: "info", title: "Transfer declined" });
    },
    [addToast, setPendingConsentRequest]
  );

  // ─── SEND TEXT ──────────────────────────────────────────

  const sendText = useCallback((peerId: string, content: string) => {
    webrtc.current.sendMessage(peerId, {
      type: "text",
      content,
      timestamp: Date.now(),
    });
  }, []);

  return { sendFiles, acceptTransfer, declineTransfer, sendText };
}
