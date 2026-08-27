import type WebSocket from "ws";
import { peerManager } from "../services/peerManager.js";
import { roomManager } from "../services/roomManager.js";
import { generateRoomId, extractClientIP } from "../utils/ipHash.js";
import { sanitizeDeviceName } from "../utils/sanitizer.js";
import { createLogger } from "../utils/logger.js";
import { handleJoin } from "./room.js";
import { handleSignal } from "./signal.js";
import { handleTransferRequest, handleTransferResponse } from "./transfer.js";
import { handleCreatePin } from "./pin.js";
import type { IncomingMessage } from "http";
import type { DeviceInfo } from "../types/index.js";

const log = createLogger("Connection");

export interface WSContext {
  peerId: string;
  roomId: string | null;
}

export function handleConnection(
  ws: WebSocket,
  req: IncomingMessage
) {
  const socket = req.socket;
  const ip = extractClientIP(req, socket);
  log.info("New WebSocket connection", { ip: ip.split(".").slice(0, 2).join(".") + ".x.x" });

  // Create peer with default device info (will be updated on JOIN)
  const defaultDevice: DeviceInfo = {
    os: "Unknown",
    formFactor: "desktop",
    name: "Unknown Device",
    color: "#6366f1",
  };

  const peer = peerManager.createPeer(ws, ip, defaultDevice);
  const ctx: WSContext = { peerId: peer.id, roomId: null };

  // Send peer their ID immediately
  peerManager.sendTo(peer.id, {
    type: "WELCOME",
    peerId: peer.id,
  });

  // Handle incoming messages
  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data.toString());
      handleMessage(ws, ctx, message);
    } catch (err) {
      log.error("Invalid message received", { peerId: ctx.peerId, error: err });
      peerManager.sendTo(ctx.peerId, {
        type: "ERROR",
        code: "INVALID_MESSAGE",
        message: "Invalid JSON message",
      });
    }
  });

  // Handle disconnect
  ws.on("close", () => {
    handleDisconnect(ctx);
  });

  ws.on("error", (err) => {
    log.error("WebSocket error", { peerId: ctx.peerId, error: err });
  });

  ws.on("pong", () => {
    // Heartbeat received — peer is alive
  });
}

function handleMessage(ws: WebSocket, ctx: WSContext, message: Record<string, unknown>) {
  const { type } = message;

  switch (type) {
    case "JOIN":
      handleJoin(ctx, message as any);
      break;

    case "SIGNAL":
      handleSignal(ctx, message as any);
      break;

    case "TRANSFER_REQUEST":
      handleTransferRequest(ctx, message as any);
      break;

    case "TRANSFER_RESPONSE":
      handleTransferResponse(ctx, message as any);
      break;

    case "CREATE_PIN":
      handleCreatePin(ctx);
      break;

    case "LEAVE":
      handleLeave(ctx);
      break;

    default:
      log.warn("Unknown message type", { peerId: ctx.peerId, type });
      peerManager.sendTo(ctx.peerId, {
        type: "ERROR",
        code: "UNKNOWN_TYPE",
        message: `Unknown message type: ${type}`,
      });
  }
}

function handleDisconnect(ctx: WSContext) {
  const peer = peerManager.getPeer(ctx.peerId);
  if (!peer) return;

  // Leave current room
  if (ctx.roomId) {
    const result = roomManager.leaveRoom(ctx.peerId);
    if (result) {
      // Notify remaining peers
      for (const remainingPeerId of roomManager.getRoomPeers(result.roomId)) {
        peerManager.sendTo(remainingPeerId, {
          type: "PEER_LEFT",
          peerId: ctx.peerId,
        });
      }
    }
  }

  peerManager.removePeer(ctx.peerId);
  log.info("Peer disconnected", { peerId: ctx.peerId });
}

function handleLeave(ctx: WSContext) {
  if (!ctx.roomId) return;

  const result = roomManager.leaveRoom(ctx.peerId);
  if (result) {
    for (const remainingPeerId of roomManager.getRoomPeers(result.roomId)) {
      peerManager.sendTo(remainingPeerId, {
        type: "PEER_LEFT",
        peerId: ctx.peerId,
      });
    }
  }

  ctx.roomId = null;
  peerManager.setPeerRoom(ctx.peerId, null);
  log.info("Peer left room", { peerId: ctx.peerId });
}
