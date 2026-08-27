import type WebSocket from "ws";
import type { PeerInfo, DeviceInfo } from "../types/index.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("PeerManager");

export interface PeerState {
  id: string;
  ws: WebSocket;
  roomId: string | null;
  device: DeviceInfo;
  isAuth: boolean;
  uid?: string; // Firebase UID if authenticated
  ip: string;
  connectedAt: number;
}

class PeerManager {
  private peers = new Map<string, PeerState>();
  private wsToPeer = new Map<WebSocket, string>();
  private idCounter = 0;

  /** Create a new peer from a WebSocket connection */
  createPeer(
    ws: WebSocket,
    ip: string,
    device: DeviceInfo,
    isAuth: boolean = false,
    uid?: string
  ): PeerState {
    const id = `peer_${++this.idCounter}_${Date.now().toString(36)}`;
    const peer: PeerState = {
      id,
      ws,
      roomId: null,
      device,
      isAuth,
      uid,
      ip,
      connectedAt: Date.now(),
    };

    this.peers.set(id, peer);
    this.wsToPeer.set(ws, id);

    log.info("Peer created", { id, device, ip: this.maskIP(ip) });
    return peer;
  }

  /** Get peer by ID */
  getPeer(id: string): PeerState | undefined {
    return this.peers.get(id);
  }

  /** Get peer by WebSocket */
  getPeerByWs(ws: WebSocket): PeerState | undefined {
    const id = this.wsToPeer.get(ws);
    return id ? this.peers.get(id) : undefined;
  }

  /** Get all peers in a room */
  getPeersInRoom(roomId: string): PeerState[] {
    const result: PeerState[] = [];
    for (const peer of this.peers.values()) {
      if (peer.roomId === roomId) result.push(peer);
    }
    return result;
  }

  /** Set the room for a peer */
  setPeerRoom(peerId: string, roomId: string | null) {
    const peer = this.peers.get(peerId);
    if (peer) peer.roomId = roomId;
  }

  /** Convert PeerState to PeerInfo for sending to clients */
  toPeerInfo(state: PeerState): PeerInfo {
    return {
      id: state.id,
      name: state.device.name,
      os: state.device.os,
      formFactor: state.device.formFactor,
      color: state.device.color,
      isAuth: state.isAuth,
      joinedAt: state.connectedAt,
    };
  }

  /** Send a JSON message to a specific peer */
  sendTo(peerId: string, message: object): boolean {
    const peer = this.peers.get(peerId);
    if (!peer || peer.ws.readyState !== 1) return false;

    try {
      peer.ws.send(JSON.stringify(message));
      return true;
    } catch (err) {
      log.error("Failed to send message", { peerId, error: err });
      return false;
    }
  }

  /** Remove a peer (on disconnect) */
  removePeer(peerId: string): PeerState | undefined {
    const peer = this.peers.get(peerId);
    if (!peer) return undefined;

    this.peers.delete(peerId);
    this.wsToPeer.delete(peer.ws);

    log.info("Peer removed", { id: peerId });
    return peer;
  }

  /** Find peer by Firebase UID */
  findByUid(uid: string): PeerState | undefined {
    for (const peer of this.peers.values()) {
      if (peer.uid === uid) return peer;
    }
    return undefined;
  }

  /** Find peer by room PIN (for PIN-based rooms) */
  findByRoomPin(pin: string): PeerState | undefined {
    for (const peer of this.peers.values()) {
      if (peer.roomId && peer.roomId.startsWith(`pin_${pin}`)) return peer;
    }
    return undefined;
  }

  get totalPeers(): number {
    return this.peers.size;
  }

  private maskIP(ip: string): string {
    const parts = ip.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.xxx.xxx`;
    }
    return "xxx";
  }
}

// Singleton
export const peerManager = new PeerManager();
