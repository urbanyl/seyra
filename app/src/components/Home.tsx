import { useState } from 'react';
import { SeyraMark } from './Icons';

const SHARE_TEXT = 'Seyra — sessions privées chiffrées. Un code suffit, rien n’est conservé.';

const NETWORKS: [string, string][] = [
  ['WhatsApp', `https://wa.me/?text=${encodeURIComponent(SHARE_TEXT)}`],
  ['Telegram', `https://t.me/share/url?url=${encodeURIComponent(SHARE_TEXT)}`],
  ['X', `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}`],
  ['LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SHARE_TEXT)}`],
  ['Facebook', `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SHARE_TEXT)}`],
];

const FEATURES = [
  {
    title: 'Sans compte',
    text: 'Aucune inscription, aucun numéro, aucune adresse e-mail. Vous ouvrez une session et c’est tout.',
  },
  {
    title: 'Chiffré sur votre appareil',
    text: 'La clé est dérivée du code de session. Les messages sont scellés avant de quitter le navigateur.',
  },
  {
    title: 'Éphémère',
    text: 'Rien n’est écrit sur disque. Fermer la session efface les messages pour tous les participants.',
  },
  {
    title: 'Appels de groupe',
    text: 'Voix en pair-à-pair, micro et casque coupables à tout moment, sons de statut.',
  },
  {
    title: 'Retirer un participant',
    text: 'Le propriétaire de la session peut retirer quelqu’un. La personne ne peut plus revenir.',
  },
  {
    title: 'Invitation QR',
    text: 'Un lien ou un QR code ouvre directement le formulaire avec le code prérempli.',
  },
];

const STEPS = [
  { n: '01', title: 'Ouvrez une session', text: 'Un code à 12 caractères apparaît. Il est la clé.' },
  { n: '02', title: 'Partagez-le', text: 'Lien, code ou QR code, au choix.' },
  { n: '03', title: 'Discutez', text: 'Messages, appels, pseudo modifiable à tout moment.' },
];

export default function Home() {
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window !== 'undefined' ? window.location.origin + '/app' : '/app';

  const copy = () => {
    navigator.clipboard?.writeText(`${SHARE_TEXT} ${shareUrl}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <div className="home">
      <header className="home-nav">
        <a className="home-brand" href="/">
          <SeyraMark size={32} />
          <span>Seyra</span>
        </a>
        <nav>
          <a href="#fonctions">Fonctions</a>
          <a href="#comment">Comment</a>
          <a href="/securite">Sécurité</a>
          <a className="home-cta-small" href="/app">Ouvrir</a>
        </nav>
      </header>

      <section className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow">Messagerie privée, sans compte</p>
          <h1>Une session. Un code. Rien ne reste.</h1>
          <p className="lede">
            Seyra ouvre des conversations privées chiffrées sur l’appareil. Vous partagez un code,
            les autres entrent, la session se ferme quand vous le décidez.
          </p>
          <div className="hero-actions">
            <a className="btn-primary" href="/app">Ouvrir une session</a>
            <a className="btn-ghost" href="/app#rejoindre">Rejoindre avec un code</a>
          </div>
          <ul className="hero-proof">
            <li>Aucun compte</li>
            <li>Aucun historique</li>
            <li>Appels de groupe</li>
          </ul>
        </div>
      </section>

      <section id="fonctions" className="home-section">
        <h2>Ce qui compte</h2>
        <div className="grid-feat">
          {FEATURES.map((f) => (
            <article key={f.title} className="feat">
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="comment" className="home-section alt">
        <h2>Trois gestes</h2>
        <ol className="steps">
          {STEPS.map((s) => (
            <li key={s.n}>
              <span className="step-n">{s.n}</span>
              <div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="securite" className="home-section">
        <h2>Sécurité</h2>
        <div className="sec-grid">
          <div>
            <h3>Clé dérivée du code</h3>
            <p>PBKDF2-SHA256, 210 000 itérations. Le code n’est jamais envoyé au serveur.</p>
          </div>
          <div>
            <h3>Messages scellés</h3>
            <p>XSalsa20-Poly1305 avec un nonce aléatoire par message.</p>
          </div>
          <div>
            <h3>Pas de journal</h3>
            <p>Les sessions vivent en mémoire vive. Un redémarrage efface tout.</p>
          </div>
          <div>
            <h3>Appels chiffrés</h3>
            <p>WebRTC, média chiffré DTLS-SRTP, relais TURN pour les réseaux restrictifs.</p>
          </div>
        </div>
        <p className="sec-more">
          <a className="doc-link" href="/securite">Lire le dossier technique complet : primitives, limites, chiffres, modèle de menace →</a>
        </p>
      </section>

      <section className="home-final">
        <h2>Ouvrez une session maintenant.</h2>
        <a className="btn-primary big" href="/app">Ouvrir une session</a>

        <div className="home-share">
          <p>Partager Seyra</p>
          <div className="share-row">
            {NETWORKS.map(([name, href]) => (
              <a key={name} className="share-chip" href={href} target="_blank" rel="noopener noreferrer">
                {name}
              </a>
            ))}
            <button className="share-chip" onClick={copy}>{copied ? 'Lien copié' : 'Copier le lien'}</button>
          </div>
        </div>
      </section>

      <footer className="home-foot">
        <span>Seyra</span>
        <span>seyra.website</span>
      </footer>
    </div>
  );
}
