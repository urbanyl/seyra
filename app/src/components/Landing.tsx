import { useState } from 'react';
import { formatCodeInput } from '../lib/format';
import { useT } from '../lib/i18n';
import { IconBack, IconCheck, IconLock, IconPlus, IconUsers, SeyraMark } from './Icons';
import LangMenu from './LangMenu';

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
  const t = useT();
  const [mode, setMode] = useState<'home' | 'join'>(prefillCode ? 'join' : 'home');
  const [code, setCode] = useState(prefillCode ? formatCodeInput(prefillCode) : '');
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [history, setHistory] = useState(false);
  const [receipts, setReceipts] = useState(false);

  return (
    <div className="landing">
      <header className="home-nav">
        <a className="home-brand" href="/">
          <SeyraMark size={32} />
          <span>Seyra</span>
        </a>
        <nav>
          <a href="/securite">{t('nav.security')}</a>
          <a href="/nouveautes">{t('nav.news')}</a>
          <LangMenu />
          <a className="home-cta-small" href="/">{t('nav.home')}</a>
        </nav>
      </header>
      <div className="landing-card">
        <div className="landing-brand">
          <SeyraMark size={58} />
          <div>
            <h1>Seyra</h1>
            <p>{t('announce.text')}</p>
          </div>
        </div>

        {notice && <div className="banner info">{notice}</div>}
        {error && <div className="banner error">{error}</div>}

        <label className="field pseudo-field">
          <span>{t('common.pseudo')}</span>
          <input
            value={pseudo}
            maxLength={24}
            placeholder={t('common.pseudoPh')}
            onChange={(e) => onPseudo(e.target.value)}
          />
        </label>

        {mode === 'home' ? (
          <>
            <label className={`pwd-toggle ${usePassword ? 'on' : ''}`}>
              <input type="checkbox" checked={usePassword} onChange={(e) => { setUsePassword(e.target.checked); if (!e.target.checked) setPassword(''); }} />
              <IconLock size={15} />
              <span>{t('create.password')}</span>
            </label>
            {usePassword && (
              <label className="field">
                <span>{t('create.passwordLabel')}</span>
                <input
                  type="password"
                  value={password}
                  maxLength={64}
                  placeholder={t('create.passwordPh')}
                  autoComplete="new-password"
                  onChange={(e) => setPassword(e.target.value)}
                />
                <em className="field-hint">{t('create.passwordHint')}</em>
              </label>
            )}
            <label className={`pwd-toggle ${history ? 'on' : ''}`}>
              <input type="checkbox" checked={history} onChange={(e) => setHistory(e.target.checked)} />
              <IconBack size={15} />
              <span>{t('create.history')}</span>
            </label>
            <p className="field-hint opt-hint">{history ? t('create.historyOn') : t('create.historyOff')}</p>
            <label className={`pwd-toggle ${receipts ? 'on' : ''}`}>
              <input type="checkbox" checked={receipts} onChange={(e) => setReceipts(e.target.checked)} />
              <IconCheck size={15} />
              <span>{t('create.receipts')}</span>
            </label>
            <p className="field-hint opt-hint">{receipts ? t('create.receiptsOn') : t('create.receiptsOff')}</p>
            <div className="landing-actions">
              <button className="choice" onClick={() => onCreate({ password: usePassword ? password : undefined, history, receipts })} disabled={busy || (usePassword && password.length < 4)}>
                <span className="choice-icon"><IconPlus size={20} /></span>
                <span className="choice-text">
                  <strong>{t('create.title')}</strong>
                  <em>{usePassword && password.length < 4 ? t('create.passwordLabel') : t('create.desc')}</em>
                </span>
              </button>
              <button className="choice" onClick={() => { setMode('join'); setUsePassword(false); }} disabled={busy}>
                <span className="choice-icon cyan"><IconUsers size={20} /></span>
                <span className="choice-text">
                  <strong>{t('join.title')}</strong>
                  <em>{t('join.desc')}</em>
                </span>
              </button>
            </div>
          </>
        ) : (
          <div className="join-form">
            <button className="back" onClick={() => setMode('home')}><IconBack size={16} /> {t('common.back')}</button>
            <label className="field">
              <span>{t('join.codeLabel')}</span>
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
              <span>{t('join.password')}</span>
              <input
                type="password"
                value={password}
                maxLength={64}
                placeholder={t('join.password')}
                autoComplete="off"
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button
              className="btn primary big"
              disabled={busy || code.replace(/-/g, '').length !== 12}
              onClick={() => onJoin(code, password || undefined)}
            >
              {busy ? <span className="spinner" /> : t('join.join')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
