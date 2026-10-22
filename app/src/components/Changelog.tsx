import { SeyraMark } from './Icons';

const RELEASES: { version: string; date: string; title: string; items: string[] }[] = [
  {
    version: '2.2',
    date: 'octobre 2026',
    title: 'Caméra, édition et animateurs',
    items: [
      'Caméra pendant un appel, jusqu’à 4 personnes, en 640 × 360. Bouton dédié dans la bulle d’appel.',
      'Édition de vos messages texte, avec la mention « modifié ». Seul l’auteur peut modifier.',
      'Accusés de lecture, choisis à la création de la session. Invisibles si l’option est désactivée.',
      'Animateurs : le propriétaire en désigne, et ils peuvent retirer un invité.',
      'Recherche filtrable par expéditeur et par type : photos, vidéos, fichiers, vocaux, sondages.',
      'Nouvelle page d’accueil et nouvelle page de nouveautés.',
    ],
  },
  {
    version: '2.1.1',
    date: 'octobre 2026',
    title: 'Corrections',
    items: [
      'Désépingler fonctionne : un second clic retire le message des épingles, chez tous les participants.',
      'Mentions avec un pseudo à espaces (« @Invité 1 ») sont reconnues en entier.',
      'En-tête de session lisible sur téléphone étroit.',
      'Déploiement : types et tests passent avant chaque mise en ligne.',
    ],
  },
  {
    version: '2.1',
    date: 'octobre 2026',
    title: 'Sondages et fil de discussion',
    items: [
      'Sondages : tapez /sondage Question | option | option. Le vote est chiffré, le décompte visible de tous.',
      'Fil de discussion : un message qui a des réponses affiche un bouton « Voir le fil ».',
    ],
  },
  {
    version: '2.0',
    date: 'octobre 2026',
    title: 'Seyra 2.0',
    items: [
      'Messages épinglés, visibles en haut de la session pour tous.',
      'Mentions @pseudo, avec surbrillance et son dédié.',
      'Partage d’écran refait : fermer, masquer, plein écran et rouvrir, son coupé quand c’est fermé.',
      'Fonds de conversation redessinés, mode clair lisible, réglages regroupés.',
      'Panneau de session : durée, messages, fichiers et lien d’invitation.',
      'Recherche avec Ctrl+F, aide des raccourcis avec ?.',
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
    <div className="changelog home">
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
        <p className="section-kicker">Nouveautés</p>
        <h1>Ce qui change</h1>
        <p className="cl-lede">Chaque version est testée avant publication. La plus récente est en haut.</p>

        <div className="cl-timeline">
          {RELEASES.map((r, i) => (
            <section key={r.version} className={`cl-release ${i === 0 ? 'latest' : ''}`}>
              <div className="cl-card">
                <div className="cl-meta">
                  <span className="cl-version">{r.version}</span>
                  <span>{r.date}</span>
                  {i === 0 && <span className="cl-new">Dernière</span>}
                </div>
                <h2>{r.title}</h2>
                <ul>
                  {r.items.map((it) => <li key={it}>{it}</li>)}
                </ul>
              </div>
            </section>
          ))}
        </div>

        <a className="btn-primary cl-cta" href="/app">Ouvrir une session</a>
      </main>
    </div>
  );
}
