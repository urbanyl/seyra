import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const PUBLIC_DIR = process.env.PUBLIC_DIR || path.join(process.cwd(), 'public');

// Origines autorisées pour l'upgrade WebSocket (liste séparée par des virgules).
// Vide = on accepte l'origine du site courant uniquement.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://seyra.website,https://www.seyra.website')
  .split(',').map((s) => s.trim()).filter(Boolean);

const MAX_PARTICIPANTS = 16;
const MAX_VOICE = 8; // maillage WebRTC : au-delà, la bande passante explose
const MAX_WS_PER_IP = 12; // connexions simultanées par IP
const MAX_FRAME = 3_400_000; // une trame WS (WAV PCM 60 s ré-échantillonné 12 kHz)
const MAX_CIPHER_TEXT = 100_000;
const MAX_CIPHER_VOICE = 3_000_000;
const MAX_CIPHER_CHUNK = 1_100_000; // un morceau de fichier (512 Ko bruts → ~915 Ko scellés)
const MAX_ROOM_BYTES = 128 * 1024 * 1024; // plafond mémoire par session
const TURN_SECRET = process.env.TURN_SECRET || '';
const TURN_HOST = process.env.TURN_HOST || '';
const TURN_TTL = 12 * 3600;

// Identifiants TURN éphémères (méthode REST de coturn) : aucun mot de passe fixe côté client.
function iceServers(id) {
  const list = [{ urls: ['stun:stun.l.google.com:19302'] }];
  if (TURN_SECRET && TURN_HOST) {
    const username = `${Math.floor(Date.now() / 1000) + TURN_TTL}:${id}`;
    const credential = crypto.createHmac('sha1', TURN_SECRET).update(username).digest('base64');
    list.push({
      urls: [`turn:${TURN_HOST}:3478?transport=udp`, `turn:${TURN_HOST}:3478?transport=tcp`],
      username,
      credential,
    });
  }
  return list;
}

function cleanName(raw) {
  const s = String(raw ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  // Découpe sur des points de code entiers : slice() sur des unités UTF-16
  // pouvait trancher un emoji en deux et produire un caractère illisible.
  const cps = [...s];
  return cps.length > 24 ? cps.slice(0, 24).join('') : s;
}
const MAX_MESSAGES = 800;
const MAX_ROOMS = 4000;
const EMPTY_ROOM_TTL = 3 * 60 * 1000;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.map': 'application/json',
};

/* ---------------------------------------------------------------- rooms */
// Everything lives in memory. Killing the process wipes every session.
const rooms = new Map();
const creators = new Map(); // ip -> [timestamps]
const wsByIp = new Map(); // ip -> nombre de WebSocket ouverts
const CREATIONS_PER_IP = 30;
const CREATION_WINDOW = 10 * 60 * 1000;

function mayCreate(ip) {
  const now = Date.now();
  const list = (creators.get(ip) || []).filter((t) => now - t < CREATION_WINDOW);
  if (list.length >= CREATIONS_PER_IP) { creators.set(ip, list); return false; }
  list.push(now);
  creators.set(ip, list);
  return true;
}

function createRoom(id) {
  const room = {
    id,
    createdAt: Date.now(),
    seq: 0,
    ownerId: null,
    pwd: false, // la session annonce (sans le connaître) qu'un mot de passe est requis
    history: false, // par défaut, un nouvel arrivant ne voit pas ce qui a été dit avant
    receipts: false, // accusés de lecture : choisis à la création, visibles de tous
    wall: null, // fond de conversation partagé (identifiant d'un motif prédéfini)
    waiting: false,
    pending: new Map(),
    banned: new Set(), // IP bannies de cette session
    clients: new Map(), // clientId -> participant
    messages: [],
    bytes: 0, // taille cumulée des messages chiffrés (surtout les vocaux)
    emptySince: 0,
    cycles: 0,
  };
  rooms.set(id, room);
  return room;
}

