import { createLogger } from "../utils/logger.js";

const log = createLogger("RoomManager");

export interface RoomState {
  id: string;
  peers: Set<string>; // peer IDs
  createdAt: number;
  lastActivity: number;
  pin?: string;
  pinExpiresAt?: number;
}

const STALE_ROOM_TTL_MS = 5 * 60 * 1000; // 5 minutes
const PIN_ROOM_TTL_MS = 30 * 60 * 1000; // 30 minutes
const GC_INTERVAL_MS = 60 * 1000; // 60 seconds

class RoomManager {
  private rooms = new Map<string, RoomState>();
  private peerToRoom = new Map<string, string>();
  private gcTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startGC();
  }

  /** Join or create a room, return the room state */
  joinRoom(roomId: string, peerId: string, pin?: string): RoomState | null {
    // If room has a PIN, validate it
    const existing = this.rooms.get(roomId);
    if (existing && existing.pin && pin !== existing.pin) {
      log.warn("PIN validation failed", { roomId, peerId });
      return null;
    }

    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        id: roomId,
        peers: new Set(),
        createdAt: Date.now(),
        lastActivity: Date.now(),
      };
      this.rooms.set(roomId, room);
      log.info("Room created", { roomId });
    }

    room.peers.add(peerId);
    room.lastActivity = Date.now();
    this.peerToRoom.set(peerId, roomId);

    log.info("Peer joined room", { roomId, peerId, peerCount: room.peers.size });
    return room;
  }

  /** Create a PIN-based room */
  createPinRoom(pin: string): RoomState {
    const roomId = `pin_${pin}`;
    const room: RoomState = {
      id: roomId,
      peers: new Set(),
      createdAt: Date.now(),
      lastActivity: Date.now(),
      pin,
      pinExpiresAt: Date.now() + PIN_ROOM_TTL_MS,
    };
    this.rooms.set(roomId, room);
    log.info("PIN room created", { roomId, pin });
    return room;
  }

  /** Remove a peer from their room */
  leaveRoom(peerId: string): { roomId: string; room: RoomState } | null {
    const roomId = this.peerToRoom.get(peerId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) {
      this.peerToRoom.delete(peerId);
      return null;
    }

    room.peers.delete(peerId);
    this.peerToRoom.delete(peerId);
    room.lastActivity = Date.now();

    log.info("Peer left room", { roomId, peerId, peerCount: room.peers.size });

    // If room is empty, remove it (unless it's a PIN room that hasn't expired)
    if (room.peers.size === 0) {
      if (room.pin && room.pinExpiresAt && Date.now() < room.pinExpiresAt) {
        log.info("Keeping empty PIN room (not expired)", { roomId });
      } else {
        this.rooms.delete(roomId);
        log.info("Room destroyed (empty)", { roomId });
      }
    }

    return { roomId, room };
  }

  /** Get a room by ID */
  getRoom(roomId: string): RoomState | undefined {
    return this.rooms.get(roomId);
  }

  /** Get all peer IDs in a room */
  getRoomPeers(roomId: string): string[] {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.peers) : [];
  }

  /** Get the room a peer belongs to */
  getPeerRoom(peerId: string): string | undefined {
    return this.peerToRoom.get(peerId);
  }

  /** Get all rooms (for debug/admin) */
  getAllRooms(): Map<string, RoomState> {
    return new Map(this.rooms);
  }

  /** Garbage collect stale rooms */
  private gc() {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, room] of this.rooms) {
      const age = now - room.lastActivity;

      // Check PIN expiry
      if (room.pin && room.pinExpiresAt && now > room.pinExpiresAt) {
        if (room.peers.size === 0) {
          this.rooms.delete(id);
          cleaned++;
          continue;
        }
        // PIN expired but peers still connected — clear PIN
        room.pin = undefined;
        room.pinExpiresAt = undefined;
        log.info("PIN expired for room", { roomId: id });
      }

      // Check stale room
      if (age > STALE_ROOM_TTL_MS && room.peers.size === 0) {
        this.rooms.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      log.info("GC completed", { cleaned, remaining: this.rooms.size });
    }
  }

  private startGC() {
    this.gcTimer = setInterval(() => this.gc(), GC_INTERVAL_MS);
    // Allow process to exit even if timer is running
    if (this.gcTimer.unref) this.gcTimer.unref();
  }

  shutdown() {
    if (this.gcTimer) clearInterval(this.gcTimer);
  }
}

// Singleton
export const roomManager = new RoomManager();
