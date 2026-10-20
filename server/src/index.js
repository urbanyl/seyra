import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const PUBLIC_DIR = process.env.PUBLIC_DIR || path.join(process.cwd(), 'public');

const MAX_PARTICIPANTS = 16;
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
    banned: new Set(), // IP bannies de cette session
    clients: new Map(), // clientId -> participant
    messages: [],
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
  room.clients.delete(p.id);
  broadcast(room, p.id, { t: 'peer:left', reason, participant: { id: p.id, name: p.name } });
  if (p.voice) {
    p.voice = false;
    broadcast(room, p.id, { t: 'voice:peer-leave', room: room.id, userId: p.id });
  }
  p.room = null;
  if (room.clients.size === 0) room.emptySince = Date.now();
}

function join(ws, p, roomId, mode) {
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
  }
  if (room.banned.has(p.ip)) {
    return send(ws, { t: 'session:error', code: 'banned', message: 'Le propriétaire de cette session vous a retiré.' });
  }
  if (room.clients.size >= MAX_PARTICIPANTS) {
    return send(ws, { t: 'session:error', code: 'full', message: 'Cette session est complète.' });
  }
  if (p.room) leaveRoom(p);
  room.cycles += 1;
  p.room = room;
  p.name = `Invité ${room.cycles}`;
  p.color = room.cycles % 8;
  room.clients.set(p.id, p);
  room.emptySince = 0;

  send(ws, {
    t: 'session:joined',
    selfId: p.id,
    selfName: p.name,
    roomId: room.id,
    ownerId: room.ownerId,
    participants: participants(room),
    messages: room.messages,
    createdAt: room.createdAt,
  });
  broadcast(room, p.id, { t: 'peer:joined', participant: { id: p.id, name: p.name, color: p.color } });
}

wss.on('connection', (ws, req) => {
  // nginx écrase X-Real-IP avec l'IP réelle : l'en-tête ne peut pas être forgé par le client.
  const ip = (req.headers['x-real-ip'] || req.socket.remoteAddress || 'x').toString().trim();
  const p = {
    id: 'p' + (++clientSeq).toString(36) + crypto.randomBytes(3).toString('hex'),
    ws, ip, room: null, name: '', color: 0, voice: false,
    budget: 60, budgetAt: Date.now(),
  };
  ws.isAlive = true;
  send(ws, { t: 'hello', id: p.id });

  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (raw) => {
    if (raw.length > 120000) return;
    let m;
    try { m = JSON.parse(raw.toString()); } catch { return; }
    if (!m || typeof m.t !== 'string') return;

    if (m.t === 'open' || m.t === 'join') {
      return join(ws, p, m.roomId, m.t);
    }
    if (!p.room) return;

    const room = p.room;
    if (m.t === 'msg') {
      const now = Date.now();
      if (now - p.budgetAt > 10000) { p.budgetAt = now; p.budget = 60; }
      if (--p.budget < 0) return;
      const cipher = String(m.cipher || '');
      const nonce = String(m.nonce || '');
      if (!cipher || cipher.length > 100000 || !nonce) return;
      const msg = {
        id: crypto.randomUUID(),
        from: p.id,
        cipher, nonce,
        kind: m.kind === 'call' ? 'call' : 'text',
        ts: now,
      };
      room.messages.push(msg);
      if (room.messages.length > MAX_MESSAGES) room.messages.splice(0, room.messages.length - MAX_MESSAGES);
      const raw2 = JSON.stringify({ t: 'msg', msg });
      for (const other of room.clients.values()) if (other.ws.readyState === 1) other.ws.send(raw2);
      return;
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

    if (m.t === 'kick') {
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
      const peers = [...room.clients.values()].filter((o) => o.voice && o.id !== p.id).map((o) => ({ id: o.id, name: o.name }));
      p.voice = true;
      send(ws, { t: 'voice:peers', room: room.id, peers });
      broadcast(room, p.id, { t: 'voice:peer-join', room: room.id, userId: p.id, name: p.name });
      return;
    }
    if (m.t === 'voice:leave') {
      if (p.voice) {
        p.voice = false;
        broadcast(room, p.id, { t: 'voice:peer-leave', room: room.id, userId: p.id });
      }
      return;
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

  ws.on('close', () => { leaveRoom(p); p.ws = null; });
  ws.on('error', () => { leaveRoom(p); p.ws = null; });
});

setInterval(() => {
  for (const client of wss.clients) {
    if (client.isAlive === false) { client.terminate(); continue; }
    client.isAlive = false;
    try { client.ping(); } catch {}
  }
}, 30000).unref();

/* ---------------------------------------------------------------- static */
const json = (res, code, data) => {
  const body = JSON.stringify(data);
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(body);
};

function serveStatic(req, res, url) {
  let p = decodeURIComponent(url.pathname);
  if (p === '/' || p === '') p = '/index.html';
  const full = path.join(PUBLIC_DIR, path.normalize(p).replace(/^([/\\])+/, ''));
  if (!full.startsWith(path.resolve(PUBLIC_DIR))) { res.writeHead(403); return res.end(); }
  fs.stat(full, (err, st) => {
    if (err || st.isDirectory()) {
      if (path.extname(p) && p !== '/index.html') { res.writeHead(404); return res.end('Not found'); }
      return stream(path.join(PUBLIC_DIR, 'index.html'), res);
    }
    const ext = path.extname(full).toLowerCase();
    res.setHeader('content-type', MIME[ext] || 'application/octet-stream');
    res.setHeader('cache-control', ext === '.html' ? 'no-cache' : 'public, max-age=604800');
    fs.createReadStream(full).pipe(res);
  });
}

function stream(file, res) {
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(500); return res.end('Service indisponible'); }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' });
    res.end(data);
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
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});

server.listen(PORT, HOST, () => console.log(`Seyra sessions http://${HOST}:${PORT}`));
