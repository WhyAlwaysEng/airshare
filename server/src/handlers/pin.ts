import { peerManager } from "../services/peerManager.js";
import { roomManager } from "../services/roomManager.js";
import { createLogger } from "../utils/logger.js";
import type { WSContext } from "./connection.js";

const log = createLogger("Pin");

const PIN_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Generate a cryptographically random 6-digit PIN.
 */
function generatePin(): string {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  // Map to 000000-999999
  const num = (bytes[0] << 16) | (bytes[1] << 8) | bytes[2];
  return String(num % 1_000_000).padStart(6, "0");
}

export function handleCreatePin(ctx: WSContext) {
  const peer = peerManager.getPeer(ctx.peerId);
  if (!peer) return;

  // Leave current room if any
  if (ctx.roomId) {
    const oldResult = roomManager.leaveRoom(ctx.peerId);
    if (oldResult) {
      for (const pid of roomManager.getRoomPeers(oldResult.roomId)) {
        peerManager.sendTo(pid, {
          type: "PEER_LEFT",
          peerId: ctx.peerId,
        });
      }
    }
  }

  // Generate unique PIN
  let pin: string;
  let attempts = 0;
  do {
    pin = generatePin();
    attempts++;
    if (attempts > 100) {
      peerManager.sendTo(ctx.peerId, {
        type: "ERROR",
        code: "PIN_GENERATION_FAILED",
        message: "Failed to generate unique PIN",
      });
      return;
    }
  } while (roomManager.getRoom(`pin_${pin}`));

  // Create PIN room
  roomManager.createPinRoom(pin);

  // Join the room
  const room = roomManager.joinRoom(`pin_${pin}`, ctx.peerId);
  if (!room) {
    peerManager.sendTo(ctx.peerId, {
      type: "ERROR",
      code: "JOIN_FAILED",
      message: "Failed to create PIN room",
    });
    return;
  }

  ctx.roomId = `pin_${pin}`;
  peerManager.setPeerRoom(ctx.peerId, ctx.roomId);

  // Send PIN to the creator
  peerManager.sendTo(ctx.peerId, {
    type: "PIN_CREATED",
    pin,
    expiresIn: PIN_EXPIRY_MS,
  });

  // Also send room info (empty for now)
  peerManager.sendTo(ctx.peerId, {
    type: "ROOM_INFO",
    roomId: ctx.roomId,
    peers: [],
  });

  log.info("PIN room created and joined", {
    peerId: ctx.peerId,
    pin,
    roomId: ctx.roomId,
  });
}
