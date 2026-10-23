import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ChatPane, { ShareTile } from './components/ChatPane';
import Landing from './components/Landing';
import SessionPanel from './components/SessionPanel';
import VoiceDock from './components/VoiceDock';
import Settings from './components/Settings';
import { lazy, Suspense } from 'react';
import './components/invite.css';
// Le générateur de QR code (qrcode) n'est chargé qu'à l'ouverture de la fenêtre d'invitation.
const InviteQR = lazy(() => import('./components/InviteQR'));
import CamTile from './components/CamTile';
import { IconCopy, IconLock, IconScreenShare, IconX } from './components/Icons';
import { Modal } from './components/ui';
import { cleanPseudo, formatCodeInput, mentionsName } from './lib/format';
import { useT } from './lib/i18n';
import { parsePoll } from './lib/poll';
import { CHUNK, MAX_FILE, base64ToBytes, bytesToBase64, cleanName, compressImage, fileKind, formatSize, isCompressibleImage, stripImageMetadata } from './lib/files';
import { cryptoReady, deriveSession, newCode, normalizeCode, openBody, sealBody } from './lib/session';
import { rt } from './lib/rt';
import { applyPrefs, loadPrefs, savePrefs, type Prefs } from './lib/prefs';
import type { ChunkBody, ControlBody, Envelope, FileMeta, Msg, Notice, Participant, Poll, ReactBody, Reactions, ReplyTo, SessionInfo, VoiceClip, Votes } from './lib/types';
import { voice, type VoiceState } from './lib/voice';

type Phase = 'landing' | 'session';

/** Lit #join=CODE au chargement. Le fragment ne part jamais vers le serveur. */
function readJoinHash(): string {
  const m = /^#join=([A-Za-z0-9-]+)$/.exec(window.location.hash);
  if (!m) return '';
  const formatted = formatCodeInput(m[1]);
  return formatted.replace(/-/g, '').length === 12 ? formatted : '';
}

function InviteBox({ code, onFlash }: { code: string; onFlash: (text: string) => void }) {
  const t = useT();
  const [showQr, setShowQr] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const url = `${window.location.origin}/app#join=${code}`;

  const copyLink = () => {
    navigator.clipboard?.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1800);
    }).catch(() => onFlash(t('invite.copyFail')));
  };

  return (
    <div className="invite-box">
      <code className="invite-link">{url}</code>
      <div className="invite-actions">
        <button className="btn ghost" onClick={copyLink}>
          <IconCopy size={16} /> {copiedLink ? t('invite.copied') : t('invite.copyLink')}
        </button>
        <button className="btn ghost" onClick={() => setShowQr((v) => !v)}>
          {showQr ? t('invite.hideQr') : t('invite.showQr')}
        </button>
      </div>
      {showQr && <Suspense fallback={null}><InviteQR url={url} /></Suspense>}
    </div>
  );
}

