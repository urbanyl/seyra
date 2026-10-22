import { useEffect, useMemo, useRef, useState } from 'react';
import { base64ToBlob, formatTime, type VoiceClip } from '../lib/audio';
import { IconPause, IconPlay } from './Icons';

const BARS = 24;

export default function VoicePlayer({ clip }: { clip: VoiceClip }) {
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(clip.dur || 0);
  const [failed, setFailed] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  // Le blob n'existe que pour ce message : on le libère en quittant.
  const url = useMemo(() => URL.createObjectURL(base64ToBlob(clip.data, clip.mime)), [clip.data, clip.mime]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  useEffect(() => {
    setPlaying(false);
    setCur(0);
    setDur(clip.dur || 0);
    setFailed(false);
  }, [clip.data, clip.dur]);

  const total = dur > 0 ? dur : clip.dur;
  const pct = total ? Math.min(100, (cur / total) * 100) : 0;

  // Forme d'onde stable par message, pour ne pas « sauter » à chaque rendu.
  const heights = useMemo(() => {
    let seed = 0;
    for (let i = 0; i < Math.min(32, clip.data.length); i++) seed = (seed * 31 + clip.data.charCodeAt(i)) | 0;
    return Array.from({ length: BARS }, (_, i) => {
      seed = (seed * 1103515245 + 12345) | 0;
      return 28 + (Math.abs(seed >> 8) % 62);
    });
  }, [clip.data]);

  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => setFailed(true));
    else a.pause();
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audio.current;
    if (!a || !total) return;
    const r = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    a.currentTime = ratio * (Number.isFinite(a.duration) ? a.duration : total);
    setCur(a.currentTime);
  };

  return (
    <div className="voice">
      <button type="button" className="voice-play" onClick={toggle} aria-label={playing ? 'Pause' : 'Écouter'}>
        {playing ? <IconPause size={18} /> : <IconPlay size={18} />}
      </button>

      <div className="voice-wave" onClick={seek} role="slider" aria-label="Progression" aria-valuemin={0} aria-valuemax={Math.round(total)} aria-valuenow={Math.round(cur)}>
        {heights.map((h, i) => (
          <span key={i} className={(i / BARS) * 100 < pct ? 'on' : ''} style={{ height: `${h}%` }} />
        ))}
      </div>

      <span className="voice-time">{formatTime(cur > 0 || playing ? cur : total)}</span>

      {failed ? (
        <span className="voice-err" title="Ce navigateur ne peut pas lire cet ancien format">illisible</span>
      ) : (
        <audio
          ref={audio}
          src={url}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setCur(0); }}
          onTimeUpdate={(e) => setCur(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (Number.isFinite(d) && d > 0) setDur(d);
          }}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
