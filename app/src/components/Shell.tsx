import { useAccount, useAutoRestore } from '../lib/vault';
import { SeyraMark } from './Icons';
import LangMenu from './LangMenu';
import { AppTile, type AppId } from './AppIcons';
import { useT } from '../lib/i18n';
import './appframe.css';
import './shell.css';

const APPS: { href: string; id: AppId }[] = [
  { href: '/app', id: 'messages' },
  { href: '/wallet', id: 'wallet' },
  { href: '/notes', id: 'notes' },
  { href: '/canaux', id: 'canaux' },
  { href: '/wiki', id: 'wiki' },
  { href: '/compte', id: 'compte' },
];

export default function Shell() {
  useAutoRestore();
  const t = useT();
  const { user, local } = useAccount();

  return (
    <div className="landing lm-landing">
      <header className="home-nav">
        <a className="home-brand" href="/">
          <SeyraMark size={32} />
          <span>Seyra</span>
        </a>
        <nav>
          <a href="/decouvrir#telecharger">{t('dl.kicker')}</a>
          <a href="/securite">{t('shell.security')}</a>
          <a href="/nouveautes">{t('shell.news')}</a>
          <LangMenu />
          <a className="home-cta-small" href="/compte">{user ? (local ? t('ac.local') : user) : t('app.compte')}</a>
        </nav>
      </header>

      <div className="landing-card">
        <div className="landing-brand">
          <SeyraMark size={58} />
          <div>
            <h1>Seyra</h1>
            <p>{t('shell.tagline')}</p>
          </div>
        </div>

        <div className="landing-actions">
          {APPS.map((a) => (
            <a key={a.href} className="choice app-choice" href={a.href}>
              <AppTile id={a.id} size={46} />
              <span className="choice-text">
                <strong>{t('app.' + a.id)}</strong>
                <em>{t('app.' + a.id + '.hint')}</em>
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
