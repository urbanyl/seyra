export function timeOf(ts: number) {
  return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function dayLabel(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const y = new Date(); y.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Aujourd'hui";
  if (same(d, y)) return 'Hier';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function shortWhen(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return timeOf(ts);
  const diff = (today.getTime() - d.getTime()) / 864e5;
  if (diff < 7) return d.toLocaleDateString('fr-FR', { weekday: 'long' });
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export const AVATAR_COLORS = [
  ['#2f8bff', '#1450c8'],
  ['#22d3ee', '#0e7f9c'],
  ['#a78bfa', '#6d3ff0'],
  ['#34d399', '#0f8a5f'],
  ['#fb923c', '#c2410c'],
  ['#f472b6', '#be185d'],
  ['#facc15', '#a16207'],
  ['#60a5fa', '#1e40af'],
];

export const initials = (name: string) =>
  name.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((w) => [...w][0]?.toUpperCase() || '').join('') || '?';

/** Pseudo : sans contrôle ni espaces superflus, 24 points de code au plus (jamais d'emoji coupé). */
export function cleanPseudo(raw: string): string {
  const s = String(raw ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const cps = [...s];
  return cps.length > 24 ? cps.slice(0, 24).join('') : s;
}

/** Vrai si le texte cite @nom (insensible à la casse, nom entier, ponctuation finale tolérée). */
export function mentionsName(text: string, name: string): boolean {
  const n = name.trim().toLowerCase();
  if (!n) return false;
  // Nom complet (espaces compris), suivi d'une fin ou d'une ponctuation.
  const esc = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`@${esc}(?=$|[\\s.,!?;:)])`, 'iu').test(text);
}

/** Pseudos cités dans un texte, du plus long au plus court (évite « @Ann » pour « @Anne-Marie »). */
export function mentionPattern(names: string[]): RegExp | null {
  const list = names.map((n) => n.trim()).filter(Boolean).sort((a, b) => b.length - a.length);
  if (!list.length) return null;
  const alt = list.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return new RegExp(`@(?:${alt})(?=$|[\\s.,!?;:)])`, 'iu');
}

export function formatCodeInput(value: string) {
  const raw = String(value).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  return raw.replace(/(.{4})(?=.)/g, '$1-');
}

/** Mention en cours de saisie : texte apr�s le dernier � @ � plac� en d�but de mot, avant le curseur. */
export function activeMention(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, caret);
  const at = before.lastIndexOf('@');
  if (at < 0) return null;
  if (at > 0 && !/\s/.test(before[at - 1])) return null;
  const query = before.slice(at + 1);
  if (query.includes('\n') || query.length > 24) return null;
  return { start: at, query };
}

/** Suggestions : participants dont le nom commence par la saisie (puis contient), sans accents ni casse. */
export function suggestMentions<T extends { name: string }>(list: T[], query: string, limit = 6): T[] {
  const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const q = norm(query.trim());
  const starts: T[] = [];
  const contains: T[] = [];
  for (const p of list) {
    const n = norm(p.name);
    if (!q || n.startsWith(q)) starts.push(p);
    else if (n.includes(q)) contains.push(p);
  }
  return [...starts, ...contains].slice(0, limit);
}
