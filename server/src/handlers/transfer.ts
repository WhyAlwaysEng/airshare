import { peerManager } from "../services/peerManager.js";
import { createLogger } from "../utils/logger.js";
import type { WSContext } from "./connection.js";
import type { FileInfo } from "../types/index.js";

const log = createLogger("Transfer");

// Simple request ID counter
let requestIdCounter = 0;

interface TransferRequestPayload {
  targetId: string;
  files: FileInfo[];
}

interface TransferResponsePayload {
  requestId: string;
  accepted: boolean;
}

export function handleTransferRequest(ctx: WSContext, payload: TransferRequestPayload) {
  const { targetId, files } = payload;

  if (!targetId || !files || files.length === 0) {
    peerManager.sendTo(ctx.peerId, {
      type: "ERROR",
      code: "INVALID_TRANSFER",
      message: "Invalid transfer request",
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

  // Verify same room
  if (!ctx.roomId || ctx.roomId !== target.roomId) {
    peerManager.sendTo(ctx.peerId, {
      type: "ERROR",
      code: "NOT_IN_SAME_ROOM",
      message: "Can only transfer to peers in the same room",
    });
    return;
  }

  const requestId = `req_${++requestIdCounter}_${Date.now().toString(36)}`;

  // Sanitize file names
  const sanitizedFiles = files.map((f) => ({
    name: f.name.replace(/[<>:"|?*\x00-\x1f]/g, "").slice(0, 255) || "unnamed",
    size: f.size,
    mime: f.mime || "application/octet-stream",
  }));

  // Relay to target
  const success = peerManager.sendTo(targetId, {
    type: "TRANSFER_REQUEST",
    fromId: ctx.peerId,
    request: {
      id: requestId,
      files: sanitizedFiles,
    },
  });

  if (!success) {
    peerManager.sendTo(ctx.peerId, {
      type: "ERROR",
      code: "RELAY_FAILED",
      message: "Failed to relay transfer request",
    });
    return;
  }

  log.info("Transfer request relayed", {
    from: ctx.peerId,
    to: targetId,
    requestId,
    fileCount: files.length,
  });
}

export function handleTransferResponse(ctx: WSContext, payload: TransferResponsePayload) {
  const { requestId, accepted } = payload;

  if (!requestId) {
    peerManager.sendTo(ctx.peerId, {
      type: "ERROR",
      code: "INVALID_RESPONSE",
      message: "Missing requestId",
    });
    return;
  }

  // We need to find the original sender. The requestId contains the sender info
  // but for simplicity, we'll broadcast the response and let the sender filter.
  // In a more sophisticated system, we'd track request→sender mapping.

  // Forward to all peers in the room (sender will filter by requestId)
  for (const peer of peerManager.getPeersInRoom(ctx.roomId || "")) {
    if (peer.id !== ctx.peerId) {
      peerManager.sendTo(peer.id, {
        type: "TRANSFER_RESPONSE",
        fromId: ctx.peerId,
        requestId,
        accepted,
      });
    }
  }

  log.info("Transfer response relayed", {
    from: ctx.peerId,
    requestId,
    accepted,
  });
}
