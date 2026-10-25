import { lazy, Suspense, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { installPrivacyShield } from './lib/privacy';
import { useAccount, useAutoRestore } from './lib/vault';
import AppBoot from './components/AppBoot';
import './styles.css';
import './components/home.css';
import './components/security.css';
import './ui2.css';
import './flat.css';
import './components/chrome.css';

const App = lazy(() => import('./App'));
const Home = lazy(() => import('./components/Home'));
const Security = lazy(() => import('./components/Security'));
const Changelog = lazy(() => import('./components/Changelog'));
const Shell = lazy(() => import('./components/Shell'));
const Account = lazy(() => import('./components/Account'));
const Wallet = lazy(() => import('./apps/wallet/Wallet'));
const Notes = lazy(() => import('./apps/notes/Notes'));
const Wiki = lazy(() => import('./apps/wiki/Wiki'));
const Channels = lazy(() => import('./apps/channels/Channels'));

const path = location.pathname.replace(/\/+$/, '') || '/';

if (path === '/app' || path.startsWith('/app')) installPrivacyShield();

// Dans l'app Android (Capacitor), les liens externes partent dans le navigateur.
const cap = (window as unknown as {
  Capacitor?: { isNativePlatform?: () => boolean; Plugins?: Record<string, { open?: (o: { url: string }) => Promise<unknown> }> };
}).Capacitor;
if (cap?.isNativePlatform?.()) {
  document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement | null)?.closest?.('a');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (!/^https?:/i.test(href)) return;
    let url: URL;
    try { url = new URL(href, location.href); } catch { return; }
    if (url.origin === location.origin) return;
    e.preventDefault();
    cap.Plugins?.Browser?.open?.({ url: url.href }).catch?.(() => {});
  }, true);
}

function Gate({ children }: { children: ReactNode }) {
  useAutoRestore();
  const { user, restored } = useAccount();
  if (!restored) return <AppBoot label="Ouverture du coffre…" />;
  if (!user) return <Account />;
  return <>{children}</>;
}

const page =
  path === '/' ? <Shell /> :
  path === '/decouvrir' ? <Home /> :
  path === '/compte' ? <Account back="/" /> :
  path === '/wallet' ? <Gate><Wallet /></Gate> :
  path === '/notes' ? <Gate><Notes /></Gate> :
  path === '/canaux' ? <Channels /> :
  path === '/wiki' || path.startsWith('/wiki/') ? <Wiki /> :
  path === '/securite' ? <Security /> :
  path === '/nouveautes' ? <Changelog /> :
  <App />;

createRoot(document.getElementById('root')!).render(
  <Suspense fallback={<AppBoot label="Chargement…" />}>{page}</Suspense>,
);

// Pas de service worker : évite que d'anciens fichiers restent en cache.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
}

