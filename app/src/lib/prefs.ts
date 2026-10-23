/* Préférences d'affichage : thème, fond de conversation, densité, mode discret,
 * son des notifications. Tout reste local (localStorage), rien n'est envoyé.
 */

export type Prefs = {
  theme: string;
  wallpaper: string;
  customWall: string; // data-URL, session uniquement (pas persisté)
  density: 'comfortable' | 'compact';
  fontScale: 'small' | 'normal' | 'large';
  discreet: boolean;
  sound: boolean;
};

export const THEMES: { id: string; name: string; accent: string; accentDark: string; bubbleOut: string; bg: string; head: string; field: string; bubbleIn: string }[] = [
  { id: 'seyra', name: 'Seyra', accent: '#00b2ff', accentDark: '#2b52f2', bubbleOut: '#1f5a86', bg: '#1c232a', head: '#232c34', field: '#2b3540', bubbleIn: '#232c34' },
  { id: 'ocean', name: 'Océan', accent: '#22c3e6', accentDark: '#0e7490', bubbleOut: '#155e75', bg: '#0e1a24', head: '#16242f', field: '#1d2f3c', bubbleIn: '#16242f' },
  { id: 'forest', name: 'Forêt', accent: '#34d399', accentDark: '#059669', bubbleOut: '#166534', bg: '#111a17', head: '#17241f', field: '#1f3129', bubbleIn: '#17241f' },
  { id: 'violet', name: 'Violet', accent: '#a78bfa', accentDark: '#6d28d9', bubbleOut: '#4c1d95', bg: '#171423', head: '#1f1b30', field: '#2a2440', bubbleIn: '#1f1b30' },
  { id: 'sunset', name: 'Coucher', accent: '#fb923c', accentDark: '#c2410c', bubbleOut: '#9a3412', bg: '#1e1614', head: '#271c18', field: '#33241e', bubbleIn: '#271c18' },
  { id: 'rose', name: 'Rose', accent: '#f472b6', accentDark: '#be185d', bubbleOut: '#9d174d', bg: '#1e1418', head: '#281a20', field: '#34222b', bubbleIn: '#281a20' },
  { id: 'mono', name: 'Graphite', accent: '#9fb3c8', accentDark: '#475569', bubbleOut: '#334155', bg: '#15181c', head: '#1c2025', field: '#262b32', bubbleIn: '#1c2025' },
  { id: 'light', name: 'Clair', accent: '#0a84ff', accentDark: '#2563eb', bubbleOut: '#bfe0ff', bg: '#eef2f6', head: '#ffffff', field: '#e4eaf0', bubbleIn: '#ffffff' },
];

/* Fond de conversation : motif géométrique fourni par l'utilisateur, réadapté aux
 * couleurs de Seyra. Une seule entrée pour l'instant, la suivante viendra après.
 * `background` (raccourci complet) est posé sur .messages : positions et tailles
 * font partie de la valeur. */
const S = '60px';
const C1 = 'var(--wall-c1)';
const C2 = 'var(--wall-c2)';
const DISC = `radial-gradient(25% 25% at 25% 25%, ${C1} 99%, rgba(0, 0, 0, 0) 101%)`;

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
};

/** Mélange deux couleurs hexadécimales (t = part de b, 0..1). */
function mixHex(a: string, b: string, t: number): string {
  const pa = a.replace('#', '');
  const pb = b.replace('#', '');
  const ch = (s: string, i: number) => parseInt(s.slice(i, i + 2), 16);
  const out = [0, 2, 4].map((i) => Math.round(ch(pa, i) * (1 - t) + ch(pb, i) * t));
  return '#' + out.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
}

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw), customWall: '' };
  } catch { /* préférences illisibles */ }
  return { ...DEFAULTS };
}

export function savePrefs(p: Prefs) {
  try {
    const { customWall, ...rest } = p;
    void customWall;
    localStorage.setItem(KEY, JSON.stringify(rest));
  } catch { /* stockage indisponible */ }
}

export function applyPrefs(p: Prefs) {
  const root = document.documentElement;
  const theme = THEMES.find((t) => t.id === p.theme) || THEMES[0];
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--accent-dark', theme.accentDark);
  root.style.setProperty('--bubble-out', theme.bubbleOut);
  root.style.setProperty('--bg', theme.bg);
  root.style.setProperty('--chat-bg', theme.bg);
  root.style.setProperty('--panel', theme.bg);
  root.style.setProperty('--head', theme.head);
  root.style.setProperty('--field', theme.field);
  root.style.setProperty('--bubble-in', theme.bubbleIn);
  const light = theme.id === 'light';
  root.style.setProperty('--txt', light ? '#12202b' : '#eef4f8');
  root.style.setProperty('--muted', light ? '#5b6d7e' : '#8fa1b3');
  root.style.setProperty('--line', light ? '#d3dae1' : '#2a3540');
  root.dataset.density = p.density;
  root.dataset.fs = p.fontScale || 'normal';
  root.dataset.discreet = p.discreet ? 'on' : 'off';

  // Le motif reprend le fond du thème et une pointe de son accent : il change donc avec le thème.
  root.style.setProperty('--wall-c1', theme.bg);
  root.style.setProperty('--wall-c2', mixHex(theme.bg, theme.accent, 0.13));
  const wall = p.customWall || (WALLPAPERS.find((w) => w.id === p.wallpaper)?.css ?? WALLPAPERS[0].css);
  root.style.setProperty('--chat-wall', wall);
}