function participants(room) {
  return [...room.clients.values()].map((p) => ({ id: p.id, name: p.name, color: p.color }));
}

function broadcast(room, exceptId, payload) {
  const raw = JSON.stringify(payload);
  for (const p of room.clients.values()) {
    if (p.id === exceptId) continue;
    if (p.ws.readyState === 1) p.ws.send(raw);
  }
}

function destroyRoom(room, reason) {
  rooms.delete(room.id);
  const raw = JSON.stringify({ t: 'session:closed', reason });
  for (const p of room.clients.values()) {
    p.room = null;
    if (p.ws.readyState === 1) p.ws.send(raw);
  }
  room.clients.clear();
  room.messages.length = 0;
  room.bytes = 0;
}

setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (room.clients.size === 0) {
      if (!room.emptySince) room.emptySince = now;
      else if (now - room.emptySince > EMPTY_ROOM_TTL) destroyRoom(room, 'empty');
    } else {
      room.emptySince = 0;
    }
  }
  for (const [ip, list] of creators) {
    if (!list.some((t) => now - t < CREATION_WINDOW)) creators.delete(ip);
  }
}, 20000).unref();

/* ---------------------------------------------------------------- sockets */
const wss = new WebSocketServer({ noServer: true });
let clientSeq = 0;

function send(ws, payload) {
  if (ws.readyState === 1) ws.send(JSON.stringify(payload));
}

function leaveRoom(p, reason = 'left') {
  const room = p.room;
  if (!room) return;
  room.pending.delete(p.id);
  room.clients.delete(p.id);
  if (room.ownerId === p.id) {
    const next = room.clients.values().next().value;
    room.ownerId = next ? next.id : null;
    if (next) broadcast(room, null, { t: 'owner:set', id: next.id, name: next.name });
  }
  broadcast(room, p.id, { t: 'peer:left', reason, participant: { id: p.id, name: p.name } });
  p.camId = null;
  p.screenId = null;
  if (p.voice) {
    p.voice = false;
    broadcast(room, p.id, { t: 'voice:peer-leave', room: room.id, userId: p.id });
  }
  p.room = null;
  if (room.clients.size === 0) room.emptySince = Date.now();
}

function admit(room, p, ws) {
  if (p.room) leaveRoom(p);
  room.pending.delete(p.id);
  room.cycles += 1;
  p.room = room;
  p.name = p.name || `Guest ${room.cycles}`;
  p.color = room.cycles % 8;
  room.clients.set(p.id, p);
  room.emptySince = 0;
  // Sans proprietaire present, le nouvel arrivant reprend la session.
  if (!room.ownerId || !room.clients.has(room.ownerId)) room.ownerId = p.id;

  send(ws, {
    t: 'session:joined',
    selfId: p.id,
    selfName: p.name,
    roomId: room.id,
    ownerId: room.ownerId,
    participants: participants(room),
    messages: room.history || p.id === room.ownerId ? room.messages : [],
    createdAt: room.createdAt,
    receipts: room.receipts,
    wall: room.wall,
    waiting: room.waiting,
    pending: p.id === room.ownerId ? [...room.pending.values()].map((q) => ({ id: q.id, name: q.name })) : [],
  });
  broadcast(room, p.id, { t: 'peer:joined', participant: { id: p.id, name: p.name, color: p.color } });
}

