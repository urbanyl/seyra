import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AudioRecorder, MAX_VOICE_MS, formatTime } from '../lib/audio';
import { MAX_FILE, formatSize } from '../lib/files';
import { activeMention, dayLabel, mentionPattern, suggestMentions, timeOf } from '../lib/format';
import { useT } from '../lib/i18n';
import type { Envelope, FileMeta, Msg, Notice, Participant, Poll, Reactions, ReplyTo, VoiceClip, Votes } from '../lib/types';
import { IconArrowDown, IconCheck, IconCopy, IconEyeOff, IconFile, IconImage, IconLock, IconMaximize, IconMic, IconMinimize, IconPaperclip, IconPencil, IconPoll, IconPhone, IconPin, IconReply, IconThread, IconScreenShare, IconSend, IconSmile, IconTimer, IconTrash, IconUsers, IconVideoFile, IconX } from './Icons';
import { Avatar, Empty, IconButton, Modal } from './ui';
import FileBubble from './FileBubble';
import VoicePlayer from './VoicePlayer';
import MatrixWall from './MatrixWall';
import CracksWall from './CracksWall';
import { buildPollCommand, isPollCommand, parsePoll, POLL_FORMAT } from '../lib/poll';

type Props = {
  code: string;
  messages: Msg[];
  notices: Notice[];
  participants: Participant[];
  selfId: string;
  open: (m: Msg) => Envelope | null;
  onSend: (text: string, reply: ReplyTo | null, ttl: number | null) => void;
  onSendVoice: (clip: VoiceClip, reply: ReplyTo | null, ttl: number | null) => void;
  onSendFile: (file: File, compress: number | null, reply: ReplyTo | null, ttl: number | null) => void;
  fileUrls: Record<string, string>;
  fileProgress: Record<string, number>;
  onNotify: (text: string) => void;
  reactions: Reactions;
  onReact: (msgId: string, emoji: string) => void;
  onDelete: (m: Msg) => void;
  onTyping: () => void;
  typingName?: string;
  onCall: () => void;
  inVoice: boolean;
  callInvite: { name: string } | null;
  onJoinCall: () => void;
  onDismissCall: () => void;
  connection: 'online' | 'offline' | 'connecting';
  onOpenSide: () => void;
  onShareScreen: () => void;
  sharing: boolean;
  shareStream: MediaStream | null;
  wall: string;
  pinned: string[];
  onTogglePin: (msgId: string) => void;
  votes: Votes;
  onVote: (pollId: string, opt: number) => void;
  onEdit: (m: Msg, text: string) => void;
  receipts: boolean;
  readers: Record<string, number>;
};

/** Formulaire de sondage : une question, 2 à 6 options. Envoie la même commande que /sondage. */
function PollBuilder({ onClose, onCreate }: { onClose: () => void; onCreate: (command: string) => void }) {
  const t = useT();
  const [question, setQuestion] = useState('');
  const [opts, setOpts] = useState<string[]>(['', '']);
  const command = buildPollCommand(question, opts);
  const setOpt = (i: number, v: string) => setOpts((prev) => prev.map((x, k) => (k === i ? v : x)));
  return (
    <Modal title={t('poll.new')} onClose={onClose} width={460}>
      <label className="poll-field">
        <span>{t('poll.question')}</span>
        <input autoFocus value={question} maxLength={200} placeholder={t('poll.example')} onChange={(e) => setQuestion(e.target.value)} />
      </label>
      <div className="poll-field">
        <span>{t('poll.options')}</span>
        {opts.map((o, i) => (
          <div key={i} className="poll-opt-row">
            <input value={o} maxLength={120} placeholder={`Option ${i + 1}`} onChange={(e) => setOpt(i, e.target.value)} />
            {opts.length > 2 && (
              <button type="button" className="poll-rm" aria-label={t('poll.removeOption')} onClick={() => setOpts((prev) => prev.filter((_, k) => k !== i))}>
                <IconX size={14} />
              </button>
            )}
          </div>
        ))}
        {opts.length < 6 && (
          <button type="button" className="poll-add" onClick={() => setOpts((prev) => [...prev, ''])}>+ {t('poll.add')}</button>
        )}
      </div>
      <p className="edit-hint">{t('poll.hint')}</p>
      <div className="modal-actions">
        <button className="btn ghost" onClick={onClose}>{t('common.cancel')}</button>
        <button className="btn primary" disabled={!command} onClick={() => command && onCreate(command)}>{t('poll.create')}</button>
      </div>
    </Modal>
  );
}

/** Édition d'un message texte : seul l'auteur y accède. */
function EditModal({ initial, onClose, onSave }: { initial: string; onClose: () => void; onSave: (text: string) => void }) {
  const t = useT();
  const [value, setValue] = useState(initial);
  const clean = value.trim();
  return (
    <Modal title={t('edit.title')} onClose={onClose} width={460}>
      <textarea
        className="edit-area"
        autoFocus
        value={value}
        maxLength={2000}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && clean && clean !== initial) { e.preventDefault(); onSave(clean); } }}
      />
      <p className="edit-hint">{t('edit.hint')}</p>
      <div className="modal-actions">
        <button className="btn ghost" onClick={onClose}>{t('common.cancel')}</button>
        <button className="btn primary" disabled={!clean || clean === initial} onClick={() => onSave(clean)}>{t('common.save')}</button>
      </div>
    </Modal>
  );
}

