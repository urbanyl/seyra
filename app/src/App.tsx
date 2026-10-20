import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ChatPane from './components/ChatPane';
import Landing from './components/Landing';
import SessionPanel from './components/SessionPanel';
import VoiceDock from './components/VoiceDock';
import { IconCopy, IconLock, IconX } from './components/Icons';
import { Modal } from './components/ui';
import { cryptoReady, deriveSession, newCode, normalizeCode, openMessage, sealMessage } from './lib/session';
import { rt } from './lib/rt';
import type { Msg, Notice, Participant, SessionInfo } from './lib/types';
import { voice, type VoiceState } from './lib/voice';

type Phase = 'landing' | 'session';

export default function App() {
  const [phase, setPhase] = useState<Phase>('landing');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [code, setCode] = useState('');
  const [key, setKey] = useState<Uint8Array | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [typing, setTyping] = useState<{ name: string; ts: number } | null>(null);
  const [connection, setConnection] = useState<'online' | 'offline' | 'connecting'>('connecting');
  const [vstate, setVstate] = useState<VoiceState>(voice.state);
  const [callInvite, setCallInvite] = useState<{ name: string } | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [askClose, setAskClose] = useState(false);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [askKick, setAskKick] = useState<Participant | null>(null);
  const [sideOpen, setSideOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState('');

  const pending = useRef<{ mode: 'open' | 'join'; key: Uint8Array; roomId: string; display: string } | null>(null);
  const stateRef = useRef<any>({});
  stateRef.current = { phase, session, participants, messages };
  const lastTyping = useRef(0);
  const typingTimer = useRef<number | undefined>(undefined);
  const inviteTimer = useRef<number | undefined>(undefined);
  const joinTimer = useRef<number | undefined>(undefined);

  const flash = useCallback((text: string) => {
    setToast(text);
    setTimeout(() => setToast(''), 3200);
  }, []);

  /* ---------------- lifecycle ---------------- */
  const wipe = useCallback(() => {
    setPhase('landing');
    setSession(null);
    setKey(null);
    setCode('');
    setParticipants([]);
    setMessages([]);
    setNotices([]);
    setTyping(null);
    setCallInvite(null);
    setShowCode(false);
    setBusy(false);
    setAskClose(false);
    setAskKick(null);
    setOwnerId(null);
    setSideOpen(false);
  }, []);

  useEffect(() => {
    const offStatus = rt.onStatus(setConnection);
    const off = rt.on((m) => {
      const cur = stateRef.current;
      switch (m.t) {
        case 'session:joined': {
          const p = pending.current;
          if (p) {
            setKey(p.key);
            setCode(p.display);
            if (p.mode === 'open') setShowCode(true);
            pending.current = null;
          }
          setSession({ roomId: m.roomId, selfId: m.selfId, selfName: m.selfName, createdAt: m.createdAt });
          setOwnerId(m.ownerId || null);
          setParticipants(m.participants || []);
          setMessages((prev) => {
            const map = new Map(prev.map((x) => [x.id, x]));
            for (const msg of m.messages || []) map.set(msg.id, msg);
            return [...map.values()].sort((a, b) => a.ts - b.ts);
          });
          voice.setMe(m.selfId);
          setPhase('session');
          setBusy(false);
          setConnection('online');
          break;
        }

        case 'session:error':
          pending.current = null;
          setBusy(false);
          setError(m.message || 'Session indisponible.');
          rt.close();
          break;

        case 'session:closed':
          if (cur.phase === 'session') {
            wipe();
            setNotice('La session a été fermée. Les messages ont été effacés.');
            voice.leave();
          }
          break;

        case 'peer:joined':
          setParticipants((prev) => prev.some((x) => x.id === m.participant.id) ? prev : [...prev, m.participant]);
          setNotices((prev) => [...prev, { id: 'n' + Date.now() + m.participant.id, text: `${m.participant.name} a rejoint la session`, ts: Date.now() }]);
          break;

        case 'peer:left':
          setParticipants((prev) => prev.filter((x) => x.id !== m.participant.id));
          setNotices((prev) => [...prev, {
            id: 'n' + Date.now() + m.participant.id,
            text: m.reason === 'kicked' ? `${m.participant.name} a été retiré de la session` : `${m.participant.name} a quitté la session`,
            ts: Date.now(),
          }]);
          break;

        case 'session:kicked':
          if (cur.phase === 'session') {
            wipe();
            setNotice('Le propriétaire vous a retiré de la session.');
            voice.leave();
          }
          break;

        case 'msg':
          setMessages((prev) => prev.some((x) => x.id === m.msg.id) ? prev : [...prev, m.msg]);
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
        rt.send({ t: 'join', roomId: cur.session.roomId });
      }
    });
    return offStatus;
  }, []);

  /* ---------------- actions ---------------- */
  const start = useCallback(async (display: string, mode: 'open' | 'join') => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await cryptoReady();
      const { key, roomId } = await deriveSession(display);
      pending.current = { mode, key, roomId, display };
      rt.connect();
      await rt.ready();
      rt.send({ t: mode, roomId });
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
      setError((e as Error).message || 'Impossible de créer la session.');
    }
  }, []);

  const create = useCallback(() => start(newCode(), 'open'), [start]);
  const join = useCallback((raw: string) => start(normalizeCode(raw), 'join'), [start]);

  const send = useCallback((text: string) => {
    const cur = stateRef.current;
    if (!cur.session || !key) return;
    const { cipher, nonce } = sealMessage(text, key);
    rt.send({ t: 'msg', cipher, nonce });
  }, [key]);

  const decrypt = useCallback((m: Msg) => (key ? openMessage(m.cipher, m.nonce, key) : null), [key]);

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
    voice.join('Appel de session');
    rt.send({ t: 'call:invite' });
  }, []);

  const joinCall = useCallback(() => {
    setCallInvite(null);
    voice.join('Appel de session');
  }, []);

  /* ---------------- view ---------------- */
  if (phase !== 'session' || !session) {
    return (
      <>
        <Landing onCreate={create} onJoin={join} busy={busy} error={error} notice={notice} />
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
        onHide={() => setSideOpen(false)}
        open={sideOpen}
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
          decrypt={decrypt}
          onSend={send}
          onTyping={signalTyping}
          typingName={typed}
          onCall={toggleCall}
          inVoice={vstate.active}
          callInvite={callInvite}
          onJoinCall={joinCall}
          onDismissCall={() => setCallInvite(null)}
          connection={connection}
        />
      </main>

      <VoiceDock
        state={vstate}
        onMute={() => voice.toggleMute()}
        onDeafen={() => voice.toggleDeafen()}
        onLeave={() => voice.leave()}
      />

      {showCode && (
        <Modal title="Session ouverte" onClose={() => setShowCode(false)} width={440}>
          <p className="muted">Partagez ce code. Il sert de clé de chiffrement : sans lui, les messages sont illisibles.</p>
          <div className="big-code">
            <code>{code}</code>
            <button className="btn ghost" onClick={copyCode}><IconCopy size={16} /> {copied ? 'Copié' : 'Copier'}</button>
          </div>
          <p className="hint-line"><IconLock size={13} /> Ne le partagez que par un canal de confiance.</p>
          <button className="btn primary wide" onClick={() => setShowCode(false)}>C'est parti</button>
        </Modal>
      )}

      {askKick && (
        <Modal title={`Retirer ${askKick.name} ?`} onClose={() => setAskKick(null)} width={420}>
          <p className="muted">Ce participant sera déconnecté et ne pourra plus rejoindre cette session.</p>
          <div className="modal-actions">
            <button className="btn ghost" onClick={() => setAskKick(null)}>Annuler</button>
            <button className="btn danger" onClick={() => kick(askKick)}>Retirer</button>
          </div>
        </Modal>
      )}

      {askClose && (
        <Modal title="Fermer la session ?" onClose={() => setAskClose(false)} width={420}>
          <p className="muted">Tous les messages seront définitivement effacés, pour vous et pour les autres participants.</p>
          <div className="modal-actions">
            <button className="btn ghost" onClick={() => setAskClose(false)}><IconX size={15} /> Annuler</button>
            <button className="btn danger" onClick={closeSession}>Fermer et effacer</button>
          </div>
        </Modal>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function beep() {
  try {
    const ctx = new AudioContext();
    const note = (t: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 760;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.1, ctx.currentTime + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.32);
    };
    note(0); note(0.38);
    setTimeout(() => ctx.close().catch(() => {}), 1400);
  } catch {}
}
