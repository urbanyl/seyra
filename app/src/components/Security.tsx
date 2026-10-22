import { SeyraMark } from './Icons';

const NUMBERS: [string, string][] = [
  ['Alphabet du code', '31 symboles — A-Z sans I, L, O, plus 2-9'],
  ['Code', '12 symboles → 31¹² = 787 662 783 788 549 761 ≈ 59,3 bits'],
  ['Dérivation', 'PBKDF2-HMAC-SHA256, 210 000 itérations, sel « seyra.session.v1 »'],
  ['Sortie du KDF', '512 bits → 256 bits de clé + 256 bits d’identifiant de salon'],
  ['Chiffrement', 'XSalsa20-Poly1305 (crypto_secretbox_easy)'],
  ['Nonce', '24 octets aléatoires par message (192 bits)'],
  ['Tag d’authentification', '16 octets'],
  ['Messages par salon', '800 maximum'],
  ['Mémoire par salon', '128 Mo de chiffré maximum'],
  ['Salon vide', 'détruit après 3 minutes'],
  ['Purge des temporaires', 'toutes les 5 secondes côté serveur'],
  ['Participants', '16 par salon, 8 en vocal'],
  ['Débit par connexion', '60 messages / 10 s, 240 trames / 1 s'],
  ['Trame WebSocket max', '3,4 Mo'],
  ['Texte chiffré max', '100 Ko'],
  ['Vocal chiffré max', '3 Mo (≈ 60 s en WAV 12 kHz)'],
  ['Fichier max', '8 Mo (16 morceaux de 512 Ko)'],
  ['Compression photo', 'côté navigateur, 1600 px max, JPEG réglable'],
  ['Trame de morceau', '≈ 915 Ko scellés maximum'],
  ['WebSocket par IP', '12 simultanées'],
  ['Salons par IP', '30 / 10 minutes'],
  ['Identifiants TURN', 'HMAC-SHA1 éphémères, 12 h de validité'],
  ['TLS', '1.2 / 1.3, HSTS 1 an'],
];

function Section({ id, n, title, children }: { id: string; n: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="doc-sec">
      <h2><span>{n}</span>{title}</h2>
      {children}
    </section>
  );
}

