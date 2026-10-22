import { useCallback, useEffect, useRef, useState } from 'react';
import type { VoiceState } from '../lib/voice';
import { IconChevron, IconHeadset, IconMic, IconMicOff, IconPhoneOff } from './Icons';
import { Avatar } from './ui';

const POS_KEY = 'seyra.voiceDock.pos';

export default function VoiceDock({ state, selfName, nameOf, onMute, onDeafen, onLeave }: {
  state: VoiceState;
  selfName: string;
  nameOf: (id: string) => string;
  onMute: () => void;
  onDeafen: () => void;
  onLeave: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const [hidden, setHidden] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(() => {
    try {
      const raw = localStorage.getItem(POS_KEY);
      if (!raw) return null;
      const p = JSON.parse(raw);
      if (typeof p?.x === 'number' && typeof p?.y === 'number') return p;
    } catch { /* position illisible */ }
    return null;
  });

  const apply = useCallback((next: { x: number; y: number }) => {
    const el = ref.current;
    const w = el?.offsetWidth || 300;
    const h = el?.offsetHeight || 180;
    const maxX = Math.max(8, window.innerWidth - w - 8);
    const maxY = Math.max(8, window.innerHeight - h - 8);
    const clamped = { x: Math.min(Math.max(8, next.x), maxX), y: Math.min(Math.max(8, next.y), maxY) };
    setPos(clamped);
    return clamped;
  }, []);

  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    el.setPointerCapture(e.pointerId);
    el.classList.add('dragging');
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    apply({ x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy });
  };

  const onUp = (e: React.PointerEvent) => {
    if (!drag.current) return;
    drag.current = null;
    ref.current?.classList.remove('dragging');
    try { ref.current?.releasePointerCapture(e.pointerId); } catch { /* déjà relâché */ }
    setPos((p) => {
      if (p) localStorage.setItem(POS_KEY, JSON.stringify(p));
      return p;
    });
  };

  useEffect(() => {
    const onResize = () => setPos((p) => (p ? apply(p) : p));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [apply]);

  if (!state.active) return null;

  const others = state.peers;
  const waiting = others.length === 0;
  const style = pos ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' } : undefined;

  if (hidden) {
    return (
      <button className="voice-pill" onClick={() => setHidden(false)} title="Réafficher l'appel">
        <span className="voice-pill-dot" /> {waiting ? 'Appel' : `${others.length + 1}`}
        {state.muted ? <IconMicOff size={15} /> : <IconMic size={15} />}
      </button>
    );
  }

  return (
    <div
      className="voice-dock"
      ref={ref}
      style={style}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <div className="voice-top" title="Glissez pour déplacer">
        <span className="voice-grip"><i /><i /><i /></span>
        <span className="voice-live"><i /> {waiting ? 'Appel démarré' : `En appel · ${others.length + 1} personnes`}</span>
        <button className="voice-min" onClick={() => setHidden(true)} title="Masquer la fenêtre d'appel" aria-label="Masquer"><IconChevron size={16} /></button>
      </div>
      {state.error && <p className="voice-error">{state.error}</p>}

      <div className="voice-peers">
        <div className={`vpeer ${state.selfSpeaking ? 'speaking' : ''}`}>
          <Avatar name={selfName} color={0} size={30} />
          <span>{selfName} (vous)</span>
          {state.muted && <IconMicOff size={14} />}
          {state.deafened && <IconHeadset size={14} />}
        </div>
        {others.map((p) => (
          <div key={p.id} className={`vpeer ${p.speaking ? 'speaking' : ''}`}>
            <Avatar name={nameOf(p.id)} color={1} size={30} />
            <span>{nameOf(p.id)}</span>
            {!p.connected && <em className="vstatus">connexion…</em>}
            {p.muted && <IconMicOff size={14} />}
            {p.deaf && <IconHeadset size={14} />}
          </div>
        ))}
        {waiting && <span className="voice-wait">En attente d'un autre participant…</span>}
      </div>

      <div className="voice-controls">
        <button
          className={`vbtn ${state.muted ? 'off' : ''}`}
          onClick={onMute}
          aria-pressed={state.muted}
          title={state.muted ? 'Réactiver le micro' : 'Couper le micro'}
        >
          {state.muted ? <IconMicOff size={20} /> : <IconMic size={20} />}
          <span>{state.muted ? 'Micro coupé' : 'Micro'}</span>
        </button>
        <button
          className={`vbtn ${state.deafened ? 'off' : ''}`}
          onClick={onDeafen}
          aria-pressed={state.deafened}
          title={state.deafened ? 'Réactiver le casque' : 'Couper le casque'}
        >
          <IconHeadset size={20} />
          <span>{state.deafened ? 'Casque coupé' : 'Casque'}</span>
        </button>
        <button className="hangup" onClick={onLeave} title="Quitter l'appel">
          <IconPhoneOff size={20} />
        </button>
      </div>
    </div>
  );
}
