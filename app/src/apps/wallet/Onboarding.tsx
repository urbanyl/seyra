import { useMemo, useState } from 'react';
import { CHAINS } from './chains';
import { createMnemonic, deriveAddress, inspectPhrase } from './mnemonic';
import type { PhraseCheck } from './mnemonic';
import AppFrame from '../../components/AppFrame';
import { useT } from '../../lib/i18n';
import { CopyButton, Notice, SafetyNotes } from './ui';
import {
  IconArrowLeft,
  IconImport,
  IconKey,
  IconRefresh,
  IconShield,
  IconWallet,
} from './icons';

type Props = {
  onCreate: (phrase: string) => void;
  onImport: (phrase: string) => void;
};

type Mode = 'intro' | 'create' | 'import';

export default function Onboarding({ onCreate, onImport }: Props) {
  const t = useT();
  const [mode, setMode] = useState<Mode>('intro');
  const [draft, setDraft] = useState<string | null>(null);
  const [ack, setAck] = useState(false);
  const [importText, setImportText] = useState('');
  const [check, setCheck] = useState<PhraseCheck | null>(null);

  const draftWords = useMemo(() => (draft ? draft.split(' ') : []), [draft]);
  const draftAddress = useMemo(() => {
    if (!draft) return null;
    try {
      return deriveAddress(draft);
    } catch {
      return null;
    }
  }, [draft]);

  const wordCount = importText.trim() ? importText.trim().split(/\s+/).length : 0;

  const startCreate = () => {
    setDraft(createMnemonic());
    setAck(false);
    setMode('create');
  };

  const regenerate = () => {
    setDraft(createMnemonic());
    setAck(false);
  };

  const startImport = () => {
    setImportText('');
    setCheck(null);
    setMode('import');
  };

  const back = () => {
    setMode('intro');
    setDraft(null);
    setAck(false);
    setImportText('');
    setCheck(null);
  };

  const pageTitle = mode === 'create' ? t('wl.onbCreateTitle') : mode === 'import' ? t('wl.onbImportTitle') : t('wl.onbTitle');
  const pageSub = mode === 'create' ? t('wl.onbCreateSub') : mode === 'import' ? t('wl.onbImportSub') : t('wl.onbSub');

  return (
    <AppFrame
      app="wallet"
      className="w-frame"
      fixedBody
      title={pageTitle}
      subtitle={pageSub}
      nav={
        <>
          <p className="app-nav-title">{t('wl.onbStart')}</p>
          <button type="button" className={`app-nav-item${mode === 'intro' ? ' is-on' : ''}`} onClick={back}>
            <IconWallet size={17} />
            <span>{t('wl.onbHome')}</span>
          </button>
          <button type="button" className={`app-nav-item${mode === 'create' ? ' is-on' : ''}`} onClick={startCreate}>
            <IconWallet size={17} />
            <span>{t('wl.onbCreate')}</span>
          </button>
          <button type="button" className={`app-nav-item${mode === 'import' ? ' is-on' : ''}`} onClick={startImport}>
            <IconImport size={17} />
            <span>{t('wl.onbImport')}</span>
          </button>
        </>
      }
    >
      <div className="w-onboard-scroll">
        <div className="w-onboard-inner">
          {mode === 'intro' && (
            <>
              <p className="w-eyebrow">{t('wl.onbEyebrow')}</p>
              <h1 className="w-onboard-title">{t('wl.onbH1')}</h1>
              <p className="w-lede">
                {t('wl.onbLede')}
              </p>
              <div className="w-networks" aria-label={t('wl.onbNetworks')}>
                {CHAINS.map((item) => (
                  <span className="w-net" key={item.id}>
                    {item.name}
                  </span>
                ))}
              </div>
              <Notice tone="warn" title={t('wl.onbWarnTitle')}>
                {t('wl.onbWarnText')}
              </Notice>
              <div className="w-actions-stack">
                <button type="button" className="w-btn primary full" onClick={startCreate}>
                  <IconWallet size={18} />
                  {t('wl.onbCreate')}
                </button>
                <button type="button" className="w-btn ghost full" onClick={startImport}>
                  <IconImport size={17} />
                  {t('wl.onbImport')}
                </button>
              </div>
              <SafetyNotes />
              <p className="w-onboard-foot">
                {t('wl.onbFoot')}
              </p>
            </>
          )}

          {mode === 'create' && (
            <>
              <button type="button" className="w-back" onClick={back}>
                <IconArrowLeft size={16} />
                {t('wl.back')}
              </button>
              <p className="w-eyebrow">{t('wl.onbCreateSub')}</p>
              <h1 className="w-onboard-title">{t('wl.onbCreateTitle')}</h1>
              <p className="w-lede">
                {t('wl.onbCreateLede')}
              </p>
              <Notice tone="danger" title={t('wl.seedDangerTitle')}>
                {t('wl.seedDangerText')}
              </Notice>
              <div className="w-words" aria-label={t('wl.phraseLabel')}>
                {draftWords.map((word, index) => (
                  <div className="w-word" key={`${index}-${word}`}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    {word}
                  </div>
                ))}
              </div>
              <div className="w-btn-row">
                <CopyButton text={draft ?? ''} label={t('wl.copyPhrase')} copiedLabel={t('wl.phraseCopied')} />
                <button type="button" className="w-btn small ghost" onClick={regenerate}>
                  <IconRefresh size={15} />
                  {t('wl.onbRegenerate')}
                </button>
              </div>
              {draftAddress && (
                <div className="w-address-preview">
                  <span>{t('wl.onbDerived')}</span>
                  <code>{draftAddress}</code>
                </div>
              )}
              <label className="w-check">
                <input
                  type="checkbox"
                  checked={ack}
                  onChange={(event) => setAck(event.target.checked)}
                  disabled={!draft}
                />
                <span>
                  {t('wl.onbAck')}
                </span>
              </label>
              <button
                type="button"
                className="w-btn primary full"
                disabled={!draft || !ack}
                onClick={() => {
                  if (draft) onCreate(draft);
                }}
              >
                <IconShield size={17} />
                {t('wl.onbCreate')}
              </button>
              <p className="w-onboard-foot">
                {t('wl.onbCreateFoot')}
              </p>
            </>
          )}

          {mode === 'import' && (
            <>
              <button type="button" className="w-back" onClick={back}>
                <IconArrowLeft size={16} />
                {t('wl.back')}
              </button>
              <p className="w-eyebrow">{t('wl.onbImportSub')}</p>
              <h1 className="w-onboard-title">{t('wl.onbImportTitle')}</h1>
              <p className="w-lede">
                {t('wl.onbImportLede')}
              </p>
              <div className="w-field">
                <label htmlFor="w-onboard-import">{t('wl.phraseLabel')}</label>
                <textarea
                  id="w-onboard-import"
                  className="w-textarea"
                  rows={4}
                  value={importText}
                  onChange={(event) => {
                    setImportText(event.target.value);
                    setCheck(null);
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
              {check && check.ok && (
                <div className="w-import-preview">
                  <span>{t('wl.detected')}</span>
                  <code>{check.address}</code>
                  <p>{t('wl.onbDetectedCheck')}</p>
                </div>
              )}
              {!(check && check.ok) ? (
                <button
                  type="button"
                  className="w-btn primary full"
                  onClick={() => setCheck(inspectPhrase(importText))}
                  disabled={!importText.trim()}
                >
                  <IconKey size={17} />
                  {t('wl.verifyPhrase')}
                </button>
              ) : (
                <button
                  type="button"
                  className="w-btn primary full"
                  onClick={() => onImport(check.phrase)}
                >
                  <IconImport size={17} />
                  {t('wl.onbImportBtn')}
                </button>
              )}
              <SafetyNotes />
            </>
          )}
        </div>
      </div>
    </AppFrame>
  );
}
