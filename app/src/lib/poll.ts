import type { Poll } from './types';

/** « /sondage Question | option | option » -> sondage (2 à 6 options). Sinon null. */
export function parsePoll(text: string, makeId: () => string = () => crypto.randomUUID()): Poll | null {
  const m = /^\/sondage\s+(.+)$/i.exec(text.trim());
  if (!m) return null;
  const parts = m[1].split('|').map((s) => s.trim().slice(0, 120)).filter(Boolean);
  if (parts.length < 3) return null;
  const [q, ...opts] = parts;
  return { id: makeId(), q: q.slice(0, 200), opts: opts.slice(0, 6) };
}
