import type { Participant } from '../lib/types';
import { IconCopy, IconLock, IconLogout, IconUsers, IconX } from './Icons';
import { Avatar } from './ui';
import { SeyraMark } from './Icons';

export default function SessionPanel({ code, participants, selfId, ownerId, onCopy, copied, onClose, onKick, onHide, open }: {
  code: string;
  participants: Participant[];
  selfId: string;
  ownerId: string | null;
  onCopy: () => void;
  copied: boolean;
  onClose: () => void;
  onKick: (p: Participant) => void;
  onHide: () => void;
  open: boolean;
}) {
  const isOwner = ownerId === selfId;
  return (
    <aside className={open ? 'side open' : 'side'}>
      <header className="side-head">
        <SeyraMark size={36} />
        <div>
          <strong>Seyra</strong>
          <span>session privée</span>
        </div>
        <button className="side-hide" onClick={onHide} aria-label="Fermer le panneau"><IconX size={20} /></button>
      </header>

      <div className="code-card">
        <span className="code-label"><IconLock size={12} /> Code de session</span>
        <code>{code}</code>
        <button className="copy" onClick={onCopy}>
          <IconCopy size={15} /> {copied ? 'Copié' : 'Copier le code'}
        </button>
        <em>Ce code est la clé. Toute personne qui l'a peut rejoindre.</em>
      </div>

      <div className="side-section">
        <span className="side-title"><IconUsers size={13} /> Participants — {participants.length}</span>
        <div className="participants">
          {participants.map((p) => (
            <div key={p.id} className="participant">
              <Avatar name={p.name} color={p.color} size={38} online />
              <div className="participant-name">
                <span>{p.id === selfId ? 'Vous' : p.name}</span>
                {p.id === ownerId && <em>propriétaire</em>}
              </div>
              {isOwner && p.id !== selfId && (
                <button className="kick" onClick={() => onKick(p)}>Retirer</button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="side-foot">
        <button className="btn danger wide" onClick={onClose}>
          <IconLogout size={16} /> Fermer la session
        </button>
        <p>Fermer efface tout pour tous les participants.</p>
      </div>
    </aside>
  );
}
