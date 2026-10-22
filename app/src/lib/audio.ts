/* Messages vocaux : enregistrement local puis scellement comme n'importe quel
 * message. Aucun upload séparé : l'audio voyage dans l'enveloppe chiffrée.
 */

export type VoiceClip = { mime: string; data: string; dur: number };

export const MAX_VOICE_MS = 60_000;

const CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/ogg;codecs=opus',
  'audio/mp4',
  'audio/webm',
];

export function pickMime(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  for (const m of CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(m)) return m;
    } catch {
      /* navigateur capricieux : on essaie le suivant */
    }
  }
  return '';
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = String(reader.result || '');
      const i = s.indexOf(',');
      resolve(i >= 0 ? s.slice(i + 1) : '');
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function base64ToBlob(data: string, mime: string): Blob {
  const bin = atob(data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime || 'audio/webm' });
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/** Encode un AudioBuffer mono en WAV PCM 16 bits little-endian (en-tête RIFF 44 o). */
function encodeWav(buffer: AudioBuffer): Blob {
  const channels = 1;
  const sampleRate = buffer.sampleRate;
  const samples = buffer.length;
  const dataSize = samples * channels * 2;
  const bytes = new ArrayBuffer(44 + dataSize);
  const view = new DataView(bytes);

  const writeString = (offset: number, text: string): void => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const data = buffer.getChannelData(0);
  let offset = 44;
  for (let i = 0; i < samples; i++) {
    const clamp = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(offset, clamp < 0 ? clamp * 0x8000 : clamp * 0x7fff, true);
    offset += 2;
  }

  return new Blob([bytes], { type: 'audio/wav' });
}

type AudioContextCtor = typeof AudioContext;

function audioContextCtor(): AudioContextCtor | undefined {
  if (typeof AudioContext !== 'undefined') return AudioContext;
  const legacy = (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  return legacy;
}

/** Décode n'importe quel format capturé puis le ré-échantillonne en WAV mono 12 kHz. */
async function toWav(blob: Blob): Promise<{ blob: Blob; dur: number } | null> {
  let ctx: AudioContext | null = null;
  try {
    const Ctor = audioContextCtor();
    if (!Ctor) return null;
    ctx = new Ctor();
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    const rate = 12000;
    const frames = Math.max(1, Math.ceil(decoded.duration * rate));
    const offline = new OfflineAudioContext(1, frames, rate);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return { blob: encodeWav(rendered), dur: decoded.duration };
  } catch {
    return null;
  } finally {
    if (ctx) {
      try {
        await ctx.close();
      } catch {
        /* déjà fermé */
      }
    }
  }
}

/** Enregistreur minimal : micro, opus 32 kbit/s, arrêt propre du flux. */
export class AudioRecorder {
  private rec: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private startedAt = 0;

  get recording() {
    return this.rec !== null;
  }

  elapsed(): number {
    return this.startedAt ? Date.now() - this.startedAt : 0;
  }

  async start(): Promise<void> {
    if (this.rec) return;
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    const mime = pickMime();
    const opts: MediaRecorderOptions = { audioBitsPerSecond: 32000 };
    if (mime) opts.mimeType = mime;
    this.rec = new MediaRecorder(this.stream, opts);
    this.chunks = [];
    this.rec.ondataavailable = (e) => {
      if (e.data && e.data.size) this.chunks.push(e.data);
    };
    this.startedAt = Date.now();
    this.rec.start(250);
  }

  /** Arrête et renvoie le clip, ou null si rien n'a été capturé. */
  async stop(): Promise<VoiceClip | null> {
    const rec = this.rec;
    if (!rec) return null;
    const dur = (Date.now() - this.startedAt) / 1000;
    await new Promise<void>((resolve) => {
      rec.onstop = () => resolve();
      try {
        rec.stop();
      } catch {
        resolve();
      }
    });
    const mime = rec.mimeType || 'audio/webm';
    this.release();
    const raw = new Blob(this.chunks, { type: mime });
    this.chunks = [];
    if (!raw.size) return null;
    const wav = await toWav(raw);
    if (wav) return { mime: 'audio/wav', data: await blobToBase64(wav.blob), dur: wav.dur };
    return { mime, data: await blobToBase64(raw), dur };
  }

  /** Abandonne l'enregistrement en cours sans rien produire. */
  cancel(): void {
    try {
      this.rec?.stop();
    } catch {
      /* déjà arrêté */
    }
    this.chunks = [];
    this.release();
  }

  private release(): void {
    this.rec = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.startedAt = 0;
  }
}
