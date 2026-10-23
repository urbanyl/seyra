import { useEffect, useRef, useState } from 'react';

const CHARS =
  'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン' +
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Fond animé « pluie de caractères », repris du motif fourni par l'utilisateur.
 * - Une colonne par tranche de 20 px (7 px pour l'aperçu), calculée à la taille réelle.
 * - Couleur prise dans l'accent du thème, opacité faible, dégradé de queue par masque.
 * - Animation désactivée si l'utilisateur préfère réduire les mouvements.
 */
export default function MatrixWall({ mini = false }: { mini?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  const step = mini ? 7 : 20;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const compute = () => setCount(Math.max(1, Math.ceil(el.clientWidth / step)));
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
            animationDelay: `${-(((i * 37) % 400) / 100).toFixed(2)}s`,
            animationDuration: `${2.4 + ((i * 7) % 23) / 10}s`,
            opacity: mini ? 1 : 0.9,
          }}
        >
          {CHARS.slice(i % 20) + CHARS}
        </span>
      ))}
    </div>
  );
}
