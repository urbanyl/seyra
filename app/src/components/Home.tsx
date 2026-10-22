import { useState } from 'react';
import { IconCamera, IconLock, IconPhone, IconPin, IconTimer, IconUsers, SeyraMark } from './Icons';

const SHARE_TEXT = 'Seyra — sessions privées chiffrées. Un code suffit, rien n’est conservé.';

const NETWORKS: [string, string][] = [
  ['WhatsApp', `https://wa.me/?text=${encodeURIComponent(SHARE_TEXT)}`],
  ['Telegram', `https://t.me/share/url?url=${encodeURIComponent(SHARE_TEXT)}`],
  ['X', `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}`],
  ['LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SHARE_TEXT)}`],
  ['Facebook', `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SHARE_TEXT)}`],
];

const FEATURES: { title: string; text: string; icon: (p: { size?: number }) => JSX.Element }[] = [
  { title: 'Sans compte', text: 'Aucune inscription, aucun numéro, aucune adresse e-mail. Ouvrez une session et c’est tout.', icon: IconUsers },
  { title: 'Chiffré sur votre appareil', text: 'La clé est dérivée du code. Les messages sont scellés avant de quitter le navigateur.', icon: IconLock },
  { title: 'Éphémère', text: 'Rien n’est écrit sur disque. Fermer la session efface tout, pour tous les participants.', icon: IconTimer },
  { title: 'Appels et caméra', text: 'Voix en pair-à-pair, caméra et partage d’écran avec le son. Micro et casque coupables à tout moment.', icon: IconCamera },
  { title: 'Sondages et fil', text: 'Lancez un sondage en une commande, répondez en fil. Les votes restent chiffrés.', icon: IconPin },
  { title: 'Animateurs', text: 'Le propriétaire désigne des animateurs. Accusés de lecture optionnels, choisis à la création.', icon: IconPhone },
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
          <a href="/nouveautes">Nouveautés</a>
          <a className="home-cta-small" href="/app">Ouvrir</a>
        </nav>
      </header>

      <a className="v2-announce" href="/nouveautes">
        <span className="v2-badge">Seyra 2.2</span>
        <span className="v2-text">
          <strong>Caméra, édition de messages, accusés de lecture et animateurs</strong>
          Recherche par expéditeur et par type, et une nouvelle page de nouveautés.
        </span>
        <span className="v2-go">Voir les nouveautés →</span>
      </a>

      <section className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow">Messagerie privée, sans compte</p>
          <h1>Une session. Un code. <span className="grad">Rien ne reste.</span></h1>
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

        <div className="hero-visual" aria-hidden="true">
          <div className="mock">
            <div className="mock-head">
              <span className="mock-live" />
              <span>Session privée</span>
              <em>3 connectés</em>
            </div>
            <div className="mock-code">K7Q2 · MX9A · PD4R</div>
            <div className="mock-msg in">Qui apporte les plans ?</div>
            <div className="mock-msg out">Je les envoie, ils restent chiffrés.</div>
            <div className="mock-poll">
              <b>Pizza ce soir ?</b>
              <div className="mock-bar"><span style={{ width: '72%' }} /><em>Oui · 3</em></div>
              <div className="mock-bar alt"><span style={{ width: '28%' }} /><em>Non · 1</em></div>
            </div>
            <div className="mock-foot"><IconLock size={12} /> Le serveur ne voit rien</div>
          </div>
        </div>
      </section>

      <section id="fonctions" className="home-section">
        <p className="section-kicker">Fonctions</p>
        <h2>Ce qui compte</h2>
        <div className="grid-feat">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <article key={f.title} className="feat">
                <span className="feat-icon"><Icon size={20} /></span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="comment" className="home-section alt">
        <p className="section-kicker">Comment</p>
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
        <p className="section-kicker">Sécurité</p>
        <h2>Ce qui est chiffré, et comment</h2>
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
