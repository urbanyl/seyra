import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, ClipboardEvent, RefObject } from 'react';
import { AudioRecorder, MAX_VOICE_MS, formatTime } from '../lib/audio';
import { MAX_FILE, formatSize } from '../lib/files';
import { activeMention, suggestMentions } from '../lib/format';
import { getLang, useT } from '../lib/i18n';
import type { Envelope, Msg, Participant, ReplyTo, VoiceClip } from '../lib/types';
import { buildPollCommand, isPollCommand, parsePoll, POLL_FORMAT } from '../lib/poll';
import { IconFile, IconImage, IconLock, IconMic, IconPaperclip, IconPoll, IconSend, IconSmile, IconTimer, IconTrash, IconVideoFile, IconX } from './Icons';
import { Avatar, IconButton, Modal } from './ui';
import VoiceType from './VoiceType';

type Props = {
  participants: Participant[];
  selfId: string;
  reply: ReplyTo | null;
  onCancelReply: () => void;
  onSend: (text: string, reply: ReplyTo | null, ttl: number | null) => void;
  onSendFile: (file: File, compress: number | null, reply: ReplyTo | null, ttl: number | null) => void;
  onSendVoice: (clip: VoiceClip, reply: ReplyTo | null, ttl: number | null) => void;
  onWhisper: (text: string, to: string) => void;
  onNotify: (text: string) => void;
  onTyping: () => void;
  onSent: () => void;
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

const EMOJIS = ['😀', '😂', '😍', '🥳', '😎', '🤔', '👍', '🙏', '🔥', '💙', '✨', '🎧', '📌', '✅'];
const TTL_OPTIONS: [number | null, string, string][] = [
  [null, 'ttl.perm', ''],
  [30, 'ttl.s30', '30 s'],
  [60, 'ttl.m1', '1 min'],
  [300, 'ttl.m5', '5 min'],
  [900, 'ttl.m15', '15 min'],
  [3600, 'ttl.h1', '1 h'],
];

export default function Composer(p: Props) {
  const t = useT();
  // Champ non contrôlé : une frappe ne déclenche aucun rendu React.
  const [hasText, setHasText] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [ttl, setTtl] = useState<number | null>(null);
  const [ttlPop, setTtlPop] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  /** Chuchotement : destinataire choisi, vide = message normal. */
  const [whisperTo, setWhisperTo] = useState('');
  // Mentions : liste de suggestions pendant la saisie d'un « @ ».
  const [mentionCaret, setMentionCaret] = useState(-1);
  const [mentionIdx, setMentionIdx] = useState(0);
  const [recMs, setRecMs] = useState<number | null>(null);
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 860px)').matches);

  const input = useRef<HTMLTextAreaElement>(null);
  const imgInput = useRef<HTMLInputElement>(null);
  const vidInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const imgQuality = useRef<number | null>(0.82);
  const recorder = useRef<AudioRecorder | null>(null);
  const recTimer = useRef<number | undefined>(undefined);
  const sizeRaf = useRef<number | undefined>(undefined);
  const lastHeight = useRef(0);
  const lastTyping = useRef(0);

  const mention = useMemo(() => {
    const at = mentionCaret >= 0 ? activeMention(input.current?.value ?? '', mentionCaret) : null;
    if (!at) return { at: null as null | { start: number; query: string }, list: [] as Participant[] };
    const others = p.participants.filter((x) => x.id !== p.selfId);
    return { at, list: suggestMentions(others, at.query) };
  }, [mentionCaret, p.participants, p.selfId]);
  useEffect(() => { setMentionIdx(0); }, [mention.at?.query]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 860px)');
    const onChange = () => setCompact(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    input.current?.focus();
  }, []);

  useEffect(() => {
    if (p.reply) input.current?.focus();
  }, [p.reply]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (!el.closest('.ttl-pop') && !el.closest('.ttl-btn')) setTtlPop(false);
      if (!el.closest('.attach-pop') && !el.closest('.attach-btn')) setAttachOpen(false);
      if (!el.closest('.emoji-pop') && !el.closest('.emoji-btn')) setEmojiOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  useEffect(() => {
    return () => {
      window.clearTimeout(recTimer.current);
      if (sizeRaf.current) cancelAnimationFrame(sizeRaf.current);
      recorder.current?.cancel();
      recorder.current = null;
    };
  }, []);

  /** Insère « @Nom » à la place de la saisie en cours, suivi d'un espace. */
  function pickMention(member: Participant | undefined) {
    if (!member || !mention.at) return;
    const cur = input.current?.value ?? '';
    const before = cur.slice(0, mention.at.start);
    const after = cur.slice(mentionCaret);
    const next = before + '@' + member.name + ' ' + after;
    const pos = (before + '@' + member.name + ' ').length;
    setText(next);
    setMentionCaret(-1);
    requestAnimationFrame(() => {
      const el = input.current;
      if (el) { el.focus(); el.setSelectionRange(pos, pos); }
    });
  }

  /** Notifie la saisie au plus une fois toutes les 2 s. */
  function notifyTyping() {
    const now = Date.now();
    if (now - lastTyping.current < 2000) return;
    lastTyping.current = now;
    p.onTyping();
  }

  /** Hauteur du textarea calculée hors du cycle de frappe, seulement si elle change. */
  function autosize(el: HTMLTextAreaElement) {
    if (sizeRaf.current) cancelAnimationFrame(sizeRaf.current);
    sizeRaf.current = requestAnimationFrame(() => {
      el.style.height = 'auto';
      const next = Math.min(el.scrollHeight, 140);
      if (next !== lastHeight.current) {
        lastHeight.current = next;
        el.style.height = next + 'px';
      } else {
        el.style.height = lastHeight.current + 'px';
      }
    });
  }

  /** Écrit dans le champ sans passer par l'état React. */
  function setText(next: string) {
    const el = input.current;
    if (!el) return;
    el.value = next;
    const filled = next.trim().length > 0;
    if (filled !== hasText) setHasText(filled);
    setMentionCaret(-1);
    autosize(el);
    el.focus();
  }

  function send() {
    const text = (input.current?.value ?? '').trim();
    if (!text) return;
    // Commande sondage mal écrite : on la refuse et on dit pourquoi, au lieu de l'envoyer en texte brut.
    if (isPollCommand(text) && !parsePoll(text)) {
      p.onNotify(`${t('poll.incomplete')} ${POLL_FORMAT}`);
      return;
    }
    if (whisperTo) p.onWhisper(text, whisperTo);
    else p.onSend(text, p.reply, ttl);
    setText('');
    setWhisperTo('');
    setTtl(null);
    setMentionCaret(-1);
    setEmojiOpen(false);
    setAttachOpen(false);
    setTtlPop(false);
    if (input.current) input.current.style.height = '';
    lastHeight.current = 0;
    p.onSent();
    input.current?.focus();
  }

  function toggleWhisper() {
    if (whisperTo) { setWhisperTo(''); return; }
    const other = p.participants.find((x) => x.id !== p.selfId);
    if (other) setWhisperTo(other.id);
  }

  /* ---------------- fichiers ---------------- */

  function pickImage(quality: number | null) {
    imgQuality.current = quality;
    setAttachOpen(false);
    imgInput.current?.click();
  }

  function pickInput(ref: RefObject<HTMLInputElement | null>) {
    setAttachOpen(false);
    ref.current?.click();
  }

  function onPicked(e: ChangeEvent<HTMLInputElement>, compress: number | null) {
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
    p.onSendFile(f, compress, p.reply, ttl);
    p.onSent();
  }

  /** Ctrl+V : une image (ou un fichier) copié dans le presse-papiers part directement. */
  function onPaste(e: ClipboardEvent<HTMLTextAreaElement>) {
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
      p.onSendFile(file, compress, p.reply, ttl);
      p.onSent();
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
    setAttachOpen(false);
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
    p.onSendVoice(clip, p.reply, ttl);
    p.onSent();
  }

  function cancelRec() {
    window.clearTimeout(recTimer.current);
    recorder.current?.cancel();
    recorder.current = null;
    setRecMs(null);
  }

  const voiceLang = getLang() === 'fr' ? 'fr-FR' : getLang() === 'zh' ? 'zh-CN' : getLang() === 'ru' ? 'ru-RU' : getLang() === 'ko' ? 'ko-KR' : 'en-US';

  return (
    <div className="composer-wrap">
      {whisperTo && (
        <div className="whisper-bar">
          <IconLock size={13} />
          <span>{t('whisper.to')} {p.participants.find((x) => x.id === whisperTo)?.name || ''}</span>
          <em>{t('whisper.hint')}</em>
          <button type="button" onClick={() => setWhisperTo('')} aria-label={t('common.cancel')}><IconX size={14} /></button>
        </div>
      )}
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
              <button key={e} onClick={() => setText((input.current?.value ?? '') + e)}>{e}</button>
            ))}
          </div>
        )}

        {recMs === null && !compact && (
          <>
            <button
              type="button"
              className={`icon-btn ${whisperTo ? 'active' : ''}`}
              title={t('whisper.toggle')}
              aria-label={t('whisper.toggle')}
              onClick={toggleWhisper}
            >
              <IconLock size={19} />
            </button>
            <VoiceType lang={voiceLang} onAppend={(txt) => setText((input.current?.value ?? '') + txt)} disabled={!!recMs} />
          </>
        )}

        {recMs === null && (
          <div className="attach-wrap">
            <button
              type="button"
              className={`icon-btn attach-btn ${attachOpen ? 'active' : ''}`}
              onClick={() => { setAttachOpen((v) => !v); setEmojiOpen(false); setTtlPop(false); }}
              title={t('act.attach')}
              aria-label={t('attach.file')}
            >
              <IconPaperclip size={20} />
            </button>
            {attachOpen && (
              <div className="attach-pop">
                <button type="button" onClick={() => pickImage(0.82)}>
                  <IconImage size={18} /><span>{t('attach.photo')}</span><em>0,82</em>
                </button>
                <button type="button" onClick={() => pickInput(vidInput)}>
                  <IconVideoFile size={18} /><span>{t('type.video')}</span><em>{formatSize(MAX_FILE)}</em>
                </button>
                <button type="button" onClick={() => pickInput(fileInput)}>
                  <IconFile size={18} /><span>{t('type.file')}</span><em>{formatSize(MAX_FILE)}</em>
                </button>
                <button type="button" onClick={() => { setAttachOpen(false); setPollOpen(true); }}>
                  <IconPoll size={18} /><span>{t('poll.new')}</span><em>2–6</em>
                </button>
                {compact && (
                  <>
                    <button type="button" onClick={() => { setAttachOpen(false); setEmojiOpen(true); }}>
                      <IconSmile size={18} /><span>Émojis</span>
                    </button>
                    <button type="button" className={whisperTo ? 'on' : ''} onClick={() => { toggleWhisper(); setAttachOpen(false); }}>
                      <IconLock size={18} /><span>{t('whisper.toggle')}</span>
                    </button>
                    <VoiceType lang={voiceLang} onAppend={(txt) => setText((input.current?.value ?? '') + txt)} disabled={!!recMs} />
                    {TTL_OPTIONS.map(([v, label, short]) => (
                      <button
                        key={String(v)}
                        type="button"
                        className={ttl === v ? 'on' : ''}
                        onClick={() => { setTtl(v); setAttachOpen(false); }}
                        title={v ? t('ttl.titleOn') : t('ttl.titleOff')}
                      >
                        <IconTimer size={18} /><span>{t(label)}</span><em>{v ? short : '∞'}</em>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
            <input ref={imgInput} type="file" accept="image/*" hidden onChange={(e) => onPicked(e, imgQuality.current)} />
            <input ref={vidInput} type="file" accept="video/*" hidden onChange={(e) => onPicked(e, null)} />
            <input ref={fileInput} type="file" hidden onChange={(e) => onPicked(e, null)} />
          </div>
        )}

        {recMs === null && !compact && (
          <IconButton className="emoji-btn" label="Émojis" onClick={() => setEmojiOpen((v) => !v)} active={emojiOpen}><IconSmile size={21} /></IconButton>
        )}

        {recMs === null && !compact && (
          <div className="ttl-wrap">
            {ttlPop && (
              <div className="ttl-pop">
                {TTL_OPTIONS.map(([v, label, short]) => (
                  <button
                    key={String(v)}
                    type="button"
                    className={ttl === v ? 'on' : ''}
                    onClick={() => { setTtl(v); setTtlPop(false); }}
                    title={v ? t('ttl.titleOn') : t('ttl.titleOff')}
                  >
                    {t(label)}
                    <em className="ttl-hint">{v ? short : '∞'}</em>
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              className={`icon-btn ttl-btn ${ttl ? 'active' : ''}`}
              onClick={() => setTtlPop((v) => !v)}
              title={t('ttl.duration')}
              aria-label={t('ttl.duration')}
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
            <span className="rec-hint">{t('rec.hint')}</span>
            <button type="button" className="rec-cancel" onClick={cancelRec} title="Annuler" aria-label="Annuler l’enregistrement">
              <IconTrash size={18} />
            </button>
            <button type="button" className="send ready" onClick={sendRec} title={t("chat.send")} aria-label={t("rec.send")}>
              <IconSend size={20} />
            </button>
          </div>
        ) : (
          <>
            <textarea
              ref={input}
              rows={1}
              placeholder={p.reply ? t('chat.reply') : t('chat.placeholder')}
              onChange={(e) => {
                // Aucun setState pour le texte : seulement l'état « vide / non vide »
                // et la mention en cours, qui change rarement.
                const el = e.currentTarget;
                const val = el.value;
                const filled = val.trim().length > 0;
                if (filled !== hasText) setHasText(filled);
                if (val.includes('@')) setMentionCaret(el.selectionStart);
                else if (mentionCaret !== -1) setMentionCaret(-1);
                notifyTyping();
                autosize(el);
              }}
              onKeyDown={(e) => {
                if (mention.list.length) {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx((i) => (i + 1) % mention.list.length); return; }
                  if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIdx((i) => (i - 1 + mention.list.length) % mention.list.length); return; }
                  if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickMention(mention.list[mentionIdx]); return; }
                  if (e.key === 'Escape') { e.preventDefault(); setMentionCaret(-1); return; }
                }
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
                if (e.key === 'Escape' && p.reply) p.onCancelReply();
              }}
              onClick={(e) => setMentionCaret((e.target as HTMLTextAreaElement).selectionStart)}
              onKeyUp={(e) => { if (!['ArrowUp', 'ArrowDown', 'Enter', 'Tab', 'Escape'].includes(e.key)) setMentionCaret((e.target as HTMLTextAreaElement).selectionStart); }}
              onPaste={onPaste}
            />
            {hasText ? (
              <button className="send ready" onClick={send} title={t("chat.send")} aria-label={t("chat.send")}>
                <IconSend size={20} />
                {compact && ttl !== null && <b className="ttl-flag">{TTL_OPTIONS.find(([v]) => v === ttl)?.[2]}</b>}
              </button>
            ) : (
              <button className="send" onClick={startRec} title={t("chat.voice")} aria-label={t("rec.start")}>
                <IconMic size={21} />
              </button>
            )}
          </>
        )}
      </div>

      {pollOpen && (
        <PollBuilder
          onClose={() => setPollOpen(false)}
          onCreate={(cmd) => { p.onSend(cmd, p.reply, ttl); setTtl(null); setPollOpen(false); p.onSent(); }}
        />
      )}
    </div>
  );
}