/** Sondage à choix unique : barres proportionnelles, clic = vote (re-clic = retrait). */
function PollCard({ poll, votes, selfId, nameOf, onVote }: {
  poll: Poll; votes: Record<string, number>; selfId: string; nameOf: (id: string) => string; onVote: (opt: number) => void;
}) {
  const counts = poll.opts.map((_, i) => Object.values(votes).filter((o) => o === i).length);
  const total = Object.keys(votes).length;
  const mine = votes[selfId];
  return (
    <div className="poll">
      <div className="poll-q">{poll.q}</div>
      {poll.opts.map((o, i) => {
        const pct = total ? Math.round((counts[i] / total) * 100) : 0;
        const voters = Object.keys(votes).filter((uid) => votes[uid] === i).map((uid) => (uid === selfId ? 'vous' : nameOf(uid)));
        return (
          <button key={i} type="button" className={`poll-opt ${mine === i ? 'mine' : ''}`} onClick={() => onVote(i)} title={voters.join(', ') || 'Aucun vote'}>
            <span className="poll-bar" style={{ width: pct + '%' }} />
            <span className="poll-label">{mine === i && <IconCheck size={13} />}{o}</span>
            <span className="poll-count">{counts[i]}</span>
          </button>
        );
      })}
      <em className="poll-total">{total} vote{total > 1 ? 's' : ''} · {mine === undefined ? 'choisissez une option' : 'cliquez à nouveau pour retirer'}</em>
    </div>
  );
}

const EMOJIS = ['😀', '😂', '😍', '🥳', '😎', '🤔', '👍', '🙏', '🔥', '💙', '✨', '🎧', '📌', '✅'];

type TypeFilter = 'text' | 'photo' | 'video' | 'file' | 'voice' | 'poll';
const TYPE_LABELS: Record<TypeFilter, string> = {
  text: 'Texte', photo: 'Photos', video: 'Vidéos', file: 'Fichiers', voice: 'Vocaux', poll: 'Sondages',
};

/** Vrai si le message correspond au type demandé (contenu déchiffré localement). */
function matchesType(t: TypeFilter, m: Msg, e: Envelope | null): boolean {
  if (m.kind === 'react' || m.kind === 'filechunk' || m.kind === 'call') return false;
  switch (t) {
    case 'text': return !!e?.text && !e.file && !e.audio && !e.poll;
    case 'photo': return e?.file?.kind === 'image';
    case 'video': return e?.file?.kind === 'video';
    case 'file': return !!e?.file && e.file.kind === 'file';
    case 'voice': return !!e?.audio;
    case 'poll': return !!e?.poll;
  }
}
const REACTS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '✅'];
const TTL_OPTIONS: [number | null, string, string][] = [
  [null, 'Permanent', ''],
  [30, '30 secondes', '30 s'],
  [60, '1 minute', '1 min'],
  [300, '5 minutes', '5 min'],
  [900, '15 minutes', '15 min'],
  [3600, '1 heure', '1 h'],
];

