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

/** The code is the secret: one slow KDF gives both the message key and the room id. */
export async function deriveSession(code: string): Promise<{ key: Uint8Array; roomId: string }> {
  await sodium.ready;
  const bytes = new TextEncoder().encode(normalizeCode(code));
  const base = await crypto.subtle.importKey('raw', bytes, 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: new TextEncoder().encode(SALT), iterations: ITERATIONS, hash: 'SHA-256' },
    base, 512,
  ));
  const key = bits.slice(0, 32);
  const roomId = [...bits.slice(32)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return { key, roomId };
}

const b64 = (u: Uint8Array) => sodium.to_base64(u, sodium.base64_variants.ORIGINAL);
const unb64 = (s: string) => sodium.from_base64(s, sodium.base64_variants.ORIGINAL);

export function sealMessage(plain: string, key: Uint8Array): { cipher: string; nonce: string } {
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const cipher = sodium.crypto_secretbox_easy(new TextEncoder().encode(plain), nonce, key);
  return { cipher: b64(cipher), nonce: b64(nonce) };
}

export function openMessage(cipher: string, nonce: string, key: Uint8Array): string | null {
  try {
    const out = sodium.crypto_secretbox_open_easy(unb64(cipher), unb64(nonce), key);
    return out ? new TextDecoder().decode(out) : null;
  } catch {
    return null;
  }
}
