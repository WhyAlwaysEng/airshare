import { peerManager } from "../services/peerManager.js";
import { createLogger } from "../utils/logger.js";
import type { WSContext } from "./connection.js";
import type { SignalPayload } from "../types/index.js";

const log = createLogger("Signal");

interface SignalPayload_ {
  targetId: string;
  signal: SignalPayload;
}

export function handleSignal(ctx: WSContext, payload: SignalPayload_) {
  const { targetId, signal } = payload;

  if (!targetId || !signal || !signal.type) {
    peerManager.sendTo(ctx.peerId, {
      type: "ERROR",
      code: "INVALID_SIGNAL",
      message: "Invalid signal payload",
    });
    return;
  }

  // Verify target exists
  const target = peerManager.getPeer(targetId);
  if (!target) {
    peerManager.sendTo(ctx.peerId, {
      type: "ERROR",
      code: "PEER_NOT_FOUND",
      message: "Target peer not found",
    });
    return;
  }

  // Verify both peers are in the same room
  const senderRoom = ctx.roomId;
  const targetRoom = target.roomId;
  if (!senderRoom || senderRoom !== targetRoom) {
    peerManager.sendTo(ctx.peerId, {
      type: "ERROR",
      code: "NOT_IN_SAME_ROOM",
      message: "Can only signal peers in the same room",
    });
    return;
  }

  // Relay signal to target
  const success = peerManager.sendTo(targetId, {
    type: "SIGNAL",
    fromId: ctx.peerId,
    signal,
  });

  if (!success) {
    peerManager.sendTo(ctx.peerId, {
      type: "ERROR",
      code: "RELAY_FAILED",
      message: "Failed to relay signal to target peer",
    });
  } else {
    log.debug("Signal relayed", {
      from: ctx.peerId,
      to: targetId,
      signalType: signal.type,
    });
  }
}
