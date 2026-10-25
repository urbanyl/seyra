import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DATA_DIR = process.env.DATA_DIR || '/opt/seyra/data';
const MAX_BODY = 700 * 1024;
const MAX_VAULT = 512 * 1024;
const MAX_WIKI_BODY = 64 * 1024;
const MAX_CHANNELS = 500;
const MAX_MESSAGES = 500;

function ensureDir() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch {
    /* déjà présent ou lecture seule */
  }
}
ensureDir();

function load(name, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf8'));
  } catch {
    return fallback;
  }
}

const dirty = new Set();
let flushTimer = null;
function save(name, data, now) {
  dirty.add(name);
  if (!now) {
    if (!flushTimer) flushTimer = setTimeout(flush, 400);
    return;
  }
  flush();
  void data;
}
function flush() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  for (const name of [...dirty]) {
    const data = name === 'accounts.json' ? accounts : name === 'wiki.json' ? wiki : channels;
    try {
      const tmp = path.join(DATA_DIR, name + '.tmp');
      fs.writeFileSync(tmp, JSON.stringify(data));
      fs.renameSync(tmp, path.join(DATA_DIR, name));
      dirty.delete(name);
    } catch {
      /* réessaiera au prochain changement */
    }
  }
}

let accounts = load('accounts.json', {});
let wiki = load('wiki.json', {});
let channels = load('channels.json', {});

const buckets = new Map();
function allow(req, name, limit, windowMs) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const key = name + ':' + ip;
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now > b.reset) {
    b = { n: 0, reset: now + windowMs };
    buckets.set(key, b);
  }
  b.n++;
  return b.n <= limit;
}

function json(res, code, data) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error('Corps de requête trop volumineux.'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new Error('JSON invalide.'));
      }
    });
    req.on('error', reject);
  });
}

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

const USER_RE = /^[a-zA-Z0-9_.-]{3,24}$/;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,79}$/;

function pubAccount(a) {
  return { salt: a.salt, blob: a.blob, updatedAt: a.updatedAt };
}

function trimText(s, max) {
  return String(s == null ? '' : s).slice(0, max);
}

function wikiList() {
  const out = [];
  for (const a of Object.values(wiki)) {
    out.push({ slug: a.slug, title: a.title, summary: a.summary, updatedAt: a.updatedAt, author: a.author });
  }
  out.sort((a, b) => b.updatedAt - a.updatedAt);
  return out;
}

