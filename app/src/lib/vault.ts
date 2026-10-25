import { useEffect, useSyncExternalStore } from 'react';
import sodium from 'libsodium-wrappers';

export type Vault = {
  wallet?: unknown;
  notes?: unknown;
  [key: string]: unknown;
};

type Session = { user: string; local: boolean; token: string; key: string };

const SS_KEY = 'seyra.acct';
const LOCAL_KEY = 'seyra.vault.local.v1';

let session: Session | null = null;
let vault: Vault = {};
let ready = false;
let loading = false;
let settled = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let version = 0;
const listeners = new Set<() => void>();

function emit() {
  version++;
  listeners.forEach((l) => l());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const snap = () => version;

/** La tentative de restauration de session est terminée (réussie ou non). */
function markSettled() {
  if (!settled) {
    settled = true;
    emit();
  }
}

export function useVault() {
  useSyncExternalStore(subscribe, snap, snap);
  return {
    ready,
    restored: settled,
    user: session?.user ?? null,
    local: session?.local ?? false,
    vault,
    update,
    reload: restore,
  };
}

export function useAccount() {
  useSyncExternalStore(subscribe, snap, snap);
  return { ready, restored: settled, user: session?.user ?? null, local: session?.local ?? false, lock, logout };
}

function b64(u: Uint8Array) {
  return sodium.to_base64(u, sodium.base64_variants.URLSAFE_NO_PADDING);
}
function unb64(s: string) {
  return sodium.from_base64(s, sodium.base64_variants.URLSAFE_NO_PADDING);
}
const enc = (s: string) => new TextEncoder().encode(s);
const dec = (u: Uint8Array) => new TextDecoder().decode(u);

async function derive(password: string, saltB64: string) {
  await sodium.ready;
  const salt = unb64(saltB64);
  const base = await crypto.subtle.importKey('raw', enc(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: 600000, hash: 'SHA-256' },
    base,
    256,
  );
  const key = new Uint8Array(bits);
  return { key, token: sodium.to_hex(sodium.crypto_generichash(32, key)) };
}

function seal(key: Uint8Array, data: Vault) {
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const cipher = sodium.crypto_secretbox_easy(enc(JSON.stringify(data)), nonce, key);
  const out = new Uint8Array(nonce.length + cipher.length);
  out.set(nonce, 0);
  out.set(cipher, nonce.length);
  return b64(out);
}

function open(key: Uint8Array, blob: string): Vault {
  const raw = unb64(blob);
  const nonce = raw.slice(0, sodium.crypto_secretbox_NONCEBYTES);
  const cipher = raw.slice(sodium.crypto_secretbox_NONCEBYTES);
  const plain = sodium.crypto_secretbox_open_easy(cipher, nonce, key);
  if (!plain) throw new Error('Impossible de déverrouiller le coffre.');
  return JSON.parse(dec(plain));
}

async function api(path: string, body?: unknown, method = body ? 'POST' : 'GET') {
  const res = await fetch(path, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error('Réponse du serveur invalide.');
  }
  if (!res.ok) throw new Error((data.error as string) || `Erreur ${res.status}`);
  return data;
}

function persistSession() {
  try {
    if (session) sessionStorage.setItem(SS_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SS_KEY);
  } catch {
    /* stockage indisponible */
  }
}

function saveLocal() {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(vault));
  } catch {
    /* quota */
  }
}

function scheduleSave() {
  if (!session) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    if (!session) return;
    if (session.local) return saveLocal();
    const body = { u: session.user, token: session.token, blob: seal(unb64(session.key), vault) };
    api('/api/account/vault', body, 'PUT').catch(() => {
      /* nouvel essai au prochain changement */
    });
  }, 700);
}

export function update(fn: (v: Vault) => Vault) {
  vault = fn(vault) || vault;
  scheduleSave();
  emit();
}

export async function register(user: string, password: string) {
  await sodium.ready;
  const salt = b64(sodium.randombytes_buf(16));
  const { key, token } = await derive(password, salt);
  const empty: Vault = {};
  await api('/api/account/register', {
    u: user,
    salt,
    token,
    blob: seal(key, empty),
  });
  session = { user, local: false, token, key: b64(key) };
  vault = empty;
  ready = true;
  persistSession();
  emit();
  return b64(key);
}

export async function unlock(user: string, password: string) {
  const { salt } = await api('/api/account/salt?u=' + encodeURIComponent(user));
  const { key, token } = await derive(password, salt as string);
  const { blob } = await api('/api/account/auth', { u: user, token });
  vault = open(key, blob as string);
  session = { user, local: false, token, key: b64(key) };
  ready = true;
  persistSession();
  emit();
}

export async function unlockWithCode(user: string, code: string) {
  await sodium.ready;
  const key = unb64(code.trim());
  if (key.length !== 32) throw new Error('Code de récupération invalide.');
  const token = sodium.to_hex(sodium.crypto_generichash(32, key));
  const { blob } = await api('/api/account/auth', { u: user, token });
  vault = open(key, blob as string);
  session = { user, local: false, token, key: b64(key) };
  ready = true;
  persistSession();
  emit();
}

export function startLocal() {
  session = { user: 'local', local: true, token: '', key: '' };
  try {
    vault = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
  } catch {
    vault = {};
  }
  ready = true;
  emit();
}

export async function restore() {
  if (ready) {
    markSettled();
    return;
  }
  if (loading) return;
  loading = true;
  try {
    const raw = sessionStorage.getItem(SS_KEY);
    if (!raw) return;
    const s = JSON.parse(raw) as Session;
    if (s.local) {
      startLocal();
      return;
    }
    await sodium.ready;
    const key = unb64(s.key);
    const { blob } = await api('/api/account/auth', { u: s.user, token: s.token });
    vault = open(key, blob as string);
    session = s;
    ready = true;
    emit();
  } catch {
    session = null;
    persistSession();
  } finally {
    loading = false;
    markSettled();
  }
}

export function lock() {
  session = null;
  vault = {};
  ready = false;
  persistSession();
  emit();
}

export function logout() {
  lock();
  try {
    localStorage.removeItem(LOCAL_KEY);
  } catch {
    /* ignore */
  }
}

export function useAutoRestore() {
  useEffect(() => {
    restore();
  }, []);
}

export function recoveryCode(): string | null {
  return session && !session.local ? session.key : null;
}


