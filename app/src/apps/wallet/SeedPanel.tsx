import { useState } from 'react';
import { CopyButton, Notice } from './ui';
import { IconEye, IconEyeOff, IconKey, IconLock } from './icons';

export default function SeedPanel({ mnemonic }: { mnemonic: string }) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const words = mnemonic.split(' ');

  const toggle = () => {
    if (open) setVisible(false);
    setOpen(!open);
  };

  return (
    <section className="w-card" aria-label="Phrase secrète">
      <div className="w-card-head">
        <div className="w-card-title">
          <IconKey size={17} />
          Phrase secrète
        </div>
        <button type="button" className="w-btn small ghost" onClick={toggle} aria-expanded={open}>
          {open ? 'Fermer' : 'Gérer'}
        </button>
      </div>
      <p className="w-muted-text">
        Ton seul moyen de restaurer le portefeuille. Seyra ne peut pas la récupérer.
      </p>

      {open && (
        <div className="w-seed">
          <Notice tone="danger" title="Ne partage jamais cette phrase">
            Toute personne qui voit ces mots peut vider le portefeuille. Ne la photographie pas, ne
            la colle pas dans un site tiers et ne l'envoie jamais par message.
          </Notice>

          {visible ? (
            <>
              <div className="w-words" aria-label="Phrase de récupération">
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
                  label="Copier la phrase"
                  copiedLabel="Phrase copiée"
                />
                <button type="button" className="w-btn small ghost" onClick={() => setVisible(false)}>
                  <IconEyeOff size={15} />
                  Masquer
                </button>
              </div>
              <p className="w-muted-text">
                Exporte-la uniquement vers un support hors ligne. C'est la seule sauvegarde.
              </p>
            </>
          ) : (
            <>
              <div className="w-seed-locked">
                <IconLock size={20} />
                <span>Phrase masquée · {words.length} mots</span>
              </div>
              <button
                type="button"
                className="w-btn primary full"
                onClick={() => setVisible(true)}
              >
                <IconEye size={16} />
                Afficher la phrase
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
