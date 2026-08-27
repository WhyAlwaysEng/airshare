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

// ─── Signal Types ──────────────────────────────────────────

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

// ─── File Types ────────────────────────────────────────────

export interface FileInfo {
  name: string;
  size: number;
  mime: string;
}