function join(ws, p, roomId, mode, rawName, wantPwd, wantHistory, wantReceipts, wantWaiting) {
  if (typeof roomId !== 'string' || !/^[a-f0-9]{24,64}$/.test(roomId)) {
    return send(ws, { t: 'session:error', code: 'bad-code', message: 'Code de session invalide.' });
  }
  let room = rooms.get(roomId);
  if (!room) {
    if (mode === 'join') return send(ws, { t: 'session:error', code: 'missing', message: 'Session introuvable ou déjà terminée.' });
    if (rooms.size >= MAX_ROOMS) return send(ws, { t: 'session:error', code: 'busy', message: 'Serveur saturé, réessayez.' });
    if (!mayCreate(p.ip)) return send(ws, { t: 'session:error', code: 'busy', message: 'Trop de sessions créées. Réessayez dans quelques minutes.' });
    room = createRoom(roomId);
    room.ownerId = p.id;
    room.pwd = !!wantPwd;
    room.history = !!wantHistory;
    room.receipts = !!wantReceipts;
    room.waiting = !!wantWaiting;
  }
  // La session exige un mot de passe : le serveur ne peut pas le vérifier (il ne
  // le connaît pas), il se contente de dire au client qu'il doit en fournir un.
  if (room.pwd && !wantPwd) {
    return send(ws, { t: 'session:locked', roomId });
  }
  if (room.banned.has(p.ip)) {
    return send(ws, { t: 'session:error', code: 'banned', message: 'Le propriétaire de cette session vous a retiré.' });
  }
  if (room.clients.size >= MAX_PARTICIPANTS) {
    return send(ws, { t: 'session:error', code: 'full', message: 'Cette session est complète.' });
  }
  p.name = cleanName(rawName) || 'Guest';
  // Salon d'attente : on n'entre pas tant que le proprietaire n'a pas approuve.
  if (room.waiting && room.clients.size > 0 && p.id !== room.ownerId) {
    room.pending.set(p.id, p);
    p.pending = room;
    send(ws, { t: 'session:waiting', roomId: room.id });
    const owner = room.clients.get(room.ownerId);
    if (owner) send(owner.ws, { t: 'waiting:add', participant: { id: p.id, name: p.name } });
    return;
  }
  admit(room, p, ws);
}

