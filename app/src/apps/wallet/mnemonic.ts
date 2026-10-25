import { sha256 } from 'viem';
import { english, french, generateMnemonic, mnemonicToAccount } from 'viem/accounts';

export type PhraseCheck =
  | { ok: true; phrase: string; address: `0x${string}` }
  | { ok: false; error: string };

const WORDLISTS = [english, french];

export function normalizePhrase(input: string): string {
  return input
    .normalize('NFKD')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');
}

export function createMnemonic(): string {
  return generateMnemonic(english, 128);
}

export function deriveAddress(phrase: string): `0x${string}` {
  return mnemonicToAccount(phrase).address;
}

function checksumOk(words: string[], wordlist: string[]): boolean {
  const index = new Map<string, number>();
  wordlist.forEach((word, position) => index.set(word, position));
  const indexes: number[] = [];
  for (const word of words) {
    const found = index.get(word);
    if (found === undefined) return false;
    indexes.push(found);
  }
  const bits = indexes.map((value) => value.toString(2).padStart(11, '0')).join('');
  const checksumLength = bits.length / 33;
  if (!Number.isInteger(checksumLength)) return false;
  const entropyBits = bits.slice(0, bits.length - checksumLength);
  if (entropyBits.length % 8 !== 0) return false;
  const entropy = new Uint8Array(entropyBits.length / 8);
  for (let i = 0; i < entropy.length; i += 1) {
    entropy[i] = parseInt(entropyBits.slice(i * 8, i * 8 + 8), 2);
  }
  const hashBits = Array.from(sha256(entropy).slice(2))
    .map((hex) => parseInt(hex, 16).toString(2).padStart(4, '0'))
    .join('');
  return bits.slice(-checksumLength) === hashBits.slice(0, checksumLength);
}

export function inspectPhrase(input: string): PhraseCheck {
  const phrase = normalizePhrase(input);
  if (!phrase) return { ok: false, error: 'Colle ta phrase de récupération.' };
  const words = phrase.split(' ');
  if (words.length !== 12 && words.length !== 24) {
    return {
      ok: false,
      error: `La phrase doit contenir 12 ou 24 mots (${words.length} actuellement).`,
    };
  }
  const wordlist = WORDLISTS.find((list) => {
    const known = new Set(list);
    return words.every((word) => known.has(word));
  });
  if (!wordlist) {
    return {
      ok: false,
      error: 'Un ou plusieurs mots sont inconnus. Utilise une phrase BIP-39 (anglais ou français).',
    };
  }
  if (!checksumOk(words, wordlist)) {
    return {
      ok: false,
      error:
        "La phrase est invalide (somme de contrôle incorrecte). Vérifie l'ordre et l'orthographe des mots.",
    };
  }
  try {
    return { ok: true, phrase, address: deriveAddress(phrase) };
  } catch {
    return { ok: false, error: 'Impossible de dériver une adresse depuis cette phrase.' };
  }
}
