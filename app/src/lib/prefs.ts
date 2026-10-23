/* Préférences d'affichage : thème, fond de conversation, densité, mode discret,
 * son des notifications. Tout reste local (localStorage), rien n'est envoyé.
 */

export type Prefs = {
  theme: string;
  wallpaper: string;
  customWall: string; // data-URL, enregistrée sur l'appareil
  density: 'comfortable' | 'compact';
  fontScale: 'small' | 'normal' | 'large';
  discreet: boolean;
  sound: boolean;
  colorblind: boolean;
};

export const THEMES: { id: string; name: string; accent: string; accentDark: string; bubbleOut: string; bg: string; head: string; field: string; bubbleIn: string; panel?: string }[] = [
  { id: 'seyra', name: 'Seyra', accent: '#00b2ff', accentDark: '#2b52f2', bubbleOut: '#1f5a86', bg: '#1c232a', head: '#232c34', field: '#2b3540', bubbleIn: '#232c34' },
  { id: 'ocean', name: 'Océan', accent: '#22c3e6', accentDark: '#0e7490', bubbleOut: '#155e75', bg: '#0e1a24', head: '#16242f', field: '#1d2f3c', bubbleIn: '#16242f' },
  { id: 'forest', name: 'Forêt', accent: '#34d399', accentDark: '#059669', bubbleOut: '#166534', bg: '#111a17', head: '#17241f', field: '#1f3129', bubbleIn: '#17241f' },
  { id: 'violet', name: 'Violet', accent: '#a78bfa', accentDark: '#6d28d9', bubbleOut: '#4c1d95', bg: '#171423', head: '#1f1b30', field: '#2a2440', bubbleIn: '#1f1b30' },
  { id: 'sunset', name: 'Coucher', accent: '#fb923c', accentDark: '#c2410c', bubbleOut: '#9a3412', bg: '#1e1614', head: '#271c18', field: '#33241e', bubbleIn: '#271c18' },
  { id: 'rose', name: 'Rose', accent: '#f472b6', accentDark: '#be185d', bubbleOut: '#9d174d', bg: '#1e1418', head: '#281a20', field: '#34222b', bubbleIn: '#281a20' },
  { id: 'mono', name: 'Graphite', accent: '#9fb3c8', accentDark: '#475569', bubbleOut: '#334155', bg: '#15181c', head: '#1c2025', field: '#262b32', bubbleIn: '#1c2025' },
  { id: 'light', name: 'Clair', accent: '#0a84ff', accentDark: '#2563eb', bubbleOut: '#bfe0ff', bg: '#eef2f6', head: '#ffffff', field: '#e4eaf0', bubbleIn: '#ffffff' },
  // Contraste maximal sur fond noir : texte blanc, séparateurs visibles, accent cyan.
  { id: 'contrast', name: 'High contrast', accent: '#00e5ff', accentDark: '#0a84ff', bubbleOut: '#0b4a75', bg: '#000000', head: '#121212', field: '#1c1c1c', bubbleIn: '#1c1c1c', panel: '#0a0a0a' },
];

/* Fond de conversation : motif géométrique fourni par l'utilisateur, réadapté aux
 * couleurs de Seyra. Une seule entrée pour l'instant, la suivante viendra après.
 * `background` (raccourci complet) est posé sur .messages : positions et tailles
 * font partie de la valeur. */
const S = '60px';
const SP = '100px'; // taille de tuile du motif « écailles »
const C1 = 'var(--wall-c1)';
const C2 = 'var(--wall-c2)';
const DISC = `radial-gradient(25% 25% at 25% 25%, ${C1} 99%, rgba(0, 0, 0, 0) 101%)`;
// Bandes alternées du motif « écailles ».
const PLATES = `${C2} 6% 14%, ${C1} 16% 24%, ${C2} 26% 34%, ${C1} 36% 44%, ${C2} 46% 54%, ${C1} 56% 64%, ${C2} 66% 74%, ${C1} 76% 84%, ${C2} 86% 94%`;

