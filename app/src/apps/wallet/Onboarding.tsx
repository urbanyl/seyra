import { useMemo, useState } from 'react';
import { CHAINS } from './chains';
import { createMnemonic, deriveAddress, inspectPhrase } from './mnemonic';
import type { PhraseCheck } from './mnemonic';
import AppFrame from '../../components/AppFrame';
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

  const pageTitle = mode === 'create' ? 'Créer un portefeuille' : mode === 'import' ? 'Importer une phrase' : 'Portefeuille';
  const pageSub = mode === 'create' ? 'Nouveau portefeuille' : mode === 'import' ? 'Restauration' : 'Non dépositaire · EVM';

  return (
    <AppFrame
      app="wallet"
      className="w-frame"
      fixedBody
      title={pageTitle}
      subtitle={pageSub}
      nav={
        <>
          <p className="app-nav-title">Démarrer</p>
          <button type="button" className={`app-nav-item${mode === 'intro' ? ' is-on' : ''}`} onClick={back}>
            <IconWallet size={17} />
            <span>Accueil du wallet</span>
          </button>
          <button type="button" className={`app-nav-item${mode === 'create' ? ' is-on' : ''}`} onClick={startCreate}>
            <IconWallet size={17} />
            <span>Créer un portefeuille</span>
          </button>
          <button type="button" className={`app-nav-item${mode === 'import' ? ' is-on' : ''}`} onClick={startImport}>
            <IconImport size={17} />
            <span>Importer une phrase</span>
          </button>
        </>
      }
    >
      <div className="w-onboard-scroll">
        <div className="w-onboard-inner">
          {mode === 'intro' && (
            <>
              <p className="w-eyebrow">Non dépositaire · EVM uniquement</p>
              <h1 className="w-onboard-title">Tes clés restent sur ton appareil.</h1>
              <p className="w-lede">
                Seyra génère ton portefeuille localement. La phrase secrète est chiffrée dans ton
                coffre et n'est jamais envoyée au serveur.
              </p>
              <div className="w-networks" aria-label="Réseaux disponibles">
                {CHAINS.map((item) => (
                  <span className="w-net" key={item.id}>
                    {item.name}
                  </span>
                ))}
              </div>
              <Notice tone="warn" title="La sauvegarde, c'est toi">
                Ta phrase de récupération est ta seule sauvegarde. Personne — pas même Seyra — ne peut
                la retrouver à ta place.
              </Notice>
              <div className="w-actions-stack">
                <button type="button" className="w-btn primary full" onClick={startCreate}>
                  <IconWallet size={18} />
                  Créer un portefeuille
                </button>
                <button type="button" className="w-btn ghost full" onClick={startImport}>
                  <IconImport size={17} />
                  Importer une phrase
                </button>
              </div>
              <SafetyNotes />
              <p className="w-onboard-foot">
                Aucune clé privée, aucune phrase et aucune transaction ne transitent par les serveurs
                Seyra.
              </p>
            </>
          )}

          {mode === 'create' && (
            <>
              <button type="button" className="w-back" onClick={back}>
                <IconArrowLeft size={16} />
                Retour
              </button>
              <p className="w-eyebrow">Nouveau portefeuille</p>
              <h1 className="w-onboard-title">Créer un portefeuille</h1>
              <p className="w-lede">
                Voici ta phrase de récupération de 12 mots. Note-la dans l'ordre, hors ligne, avant
                de continuer.
              </p>
              <Notice tone="danger" title="Ne partage jamais cette phrase">
                Quiconque possède ces mots peut vider le portefeuille. Seyra ne peut pas la
                récupérer.
              </Notice>
              <div className="w-words" aria-label="Phrase de récupération">
                {draftWords.map((word, index) => (
                  <div className="w-word" key={`${index}-${word}`}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    {word}
                  </div>
                ))}
              </div>
              <div className="w-btn-row">
                <CopyButton text={draft ?? ''} label="Copier la phrase" copiedLabel="Phrase copiée" />
                <button type="button" className="w-btn small ghost" onClick={regenerate}>
                  <IconRefresh size={15} />
                  Régénérer
                </button>
              </div>
              {draftAddress && (
                <div className="w-address-preview">
                  <span>Adresse dérivée</span>
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
                  J'ai noté ma phrase de récupération en lieu sûr. Je comprends que sans elle, mes
                  fonds sont perdus.
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
                Créer le portefeuille
              </button>
              <p className="w-onboard-foot">
                L'export de la phrase est la seule sauvegarde. Aucune récupération serveur.
              </p>
            </>
          )}

          {mode === 'import' && (
            <>
              <button type="button" className="w-back" onClick={back}>
                <IconArrowLeft size={16} />
                Retour
              </button>
              <p className="w-eyebrow">Restauration</p>
              <h1 className="w-onboard-title">Importer une phrase</h1>
              <p className="w-lede">
                Colle une phrase BIP-39 de 12 ou 24 mots. L'import écrase le portefeuille stocké
                dans ce coffre après confirmation.
              </p>
              <div className="w-field">
                <label htmlFor="w-onboard-import">Phrase de récupération</label>
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
                  {wordCount} mot(s) · 12 ou 24 attendus · BIP-39 anglais ou français
                </div>
              </div>
              {check && !check.ok && (
                <Notice tone="danger" title="Phrase refusée">
                  {check.error}
                </Notice>
              )}
              {check && check.ok && (
                <div className="w-import-preview">
                  <span>Adresse détectée</span>
                  <code>{check.address}</code>
                  <p>Vérifie que cette adresse correspond bien à ton portefeuille.</p>
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
                  Vérifier la phrase
                </button>
              ) : (
                <button
                  type="button"
                  className="w-btn primary full"
                  onClick={() => onImport(check.phrase)}
                >
                  <IconImport size={17} />
                  Importer ce portefeuille
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
