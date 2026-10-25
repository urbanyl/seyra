import { useState, type FormEvent, type ReactNode } from 'react';
import { recoveryCode, register, startLocal, unlock, unlockWithCode, useAccount, useAutoRestore } from '../lib/vault';
import { apiErrorMessage } from '../lib/apierr';
import AppFrame from './AppFrame';
import { IconLock, IconPlus, IconShield } from './Icons';
import { useT } from '../lib/i18n';
import './account.css';

export default function Account({ back = '/' }: { back?: string }) {
  const t = useT();
  const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: 'login', label: t('ac.login'), icon: <IconLock size={17} /> },
    { id: 'register', label: t('ac.register'), icon: <IconPlus size={17} /> },
    { id: 'recover', label: t('ac.recover'), icon: <IconShield size={17} /> },
  ];
  useAutoRestore();
  const { user, local, lock, logout } = useAccount();
  const [tab, setTab] = useState<Tab>('login');
  const [name, setName] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fresh, setFresh] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);

  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(apiErrorMessage(e, t));
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    run(async () => {
      if (tab === 'register') {
        if (!/^[a-zA-Z0-9_.-]{3,24}$/.test(name)) throw new Error(t('ac.errPseudo'));
        if (pass.length < 8) throw new Error(t('ac.errPass'));
        if (pass !== pass2) throw new Error(t('ac.errMatch'));
        const rec = await register(name, pass);
        setFresh(rec);
        setPass('');
        setPass2('');
      } else if (tab === 'recover') {
        await unlockWithCode(name, code);
        location.href = '/';
      } else {
        await unlock(name, pass);
        location.href = '/';
      }
    });
  }

  /* Affiche une page du compte dans le cadre commun (side + pane + pane-head). */
  const frame = (
    node: ReactNode,
    head: { title: string; subtitle?: string; nav?: ReactNode; actions?: ReactNode },
  ) => (
    <AppFrame app="compte" className="acct-frame" title={head.title} subtitle={head.subtitle} nav={head.nav} actions={head.actions}>
      <div className="acct">
        <div className="acct-card">{node}</div>
      </div>
    </AppFrame>
  );

  if (fresh) {
    return frame(
      <>
        <p className="acct-note">
          {t('ac.recoveryNote')}
        </p>
        <code className="acct-code">{fresh}</code>
        <div className="acct-row">
          <button
            className="acct-btn"
            onClick={() => {
              navigator.clipboard?.writeText(fresh).then(() => setCopied(true)).catch(() => {});
            }}
          >
            {copied ? t('ac.copied') : t('ac.copyCode')}
          </button>
          <button className="acct-btn primary" onClick={() => (location.href = '/')}>
            {t('ac.saved')}
          </button>
        </div>
      </>,
      { title: t('ac.recoveryTitle'), subtitle: t('ac.recoverySub') },
    );
  }

  if (user) {
    const rec = recoveryCode();
    return frame(
      <>
        <p className="acct-note">
          {local ? t('ac.localNote') : t('ac.vaultNote')}
        </p>
        {rec && (
          <>
            <button className="acct-btn" onClick={() => setShowCode((v) => !v)}>
              {showCode ? t('ac.hideRecovery') : t('ac.showRecovery')}
            </button>
            {showCode && <code className="acct-code">{rec}</code>}
          </>
        )}
        <div className="acct-row">
          <button className="acct-btn" onClick={() => { lock(); location.href = '/compte'; }}>
            {t('ac.lock')}
          </button>
          {!local && (
            <button className="acct-btn danger" onClick={() => { logout(); location.href = '/compte'; }}>
              {t('ac.logout')}
            </button>
          )}
        </div>
      </>,
      {
        title: local ? t('ac.localTitle') : t('ac.accountTitle', { user }),
        subtitle: local ? t('ac.localSub') : t('ac.vaultSub'),
        actions: (
          <button className="acct-btn primary" onClick={() => (location.href = back)}>
            {t('ac.continue')}
          </button>
        ),
      },
    );
  }

  return frame(
    <>
      <p className="acct-note">
        {t('ac.note')}
      </p>

      <form onSubmit={submit}>
        <label>
          <span>{t('ac.pseudo')}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.trim())}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="username"
          />
        </label>

        {tab !== 'recover' && (
          <label>
            <span>{t('ac.password')}</span>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
            />
          </label>
        )}

        {tab === 'register' && (
          <label>
            <span>{t('ac.confirm')}</span>
            <input type="password" value={pass2} onChange={(e) => setPass2(e.target.value)} autoComplete="new-password" />
          </label>
        )}

        {tab === 'recover' && (
          <label>
            <span>{t('ac.recoverCode')}</span>
            <input value={code} onChange={(e) => setCode(e.target.value.trim())} spellCheck={false} />
          </label>
        )}

        {error && <p className="acct-error">{error}</p>}

        <button className="acct-btn primary wide" disabled={busy}>
          {busy ? t('ac.busy') : tab === 'register' ? t('ac.register') : tab === 'recover' ? t('ac.unlockCode') : t('ac.open')}
        </button>
      </form>

      <div className="acct-sep"><span>{t('ac.or')}</span></div>

      <button
        className="acct-btn wide"
        onClick={() => {
          if (confirm(t('ac.localConfirm'))) {
            startLocal();
            location.href = '/';
          }
        }}
      >
        {t('ac.localBtn')}
      </button>
      <p className="acct-fine">
        {t('ac.fine')}
      </p>
    </>,
    {
      title: t('ac.title'),
      subtitle: t('ac.subtitle'),
      nav: (
        <>
          <p className="app-nav-title">{t('ac.access')}</p>
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`app-nav-item${tab === item.id ? ' is-on' : ''}`}
              onClick={() => { setTab(item.id); setError(''); }}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </>
      ),
      actions: (
        <a className="acct-btn" href={back}>
          {t('ac.back')}
        </a>
      ),
    },
  );
}

type Tab = 'login' | 'register' | 'recover';
