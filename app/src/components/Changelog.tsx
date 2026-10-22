import { SeyraMark } from './Icons';

const RELEASES: { version: string; date: string; title: string; items: string[] }[] = [
  {
    version: '2.1',
    date: 'octobre 2026',
    title: 'Sondages, fil et note partagée',
    items: [
      'Sondages : tapez /sondage Question | option | option. Le vote est chiffré et le décompte est visible de tous.',
      'Fil de discussion : un message qui a des réponses affiche un bouton « Voir le fil ».',
      'Note partagée dans le panneau de session : un bloc commun, chiffré, la plus récente version gagne.',
      'Tests automatisés (Vitest) sur le pseudo, les mentions, les codes et les sondages.',
    ],
  },
  {
    version: '2.0',
    date: 'octobre 2026',
    title: 'Seyra 2.0',
    items: [
      'Messages épinglés : un message important reste visible en haut de la session, pour tous.',
      'Mentions @pseudo : surbrillance et son dédié quand on vous cite.',
      'Partage d’écran refait : fermer, masquer, plein écran et rouvrir, avec le son coupé quand c’est fermé.',
      'Fonds de conversation redessinés, mode clair lisible, réglages regroupés.',
      'Panneau de session : durée, messages, fichiers et lien d’invitation en un geste.',
      'Recherche avec Ctrl+F, aide des raccourcis avec ?.',
      'Sessions récentes sur cet appareil (opt-in, rien n’est envoyé).',
    ],
  },
  {
    version: '1.4',
    date: 'octobre 2026',
    title: 'Fichiers, photos et vidéos',
    items: [
      'Envoi de fichiers jusqu’à 8 Mo, découpés et chiffrés par morceaux.',
      'Photos compressées avant envoi, métadonnées EXIF retirées.',
      'Coller une image depuis le presse-papiers (Ctrl+V).',
      'Suppression en cascade : un fichier disparaît entièrement.',
    ],
  },
  {
    version: '1.3',
    date: 'septembre 2026',
    title: 'Appels et sécurité',
    items: [
      'Appels de groupe en pair-à-pair avec relais TURN de secours.',
      'Mot de passe de session optionnel, jamais envoyé au serveur.',
      'Historique masqué par défaut pour les nouveaux arrivants.',
      'Dossier de sécurité publié sur /securite.',
    ],
  },
];

export default function Changelog() {
  return (
    <div className="changelog">
      <header className="home-nav">
        <a className="home-brand" href="/">
          <SeyraMark size={32} />
          <span>Seyra</span>
        </a>
        <nav>
          <a href="/securite">Sécurité</a>
          <a className="home-cta-small" href="/app">Ouvrir</a>
        </nav>
      </header>

      <main className="cl-main">
        <p className="eyebrow">Nouveautés</p>
        <h1>Ce qui change</h1>
        <p className="cl-lede">Chaque version est testée en production avant publication.</p>

        {RELEASES.map((r, i) => (
          <section key={r.version} className={`cl-release ${i === 0 ? 'latest' : ''}`}>
            <div className="cl-meta">
              <span className="cl-version">{r.version}</span>
              <span className="cl-date">{r.date}</span>
              {i === 0 && <span className="cl-new">Dernière</span>}
            </div>
            <h2>{r.title}</h2>
            <ul>
              {r.items.map((it) => <li key={it}>{it}</li>)}
            </ul>
          </section>
        ))}

        <a className="btn-primary cl-cta" href="/app">Ouvrir une session</a>
      </main>
    </div>
  );
}
