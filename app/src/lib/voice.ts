import { rt } from './rt';

/* Appels de groupe en maillage WebRTC.
 * - Négociation « perfect negotiation » : pas de collision d'offres quand deux personnes arrivent ensemble.
 * - Reconnexion ICE automatique quand le chemin réseau tombe.
 * - Micro coupé = piste désactivée (plus aucun son envoyé) ; casque coupé = plus aucun son reçu
 *   et micro coupé aussi, comme dans Discord. Les deux états sont diffusés aux autres participants.
 */

type Peer = {
  id: string;
  name: string;
  pc: RTCPeerConnection;
  audio: HTMLAudioElement;
  screenAudio: HTMLAudioElement;
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  pendingIce: RTCIceCandidateInit[];
  muted: boolean;
  deaf: boolean;
  speaking: boolean;
  analyser: AnalyserNode | null;
  screen: MediaStream | null;
  screenMuted: boolean;
  disconnectTimer?: number;
};

export type VoicePeer = { id: string; name: string; muted: boolean; deaf: boolean; speaking: boolean; connected: boolean; screen: MediaStream | null; screenMuted: boolean };

export type VoiceState = {
  active: boolean;
  muted: boolean;
  deafened: boolean;
  peers: VoicePeer[];
  selfSpeaking: boolean;
  sharing: boolean;
  screen: MediaStream | null;
  error: string | null;
};

const DEFAULT_ICE: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302'] }];

const EMPTY: VoiceState = { active: false, muted: false, deafened: false, peers: [], selfSpeaking: false, sharing: false, screen: null, error: null };

class VoiceManager {
  state: VoiceState = { ...EMPTY };
  private peers = new Map<string, Peer>();
  private local: MediaStream | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private listeners = new Set<(s: VoiceState) => void>();
  private ctx: AudioContext | null = null;
  private raf = 0;
  private uid = '';
  private ice: RTCIceServer[] = DEFAULT_ICE;
  private micBeforeDeaf = true;
  private connectedPeers = new Set<string>();
  private screen: MediaStream | null = null;
  private screenSender: RTCRtpSender | null = null;

  setMe(id: string) { this.uid = id; }
  setIce(servers: RTCIceServer[] | undefined) { if (servers?.length) this.ice = servers; }

  subscribe(fn: (s: VoiceState) => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }

  private emit(patch?: Partial<VoiceState>) {
    if (patch) this.state = { ...this.state, ...patch };
    this.state = {
      ...this.state,
      screen: this.screen,
      peers: [...this.peers.values()].map((p) => ({
        id: p.id, name: p.name, muted: p.muted, deaf: p.deaf, speaking: p.speaking,
        connected: this.connectedPeers.has(p.id), screen: p.screen, screenMuted: p.screenMuted,
      })),
    };
    for (const fn of this.listeners) fn(this.state);
  }

  private send(obj: Record<string, unknown>) { rt.send(obj); }

  private sendState() {
    this.send({ t: 'voice:state', muted: this.state.muted, deaf: this.state.deafened });
  }

