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
    out.push({ slug: a.slug, title: a.title, summary: a.summary, updatedAt: a.updatedAt, author: a.author, categories: a.categories || [] });
  }
  out.sort((a, b) => b.updatedAt - a.updatedAt);
  return out;
}

const AI_LANGS = { fr: 'français', en: 'english', zh: '中文', ru: 'русский', ko: '한국어', ar: 'العربية' };
const CATEGORY_RE = /\[\[\s*(?:Cat[ée]gorie|Category|Kategorie|Категория|分类|分類|类目|분류|تصنيف|Categor[íi]a|Categoria)\s*:\s*([^\]|\n]{1,40}?)(?:\|[^\]\n]*)?\]\]/gi;
function extractCategories(body) {
  const seen = new Set();
  for (const m of String(body).matchAll(CATEGORY_RE)) {
    const name = m[1].trim().toLocaleLowerCase('fr');
    if (name) seen.add(name.slice(0, 40));
    if (seen.size >= 8) break;
  }
  return [...seen];
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
    if (!allow(req, 'acct', 15, 60_000)) return json(res, 429, { code: 'slow', error: 'Trop de tentatives, réessayez dans une minute.' }), true;
    const b = await readBody(req);
    if (!USER_RE.test(b.u || '')) return json(res, 400, { code: 'bad_name', error: 'Pseudo invalide (3 à 24 caractères : lettres, chiffres, . _ -).' }), true;
    if (accounts[b.u]) return json(res, 409, { code: 'exists', error: 'Ce pseudo est déjà pris.' }), true;
    if (typeof b.salt !== 'string' || typeof b.token !== 'string' || typeof b.blob !== 'string')
      return json(res, 400, { code: 'invalid', error: 'Requête invalide.' }), true;
    accounts[b.u] = { salt: b.salt, hash: sha(b.token), blob: b.blob, createdAt: Date.now(), updatedAt: Date.now() };
    save('accounts.json');
    return json(res, 200, { ok: true }), true;
  }

  if (p === '/api/account/salt' && req.method === 'GET') {
    const u = url.searchParams.get('u') || '';
    const a = accounts[u];
    if (!allow(req, 'acct', 30, 60_000)) return json(res, 429, { code: 'slow', error: 'Trop de tentatives.' }), true;
    if (!a) return json(res, 404, { code: 'nouser', error: 'Compte introuvable.' }), true;
    return json(res, 200, { salt: a.salt }), true;
  }

  if ((p === '/api/account/auth' || p === '/api/account/vault') && (req.method === 'POST' || req.method === 'PUT')) {
    if (!allow(req, 'acct', 40, 60_000)) return json(res, 429, { code: 'slow', error: 'Trop de requêtes.' }), true;
    const b = await readBody(req);
    const a = accounts[b.u];
    if (!a || !safeEqual(sha(b.token), a.hash)) return json(res, 401, { code: 'badlogin', error: 'Pseudo ou mot de passe incorrect.' }), true;
    if (p === '/api/account/auth') return json(res, 200, pubAccount(a)), true;
    if (typeof b.blob !== 'string' || b.blob.length > MAX_VAULT) return json(res, 413, { code: 'big', error: 'Coffre trop volumineux.' }), true;
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
    if (!SLUG_RE.test(slug)) return json(res, 400, { code: 'bad_slug', error: 'Adresse invalide.' }), true;
    const a = wiki[slug];
    if (!a) return json(res, 404, { code: 'notfound', error: 'Article introuvable.' }), true;
    return json(res, 200, a), true;
  }

  if (p.startsWith('/api/wiki/') && req.method === 'PUT') {
    if (!allow(req, 'wiki', 30, 60_000)) return json(res, 429, { code: 'slow', error: 'Trop de modifications, patientez un peu.' }), true;
    const slug = p.slice('/api/wiki/'.length);
    if (!SLUG_RE.test(slug)) return json(res, 400, { code: 'bad_slug', error: 'Adresse invalide (minuscules, chiffres, tirets).' }), true;
    const b = await readBody(req);
    const title = trimText(b.title, 120).trim();
    const body = String(b.body || '');
    if (!title) return json(res, 400, { code: 'no_title', error: 'Le titre est obligatoire.' }), true;
    if (body.length > MAX_WIKI_BODY) return json(res, 413, { code: 'too_long', error: 'Article trop long (64 Ko maximum).' }), true;
    const prev = wiki[slug];
    const now = Date.now();
    const history = prev ? [{ ts: prev.updatedAt, author: prev.author, title: prev.title }, ...(prev.history || [])].slice(0, 20) : [];
    wiki[slug] = {
      slug,
      title,
      summary: trimText(b.summary, 500),
      body,
      categories: extractCategories(body),
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

  /* ---------------- wiki : rédaction assistée par IA (proxy OpenRouter) ---------------- */
  if (p === '/api/wiki/ai' && req.method === 'POST') {
    if (!allow(req, 'wiki-ai', 6, 60_000)) return json(res, 429, { code: 'slow', error: 'Trop de générations, patientez une minute.' }), true;
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) return json(res, 503, { code: 'ai_off', error: "La génération par IA n'est pas activée sur ce serveur." }), true;
    const b = await readBody(req);
    const topic = trimText(b.topic, 200).trim();
    if (topic.length < 3) return json(res, 400, { code: 'bad_topic', error: 'Indiquez un sujet (3 caractères minimum).' }), true;
    const lang = AI_LANGS[b.lang] ? b.lang : 'en';

    const system =
      "Tu es un contributeur chevronné de Wikipédia. Rédige un article encyclopédique neutre, factuel et pédagogique sur le sujet demandé.\n" +
      "Langue d'écriture imposée : " + AI_LANGS[lang] + ".\n" +
      'Réponds UNIQUEMENT dans ce format, sans balises de code autour de la réponse, et sans message avant le TITRE:\n' +
      'TITRE: <titre court>\n' +
      "RESUME: <résumé d'une phrase, 500 caractères maximum>\n" +
      '---\n' +
      "<corps de l'article en Markdown : titre de sections en « ## » uniquement, 700 à 1500 mots,\n" +
      "liens internes sous forme [[Sujet|Libellé]] pour les notions notables,\n" +
      'et terminez par une ligne contenant 2 à 4 liens de catégorie au format [[Catégorie:Nom]].>';

    let draft = '';
    for (const model of ['recursive/flint-v1.0:free', 'xingchen-agi/xing4.0-29b-a4b:free']) {
      try {
        const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          signal: AbortSignal.timeout(150_000),
          headers: {
            authorization: 'Bearer ' + key,
            'content-type': 'application/json',
            'http-referer': 'https://seyra.website',
            'x-title': 'SeyraWiki',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: 'Sujet de l\u2019article : ' + topic },
            ],
            temperature: 0.4,
            // Le modèle consacre une longue phase de réflexion avant de rédiger :
            // sans cette marge, la réponse reste vide (finish_reason « length »).
            max_tokens: 16000,
          }),
        });
        const data = await upstream.json().catch(() => null);
        const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        if (upstream.ok && typeof text === 'string' && text.trim().length > 200) {
          draft = text;
          break;
        }
      } catch {
        /* modèle occupé ou indisponible : on essaie le suivant */
      }
    }
    if (!draft) return json(res, 502, { code: 'ai_fail', error: "L'IA n'a pas produit de brouillon exploitable. Réessayez dans une minute." }), true;

    let body = draft.replace(/^\uFEFF/, '').trim();
    body = body.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '');
    let title = topic;
    let summary = '';
    const headerMatch = /^(?:TITRE\s*:\s*(.+?)\s*(?:\n|$))(?:RESUME\s*:\s*(.+?)\s*(?:\n|$))?(?:---+\s*\n)?/i.exec(body);
    if (headerMatch) {
      if (headerMatch[1]) title = headerMatch[1].trim();
      if (headerMatch[2]) summary = headerMatch[2].trim();
      body = body.slice(headerMatch[0].length).trim();
    }
    if (!body || body.length < 150) body = draft.trim();
    title = trimText(title, 120).trim() || topic;
    summary = trimText(summary || body.replace(/[#*`\[\]|]/g, '').slice(0, 200), 500);
    body = body.slice(0, MAX_WIKI_BODY);
    return json(res, 200, { title, summary, body }), true;
  }

  /* ---------------- canaux ---------------- */
  if (p === '/api/channels/list' && req.method === 'GET') {
    const list = Object.values(channels)
      .map((c) => ({ id: c.id, title: c.title, topic: c.topic, posts: c.messages.length, updatedAt: c.updatedAt }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
    return json(res, 200, { channels: list }), true;
  }

  if (p === '/api/channels' && req.method === 'POST') {
    if (!allow(req, 'chan-new', 10, 60_000)) return json(res, 429, { code: 'slow', error: 'Trop de canaux créés, patientez.' }), true;
    const b = await readBody(req);
    const title = trimText(b.title, 80).trim();
    if (title.length < 2) return json(res, 400, { code: 'short', error: 'Titre trop court.' }), true;
    if (Object.keys(channels).length >= MAX_CHANNELS) return json(res, 507, { code: 'full', error: 'Trop de canaux sur ce serveur.' }), true;
    const id = crypto.randomBytes(6).toString('hex');
    channels[id] = { id, title, topic: trimText(b.topic, 200).trim(), createdAt: Date.now(), updatedAt: Date.now(), messages: [] };
    save('channels.json');
    return json(res, 200, { id }), true;
  }

  if (p.startsWith('/api/channels/')) {
    const rest = p.slice('/api/channels/'.length);
    const parts = rest.split('/');
    const c = channels[parts[0]];
    if (!c) return json(res, 404, { code: 'notfound', error: 'Canal introuvable.' }), true;
    if (req.method === 'GET') {
      const since = Number(url.searchParams.get('since') || 0);
      const messages = c.messages.filter((m) => m.ts > since);
      return json(res, 200, { channel: { id: c.id, title: c.title, topic: c.topic }, messages }), true;
    }
    if (req.method === 'POST' && parts.length === 1) {
      if (!allow(req, 'chan-post:' + c.id, 6, 60_000)) return json(res, 429, { code: 'slow', error: 'Doucement : une publication toutes les 10 secondes.' }), true;
      const b = await readBody(req);
      const text = String(b.text || '').slice(0, 2000).trim();
      if (!text) return json(res, 400, { code: 'empty', error: 'Message vide.' }), true;
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
