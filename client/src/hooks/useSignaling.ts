import { useEffect, useRef } from "react";
import { getSignalingClient } from "@/lib/signaling";
import { useAppStore } from "@/store/appStore";
import { i18n } from "@/lib/i18n";
import { getIdToken, isFirebaseConfigured } from "@/lib/firebase";
import type { ServerMessage } from "@/types";

export function useSignaling() {
  const {
    setWsState,
    setPeerId,
    setRoomId,
    setPeers,
    addPeer,
    removePeer,
    setCurrentPin,
    addToast,
    user,
    device,
  } = useAppStore();

  const client = useRef(getSignalingClient());

  useEffect(() => {
    const c = client.current;
    const t = (key: string, params?: Record<string, string | number>) =>
      i18n.t(key as any, params);

    // Connection state
    const unsubState = c.onStateChange((state) => {
      setWsState(state);
      if (state === "open") {
        addToast({ type: "info", title: t("toast.connected") });
      }
      if (state === "closed") {
        addToast({ type: "warning", title: t("toast.disconnected") });
      }
    });

    // Message handler
    const unsubMessage = c.onMessage((message: ServerMessage) => {
      switch (message.type) {
        case "WELCOME":
          setPeerId(message.peerId);
          // Auto-join room after receiving welcome
          joinRoom();
          break;

        case "ROOM_INFO":
          setRoomId(message.roomId);
          setPeers(message.peers);
          break;

        case "PEER_JOINED":
          addPeer(message.peer);
          addToast({
            type: "info",
            title: t("toast.peerJoined", { name: message.peer.name }),
            duration: 3000,
          });
          break;

        case "PEER_LEFT":
          removePeer(message.peerId);
          break;

        case "PIN_CREATED":
          setCurrentPin(message.pin, message.expiresIn);
          addToast({
            type: "success",
            title: t("pin.created"),
            message: `PIN: ${message.pin}`,
          });
          break;

        case "ERROR":
          addToast({
            type: "error",
            title: message.message,
            message: message.code,
          });
          break;
      }
    });

    // Auto-join room function
    const joinRoom = async () => {
      const currentState = useAppStore.getState();
      const currentDevice = currentState.device;
      if (!currentDevice) return;

      if (isFirebaseConfigured && currentState.user) {
        // Authenticated mode — send Firebase token
        const token = await getIdToken();
        if (token) {
          c.send("JOIN", {
            mode: "auth",
            token,
            device: currentDevice,
          });
        } else {
          // Token expired or unavailable — fall back to guest
          c.send("JOIN", {
            mode: "guest",
            device: currentDevice,
          });
        }
      } else {
        // Guest mode
        c.send("JOIN", {
          mode: "guest",
          device: currentDevice,
        });
      }
    };

    c.connect();

    return () => {
      unsubState();
      unsubMessage();
      c.disconnect();
    };
  }, []);

  return client.current;
}
