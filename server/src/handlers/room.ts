import { peerManager } from "../services/peerManager.js";
import { roomManager } from "../services/roomManager.js";
import { generateRoomId } from "../utils/ipHash.js";
import { sanitizeDeviceName } from "../utils/sanitizer.js";
import { verifyFirebaseToken } from "../services/firebase.js";
import { createLogger } from "../utils/logger.js";
import type { WSContext } from "./connection.js";
import type { DeviceInfo, PeerInfo } from "../types/index.js";

const log = createLogger("Room");

interface JoinPayload {
  mode: "guest" | "auth" | "pin";
  device: DeviceInfo;
  token?: string;
  pin?: string;
}

export async function handleJoin(ctx: WSContext, payload: JoinPayload) {
  const peer = peerManager.getPeer(ctx.peerId);
  if (!peer) return;

  let roomId: string;
  let isAuth = false;
  let uid: string | undefined;

  switch (payload.mode) {
    case "guest": {
      roomId = generateRoomId(peer.ip);
      break;
    }

    case "auth": {
      if (!payload.token) {
        peerManager.sendTo(ctx.peerId, {
          type: "ERROR",
          code: "MISSING_TOKEN",
          message: "Auth token required for authenticated mode",
        });
        return;
      }

      const tokenResult = await verifyFirebaseToken(payload.token);
      if (!tokenResult) {
        peerManager.sendTo(ctx.peerId, {
          type: "ERROR",
          code: "INVALID_TOKEN",
          message: "Invalid or expired auth token",
        });
        return;
      }

      roomId = `auth_${tokenResult.uid}`;
      isAuth = true;
      uid = tokenResult.uid;
      break;
    }

    case "pin": {
      if (!payload.pin || !/^\d{6}$/.test(payload.pin)) {
        peerManager.sendTo(ctx.peerId, {
          type: "ERROR",
          code: "INVALID_PIN",
          message: "PIN must be a 6-digit number",
        });
        return;
      }

      roomId = `pin_${payload.pin}`;

      // Check if PIN room exists
      const existingRoom = roomManager.getRoom(roomId);
      if (!existingRoom) {
        peerManager.sendTo(ctx.peerId, {
          type: "ERROR",
          code: "ROOM_NOT_FOUND",
          message: "Invalid PIN — room does not exist",
        });
        return;
      }
      break;
    }

    default:
      peerManager.sendTo(ctx.peerId, {
        type: "ERROR",
        code: "INVALID_MODE",
        message: `Invalid join mode: ${payload.mode}`,
      });
      return;
  }

  // Update device info
  const device: DeviceInfo = {
    os: payload.device.os,
    formFactor: payload.device.formFactor,
    name: sanitizeDeviceName(payload.device.name),
    color: payload.device.color,
  };

  // Leave old room first if any
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

  // Update peer's device info
  peer.device = device;
  peer.isAuth = isAuth;
  if (uid) peer.uid = uid;

  // Join room
  const room = roomManager.joinRoom(roomId, ctx.peerId, payload.pin);
  if (!room) {
    peerManager.sendTo(ctx.peerId, {
      type: "ERROR",
      code: "JOIN_FAILED",
      message: "Failed to join room",
    });
    return;
  }

  // Update context
  ctx.roomId = roomId;
  peerManager.setPeerRoom(ctx.peerId, roomId);

  // Send room info to joining peer (with all existing peers)
  const existingPeers = roomManager
    .getRoomPeers(roomId)
    .filter((pid) => pid !== ctx.peerId)
    .map((pid) => {
      const p = peerManager.getPeer(pid);
      return p ? peerManager.toPeerInfo(p) : null;
    })
    .filter(Boolean) as PeerInfo[];

  peerManager.sendTo(ctx.peerId, {
    type: "ROOM_INFO",
    roomId,
    peers: existingPeers,
  });

  // Notify existing peers about the new peer
  const newPeerInfo = peerManager.toPeerInfo(peer);
  for (const pid of roomManager.getRoomPeers(roomId)) {
    if (pid !== ctx.peerId) {
      peerManager.sendTo(pid, {
        type: "PEER_JOINED",
        peer: newPeerInfo,
      });
    }
  }

  log.info("Peer joined room", {
    peerId: ctx.peerId,
    roomId,
    mode: payload.mode,
    totalPeers: room.peers.size,
  });
}
