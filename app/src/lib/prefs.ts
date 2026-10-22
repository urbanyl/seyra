/* Préférences d'affichage : thème, fond de conversation, densité, mode discret,
 * son des notifications. Tout reste local (localStorage), rien n'est envoyé.
 */

export type Prefs = {
  theme: string;
  wallpaper: string;
  customWall: string; // data-URL, session uniquement (pas persisté)
  density: 'comfortable' | 'compact';
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

/* Fonds de conversation : motifs vectoriels légers (pas d'animation, pas de CPU).
 * Chaque fond se règle en contraste avec le thème via --chat-wall. */
const svg = (w: number, h: number, body: string) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'%3E${body}%3C/svg%3E")`;

export const WALLPAPERS: { id: string; name: string; css: string }[] = [
  { id: 'none', name: 'Uni', css: 'none' },
  { id: 'dots', name: 'Points', css: svg(22, 22, "%3Ccircle cx='2' cy='2' r='1.3' fill='%23ffffff' fill-opacity='0.09'/%3E") },
  { id: 'grid', name: 'Grille', css: svg(32, 32, "%3Cpath d='M0 0h32v32H0z' fill='none' stroke='%23ffffff' stroke-opacity='0.07'/%3E") },
  { id: 'waves', name: 'Vagues', css: svg(96, 48, "%3Cpath d='M0 36c24-24 48-24 72 0s48 24 72 0' fill='none' stroke='%2300b2ff' stroke-opacity='0.13' stroke-width='1.5'/%3E") },
  { id: 'bubbles', name: 'Bulles', css: svg(140, 140, "%3Cg fill='none' stroke='%23ffffff' stroke-opacity='0.08'%3E%3Ccircle cx='28' cy='34' r='16'/%3E%3Ccircle cx='104' cy='92' r='26'/%3E%3Ccircle cx='70' cy='128' r='9'/%3E%3C/g%3E") },
  { id: 'stripes', name: 'Rayures', css: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.035) 0 2px, transparent 2px 14px)' },
  { id: 'nebula', name: 'Nébuleuse', css: 'radial-gradient(640px 380px at 15% 10%, rgba(0,178,255,0.22), transparent 70%), radial-gradient(560px 360px at 90% 90%, rgba(43,82,242,0.26), transparent 70%), radial-gradient(420px 300px at 60% 40%, rgba(167,139,250,0.14), transparent 70%)' },
  { id: 'aurora', name: 'Aurore', css: 'linear-gradient(160deg, rgba(0,178,255,0.14) 0%, transparent 38%), linear-gradient(330deg, rgba(52,211,153,0.10) 0%, transparent 42%), linear-gradient(200deg, rgba(167,139,250,0.12) 0%, transparent 46%)' },
  { id: 'glow', name: 'Halo', css: 'radial-gradient(circle at 30% 20%, rgba(0,178,255,0.12), transparent 55%), radial-gradient(circle at 78% 75%, rgba(43,82,242,0.14), transparent 55%)' },
];

const KEY = 'seyra.prefs.v1';

const DEFAULTS: Prefs = {
  theme: 'seyra',
  wallpaper: 'dots',
  customWall: '',
  density: 'comfortable',
  discreet: false,
  sound: false,
};

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
  root.dataset.discreet = p.discreet ? 'on' : 'off';

  const wall = p.customWall || (WALLPAPERS.find((w) => w.id === p.wallpaper)?.css ?? 'none');
  root.style.setProperty('--chat-wall', wall);
}
