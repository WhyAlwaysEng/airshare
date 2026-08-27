import { useCallback, useEffect, useRef } from "react";
import { getWebRTCManager } from "@/lib/webrtc";
import { useAppStore } from "@/store/appStore";
import type { TextMessage } from "@/types";

export function useClipboard() {
  const { peers, setClipboardText, addToast } = useAppStore();
  const webrtc = useRef(getWebRTCManager());

  // Listen for incoming text messages on DataChannels
  useEffect(() => {
    const unsub = webrtc.current.onMessage((peerId, message) => {
      if (message.type === "text") {
        const textMsg = message as TextMessage;
        setClipboardText(textMsg.content);

        const peer = useAppStore.getState().peers.get(peerId);
        addToast({
          type: "info",
          title: `Text from ${peer?.name || "peer"}`,
          message: textMsg.content.length > 50
            ? textMsg.content.slice(0, 50) + "..."
            : textMsg.content,
          duration: 8000,
        });

        // Try to copy to system clipboard
        navigator.clipboard.writeText(textMsg.content).catch(() => {
          // Clipboard API might not be available
        });
      }
    });

    return () => unsub();
  }, [setClipboardText, addToast]);

  /**
   * Send clipboard content to all connected peers.
   */
  const broadcastClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        addToast({ type: "warning", title: "Clipboard is empty" });
        return;
      }

      for (const [peerId] of peers) {
        webrtc.current.sendMessage(peerId, {
          type: "text",
          content: text,
          timestamp: Date.now(),
        });
      }

      setClipboardText(text);
      addToast({
        type: "success",
        title: "Clipboard synced",
        message: `Sent to ${peers.size} peer(s)`,
      });
    } catch {
      addToast({
        type: "error",
        title: "Clipboard access denied",
        message: "Please allow clipboard permission",
      });
    }
  }, [peers, addToast, setClipboardText]);

  /**
   * Send specific text to all connected peers.
   */
  const sendText = useCallback(
    (text: string) => {
      for (const [peerId] of peers) {
        webrtc.current.sendMessage(peerId, {
          type: "text",
          content: text,
          timestamp: Date.now(),
        });
      }
      setClipboardText(text);
      addToast({
        type: "success",
        title: "Text sent",
        message: `Sent to ${peers.size} peer(s)`,
      });
    },
    [peers, addToast, setClipboardText]
  );

  return {
    broadcastClipboard,
    sendText,
  };
}