export default function App() {
  const t = useT();
  const [phase, setPhase] = useState<Phase>('landing');
  const [prefillCode, setPrefillCode] = useState<string>(() => readJoinHash());
  const [showInvite, setShowInvite] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [code, setCode] = useState('');
  const [key, setKey] = useState<Uint8Array | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [reactions, setReactions] = useState<Reactions>({});
  const [notices, setNotices] = useState<Notice[]>([]);
  const [typing, setTyping] = useState<{ name: string; ts: number } | null>(null);
  const [connection, setConnection] = useState<'online' | 'offline' | 'connecting'>('connecting');
  const [vstate, setVstate] = useState<VoiceState>(voice.state);
  const [callInvite, setCallInvite] = useState<{ name: string } | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [askClose, setAskClose] = useState(false);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [pseudo, setPseudo] = useState<string>(() => localStorage.getItem('seyra.pseudo') || '');
  const pseudoRef = useRef(pseudo);
  pseudoRef.current = pseudo;
  const [askRename, setAskRename] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [askKick, setAskKick] = useState<Participant | null>(null);
  const [lockedCode, setLockedCode] = useState('');
  const [lockedPwd, setLockedPwd] = useState('');
  const [sideOpen, setSideOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState('');
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs());
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // « ? » ouvre l'aide des raccourcis, sauf quand on écrit dans un champ.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if (e.key === '?' && !typing && !e.ctrlKey && !e.metaKey) setShowHelp((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});
  const [fileProgress, setFileProgress] = useState<Record<string, number>>({});

  const pending = useRef<{ mode: 'open' | 'join'; key: Uint8Array; roomId: string; display: string; password: string } | null>(null);
  const sessionPwd = useRef('');
  const sessionHist = useRef(false);
  const keyRef = useRef<Uint8Array | null>(null);
  keyRef.current = key;
  const expTimers = useRef(new Map<string, number>());
  const fileUrlsRef = useRef<Record<string, string>>({});
  fileUrlsRef.current = fileUrls;
  const fileParts = useRef(new Map<string, { n: number; got: number; parts: (Uint8Array<ArrayBuffer> | undefined)[] }>());
  const fileMetaRef = useRef(new Map<string, FileMeta>());
  const msgFid = useRef(new Map<string, string>());
  const stateRef = useRef<any>({});
  stateRef.current = { phase, session, participants, messages, reactions };
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const lastTyping = useRef(0);
  const typingTimer = useRef<number | undefined>(undefined);
  const inviteTimer = useRef<number | undefined>(undefined);
  const joinTimer = useRef<number | undefined>(undefined);

  const flash = useCallback((text: string) => {
    setToast(text);
    setTimeout(() => setToast(''), 3200);
  }, []);

  useEffect(() => { applyPrefs(prefs); savePrefs(prefs); }, [prefs]);
  const updatePrefs = useCallback((patch: Partial<Prefs>) => setPrefs((p) => ({ ...p, ...patch })), []);

  /* ---------------- messages ---------------- */
  const cleanupFile = useCallback((fid: string) => {
    const url = fileUrlsRef.current[fid];
    if (url) URL.revokeObjectURL(url);
    fileParts.current.delete(fid);
    fileMetaRef.current.delete(fid);
    setFileUrls((prev) => {
      if (!(fid in prev)) return prev;
      const next = { ...prev };
      delete next[fid];
      return next;
    });
    setFileProgress((prev) => {
      if (!(fid in prev)) return prev;
      const next = { ...prev };
      delete next[fid];
      return next;
    });
  }, []);

  /** Déchiffre un morceau de fichier et l'ajoute au tampon. */
  const ingestChunk = useCallback((msg: Msg, k: Uint8Array): void => {
    const fid = msg.fid;
    if (!fid) return;
    const body = openBody(msg.cipher, msg.nonce, k) as Partial<ChunkBody> | null;
    const c = body?.chunk;
    if (!c || c.fid !== fid) return;
    const i = Number(c.i);
    const n = Number(c.n);
    if (!Number.isInteger(i) || !Number.isInteger(n) || n <= 0 || n > 2000 || i < 0 || i >= n) return;
    if (typeof c.data !== 'string' || c.data.length > 1_200_000) return;

    let state = fileParts.current.get(fid);
    if (!state) {
      state = { n, got: 0, parts: new Array(n) };
      fileParts.current.set(fid, state);
    }
    if (state.parts[i]) return; // morceau déjà reçu
    state.parts[i] = base64ToBytes(c.data);
    state.got += 1;
    setFileProgress((prev) => ({ ...prev, [fid]: Math.min(1, state!.got / n) }));

    if (state.got === n && state.parts.every(Boolean)) {
      const meta = fileMetaRef.current.get(fid);
      const blob = new Blob(state.parts as Uint8Array<ArrayBuffer>[], { type: meta?.mime || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      fileParts.current.delete(fid);
      setFileUrls((prev) => ({ ...prev, [fid]: url }));
    }
  }, []);

  const removeMsgs = useCallback((ids: string[]) => {
    if (!ids.length) return;
    for (const id of ids) {
      const fid = msgFid.current.get(id);
      if (fid) {
        msgFid.current.delete(id);
        // Un fichier est découpé : on libère l'aperçu dès qu'un morceau part.
        cleanupFile(fid);
      }
    }
    setMessages((prev) => prev.filter((x) => !ids.includes(x.id)));
    setReactions((prev) => {
      let touched = false;
      const next = { ...prev };
      for (const id of ids) if (next[id]) { delete next[id]; touched = true; }
      return touched ? next : prev;
    });
    for (const id of ids) {
      const t = expTimers.current.get(id);
      if (t !== undefined) { window.clearTimeout(t); expTimers.current.delete(id); }
    }
  }, [cleanupFile]);

  const scheduleExpiry = useCallback((m: Msg) => {
    if (!m.expiresAt || expTimers.current.has(m.id)) return;
    const delay = m.expiresAt - Date.now();
    if (delay <= 0) { removeMsgs([m.id]); return; }
    const t = window.setTimeout(() => {
      expTimers.current.delete(m.id);
      removeMsgs([m.id]);
    }, Math.min(delay, 2 ** 31 - 1));
    expTimers.current.set(m.id, t);
  }, [removeMsgs]);

  /* Messages épinglés : liste ordonnée d'identifiants, mise à jour par contrôles scellés. */
  const [pinned, setPinned] = useState<string[]>([]);
  // Lecture synchrone dans togglePin (les callbacks ne doivent pas garder un état périmé).
  const pinnedRef = useRef<string[]>([]);
  pinnedRef.current = pinned;
  /* Sondages : votes par participant. */
  const [votes, setVotes] = useState<Votes>({});
  /* Éditions (texte de remplacement par message), accusés de lecture, animateurs. */
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [readers, setReaders] = useState<Record<string, number>>({});
  const [receipts, setReceipts] = useState(false);
  const applyPin = useCallback((mid: string, on: boolean) => {
    setPinned((prev) => {
      const rest = prev.filter((x) => x !== mid);
      return on ? [...rest, mid] : rest;
    });
  }, []);

  const applyReact = useCallback((uid: string, rid: string, emoji: string, on: boolean) => {
    if (!emoji || !uid) return;
    setReactions((prev) => {
      const bucket = { ...(prev[rid] || {}) };
      const users = new Set(bucket[emoji] || []);
      if (on) users.add(uid); else users.delete(uid);
      if (users.size) bucket[emoji] = [...users]; else delete bucket[emoji];
      const next = { ...prev };
      if (Object.keys(bucket).length) next[rid] = bucket; else delete next[rid];
      return next;
    });
  }, []);

  /* Contrôles scellés (kind 'react') : réactions et épingles. */
  const applyControl = useCallback((from: string, b: ControlBody, lookup?: (id: string) => Msg | undefined) => {
    if (b.react && typeof b.react.rid === 'string') {
      applyReact(from, b.react.rid, String(b.react.emoji || ''), !!b.react.on);
    }
    if (b.pin && typeof b.pin.mid === 'string') applyPin(b.pin.mid, !!b.pin.on);
    if (b.vote && typeof b.vote.pid === 'string' && typeof b.vote.opt === 'number') {
      const pid = b.vote.pid;
      const opt = b.vote.opt;
      setVotes((prev) => {
        const bucket = { ...(prev[pid] || {}) };
        if (opt < 0) delete bucket[from]; else bucket[from] = opt;
        return { ...prev, [pid]: bucket };
      });
    }
    // Édition : seul l'auteur du message peut le réécrire (l'expéditeur est fixé par le serveur).
    if (b.edit && typeof b.edit.mid === 'string' && typeof b.edit.text === 'string') {
      const target = (lookup || ((id: string) => stateRef.current.messages.find((x: Msg) => x.id === id)))(b.edit.mid);
      if (target && target.from === from && target.kind === 'text') {
        const text = b.edit.text.slice(0, 2000);
        setEdits((prev) => ({ ...prev, [b.edit!.mid as string]: text }));
      }
    }
    // Accusé de lecture : le plus récent message vu par chaque participant.
    if (b.read && typeof b.read.ts === 'number') {
      const ts = b.read.ts;
      setReaders((prev) => (prev[from] && prev[from] >= ts ? prev : { ...prev, [from]: ts }));
    }
  }, [applyReact, applyPin]);

  useEffect(() => {
    if (!window.location.hash.startsWith('#join=')) return;
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    setPrefillCode('');
  }, []);

  /* ---------------- lifecycle ---------------- */
  const wipe = useCallback(() => {
    const k = keyRef.current;
    if (k) k.fill(0); // la clé de session disparaît de la mémoire à la fermeture
    keyRef.current = null;
    if (pending.current?.key) pending.current.key.fill(0);
    pending.current = null;
    setPhase('landing');
    setSession(null);
    setKey(null);
    setCode('');
    setParticipants([]);
    setMessages([]);
    setReactions({});
    setPinned([]);
    setVotes({});
    for (const t of expTimers.current.values()) window.clearTimeout(t);
    expTimers.current.clear();
    // Libère les aperçus de fichiers (blob URLs) et les tampons de morceaux.
    for (const url of Object.values(fileUrlsRef.current)) URL.revokeObjectURL(url);
    fileParts.current.clear();
    fileMetaRef.current.clear();
    msgFid.current.clear();
    setFileUrls({});
    setFileProgress({});
    setNotices([]);
    setTyping(null);
    setCallInvite(null);
    setShowCode(false);
    setBusy(false);
    setAskClose(false);
    setAskKick(null);
    setOwnerId(null);
    setSideOpen(false);
    setShowSettings(false);
    sessionPwd.current = '';
    sessionHist.current = false;
  }, []);

  useEffect(() => {
    const offStatus = rt.onStatus(setConnection);
    const off = rt.on((m) => {
      const cur = stateRef.current;
      switch (m.t) {
        case 'hello':
          voice.setIce(m.ice);
          break;

        case 'peer:renamed':
          setParticipants((prev) => prev.map((x) => (x.id === m.id ? { ...x, name: m.name } : x)));
          voice.renamePeer(m.id, m.name);
          if (cur.session && m.id === cur.session.selfId) {
            setSession((s) => (s ? { ...s, selfName: m.name } : s));
          } else if (m.old && m.old !== m.name) {
            setNotices((prev) => [...prev, { id: 'r' + Date.now() + m.id, text: `${m.old} s'appelle maintenant ${m.name}`, ts: Date.now() }]);
          }
          break;

        case 'session:joined': {
          const p = pending.current;
          const k = (p && p.key) || keyRef.current;
          if (p) {
            setKey(p.key);
            setCode(p.display);
            if (p.mode === 'open') setShowCode(true);
            pending.current = null;
          }
          setSession({ roomId: m.roomId, selfId: m.selfId, selfName: m.selfName, createdAt: m.createdAt });
          setOwnerId(m.ownerId || null);
          setParticipants(m.participants || []);
          setReceipts(!!m.receipts);
          // Fusionne l'historique reçu, applique les réactions, ignore ce qui a expiré.
          const map = new Map((stateRef.current.messages as Msg[]).map((x) => [x.id, x]));
          for (const msg of (m.messages || []) as Msg[]) map.set(msg.id, msg);
          const all = [...map.values()].sort((a, b) => a.ts - b.ts);
          const byId = (id: string) => map.get(id);
          const visible: Msg[] = [];
          for (const msg of all) {
            if (msg.kind === 'react') {
              if (k) {
                const b = openBody(msg.cipher, msg.nonce, k) as ControlBody | null;
                if (b) applyControl(msg.from, b, byId);
              }
              continue;
            }
            if (msg.kind === 'file' || msg.kind === 'filechunk') {
              if (msg.kind === 'file' && msg.fid) {
                msgFid.current.set(msg.id, msg.fid);
                if (k) {
                  const b = openBody(msg.cipher, msg.nonce, k) as { file?: FileMeta } | null;
                  if (b?.file) fileMetaRef.current.set(msg.fid, b.file);
                }
              } else if (msg.kind === 'filechunk') {
                if (k) ingestChunk(msg, k);
                continue; // les morceaux ne s'affichent pas
              }
            }
            if (msg.expiresAt && msg.expiresAt <= Date.now()) continue;
            visible.push(msg);
          }
          setMessages(visible);
          for (const msg of visible) scheduleExpiry(msg);
          voice.setMe(m.selfId);
          setPhase('session');
          setBusy(false);
          setConnection('online');
          break;
        }

        case 'session:error':
          pending.current = null;
          setBusy(false);
          setError(m.message || t('err.sessionUnavailable'));
          rt.close();
          break;

        case 'session:locked': {
          // La session demande un mot de passe : on garde le code pour réessayer.
          const p = pending.current;
          if (p) {
            pending.current = null;
            setLockedCode(p.display);
            rt.close();
          }
          setBusy(false);
          break;
        }

        case 'session:closed':
          if (cur.phase === 'session') {
            wipe();
            setNotice(t('notice.closed'));
            voice.leave();
          }
          break;

        case 'peer:joined':
          setParticipants((prev) => prev.some((x) => x.id === m.participant.id) ? prev : [...prev, m.participant]);
          setNotices((prev) => [...prev, { id: 'n' + Date.now() + m.participant.id, text: t('notice.joined').replace('{name}', m.participant.name), ts: Date.now() }]);
          break;

        case 'peer:left':
          setParticipants((prev) => prev.filter((x) => x.id !== m.participant.id));
          setNotices((prev) => [...prev, {
            id: 'n' + Date.now() + m.participant.id,
            text: m.reason === 'kicked' ? t('notice.kicked').replace('{name}', m.participant.name) : t('notice.left').replace('{name}', m.participant.name),
            ts: Date.now(),
          }]);
          break;

        case 'session:kicked':
          if (cur.phase === 'session') {
            wipe();
            setNotice(t('notice.removed'));
            voice.leave();
          }
          break;

        case 'msg': {
          const msg = m.msg as Msg;
          const k = keyRef.current;
          if (msg.kind === 'ack') {
            // Accusé de lecture : relayé, jamais stocké par le serveur.
            if (k) {
              const b = openBody(msg.cipher, msg.nonce, k) as ControlBody | null;
              if (b) applyControl(msg.from, b);
            }
            break;
          }
          if (msg.kind === 'react') {
            if (k) {
              const b = openBody(msg.cipher, msg.nonce, k) as ControlBody | null;
              if (b) applyControl(msg.from, b);
            }
            break;
          }
          if (msg.kind === 'filechunk') {
            if (k) ingestChunk(msg, k);
            break; // morceau de fichier : jamais affiché tel quel
          }
          if (msg.kind === 'file' && msg.fid) {
            msgFid.current.set(msg.id, msg.fid);
            if (k) {
              const b = openBody(msg.cipher, msg.nonce, k) as { file?: FileMeta } | null;
              if (b?.file) fileMetaRef.current.set(msg.fid, b.file);
            }
          }
          if (msg.expiresAt && msg.expiresAt <= Date.now()) break;
          setMessages((prev) => prev.some((x) => x.id === msg.id) ? prev : [...prev, msg]);
          scheduleExpiry(msg);
          const fromOther = msg.from !== stateRef.current.session?.selfId;
          if (fromOther && msg.kind === 'text' && k) {
            // Mention : quelqu'un vous cite. Le son est dédié et ne dépend pas du réglage général.
            const b = openBody(msg.cipher, msg.nonce, k) as { text?: string } | null;
            const me = stateRef.current.session?.selfName;
            if (b?.text && me && mentionsName(b.text, me)) beep(880, 0.16);
            else if (prefsRef.current.sound) beep(520, 0.12);
          } else if (prefsRef.current.sound && fromOther) {
            beep(520, 0.12);
          }
          break;
        }

        case 'msg:removed':
          removeMsgs(((m.ids as string[]) || (m.id ? [m.id] : [])).filter((x) => typeof x === 'string'));
          break;

        case 'typing':
          setTyping({ name: m.name, ts: Date.now() });
          window.clearTimeout(typingTimer.current);
          typingTimer.current = window.setTimeout(() => setTyping(null), 3200);
          break;

        case 'call:incoming':
          if (!voice.state.active) {
            setCallInvite({ name: m.name });
            window.clearTimeout(inviteTimer.current);
            inviteTimer.current = window.setTimeout(() => setCallInvite(null), 30000);
            beep();
          }
          break;

        case 'voice:peers':
        case 'voice:peer-join':
        case 'voice:peer-leave':
        case 'voice:signal':
        case 'voice:state':
        case 'voice:error':
          voice.handle(m);
          break;
      }
    });
    return () => { off(); offStatus(); };
  }, [wipe]);

  useEffect(() => voice.subscribe(setVstate), []);

  useEffect(() => {
    if (phase !== 'session') return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [phase]);

  useEffect(() => {
    const t = setInterval(() => setTyping((cur) => (cur && Date.now() - cur.ts > 3200 ? null : cur)), 1200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const offStatus = rt.onStatus((s) => {
      if (s !== 'online') return;
      const cur = stateRef.current;
      if (cur.phase === 'session' && cur.session) {
        rt.send({ t: 'join', roomId: cur.session.roomId, pwd: sessionPwd.current ? 1 : 0 });
      }
    });
    return offStatus;
  }, []);

  /* ---------------- actions ---------------- */
  const start = useCallback(async (display: string, mode: 'open' | 'join', password = '', history = false, receiptsOn = false) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await cryptoReady();
      const { key, roomId } = await deriveSession(display, password);
      sessionPwd.current = password;
      sessionHist.current = history;
      pending.current = { mode, key, roomId, display, password };
      rt.connect();
      await rt.ready();
      rt.send({ t: mode, roomId, name: pseudoRef.current.trim(), pwd: password ? 1 : 0, hist: history ? 1 : 0, receipts: receiptsOn ? 1 : 0 });
      window.clearTimeout(joinTimer.current);
      joinTimer.current = window.setTimeout(() => {
        if (pending.current) {
          pending.current = null;
          setBusy(false);
          setError('Le serveur ne répond pas. Vérifiez votre connexion.');
          rt.close();
        }
      }, 15000);
    } catch (e) {
      setBusy(false);
      setError((e as Error).message || t('err.createFailed'));
    }
  }, []);

  const create = useCallback((opts: { password?: string; history?: boolean; receipts?: boolean }) => start(newCode(), 'open', opts?.password || '', !!opts?.history, !!opts?.receipts), [start]);
  const join = useCallback((raw: string, password?: string) => start(normalizeCode(raw), 'join', password || '', false), [start]);

  const send = useCallback((text: string, reply: ReplyTo | null, ttl: number | null) => {
    const cur = stateRef.current;
    if (!cur.session || !key) return;
    // Commande « /sondage Question | option | option » : sondage à choix unique.
    const poll = parsePoll(text);
    const body: Envelope = poll
      ? { text: poll.q, poll, ...(reply ? { reply } : {}), from: cur.session.selfId }
      : { text, ...(reply ? { reply } : {}), from: cur.session.selfId };
    const { cipher, nonce } = sealBody(body, key);
    rt.send({ t: 'msg', cipher, nonce, ...(ttl ? { ttl } : {}) });
  }, [key]);

  /** Vote (ou retrait avec opt = -1) : contrôle scellé, comme une réaction. */
  const votePoll = useCallback((pollId: string, opt: number) => {
    const cur = stateRef.current;
    const k = keyRef.current;
    if (!cur.session || !k) return;
    const me = cur.session.selfId;
    const already = votes[pollId]?.[me];
    const next = already === opt ? -1 : opt;
    const { cipher, nonce } = sealBody({ vote: { pid: pollId, opt: next } } as ControlBody, k);
    setVotes((prev) => {
      const bucket = { ...(prev[pollId] || {}) };
      if (next < 0) delete bucket[me]; else bucket[me] = next;
      return { ...prev, [pollId]: bucket };
    });
    rt.send({ t: 'msg', kind: 'react', cipher, nonce });
  }, [votes]);

  /** Envoie un clip vocal : l'audio est scellé comme le reste, jamais en clair. */
  const sendVoice = useCallback((clip: VoiceClip, reply: ReplyTo | null, ttl: number | null) => {
    const cur = stateRef.current;
    if (!cur.session || !key) return;
    const body: Envelope = { audio: clip, ...(reply ? { reply } : {}), from: cur.session.selfId };
    const { cipher, nonce } = sealBody(body, key);
    // Garde-fou aligné sur le serveur (3 M de base64 pour un vocal).
    if (cipher.length > 2950000) {
      flash(t('err.voiceTooLong'));
      return;
    }
    rt.send({ t: 'msg', kind: 'voice', cipher, nonce, ...(ttl ? { ttl } : {}) });
  }, [key, flash]);

  /**
   * Envoie un fichier : compression locale éventuelle, puis métadonnées scellées
   * et morceaux scellés séparément. Rien ne part en clair, et le serveur ne voit
   * qu'un identifiant aléatoire de transfert.
   */
  const sendFile = useCallback(async (picked: File, compress: number | null, reply: ReplyTo | null, ttl: number | null) => {
    const cur = stateRef.current;
    const k = keyRef.current;
    if (!cur.session || !k) return;

    const originalSize = picked.size;
    let blob: Blob = picked;
    let name = cleanName(picked.name);
    let w: number | undefined;
    let h: number | undefined;

    const compressible = isCompressibleImage(picked.type) && compress !== null;
    if (compressible) {
      const out = await compressImage(picked, compress);
      // On ne garde la version compressée que si elle est vraiment plus légère.
      if (out && out.blob.size < picked.size * 0.92) {
        blob = out.blob;
        name = name.replace(/\.(png|webp|jpe?g|bmp|heic|avif)$/i, '') + '.jpg';
        w = out.w;
        h = out.h;
      }
    } else if (isCompressibleImage(picked.type)) {
      // Photo « originale » : on garde les dimensions et la qualité, mais on
      // ré-encode pour jeter les métadonnées (GPS, EXIF, appareil).
      const out = await stripImageMetadata(picked);
      if (out) {
        blob = out.blob;
        name = name.replace(/\.(png|webp|jpe?g|bmp|heic|avif)$/i, '') + '.jpg';
        w = out.w;
        h = out.h;
      } else {
        flash('Impossible de nettoyer les métadonnées de cette image. Envoi annulé par prudence.');
        return;
      }
    }

    if (blob.size > MAX_FILE) {
      flash(`${blob.size > originalSize ? 'Image' : 'Fichier'} trop lourd (${formatSize(blob.size)}). Maximum ${formatSize(MAX_FILE)}.`);
      return;
    }

    const mime = blob.type || picked.type || 'application/octet-stream';
    const kind = fileKind(mime);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const fid = crypto.randomUUID().replace(/-/g, '');
    const meta: FileMeta = { fid, name, mime, size: bytes.length, kind, w, h };

    const metaBody: Envelope = { file: meta, ...(reply ? { reply } : {}), from: cur.session.selfId };
    const sealed = sealBody(metaBody, k);
    rt.send({ t: 'msg', kind: 'file', fid, cipher: sealed.cipher, nonce: sealed.nonce, ...(ttl ? { ttl } : {}) });

    const total = Math.ceil(bytes.length / CHUNK);
    for (let i = 0; i < total; i++) {
      const data = bytesToBase64(bytes.subarray(i * CHUNK, (i + 1) * CHUNK));
      const body: ChunkBody = { chunk: { fid, i, n: total, data } };
      const part = sealBody(body, k);
      rt.send({ t: 'msg', kind: 'filechunk', fid, cipher: part.cipher, nonce: part.nonce, ...(ttl ? { ttl } : {}) });
      // Laisse respirer le fil : évite de bloquer l'interface sur un gros fichier.
      if ((i & 3) === 3) await new Promise((r) => setTimeout(r, 0));
    }

    if (originalSize !== bytes.length) {
      flash(`${kind === 'image' ? 'Photo compressée' : 'Fichier compressé'} : ${formatSize(originalSize)} → ${formatSize(bytes.length)}.`);
    }
  }, [flash]);

  /** Ouvre l'enveloppe chiffrée d'un message (texte, vocal ou fichier). */
  const open = useCallback((m: Msg): Envelope | null => {
    if (!key) return null;
    const b = openBody(m.cipher, m.nonce, key) as Partial<Envelope> | null;
    if (!b) return null;
    const reply = b.reply && typeof b.reply.id === 'string' ? b.reply : null;
    const audio = b.audio && typeof b.audio.data === 'string' && typeof b.audio.mime === 'string'
      ? { mime: b.audio.mime, data: b.audio.data, dur: Number(b.audio.dur) || 0 }
      : undefined;
    const file = b.file && typeof b.file.fid === 'string' && typeof b.file.name === 'string'
      ? {
        fid: b.file.fid,
        name: String(b.file.name),
        mime: String(b.file.mime || 'application/octet-stream'),
        size: Number(b.file.size) || 0,
        kind: b.file.kind === 'image' || b.file.kind === 'video' ? b.file.kind : 'file',
        w: Number(b.file.w) || undefined,
        h: Number(b.file.h) || undefined,
      } as FileMeta
      : undefined;
    // Sondage : identifiant, question et 2 à 6 options, validés avant affichage.
    const pl = (b as Envelope).poll;
    const poll = pl && typeof pl.id === 'string' && typeof pl.q === 'string' && Array.isArray(pl.opts)
      && pl.opts.length >= 2 && pl.opts.length <= 6 && pl.opts.every((o) => typeof o === 'string')
      ? { id: pl.id, q: pl.q.slice(0, 200), opts: pl.opts.map((o) => o.slice(0, 120)) }
      : undefined;
    if (typeof b.text !== 'string' && !audio && !file && !poll) return null;
    const from = typeof b.from === 'string' ? b.from : undefined;
    return { text: typeof b.text === 'string' ? b.text : undefined, audio, file, reply, from, poll };
  }, [key]);

  /** Vue d'un message : texte d'origine, remplacé par l'édition le cas échéant. */
  const openView = useCallback((m: Msg): Envelope | null => {
    const e = open(m);
    if (!e) return null;
    const t = edits[m.id];
    return t !== undefined ? { ...e, text: t, edited: true } : e;
  }, [open, edits]);

  /** Édition : seul l'auteur peut modifier un message texte (contrôle scellé, vérifié à la réception). */
  const editMsg = useCallback((m: Msg, text: string) => {
    const cur = stateRef.current;
    const k = keyRef.current;
    if (!cur.session || !k || m.from !== cur.session.selfId || m.kind !== 'text') return;
    const clean = text.trim().slice(0, 2000);
    if (!clean) return;
    const { cipher, nonce } = sealBody({ edit: { mid: m.id, text: clean } } as ControlBody, k);
    setEdits((prev) => ({ ...prev, [m.id]: clean }));
    rt.send({ t: 'msg', kind: 'react', cipher, nonce });
  }, []);

  /* Accusés de lecture : quand la session est au premier plan, on signale le plus récent
   * message reçu des autres. Envoyés en kind 'ack' : relayés, jamais stockés. */
  const lastAck = useRef(0);
  const ackTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!receipts || phase !== 'session' || !session) return;
    const latest = messages.reduce((mx, m) => (m.from !== session.selfId && ['text', 'voice', 'file', 'call'].includes(m.kind) && m.ts > mx ? m.ts : mx), 0);
    if (!latest || latest <= lastAck.current) return;
    window.clearTimeout(ackTimer.current);
    ackTimer.current = window.setTimeout(() => {
      if (document.visibilityState !== 'visible' || !keyRef.current) return;
      lastAck.current = latest;
      const { cipher, nonce } = sealBody({ read: { ts: latest } } as ControlBody, keyRef.current);
      rt.send({ t: 'msg', kind: 'ack', cipher, nonce });
    }, 800);
    return () => window.clearTimeout(ackTimer.current);
  }, [messages, receipts, phase, session]);


  const togglePin = useCallback((msgId: string) => {
    const cur = stateRef.current;
    const k = keyRef.current;
    if (!cur.session || !k) return;
    const on = !pinnedRef.current.includes(msgId);
    const { cipher, nonce } = sealBody({ pin: { mid: msgId, on } } as ControlBody, k);
    applyPin(msgId, on);
    rt.send({ t: 'msg', kind: 'react', cipher, nonce });
  }, [applyPin]);

  const reactTo = useCallback((msgId: string, emoji: string) => {
    const cur = stateRef.current;
    const k = keyRef.current;
    if (!cur.session || !k) return;
    const on = !(cur.reactions?.[msgId]?.[emoji] || []).includes(cur.session.selfId);
    const { cipher, nonce } = sealBody({ react: { rid: msgId, emoji, on } } as ReactBody, k);
    applyReact(cur.session.selfId, msgId, emoji, on);
    rt.send({ t: 'msg', kind: 'react', cipher, nonce });
  }, [applyReact]);

  const deleteMsg = useCallback((m: Msg) => {
    rt.send({ t: 'del', id: m.id });
    removeMsgs([m.id]);
  }, [removeMsgs]);

  const signalTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTyping.current < 2400) return;
    lastTyping.current = now;
    rt.send({ t: 'typing' });
  }, []);

  const closeSession = useCallback(() => {
    rt.send({ t: 'close' });
    voice.leave();
    wipe();
    setNotice('Session fermée. Les messages ont été effacés.');
  }, [wipe]);

  /** Retour à l'accueil : on quitte proprement la session sans la détruire pour les autres. */
  const goHome = useCallback(() => {
    rt.send({ t: 'leave' });
    voice.leave();
    rt.close();
    wipe();
    window.location.assign('/');
  }, [wipe]);

  const kick = useCallback((p: Participant) => {
    rt.send({ t: 'kick', id: p.id });
    setAskKick(null);
    flash(`${p.name} a été retiré.`);
  }, [flash]);

  const copyCode = useCallback(() => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }).catch(() => flash('Copie impossible — sélectionnez le code à la main.'));
  }, [code, flash]);

  const toggleCall = useCallback(() => {
    if (voice.state.active) return voice.leave();
    setCallInvite(null);
    voice.join();
    rt.send({ t: 'call:invite' });
  }, []);

  const joinCall = useCallback(() => {
    setCallInvite(null);
    voice.join();
  }, []);

  /* Fermer un partage distant : ni image ni son, jusqu'à réouverture. */
  const [closedScreens, setClosedScreens] = useState<Set<string>>(() => new Set());
  // Un pair qui arrête son partage ne reste pas "fermé" : le prochain partage s'affiche.
  useEffect(() => {
    const sharing = new Set(vstate.peers.filter((p) => p.screen).map((p) => p.id));
    setClosedScreens((prev) => {
      const next = new Set([...prev].filter((id) => sharing.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [vstate.peers]);

  const closeRemoteScreen = useCallback((id: string, open: boolean) => {
    setClosedScreens((prev) => {
      const next = new Set(prev);
      if (open) next.delete(id); else next.add(id);
      return next;
    });
    voice.setScreenSound(id, open);
  }, []);

  const savePseudo = useCallback((name: string) => {
    const clean = cleanPseudo(name);
    if (!clean) return;
    localStorage.setItem('seyra.pseudo', clean);
    setPseudo(clean);
    const selfId = stateRef.current.session?.selfId;
    if (selfId) {
      setSession((s) => (s ? { ...s, selfName: clean } : s));
      setParticipants((prev) => prev.map((x) => (x.id === selfId ? { ...x, name: clean } : x)));
    }
    rt.send({ t: 'rename', name: clean });
    setAskRename(false);
  }, []);

  /* ---------------- view ---------------- */
  if (phase !== 'session' || !session) {
    return (
      <>
        <Landing
          onCreate={create}
          onJoin={join}
          busy={busy}
          error={error}
          notice={notice}
          pseudo={pseudo}
          onPseudo={(v) => { setPseudo(v); localStorage.setItem('seyra.pseudo', v.trim()); }}
          prefillCode={prefillCode}
        />
        {lockedCode && (
          <Modal title="Session protégée" onClose={() => { setLockedCode(''); setLockedPwd(''); }} width={400}>
            <p className="muted">Cette session demande un mot de passe. Il doit vous avoir été communiqué avec le code.</p>
            <div className="modal-field">
              <input
                autoFocus
                type="password"
                value={lockedPwd}
                maxLength={64}
                onChange={(e) => setLockedPwd(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && lockedPwd) { const c = lockedCode; setLockedCode(''); join(c, lockedPwd); } }}
                placeholder="Mot de passe de la session"
              />
            </div>
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => { setLockedCode(''); setLockedPwd(''); }}>{t('common.cancel')}</button>
              <button className="btn primary" disabled={!lockedPwd} onClick={() => { const c = lockedCode; setLockedCode(''); join(c, lockedPwd); setLockedPwd(''); }}>Rejoindre</button>
            </div>
          </Modal>
        )}
        {toast && <div className="toast">{toast}</div>}
      </>
    );
  }

  const typed = typing ? typing.name : undefined;

  return (
    <div className="session">
      <SessionPanel
        code={code}
        participants={participants}
        selfId={session.selfId}
        ownerId={ownerId}
        onCopy={copyCode}
        copied={copied}
        onClose={() => setAskClose(true)}
        onKick={(p) => setAskKick(p)}
        onInvite={() => setShowInvite(true)}
        onSettings={() => { setShowSettings(true); setSideOpen(false); }}
        onHide={() => setSideOpen(false)}
        open={sideOpen}
        onRename={() => { setRenameValue(session.selfName || pseudo); setAskRename(true); }}
        voiceById={Object.fromEntries(vstate.peers.map((x) => [x.id, x]))}
        selfVoice={vstate.active ? { muted: vstate.muted, deaf: vstate.deafened } : null}
        onHome={goHome}
        since={session.createdAt}
        messageCount={messages.filter((m) => m.kind === 'text' || m.kind === 'voice' || m.kind === 'file').length}
        fileCount={messages.filter((m) => m.kind === 'file').length}
        inviteLink={`${window.location.origin}/app#join=${code}`}
      />
      {sideOpen && <div className="scrim" onClick={() => setSideOpen(false)} />}

      <main className="main">
        <ChatPane
          onOpenSide={() => setSideOpen(true)}
          code={code}
          messages={messages}
          notices={notices}
          participants={participants}
          selfId={session.selfId}
          open={openView}
          onEdit={editMsg}
          receipts={receipts}
          readers={readers}
          onSend={send}
          onSendVoice={sendVoice}
          onSendFile={sendFile}
          fileUrls={fileUrls}
          fileProgress={fileProgress}
          onNotify={flash}
          reactions={reactions}
          onReact={reactTo}
          onDelete={deleteMsg}
          onTyping={signalTyping}
          typingName={typed}
          onCall={toggleCall}
          inVoice={vstate.active}
          callInvite={callInvite}
          onJoinCall={joinCall}
          onDismissCall={() => setCallInvite(null)}
          connection={connection}
          onShareScreen={() => voice.toggleScreen()}
          pinned={pinned}
          onTogglePin={togglePin}
          votes={votes}
          onVote={votePoll}
          sharing={vstate.sharing}
          shareStream={vstate.screen}
          wall={prefs.wallpaper}
        />
      </main>

      <VoiceDock
        state={vstate}
        selfName={session.selfName}
        nameOf={(id) => participants.find((x) => x.id === id)?.name || 'Invité'}
        onMute={() => voice.toggleMute()}
        onDeafen={() => voice.toggleDeafen()}
        onCamera={() => voice.toggleCam()}
        onLeave={() => voice.leave()}
      />

      {/* Caméras de l'appel : la sienne et celles des autres, sur un rail à gauche. */}
      {(vstate.cam || vstate.peers.some((p) => p.cam)) && (
        <div className="cam-rail">
          {vstate.cam && <CamTile stream={vstate.cam} name={session.selfName} local />}
          {vstate.peers.filter((p) => p.cam).map((p) => (
            <CamTile key={'c' + p.id} stream={p.cam!} name={p.name} />
          ))}
        </div>
      )}

      {vstate.screen && (
        <ShareTile stream={vstate.screen} name={session.selfName} local onStop={() => voice.stopScreen(true)} onClose={() => voice.stopScreen(true)} />
      )}
      {vstate.peers.filter((p) => p.screen && !closedScreens.has(p.id)).map((p) => (
        <ShareTile key={p.id} stream={p.screen!} name={p.name} onClose={() => closeRemoteScreen(p.id, false)} />
      ))}
      {vstate.peers.filter((p) => p.screen && closedScreens.has(p.id)).map((p) => (
        <button key={'cs' + p.id} className="share-pill" onClick={() => closeRemoteScreen(p.id, true)} title={t('share.watch')}>
          <IconScreenShare size={15} />
          <span>{t('share.reopen')} {p.name}</span>
        </button>
      ))}

      {askRename && (
        <Modal title={t('rename.title')} onClose={() => setAskRename(false)} width={400}>
          <p className="muted">{t('rename.hint')}</p>
          <div className="modal-field">
            <input
              autoFocus
              value={renameValue}
              maxLength={24}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') savePseudo(renameValue); }}
              placeholder={t('common.pseudo')}
            />
          </div>
          <div className="modal-actions">
            <button className="btn ghost" onClick={() => setAskRename(false)}>{t('common.cancel')}</button>
            <button className="btn primary" onClick={() => savePseudo(renameValue)} disabled={!renameValue.trim()}>{t('common.save')}</button>
          </div>
        </Modal>
      )}

      {showCode && (
        <Modal title={t('code.title')} onClose={() => setShowCode(false)} width={440}>
          <p className="muted">{t('code.hint')}</p>
          <div className="big-code">
            <code>{code}</code>
            <button className="btn ghost" onClick={copyCode}><IconCopy size={16} /> {copied ? t('code.copied') : t('code.copy')}</button>
          </div>
          <InviteBox code={code} onFlash={flash} />
          <p className="hint-line"><IconLock size={13} /> {t('code.trust')}</p>
          <button className="btn primary wide" onClick={() => setShowCode(false)}>{t('code.start')}</button>
        </Modal>
      )}

      {showInvite && (
        <Modal title={t('invite.title')} onClose={() => setShowInvite(false)} width={460}>
          <p className="muted">{t('invite.hint')}</p>
          <InviteBox code={code} onFlash={flash} />
          <button className="btn primary wide" onClick={() => setShowInvite(false)}>{t('common.close')}</button>
        </Modal>
      )}

      {askKick && (
        <Modal title={`${t('kick.title')} ${askKick.name} ?`} onClose={() => setAskKick(null)} width={420}>
          <p className="muted">{t('kick.hint')}</p>
          <div className="modal-actions">
            <button className="btn ghost" onClick={() => setAskKick(null)}>{t('common.cancel')}</button>
            <button className="btn danger" onClick={() => kick(askKick)}>{t('kick.confirm')}</button>
          </div>
        </Modal>
      )}

      {askClose && (
        <Modal title={t('close.title')} onClose={() => setAskClose(false)} width={420}>
          <p className="muted">{t('close.hint')}</p>
          <div className="modal-actions">
            <button className="btn ghost" onClick={() => setAskClose(false)}><IconX size={15} /> Annuler</button>
            <button className="btn danger" onClick={closeSession}>{t('close.confirm')}</button>
          </div>
        </Modal>
      )}

      {showHelp && (
        <Modal title={t('help.title')} onClose={() => setShowHelp(false)} width={420}>
          <dl className="help-list">
            <dt><kbd>Enter</kbd></dt><dd>{t('help.enter')}</dd>
            <dt><kbd>Shift</kbd> + <kbd>Enter</kbd></dt><dd>{t('help.newline')}</dd>
            <dt><kbd>Ctrl</kbd> + <kbd>F</kbd></dt><dd>Rechercher dans la session</dd>
            <dt><kbd>Ctrl</kbd> + <kbd>V</kbd></dt><dd>Coller une image ou un fichier</dd>
            <dt><kbd>Esc</kbd></dt><dd>{t('help.escape')}</dd>
            <dt><kbd>?</kbd></dt><dd>{t('help.help')}</dd>
            <dt><code>/sondage</code></dt><dd>{t('help.poll')}</dd>
          </dl>
        </Modal>
      )}

      {showSettings && (
        <Settings prefs={prefs} onChange={updatePrefs} onClose={() => setShowSettings(false)} />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function beep(freq = 760, dur = 0.3) {
  try {
    const ctx = new AudioContext();
    const note = (t: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.1, ctx.currentTime + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + dur + 0.02);
    };
    note(0); note(0.38);
    setTimeout(() => ctx.close().catch(() => {}), 1400);
  } catch {}
}
