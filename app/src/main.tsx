import { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { installPrivacyShield } from './lib/privacy';
import './styles.css';
import './components/home.css';
import './components/security.css';
import './ui2.css';

// Chaque page n'est téléchargée que lorsqu'on la visite : /app ne charge pas l'accueil,
// le dossier sécurité ni les nouveautés.
const App = lazy(() => import('./App'));
const Home = lazy(() => import('./components/Home'));
const Security = lazy(() => import('./components/Security'));
const Changelog = lazy(() => import('./components/Changelog'));

// « / » = landing publique, « /securite » = dossier technique, « /nouveautes » = changelog,
// le reste = application.
const path = location.pathname.replace(/\/+$/, '') || '/';

// La dissuasion anti-capture ne s'applique qu'à l'application (pas au site public).
if (path === '/app' || path.startsWith('/app')) installPrivacyShield();

const page =
  path === '/' ? <Home /> :
  path === '/securite' ? <Security /> :
  path === '/nouveautes' ? <Changelog /> :
  <App />;

createRoot(document.getElementById('root')!).render(
  <Suspense fallback={<div className="boot" aria-label="Chargement" />}>{page}</Suspense>,
);

// Pas de service worker : évite que d'anciens fichiers restent en cache.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
}
