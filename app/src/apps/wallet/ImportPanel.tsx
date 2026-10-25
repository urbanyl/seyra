import { useState } from 'react';
import { inspectPhrase } from './mnemonic';
import type { PhraseCheck } from './mnemonic';
import { Notice } from './ui';
import { IconImport } from './icons';

type Props = {
  onReplace: (phrase: string) => void;
  defaultOpen?: boolean;
};

export default function ImportPanel({ onReplace, defaultOpen = false }: Props) {
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
    <section className="w-card" aria-label="Importer une phrase">
      <div className="w-card-head">
        <div className="w-card-title">
          <IconImport size={17} />
          Importer une phrase
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
          {open ? 'Fermer' : 'Ouvrir'}
        </button>
      </div>
      <p className="w-muted-text">
        Restaure un portefeuille depuis sa phrase BIP-39 de 12 ou 24 mots. Le portefeuille actuel
        sera remplacé après confirmation.
      </p>

      {done && (
        <div className="w-import-done">
          <Notice tone="success" title="Portefeuille remplacé">
            Le nouveau portefeuille est actif dans ce coffre.
          </Notice>
        </div>
      )}

      {open && (
        <div className="w-seed">
          <Notice tone="warn" title="Remplacement définitif">
            Si tu n'as pas la phrase du portefeuille actuel, ses fonds seront perdus. Aucune
            récupération serveur.
          </Notice>
          <div className="w-field">
            <label htmlFor="w-import-phrase">Phrase de récupération</label>
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
              {wordCount} mot(s) · 12 ou 24 attendus · BIP-39 anglais ou français
            </div>
          </div>

          {check && !check.ok && (
            <Notice tone="danger" title="Phrase refusée">
              {check.error}
            </Notice>
          )}

          {check && check.ok ? (
            <div className="w-import-preview">
              <span>Adresse détectée</span>
              <code>{check.address}</code>
              <p>
                Confirme le remplacement uniquement si cette adresse est la bonne. L'opération est
                irréversible dans le coffre.
              </p>
              <div className="w-btn-row">
                <button type="button" className="w-btn danger" onClick={apply}>
                  Confirmer le remplacement
                </button>
                <button type="button" className="w-btn ghost" onClick={reset}>
                  Annuler
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
              Vérifier la phrase
            </button>
          )}
        </div>
      )}
    </section>
  );
}
