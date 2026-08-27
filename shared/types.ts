// ============================================================
// AirShare Shared Types
// WebSocket Signaling Protocol + Peer Info + Transfer Types
// ============================================================

// ─── Device & Peer Types ───────────────────────────────────

export type DeviceOS = "Windows" | "macOS" | "Linux" | "Android" | "iOS" | "Unknown";
export type DeviceFormFactor = "desktop" | "mobile" | "tablet";

export interface DeviceInfo {
  os: DeviceOS;
  formFactor: DeviceFormFactor;
  name: string;
  color: string;
}

export interface PeerInfo {
  id: string;
  name: string;
  os: DeviceOS;
  formFactor: DeviceFormFactor;
  color: string;
  isAuth: boolean;
  joinedAt: number;
}

// ─── Join Modes ────────────────────────────────────────────

export type JoinMode = "guest" | "auth" | "pin";

// ─── Client → Server Messages ──────────────────────────────

export interface ClientMessage {
  type: string;
}

export interface JoinMessage extends ClientMessage {
  type: "JOIN";
  mode: "guest";
  device: DeviceInfo;
}

export interface JoinAuthMessage extends ClientMessage {
  type: "JOIN";
  mode: "auth";
  token: string;
  device: DeviceInfo;
}

export interface JoinPinMessage extends ClientMessage {
  type: "JOIN";
  mode: "pin";
  pin: string;
  device: DeviceInfo;
}

export interface CreatePinMessage extends ClientMessage {
  type: "CREATE_PIN";
}

export interface SignalMessage extends ClientMessage {
  type: "SIGNAL";
  targetId: string;
  signal: SignalPayload;
}

export interface TransferRequestMessage extends ClientMessage {
  type: "TRANSFER_REQUEST";
  targetId: string;
  files: FileInfo[];
}

export interface TransferResponseMessage extends ClientMessage {
  type: "TRANSFER_RESPONSE";
  requestId: string;
  accepted: boolean;
}

export interface LeaveMessage extends ClientMessage {
  type: "LEAVE";
}

export type AnyClientMessage =
  | JoinMessage
  | JoinAuthMessage
  | JoinPinMessage
  | CreatePinMessage
  | SignalMessage
  | TransferRequestMessage
  | TransferResponseMessage
  | LeaveMessage;

// ─── Server → Client Messages ──────────────────────────────

export interface ServerMessage {
  type: string;
}

export interface RoomInfoMessage extends ServerMessage {
  type: "ROOM_INFO";
  roomId: string;
  peers: PeerInfo[];
}

export interface PeerJoinedMessage extends ServerMessage {
  type: "PEER_JOINED";
  peer: PeerInfo;
}

export interface PeerLeftMessage extends ServerMessage {
  type: "PEER_LEFT";
  peerId: string;
}

export interface SignalRelayMessage extends ServerMessage {
  type: "SIGNAL";
  fromId: string;
  signal: SignalPayload;
}

export interface TransferRequestRelayMessage extends ServerMessage {
  type: "TRANSFER_REQUEST";
  fromId: string;
  request: {
    id: string;
    files: FileInfo[];
  };
}

export interface TransferResponseRelayMessage extends ServerMessage {
  type: "TRANSFER_RESPONSE";
  fromId: string;
  requestId: string;
  accepted: boolean;
}

export interface PinCreatedMessage extends ServerMessage {
  type: "PIN_CREATED";
  pin: string;
  expiresIn: number;
}

export interface ErrorMessage extends ServerMessage {
  type: "ERROR";
  code: string;
  message: string;
}

export type AnyServerMessage =
  | RoomInfoMessage
  | PeerJoinedMessage
  | PeerLeftMessage
  | SignalRelayMessage
  | TransferRequestRelayMessage
  | TransferResponseRelayMessage
  | PinCreatedMessage
  | ErrorMessage;

// ─── Signal Payload (SDP / ICE) ────────────────────────────

export type SignalType = "offer" | "answer" | "ice";

export interface SignalPayload {
  type: SignalType;
  sdp?: string;
  candidate?: {
    candidate: string;
    sdpMid: string | null;
    sdpMLineIndex: number | null;
    usernameFragment?: string;
  };
}

// ─── File Info ─────────────────────────────────────────────

export interface FileInfo {
  name: string;
  size: number;
  mime: string;
}

// ─── WebRTC DataChannel Protocol Messages ──────────────────

export interface FileMetadataMessage {
  type: "metadata";
  transferId: string;
  fileIndex: number;
  name: string;
  size: number;
  mime: string;
  sha256: string;
  totalChunks: number;
}

export interface FileAcceptMessage {
  type: "accept";
  transferId: string;
  fileIndex: number;
}

export interface FileDeclineMessage {
  type: "decline";
  transferId: string;
  fileIndex: number;
}

export interface FileChunkHeaderMessage {
  type: "chunk_header";
  transferId: string;
  fileIndex: number;
  chunkIndex: number;
}

export interface FileCompleteMessage {
  type: "complete";
  transferId: string;
  fileIndex: number;
}

export interface TextMessage {
  type: "text";
  content: string;
  timestamp: number;
}

export type DataChannelMessage =
  | FileMetadataMessage
  | FileAcceptMessage
  | FileDeclineMessage
  | FileChunkHeaderMessage
  | FileCompleteMessage
  | TextMessage;

// ─── Transfer State ────────────────────────────────────────

export type TransferDirection = "send" | "receive";
export type TransferStatus =
  | "pending_consent"
  | "sending_metadata"
  | "transferring"
  | "verifying"
  | "complete"
  | "failed"
  | "cancelled";

export interface Transfer {
  id: string;
  direction: TransferDirection;
  peerId: string;
  peerName: string;
  status: TransferStatus;
  files: FileInfoWithProgress[];
  startedAt: number;
  completedAt?: number;
}

export interface FileInfoWithProgress extends FileInfo {
  progress: number; // 0-100
  sha256?: string;
  blob?: Blob;
  url?: string;
  error?: string;
}

// ─── ICE Server Config ─────────────────────────────────────

export interface IceServerConfig {
  iceServers: RTCIceServer[];
}
