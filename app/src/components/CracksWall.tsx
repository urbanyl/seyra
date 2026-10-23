import { useId } from 'react';

/**
 * Fond « terre craquelée », d'après le motif fourni par l'utilisateur.
 * Le tracé vient d'un filtre SVG (bruit fractal + contours), statique : aucun coût
 * d'animation. La couleur des fissures est `flood-color`, réglée en CSS sur
 * var(--accent), donc elle suit le thème.
 */
export default function CracksWall({ mini = false }: { mini?: boolean }) {
  const raw = useId();
  const id = `cracks-${raw.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <>
      <div className={`cracks-wall${mini ? ' mini' : ''}`} style={{ filter: `url(#${id})` }} aria-hidden="true" />
      <svg width="0" height="0" aria-hidden="true" focusable="false" className="cracks-defs">
        <filter id={id} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="5" seed="10" result="noise" />
          <feColorMatrix type="luminanceToAlpha" in="noise" result="alphaNoise" />
          <feComponentTransfer in="alphaNoise" result="plates">
            <feFuncA type="discrete" tableValues="0 1" />
          </feComponentTransfer>
          <feConvolveMatrix
            order="3 3"
            kernelMatrix="-1 -1 -1 -1 8 -1 -1 -1 -1"
            in="plates"
            result="edges"
          />
          <feComponentTransfer in="edges" result="invertedEdges">
            <feFuncR type="table" tableValues="1 0" />
            <feFuncG type="table" tableValues="1 0" />
            <feFuncB type="table" tableValues="1 0" />
          </feComponentTransfer>
          <feFlood result="lineColor" />
          <feComposite operator="in" in="lineColor" in2="invertedEdges" />
        </filter>
      </svg>
    </>
  );
}
