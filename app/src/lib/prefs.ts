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

export const WALLPAPERS: { id: string; name: string; css: string }[] = [
  { id: 'none', name: 'Aucun', css: 'none' },
  { id: 'dots', name: 'Points', css: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='22'%3E%3Ccircle cx='2' cy='2' r='1.2' fill='%23ffffff' fill-opacity='0.05'/%3E%3C/svg%3E\")" },
  { id: 'grid', name: 'Grille', css: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28'%3E%3Cpath d='M0 0h28v28H0z' fill='none' stroke='%23ffffff' stroke-opacity='0.05'/%3E%3C/svg%3E\")" },
  { id: 'waves', name: 'Vagues', css: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='40'%3E%3Cpath d='M0 30c20-20 40-20 60 0s40 20 60 0' fill='none' stroke='%23ffffff' stroke-opacity='0.05' stroke-width='1.4'/%3E%3C/svg%3E\")" },
  { id: 'bubbles', name: 'Bulles', css: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cg fill='none' stroke='%23ffffff' stroke-opacity='0.05'%3E%3Ccircle cx='24' cy='30' r='14'/%3E%3Ccircle cx='90' cy='80' r='22'/%3E%3Ccircle cx='60' cy='110' r='8'/%3E%3C/g%3E%3C/svg%3E\")" },
  { id: 'glow', name: 'Halo', css: 'radial-gradient(circle at 30% 20%, rgba(0,178,255,0.10), transparent 55%), radial-gradient(circle at 78% 75%, rgba(43,82,242,0.12), transparent 55%)' },
  { id: 'aurora', name: 'Aurore', css: 'linear-gradient(135deg, rgba(0,178,255,0.10), transparent 40%), linear-gradient(315deg, rgba(167,139,250,0.12), transparent 45%)' },
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