wss.on('connection', (ws, req) => {
  // nginx écrase X-Real-IP avec l'IP réelle : l'en-tête ne peut pas être forgé par le client.
  const ip = (req.headers['x-real-ip'] || req.socket.remoteAddress || 'x').toString().trim();
  wsByIp.set(ip, (wsByIp.get(ip) || 0) + 1);
  const p = {
    id: 'p' + (++clientSeq).toString(36) + crypto.randomBytes(3).toString('hex'),
    ws, ip, room: null, name: '', color: 0, voice: false,
    budget: 60, budgetAt: Date.now(),
    frameAt: Date.now(), frameCount: 0,
  };
  ws.isAlive = true;
  send(ws, { t: 'hello', id: p.id, ice: iceServers(p.id) });

  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (raw) => {
    if (raw.length > MAX_FRAME) return;
    // Plafond de trames par seconde : limite les boucles de messages côté client.
    const now0 = Date.now();
    if (now0 - p.frameAt > 1000) { p.frameAt = now0; p.frameCount = 0; }
    if (++p.frameCount > 240) return;
    let m;
    try { m = JSON.parse(raw.toString()); } catch { return; }
    if (!m || typeof m.t !== 'string') return;

    if (m.t === 'open' || m.t === 'join') {
      return join(ws, p, m.roomId, m.t, m.name, !!m.pwd, !!m.hist, !!m.receipts, !!m.wait);
    }
    if (!p.room) return;

    const room = p.room;

    if (m.t === 'wall') {
      const wall = typeof m.wall === 'string' && /^[a-z]{1,16}$/.test(m.wall) ? m.wall : null;
      room.wall = wall;
      const rawW = JSON.stringify({ t: 'wall:set', wall });
      for (const other of room.clients.values()) if (other.ws.readyState === 1) other.ws.send(rawW);
      return;
    }

    if (m.t === 'rename') {
      const name = cleanName(m.name);
      if (!name) return;
      const old = p.name;
      p.name = name;
      broadcast(room, p.id, { t: 'peer:renamed', id: p.id, name, old });
      return send(ws, { t: 'peer:renamed', id: p.id, name, old });
    }
    if (m.t === 'msg') {
      const now = Date.now();
      if (now - p.budgetAt > 10000) { p.budgetAt = now; p.budget = 60; p.chunkBudget = 400; }
      if (typeof p.chunkBudget !== 'number') p.chunkBudget = 400;
      const cipher = String(m.cipher || '');
      const nonce = String(m.nonce || '');
      const rawKind = m.kind;
      const kind = rawKind === 'call' || rawKind === 'react' || rawKind === 'voice'
        || rawKind === 'file' || rawKind === 'filechunk' || rawKind === 'ack' ? rawKind : 'text';
      const limit = kind === 'voice' ? MAX_CIPHER_VOICE : kind === 'filechunk' ? MAX_CIPHER_CHUNK : MAX_CIPHER_TEXT;
      if (!cipher || cipher.length > limit || !nonce) return;

      // Un transfert de fichier est identifié par un identifiant aléatoire opaque.
      const fid = typeof m.fid === 'string' && /^[a-f0-9]{16,64}$/.test(m.fid) ? m.fid : null;
      if ((kind === 'file' || kind === 'filechunk') && !fid) return;

      // Les morceaux ont leur propre budget : un fichier en envoie plusieurs d'un coup.
      if (kind === 'filechunk') { if (--p.chunkBudget < 0) return; }
      else if (--p.budget < 0) return;

      // Accusé de lecture : relayé à la volée, jamais stocké (il n'encombre pas l'historique).
      if (kind === 'ack') {
        if (!room.receipts) return;
        const ackRaw = JSON.stringify({ t: 'msg', msg: { id: crypto.randomUUID(), from: p.id, cipher, nonce, kind, ts: now } });
        for (const other of room.clients.values()) if (other.id !== p.id && other.ws.readyState === 1) other.ws.send(ackRaw);
        return;
      }

      // Mémoire bornée par session : un fichier peut peser lourd, on refuse au plafond.
      if (room.bytes + cipher.length > MAX_ROOM_BYTES) return;
      const msg = {
        id: crypto.randomUUID(),
        from: p.id,
        cipher, nonce,
        kind,
        ts: now,
      };
      if (fid) msg.fid = fid;
      // Message temporaire : liste blanche de durées. Le serveur ne voit que
      // la durée de vie (jamais le contenu, qui reste chiffré).
      const ttl = Number(m.ttl);
      if (ttl === 30 || ttl === 60 || ttl === 300 || ttl === 900 || ttl === 3600) msg.expiresAt = now + ttl * 1000;
      room.messages.push(msg);
      room.bytes += cipher.length;
      if (room.messages.length > MAX_MESSAGES) {
        const dropped = room.messages.splice(0, room.messages.length - MAX_MESSAGES);
        for (const d of dropped) room.bytes -= d.cipher.length;
      }
      const raw2 = JSON.stringify({ t: 'msg', msg });
      for (const other of room.clients.values()) if (other.ws.readyState === 1) other.ws.send(raw2);
      return;
    }

    // Suppression : uniquement de ses propres messages.
    if (m.t === 'del') {
      const id = String(m.id || '');
      const byFid = typeof m.fid === 'string' && /^[a-f0-9]{16,64}$/.test(m.fid) ? m.fid : null;
      const target = byFid
        ? room.messages.find((x) => x.fid === byFid && x.from === p.id)
        : room.messages.find((x) => x.id === id && x.from === p.id);
      if (!target) return;
      // Un fichier = métadonnées + morceaux : on efface tout le transfert d'un coup.
      const removed = target.fid
        ? room.messages.filter((x) => x.fid === target.fid && x.from === p.id)
        : [target];
      for (const x of removed) room.bytes -= x.cipher.length;
      const ids = new Set(removed.map((x) => x.id));
      room.messages = room.messages.filter((x) => !ids.has(x.id));
      return broadcast(room, null, { t: 'msg:removed', ids: [...ids] });
    }

    if (m.t === 'typing') {
      return broadcast(room, p.id, { t: 'typing', from: p.id, name: p.name });
    }

    if (m.t === 'close') {
      return destroyRoom(room, 'closed');
    }

    if (m.t === 'leave') {
      return leaveRoom(p);
    }

    if (m.t === 'owner:set') {
      if (p.id !== room.ownerId) return;
      const target = room.clients.get(String(m.id || ''));
      if (!target || target.id === p.id) return;
      room.ownerId = target.id;
      return broadcast(room, null, { t: 'owner:set', id: target.id, name: target.name });
    }

    if (m.t === 'waiting:admit') {
      if (p.id !== room.ownerId) return;
      const guest = room.pending.get(String(m.id || ''));
      if (!guest || !guest.ws) return;
      return admit(room, guest, guest.ws);
    }

    if (m.t === 'waiting:deny') {
      if (p.id !== room.ownerId) return;
      const guest = room.pending.get(String(m.id || ''));
      if (!guest) return;
      room.pending.delete(guest.id);
      guest.pending = null;
      return send(guest.ws, { t: 'session:error', code: 'denied', message: 'Not admitted by the owner.' });
    }

    if (m.t === 'kick') {
      // Seul le propriétaire retire un participant.
      if (p.id !== room.ownerId) return;
      const target = room.clients.get(String(m.id || ''));
      if (!target || target.id === p.id) return;
      room.banned.add(target.ip);
      send(target.ws, { t: 'session:kicked' });
      leaveRoom(target, 'kicked');
      return;
    }

    /* ---------------- voice ---------------- */
    if (m.t === 'voice:join') {
      if (!p.voice) {
        const inVoice = [...room.clients.values()].filter((o) => o.voice).length;
        if (inVoice >= MAX_VOICE) return send(ws, { t: 'voice:error', message: `Appel complet (${MAX_VOICE} personnes maximum).` });
      }
      const peers = [...room.clients.values()]
        .filter((o) => o.voice && o.id !== p.id)
        .map((o) => ({ id: o.id, name: o.name, muted: !!o.muted, deaf: !!o.deaf, camId: o.camId || null, screenId: o.screenId || null }));
      p.voice = true;
      p.muted = !!m.muted;
      p.deaf = !!m.deaf;
      send(ws, { t: 'voice:peers', room: room.id, peers });
      broadcast(room, p.id, { t: 'voice:peer-join', room: room.id, userId: p.id, name: p.name, muted: p.muted, deaf: p.deaf, camId: p.camId || null, screenId: p.screenId || null });
      return;
    }
    if (m.t === 'voice:leave') {
      if (p.voice) {
        p.voice = false;
        broadcast(room, p.id, { t: 'voice:peer-leave', room: room.id, userId: p.id });
      }
      return;
    }
    if (m.t === 'voice:state') {
      if (!p.voice) return;
      p.muted = !!m.muted;
      p.deaf = !!m.deaf;
      // Identifiants de flux vidéo (caméra, écran) : le récepteur sait quel flux est lequel.
      const id = (v) => (typeof v === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(v) ? v : null);
      p.camId = id(m.camId);
      p.screenId = id(m.screenId);
      return broadcast(room, p.id, { t: 'voice:state', userId: p.id, muted: p.muted, deaf: p.deaf, camId: p.camId, screenId: p.screenId });
    }
    if (m.t === 'voice:signal') {
      const target = room.clients.get(String(m.to));
      if (!target || !p.voice || !target.voice) return;
      return send(target.ws, { t: 'voice:signal', room: room.id, from: p.id, data: m.data });
    }
    if (m.t === 'call:invite') {
      return broadcast(room, p.id, { t: 'call:incoming', from: p.id, name: p.name });
    }
  });

  ws.on('close', () => {
    const n = (wsByIp.get(ip) || 1) - 1;
    if (n <= 0) wsByIp.delete(ip); else wsByIp.set(ip, n);
    leaveRoom(p);
    p.ws = null;
  });
  ws.on('error', () => {
    const n = (wsByIp.get(ip) || 1) - 1;
    if (n <= 0) wsByIp.delete(ip); else wsByIp.set(ip, n);
    leaveRoom(p);
    p.ws = null;
  });
});

