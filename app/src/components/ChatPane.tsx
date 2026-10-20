import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { dayLabel, timeOf } from '../lib/format';
import type { Msg, Notice, Participant } from '../lib/types';
import { IconLock, IconPhone, IconSend, IconSmile, IconUsers, IconX } from './Icons';
import { Avatar, Empty, IconButton } from './ui';

type Props = {
  code: string;
  messages: Msg[];
  notices: Notice[];
  participants: Participant[];
  selfId: string;
  decrypt: (m: Msg) => string | null;
  onSend: (text: string) => void;
  onTyping: () => void;
  typingName?: string;
  onCall: () => void;
  inVoice: boolean;
  callInvite: { name: string } | null;
  onJoinCall: () => void;
  onDismissCall: () => void;
  connection: 'online' | 'offline' | 'connecting';
  onOpenSide: () => void;
};

const EMOJIS = ['😀', '😂', '😍', '🥳', '😎', '🤔', '👍', '🙏', '🔥', '💙', '✨', '🎧', '📌', '✅'];

export default function ChatPane(p: Props) {
  const [draft, setDraft] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const atBottom = useRef(true);

  const byId = useMemo(() => Object.fromEntries(p.participants.map((x) => [x.id, x])), [p.participants]);
  const nameOf = (id: string) => (id === p.selfId ? 'Vous' : byId[id]?.name || 'Invité');

  const timeline = useMemo(() => {
    const items = [
      ...p.messages.map((m) => ({ kind: 'msg' as const, ts: m.ts, msg: m })),
      ...p.notices.map((n) => ({ kind: 'sys' as const, ts: n.ts, notice: n })),
    ];
    items.sort((a, b) => a.ts - b.ts);
    return items;
  }, [p.messages, p.notices]);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return timeline;
    return timeline.filter((item) => {
      if (item.kind === 'sys') return item.notice.text.toLowerCase().includes(needle);
      return (p.decrypt(item.msg) || '').toLowerCase().includes(needle);
    });
  }, [timeline, query, p.decrypt]);

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
  }, []);

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }

  function send() {
    const text = draft.trim();
    if (!text) return;
    p.onSend(text);
    setDraft('');
    setEmojiOpen(false);
    if (input.current) input.current.style.height = 'auto';
    atBottom.current = true;
    input.current?.focus();
  }

  return (
    <section className="pane">
      <header className="pane-head">
        <div className="stack">
          {p.participants.slice(0, 3).map((x) => (
            <Avatar key={x.id} name={x.name} color={x.color} size={34} />
          ))}
        </div>
        <div className="pane-title">
          <h2>Session privée</h2>
          <p>
            <IconUsers size={12} /> {p.participants.length} connecté{p.participants.length > 1 ? 's' : ''}
            <i className={`live ${p.connection}`} /> {p.connection === 'online' ? 'en ligne' : p.connection === 'connecting' ? 'connexion…' : 'hors ligne'}
          </p>
        </div>
        <div className="pane-actions">
          <IconButton label="Participants" className="mobile-only" onClick={p.onOpenSide}><IconUsers size={19} /></IconButton>
          <IconButton label="Rechercher" active={searchOpen} onClick={() => { setSearchOpen((v) => !v); setQuery(''); }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.2 4.2" />
            </svg>
          </IconButton>
          <button className={`call-btn ${p.inVoice ? 'on' : ''}`} onClick={p.onCall} title={p.inVoice ? "Quitter l'appel" : 'Appel vocal'}>
            <IconPhone size={18} />
          </button>
        </div>
      </header>

      {searchOpen && (
        <div className="search chat-search">
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher dans la session" />
          {query && <em>{shown.length} résultat(s)</em>}
          <button onClick={() => { setSearchOpen(false); setQuery(''); }}><IconX size={15} /></button>
        </div>
      )}

      {p.callInvite && !p.inVoice && (
        <div className="call-banner">
          <IconPhone size={15} />
          <span>{p.callInvite.name} a lancé un appel vocal</span>
          <button className="btn primary small" onClick={p.onJoinCall}>Rejoindre</button>
          <button className="btn ghost small" onClick={p.onDismissCall}>Ignorer</button>
        </div>
      )}

      <div className="messages" ref={scroller} onScroll={onScroll}>
        <div className="e2e-note">
          <IconLock size={13} /> Chiffré sur cet appareil avec la clé dérivée du code. Le serveur ne voit rien.
        </div>

        {shown.length === 0 && (
          <Empty
            title={query ? 'Aucun résultat' : 'Session ouverte'}
            text={query ? 'Essayez un autre mot.' : 'Partagez le code pour inviter quelqu’un. Tout disparaît quand la session se ferme.'}
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
          const text = p.decrypt(m);
          const mine = m.from === p.selfId;
          const author = byId[m.from];
          const grouped = !!(prev && prev.kind === 'msg' && prev.msg.from === m.from && m.ts - prev.msg.ts < 5 * 60000 && !showDay);

          return (
            <div key={m.id}>
              {showDay && <div className="day-sep"><span>{dayLabel(item.ts)}</span></div>}
              <div className={`msg ${mine ? 'out' : 'in'} ${grouped ? 'grouped' : ''}`}>
                {!mine && !grouped && (
                  <span className="msg-author" style={{ color: COLORS[(author?.color || 0) % COLORS.length] }}>{nameOf(m.from)}</span>
                )}
                <div className="bubble">
                  {text === null ? (
                    <span className="locked"><IconLock size={13} /> illisible</span>
                  ) : m.kind === 'call' ? (
                    <span className="call-log"><IconPhone size={14} /> {text}</span>
                  ) : (
                    <span className="bubble-text">{text}</span>
                  )}
                  <time>{timeOf(m.ts)}</time>
                </div>
              </div>
            </div>
          );
        })}

        {p.typingName && <div className="typing"><span /><span /><span /> {p.typingName} écrit…</div>}
      </div>

      <div className="composer">
        {emojiOpen && (
          <div className="emoji-pop">
            {EMOJIS.map((e) => (
              <button key={e} onClick={() => { setDraft((d) => d + e); input.current?.focus(); }}>{e}</button>
            ))}
          </div>
        )}
        <IconButton label="Émojis" onClick={() => setEmojiOpen((v) => !v)} active={emojiOpen}><IconSmile size={21} /></IconButton>
        <textarea
          ref={input}
          value={draft}
          rows={1}
          placeholder="Écrivez un message chiffré…"
          onChange={(e) => {
            setDraft(e.target.value);
            p.onTyping();
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
          }}
        />
        <button className={`send ${draft.trim() ? 'ready' : ''}`} onClick={send} title="Envoyer"><IconSend size={20} /></button>
      </div>
    </section>
  );
}

const COLORS = ['#2f8bff', '#22d3ee', '#a78bfa', '#34d399', '#fb923c', '#f472b6', '#facc15', '#60a5fa'];
