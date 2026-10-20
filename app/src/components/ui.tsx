import React from 'react';
import { AVATAR_COLORS, initials } from '../lib/format';
import { IconX } from './Icons';

export function Avatar({ name, color = 0, avatar, size = 46, online, muted, className = '' }: {
  name: string; color?: number; avatar?: string | null; size?: number; online?: boolean; muted?: boolean; className?: string;
}) {
  const [a, b] = AVATAR_COLORS[(color || 0) % AVATAR_COLORS.length];
  return (
    <div className={`avatar ${className}`} style={{ width: size, height: size, background: `linear-gradient(150deg, ${a}, ${b})` }}>
      {avatar ? (
        <img src={avatar} alt="" />
      ) : (
        <span style={{ fontSize: Math.round(size * 0.38) }}>
          {/^Invité\s+(\d+)$/i.test(name) ? name.replace(/^Invité\s+/i, '') : initials(name)}
        </span>
      )}
      {online !== undefined && <i className={`dot ${online ? 'on' : ''}`} />}
      {muted && <i className="muted-badge" />}
    </div>
  );
}

export function IconButton({ children, label, onClick, active, className = '', title }: {
  children: React.ReactNode; label?: string; onClick?: (e: React.MouseEvent) => void; active?: boolean; className?: string; title?: string;
}) {
  return (
    <button type="button" className={`icon-btn ${active ? 'active' : ''} ${className}`} onClick={onClick} aria-label={label} title={title || label}>
      {children}
    </button>
  );
}

export function Modal({ title, children, onClose, width = 470, footer }: {
  title: string; children: React.ReactNode; onClose: () => void; width?: number; footer?: React.ReactNode;
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: width }}>
        <header>
          <h3>{title}</h3>
          <IconButton label="Fermer" onClick={onClose}><IconX size={18} /></IconButton>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </div>
    </div>
  );
}

export function Field({ label, value, onChange, type = 'text', placeholder, autoFocus, hint, maxLength, onEnter }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
  autoFocus?: boolean; hint?: string; maxLength?: number; onEnter?: () => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type} value={value} placeholder={placeholder} autoFocus={autoFocus} maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) onEnter(); }}
        autoComplete={type === 'password' ? 'current-password' : 'off'}
        spellCheck={false}
      />
      {hint && <em>{hint}</em>}
    </label>
  );
}

export function Empty({ title, text, icon }: { title: string; text?: string; icon?: React.ReactNode }) {
  return (
    <div className="empty">
      {icon && <div className="empty-icon">{icon}</div>}
      <h3>{title}</h3>
      {text && <p>{text}</p>}
    </div>
  );
}
