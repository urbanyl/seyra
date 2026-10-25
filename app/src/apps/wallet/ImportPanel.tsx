import { useState } from 'react';
import { inspectPhrase } from './mnemonic';
import type { PhraseCheck } from './mnemonic';
import { Notice } from './ui';
import { IconImport } from './icons';
import { useT } from '../../lib/i18n';

type Props = {
  onReplace: (phrase: string) => void;
  defaultOpen?: boolean;
};

export default function ImportPanel({ onReplace, defaultOpen = false }: Props) {
  const t = useT();
  const [open, setOpen] = useState(defaultOpen);
  const [text, setText] = useState('');
  const [check, setCheck] = useState<PhraseCheck | null>(null);
  const [done, setDone] = useState(false);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  const reset = () => {
    setText('');
    setCheck(null);
  };

  const apply = () => {
    if (!check || !check.ok) return;
    onReplace(check.phrase);
    setDone(true);
    reset();
    setOpen(false);
  };

  return (
    <section className="w-card" aria-label={t('wl.importTitle')}>
      <div className="w-card-head">
        <div className="w-card-title">
          <IconImport size={17} />
          {t('wl.importTitle')}
        </div>
        <button
          type="button"
          className="w-btn small ghost"
          onClick={() => {
            if (open) {
              reset();
            }
            setOpen(!open);
          }}
          aria-expanded={open}
        >
          {open ? t('wl.close') : t('wl.open')}
        </button>
      </div>
      <p className="w-muted-text">
        {t('wl.importMuted')}
      </p>

      {done && (
        <div className="w-import-done">
          <Notice tone="success" title={t('wl.importDoneTitle')}>
            {t('wl.importDoneText')}
          </Notice>
        </div>
      )}

      {open && (
        <div className="w-seed">
          <Notice tone="warn" title={t('wl.replaceWarnTitle')}>
            {t('wl.replaceWarnText')}
          </Notice>
          <div className="w-field">
            <label htmlFor="w-import-phrase">{t('wl.phraseLabel')}</label>
            <textarea
              id="w-import-phrase"
              className="w-textarea"
              rows={4}
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setCheck(null);
                setDone(false);
              }}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
            />
            <div className="w-field-hint">
              {t('wl.wordsHint', { n: wordCount })}
            </div>
          </div>

          {check && !check.ok && (
            <Notice tone="danger" title={t('wl.refused')}>
              {t(check.error)}
            </Notice>
          )}

          {check && check.ok ? (
            <div className="w-import-preview">
              <span>{t('wl.detected')}</span>
              <code>{check.address}</code>
              <p>
                {t('wl.importConfirmText')}
              </p>
              <div className="w-btn-row">
                <button type="button" className="w-btn danger" onClick={apply}>
                  {t('wl.confirmReplace')}
                </button>
                <button type="button" className="w-btn ghost" onClick={reset}>
                  {t('wl.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="w-btn primary full"
              onClick={() => setCheck(inspectPhrase(text))}
              disabled={!text.trim()}
            >
              {t('wl.verifyPhrase')}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
