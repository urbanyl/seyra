import { rt } from './rt';

type Peer = {
  id: string;
  name: string;
  pc: RTCPeerConnection;
  audio: HTMLAudioElement;
  pending: RTCIceCandidateInit[];
  remoteSet: boolean;
};

export type VoiceState = {
  active: boolean;
  label: string;
  muted: boolean;
  deafened: boolean;
  peers: { id: string; name: string; speaking: boolean }[];
  error: string | null;
};

const ICE: RTCConfiguration = {
  iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }],
};

class VoiceManager {
  state: VoiceState = { active: false, label: '', muted: false, deafened: false, peers: [], error: null };
  private peers = new Map<string, Peer>();
  private local: MediaStream | null = null;
  private listeners = new Set<(s: VoiceState) => void>();
  private levels = new Map<string, boolean>();
  private audioCtx: AudioContext | null = null;
  private raf = 0;
  private uid = '';

  setMe(id: string) { this.uid = id; }

  subscribe(fn: (s: VoiceState) => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }

  private emit() {
    this.state = {
      ...this.state,
      peers: [...this.peers.values()].map((p) => ({
        id: p.id, name: p.name, speaking: this.levels.get(p.id) || false,
      })),
    };
    for (const fn of this.listeners) fn(this.state);
  }

  async join(label: string) {
    if (this.state.active) this.leave();
    this.state = { active: true, label, muted: false, deafened: false, peers: [], error: null };
    this.emit();
    try {
      this.local = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      this.monitor(this.local, 'me');
    } catch {
      this.state.error = "Micro inaccessible — vérifiez les autorisations du navigateur.";
      this.emit();
    }
    rt.send({ t: 'voice:join' });
  }

  leave() {
    for (const p of this.peers.values()) {
      try { p.pc.close(); } catch {}
      p.audio.srcObject = null;
      p.audio.remove();
    }
    this.peers.clear();
    rt.send({ t: 'voice:leave' });
    this.local?.getTracks().forEach((t) => t.stop());
    this.local = null;
    cancelAnimationFrame(this.raf);
    this.levels.clear();
    this.state = { ...this.state, active: false, peers: [], error: null, muted: false };
    this.emit();
  }

  toggleMute() {
    if (!this.local) return;
    const track = this.local.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    this.state.muted = !track.enabled;
    this.emit();
  }

  toggleDeafen() {
    this.state.deafened = !this.state.deafened;
    for (const p of this.peers.values()) p.audio.muted = this.state.deafened;
    this.emit();
  }

  private monitor(stream: MediaStream, id: string) {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = this.audioCtx || new Ctx();
      const src = this.audioCtx.createMediaStreamSource(stream);
      const analyser = this.audioCtx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const speaking = this.state.muted ? false : sum / data.length > 18;
        if (this.levels.get(id) !== speaking) { this.levels.set(id, speaking); this.emit(); }
        if (id === 'me') this.raf = requestAnimationFrame(tick);
      };
      tick();
    } catch {}
  }

  private pcFor(id: string, name: string) {
    const existing = this.peers.get(id);
    if (existing) return existing;
    const pc = new RTCPeerConnection(ICE);
    const audio = document.createElement('audio');
    audio.autoplay = true;
    audio.muted = this.state.deafened;
    document.body.appendChild(audio);
    const peer: Peer = { id, name, pc, audio, pending: [], remoteSet: false };
    this.peers.set(id, peer);
    this.local?.getTracks().forEach((t) => pc.addTrack(t, this.local!));
    pc.onicecandidate = (e) => {
      if (e.candidate) rt.send({ t: 'voice:signal', to: id, data: { type: 'candidate', candidate: e.candidate } });
    };
    pc.ontrack = (e) => {
      const stream = e.streams[0] || new MediaStream([e.track]);
      audio.srcObject = stream;
      audio.play().catch(() => {});
      this.monitor(stream, id);
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') this.dropPeer(id);
    };
    this.emit();
    return peer;
  }

  private dropPeer(id: string) {
    const p = this.peers.get(id);
    if (!p) return;
    try { p.pc.close(); } catch {}
    p.audio.remove();
    this.peers.delete(id);
    this.levels.delete(id);
    this.emit();
  }

  async handle(msg: any) {
    if (!this.state.active) return;
    switch (msg.t) {
      case 'voice:peers': {
        for (const p of (msg.peers || []) as { id: string; name: string }[]) {
          if (p.id === this.uid) continue;
          const peer = this.pcFor(p.id, p.name);
          if (peer.pc.localDescription) continue;
          const offer = await peer.pc.createOffer();
          await peer.pc.setLocalDescription(offer);
          rt.send({ t: 'voice:signal', to: p.id, data: { type: 'offer', sdp: peer.pc.localDescription } });
        }
        this.emit();
        break;
      }
      case 'voice:peer-join':
        if (msg.userId !== this.uid) this.pcFor(msg.userId, msg.name || 'Invité');
        break;
      case 'voice:peer-leave':
        this.dropPeer(msg.userId);
        break;
      case 'voice:signal': {
        const peer = this.pcFor(msg.from, 'Invité');
        const data = msg.data || {};
        if (data.type === 'offer') {
          await peer.pc.setRemoteDescription(data.sdp);
          peer.remoteSet = true;
          for (const c of peer.pending.splice(0)) await peer.pc.addIceCandidate(c).catch(() => {});
          const answer = await peer.pc.createAnswer();
          await peer.pc.setLocalDescription(answer);
          rt.send({ t: 'voice:signal', to: msg.from, data: { type: 'answer', sdp: peer.pc.localDescription } });
        } else if (data.type === 'answer') {
          await peer.pc.setRemoteDescription(data.sdp);
          peer.remoteSet = true;
          for (const c of peer.pending.splice(0)) await peer.pc.addIceCandidate(c).catch(() => {});
        } else if (data.type === 'candidate') {
          if (peer.remoteSet) await peer.pc.addIceCandidate(data.candidate).catch(() => {});
          else peer.pending.push(data.candidate);
        }
        break;
      }
    }
  }
}

export const voice = new VoiceManager();
