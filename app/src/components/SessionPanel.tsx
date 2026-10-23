import { useEffect, useState } from 'react';
import type { Participant } from '../lib/types';
import type { VoicePeer } from '../lib/voice';
import { IconCopy, IconGear, IconHeadset, IconLock, IconLogout, IconMicOff, IconPencil, IconUsers, IconX } from './Icons';
import { Avatar, IconButton } from './ui';
import { SeyraMark } from './Icons';
import { useT } from '../lib/i18n';

/** Durée lisible depuis l'ouverture : 12 min, 1 h 05, 2 j 3 h. */
function elapsed(since: number, now: number) {
  const m = Math.max(0, Math.floor((now - since) / 60000));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ${String(m % 60).padStart(2, '0')}`;
  return `${Math.floor(h / 24)} j ${h % 24} h`;
}

export default function SessionPanel({
  code, participants, selfId, ownerId, onCopy, copied, onClose, onKick, onHide, open,
  onRename, voiceById, selfVoice, onInvite, onSettings, since, messageCount, fileCount, inviteLink, onHome, pending, onAdmit, onDeny, onMakeOwner,
}: {
  pending: { id: string; name: string }[];
  onAdmit: (id: string) => void;
  onDeny: (id: string) => void;
  onMakeOwner: (id: string) => void;
  onHome: () => void;
  onInvite: () => void;
  onSettings: () => void;
  since: number;
  messageCount: number;
  fileCount: number;
  inviteLink: string;
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
  onRename: () => void;
  voiceById: Record<string, VoicePeer>;
  selfVoice: { muted: boolean; deaf: boolean } | null;
}) {
  const t = useT();
  const isOwner = ownerId === selfId;
  const [now, setNow] = useState(() => Date.now());
  const [linkCopied, setLinkCopied] = useState(false);
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(t);
  }, []);
  const copyLink = () => {
    navigator.clipboard?.writeText(inviteLink).then(() => {
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 1800);
    }).catch(() => {});
  };
  return (
    <aside className={open ? 'side open' : 'side'}>
      <header className="side-head">
        <button className="side-brand" onClick={onHome} title={t('nav.home')}>
          <SeyraMark size={36} />
          <div>
            <strong>Seyra</strong>
            <span>{t('app.brandSub')}</span>
          </div>
        </button>
        <button className="side-hide" onClick={onHide} aria-label={t('common.close')}><IconX size={20} /></button>
      </header>

      <div className="side-quick">
        <button className="side-action" onClick={onSettings}><IconGear size={16} /> {t('app.appearance')}</button>
        <button className="side-action" onClick={onInvite}><IconUsers size={16} /> {t('app.invite')}</button>
      </div>

      <div className="side-stats" aria-label="Statistiques de la session">
        <div><strong>{elapsed(since, now)}</strong><span>{t('app.duration')}</span></div>
        <div><strong>{messageCount}</strong><span>{t('app.messages')}</span></div>
        <div><strong>{fileCount}</strong><span>{t('app.files')}</span></div>
      </div>

      <div className="code-card">
        <span className="code-label"><IconLock size={12} /> {t('app.code')}</span>
        <code>{code}</code>
        <div className="copy-row">
          <button className="copy" onClick={onCopy}>
            <IconCopy size={15} /> {copied ? t('app.copied') : t('app.copyCode')}
          </button>
          <button className="copy" onClick={copyLink}>
            <IconUsers size={15} /> {linkCopied ? t('app.linkCopied') : t('app.copyLink')}
          </button>
        </div>
        <em>{t('app.codeNote')}</em>
      </div>

      {isOwner && pending.length > 0 && (
        <div className="side-section pending-section">
          <span className="side-title">{t('wait.pending')} — {pending.length}</span>
          {pending.map((q) => (
            <div key={q.id} className="pending-item">
              <Avatar name={q.name} color={3} size={30} />
              <span>{q.name}</span>
              <button className="pending-admit" onClick={() => onAdmit(q.id)}>{t('wait.admit')}</button>
              <button className="pending-deny" onClick={() => onDeny(q.id)}>{t('wait.deny')}</button>
            </div>
          ))}
        </div>
      )}

      <div className="side-section">
        <span className="side-title"><IconUsers size={13} /> {t('app.participants')} — {participants.length}</span>
        <div className="participants">
          {participants.map((p) => {
            const isSelf = p.id === selfId;
            const v = isSelf ? selfVoice : voiceById[p.id];
            return (
              <div key={p.id} className="participant">
                <Avatar name={p.name} color={p.color} size={38} online />
                <div className="participant-name">
                  <span>{isSelf ? `${p.name} (${t('chat.you')})` : p.name}</span>
                  {p.id === ownerId && <em>{t('app.owner')}</em>}
                </div>
                {v && (
                  <span className="voice-flags">
                    {v.muted && <IconMicOff size={15} />}
                    {v.deaf && <IconHeadset size={15} />}
                  </span>
                )}
                {isSelf && (
                  <IconButton label="Changer de pseudo" onClick={onRename}><IconPencil size={16} /></IconButton>
                )}
                {isOwner && !isSelf && (
                  <button className="role-btn" onClick={() => onMakeOwner(p.id)}>{t('owner.make')}</button>
                )}
                {isOwner && !isSelf && (
                  <button className="kick" onClick={() => onKick(p)}>{t('app.remove')}</button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="side-foot">
        <button className="btn danger wide" onClick={onClose}>
          <IconLogout size={16} /> {t('app.closeSession')}
        </button>
        <p>{t('app.closeNote')}</p>
      </div>
    </aside>
  );
}
