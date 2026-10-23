import { useEffect, useRef, useState } from 'react';
import { LANGS, setLang, useLang, type Lang } from '../lib/i18n';
import { IconCheck, IconChevron } from './Icons';

/** Sélecteur de langue : drapeau + code, liste déroulante accessible au clavier. */
export default function LangMenu({ compact = false }: { compact?: boolean }) {
  const lang = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = LANGS.find((l) => l.id === lang) || LANGS[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const pick = (id: Lang) => { setLang(id); setOpen(false); };

  return (
    <div className="lang" ref={ref}>
      <button
        type="button"
        className="lang-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Language: ${active.name}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flag" aria-hidden="true">{active.flag}</span>
        {!compact && <span className="lang-code">{active.label}</span>}
        <IconChevron size={13} />
      </button>
      {open && (
        <ul className="lang-list" role="listbox" aria-label="Language">
          {LANGS.map((l) => (
            <li key={l.id} role="option" aria-selected={l.id === lang}>
              <button type="button" onClick={() => pick(l.id)} className={l.id === lang ? 'on' : ''}>
                <span className="flag" aria-hidden="true">{l.flag}</span>
                <span>{l.name}</span>
                {l.id === lang && <IconCheck size={15} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
