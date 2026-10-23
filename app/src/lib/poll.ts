import type { Poll } from './types';

export const POLL_FORMAT = '/sondage Question | option | option';

/** Vrai si le texte est une tentative de commande sondage (même mal écrite). */
export function isPollCommand(text: string): boolean {
  return /^\/sondage(\s|$)/i.test(text.trim());
}

/** « /sondage Question | option | option » -> sondage (2 à 6 options). Sinon null. */
export function parsePoll(text: string, makeId: () => string = () => crypto.randomUUID()): Poll | null {
  const m = /^\/sondage\s+(.+)$/i.exec(text.trim());
  if (!m) return null;
  const parts = m[1].split('|').map((s) => s.trim().slice(0, 120)).filter(Boolean);
  if (parts.length < 3) return null;
  const [q, ...opts] = parts;
  return { id: makeId(), q: q.slice(0, 200), opts: opts.slice(0, 6) };
}

/** Nettoie un champ du formulaire : pas de séparateur « | » qui casserait la commande. */
export function cleanPollField(s: string, max: number): string {
  return s.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Commande prête à envoyer, construite depuis le formulaire. */
export function buildPollCommand(question: string, options: string[]): string | null {
  const q = cleanPollField(question, 200);
  const opts = options.map((o) => cleanPollField(o, 120)).filter(Boolean).slice(0, 6);
  if (!q || opts.length < 2) return null;
  return `/sondage ${q} | ${opts.join(' | ')}`;
}
