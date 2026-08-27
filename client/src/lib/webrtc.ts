import type { SignalPayload, DataChannelMessage } from "@/types";

type ChannelHandler = (peerId: string, channel: RTCDataChannel) => void;
type MessageHandler = (peerId: string, message: DataChannelMessage) => void;
type BinaryHandler = (peerId: string, data: ArrayBuffer) => void;
type StateHandler = (peerId: string, state: RTCPeerConnectionState) => void;
type IceCandidateHandler = (peerId: string, candidate: RTCIceCandidate) => void;

// TURN servers for relay (cross-network)
const TURN_SERVERS: RTCIceServer[] = [
  {
    urls: [
      "turn:openrelay.metered.ca:80",
      "turn:openrelay.metered.ca:443",
      "turn:openrelay.metered.ca:443?transport=tcp",
      "turn:openrelay.metered.ca:80?transport=tcp",
    ],
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: [
      "turn:openrelay.metered.ca:80?transport=udp",
    ],
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

// STUN servers for candidate gathering
const STUN_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:openrelay.metered.ca:80" },
];

// Combined: STUN + TURN for best connectivity
const RELAY_SERVERS: RTCIceServer[] = [
  ...STUN_SERVERS,
  ...TURN_SERVERS,
];

const DATA_CHANNEL_LABEL = "airshare-data";
const CHUNK_SIZE = 32 * 1024; // 32KB chunks
const BACKPRESSURE_THRESHOLD = 512 * 1024; // 512KB
const BACKPRESSURE_RESUME_THRESHOLD = 128 * 1024; // 128KB

export class WebRTCManager {
  private peers = new Map<string, RTCPeerConnection>();
  private channels = new Map<string, RTCDataChannel>();
  private pendingCandidates = new Map<string, RTCIceCandidateInit[]>();

  private channelHandlers = new Set<ChannelHandler>();
  private messageHandlers = new Set<MessageHandler>();
  private binaryHandlers = new Set<BinaryHandler>();
  private stateHandlers = new Set<StateHandler>();
  private iceCandidateHandlers = new Set<IceCandidateHandler>();

  // ─── Connection Management ─────────────────────────────

  async createOffer(peerId: string): Promise<SignalPayload> {
    // Clean up old PC first
    this.removePeer(peerId);
    
    const pc = this.getOrCreatePC(peerId, true); // initiator = true

    // Create data channel (offerer creates it)
    const channel = pc.createDataChannel(DATA_CHANNEL_LABEL, {
      ordered: true,
    });
    this.setupChannel(peerId, channel);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    console.log("[WebRTC] Created offer for", peerId);
    return { type: "offer", sdp: offer.sdp };
  }

  async handleOffer(peerId: string, sdp: string): Promise<SignalPayload> {
    // Save pending ICE candidates BEFORE removing the old PC
    const savedCandidates = this.pendingCandidates.get(peerId) || [];
    
    // Clean up old PC first
    this.removePeer(peerId);
    
    const pc = this.getOrCreatePC(peerId, false); // initiator = false

    await pc.setRemoteDescription({ type: "offer", sdp });
    
    // Flush any ICE candidates that arrived before the offer
    if (savedCandidates.length > 0) {
      console.log(`[WebRTC] Flushing ${savedCandidates.length} pending ICE candidates for`, peerId);
      for (const candidate of savedCandidates) {
        await pc.addIceCandidate(candidate).catch(console.error);
      }
    }
    
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    console.log("[WebRTC] Created answer for", peerId);
    return { type: "answer", sdp: answer.sdp };
  }

  async handleAnswer(peerId: string, sdp: string): Promise<void> {
    const pc = this.peers.get(peerId);
    if (!pc) {
      console.warn("[WebRTC] No PC for answer from", peerId);
      return;
    }

    await pc.setRemoteDescription({ type: "answer", sdp });
    console.log("[WebRTC] Set answer from", peerId);
    this.flushPendingCandidates(peerId);
  }

  async addIceCandidate(peerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const pc = this.peers.get(peerId);
    
    if (!pc) {
      // NO PC YET — store as pending (this is NORMAL when candidates arrive before offer/answer)
      const pending = this.pendingCandidates.get(peerId) || [];
      pending.push(candidate);
      this.pendingCandidates.set(peerId, pending);
      console.log(`[WebRTC] Stored pending ICE candidate for ${peerId} (no PC yet, queued: ${pending.length})`);
      return;
    }

    if (pc.remoteDescription) {
      await pc.addIceCandidate(candidate);
      console.log(`[WebRTC] Added ICE candidate for ${peerId}:`, candidate.candidate?.split(" ").slice(0, 5).join(" "));
    } else {
      const pending = this.pendingCandidates.get(peerId) || [];
      pending.push(candidate);
      this.pendingCandidates.set(peerId, pending);
      console.log(`[WebRTC] Queued ICE candidate for ${peerId} (no remote desc, queued: ${pending.length})`);
    }
  }

  removePeer(peerId: string) {
    const pc = this.peers.get(peerId);
    if (pc) {
      pc.close();
      this.peers.delete(peerId);
    }
    this.channels.delete(peerId);
    // NOTE: Do NOT clear pendingCandidates here — they may arrive before offer/answer
  }

  closeAll() {
    for (const [peerId] of this.peers) {
      this.removePeer(peerId);
    }
    this.pendingCandidates.clear();
  }

  // ─── Data Sending ─────────────────────────────────────

  sendMessage(peerId: string, message: DataChannelMessage) {
    const channel = this.channels.get(peerId);
    if (!channel || channel.readyState !== "open") {
      console.warn("[WebRTC] Channel not open for", peerId, "(state:", channel?.readyState, ")");
      return;
    }
    channel.send(JSON.stringify(message));
  }

  sendBinary(peerId: string, data: ArrayBuffer) {
    const channel = this.channels.get(peerId);
    if (!channel || channel.readyState !== "open") {
      return false;
    }

    if (channel.bufferedAmount > BACKPRESSURE_THRESHOLD) {
      return false;
    }

    channel.send(data);
    return true;
  }

  getBufferedAmount(peerId: string): number {
    const channel = this.channels.get(peerId);
    return channel?.bufferedAmount || 0;
  }

  waitForBufferDrain(peerId: string): Promise<void> {
    return new Promise((resolve) => {
      const channel = this.channels.get(peerId);
      if (!channel || channel.readyState !== "open") {
        resolve();
        return;
      }

      if (channel.bufferedAmount <= BACKPRESSURE_RESUME_THRESHOLD) {
        resolve();
        return;
      }

      const handler = () => {
        if (channel.bufferedAmount <= BACKPRESSURE_RESUME_THRESHOLD) {
          channel.removeEventListener("bufferedamountlow", handler);
          resolve();
        }
      };

      channel.bufferedAmountLowThreshold = BACKPRESSURE_RESUME_THRESHOLD;
      channel.addEventListener("bufferedamountlow", handler, { once: true });
    });
  }

  getChannelStats(peerId: string) {
    const channel = this.channels.get(peerId);
    return channel
      ? {
          bufferedAmount: channel.bufferedAmount,
          readyState: channel.readyState,
        }
      : null;
  }

  // ─── Event Handlers ───────────────────────────────────

  onChannel(handler: ChannelHandler): () => void {
    this.channelHandlers.add(handler);
    return () => this.channelHandlers.delete(handler);
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onBinary(handler: BinaryHandler): () => void {
    this.binaryHandlers.add(handler);
    return () => this.binaryHandlers.delete(handler);
  }

  onStateChange(handler: StateHandler): () => void {
    this.stateHandlers.add(handler);
    return () => this.stateHandlers.delete(handler);
  }

  onIceCandidate(handler: IceCandidateHandler): () => void {
    this.iceCandidateHandlers.add(handler);
    return () => this.iceCandidateHandlers.delete(handler);
  }

  // ─── Internals ────────────────────────────────────────

  private getOrCreatePC(peerId: string, isInitiator: boolean): RTCPeerConnection {
    let pc = this.peers.get(peerId);
    if (pc) return pc;

    // Use relay servers for cross-network reliability
    const config: RTCConfiguration = {
      iceServers: RELAY_SERVERS,
      iceCandidatePoolSize: 10,
      iceTransportPolicy: "all",
    };

    pc = new RTCPeerConnection(config);

    // Log ICE gathering state
    pc.onicegatheringstatechange = () => {
      console.log("[WebRTC] ICE gathering:", pc!.iceGatheringState, "for", peerId);
    };

    pc.oniceconnectionstatechange = () => {
      console.log("[WebRTC] ICE connection:", pc!.iceConnectionState, "for", peerId);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const type = event.candidate.type || "unknown";
        const proto = event.candidate.protocol || "?";
        console.log(`[WebRTC] ICE candidate: ${type} (${proto}) for`, peerId);
        this.iceCandidateHandlers.forEach((h) => h(peerId, event.candidate!));
      } else {
        console.log("[WebRTC] ICE gathering complete for", peerId);
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc!.connectionState;
      console.log("[WebRTC] Connection state:", state, "for", peerId);
      this.stateHandlers.forEach((h) => h(peerId, state));
    };

    pc.ondatachannel = (event) => {
      console.log("[WebRTC] Received data channel from", peerId);
      this.setupChannel(peerId, event.channel);
    };

    this.peers.set(peerId, pc);
    console.log("[WebRTC] Created PC for", peerId, isInitiator ? "(initiator)" : "(receiver)");
    return pc;
  }

  private setupChannel(peerId: string, channel: RTCDataChannel) {
    channel.binaryType = "arraybuffer";

    channel.onopen = () => {
      console.log("[WebRTC] DataChannel OPEN for", peerId);
      this.channels.set(peerId, channel);
      this.channelHandlers.forEach((h) => h(peerId, channel));
    };

    channel.onclose = () => {
      console.log("[WebRTC] DataChannel CLOSED for", peerId);
      if (this.channels.get(peerId) === channel) {
        this.channels.delete(peerId);
      }
    };

    channel.onerror = (event) => {
      console.error("[WebRTC] DataChannel ERROR for", peerId, event);
    };

    channel.onmessage = (event) => {
      if (typeof event.data === "string") {
        try {
          const message = JSON.parse(event.data) as DataChannelMessage;
          this.messageHandlers.forEach((h) => h(peerId, message));
        } catch {
          console.error("[WebRTC] Failed to parse message");
        }
      } else if (event.data instanceof ArrayBuffer) {
        this.binaryHandlers.forEach((h) => h(peerId, event.data));
      }
    };
  }

  private flushPendingCandidates(peerId: string) {
    const pending = this.pendingCandidates.get(peerId);
    if (!pending || pending.length === 0) return;

    const pc = this.peers.get(peerId);
    if (!pc) return;

    console.log(`[WebRTC] Flushing ${pending.length} pending ICE candidates for`, peerId);
    for (const candidate of pending) {
      pc.addIceCandidate(candidate).catch(console.error);
    }

    this.pendingCandidates.delete(peerId);
  }
}

// Singleton
let instance: WebRTCManager | null = null;

export function getWebRTCManager(): WebRTCManager {
  if (!instance) {
    instance = new WebRTCManager();
  }
  return instance;
}