function wikiMeta(slug) {
  if (slug && wiki[slug]) {
    const a = wiki[slug];
    return {
      title: a.title + ' — SeyraWiki',
      description: trimText(a.summary || a.body.replace(/[#*`\[\]]/g, '').slice(0, 180), 180),
      url: 'https://seyra.website/wiki/' + a.slug,
    };
  }
  return {
    title: 'SeyraWiki — l\u2019encyclopédie libre',
    description: 'Écrivez et modifiez des articles en Markdown, sans compte et sans règles.',
    url: 'https://seyra.website/wiki',
  };
}

function sitemap() {
  const urls = ['/', '/decouvrir', '/securite', '/nouveautes', '/wiki', '/canaux'];
  for (const a of Object.values(wiki)) urls.push('/wiki/' + a.slug);
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls
      .map((u) => {
        const slug = u.startsWith('/wiki/') ? u.slice(6) : '';
        const last = slug && wiki[slug] ? new Date(wiki[slug].updatedAt).toISOString() : '';
        return `  <url><loc>https://seyra.website${u}</loc>${last ? `<lastmod>${last}</lastmod>` : ''}</url>`;
      })
      .join('\n') +
    '\n</urlset>\n'
  );
}

async function handle(req, res, url) {
  const p = url.pathname;

  if (p === '/sitemap.xml' && req.method === 'GET') {
    res.writeHead(200, { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=300' });
    res.end(sitemap());
    return true;
  }

  /* ---------------- comptes ---------------- */
  if (p === '/api/account/register' && req.method === 'POST') {
    if (!allow(req, 'acct', 15, 60_000)) return json(res, 429, { error: 'Trop de tentatives, réessayez dans une minute.' }), true;
    const b = await readBody(req);
    if (!USER_RE.test(b.u || '')) return json(res, 400, { error: 'Pseudo invalide (3 à 24 caractères : lettres, chiffres, . _ -).' }), true;
    if (accounts[b.u]) return json(res, 409, { error: 'Ce pseudo est déjà pris.' }), true;
    if (typeof b.salt !== 'string' || typeof b.token !== 'string' || typeof b.blob !== 'string')
      return json(res, 400, { error: 'Requête invalide.' }), true;
    accounts[b.u] = { salt: b.salt, hash: sha(b.token), blob: b.blob, createdAt: Date.now(), updatedAt: Date.now() };
    save('accounts.json');
    return json(res, 200, { ok: true }), true;
  }

  if (p === '/api/account/salt' && req.method === 'GET') {
    const u = url.searchParams.get('u') || '';
    const a = accounts[u];
    if (!allow(req, 'acct', 30, 60_000)) return json(res, 429, { error: 'Trop de tentatives.' }), true;
    if (!a) return json(res, 404, { error: 'Compte introuvable.' }), true;
    return json(res, 200, { salt: a.salt }), true;
  }

  if ((p === '/api/account/auth' || p === '/api/account/vault') && (req.method === 'POST' || req.method === 'PUT')) {
    if (!allow(req, 'acct', 40, 60_000)) return json(res, 429, { error: 'Trop de requêtes.' }), true;
    const b = await readBody(req);
    const a = accounts[b.u];
    if (!a || !safeEqual(sha(b.token), a.hash)) return json(res, 401, { error: 'Pseudo ou mot de passe incorrect.' }), true;
    if (p === '/api/account/auth') return json(res, 200, pubAccount(a)), true;
    if (typeof b.blob !== 'string' || b.blob.length > MAX_VAULT) return json(res, 413, { error: 'Coffre trop volumineux.' }), true;
    a.blob = b.blob;
    a.updatedAt = Date.now();
    save('accounts.json');
    return json(res, 200, { ok: true }), true;
  }

  /* ---------------- wiki ---------------- */
  if (p === '/api/wiki/list' && req.method === 'GET') {
    return json(res, 200, { articles: wikiList() }), true;
  }

  if (p.startsWith('/api/wiki/') && req.method === 'GET') {
    const slug = p.slice('/api/wiki/'.length);
    if (!SLUG_RE.test(slug)) return json(res, 400, { error: 'Adresse invalide.' }), true;
    const a = wiki[slug];
    if (!a) return json(res, 404, { error: 'Article introuvable.' }), true;
    return json(res, 200, a), true;
  }

  if (p.startsWith('/api/wiki/') && req.method === 'PUT') {
    if (!allow(req, 'wiki', 30, 60_000)) return json(res, 429, { error: 'Trop de modifications, patientez un peu.' }), true;
    const slug = p.slice('/api/wiki/'.length);
    if (!SLUG_RE.test(slug)) return json(res, 400, { error: 'Adresse invalide (minuscules, chiffres, tirets).' }), true;
    const b = await readBody(req);
    const title = trimText(b.title, 120).trim();
    const body = String(b.body || '');
    if (!title) return json(res, 400, { error: 'Le titre est obligatoire.' }), true;
    if (body.length > MAX_WIKI_BODY) return json(res, 413, { error: 'Article trop long (64 Ko maximum).' }), true;
    const prev = wiki[slug];
    const now = Date.now();
    const history = prev ? [{ ts: prev.updatedAt, author: prev.author, title: prev.title }, ...(prev.history || [])].slice(0, 20) : [];
    wiki[slug] = {
      slug,
      title,
      summary: trimText(b.summary, 500),
      body,
      author: trimText(b.author || 'anonyme', 32) || 'anonyme',
      createdAt: prev ? prev.createdAt : now,
      updatedAt: now,
      history,
    };
    if (Object.keys(wiki).length > 5000) {
      const oldest = Object.values(wiki).sort((x, y) => x.updatedAt - y.updatedAt)[0];
      if (oldest && oldest.slug !== slug) delete wiki[oldest.slug];
    }
    save('wiki.json');
    return json(res, 200, { ok: true, slug, updatedAt: now }), true;
  }

  /* ---------------- canaux ---------------- */
  if (p === '/api/channels/list' && req.method === 'GET') {
    const list = Object.values(channels)
      .map((c) => ({ id: c.id, title: c.title, topic: c.topic, posts: c.messages.length, updatedAt: c.updatedAt }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
    return json(res, 200, { channels: list }), true;
  }

  if (p === '/api/channels' && req.method === 'POST') {
    if (!allow(req, 'chan-new', 10, 60_000)) return json(res, 429, { error: 'Trop de canaux créés, patientez.' }), true;
    const b = await readBody(req);
    const title = trimText(b.title, 80).trim();
    if (title.length < 2) return json(res, 400, { error: 'Titre trop court.' }), true;
    if (Object.keys(channels).length >= MAX_CHANNELS) return json(res, 507, { error: 'Trop de canaux sur ce serveur.' }), true;
    const id = crypto.randomBytes(6).toString('hex');
    channels[id] = { id, title, topic: trimText(b.topic, 200).trim(), createdAt: Date.now(), updatedAt: Date.now(), messages: [] };
    save('channels.json');
    return json(res, 200, { id }), true;
  }

  if (p.startsWith('/api/channels/')) {
    const rest = p.slice('/api/channels/'.length);
    const parts = rest.split('/');
    const c = channels[parts[0]];
    if (!c) return json(res, 404, { error: 'Canal introuvable.' }), true;
    if (req.method === 'GET') {
      const since = Number(url.searchParams.get('since') || 0);
      const messages = c.messages.filter((m) => m.ts > since);
      return json(res, 200, { channel: { id: c.id, title: c.title, topic: c.topic }, messages }), true;
    }
    if (req.method === 'POST' && parts.length === 1) {
      if (!allow(req, 'chan-post:' + c.id, 6, 60_000)) return json(res, 429, { error: 'Doucement : une publication toutes les 10 secondes.' }), true;
      const b = await readBody(req);
      const text = String(b.text || '').slice(0, 2000).trim();
      if (!text) return json(res, 400, { error: 'Message vide.' }), true;
      const msg = { id: crypto.randomBytes(6).toString('hex'), ts: Date.now(), name: trimText(b.name || 'anonyme', 24) || 'anonyme', text };
      c.messages.push(msg);
      if (c.messages.length > MAX_MESSAGES) c.messages.splice(0, c.messages.length - MAX_MESSAGES);
      c.updatedAt = msg.ts;
      save('channels.json');
      return json(res, 200, { ok: true, message: msg }), true;
    }
  }

  return false;
}

export { handle, wikiMeta, flush };
