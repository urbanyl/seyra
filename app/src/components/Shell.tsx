import { useAccount, useAutoRestore } from '../lib/vault';
import { SeyraMark } from './Icons';
import LangMenu from './LangMenu';
import { AppTile, type AppId } from './AppIcons';
import './appframe.css';
import './shell.css';

const APPS: { href: string; id: AppId; name: string; hint: string }[] = [
  { href: '/app', id: 'messages', name: 'Messagerie', hint: 'Une session par code. Chiffrée, sans compte.' },
  { href: '/wallet', id: 'wallet', name: 'Wallet', hint: 'Portefeuille EVM, clés locales.' },
  { href: '/notes', id: 'notes', name: 'Notes chiffrées', hint: 'Markdown, rangées dans ton coffre.' },
  { href: '/canaux', id: 'canaux', name: 'Canaux', hint: 'Salons publics, sans compte.' },
  { href: '/wiki', id: 'wiki', name: 'SeyraWiki', hint: 'Encyclopédie libre en Markdown.' },
  { href: '/compte', id: 'compte', name: 'Compte', hint: 'Coffre chiffré, code de récupération.' },
];

export default function Shell() {
  useAutoRestore();
  const { user, local } = useAccount();

  return (
    <div className="landing lm-landing">
      <header className="home-nav">
        <a className="home-brand" href="/">
          <SeyraMark size={32} />
          <span>Seyra</span>
        </a>
        <nav>
          <a href="/securite">Sécurité</a>
          <a href="/nouveautes">Nouveautés</a>
          <LangMenu />
          <a className="home-cta-small" href="/compte">{user ? (local ? 'Local' : user) : 'Compte'}</a>
        </nav>
      </header>

      <div className="landing-card">
        <div className="landing-brand">
          <SeyraMark size={58} />
          <div>
            <h1>Seyra</h1>
            <p>Votre boîte à outils privée. Choisissez une application.</p>
          </div>
        </div>

        <div className="landing-actions">
          {APPS.map((a) => (
            <a key={a.href} className="choice app-choice" href={a.href}>
              <AppTile id={a.id} size={46} />
              <span className="choice-text">
                <strong>{a.name}</strong>
                <em>{a.hint}</em>
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
