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

export function formatCodeInput(value: string) {
  const raw = String(value).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  return raw.replace(/(.{4})(?=.)/g, '$1-');
}