  /** Petit signal sonore généré localement : [fréquence Hz, début s, durée s]. */
  private tone(notes: [number, number, number][]) {
    const ctx = this.audioContext();
    if (!ctx) return;
    ctx.resume().catch(() => {});
    const t0 = ctx.currentTime + 0.02;
    for (const [freq, start, dur] of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0 + start);
      gain.gain.exponentialRampToValueAtTime(0.16, t0 + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0 + start);
      osc.stop(t0 + start + dur + 0.02);
    }
  }

  private playJoin() { this.tone([[660, 0, 0.14], [880, 0.16, 0.24]]); }
  private playLeave() { this.tone([[880, 0, 0.14], [660, 0.16, 0.24]]); }
  private playMicOff() { this.tone([[600, 0, 0.1], [420, 0.1, 0.12]]); }
  private playMicOn() { this.tone([[420, 0, 0.1], [600, 0.1, 0.12]]); }
  private playDeafOff() { this.tone([[520, 0, 0.1], [300, 0.12, 0.2]]); }
  private playDeafOn() { this.tone([[300, 0, 0.1], [520, 0.12, 0.2]]); }

  async join() {
    if (this.state.active) return;
    this.playJoin();
    this.emit({ active: true, muted: false, deafened: false, error: null, selfSpeaking: false });
    this.micBeforeDeaf = true;
    try {
      this.local = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      this.monitorLocal(this.local);
    } catch {
      this.emit({ error: "Micro inaccessible : autorisez le micro pour ce site (cadenas dans la barre d'adresse)." });
    }
    this.audioContext()?.resume().catch(() => {});
    this.send({ t: 'voice:join', muted: false, deaf: false });
  }

  leave() {
    if (this.state.active) this.playLeave();
    this.stopScreen(false);
    for (const id of [...this.peers.keys()]) this.removePeer(id);
    this.send({ t: 'voice:leave' });
    this.local?.getTracks().forEach((t) => t.stop());
    this.local = null;
    this.localAnalyser = null;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.connectedPeers.clear();
    this.emit({ ...EMPTY });
  }

  private applyMic(muted: boolean) {
    const track = this.local?.getAudioTracks()[0];
    if (track) track.enabled = !muted;
    if (muted !== this.state.muted) (muted ? this.playMicOff() : this.playMicOn());
    this.emit({ muted });
    this.sendState();
  }

  toggleMute() {
    if (!this.state.active) return;
    if (this.state.deafened) {
      // Micro réactivé alors que le casque est coupé : on réactive aussi le son.
      this.micBeforeDeaf = true;
      this.setDeaf(false);
      this.applyMic(false);
      return;
    }
    this.applyMic(!this.state.muted);
  }

  toggleDeafen() {
    if (!this.state.active) return;
    this.setDeaf(!this.state.deafened);
  }

  private setDeaf(deaf: boolean) {
    if (deaf !== this.state.deafened) (deaf ? this.playDeafOff() : this.playDeafOn());
    if (deaf) {
      this.micBeforeDeaf = !this.state.muted;
      if (!this.state.muted) this.applyMicQuiet(true);
    } else if (this.micBeforeDeaf) {
      this.applyMicQuiet(false);
    }
    for (const p of this.peers.values()) { p.audio.muted = deaf; p.screenAudio.muted = deaf || p.screenMuted; }
    this.emit({ deafened: deaf, muted: deaf ? true : this.state.muted });
    this.sendState();
  }

  private applyMicQuiet(muted: boolean) {
    const track = this.local?.getAudioTracks()[0];
    if (track) track.enabled = !muted;
    this.state = { ...this.state, muted };
  }

  /** Partagé entre tous les pairs : la piste vidéo (et audio) d'écran. */
  private applyScreenToPeers() {
    for (const p of this.peers.values()) {
      const video = this.screen?.getVideoTracks()[0] || null;
      const audio = this.screen?.getAudioTracks()[0] || null;
      this.syncSender(p, video, '__screen');
      this.syncSender(p, audio, '__screenAudio');
    }
  }

  private syncSender(p: Peer, track: MediaStreamTrack | null, flag: string) {
    try {
      const existing = p.pc.getSenders().find((s) => (s as any)[flag]);
      if (track) {
        if (existing) existing.replaceTrack(track);
        else {
          const sender = p.pc.addTrack(track, this.screen!);
          (sender as any)[flag] = true;
        }
      } else if (existing) {
        p.pc.removeTrack(existing);
      }
    } catch { /* renegotiation suivante */ }
  }

  async shareScreen() {
    if (!this.state.active || this.screen) return;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 15 },
        audio: true,
      });
      this.screen = stream;
      this.applyScreenToPeers();
      const track = stream.getVideoTracks()[0];
      track.addEventListener('ended', () => this.stopScreen(true));
      this.emit({ sharing: true });
    } catch {
      /* partage refusé ou annulé */
    }
  }

  stopScreen(signal = true) {
    if (!this.screen) return;
    this.screen.getTracks().forEach((t) => t.stop());
    this.screen = null;
    for (const p of this.peers.values()) {
      for (const s of p.pc.getSenders()) {
        if ((s as any).__screen || (s as any).__screenAudio) { try { p.pc.removeTrack(s); } catch {} }
      }
    }
    this.emit({ sharing: false });
    void signal;
  }

  toggleScreen() {
    if (this.screen) this.stopScreen(true);
    else void this.shareScreen();
  }

  /** Met à jour le nom d'un pair après un renommage (sinon l'appel affiche l'ancien pseudo). */
  renamePeer(id: string, name: string) {
    const p = this.peers.get(id);
    if (!p || p.name === name) return;
    p.name = name;
    this.emit();
  }

  /** Coupe ou remet le son du partage d'écran d'un pair (fermer/rouvrir sa fenêtre). */
  setScreenSound(id: string, on: boolean) {
    const p = this.peers.get(id);
    if (!p) return;
    p.screenMuted = !on;
    p.screenAudio.muted = !on || this.state.deafened;
    this.emit();
  }

  private audioContext() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
    }
    return this.ctx;
  }

  private attachAnalyser(stream: MediaStream): AnalyserNode | null {
    const ctx = this.audioContext();
    if (!ctx || stream.getAudioTracks().length === 0) return null;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.6;
    ctx.createMediaStreamSource(stream).connect(analyser);
    return analyser;
  }

  private monitorLocal(stream: MediaStream) {
    this.localAnalyser = this.attachAnalyser(stream);
    this.startLoop();
  }

  private startLoop() {
    if (this.raf) return;
    const time = new Uint8Array(1024);
    // Détection de parole plus fine qu'un simple seuil : RMS filtré par un
    // plancher de bruit adaptatif et une hystérésis, pour ne pas clignoter au
    // moindre souffle et réagir franc quand on parle.
    type Meter = { rms: number; floor: number; on: boolean };
    const meters = new WeakMap<AnalyserNode, Meter>();

    const meterOf = (a: AnalyserNode): Meter => {
      let m = meters.get(a);
      if (!m) { m = { rms: 0, floor: 0.004, on: false }; meters.set(a, m); }
      return m;
    };

    const measure = (a: AnalyserNode, m: Meter): boolean => {
      a.getByteTimeDomainData(time);
      let sum = 0;
      for (let i = 0; i < time.length; i++) {
        const v = (time[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / time.length);
      // Lissage asymétrique : montée rapide (réactivité), descente douce (stabilité).
      m.rms = rms > m.rms ? m.rms + (rms - m.rms) * 0.55 : m.rms + (rms - m.rms) * 0.12;
      // Plancher de bruit : suit lentement l'ambiance, borné.
      m.floor = m.floor + (Math.min(m.rms, 0.05) - m.floor) * 0.02;
      m.floor = Math.max(0.002, Math.min(m.floor, 0.02));
      const high = Math.max(0.016, m.floor * 3.2);
      const low = Math.max(0.008, m.floor * 1.7);
      if (m.on) { if (m.rms < low) m.on = false; }
      else if (m.rms > high) m.on = true;
      return m.on;
    };

    const tick = () => {
      let changed = false;
      if (this.localAnalyser) {
        const on = measure(this.localAnalyser, meterOf(this.localAnalyser));
        const speaking = !this.state.muted && on;
        if (speaking !== this.state.selfSpeaking) { this.state = { ...this.state, selfSpeaking: speaking }; changed = true; }
      }
      for (const p of this.peers.values()) {
        if (!p.analyser) continue;
        const on = measure(p.analyser, meterOf(p.analyser));
        const speaking = !p.muted && !p.deaf && on;
        if (speaking !== p.speaking) { p.speaking = speaking; changed = true; }
      }
      if (changed) this.emit();
      if (this.state.active) this.raf = requestAnimationFrame(tick);
      else this.raf = 0;
    };
    this.raf = requestAnimationFrame(tick);
  }

  private ensurePeer(id: string, name: string, muted = false, deaf = false): Peer {
    const existing = this.peers.get(id);
    if (existing) return existing;

    const pc = new RTCPeerConnection({ iceServers: this.ice, bundlePolicy: 'max-bundle' });
    const audio = document.createElement('audio');
    audio.autoplay = true;
    audio.setAttribute('playsinline', '');
    audio.muted = this.state.deafened;
    audio.style.display = 'none';
    document.body.appendChild(audio);

    const screenAudio = document.createElement('audio');
    screenAudio.autoplay = true;
    screenAudio.setAttribute('playsinline', '');
    screenAudio.muted = this.state.deafened;
    screenAudio.style.display = 'none';
    document.body.appendChild(screenAudio);

    const peer: Peer = {
      id, name, pc, audio, screenAudio,
      polite: this.uid < id,
      makingOffer: false,
      ignoreOffer: false,
      pendingIce: [],
      muted, deaf,
      speaking: false,
      analyser: null,
      screen: null,
      screenMuted: false,
    };
    this.peers.set(id, peer);

    if (this.local) {
      for (const track of this.local.getAudioTracks()) pc.addTrack(track, this.local);
    } else {
      pc.addTransceiver('audio', { direction: 'recvonly' });
    }
    if (this.screen) {
      const vt = pc.addTrack(this.screen.getVideoTracks()[0], this.screen);
      (vt as any).__screen = true;
      const at = this.screen.getAudioTracks()[0];
      if (at) {
        const as = pc.addTrack(at, this.screen);
        (as as any).__screenAudio = true;
      }
    }

    pc.onnegotiationneeded = async () => {
      try {
        peer.makingOffer = true;
        await pc.setLocalDescription();
        this.send({ t: 'voice:signal', to: id, data: { type: 'sdp', sdp: pc.localDescription } });
      } catch {
        /* renégociation suivante */
      } finally {
        peer.makingOffer = false;
      }
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) this.send({ t: 'voice:signal', to: id, data: { type: 'ice', candidate: e.candidate } });
    };

    pc.ontrack = (e) => {
      if (e.track.kind === 'video') {
        const stream = new MediaStream([e.track]);
        peer.screen = stream;
        e.track.addEventListener('ended', () => {
          peer.screen = null;
          this.emit();
        });
        this.emit();
        return;
      }
      // Deux pistes audio possibles : d'abord la voix, puis l'audio du partage d'écran.
      const stream = new MediaStream([e.track]);
      if (!peer.audio.srcObject) {
        peer.audio.srcObject = stream;
        peer.audio.play().catch(() => {});
        peer.analyser = this.attachAnalyser(stream);
        this.startLoop();
      } else {
        peer.screenAudio.srcObject = stream;
        peer.screenAudio.muted = peer.screenMuted || this.state.deafened;
        peer.screenAudio.play().catch(() => {});
      }
      this.emit();
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === 'connected') {
        window.clearTimeout(peer.disconnectTimer);
        this.connectedPeers.add(id);
        this.emit({ error: null });
      } else if (s === 'disconnected') {
        this.connectedPeers.delete(id);
        window.clearTimeout(peer.disconnectTimer);
        peer.disconnectTimer = window.setTimeout(() => {
          if (pc.connectionState === 'disconnected') pc.restartIce();
        }, 2500);
        this.emit();
      } else if (s === 'failed') {
        this.connectedPeers.delete(id);
        pc.restartIce();
        this.emit();
      } else if (s === 'closed') {
        this.connectedPeers.delete(id);
      }
    };

    this.emit();
    return peer;
  }

  private removePeer(id: string) {
    const p = this.peers.get(id);
    if (!p) return;
    window.clearTimeout(p.disconnectTimer);
    p.pc.onnegotiationneeded = null;
    p.pc.onicecandidate = null;
    p.pc.ontrack = null;
    try { p.pc.close(); } catch {}
    p.audio.srcObject = null;
    p.audio.remove();
    p.screenAudio.srcObject = null;
    p.screenAudio.remove();
    this.peers.delete(id);
    this.connectedPeers.delete(id);
    this.emit();
  }

  private async handleSignal(from: string, data: any) {
    const peer = this.ensurePeer(from, 'Invité');
    const pc = peer.pc;

    if (data.type === 'ice') {
      if (!pc.remoteDescription) { peer.pendingIce.push(data.candidate); return; }
      try { await pc.addIceCandidate(data.candidate); } catch (e) { if (!peer.ignoreOffer) console.debug(e); }
      return;
    }

    if (data.type === 'sdp') {
      const desc: RTCSessionDescriptionInit = data.sdp;
      const collision = desc.type === 'offer' && (peer.makingOffer || pc.signalingState !== 'stable');
      peer.ignoreOffer = !peer.polite && collision;
      if (peer.ignoreOffer) return;
      await pc.setRemoteDescription(desc);
      for (const c of peer.pendingIce.splice(0)) await pc.addIceCandidate(c).catch(() => {});
      if (desc.type === 'offer') {
        await pc.setLocalDescription();
        this.send({ t: 'voice:signal', to: from, data: { type: 'sdp', sdp: pc.localDescription } });
      }
    }
  }

  /** Statistiques réelles reçues (octets) : sert à vérifier que le son circule. */
  async inboundBytes(): Promise<Record<string, number>> {
    const out: Record<string, number> = {};
    for (const p of this.peers.values()) {
      const stats = await p.pc.getStats();
      stats.forEach((r: any) => {
        if (r.type === 'inbound-rtp' && r.kind === 'audio') out[p.id] = (out[p.id] || 0) + (r.bytesReceived || 0);
      });
    }
    return out;
  }

  async handle(msg: any) {
    switch (msg.t) {
      case 'voice:peers':
        if (!this.state.active) return;
        for (const p of (msg.peers || []) as { id: string; name: string; muted: boolean; deaf: boolean }[]) {
          if (p.id !== this.uid) this.ensurePeer(p.id, p.name, p.muted, p.deaf);
        }
        break;
      case 'voice:peer-join':
        if (!this.state.active || msg.userId === this.uid) return;
        this.ensurePeer(msg.userId, msg.name || 'Invité', msg.muted, msg.deaf);
        break;
      case 'voice:peer-leave':
        this.removePeer(msg.userId);
        break;
      case 'voice:state': {
        const p = this.peers.get(msg.userId);
        if (p) {
          p.muted = !!msg.muted;
          p.deaf = !!msg.deaf;
          this.emit();
        }
        break;
      }
      case 'voice:signal':
        if (!this.state.active) return;
        await this.handleSignal(msg.from, msg.data || {});
        break;
      case 'voice:error':
        this.emit({ error: msg.message || 'Appel impossible.' });
        this.leave();
        this.emit({ error: msg.message || 'Appel impossible.' });
        break;
    }
  }
}

export const voice = new VoiceManager();
(window as any).__seyraVoice = voice;
