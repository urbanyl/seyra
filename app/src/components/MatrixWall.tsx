import { useEffect, useRef, useState } from 'react';

const CHARS =
  'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン' +
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
// Texte long : une colonne doit couvrir deux hauteurs d'écran pour ne jamais laisser de trou.
const STREAM = CHARS.repeat(3);

/**
 * Fond animé « pluie de caractères », d'après le motif fourni par l'utilisateur.
 * - Une colonne tous les 14 px (6 px pour l'aperçu), recalculée à la taille réelle.
 * - Chute lente (8 à 15 s), opacité constante pendant la traversée, effacement en fin de course.
 * - Couleur prise dans l'accent du thème, opacité d'ensemble faible.
 * - Animation coupée si le système demande de réduire les mouvements.
 */
export default function MatrixWall({ mini = false }: { mini?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  // Mobile : colonnes plus larges = moins de couches animées.
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 860px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 860px)');
    const fn = () => setNarrow(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  const step = mini ? 6 : narrow ? 26 : 14;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const compute = () => setCount(Math.max(1, Math.ceil(el.clientWidth / step) + 1));
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [step]);

  return (
    <div ref={ref} className={`matrix-wall${mini ? ' mini' : ''}`} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="matrix-col"
          style={{
            left: `${i * step}px`,
            animationDelay: `${-(((i * 53) % 1500) / 100).toFixed(2)}s`,
            animationDuration: `${8 + ((i * 7) % 71) / 10}s`,
          }}
        >
          {STREAM.slice(i % 24)}
        </span>
      ))}
    </div>
  );
}
