import { useEffect, useMemo, useState } from 'react';

/**
 * Fond « terre craquelée », d'après le motif fourni par l'utilisateur.
 *
 * Le filtre SVG est rasterisé UNE fois dans une image SVG autonome, puis répété
 * comme fond CSS. Un filtre appliqué à un élément plein écran oblige le navigateur
 * à recalculer la texture à chaque repeint (frappe, curseur, clavier mobile), ce qui
 * rendait la saisie lente sur téléphone.
 */

function buildSvg(color: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640">` +
    `<defs><filter id="c" x="0" y="0" width="100%" height="100%">` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="4" seed="10" result="n"/>` +
    `<feColorMatrix type="luminanceToAlpha" in="n" result="a"/>` +
    `<feComponentTransfer in="a" result="p"><feFuncA type="discrete" tableValues="0 1"/></feComponentTransfer>` +
    `<feConvolveMatrix order="3 3" kernelMatrix="-1 -1 -1 -1 8 -1 -1 -1 -1" in="p" result="e"/>` +
    `<feComponentTransfer in="e" result="i">` +
    `<feFuncR type="table" tableValues="1 0"/><feFuncG type="table" tableValues="1 0"/><feFuncB type="table" tableValues="1 0"/>` +
    `</feComponentTransfer>` +
    `<feFlood flood-color="${color}" result="f"/>` +
    `<feComposite operator="in" in="f" in2="i"/>` +
    `</filter></defs>` +
    `<rect width="100%" height="100%" filter="url(#c)"/>` +
    `</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Couleur des fissures : accent du thème, relu quand le thème change. */
function useAccent(): string {
  const [color, setColor] = useState('#00b2ff');
  useEffect(() => {
    const read = () => {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
      if (v) setColor(v);
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'data-density', 'data-fs'] });
    return () => obs.disconnect();
  }, []);
  return color;
}

export default function CracksWall({ mini = false }: { mini?: boolean }) {
  const color = useAccent();
  const image = useMemo(() => buildSvg(color), [color]);
  return (
    <div
      className={`cracks-wall${mini ? ' mini' : ''}`}
      style={{ backgroundImage: image, backgroundSize: mini ? '260px 260px' : '640px 640px' }}
      aria-hidden="true"
    />
  );
}
