import { useState, type FormEvent, type ReactNode } from 'react';
import { recoveryCode, register, startLocal, unlock, unlockWithCode, useAccount, useAutoRestore } from '../lib/vault';
import AppFrame from './AppFrame';
import './account.css';

type Tab = 'login' | 'register' | 'recover';

const TABS: { id: Tab; label: string }[] = [
  { id: 'login', label: 'Se connecter' },
  { id: 'register', label: 'Créer un compte' },
  { id: 'recover', label: 'Code de récupération' },
];

export default function Account({ back = '/' }: { back?: string }) {
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
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.');
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    run(async () => {
      if (tab === 'register') {
        if (!/^[a-zA-Z0-9_.-]{3,24}$/.test(name)) throw new Error('Pseudo : 3 à 24 caractères (lettres, chiffres, . _ -).');
        if (pass.length < 8) throw new Error('Mot de passe : 8 caractères minimum.');
        if (pass !== pass2) throw new Error('Les deux mots de passe ne correspondent pas.');
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
          C'est la seule façon de retrouver ce compte si vous oubliez le mot de passe. Il n'y a ni e-mail ni
          téléphone. Notez-le hors ligne, ne le partagez jamais.
        </p>
        <code className="acct-code">{fresh}</code>
        <div className="acct-row">
          <button
            className="acct-btn"
            onClick={() => {
              navigator.clipboard?.writeText(fresh).then(() => setCopied(true)).catch(() => {});
            }}
          >
            {copied ? 'Copié' : 'Copier le code'}
          </button>
          <button className="acct-btn primary" onClick={() => (location.href = '/')}>
            J'ai sauvegardé
          </button>
        </div>
      </>,
      { title: 'Code de récupération', subtitle: 'À noter hors ligne' },
    );
  }

  if (user) {
    const rec = recoveryCode();
    return frame(
      <>
        <p className="acct-note">
          {local
            ? 'Vos données restent dans ce navigateur et ne sont envoyées nulle part. Elles disparaissent si vous videz les données du site.'
            : 'Votre coffre est chiffré avec votre mot de passe. Le serveur ne peut pas le lire.'}
        </p>
        {rec && (
          <>
            <button className="acct-btn" onClick={() => setShowCode((v) => !v)}>
              {showCode ? 'Masquer le code de récupération' : 'Afficher le code de récupération'}
            </button>
            {showCode && <code className="acct-code">{rec}</code>}
          </>
        )}
        <div className="acct-row">
          <button className="acct-btn" onClick={() => { lock(); location.href = '/compte'; }}>
            Verrouiller
          </button>
          {!local && (
            <button className="acct-btn danger" onClick={() => { logout(); location.href = '/compte'; }}>
              Se déconnecter
            </button>
          )}
        </div>
      </>,
      {
        title: local ? 'Profil local' : 'Compte ' + user,
        subtitle: local ? 'Stocké dans ce navigateur' : 'Coffre chiffré',
        actions: (
          <button className="acct-btn primary" onClick={() => (location.href = back)}>
            Continuer
          </button>
        ),
      },
    );
  }

  return frame(
    <>
      <p className="acct-note">
        Le compte sert au wallet, aux notes et au reste. La messagerie reste à part : un code, aucune inscription.
      </p>

      <form onSubmit={submit}>
        <label>
          <span>Pseudo</span>
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
            <span>Mot de passe</span>
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
            <span>Confirmer</span>
            <input type="password" value={pass2} onChange={(e) => setPass2(e.target.value)} autoComplete="new-password" />
          </label>
        )}

        {tab === 'recover' && (
          <label>
            <span>Code de récupération</span>
            <input value={code} onChange={(e) => setCode(e.target.value.trim())} spellCheck={false} />
          </label>
        )}

        {error && <p className="acct-error">{error}</p>}

        <button className="acct-btn primary wide" disabled={busy}>
          {busy ? '…' : tab === 'register' ? 'Créer le compte' : tab === 'recover' ? 'Déverrouiller avec le code' : 'Ouvrir mon coffre'}
        </button>
      </form>

      <div className="acct-sep"><span>ou</span></div>

      <button
        className="acct-btn wide"
        onClick={() => {
          if (confirm('Mode local : les données restent dans ce navigateur uniquement, sans sauvegarde. Continuer ?')) {
            startLocal();
            location.href = '/';
          }
        }}
      >
        Utiliser sans compte (local)
      </button>
      <p className="acct-fine">
        Sans e-mail, sans téléphone. Mot de passe oublié = données perdues, sauf code de récupération.
      </p>
    </>,
    {
      title: 'Compte Seyra',
      subtitle: 'Coffre chiffré · sans e-mail',
      nav: (
        <>
          <p className="app-nav-title">Accès</p>
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`app-nav-item${tab === item.id ? ' is-on' : ''}`}
              onClick={() => { setTab(item.id); setError(''); }}
            >
              <span>{item.label}</span>
            </button>
          ))}
        </>
      ),
      actions: (
        <a className="acct-btn" href={back}>
          Retour
        </a>
      ),
    },
  );
}
