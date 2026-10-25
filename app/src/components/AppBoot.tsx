import { SeyraMark } from './Icons';
import LangMenu from './LangMenu';
import './appboot.css';

/**
 * Écran d'attente des pages protégées : la barre du haut avec le logo Seyra
 * et, centré, le message de chargement. Évite tout affichage transitoire
 * (écran de connexion, page vide) pendant la restauration de session.
 */
export default function AppBoot({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className="appboot">
      <header className="home-nav">
        <a className="home-brand" href="/" title="Accueil">
          <SeyraMark size={32} />
          <span>Seyra</span>
        </a>
        <nav>
          <a href="/securite">Sécurité</a>
          <a href="/nouveautes">Nouveautés</a>
          <LangMenu />
          <a className="home-cta-small" href="/">Accueil</a>
        </nav>
      </header>
      <div className="appboot-body">
        <div className="appboot-card" role="status">
          <SeyraMark size={40} />
          <span className="appboot-spinner" aria-hidden="true" />
          <p>{label}</p>
        </div>
      </div>
    </div>
  );
}
