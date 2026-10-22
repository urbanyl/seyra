import { createRoot } from 'react-dom/client';
import App from './App';
import Home from './components/Home';
import Security from './components/Security';
import Changelog from './components/Changelog';
import { installPrivacyShield } from './lib/privacy';
import './styles.css';
import './components/home.css';
import './components/security.css';

// « / » = landing publique, « /securite » = dossier technique, le reste = application.
const path = location.pathname.replace(/\/+$/, '') || '/';

// La dissuasion anti-capture ne s'applique qu'à l'application (pas au site public).
if (path === '/app' || path.startsWith('/app')) installPrivacyShield();

createRoot(document.getElementById('root')!).render(
  path === '/' ? <Home /> : path === '/securite' ? <Security /> : path === '/nouveautes' ? <Changelog /> : <App />,
);

// Pas de service worker : évite que d'anciens fichiers restent en cache.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
}
