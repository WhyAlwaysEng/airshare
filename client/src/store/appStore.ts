import { create } from "zustand";
import type {
  PeerInfo,
  Transfer,
  FileInfo,
  DeviceInfo,
} from "@/types";
import type { Theme } from "@/lib/theme";
import type { Locale } from "@/lib/i18n";

// ─── Toast Types ───────────────────────────────────────────

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

// ─── Store State ───────────────────────────────────────────

export interface AppState {
  // ── Device ──
  device: DeviceInfo | null;
  peerId: string | null;
  setDevice: (device: DeviceInfo) => void;
  setPeerId: (peerId: string) => void;

  // ── Auth ──
  user: { uid: string; email: string } | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  setUser: (user: { uid: string; email: string } | null) => void;
  setGuestMode: (isGuest: boolean) => void;

  // ── Signaling ──
  wsState: "connecting" | "open" | "closed";
  roomId: string | null;
  setWsState: (state: "connecting" | "open" | "closed") => void;
  setRoomId: (roomId: string | null) => void;

  // ── Peers ──
  peers: Map<string, PeerInfo>;
  addPeer: (peer: PeerInfo) => void;
  removePeer: (peerId: string) => void;
  setPeers: (peers: PeerInfo[]) => void;
  clearPeers: () => void;

  // ── Transfers ──
  activeTransfers: Map<string, Transfer>;
  transferHistory: Transfer[];
  addTransfer: (transfer: Transfer) => void;
  updateTransfer: (id: string, updates: Partial<Transfer>) => void;
  updateTransferFileProgress: (
    transferId: string,
    fileIndex: number,
    progress: number,
    speed?: number
  ) => void;
  completeTransfer: (id: string) => void;
  failTransfer: (id: string, error: string) => void;
  cancelTransfer: (id: string) => void;

  // ── Pending Transfer (consent modal) ──
  pendingConsentRequest: {
    transferId: string;
    peerId: string;
    peerName: string;
    files: FileInfo[];
  } | null;
  setPendingConsentRequest: (
    request: AppState["pendingConsentRequest"]
  ) => void;

  // ── PIN ──
  currentPin: string | null;
  pinExpiresAt: number | null;
  setCurrentPin: (pin: string | null, expiresIn?: number) => void;

  // ── Toast ──
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;

  // ── Clipboard ──
  clipboardText: string;
  setClipboardText: (text: string) => void;

  // ── Theme ──
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // ── Locale ──
  locale: Locale;
  setLocale: (locale: Locale) => void;
  localeVersion: number; // force re-render on locale change
}

let toastId = 0;

export const useAppStore = create<AppState>((set, get) => ({
  // Device
  device: null,
  peerId: null,
  setDevice: (device) => set({ device }),
  setPeerId: (peerId) => set({ peerId }),

  // Auth
  user: null,
  isAuthenticated: false,
  isGuest: false,
  setUser: (user) => set((s) => ({
    user,
    isAuthenticated: !!user,
    isGuest: s.isGuest && !!user, // keep guest flag if user is set
  })),
  setGuestMode: (isGuest) => set({ isGuest }),

  // Signaling
  wsState: "closed",
  roomId: null,
  setWsState: (wsState) => set({ wsState }),
  setRoomId: (roomId) => set({ roomId }),

  // Peers
  peers: new Map(),
  addPeer: (peer) =>
    set((state) => {
      const peers = new Map(state.peers);
      peers.set(peer.id, peer);
      return { peers };
    }),
  removePeer: (peerId) =>
    set((state) => {
      const peers = new Map(state.peers);
      peers.delete(peerId);
      return { peers };
    }),
  setPeers: (peerList) =>
    set(() => {
      const peers = new Map<string, PeerInfo>();
      for (const p of peerList) peers.set(p.id, p);
      return { peers };
    }),
  clearPeers: () => set({ peers: new Map() }),

  // Transfers
  activeTransfers: new Map(),
  transferHistory: [],

  addTransfer: (transfer) =>
    set((state) => {
      const activeTransfers = new Map(state.activeTransfers);
      activeTransfers.set(transfer.id, transfer);
      return { activeTransfers };
    }),

  updateTransfer: (id, updates) =>
    set((state) => {
      const activeTransfers = new Map(state.activeTransfers);
      const existing = activeTransfers.get(id);
      if (existing) {
        activeTransfers.set(id, { ...existing, ...updates });
      }
      return { activeTransfers };
    }),

  updateTransferFileProgress: (transferId, fileIndex, progress, speed) =>
    set((state) => {
      const activeTransfers = new Map(state.activeTransfers);
      const transfer = activeTransfers.get(transferId);
      if (transfer) {
        const files = [...transfer.files];
        if (files[fileIndex]) {
          files[fileIndex] = { ...files[fileIndex], progress };
        }
        activeTransfers.set(transferId, { ...transfer, files });
      }
      return { activeTransfers };
    }),

  completeTransfer: (id) =>
    set((state) => {
      const activeTransfers = new Map(state.activeTransfers);
      const transfer = activeTransfers.get(id);
      if (transfer) {
        const completed = {
          ...transfer,
          status: "complete" as const,
          completedAt: Date.now(),
        };
        activeTransfers.delete(id);
        return {
          activeTransfers,
          transferHistory: [completed, ...state.transferHistory].slice(0, 50),
        };
      }
      return {};
    }),

  failTransfer: (id, error) =>
    set((state) => {
      const activeTransfers = new Map(state.activeTransfers);
      const transfer = activeTransfers.get(id);
      if (transfer) {
        const failed = {
          ...transfer,
          status: "failed" as const,
          completedAt: Date.now(),
        };
        activeTransfers.delete(id);
        return {
          activeTransfers,
          transferHistory: [failed, ...state.transferHistory].slice(0, 50),
        };
      }
      return {};
    }),

  cancelTransfer: (id) =>
    set((state) => {
      const activeTransfers = new Map(state.activeTransfers);
      activeTransfers.delete(id);
      return { activeTransfers };
    }),

  // Pending consent
  pendingConsentRequest: null,
  setPendingConsentRequest: (request) => set({ pendingConsentRequest: request }),

  // PIN
  currentPin: null,
  pinExpiresAt: null,
  setCurrentPin: (pin, expiresIn) =>
    set({
      currentPin: pin,
      pinExpiresAt: pin && expiresIn ? Date.now() + expiresIn : null,
    }),

  // Toast
  toasts: [],
  addToast: (toast) =>
    set((state) => {
      const id = `toast_${++toastId}`;
      const newToast = { ...toast, id };
      setTimeout(() => {
        get().removeToast(id);
      }, toast.duration || 5000);
      return { toasts: [...state.toasts, newToast] };
    }),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  // Clipboard
  clipboardText: "",
  setClipboardText: (text) => set({ clipboardText: text }),

  // Theme
  theme: (localStorage.getItem("airshare-theme") as Theme) || "dark",
  setTheme: (theme) => set({ theme }),

  // Locale
  locale: (localStorage.getItem("airshare-locale") as Locale) || "en",
  setLocale: (locale) => set((s) => ({ locale, localeVersion: s.localeVersion + 1 })),
  localeVersion: 0,
}));
