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

// ─── Signal Payload ────────────────────────────────────────

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

// ─── Server Messages ───────────────────────────────────────

export interface WelcomeMessage {
  type: "WELCOME";
  peerId: string;
}

export interface RoomInfoMessage {
  type: "ROOM_INFO";
  roomId: string;
  peers: PeerInfo[];
}

export interface PeerJoinedMessage {
  type: "PEER_JOINED";
  peer: PeerInfo;
}

export interface PeerLeftMessage {
  type: "PEER_LEFT";
  peerId: string;
}

export interface SignalRelayMessage {
  type: "SIGNAL";
  fromId: string;
  signal: SignalPayload;
}

export interface TransferRequestRelayMessage {
  type: "TRANSFER_REQUEST";
  fromId: string;
  request: {
    id: string;
    files: FileInfo[];
  };
}

export interface TransferResponseRelayMessage {
  type: "TRANSFER_RESPONSE";
  fromId: string;
  requestId: string;
  accepted: boolean;
}

export interface PinCreatedMessage {
  type: "PIN_CREATED";
  pin: string;
  expiresIn: number;
}

export interface ErrorMessage {
  type: "ERROR";
  code: string;
  message: string;
}

export type ServerMessage =
  | WelcomeMessage
  | RoomInfoMessage
  | PeerJoinedMessage
  | PeerLeftMessage
  | SignalRelayMessage
  | TransferRequestRelayMessage
  | TransferResponseRelayMessage
  | PinCreatedMessage
  | ErrorMessage;

// ─── DataChannel Messages ──────────────────────────────────

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
  progress: number;
  sha256?: string;
  blob?: Blob;
  url?: string;
  error?: string;
}
