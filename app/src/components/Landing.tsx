import { useState } from 'react';
import { formatCodeInput } from '../lib/format';
import { IconBack, IconPlus, IconUsers, SeyraMark } from './Icons';

export default function Landing({ onCreate, onJoin, busy, error, notice }: {
  onCreate: () => void;
  onJoin: (code: string) => void;
  busy: boolean;
  error: string;
  notice: string;
}) {
  const [mode, setMode] = useState<'home' | 'join'>('home');
  const [code, setCode] = useState('');

  return (
    <div className="landing">
      <div className="landing-glow" />
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

        {mode === 'home' ? (
          <div className="landing-actions">
            <button className="choice" onClick={onCreate} disabled={busy}>
              <span className="choice-icon"><IconPlus size={20} /></span>
              <span className="choice-text">
                <strong>Ouvrir une session</strong>
                <em>Un code apparaît. Partagez-le pour discuter.</em>
              </span>
            </button>
            <button className="choice" onClick={() => setMode('join')} disabled={busy}>
              <span className="choice-icon cyan"><IconUsers size={20} /></span>
              <span className="choice-text">
                <strong>Rejoindre une session</strong>
                <em>Entrez le code reçu d'un proche.</em>
              </span>
            </button>
          </div>
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
                onKeyDown={(e) => { if (e.key === 'Enter' && code.replace(/-/g, '').length === 12) onJoin(code); }}
                placeholder="XXXX-XXXX-XXXX"
                spellCheck={false}
                inputMode="text"
              />
            </label>
            <button
              className="btn primary big"
              disabled={busy || code.replace(/-/g, '').length !== 12}
              onClick={() => onJoin(code)}
            >
              {busy ? <span className="spinner" /> : 'Rejoindre la session'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
