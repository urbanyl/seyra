import { useState } from 'react';
import { formatCodeInput } from '../lib/format';
import { IconBack, IconCheck, IconLock, IconPlus, IconUsers, SeyraMark } from './Icons';

export default function Landing({ onCreate, onJoin, busy, error, notice, pseudo, onPseudo, prefillCode }: {
  onCreate: (opts: { password?: string; history?: boolean; receipts?: boolean }) => void;
  onJoin: (code: string, password?: string) => void;
  busy: boolean;
  error: string;
  notice: string;
  pseudo: string;
  onPseudo: (v: string) => void;
  prefillCode?: string;
}) {
  const [mode, setMode] = useState<'home' | 'join'>(prefillCode ? 'join' : 'home');
  const [code, setCode] = useState(prefillCode ? formatCodeInput(prefillCode) : '');
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [history, setHistory] = useState(false);
  const [receipts, setReceipts] = useState(false);

  return (
    <div className="landing">
      <div className="landing-card">
        <div className="landing-brand">
          <SeyraMark size={58} />
          <div>
            <h1>Seyra</h1>
            <p>Sessions privées, éphémères, chiffrées.</p>
          </div>
        </div>

        {notice && <div className="banner info">{notice}</div>}
        {error && <div className="banner error">{error}</div>}

        <label className="field pseudo-field">
          <span>Votre pseudo</span>
          <input
            value={pseudo}
            maxLength={24}
            placeholder="Invité (par défaut)"
            onChange={(e) => onPseudo(e.target.value)}
          />
        </label>

        {mode === 'home' ? (
          <>
            <label className={`pwd-toggle ${usePassword ? 'on' : ''}`}>
              <input type="checkbox" checked={usePassword} onChange={(e) => { setUsePassword(e.target.checked); if (!e.target.checked) setPassword(''); }} />
              <IconLock size={15} />
              <span>Protéger la session par un mot de passe</span>
            </label>
            {usePassword && (
              <label className="field">
                <span>Mot de passe de la session</span>
                <input
                  type="password"
                  value={password}
                  maxLength={64}
                  placeholder="À communiquer aux invités"
                  autoComplete="new-password"
                  onChange={(e) => setPassword(e.target.value)}
                />
                <em className="field-hint">Il n'est jamais envoyé au serveur : il est mélangé à la clé de chiffrement.</em>
              </label>
            )}
            <label className={`pwd-toggle ${history ? 'on' : ''}`}>
              <input type="checkbox" checked={history} onChange={(e) => setHistory(e.target.checked)} />
              <IconBack size={15} />
              <span>Autoriser les nouveaux arrivants à voir l'historique</span>
            </label>
            <p className="field-hint opt-hint">
              {history
                ? 'Les personnes qui rejoignent verront les messages déjà envoyés.'
                : 'Par défaut, un nouvel arrivant ne voit rien de ce qui a été dit avant son arrivée.'}
            </p>
            <label className={`pwd-toggle ${receipts ? 'on' : ''}`}>
              <input type="checkbox" checked={receipts} onChange={(e) => setReceipts(e.target.checked)} />
              <IconCheck size={15} />
              <span>Accusés de lecture</span>
            </label>
            <p className="field-hint opt-hint">
              {receipts
                ? 'Chaque participant voit qui a lu les messages. Ce choix est visible de tous.'
                : 'Désactivés : personne ne voit qui a lu quoi.'}
            </p>
            <div className="landing-actions">
              <button className="choice" onClick={() => onCreate({ password: usePassword ? password : undefined, history, receipts })} disabled={busy || (usePassword && password.length < 4)}>
                <span className="choice-icon"><IconPlus size={20} /></span>
                <span className="choice-text">
                  <strong>Ouvrir une session</strong>
                  <em>{usePassword && password.length < 4 ? 'Mot de passe : 4 caractères minimum.' : 'Un code apparaît. Partagez-le pour discuter.'}</em>
                </span>
              </button>
              <button className="choice" onClick={() => { setMode('join'); setUsePassword(false); }} disabled={busy}>
                <span className="choice-icon cyan"><IconUsers size={20} /></span>
                <span className="choice-text">
                  <strong>Rejoindre une session</strong>
                  <em>Entrez le code reçu d'un proche.</em>
                </span>
              </button>
            </div>
          </>
        ) : (
          <div className="join-form">
            <button className="back" onClick={() => setMode('home')}><IconBack size={16} /> Retour</button>
            <label className="field">
              <span>Code de session</span>
              <input
                className="code-input"
                autoFocus
                value={code}
                onChange={(e) => setCode(formatCodeInput(e.target.value))}
                onKeyDown={(e) => { if (e.key === 'Enter' && code.replace(/-/g, '').length === 12) onJoin(code, password || undefined); }}
                placeholder="XXXX-XXXX-XXXX"
                spellCheck={false}
                inputMode="text"
              />
            </label>
            <label className="field">
              <span>Mot de passe <em className="opt">(si la session en a un)</em></span>
              <input
                type="password"
                value={password}
                maxLength={64}
                placeholder="Laisser vide s'il n'y en a pas"
                autoComplete="off"
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button
              className="btn primary big"
              disabled={busy || code.replace(/-/g, '').length !== 12}
              onClick={() => onJoin(code, password || undefined)}
            >
              {busy ? <span className="spinner" /> : 'Rejoindre la session'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
