import type { VoiceState } from '../lib/voice';
import { IconHeadset, IconMic, IconMicOff, IconPhoneOff } from './Icons';
import { Avatar, IconButton } from './ui';

export default function VoiceDock({ state, onMute, onDeafen, onLeave }: {
  state: VoiceState;
  onMute: () => void;
  onDeafen: () => void;
  onLeave: () => void;
}) {
  if (!state.active) return null;
  return (
    <div className="voice-dock">
      <div className="voice-top">
        <span className="voice-live"><i /> En communication</span>
        <strong>{state.label}</strong>
      </div>
      {state.error && <p className="voice-error">{state.error}</p>}
      <div className="voice-peers">
        <div className={`vpeer ${state.muted ? 'muted' : ''}`}>
          <Avatar name="Vous" color={0} size={30} />
          <span>Vous</span>
          {state.muted ? <IconMicOff size={13} /> : <IconMic size={13} />}
        </div>
        {state.peers.map((p) => (
          <div key={p.id} className={`vpeer ${p.speaking ? 'speaking' : ''}`}>
            <Avatar name={p.name} color={1} size={30} />
            <span>{p.name}</span>
          </div>
        ))}
        {state.peers.length === 0 && <span className="voice-wait">En attente de participants…</span>}
      </div>
      <div className="voice-controls">
        <IconButton label={state.muted ? 'Réactiver le micro' : 'Couper le micro'} onClick={onMute} active={state.muted}>
          {state.muted ? <IconMicOff size={19} /> : <IconMic size={19} />}
        </IconButton>
        <IconButton label={state.deafened ? 'Réactiver le son' : 'Couper le son'} onClick={onDeafen} active={state.deafened}>
          <IconHeadset size={19} />
        </IconButton>
        <button className="hangup" onClick={onLeave} title="Quitter l'appel"><IconPhoneOff size={19} /></button>
      </div>
    </div>
  );
}
