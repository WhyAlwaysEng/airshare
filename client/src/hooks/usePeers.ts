import { useEffect, useCallback, useRef } from "react";
import { getWebRTCManager } from "@/lib/webrtc";
import { getSignalingClient } from "@/lib/signaling";

export function usePeers() {
  const webrtc = useRef(getWebRTCManager());
  const signaling = useRef(getSignalingClient());

  useEffect(() => {
    const c = signaling.current;
    const w = webrtc.current;

    // Handle incoming WebRTC signals (offer/answer/ICE)
    const unsub = c.onMessage(async (message) => {
      if (message.type !== "SIGNAL") return;

      const { fromId, signal } = message;
      console.log("[WebRTC] Received signal:", signal.type, "from", fromId);

      try {
        switch (signal.type) {
          case "offer": {
            // Someone wants to connect to us — create answer
            const answer = await w.handleOffer(fromId, signal.sdp!);
            c.send("SIGNAL", {
              targetId: fromId,
              signal: answer,
            });
            console.log("[WebRTC] Sent answer to", fromId);
            break;
          }

          case "answer": {
            // Our offer was accepted
            await w.handleAnswer(fromId, signal.sdp!);
            console.log("[WebRTC] Got answer from", fromId);
            break;
          }

          case "ice": {
            if (signal.candidate) {
              await w.addIceCandidate(fromId, signal.candidate);
            }
            break;
          }
        }
      } catch (err) {
        console.error("[WebRTC] Signal handling error:", err);
      }
    });

    // Handle ICE candidates we generate
    const unsubIce = w.onIceCandidate((peerId, candidate) => {
      c.send("SIGNAL", {
        targetId: peerId,
        signal: {
          type: "ice",
          candidate: {
            candidate: candidate.candidate,
            sdpMid: candidate.sdpMid,
            sdpMLineIndex: candidate.sdpMLineIndex,
          },
        },
      });
    });

    // Log connection state changes
    const unsubState = w.onStateChange((peerId, state) => {
      console.log("[WebRTC] Connection state:", peerId, state);
    });

    return () => {
      unsub();
      unsubIce();
      unsubState();
    };
  }, []);

  return {
    webrtc: webrtc.current,
    signaling: signaling.current,
  };
}