export const WALLPAPERS: { id: string; name: string; css: string }[] = [
  {
    id: 'signature',
    name: 'wall.signature',
    css:
            `${DISC} ${S} ${S} / calc(2 * ${S}) calc(2 * ${S}), ` +
      `${DISC} 0 0 / calc(2 * ${S}) calc(2 * ${S}), ` +
      `radial-gradient(50% 50%, ${C2} 98%, rgba(0, 0, 0, 0)) 0 0 / ${S} ${S}, ` +
      `repeating-conic-gradient(${C2} 0 50%, ${C1} 0 100%) calc(0.5 * ${S}) 0 / calc(2 * ${S}) ${S}`,
  },
  {
    id: 'matrix',
    name: 'wall.matrix',
    // Rendu par le composant MatrixWall (colonnes animées), pas par un fond CSS.
    css: 'none',
  },
{
    id: 'plates',
    name: 'wall.plates',
    // Motif en écailles fourni par l'utilisateur, teinté par le thème (deux tons proches).
    css:
      `linear-gradient(var(--wall-veil), var(--wall-veil)), ` +
      `radial-gradient(100% 100% at 100% 0, ${C1} 4%, ${PLATES}, rgba(0, 0, 0, 0.5) 96%, rgba(0, 0, 0, 0) 100%) 0 0 / ${SP} ${SP}, ` +
      `radial-gradient(100% 100% at 0 100%, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.5) 4%, ${PLATES}, ${C1} 96%) 0 0 / ${SP} ${SP} ${C1}`,
  },
  {
    id: 'cracks',
    name: 'wall.cracks',
    // Rendu par le composant CracksWall (filtre SVG), pas par un fond CSS.
    css: 'none',
  },
];
const KEY = 'seyra.prefs.v1';

const DEFAULTS: Prefs = {
  theme: 'seyra',
  wallpaper: 'signature',
  customWall: '',
  density: 'comfortable',
  fontScale: 'normal',
  discreet: false,
  sound: false,
  colorblind: false,
};

/** Mélange deux couleurs hexadécimales (t = part de b, 0..1). */
function mixHex(a: string, b: string, t: number): string {
  const pa = a.replace('#', '');
  const pb = b.replace('#', '');
  const ch = (s: string, i: number) => parseInt(s.slice(i, i + 2), 16);
  const out = [0, 2, 4].map((i) => Math.round(ch(pa, i) * (1 - t) + ch(pb, i) * t));
  return '#' + out.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
}

/** Convertit #rrggbb en rgba(...) pour les voiles. */
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
  return `rgba(${n(0)}, ${n(2)}, ${n(4)}, ${alpha})`;
}

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* préférences illisibles */ }
  return { ...DEFAULTS };
}

export function savePrefs(p: Prefs) {
  // L'image perso est une data-URL : on tente de la garder. Si le quota du navigateur
  // est dépassé, on sauvegarde le reste (le fond revient alors au motif par défaut).
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    try {
      const { customWall, ...rest } = p;
      void customWall;
      localStorage.setItem(KEY, JSON.stringify(rest));
    } catch { /* stockage indisponible */ }
  }
}

export function applyPrefs(p: Prefs) {
  const root = document.documentElement;
  const theme = THEMES.find((t) => t.id === p.theme) || THEMES[0];
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--accent-dark', theme.accentDark);
  root.style.setProperty('--bubble-out', theme.bubbleOut);
  root.style.setProperty('--bg', theme.bg);
  root.style.setProperty('--chat-bg', theme.bg);
  root.style.setProperty('--panel', theme.panel ?? theme.bg);
  root.style.setProperty('--head', theme.head);
  root.style.setProperty('--field', theme.field);
  root.style.setProperty('--bubble-in', theme.bubbleIn);
  const light = theme.id === 'light';
  const contrast = theme.id === 'contrast';
  root.style.setProperty('--txt', contrast ? '#ffffff' : light ? '#12202b' : '#eef4f8');
  root.style.setProperty('--muted', contrast ? '#c9d4dd' : light ? '#5b6d7e' : '#8fa1b3');
  root.style.setProperty('--line', contrast ? '#3a3a3a' : light ? '#d3dae1' : '#2a3540');
  root.dataset.density = p.density;
  root.dataset.fs = p.fontScale || 'normal';
  root.dataset.discreet = p.discreet ? 'on' : 'off';
  // Palette daltonienne : orange/bleu restent distinguables (danger/ok).
  root.dataset.colorblind = p.colorblind ? 'on' : 'off';
  root.style.setProperty('--danger', p.colorblind ? '#ff9f43' : '#f15c6d');
  root.style.setProperty('--ok', p.colorblind ? '#4dabf7' : '#00b2ff');

  // Le motif reprend le fond du thème et une pointe de son accent : il change donc avec le thème.
  root.style.setProperty('--wall-c1', theme.bg);
  root.style.setProperty('--wall-c2', mixHex(theme.bg, theme.accent, 0.13));
  root.style.setProperty('--wall-veil', hexToRgba(theme.bg, 0.58));
  const wall = p.customWall || (WALLPAPERS.find((w) => w.id === p.wallpaper)?.css ?? WALLPAPERS[0].css);
  root.style.setProperty('--chat-wall', wall);
}