// Messages temporaires : purge côté serveur (l'affichage client est instantané).
setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (room.messages.length === 0) continue;
    const gone = room.messages.filter((x) => x.expiresAt && x.expiresAt <= now);
    if (gone.length === 0) continue;
    for (const g of gone) room.bytes -= g.cipher.length;
    room.messages = room.messages.filter((x) => !(x.expiresAt && x.expiresAt <= now));
    const raw = JSON.stringify({ t: 'msg:removed', ids: gone.map((x) => x.id) });
    for (const c of room.clients.values()) if (c.ws.readyState === 1) c.ws.send(raw);
  }
}, 5000).unref();

setInterval(() => {
  for (const client of wss.clients) {
    if (client.isAlive === false) { client.terminate(); continue; }
    client.isAlive = false;
    try { client.ping(); } catch {}
  }
}, 30000).unref();

/* ---------------------------------------------------------------- static */
const SITE = process.env.SITE_URL || 'https://seyra.website';

// Politique de sécurité : tout vient de notre origine, aucune ressource externe.
// Les styles injectés par le module de QR code utilisent un data-URL et des styles en ligne.
const CSP = [
  "default-src 'self'",
  // 'wasm-unsafe-eval' autorise uniquement la compilation WebAssembly (libsodium),
  // jamais l'eval JavaScript.
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' wss:",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const SEC_HEADERS = {
  'content-security-policy': CSP,
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
  'permissions-policy': 'camera=(self), geolocation=(), microphone=(self), display-capture=(self), interest-cohort=()',
  'x-permitted-cross-domain-policies': 'none',
};

