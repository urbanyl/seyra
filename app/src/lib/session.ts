import sodium from 'libsodium-wrappers';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const SALT = 'seyra.session.v1';
const ITERATIONS = 210000;

export function cryptoReady(): Promise<void> {
  return sodium.ready;
}

export function newCode(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out.replace(/(.{4})(?=.)/g, '$1-');
}

export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function isPlausible(input: string): boolean {
  return normalizeCode(input).length === 12;
}

/** The code is the secret: one slow KDF gives both the message key and the room id.
 * `password` optionnel : il est mélangé à la clé de chiffrement, jamais envoyé au serveur.
 * Le roomId ne dépend que du code, pour que tout le monde tombe sur le même salon. */
export async function deriveSession(code: string, password = ''): Promise<{ key: Uint8Array; roomId: string }> {
  await sodium.ready;
  const normalized = normalizeCode(code);
  const bytes = new TextEncoder().encode(normalized);
  const base = await crypto.subtle.importKey('raw', bytes, 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: new TextEncoder().encode(SALT), iterations: ITERATIONS, hash: 'SHA-256' },
    base, 512,
  ));
  const roomId = [...bits.slice(32)].map((b) => b.toString(16).padStart(2, '0')).join('');
  if (!password) return { key: bits.slice(0, 32), roomId };
  // Le mot de passe est salé par le code : impossible de précalculer un dictionnaire
  // sans connaître le code, et une erreur de mot de passe donne une clé inutilisable.
  const pwd = new TextEncoder().encode(password);
  const pwdBase = await crypto.subtle.importKey('raw', pwd, 'PBKDF2', false, ['deriveBits']);
  const salt = new TextEncoder().encode(`seyra.pwd.v1:${normalized}`);
  const pwdBits = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    pwdBase, 256,
  ));
  const key = new Uint8Array(32);
  for (let i = 0; i < 32; i++) key[i] = bits[i] ^ pwdBits[i];
  pwdBits.fill(0);
  return { key, roomId };
}

const b64 = (u: Uint8Array) => sodium.to_base64(u, sodium.base64_variants.ORIGINAL);
const unb64 = (s: string) => sodium.from_base64(s, sodium.base64_variants.ORIGINAL);

/** Scelle n'importe quel corps (objet JSON ou texte) sous forme de chaîne. */
export function sealBody(body: unknown, key: Uint8Array): { cipher: string; nonce: string } {
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const json = typeof body === 'string' ? body : JSON.stringify(body);
  const cipher = sodium.crypto_secretbox_easy(new TextEncoder().encode(json), nonce, key);
  return { cipher: b64(cipher), nonce: b64(nonce) };
}

/** Ouvre un corps : objet JSON si possible, sinon { text } pour les anciens messages. */
export function openBody(cipher: string, nonce: string, key: Uint8Array): unknown | null {
  try {
    const out = sodium.crypto_secretbox_open_easy(unb64(cipher), unb64(nonce), key);
    if (!out || !out.length) return null;
    const str = new TextDecoder().decode(out);
    try { return JSON.parse(str); } catch { return { text: str }; }
  } catch {
    return null;
  }
}