export default function ChatPane(p: Props) {
  const t = useT();
  const matrix = p.wall === 'matrix';
  const cracks = p.wall === 'cracks';
  const domWall = matrix || cracks;
  const [draft, setDraft] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<{ m: Msg; text: string } | null>(null);
  const [fromFilter, setFromFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter | ''>('');
  const [reply, setReply] = useState<ReplyTo | null>(null);
  const [reactPop, setReactPop] = useState<string | null>(null);
  const [delArm, setDelArm] = useState<string | null>(null);
  const [ttl, setTtl] = useState<number | null>(null);
  const [ttlPop, setTtlPop] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [recMs, setRecMs] = useState<number | null>(null);
  const [showJump, setShowJump] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  // Mentions : liste de suggestions pendant la saisie d'un « @ ».
  const [mentionCaret, setMentionCaret] = useState(-1);
  const [mentionIdx, setMentionIdx] = useState(0);
  const mention = useMemo(() => {
    const at = mentionCaret >= 0 ? activeMention(draft, mentionCaret) : null;
    if (!at) return { at: null as null | { start: number; query: string }, list: [] as Participant[] };
    const others = p.participants.filter((x) => x.id !== p.selfId);
    return { at, list: suggestMentions(others, at.query) };
  }, [draft, mentionCaret, p.participants, p.selfId]);
  useEffect(() => { setMentionIdx(0); }, [mention.at?.query]);

  /** Insère « @Nom » à la place de la saisie en cours, suivi d'un espace. */
  function pickMention(member: Participant | undefined) {
    if (!member || !mention.at) return;
    const before = draft.slice(0, mention.at.start);
    const after = draft.slice(mentionCaret);
    const next = before + '@' + member.name + ' ' + after;
    const pos = (before + '@' + member.name + ' ').length;
    setDraft(next);
    setMentionCaret(-1);
    requestAnimationFrame(() => {
      const el = input.current;
      if (el) { el.focus(); el.setSelectionRange(pos, pos); }
    });
  }

  // Raccourci : Ctrl+F (ou Cmd+F) ouvre la recherche dans la session.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setSearchOpen(true);
        setQuery('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);
  const seenTs = useRef(Date.now());
  const imgInput = useRef<HTMLInputElement>(null);
  const vidInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const imgQuality = useRef<number | null>(0.82);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const atBottom = useRef(true);
  const longPress = useRef<number | undefined>(undefined);
  const delTimer = useRef<number | undefined>(undefined);
  const flashTimer = useRef<number | undefined>(undefined);
  const recorder = useRef<AudioRecorder | null>(null);
  const recTimer = useRef<number | undefined>(undefined);

  const byId = useMemo(() => Object.fromEntries(p.participants.map((x) => [x.id, x])), [p.participants]);
  const nameOf = (id: string) => (id === p.selfId ? t('chat.you') : byId[id]?.name || t('chat.guest'));
  const colorOf = (id: string) => COLORS[(byId[id]?.color || 0) % COLORS.length];

  const hasTtl = p.messages.some((m) => !!m.expiresAt);
  useEffect(() => {
    if (!hasTtl) return;
    setNow(Date.now());
    let stop = 0;
    const tick = () => {
      setNow(Date.now());
      stop = window.setTimeout(tick, 500);
    };
    // setTimeout plutôt que setInterval : reste juste après un onglet en veille.
    stop = window.setTimeout(tick, 500);
    return () => window.clearTimeout(stop);
  }, [hasTtl]);

  // Une seconde valeur de temps, mise à jour à chaque trame, pour le décompte.
  const [openActions, setOpenActions] = useState<string | null>(null);

  const visible = useMemo(
    () => p.messages.filter((m) => m.kind !== 'react' && m.kind !== 'filechunk' && (!m.expiresAt || m.expiresAt > now)),
    [p.messages, now],
  );

  // Messages épinglés, avec un aperçu déchiffré (le serveur n'a que des identifiants).
  const pinnedItems = useMemo(() => {
    const out: { m: Msg; author: string; preview: string }[] = [];
    for (const id of p.pinned) {
      const m = p.messages.find((x) => x.id === id && !x.expiresAt);
      if (!m) continue;
      const env = p.open(m);
      const text = env?.text || (env?.file ? env.file.name : env?.audio ? 'Message vocal' : '');
      if (!text) continue;
      out.push({ m, author: p.participants.find((x) => x.id === m.from)?.name || t('chat.guest'), preview: text.length > 90 ? text.slice(0, 90) + '…' : text });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.pinned, p.messages, p.participants]);

  // Fils : pour chaque message, les réponses qui le citent (déchiffrées localement).
  const threads = useMemo(() => {
    const map: Record<string, { m: Msg; env: Envelope | null }[]> = {};
    for (const m of visible) {
      const env = p.open(m);
      const rid = env?.reply?.id;
      if (!rid) continue;
      (map[rid] ||= []).push({ m, env });
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, p.open]);
  const [threadRoot, setThreadRoot] = useState<string | null>(null);
  const rootMsg = threadRoot ? visible.find((x) => x.id === threadRoot) || null : null;

  const timeline = useMemo(() => {
    const items = [
      ...visible.map((m) => ({ kind: 'msg' as const, ts: m.ts, msg: m })),
      ...p.notices.map((n) => ({ kind: 'sys' as const, ts: n.ts, notice: n })),
    ];
    items.sort((a, b) => a.ts - b.ts);
    return items;
  }, [visible, p.notices]);

  const filtering = !!(query.trim() || fromFilter || typeFilter);
  const shown = useMemo(() => {
    if (!filtering) return timeline;
    const needle = query.trim().toLowerCase();
    return timeline.filter((item) => {
      if (item.kind === 'sys') return !needle && !fromFilter && !typeFilter && item.notice.text.toLowerCase().includes(needle);
      const e = p.open(item.msg);
      if (fromFilter && item.msg.from !== fromFilter) return false;
      if (typeFilter && !matchesType(typeFilter, item.msg, e)) return false;
      if (!needle) return true;
      return `${e?.text || ''} ${e?.file?.name || ''}`.toLowerCase().includes(needle);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline, query, fromFilter, typeFilter, filtering, p.open]);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (atBottom.current) el.scrollTop = el.scrollHeight;
  }, [shown.length, p.typingName]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
    atBottom.current = true;
    input.current?.focus();
    return () => {
      window.clearTimeout(delTimer.current);
      window.clearTimeout(flashTimer.current);
      window.clearTimeout(recTimer.current);
      window.clearTimeout(longPress.current);
      recorder.current?.cancel();
      recorder.current = null;
    };
  }, []);

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    atBottom.current = bottom;
    if (bottom) seenTs.current = Date.now();
    setShowJump(!bottom);
  }

  // Messages reçus pendant qu'on lit plus haut : comptés sur le bouton.
  const unread = showJump
    ? p.messages.reduce((n, m) => (m.kind !== 'react' && m.from !== p.selfId && m.ts > seenTs.current ? n + 1 : n), 0)
    : 0;

  function closePops(e: React.MouseEvent) {
    const t = e.target as HTMLElement;
    if (!t.closest('.react-pop') && !t.closest('.msg-actions')) setReactPop(null);
    if (!t.closest('.ttl-pop') && !t.closest('.ttl-btn')) setTtlPop(false);
    if (!t.closest('.attach-pop') && !t.closest('.attach-btn')) setAttachOpen(false);
    if (!t.closest('.msg-actions')) {
      window.clearTimeout(delTimer.current);
      setDelArm(null);
    }
    // Le tap sur la bulle ouvre/ferme les actions ; un tap ailleurs les referme.
    const bubble = t.closest('.bubble');
    if (!bubble) setOpenActions(null);
  }

  function startReply(m: Msg, text: string) {
    setReactPop(null);
    setOpenActions(null);
    setReply({ id: m.id, from: m.from, text });
    input.current?.focus();
  }

  function armDelete(m: Msg) {
    if (delArm === m.id) {
      window.clearTimeout(delTimer.current);
      setDelArm(null);
      setOpenActions(null);
      p.onDelete(m);
      return;
    }
    window.clearTimeout(delTimer.current);
    setDelArm(m.id);
    delTimer.current = window.setTimeout(() => setDelArm(null), 3000);
  }

  function jumpTo(id: string) {
    const el = document.getElementById('m' + id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFlash(id);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 1600);
  }

  function send() {
    const text = draft.trim();
    if (!text) return;
    // Commande sondage mal écrite : on la refuse et on dit pourquoi, au lieu de l'envoyer en texte brut.
    if (isPollCommand(text) && !parsePoll(text)) {
      p.onNotify(`Sondage incomplet. Format : ${POLL_FORMAT} (2 options minimum), ou utilisez le bouton Sondage.`);
      return;
    }
    p.onSend(text, reply, ttl);
    setDraft('');
    setReply(null);
    setEmojiOpen(false);
    setAttachOpen(false);
    if (input.current) input.current.style.height = 'auto';
    atBottom.current = true;
    input.current?.focus();
  }

  /* ---------------- fichiers ---------------- */

  function pickImage(quality: number | null) {
    imgQuality.current = quality;
    setAttachOpen(false);
    imgInput.current?.click();
  }

  function pickInput(ref: React.RefObject<HTMLInputElement | null>) {
    setAttachOpen(false);
    ref.current?.click();
  }

  function onPicked(e: React.ChangeEvent<HTMLInputElement>, compress: number | null) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const willCompress = compress !== null && /^image\//.test(f.type) && !/gif|svg/i.test(f.type);
    // Une photo destinée à la compression peut être lourde au départ : c'est le
    // résultat compressé qui doit tenir sous la limite (vérifié dans sendFile).
    const ceiling = willCompress ? 60 * 1024 * 1024 : MAX_FILE;
    if (f.size > ceiling) {
      p.onNotify(willCompress
        ? `Image trop lourde pour être compressée (${formatSize(f.size)}).`
        : `Trop lourd : ${formatSize(f.size)}. Maximum ${formatSize(MAX_FILE)}.`);
      return;
    }
    p.onSendFile(f, compress, reply, ttl);
    setReply(null);
    atBottom.current = true;
  }

  /** Ctrl+V : une image (ou un fichier) copié dans le presse-papiers part directement. */
  function onPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (const it of items) {
      if (it.kind !== 'file') continue;
      const f = it.getAsFile();
      if (f) files.push(f);
    }
    if (!files.length) return;
    e.preventDefault();
    for (const f of files.slice(0, 5)) {
      const isImage = /^image\//.test(f.type);
      const name = f.name || (isImage ? 'copie.png' : 'copie');
      const file = f.name ? f : new File([f], name, { type: f.type || 'application/octet-stream' });
      const compress = isImage && !/gif|svg/i.test(f.type) ? 0.82 : null;
      const ceiling = compress !== null ? 60 * 1024 * 1024 : MAX_FILE;
      if (file.size > ceiling) {
        p.onNotify(compress !== null
          ? `Image trop lourde pour être compressée (${formatSize(file.size)}).`
          : `Trop lourd : ${formatSize(file.size)}. Maximum ${formatSize(MAX_FILE)}.`);
        continue;
      }
      p.onSendFile(file, compress, reply, ttl);
      setReply(null);
      atBottom.current = true;
    }
  }

  /* ---------------- messages vocaux ---------------- */

  async function startRec() {
    if (recorder.current) return;
    const r = new AudioRecorder();
    try {
      await r.start();
    } catch {
      p.onNotify('Micro indisponible. Autorisez l’accès au microphone.');
      return;
    }
    recorder.current = r;
    setRecMs(0);
    setEmojiOpen(false);
    setReactPop(null);
    setOpenActions(null);
    const tick = () => {
      const ms = r.elapsed();
      setRecMs(ms);
      if (ms >= MAX_VOICE_MS) void sendRec();
      else recTimer.current = window.setTimeout(tick, 200);
    };
    recTimer.current = window.setTimeout(tick, 200);
  }

  async function sendRec() {
    const r = recorder.current;
    window.clearTimeout(recTimer.current);
    recorder.current = null;
    setRecMs(null);
    if (!r) return;
    const clip = await r.stop();
    if (!clip) return;
    p.onSendVoice(clip, reply, ttl);
    setReply(null);
    atBottom.current = true;
  }

  function cancelRec() {
    window.clearTimeout(recTimer.current);
    recorder.current?.cancel();
    recorder.current = null;
    setRecMs(null);
  }

  return (
    <section className={`pane${domWall ? ' with-wall' : ''}`} onClick={closePops}>
        {matrix && <MatrixWall />}
        {cracks && <CracksWall />}
      <header className="pane-head">
        <div className="stack">
          {p.participants.slice(0, 3).map((x) => (
            <Avatar key={x.id} name={x.name} color={x.color} size={34} />
          ))}
        </div>
        <div className="pane-title">
          <h2>{t('chat.sessionTitle')}</h2>
          <p>
            <IconUsers size={12} /> {p.participants.length} {t('chat.connected')}
            <i className={`live ${p.connection}`} /> {p.connection === 'online' ? t('chat.online') : p.connection === 'connecting' ? t('chat.connecting') : t('chat.offline')}
          </p>
        </div>
        <div className="pane-actions">
          <IconButton label="Participants" className="mobile-only" onClick={p.onOpenSide}><IconUsers size={19} /></IconButton>
          <IconButton label="Rechercher" active={searchOpen} onClick={() => { setSearchOpen((v) => !v); setQuery(''); }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.2 4.2" />
            </svg>
          </IconButton>
          <button className={`call-btn share-btn ${p.sharing ? 'on' : ''}`} onClick={p.onShareScreen} title={p.sharing ? "Arrêter le partage d'écran" : "Partager l'écran"} disabled={!p.inVoice}>
            <IconScreenShare size={18} />
          </button>
          <button className={`call-btn ${p.inVoice ? 'on' : ''}`} onClick={p.onCall} title={p.inVoice ? "Quitter l'appel" : 'Appel vocal'}>
            <IconPhone size={18} />
          </button>
        </div>
      </header>

      {searchOpen && (
        <div className="search chat-search">
          <div className="search-row">
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('chat.search')} />
            <button className="search-close" aria-label="Fermer la recherche" onClick={() => { setSearchOpen(false); setQuery(''); setFromFilter(''); setTypeFilter(''); }}><IconX size={15} /></button>
          </div>
          <div className="search-filters">
            <select value={fromFilter} onChange={(e) => setFromFilter(e.target.value)} aria-label="Filtrer par expéditeur">
              <option value="">{t('chat.allSenders')}</option>
              {p.participants.map((x) => <option key={x.id} value={x.id}>{x.id === p.selfId ? t('chat.you') : x.name}</option>)}
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TypeFilter | '')} aria-label="Filtrer par type">
              <option value="">{t('chat.allTypes')}</option>
              {(Object.keys(TYPE_LABELS) as TypeFilter[]).map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          {filtering && <em className="search-count">{shown.length} {t('chat.results')}</em>}
        </div>
      )}

      {p.callInvite && !p.inVoice && (
        <div className="call-banner">
          <IconPhone size={15} />
          <span>{p.callInvite.name} a lancé un appel vocal</span>
          <button className="btn primary small" onClick={p.onJoinCall}>{t('join.join')}</button>
          <button className="btn ghost small" onClick={p.onDismissCall}>Ignorer</button>
        </div>
      )}

      {pinnedItems.length > 0 && (
        <div className="pin-bar" role="region" aria-label={t('chat.pinnedList')}>
          <IconPin size={15} />
          <button
            type="button"
            className="pin-text"
            onClick={() => document.getElementById('m-' + pinnedItems[pinnedItems.length - 1].m.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            title="Aller au message épinglé"
          >
            <strong>{pinnedItems[pinnedItems.length - 1].author}</strong>
            <span>{pinnedItems[pinnedItems.length - 1].preview}</span>
          </button>
          {pinnedItems.length > 1 && <em className="pin-count">+{pinnedItems.length - 1}</em>}
          <button type="button" className="pin-x" title="Désépingler" aria-label="Désépingler" onClick={() => p.onTogglePin(pinnedItems[pinnedItems.length - 1].m.id)}>
            <IconX size={14} />
          </button>
        </div>
      )}

      <div className="messages" ref={scroller} onScroll={onScroll}>
        <div className="e2e-note">
          <IconLock size={13} /> {t('chat.e2e')}
        </div>

        {shown.length === 0 && (
          <Empty
            title={query ? t('chat.noResult') : t('chat.open')}
            text={query ? t('chat.tryOther') : t('chat.openHint')}
            icon={<IconLock size={30} />}
          />
        )}

        {shown.map((item, i) => {
          const prev = shown[i - 1];
          const showDay = !prev || new Date(prev.ts).toDateString() !== new Date(item.ts).toDateString();

          if (item.kind === 'sys') {
            return (
              <div key={item.notice.id}>
                {showDay && <div className="day-sep"><span>{dayLabel(item.ts)}</span></div>}
                <div className="sys-line">{item.notice.text}</div>
              </div>
            );
          }

          const m = item.msg;
          const env = p.open(m);
          const audio = env?.audio || null;
          const file = env?.file || null;
          const text = env && typeof env.text === 'string' ? env.text : null;
          const quote = env?.reply || null;
          const forged = !!env?.from && env.from !== m.from;
          const mine = m.from === p.selfId;
          const author = byId[m.from];
          const grouped = !!(prev && prev.kind === 'msg' && prev.msg.from === m.from && m.ts - prev.msg.ts < 5 * 60000 && !showDay);
          const chips = p.reactions[m.id];
          const armed = delArm === m.id;
          const left = m.expiresAt ? Math.max(0, m.expiresAt - now) : 0;
          const ttlLabel = formatCountdown(left);
          const revealed = openActions === m.id;

          return (
            <div key={m.id} id={'m' + m.id} className={`msg-wrap ${flash === m.id ? 'flash' : ''}`}>
              {showDay && <div className="day-sep"><span>{dayLabel(item.ts)}</span></div>}
              <div id={'m-' + m.id} className={`msg ${mine ? 'out' : 'in'} ${grouped ? 'grouped' : ''} ${p.pinned.includes(m.id) ? 'pinned' : ''}`}>
                {!mine && !grouped && (
                  <span className="msg-author" style={{ color: colorOf(m.from) }}>{nameOf(m.from)}</span>
                )}
                <div
                  className={`bubble ${revealed ? 'revealed' : ''} ${audio ? 'has-voice' : file ? 'has-voice has-file' : ''}`}
                  onContextMenu={(e) => { e.preventDefault(); setReactPop(null); setOpenActions(m.id); }}
                  onPointerDown={(e) => {
                    if (e.pointerType !== 'touch') return;
                    window.clearTimeout(longPress.current);
                    longPress.current = window.setTimeout(() => {
                      setReactPop(null);
                      setOpenActions(m.id);
                    }, 450);
                  }}
                  onPointerUp={() => window.clearTimeout(longPress.current)}
                  onPointerMove={() => window.clearTimeout(longPress.current)}
                  onPointerCancel={() => window.clearTimeout(longPress.current)}
                >
                  <div className="msg-actions" onClick={(e) => e.stopPropagation()}>
                    {(threads[m.id]?.length || 0) > 0 && (
                      <button type="button" title="Voir le fil" onClick={() => { setThreadRoot(m.id); setOpenActions(null); }}>
                        <IconThread size={15} />
                      </button>
                    )}
                    {mine && text !== null && !audio && !file && !env?.poll && (
                      <button type="button" title="Modifier" onClick={() => { setEditing({ m, text }); setOpenActions(null); }}>
                        <IconPencil size={15} />
                      </button>
                    )}
                    <button type="button" title={t('chat.replyTo')} onClick={() => startReply(m,
                      file ? (file.kind === 'image' ? 'Photo' : file.kind === 'video' ? 'Vidéo' : file.name)
                        : audio ? 'Message vocal' : text || '')}>
                      <IconReply size={15} />
                    </button>
                    <button type="button" title={p.pinned.includes(m.id) ? 'Désépingler' : 'Épingler'} className={p.pinned.includes(m.id) ? 'on' : ''} onClick={() => { p.onTogglePin(m.id); setOpenActions(null); }}>
                      <IconPin size={15} />
                    </button>
                    <button type="button" title="Ajouter une réaction" onClick={() => setReactPop((v) => (v === m.id ? null : m.id))}>
                      <IconSmile size={15} />
                    </button>
                    {text !== null && !audio && (
                      <button
                        type="button"
                        title={t('chat.copy')}
                        onClick={() => {
                          navigator.clipboard?.writeText(text).then(
                            () => p.onNotify('Message copié.'),
                            () => p.onNotify('Copie impossible.'),
                          );
                          setOpenActions(null);
                        }}
                      >
                        <IconCopy size={15} />
                      </button>
                    )}
                    {mine && (audio || file || text !== null) && (
                      <button
                        type="button"
                        className={armed ? 'arm' : ''}
                        title={armed ? 'Confirmer la suppression' : 'Supprimer le message'}
                        onClick={() => armDelete(m)}
                      >
                        <IconTrash size={15} />
                      </button>
                    )}
                  </div>

                  {reactPop === m.id && (
                    <div className="react-pop">
                      {REACTS.map((e) => (
                        <button
                          key={e}
                          type="button"
                          className={(chips?.[e] || []).includes(p.selfId) ? 'on' : ''}
                          onClick={() => { p.onReact(m.id, e); setReactPop(null); setOpenActions(null); }}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  )}

                  {quote && (
                    <button type="button" className="reply-quote" onClick={(e) => { e.stopPropagation(); jumpTo(quote.id); }}>
                      <strong style={{ color: colorOf(quote.from) }}>{nameOf(quote.from)}</strong>
                      <span>{quote.text.slice(0, 140)}</span>
                    </button>
                  )}

                  {forged && (
                    <span className="forged" title="L’auteur annoncé par le serveur ne correspond pas à celui scellé dans le message">
                      auteur non vérifié
                    </span>
                  )}

                  {file ? (
                    <FileBubble
                      meta={file}
                      url={p.fileUrls[file.fid]}
                      progress={p.fileProgress[file.fid]}
                      onOpen={(url, name) => setPreview({ url, name })}
                    />
                  ) : audio ? (
                    <VoicePlayer clip={audio} />
                  ) : env?.poll ? (
                    <PollCard
                      poll={env.poll}
                      votes={p.votes[env.poll.id] || {}}
                      selfId={p.selfId}
                      nameOf={nameOf}
                      onVote={(opt) => p.onVote(env.poll!.id, opt)}
                    />
                  ) : text === null ? (
                    <span className="locked"><IconLock size={13} /> illisible</span>
                  ) : m.kind === 'call' ? (
                    <span className="call-log"><IconPhone size={14} /> {text}</span>
                  ) : (
                    <span className="bubble-text">{linkify(text, p.participants.find((x) => x.id === p.selfId)?.name, p.participants.map((x) => x.name))}</span>
                  )}

                  {m.expiresAt && left > 0 && (
                    <span className="ttl-badge" title="Message temporaire"><IconTimer size={11} /> {ttlLabel}</span>
                  )}
                  {env?.edited && <em className="edited">modifié</em>}
                  <time>{timeOf(m.ts)}</time>
                  {mine && p.receipts && (() => {
                    const seenBy = Object.keys(p.readers).filter((uid) => uid !== p.selfId && p.readers[uid] >= m.ts);
                    const names = seenBy.map((uid) => byId[uid]?.name || 'Invité');
                    return (
                      <span className={`read-state ${seenBy.length ? 'seen' : ''}`} title={names.length ? 'Lu par ' + names.join(', ') : 'Pas encore lu'}>
                        {seenBy.length ? `Vu · ${seenBy.length}` : 'Envoyé'}
                      </span>
                    );
                  })()}
                </div>

                {chips && (
                  <div className="reactions">
                    {Object.entries(chips).map(([emoji, users]) => (
                      <button
                        key={emoji}
                        type="button"
                        className={`chip ${users.includes(p.selfId) ? 'mine' : ''}`}
                        title={users.map(nameOf).join(', ')}
                        onClick={() => p.onReact(m.id, emoji)}
                      >
                        {emoji}<em>{users.length}</em>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {p.typingName && <div className="typing"><span /><span /><span /> {p.typingName} écrit…</div>}
      </div>

      {reply && (
        <div className="reply-bar">
          <div>
            <strong>{t('chat.replyingTo')} {nameOf(reply.from)}</strong>
            <span>{reply.text.slice(0, 120)}</span>
          </div>
          <button type="button" title="Annuler la réponse" onClick={() => setReply(null)}><IconX size={16} /></button>
        </div>
      )}

      <div className="composer-wrap">
      {mention.list.length > 0 && recMs === null && (
        <ul className="mention-list" role="listbox" aria-label={t('chat.mentionList')}>
          {mention.list.map((m, i) => (
            <li key={m.id} role="option" aria-selected={i === mentionIdx}>
              <button
                type="button"
                className={i === mentionIdx ? 'on' : ''}
                onMouseDown={(e) => { e.preventDefault(); pickMention(m); }}
                onMouseEnter={() => setMentionIdx(i)}
              >
                <Avatar name={m.name} color={m.color} size={28} />
                <span>{m.name}</span>
                <em>@{m.name}</em>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="composer">
        {recMs === null && emojiOpen && (
          <div className="emoji-pop">
            {EMOJIS.map((e) => (
              <button key={e} onClick={() => { setDraft((d) => d + e); input.current?.focus(); }}>{e}</button>
            ))}
          </div>
        )}

        {recMs === null && (
          <div className="attach-wrap">
            <button
              type="button"
              className={`icon-btn attach-btn ${attachOpen ? 'active' : ''}`}
              onClick={() => { setAttachOpen((v) => !v); setEmojiOpen(false); setTtlPop(false); }}
              title="Joindre"
              aria-label="Joindre un fichier"
            >
              <IconPaperclip size={20} />
            </button>
            {attachOpen && (
              <div className="attach-pop">
                <button type="button" onClick={() => pickImage(0.6)}>
                  <IconImage size={18} /><span>Photo · légère</span><em>0,6</em>
                </button>
                <button type="button" onClick={() => pickImage(0.82)}>
                  <IconImage size={18} /><span>Photo · équilibrée</span><em>0,82</em>
                </button>
                <button type="button" onClick={() => pickImage(0.95)}>
                  <IconImage size={18} /><span>Photo · qualité max</span><em>0,95</em>
                </button>
                <button type="button" onClick={() => pickImage(null)}>
                  <IconImage size={18} /><span>Photo · originale</span><em>∞</em>
                </button>
                <button type="button" onClick={() => pickInput(vidInput)}>
                  <IconVideoFile size={18} /><span>Vidéo</span><em>{formatSize(MAX_FILE)}</em>
                </button>
                <button type="button" onClick={() => pickInput(fileInput)}>
                  <IconFile size={18} /><span>Fichier</span><em>{formatSize(MAX_FILE)}</em>
                </button>
                <button type="button" onClick={() => { setAttachOpen(false); setPollOpen(true); }}>
                  <IconPoll size={18} /><span>Sondage</span><em>2 à 6</em>
                </button>
              </div>
            )}
            <input ref={imgInput} type="file" accept="image/*" hidden onChange={(e) => onPicked(e, imgQuality.current)} />
            <input ref={vidInput} type="file" accept="video/*" hidden onChange={(e) => onPicked(e, null)} />
            <input ref={fileInput} type="file" hidden onChange={(e) => onPicked(e, null)} />
          </div>
        )}

        {recMs === null && (
          <IconButton label="Émojis" onClick={() => setEmojiOpen((v) => !v)} active={emojiOpen}><IconSmile size={21} /></IconButton>
        )}

        {recMs === null && (
          <div className="ttl-wrap">
            {ttlPop && (
              <div className="ttl-pop">
                {TTL_OPTIONS.map(([v, label, short]) => (
                  <button
                    key={String(v)}
                    type="button"
                    className={ttl === v ? 'on' : ''}
                    onClick={() => { setTtl(v); setTtlPop(false); }}
                    title={v ? 'Ce message disparaîtra pour tout le monde après ce délai' : 'Ce message reste dans la session'}
                  >
                    {label}
                    <em className="ttl-hint">{v ? short : '∞'}</em>
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              className={`icon-btn ttl-btn ${ttl ? 'active' : ''}`}
              onClick={() => setTtlPop((v) => !v)}
              title="Durée du message"
              aria-label="Durée du message"
            >
              <IconTimer size={20} />
              {ttl !== null && <b className="ttl-flag">{TTL_OPTIONS.find(([v]) => v === ttl)?.[2]}</b>}
            </button>
          </div>
        )}

        {recMs !== null ? (
          <div className="rec-bar">
            <span className="rec-dot" />
            <span className="rec-time">{formatTime(recMs / 1000)}</span>
            <span className="rec-hint">Message vocal…</span>
            <button type="button" className="rec-cancel" onClick={cancelRec} title="Annuler" aria-label="Annuler l’enregistrement">
              <IconTrash size={18} />
            </button>
            <button type="button" className="send ready" onClick={sendRec} title="Envoyer" aria-label="Envoyer le message vocal">
              <IconSend size={20} />
            </button>
          </div>
        ) : (
          <>
            <textarea
              ref={input}
              value={draft}
              rows={1}
              placeholder={reply ? t('chat.reply') : t('chat.placeholder')}
              onChange={(e) => {
                setDraft(e.target.value);
                setMentionCaret(e.target.selectionStart);
                p.onTyping();
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
              }}
              onKeyDown={(e) => {
                if (mention.list.length) {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx((i) => (i + 1) % mention.list.length); return; }
                  if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIdx((i) => (i - 1 + mention.list.length) % mention.list.length); return; }
                  if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickMention(mention.list[mentionIdx]); return; }
                  if (e.key === 'Escape') { e.preventDefault(); setMentionCaret(-1); return; }
                }
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
                if (e.key === 'Escape' && reply) setReply(null);
              }}
              onClick={(e) => setMentionCaret((e.target as HTMLTextAreaElement).selectionStart)}
              onKeyUp={(e) => { if (!['ArrowUp', 'ArrowDown', 'Enter', 'Tab', 'Escape'].includes(e.key)) setMentionCaret((e.target as HTMLTextAreaElement).selectionStart); }}
              onPaste={onPaste}
            />
            {draft.trim() ? (
              <button className="send ready" onClick={send} title="Envoyer" aria-label="Envoyer"><IconSend size={20} /></button>
            ) : (
              <button className="send" onClick={startRec} title="Message vocal" aria-label="Enregistrer un message vocal">
                <IconMic size={21} />
              </button>
            )}
          </>
        )}
      </div>
      </div>

      {showJump && (
        <button
          type="button"
          className={`jump-bottom ${unread ? 'has-unread' : ''}`}
          onClick={() => {
            const el = scroller.current;
            if (el) el.scrollTop = el.scrollHeight;
            seenTs.current = Date.now();
            setShowJump(false);
          }}
          aria-label={unread ? `${unread} nouveau${unread > 1 ? 'x' : ''} message${unread > 1 ? 's' : ''}` : 'Aller au dernier message'}
        >
          <IconArrowDown size={unread ? 16 : 18} />
          {unread > 0 && <b>{unread > 99 ? '99+' : unread}</b>}
        </button>
      )}

      {pollOpen && (
        <PollBuilder
          onClose={() => setPollOpen(false)}
          onCreate={(cmd) => { p.onSend(cmd, reply, ttl); setReply(null); setPollOpen(false); }}
        />
      )}

      {editing && (
        <EditModal
          initial={editing.text}
          onClose={() => setEditing(null)}
          onSave={(t) => { p.onEdit(editing.m, t); setEditing(null); }}
        />
      )}

      {rootMsg && (
        <Modal title={t('thread.title')} onClose={() => setThreadRoot(null)} width={460}>
          <div className="thread-root">
            <span className="thread-label">Message d’origine</span>
            <p>{(() => { const e = p.open(rootMsg); return e?.text || (e?.poll ? '📊 ' + e.poll.q : e?.file ? e.file.name : e?.audio ? 'Message vocal' : '…'); })()}</p>
          </div>
          <div className="thread-list">
            {(threads[rootMsg.id] || []).map(({ m, env }) => (
              <div key={m.id} className="thread-item">
                <strong style={{ color: colorOf(m.from) }}>{nameOf(m.from)}</strong>
                <span>{env?.text || '…'}</span>
                <time>{timeOf(m.ts)}</time>
              </div>
            ))}
          </div>
          <div className="modal-actions">
            <button className="btn ghost" onClick={() => setThreadRoot(null)}>{t('common.close')}</button>
            <button className="btn primary" onClick={() => { const e = p.open(rootMsg); startReply(rootMsg, e?.text || e?.poll?.q || ''); setThreadRoot(null); }}>{t('chat.replyTo')}</button>
          </div>
        </Modal>
      )}

      {preview && (
        <div className="lightbox" onClick={() => setPreview(null)} role="dialog" aria-label={preview.name}>
          <img src={preview.url} alt={preview.name} />
          <button type="button" className="lightbox-close" onClick={() => setPreview(null)} aria-label="Fermer">
            <IconX size={20} />
          </button>
          <a className="lightbox-dl" href={preview.url} download={preview.name} onClick={(e) => e.stopPropagation()}>
            Télécharger
          </a>
        </div>
      )}
    </section>
  );
}

/** Vignette de partage d'écran : la vidéo est muette (le son passe par l'appel). */
export function ShareTile({ stream, name, onStop, onClose, local }: {
  stream: MediaStream; name: string; onStop?: () => void; onClose: () => void; local?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const [mini, setMini] = useState(false);
  const [full, setFull] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    el.play().catch(() => {});
    return () => { el.srcObject = null; };
  }, [stream]);

  // Échap quitte le plein écran, sans fermer le partage.
  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFull(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [full]);

  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const el = box.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    el.setPointerCapture(e.pointerId);
    el.classList.add('dragging');
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current || full) return;
    const el = box.current;
    const w = el?.offsetWidth || 400;
    const h = el?.offsetHeight || 260;
    const x = Math.min(Math.max(8, e.clientX - drag.current.dx), Math.max(8, window.innerWidth - w - 8));
    const y = Math.min(Math.max(8, e.clientY - drag.current.dy), Math.max(8, window.innerHeight - h - 8));
    setPos({ x, y });
  };
  const onUp = (e: React.PointerEvent) => {
    if (!drag.current) return;
    drag.current = null;
    box.current?.classList.remove('dragging');
    try { box.current?.releasePointerCapture(e.pointerId); } catch { /* déjà relâché */ }
  };

  const geom = full ? undefined : pos ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' } : undefined;
  const label = local ? 'Votre écran' : `${name} partage son écran`;

  if (mini) {
    return (
      <button className="share-pill" onClick={() => setMini(false)} title="Réafficher le partage">
        <span className="share-chip-dot" />
        <IconScreenShare size={15} />
        <span>{local ? 'Votre partage' : `Partage de ${name}`}</span>
      </button>
    );
  }

  return (
    <div
      className={`share-tile ${full ? 'full' : ''}`}
      ref={box}
      style={geom}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      title={full ? undefined : 'Glissez pour déplacer'}
    >
      <video ref={ref} autoPlay playsInline muted onDoubleClick={() => setFull((f) => !f)} />
      <div className="share-bar">
        <span className="share-label"><span className="share-chip-dot" />{label}</span>
        <span className="share-ctrl">
          <button type="button" className="sc-btn" onClick={() => setFull((f) => !f)} title={full ? 'Réduire (Échap)' : 'Plein écran'} aria-label={full ? 'Réduire' : 'Plein écran'}>
            {full ? <IconMinimize size={15} /> : <IconMaximize size={15} />}
          </button>
          <button type="button" className="sc-btn" onClick={() => setMini(true)} title="Masquer (le partage continue)" aria-label="Masquer">
            <IconEyeOff size={15} />
          </button>
          {local ? (
            <button type="button" className="sc-btn danger" onClick={onStop || onClose} title="Arrêter le partage" aria-label="Arrêter le partage">
              <IconX size={15} />
            </button>
          ) : (
            <button type="button" className="sc-btn danger" onClick={onClose} title="Fermer : ne plus voir ni entendre ce partage" aria-label="Fermer">
              <IconX size={15} />
            </button>
          )}
        </span>
      </div>
    </div>
  );
}

/** Liens cliquables et mentions @pseudo. Votre propre pseudo est mis en évidence. */
function linkify(text: string, me: string | undefined, names: string[]): ReactNode[] {
  const meLow = (me || '').trim().toLowerCase();
  const mention = mentionPattern(names);
  // Découpe : liens d'abord, puis mentions connues (noms complets, espaces compris).
  const parts = text.split(/(https?:\/\/[^\s<>"']+)/gi);
  const out: ReactNode[] = [];
  let k = 0;
  for (const part of parts) {
    if (/^https?:\/\//i.test(part)) {
      out.push(<a key={k++} href={part} target="_blank" rel="noopener noreferrer nofollow" onClick={(e) => e.stopPropagation()}>{part}</a>);
      continue;
    }
    if (!mention) { out.push(part); continue; }
    const re = new RegExp(mention.source, 'giu');
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(part)) !== null) {
      if (m.index > last) out.push(part.slice(last, m.index));
      const label = m[0];
      const mine = meLow && label.slice(1).toLowerCase() === meLow;
      out.push(<span key={k++} className={mine ? 'mention mention-me' : 'mention'}>{label}</span>);
      last = m.index + label.length;
    }
    if (last < part.length) out.push(part.slice(last));
  }
  return out;
}

const COLORS = ['#2f8bff', '#22d3ee', '#a78bfa', '#34d399', '#fb923c', '#f472b6', '#facc15', '#60a5fa'];

/** Décompte exact et lisible : M:SS au-dessus d'une minute, sinon N s. */
function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  if (total >= 3600) {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    return m > 0 ? `${h} h ${m} min` : `${h} h`;
  }
  if (total >= 60) {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  return `${total} s`;
}
