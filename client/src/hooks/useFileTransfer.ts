import { useEffect, useRef, useCallback } from "react";
import { FileSender, FileReceiver } from "@/lib/fileTransfer";
import { getWebRTCManager } from "@/lib/webrtc";
import { getSignalingClient } from "@/lib/signaling";
import { useAppStore } from "@/store/appStore";
import type { Transfer } from "@/types";

let transferIdCounter = 0;

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

      console.log("[Transfer] 📥 Incoming request from", peer?.name, request);

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

      // Step 2: Wait for consent
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

      // Step 3: SENDER creates WebRTC offer
      console.log("[Transfer] 🔗 Establishing WebRTC (sender creates offer)...");
      updateTransfer(transferId, { status: "transferring" });

      try {
        await waitForDataChannel(peerId);
      } catch (err) {
        console.error("[Transfer] ❌ WebRTC failed:", err);
        failTransfer(transferId, "WebRTC connection failed");
        addToast({ type: "error", title: "Connection failed" });
        return;
      }

      // Step 4: Send files
      console.log("[Transfer] 🚀 Starting transfer...");
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
      setPendingConsentRequest(null);

      // RECEIVER waits for DataChannel (sender will create offer)
      console.log("[Transfer] ⏳ Waiting for WebRTC connection (receiver)...");
      try {
        await waitForDataChannel(peerId);
      } catch (err) {
        console.error("[Transfer] ❌ WebRTC failed on receiver:", err);
        addToast({ type: "error", title: "Connection failed" });
        return;
      }

      // Create receiver and accept
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
      receiver.acceptFile(serverTransferId, 0);

      const pending = useAppStore.getState().pendingConsentRequest;
      addTransfer({
        id: clientTransferId,
        direction: "receive",
        peerId,
        peerName: pending?.peerName || "Unknown",
        status: "transferring",
        files: (pending?.files || []).map((f) => ({ ...f, progress: 0 })),
        startedAt: Date.now(),
      });
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

// ─── Wait for DataChannel to open ────────────────────────

async function waitForDataChannel(peerId: string): Promise<void> {
  const webrtc = getWebRTCManager();
  const signaling = getSignalingClient();

  // Check if already connected
  const existingChannel = (webrtc as any).channels.get(peerId);
  if (existingChannel?.readyState === "open") {
    console.log("[WebRTC] ✅ Already connected to", peerId);
    return;
  }

  // Create offer (sender initiates)
  console.log("[WebRTC] 📡 Creating offer for", peerId);
  const offer = await webrtc.createOffer(peerId);
  signaling.send("SIGNAL", {
    targetId: peerId,
    signal: offer,
  });

  // Wait for DataChannel to open (with 20s timeout)
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsub();
      unsubState();
      console.error("[WebRTC] ❌ Timeout waiting for DataChannel");
      reject(new Error("WebRTC connection timeout (20s)"));
    }, 20000);

    const unsub = webrtc.onChannel((pid, _channel) => {
      if (pid === peerId) {
        console.log("[WebRTC] ✅ DataChannel opened with", peerId);
        clearTimeout(timeout);
        unsub();
        unsubState();
        resolve();
      }
    });

    const unsubState = webrtc.onStateChange((pid, state) => {
      if (pid === peerId) {
        console.log("[WebRTC] State:", state, "for", peerId);
        if (state === "connected") {
          const ch = (webrtc as any).channels.get(peerId);
          if (ch?.readyState === "open") {
            clearTimeout(timeout);
            unsub();
            unsubState();
            resolve();
          }
        } else if (state === "failed") {
          clearTimeout(timeout);
          unsub();
          unsubState();
          reject(new Error("WebRTC connection failed"));
        }
      }
    });
  });
}
