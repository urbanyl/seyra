import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { IconCheck, IconCopy, IconEye, IconLock, IconShield, IconWarning } from './icons';

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(area);
    return copied;
  } catch {
    return false;
  }
}

type CopyButtonProps = {
  text: string;
  label?: string;
  copiedLabel?: string;
  iconOnly?: boolean;
  className?: string;
};

export function CopyButton({
  text,
  label = 'Copier',
  copiedLabel = 'Copié',
  iconOnly = false,
  className = '',
}: CopyButtonProps) {
  const [state, setState] = useState<'idle' | 'done' | 'fail'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const click = async () => {
    const copied = await copyText(text);
    setState(copied ? 'done' : 'fail');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), 1800);
  };

  const current = state === 'done' ? copiedLabel : state === 'fail' ? 'Copie impossible' : label;
  const classes = ['w-btn', 'small', 'ghost', iconOnly ? 'w-icon-btn' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classes}
      onClick={click}
      title={current}
      aria-label={current}
    >
      {state === 'done' ? <IconCheck size={iconOnly ? 17 : 15} /> : <IconCopy size={iconOnly ? 17 : 15} />}
      {!iconOnly && <span>{current}</span>}
    </button>
  );
}

export type NoticeTone = 'info' | 'warn' | 'danger' | 'success';

const NOTICE_ICONS: Record<NoticeTone, ReactNode> = {
  info: <IconShield size={17} />,
  warn: <IconWarning size={17} />,
  danger: <IconWarning size={17} />,
  success: <IconCheck size={17} />,
};

export function Notice({
  tone = 'info',
  title,
  icon,
  children,
}: {
  tone?: NoticeTone;
  title?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`w-notice ${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <span className="w-notice-icon">{icon ?? NOTICE_ICONS[tone]}</span>
      <div className="w-notice-body">
        {title && <strong>{title}</strong>}
        {children}
      </div>
    </div>
  );
}

export function SafetyNotes() {
  return (
    <section className="w-safety" aria-label="Avertissements de sécurité">
      <div className="w-safety-row">
        <span className="w-safety-icon">
          <IconLock size={17} />
        </span>
        <p>
          <strong>Mot de passe perdu ou phrase perdue = fonds perdus.</strong> Aucune récupération
          serveur.
        </p>
      </div>
      <div className="w-safety-row">
        <span className="w-safety-icon">
          <IconEye size={17} />
        </span>
        <p>
          <strong>Les RPC publics voient ton adresse.</strong> Le solde et les transactions passent
          par un nœud public.
        </p>
      </div>
    </section>
  );
}

export function TechDetails({ text }: { text: string }) {
  return (
    <details className="w-tech">
      <summary>Détail technique</summary>
      <code>{text}</code>
    </details>
  );
}
