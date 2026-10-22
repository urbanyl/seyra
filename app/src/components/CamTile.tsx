import { useEffect, useRef } from 'react';
import { IconCamera } from './Icons';

/** Vignette de caméra : vidéo seule, sans son (le son passe par l'appel). */
export default function CamTile({ stream, name, local }: { stream: MediaStream; name: string; local?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    el.play().catch(() => {});
    return () => { el.srcObject = null; };
  }, [stream]);
  return (
    <div className={`cam-tile ${local ? 'local' : ''}`}>
      <video ref={ref} autoPlay playsInline muted />
      <span className="cam-label"><IconCamera size={12} /> {local ? 'Vous' : name}</span>
    </div>
  );
}