function applySecHeaders(res) {
  for (const [k, v] of Object.entries(SEC_HEADERS)) res.setHeader(k, v);
  // HSTS : nginx l'ajoute aussi ; on le pose ici pour que le serveur soit correct même sans proxy.
  res.setHeader('strict-transport-security', 'max-age=31536000; includeSubDomains');
}

const json = (res, code, data) => {
  applySecHeaders(res);
  const body = JSON.stringify(data);
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(body);
};

const META = {
  title: 'Seyra — sessions privées chiffrées',
  description: 'Un code suffit. Vos messages sont chiffrés dans le navigateur, rien n’est conservé.',
};

function serveStatic(req, res, url) {
  let p = decodeURIComponent(url.pathname);
  if (p === '/' || p === '') p = '/index.html';
  const full = path.join(PUBLIC_DIR, path.normalize(p).replace(/^([/\\])+/, ''));
  if (!full.startsWith(path.resolve(PUBLIC_DIR))) { res.writeHead(403); return res.end(); }
  applySecHeaders(res);
  // Le HTML de l'app passe toujours par la route : les balises d'aperçu dépendent du chemin.
  const isHome = p === '/' || p === '/index.html';
  const isApp = p === '/app' || p === '/app/';
  const isSecurity = p === '/securite' || p === '/securite/';
  const isNews = p === '/nouveautes' || p === '/nouveautes/';
  if (isNews) {
    return stream(path.join(PUBLIC_DIR, 'index.html'), res, {
      ...META, title: 'Nouveautés — Seyra 2.0', description: 'Ce qui change dans Seyra 2.0 : épingles, mentions, partage d’écran et nouvelle interface.', url: `${SITE}/nouveautes`,
    });
  }
  if (isHome || isApp || isSecurity || p === '/rejoindre') {
    const meta = isHome
      ? { ...META, url: `${SITE}/` }
      : isApp
        ? { ...META, title: 'Ouvrir une session — Seyra', url: `${SITE}/app` }
        : isSecurity
          ? {
            ...META,
            title: 'Dossier sécurité — Seyra',
            description: 'Modèle de menace, primitives, limites et chiffres : ce que Seyra chiffre vraiment, et ce qu’il ne protège pas.',
            url: `${SITE}/securite`,
          }
          : { ...META, title: 'Rejoindre une session — Seyra', url: `${SITE}/rejoindre` };
    return stream(path.join(PUBLIC_DIR, 'index.html'), res, meta);
  }
  fs.stat(full, (err, st) => {
    if (err || st.isDirectory()) {
      if (path.extname(p) && p !== '/index.html') { res.writeHead(404); return res.end('Not found'); }
      return stream(path.join(PUBLIC_DIR, 'index.html'), res, { ...META, url: `${SITE}${p}` });
    }
    const ext = path.extname(full).toLowerCase();
    res.setHeader('content-type', MIME[ext] || 'application/octet-stream');
    res.setHeader('cache-control', ext === '.html' ? 'no-cache' : 'public, max-age=604800');
    fs.createReadStream(full).pipe(res);
  });
}

