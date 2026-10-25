import { useState } from 'react';
import { CopyButton, Notice } from './ui';
import { IconEye, IconEyeOff, IconKey, IconLock } from './icons';
import { useT } from '../../lib/i18n';

export default function SeedPanel({ mnemonic }: { mnemonic: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const words = mnemonic.split(' ');

  const toggle = () => {
    if (open) setVisible(false);
    setOpen(!open);
  };

  return (
    <section className="w-card" aria-label={t('wl.seedAria')}>
      <div className="w-card-head">
        <div className="w-card-title">
          <IconKey size={17} />
          {t('wl.seedTitle')}
        </div>
        <button type="button" className="w-btn small ghost" onClick={toggle} aria-expanded={open}>
          {open ? t('wl.close') : t('wl.manage')}
        </button>
      </div>
      <p className="w-muted-text">
        {t('wl.seedMuted')}
      </p>

      {open && (
        <div className="w-seed">
          <Notice tone="danger" title={t('wl.seedDangerTitle')}>
            {t('wl.seedDangerText')}
          </Notice>

          {visible ? (
            <>
              <div className="w-words" aria-label={t('wl.phraseLabel')}>
                {words.map((word, index) => (
                  <div className="w-word" key={`${index}-${word}`}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    {word}
                  </div>
                ))}
              </div>
              <div className="w-btn-row">
                <CopyButton
                  text={mnemonic}
                  label={t('wl.copyPhrase')}
                  copiedLabel={t('wl.phraseCopied')}
                />
                <button type="button" className="w-btn small ghost" onClick={() => setVisible(false)}>
                  <IconEyeOff size={15} />
                  {t('wl.hide')}
                </button>
              </div>
              <p className="w-muted-text">
                {t('wl.exportHint')}
              </p>
            </>
          ) : (
            <>
              <div className="w-seed-locked">
                <IconLock size={20} />
                <span>{t('wl.seedLocked', { n: words.length })}</span>
              </div>
              <button
                type="button"
                className="w-btn primary full"
                onClick={() => setVisible(true)}
              >
                <IconEye size={16} />
                {t('wl.show')}
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
