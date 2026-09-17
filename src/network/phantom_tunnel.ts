/**
 * AETHER-Z³ SOVEREIGN OS
 * MODULE: PHANTOM TUNNEL (Viral Loop Protocol)
 * ARCHITECT: Muhammad Aidil Amry
 * CLASSIFICATION: OMEGA-LEVEL ZERO-TRUST
 */

import { QuantumShield } from "../crypto/amnesia";

export type ReadyState = "new" | "connecting" | "connected" | "closed";

export interface PhantomTunnelOptions {
  iceServers?: RTCIceServer[];
  channelLabel?: string;
  rtcConfig?: RTCConfiguration;
  iceGatheringTimeoutMs?: number;
  quantumShield: QuantumShield;
}

export interface PhantomTunnelEvents {
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: unknown) => void;
  onMessage?: (data: Uint8Array) => void;
  onStateChange?: (state: ReadyState) => void;
}

export function base64EncodeUtf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function base64DecodeUtf8(base64: string): string {
  const binary = atob(base64.trim());
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function waitForEvent<T extends Event>(
  target: EventTarget,
  eventName: string,
  timeoutMs: number,
  predicate?: (event: T) => boolean,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout waiting for ${eventName}`));
    }, timeoutMs);

    const handler = (event: Event) => {
      const e = event as T;
      if (predicate && !predicate(e)) return;
      cleanup();
      resolve(e);
    };

    const cleanup = () => {
      clearTimeout(timeout);
      target.removeEventListener(eventName, handler as EventListener);
    };

    target.addEventListener(eventName, handler as EventListener);
  });
}

export class PhantomTunnel {
  private pc: RTCPeerConnection;
  private dc?: RTCDataChannel;
  private readonly options: PhantomTunnelOptions;
  private readonly events: PhantomTunnelEvents;
  private _state: ReadyState = "new";

  constructor(options: PhantomTunnelOptions, events: PhantomTunnelEvents = {}) {
    this.options = {
      channelLabel: options.channelLabel ?? "phantom",
      iceGatheringTimeoutMs: options.iceGatheringTimeoutMs ?? 15000,
      ...options,
    };

    this.events = events;

    this.pc = new RTCPeerConnection(
      options.rtcConfig ?? {
        iceServers: options.iceServers ?? [{ urls: "stun:stun.l.google.com:19302" }],
      },
    );

    this.bindPeerConnectionEvents();
  }

  get state(): ReadyState {
    return this._state;
  }

  private setState(state: ReadyState): void {
    this._state = state;
    this.events.onStateChange?.(state);
  }

  private bindPeerConnectionEvents(): void {
    this.pc.onconnectionstatechange = () => {
      const s = this.pc.connectionState;
      if (s === "connected") this.setState("connected");
      else if (s === "connecting") this.setState("connecting");
      else if (s === "disconnected" || s === "failed" || s === "closed") this.close();
    };

    this.pc.oniceconnectionstatechange = () => {
      const s = this.pc.iceConnectionState;
      if (s === "connected" && this._state !== "connected") this.setState("connected");
      if (s === "checking") this.setState("connecting");
      if (s === "failed" || s === "closed" || s === "disconnected") this.close();
    };

    this.pc.ondatachannel = (event) => {
      this.attachDataChannel(event.channel);
    };
  }

  private attachDataChannel(channel: RTCDataChannel): void {
    this.dc = channel;
    this.dc.binaryType = "arraybuffer";

    this.dc.onopen = () => {
      this.events.onOpen?.();
    };

    this.dc.onmessage = async (event) => {
      try {
        const rawData = new Uint8Array(event.data);
        const decryptedData = await this.options.quantumShield.decryptPayload(rawData);
        this.events.onMessage?.(decryptedData);
      } catch (err) {
        this.events.onError?.(err);
      }
    };

    this.dc.onclose = () => {
      this.close();
    };
  }

  public async createOffer(): Promise<string> {
    this.attachDataChannel(this.pc.createDataChannel(this.options.channelLabel ?? "phantom"));
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    await waitForEvent(this.pc, "icegatheringstatechange", this.options.iceGatheringTimeoutMs ?? 15000, () =>
      this.pc.iceGatheringState === "complete",
    );

    return base64EncodeUtf8(JSON.stringify(this.pc.localDescription));
  }

  public async createAnswer(): Promise<string> {
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    await waitForEvent(this.pc, "icegatheringstatechange", this.options.iceGatheringTimeoutMs ?? 15000, () =>
      this.pc.iceGatheringState === "complete",
    );

    return base64EncodeUtf8(JSON.stringify(this.pc.localDescription));
  }

  public async acceptRemoteDescription(base64Sdp: string): Promise<void> {
    const sdpJson = JSON.parse(base64DecodeUtf8(base64Sdp));
    await this.pc.setRemoteDescription(new RTCSessionDescription(sdpJson));
  }

  public async send(data: Uint8Array): Promise<void> {
    if (!this.dc || this.dc.readyState !== "open") {
      throw new Error("[FATAL] Phantom Tunnel not synchronized.");
    }
    const encryptedData = await this.options.quantumShield.encryptPayload(data);
    this.dc.send(encryptedData.buffer as ArrayBuffer);
  }

  public async close(): Promise<void> {
    try {
      if (this.dc && this.dc.readyState !== "closed") this.dc.close();
    } finally {
      if (this.pc.signalingState !== "closed") this.pc.close();
      this.setState("closed");
      this.events.onClose?.();

      this.options.quantumShield.destroySessionKeys();
    }
  }
}