export default function Security() {
  return (
    <div className="home doc">
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

      <article className="doc-wrap">
        <p className="eyebrow">Dossier technique · mis à jour avec Seyra 2.0</p>
        <h1>Sécurité : ce que Seyra fait, ce qu’il ne fait pas</h1>
        <p className="doc-lede">
          Pas de slogans. Un modèle de menace, des primitives, des chiffres, et les trous assumés.
          Si tu cherches une page marketing qui promet l’inviolabilité, elle n’est pas ici.
        </p>

        <div className="doc-kpis">
          <div><strong>59,3 bits</strong><span>d’entropie du code</span></div>
          <div><strong>XSalsa20</strong><span>Poly1305, scellement authentifié</span></div>
          <div><strong>0 octet</strong><span>de contenu en clair côté serveur</span></div>
        </div>

        <div className="doc-layout">
        <nav className="doc-toc">
          <a href="#menace">1. Modèle de menace</a>
          <a href="#code">2. Le code est la clé</a>
          <a href="#scellement">3. Le scellement</a>
          <a href="#serveur">4. Ce que le serveur voit</a>
          <a href="#memoire">5. Mémoire et durée de vie</a>
          <a href="#transport">6. Transport et en-têtes</a>
          <a href="#voix">7. Appels vocaux</a>
          <a href="#quantique">8. Quantique</a>
          <a href="#vocaux">9. Vocaux et fichiers</a>
          <a href="#limites">10. Ce qui n’est pas couvert</a>
          <a href="#verifier">11. Vérifier soi-même</a>
          <a href="#chiffres">12. Récapitulatif</a>
        </nav>
        <div className="doc-main">

        <Section id="menace" n="01" title="Modèle de menace">
          <p>
            Le serveur est considéré comme <strong>honnête mais curieux</strong>, et on prévoit le cas
            où il ne le serait plus. Il achemine, il ne doit pas pouvoir lire. Les autres participants
            sont considérés comme non fiables : ils peuvent copier, coller, faire des captures. Le réseau
            est considéré comme hostile, mais TLS est là pour ça.
          </p>
          <p>Ce qu’on protège :</p>
          <ul>
            <li>le contenu des messages, des vocaux, des réponses et des réactions ;</li>
            <li>le fait qu’un message appartienne à un auteur donné (depuis que l’identifiant d’auteur est scellé) ;</li>
            <li>la persistance : rien n’est écrit sur disque, et fermer la session efface côté serveur comme côté clients.</li>
          </ul>
          <p>Ce qu’on ne protège pas, et qu’il faut savoir :</p>
          <ul>
            <li>les métadonnées : qui parle, quand, dans quel salon, de quelle taille ;</li>
            <li>un appareil compromis (keylogger, extension, malware) ;</li>
            <li>un code partagé à la légère, photographié ou envoyé dans un groupe ;</li>
            <li>l’analyse de trafic : les tailles et le rythme des trames parlent ;</li>
            <li>la disponibilité : un seul VPS, pas de sauvegarde, pas de redondance.</li>
          </ul>
          <p className="doc-note">
            Conséquence directe : l’adversaire contre lequel Seyra est réellement solide, c’est
            l’hébergeur, l’administrateur du serveur, ou quiconque récupère une copie du trafic.
            Contre quelqu’un qui contrôle ton téléphone, aucun chiffrement de bout en bout ne sert à grand-chose.
          </p>
        </Section>

        <Section id="code" n="02" title="Le code est la clé, et aussi l’adresse du salon">
          <p>
            Il n’y a pas de comptes, donc pas d’annuaire, donc pas de moyen pour deux navigateurs de
            se retrouver sans se parler avant. La seule information partagée, c’est le code. Il fait
            donc deux choses à la fois : il dérive la clé de chiffrement, et il dérive l’identifiant
            du salon.
          </p>
          <pre className="doc-code">{`code  →  PBKDF2-HMAC-SHA256(210 000, sel fixe)  →  512 bits
                                              ├─ 32 octets : clé XSalsa20-Poly1305
                                              └─ 32 octets : roomId (hex, 64 caractères)`}</pre>
          <p>
            L’alphabet fait 31 symboles : les 26 lettres moins <code>I</code>, <code>L</code> et{' '}
            <code>O</code>, plus les chiffres <code>2</code> à <code>9</code>. Objectif : zéro ambiguïté
            quand quelqu’un lit un code à voix haute ou le recopie. Douze symboles donnent :
          </p>
          <pre className="doc-code">{`31^12 = 787 662 783 788 549 761  ≈  7,9 × 10^17  ≈  59,3 bits`}</pre>
          <p>
            Le sel est <strong>fixe</strong>, et c’est volontaire. Un sel aléatoire par salon imposerait
            de le transmettre avant la dérivation, donc de faire confiance au serveur pour te donner le
            bon sel à chaque connexion. Ici, deux personnes qui tapent le même code calculent exactement
            le même salon, sans aucune coordination. Le prix : la dérivation est déterministe, donc
            attaquable hors ligne dès qu’un attaquant obtient un vérificateur.
          </p>
          <p>
            Et justement, le <code>roomId</code> <em>est</em> ce vérificateur. Le serveur le voit passer
            en clair — il en a besoin pour router. Il peut donc, s’il le veut, tester des codes hors
            ligne : pour chaque candidat, calculer le KDF et comparer les 256 bits du roomId. C’est le
            compromis du modèle sans compte. Avec 59,3 bits et 210 000 itérations par candidat, on parle
            d’un ordre de grandeur de 10⁵ années-GPU pour un salon donné. Ce n’est pas « incassable »,
            c’est hors de portée d’une attaque opportuniste.
          </p>
          <p>
            210 000 itérations, c’est en dessous des 600 000 recommandées par l’OWASP pour PBKDF2-SHA256.
            Assumé : sur un téléphone d’entrée de gamme, la dérivation doit rester supportable, et elle
            se paie à chaque ouverture de session. Argon2id serait meilleur contre le GPU, mais impose
            des paramètres identiques partout et un module supplémentaire à charger. On garde PBKDF2
            parce que c’est une primitive du navigateur, sans dépendance, et facile à vérifier.
          </p>
          <p className="doc-note">
            Le vrai correctif à terme, c’est un PAKE (SPAKE2 ou OPAQUE) : le code ne quitte jamais le
            client et le serveur n’obtient aucun vérificateur utilisable hors ligne. Ce n’est pas
            implémenté aujourd’hui. C’est le chantier le plus sérieux qui reste.
          </p>
        </Section>

        <Section id="scellement" n="03" title="Le scellement des messages">
          <p>
            Chaque message est un objet JSON — texte, clip audio, citation, identifiant d’auteur —
            transformé en chaîne, puis chiffré avec <code>crypto_secretbox_easy</code>. C’est
            XSalsa20 pour le chiffrement et Poly1305 pour l’authentification. Clé de 32 octets,
            nonce aléatoire de 24 octets tiré pour chaque message, tag de 16 octets.
          </p>
          <pre className="doc-code">{`{ "text": "…", "reply": {…}, "from": "p3f2a…" }   →   secretbox
   ↓
{ "cipher": "<base64>", "nonce": "<base64>" }        →   WebSocket`}</pre>
          <p>
            Le nonce est aléatoire, pas un compteur. Sur 192 bits, la probabilité de collision reste
            négligeable même après des milliards de messages. Un compteur serait plus élégant, mais
            imposerait un état partagé entre participants — exactement ce qu’on veut éviter.
          </p>
          <p>
            Poly1305 authentifie le contenu : modifier un octet du ciphertext casse le tag, et le
            message s’affiche comme illisible au lieu d’afficher n’importe quoi. En revanche,
            <code>secretbox</code> n’a pas de données associées : les métadonnées externes (horodatage,
            ordre, présence) ne sont pas couvertes. Un serveur malveillant peut rejouer un message
            valide ou le réordonner. Le contenu reste authentique ; la fraîcheur ne l’est pas.
          </p>
          <p>
            L’identifiant d’auteur, lui, est maintenant <strong>dans</strong> le JSON scellé. Le client
            compare l’auteur déchiffré à celui annoncé par le serveur. S’ils diffèrent, la bulle affiche
            « auteur non vérifié ». Un relais ne peut plus réattribuer un message sans casser le tag.
          </p>
          <p className="doc-note">
            Il n’y a <strong>pas de forward secrecy</strong>. Une seule clé par salon, pas de Double
            Ratchet. Si le code fuite après coup et que quelqu’un a conservé les ciphertexts, il peut
            les ouvrir. C’est le prix du « un code = une session ». Un ratchet casserait la possibilité
            de rejoindre avec un simple code, ou imposerait un échange de clés par participant.
          </p>
        </Section>

        <Section id="serveur" n="04" title="Ce que le serveur voit">
          <p>Il voit, et c’est nécessaire au routage :</p>
          <ul>
            <li>l’identifiant de salon, qui est un dérivé du code ;</li>
            <li>l’identifiant de transfert des fichiers, aléatoire et opaque ;</li>
            <li>le ciphertext et le nonce, en base64 ;</li>
            <li>le type de message (texte, vocal, fichier, réaction, appel), l’horodatage et l’expiration éventuelle ;</li>
            <li>les pseudos, les couleurs d’avatar, qui est connecté, qui est en appel ;</li>
            <li>l’adresse IP, en mémoire vive uniquement, pour le bannissement par salon et le limiteur de débit ;</li>
            <li>la taille de chaque message et son rythme d’arrivée.</li>
          </ul>
          <p>Il ne voit pas :</p>
          <ul>
            <li>le texte, l’audio, les réactions, les citations — tout est dans le cipher ;</li>
            <li>le code lui-même, jamais transmis ;</li>
            <li>le contenu des appels vocaux, qui passent en pair-à-pair chiffré.</li>
          </ul>
          <p>
            La taille des messages fuit de l’information : un vocal de 2,6 Mo et un « ok » ne racontent
            pas la même chose. Il n’y a pas de padding. Un attaquant qui observe le trafic peut deviner
            qu’un long message a été envoyé, et quand.
          </p>
        </Section>

        <Section id="memoire" n="05" title="Mémoire et durée de vie">
          <p>
            Tout tient dans des <code>Map</code> en mémoire. Pas de base de données, pas de fichier,
            pas de log applicatif du contenu. Un redémarrage du processus efface absolument tout,
            y compris les messages qui n’avaient pas encore expiré.
          </p>
          <ul>
            <li>800 messages maximum par salon ; au-delà, les plus anciens sortent de la fenêtre.</li>
            <li>128 Mo de cipher par salon. Un vocal ou un fichier peut peser lourd : au plafond, le message est refusé, pas silencieusement remplacé.</li>
            <li>Un salon sans personne est détruit au bout de 3 minutes.</li>
            <li>Les messages temporaires sont purgés côté serveur toutes les 5 secondes, et côté client par un timer.</li>
            <li>« Fermer la session » détruit le salon immédiatement pour tout le monde.</li>
          </ul>
          <p>
            Le limiteur est par IP : 12 WebSocket simultanées, 30 créations de salon par 10 minutes.
            Par connexion : 60 messages par 10 secondes et 240 trames par seconde. Une trame au-delà
            de 3,4 Mo est jetée avant même d’être analysée.
          </p>
          <p className="doc-note">
            Nuance importante : la mémoire du processus peut être swappée par le noyau. On ne peut pas
            promettre « zéro trace » au niveau du système d’exploitation. Ce qu’on garantit, c’est
            qu’aucune couche applicative n’écrit sur disque.
          </p>
        </Section>

        <Section id="transport" n="06" title="Transport et en-têtes">
          <p>
            nginx termine TLS en 1.2/1.3 avec un certificat Let’s Encrypt renouvelé automatiquement.
            HSTS est posé pour un an. Ensuite, nginx parle à Node en clair sur <code>127.0.0.1</code> :
            c’est la même machine, sur l’interface de bouclage. Quiconque a déjà root sur le VPS lit
            de toute façon la mémoire du processus.
          </p>
          <p>La politique de sécurité du contenu est stricte :</p>
          <pre className="doc-code">{`default-src 'self';
script-src 'self' 'wasm-unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
connect-src 'self' wss:;
media-src 'self' blob:;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';`}</pre>
          <p>
            <code>'wasm-unsafe-eval'</code> est là pour libsodium, qui compile son module WebAssembly.
            Ce n’est pas <code>'unsafe-eval'</code> : l’eval JavaScript reste interdit. Pas de CDN, pas
            de Google Fonts, pas d’analytics, pas de script tiers. Tout est servi par le domaine, donc
            aucun Referer ne part ailleurs.
          </p>
          <p>
            Côté WebSocket, l’origine est vérifiée à l’upgrade : une page d’un autre domaine ne peut pas
            ouvrir de connexion. L’IP réelle est posée par nginx dans <code>X-Real-IP</code>, un en-tête
            que le client ne peut pas forger à travers le proxy.
          </p>
          <p>
            Le service tourne sous l’utilisateur <code>seyra</code> avec <code>NoNewPrivileges</code>,
            <code>PrivateTmp</code> et <code>ProtectSystem=full</code>. La machine est en SELinux
            <em>Enforcing</em>.
          </p>
        </Section>

        <Section id="voix" n="07" title="Appels vocaux">
          <p>
            Le vocal est un maillage WebRTC. Chaque navigateur ouvre une connexion directe avec chaque
            autre, en DTLS-SRTP : le média est chiffré de navigateur à navigateur, le serveur ne relaie
            pas l’audio.
          </p>
          <p>
            La signalisation (SDP, candidats ICE) passe par le WebSocket. Le serveur voit donc les
            adresses candidates et les descriptions de session. Il ne voit pas le son. Pour les réseaux
            restrictifs, coturn relaie le média, avec des identifiants éphémères générés en HMAC-SHA1
            selon la méthode REST de coturn : le secret reste sur le serveur, aucun mot de passe fixe
            n’est embarqué dans le client.
          </p>
          <p className="doc-note">
            En maillage, chaque participant connaît l’IP des autres via les candidats ICE. Si tu ne veux
            pas exposer ton IP à un inconnu du salon, il faut un SFU — ce n’est pas le modèle ici. Le
            plafond de 8 en vocal n’est pas une limite de sécurité, c’est une limite de bande passante
            montante.
          </p>
        </Section>

        <Section id="quantique" n="08" title="Quantique : ce qui tient, ce qui ne tient pas">
          <p>
            Deux algorithmes comptent. <strong>Shor</strong> casse RSA, ECDH et ECDSA. <strong>Grover</strong>{' '}
            donne une accélération quadratique sur la recherche dans un espace de clés, donc divise par
            deux la sécurité d’un chiffrement symétrique.
          </p>
          <p>
            Le contenu est chiffré en symétrique 256 bits. Sous Grover, ça vaut 128 bits : solide. Et
            comme il n’y a <strong>aucun échange de clé asymétrique</strong> dans la couche message, Shor
            ne s’applique pas au contenu. C’est le sens honnête de « semi-quantique » : le ciphertext
            survit à un enregistrement massif puis à un ordinateur quantique, parce qu’il n’y a rien
            d’asymétrique à casser.
          </p>
          <p>
            TLS, lui, utilise ECDHE. Un enregistrement du trafic d’aujourd’hui pourra être déchiffré plus
            tard par Shor. Mais ce qu’on obtient en déchiffrant TLS, c’est le ciphertext du salon. Il faut
            encore Grover sur la clé du salon pour lire quoi que ce soit.
          </p>
          <p>
            Et là, le plafond n’est pas le chiffré, c’est le code : 59,3 bits, soit environ 29,6 bits sous
            Grover. Chaque « itération » de Grover doit en plus exécuter PBKDF2 avec ses 210 000 tours,
            ce qui est hors de portée des machines actuelles. Mais sur le papier, c’est le maillon court.
          </p>
          <p>
            On ne dit pas « post-quantique » parce que ce serait faux : il n’y a pas de ML-KEM ni de
            signature post-quantique dans le chemin. Il n’y en a pas besoin pour le contenu symétrique.
            Le levier le plus simple, si tu veux plus de marge, c’est un code plus long : 20 symboles
            donnent ≈ 99 bits, donc ≈ 49,5 sous Grover, sans changer une ligne de crypto.
          </p>
        </Section>

        <Section id="vocaux" n="09" title="Vocaux et fichiers">
          <p>
            <code>MediaRecorder</code> ne produit pas le même format partout : webm/opus sur Chrome et
            Android, mp4/aac sur Safari. Un vocal enregistré sur l’un n’est pas toujours lisible sur
            l’autre — c’est exactement le bug qu’on a corrigé.
          </p>
          <p>
            À l’arrêt de l’enregistrement, le blob est décodé localement avec <code>decodeAudioData</code>,
            ré-échantillonné en mono 12 kHz via <code>OfflineAudioContext</code>, puis encodé en WAV PCM
            16 bits. Le WAV est lu par tous les navigateurs. Il est ensuite mis en base64 dans la même
            enveloppe que le texte, puis scellé. Double base64 assumé : c’est le coût d’un protocole
            JSON.
          </p>
          <p>
            60 secondes donnent environ 1,44 Mo de WAV, donc à peu près 2,6 Mo de cipher. C’est gros.
            Un transcodage serveur serait plus efficace, mais il est impossible : le serveur n’a pas la
            clé. Si le décodage local échoue, on envoie le blob d’origine plutôt que de perdre le message,
            quitte à ce qu’il ne soit pas lisible partout.
          </p>
          <p>
            Les photos sont compressées <strong>avant</strong> de quitter le navigateur : redimensionnement
            à 1600 px de côté maximum, ré-encodage JPEG avec une qualité réglable (0,6 / 0,82 / 0,95) ou
            envoi de l’original. Une photo de 15 Mo descend facilement sous 200 Ko. On ne garde la version
            compressée que si elle est réellement plus légère.
          </p>
          <p>
            Un fichier, une vidéo ou une photo est découpé en morceaux de 512 Ko. Chaque morceau est
            scellé séparément, avec son propre nonce, et le tout voyage sous un identifiant de transfert
            aléatoire (<code>fid</code>) que le serveur voit sans savoir ce qu’il transporte. À l’arrivée,
            les morceaux sont déchiffrés, comptés, puis recollés en <code>Blob</code> local. Une barre de
            progression affiche l’avancement, et rien n’est écrit sur disque.
          </p>
          <p>
            Plafond : 8 Mo par fichier, soit 16 morceaux. Les vidéos ne sont <strong>pas</strong>
            recompressées dans le navigateur : il faudrait un encodeur complet (H.264) embarqué, lourd et
            lent sur téléphone. Une vidéo trop longue doit être raccourcie ou compressée avant l’envoi.
          </p>
          <p className="doc-note">
            Supprimer un fichier efface d’un coup les métadonnées et tous ses morceaux, côté serveur
            comme chez chaque participant. L’aperçu local (URL de blob) est révoqué immédiatement.
          </p>
        </Section>

        <Section id="limites" n="10" title="Ce qui n’est pas couvert">
          <ul>
            <li><strong>Pas de forward secrecy.</strong> Une clé par salon, pas de ratchet.</li>
            <li><strong>Pas de PAKE.</strong> Le roomId sert de vérificateur au serveur.</li>
            <li><strong>Pas de padding.</strong> Les tailles de messages sont visibles.</li>
            <li><strong>Vidéos non recompressées.</strong> Plafond de 8 Mo ; au-delà, il faut compresser avant l’envoi.</li>
            <li><strong>Pas de signature d’appareil.</strong> Deux personnes avec le même code sont dans le même salon ; rien ne prouve qui est derrière un pseudo.</li>
            <li><strong>Pas de protection contre un participant.</strong> Il peut copier, capturer, réenvoyer.</li>
            <li><strong>Pas de récupération.</strong> Code perdu = session perdue. Pas de compte, pas de secours.</li>
            <li><strong>Pas d’audit externe à ce jour.</strong> Le code n’est pas public pour l’instant.</li>
            <li><strong>Un seul VPS.</strong> Panne ou coupure = service indisponible. Aucune sauvegarde, par choix.</li>
          </ul>
          <p>
            Cette liste n’est pas une excuse. C’est ce qu’il faut lire avant de confier quelque chose
            d’important à une session.
          </p>
        </Section>

        <Section id="verifier" n="11" title="Vérifier soi-même">
          <p>Tu n’es pas obligé de nous croire. Quelques manipulations suffisent :</p>
          <ul>
            <li>Ouvre les DevTools, onglet Réseau, filtre WS. Tu verras passer <code>{'{"t":"msg","cipher":"…","nonce":"…"}'}</code> en base64. Aucun texte lisible.</li>
            <li>Inspecte les en-têtes de <code>/app</code> : CSP, HSTS, COOP, CORP, X-Frame-Options.</li>
            <li><code>curl -sI https://seyra.website/app</code> depuis un terminal.</li>
            <li>Ferme la session : les messages disparaissent pour tous les participants.</li>
            <li>Redémarre le service côté serveur : tout est perdu, y compris les messages non expirés.</li>
          </ul>
          <p>
            Si tu trouves une faille, le mieux est de le signaler discrètement à l’opérateur du site
            avant d’en parler publiquement. Ce dossier sera mis à jour avec les corrections.
          </p>
        </Section>

        <Section id="chiffres" n="12" title="Récapitulatif">
          <div className="doc-kv">
            {NUMBERS.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </div>
        </Section>

        <div className="doc-end">
          <p>Dernière mise à jour : octobre 2026.</p>
          <a className="btn-primary" href="/app">Ouvrir une session</a>
        </div>
        </div>
        </div>
      </article>

      <footer className="home-foot">
        <span>Seyra</span>
        <a href="/">seyra.website</a>
      </footer>
    </div>
  );
}