function stream(file, res, meta) {
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(500); return res.end('Service indisponible'); }
    let html = data.toString('utf8');
    if (meta) {
      // Les balises d'aperçu dépendent de la route demandée, donc insérées ici
      // plutôt qu'en dur dans index.html.
      const img = `${SITE}/og.jpg`;
      const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
      const tags = [
        `<link rel="canonical" href="${esc(meta.url)}" />`,
        `<meta property="og:type" content="website" />`,
        `<meta property="og:site_name" content="Seyra" />`,
        `<meta property="og:locale" content="fr_FR" />`,
        `<meta property="og:url" content="${esc(meta.url)}" />`,
        `<meta property="og:title" content="${esc(meta.title)}" />`,
        `<meta property="og:description" content="${esc(meta.description)}" />`,
        `<meta property="og:image" content="${img}" />`,
        `<meta property="og:image:secure_url" content="${img}" />`,
        `<meta property="og:image:type" content="image/jpeg" />`,
        `<meta property="og:image:width" content="1200" />`,
        `<meta property="og:image:height" content="630" />`,
        `<meta property="og:image:alt" content="Seyra — sessions privées chiffrées" />`,
        `<meta name="twitter:card" content="summary_large_image" />`,
        `<meta name="twitter:title" content="${esc(meta.title)}" />`,
        `<meta name="twitter:description" content="${esc(meta.description)}" />`,
        `<meta name="twitter:image" content="${img}" />`,
        `<meta name="twitter:image:alt" content="Seyra — sessions privées chiffrées" />`,
      ].join('\n    ');
      // Retire les balises d'aperçu statiques du fichier, puis insère celles de la route.
      html = html.replace(/\s*<link rel="canonical"[^>]*>/g, '');
      html = html.replace(/\s*<meta (?:property="og:[^"]*"|name="twitter:[^"]*")[^>]*>/g, '');
      // Le titre du document suit la route (l'onglet, les favoris, les moteurs).
      html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(meta.title)}</title>`);
      html = html.replace('</head>', `  ${tags}\n  </head>`);
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' });
    res.end(html);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/healthz') return json(res, 200, { ok: true, rooms: rooms.size, ts: Date.now() });
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  serveStatic(req, res, url);
});

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname !== '/ws') { socket.destroy(); return; }

  // Anti-CSRF WebSocket : on n'accepte que les pages servies par nos domaines.
  const origin = (req.headers.origin || '').toString();
  const host = (req.headers.host || '').toString();
  const sameHost = origin === `http://${host}` || origin === `https://${host}`;
  if (origin && !ALLOWED_ORIGINS.includes(origin) && !sameHost) { socket.destroy(); return; }

  const ip = (req.headers['x-real-ip'] || req.socket.remoteAddress || 'x').toString().trim();
  if ((wsByIp.get(ip) || 0) >= MAX_WS_PER_IP) { socket.destroy(); return; }

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});

server.listen(PORT, HOST, () => console.log(`Seyra sessions http://${HOST}:${PORT}`));
