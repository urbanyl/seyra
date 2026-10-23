/* Contenu du dossier de sécurité, en anglais et en français.
 * Les autres langues retombent sur l'anglais (voir Security.tsx).
 * Mini-balisage : **gras**, `code`.
 */

export type Block =
  | { t: 'p'; v: string }
  | { t: 'ul'; v: string[] }
  | { t: 'pre'; v: string }
  | { t: 'note'; v: string };

export type Sec = { id: string; n: string; title: string; blocks: Block[] };

export type Doc = {
  eyebrow: string;
  h1: string;
  lede: string;
  kpis: { k: string; v: string }[];
  sections: Sec[];
  numbers: [string, string][];
  updated: string;
  cta: string;
};

const CODE_HEX = `code  →  PBKDF2-HMAC-SHA256(210,000, fixed salt)  →  512 bits
                                              ├─ 32 bytes: XSalsa20-Poly1305 key
                                              └─ 32 bytes: roomId (hex, 64 characters)`;

const SEAL = `{ "text": "…", "reply": {…}, "from": "p3f2a…" }   →   secretbox
   ↓
{ "cipher": "<base64>", "nonce": "<base64>" }        →   WebSocket`;

const CSP = `default-src 'self';
script-src 'self' 'wasm-unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
connect-src 'self' wss:;
media-src 'self' blob:;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';`;

const ENTROPY = `31^12 = 787,662,783,788,549,761  ≈  7.9 × 10^17  ≈  59.3 bits`;

const en: Doc = {
  eyebrow: 'Technical dossier · updated with Seyra 2.3',
  h1: 'Security: what Seyra does, and what it does not',
  lede: 'No slogans. A threat model, primitives, numbers, and the gaps we accept. If you want a marketing page promising invulnerability, this is not it.',
  kpis: [
    { k: '59.3 bits', v: 'of entropy in the code' },
    { k: 'XSalsa20', v: 'Poly1305, authenticated sealing' },
    { k: '0 bytes', v: 'of plaintext content on the server' },
  ],
  sections: [
    {
      id: 'menace', n: '01', title: 'Threat model',
      blocks: [
        { t: 'p', v: 'The server is treated as **honest but curious**, and we plan for the case where it stops being honest. It routes traffic; it must not be able to read. Other participants are treated as untrusted: they can copy, paste and take screenshots. The network is treated as hostile, which is what TLS is for.' },
        { t: 'p', v: 'What we protect:' },
        { t: 'ul', v: [
          'the content of messages, voice notes, replies and reactions;',
          'the fact that a message belongs to a given author (since the author id is sealed);',
          'persistence: nothing is written to disk, and closing the session erases both server and client sides.',
        ] },
        { t: 'p', v: 'What we do not protect, and you should know:' },
        { t: 'ul', v: [
          'metadata: who talks, when, in which room, and how much;',
          'a compromised device (keylogger, extension, malware);',
          'a code shared carelessly, photographed or posted in a group;',
          'traffic analysis: sizes and timing tell a story;',
          'availability: one VPS, no backup, no redundancy.',
        ] },
        { t: 'note', v: 'Direct consequence: the adversary Seyra is genuinely solid against is the hosting provider, the server administrator, or anyone who captures a copy of the traffic. Against someone who controls your phone, no end-to-end encryption helps much.' },
      ],
    },
    {
      id: 'code', n: '02', title: 'The code is the key, and the room address',
      blocks: [
        { t: 'p', v: 'There are no accounts, so no directory, so no way for two browsers to find each other without talking first. The only shared information is the code. It therefore does two things at once: it derives the encryption key, and it derives the room identifier.' },
        { t: 'pre', v: CODE_HEX },
        { t: 'p', v: 'The alphabet has 31 symbols: the 26 letters minus `I`, `L` and `O`, plus the digits `2` to `9`. The goal is zero ambiguity when someone reads a code aloud or copies it. Twelve symbols give:' },
        { t: 'pre', v: ENTROPY },
        { t: 'p', v: 'The salt is **fixed**, deliberately. A random per-room salt would have to be sent before derivation, which means trusting the server to hand you the right salt on every connection. Here, two people typing the same code compute exactly the same room, with no coordination. The price: derivation is deterministic, so it is attackable offline as soon as an attacker obtains a verifier.' },
        { t: 'p', v: 'And the `roomId` **is** that verifier. The server sees it in clear — it needs it to route. So it can test codes offline if it wants: for each candidate, run the KDF and compare the 256 bits of the roomId. That is the trade-off of the accountless model. With 59.3 bits and 210,000 iterations per candidate, we are talking about an order of magnitude of 10⁵ GPU-years for a given room. Not "unbreakable", but out of reach for an opportunistic attack.' },
        { t: 'p', v: '210,000 iterations is below the 600,000 recommended by OWASP for PBKDF2-SHA256. Accepted: on a low-end phone the derivation has to stay bearable, and it is paid on every session open. Argon2id would be better against GPUs, but it forces identical parameters everywhere and an extra module to load. We keep PBKDF2 because it is a browser primitive, dependency-free, and easy to verify.' },
        { t: 'note', v: 'The real long-term fix is a PAKE (SPAKE2 or OPAQUE): the code never leaves the client and the server gets no verifier usable offline. It is not implemented today. It is the most serious piece of work left.' },
      ],
    },
    {
      id: 'scellement', n: '03', title: 'Sealing messages',
      blocks: [
        { t: 'p', v: 'Each message is a JSON object — text, audio clip, quote, author id — turned into a string, then encrypted with `crypto_secretbox_easy`. XSalsa20 for encryption, Poly1305 for authentication. A 32-byte key, a random 24-byte nonce drawn per message, and a 16-byte tag.' },
        { t: 'pre', v: SEAL },
        { t: 'p', v: 'The nonce is random, not a counter. Over 192 bits, the collision probability stays negligible even after billions of messages. A counter would be more elegant, but it would require shared state between participants — exactly what we want to avoid.' },
        { t: 'p', v: 'Poly1305 authenticates the content: changing one byte of ciphertext breaks the tag, and the message shows as unreadable instead of showing garbage. However, `secretbox` has no associated data: external metadata (timestamp, order, presence) is not covered. A malicious server can replay a valid message or reorder it. The content stays authentic; freshness does not.' },
        { t: 'p', v: 'The author id is now **inside** the sealed JSON. The client compares the decrypted author with the one announced by the server. If they differ, the bubble shows "unverified author". A relay can no longer reassign a message without breaking the tag.' },
        { t: 'note', v: 'There is **no forward secrecy**. One key per room, no Double Ratchet. If the code leaks afterwards and someone kept the ciphertexts, they can open them. That is the price of "one code = one session". A ratchet would break joining with a simple code, or force a key exchange per participant.' },
      ],
    },
    {
      id: 'serveur', n: '04', title: 'What the server sees',
      blocks: [
        { t: 'p', v: 'It sees, and this is required for routing:' },
        { t: 'ul', v: [
          'the room identifier, which is derived from the code;',
          'the file transfer identifier, random and opaque;',
          'the ciphertext and nonce, in base64;',
          'the message type (text, voice, file, reaction, call), the timestamp and any expiry;',
          'names, avatar colours, who is connected, who is in a call;',
          'the IP address, in RAM only, for per-room banning and rate limiting;',
          'the size of each message and its arrival rate.',
        ] },
        { t: 'p', v: 'It does not see:' },
        { t: 'ul', v: [
          'the text, audio, reactions or quotes — all inside the cipher;',
          'the code itself, never transmitted;',
          'the content of voice calls, which travel peer-to-peer, encrypted.',
        ] },
        { t: 'p', v: 'Message size leaks information: a 2.6 MB voice note and an "ok" do not tell the same story. There is no padding. An attacker watching the traffic can guess that a long message was sent, and when.' },
      ],
    },
    {
      id: 'memoire', n: '05', title: 'Memory and lifetime',
      blocks: [
        { t: 'p', v: 'Everything lives in in-memory `Map`s. No database, no file, no application log of content. Restarting the process erases absolutely everything, including messages that had not expired yet.' },
        { t: 'ul', v: [
          'At most 800 messages per room; beyond that, the oldest fall out of the window.',
          '128 MB of ciphertext per room. A voice note or a file can be heavy: at the ceiling the message is refused, not silently replaced.',
          'A room with nobody in it is destroyed after 3 minutes.',
          'Temporary messages are purged server-side every 5 seconds, and client-side by a timer.',
          '"Close session" destroys the room immediately for everyone.',
        ] },
        { t: 'p', v: 'The limiter is per IP: 12 simultaneous WebSockets, 30 room creations per 10 minutes. Per connection: 60 messages per 10 seconds and 240 frames per second. A frame above 3.4 MB is dropped before it is even parsed.' },
        { t: 'note', v: 'Important nuance: process memory can be swapped by the kernel. We cannot promise "zero trace" at the operating-system level. What we guarantee is that no application layer writes to disk.' },
      ],
    },
    {
      id: 'transport', n: '06', title: 'Transport and headers',
      blocks: [
        { t: 'p', v: 'nginx terminates TLS 1.2/1.3 with an automatically renewed Let’s Encrypt certificate. HSTS is set for one year. nginx then talks to Node in clear on `127.0.0.1`: same machine, loopback interface. Anyone with root on the VPS can read process memory anyway.' },
        { t: 'p', v: 'The content security policy is strict:' },
        { t: 'pre', v: CSP },
        { t: 'p', v: '`\'wasm-unsafe-eval\'` exists for libsodium, which compiles its WebAssembly module. It is not `\'unsafe-eval\'`: JavaScript eval stays forbidden. No CDN, no Google Fonts, no analytics, no third-party script. Everything is served by the domain, so no Referer leaves.' },
        { t: 'p', v: 'On the WebSocket side, the origin is checked at upgrade: a page from another domain cannot open a connection. The real IP is set by nginx in `X-Real-IP`, a header the client cannot forge through the proxy.' },
        { t: 'p', v: 'The service runs as the `seyra` user with `NoNewPrivileges`, `PrivateTmp` and `ProtectSystem=full`. The machine runs SELinux in *Enforcing* mode.' },
      ],
    },
    {
      id: 'voix', n: '07', title: 'Voice calls',
      blocks: [
        { t: 'p', v: 'Voice is a WebRTC mesh. Each browser opens a direct connection to every other, in DTLS-SRTP: media is encrypted browser to browser, and the server does not relay audio.' },
        { t: 'p', v: 'Signalling (SDP, ICE candidates) goes through the WebSocket. So the server sees candidate addresses and session descriptions. It does not see the sound. For restrictive networks, coturn relays the media, with ephemeral credentials generated in HMAC-SHA1 using coturn’s REST method: the secret stays on the server, and no fixed password is embedded in the client.' },
        { t: 'note', v: 'In a mesh, each participant learns the others’ IPs through ICE candidates. If you do not want to expose your IP to a stranger in the room, you need an SFU — that is not the model here. The cap of 8 in voice is not a security limit, it is an uplink bandwidth limit.' },
      ],
    },
    {
      id: 'quantique', n: '08', title: 'Quantum: what holds, what does not',
      blocks: [
        { t: 'p', v: 'Two algorithms matter. **Shor** breaks RSA, ECDH and ECDSA. **Grover** gives a quadratic speed-up on key-space search, so it halves the security of symmetric encryption.' },
        { t: 'p', v: 'Content is encrypted with 256-bit symmetric crypto. Under Grover that is worth 128 bits: solid. And since there is **no asymmetric key exchange** in the message layer, Shor does not apply to the content. That is the honest meaning of "semi-quantum": the ciphertext survives a mass recording and then a quantum computer, because there is nothing asymmetric to break.' },
        { t: 'p', v: 'TLS, however, uses ECDHE. A recording of today’s traffic could be decrypted later by Shor. But what you get from decrypting TLS is the room ciphertext. You still need Grover on the room key before reading anything.' },
        { t: 'p', v: 'And there the ceiling is not the cipher, it is the code: 59.3 bits, about 29.6 bits under Grover. Each Grover "iteration" must also run PBKDF2 with its 210,000 rounds, which is out of reach for current machines. But on paper, that is the short link.' },
        { t: 'p', v: 'We do not say "post-quantum" because that would be false: there is no ML-KEM or post-quantum signature in the path. There is no need for it with symmetric content. The simplest lever, if you want more margin, is a longer code: 20 symbols give ≈ 99 bits, so ≈ 49.5 under Grover, without changing a line of crypto.' },
      ],
    },
    {
      id: 'vocaux', n: '09', title: 'Voice notes and files',
      blocks: [
        { t: 'p', v: '`MediaRecorder` does not produce the same format everywhere: webm/opus on Chrome and Android, mp4/aac on Safari. A voice note recorded on one is not always playable on the other — exactly the bug we fixed.' },
        { t: 'p', v: 'When recording stops, the blob is decoded locally with `decodeAudioData`, resampled to 12 kHz mono via `OfflineAudioContext`, then encoded as 16-bit PCM WAV. WAV plays in every browser. It is then base64-encoded into the same envelope as text, then sealed. Double base64 accepted: that is the cost of a JSON protocol.' },
        { t: 'p', v: '60 seconds gives about 1.44 MB of WAV, so roughly 2.6 MB of ciphertext. That is heavy. Server-side transcoding would be more efficient but is impossible: the server does not have the key. If local decoding fails, we send the original blob rather than lose the message, even if it is not playable everywhere.' },
        { t: 'p', v: 'Photos are compressed **before** leaving the browser: resized to 1600 px on the longest side, re-encoded as JPEG with an adjustable quality (0.6 / 0.82 / 0.95), or sent as the original. A 15 MB photo easily drops below 200 KB. The compressed version is kept only if it is actually lighter.' },
        { t: 'p', v: 'A file, a video or a photo is split into 512 KB chunks. Each chunk is sealed separately, with its own nonce, and the whole thing travels under a random transfer identifier (`fid`) that the server sees without knowing what it carries. On arrival, chunks are decrypted, counted, then reassembled into a local `Blob`. A progress bar shows the state, and nothing is written to disk.' },
        { t: 'p', v: 'Ceiling: 8 MB per file, so 16 chunks. Videos are **not** recompressed in the browser: that would require a full encoder (H.264) embedded, heavy and slow on phones. A video that is too long must be shortened or compressed before sending.' },
        { t: 'note', v: 'Deleting a file wipes the metadata and all its chunks at once, on the server and at every participant. The local preview (blob URL) is revoked immediately.' },
      ],
    },
    {
      id: 'limites', n: '10', title: 'What is not covered',
      blocks: [
        { t: 'ul', v: [
          '**No forward secrecy.** One key per room, no ratchet.',
          '**No PAKE.** The roomId acts as a verifier for the server.',
          '**No padding.** Message sizes are visible.',
          '**Videos are not recompressed.** 8 MB cap; beyond that, compress before sending.',
          '**No device signature.** Two people with the same code are in the same room; nothing proves who is behind a name.',
          '**No protection against a participant.** They can copy, capture, forward.',
          '**No recovery.** Lost code = lost session. No account, no backup.',
          '**No external audit to date.** The code is not public yet.',
          '**One VPS.** A failure or outage means the service is unavailable. No backups, by choice.',
        ] },
        { t: 'p', v: 'This list is not an excuse. It is what you should read before trusting a session with something important.' },
      ],
    },
    {
      id: 'verifier', n: '11', title: 'Check it yourself',
      blocks: [
        { t: 'p', v: 'You do not have to take our word for it. A few steps are enough:' },
        { t: 'ul', v: [
          'Open DevTools, Network tab, filter WS. You will see `{"t":"msg","cipher":"…","nonce":"…"}` go by in base64. No readable text.',
          'Inspect the headers of `/app`: CSP, HSTS, COOP, CORP, X-Frame-Options.',
          'Run `curl -sI https://seyra.website/app` from a terminal.',
          'Close the session: messages disappear for every participant.',
          'Restart the service: everything is lost, including messages that had not expired.',
        ] },
        { t: 'p', v: 'If you find a flaw, the best move is to report it discreetly to the site operator before talking about it publicly. This dossier will be updated with fixes.' },
      ],
    },
    {
      id: 'chiffres', n: '12', title: 'Summary',
      blocks: [],
    },
  ],
  numbers: [
    ['Code alphabet', '31 symbols — A-Z without I, L, O, plus 2-9'],
    ['Code', '12 symbols → 31¹² = 787,662,783,788,549,761 ≈ 59.3 bits'],
    ['Derivation', 'PBKDF2-HMAC-SHA256, 210,000 iterations, salt "seyra.session.v1"'],
    ['KDF output', '512 bits → 256-bit key + 256-bit room identifier'],
    ['Encryption', 'XSalsa20-Poly1305 (crypto_secretbox_easy)'],
    ['Nonce', '24 random bytes per message (192 bits)'],
    ['Auth tag', '16 bytes'],
    ['Messages per room', '800 maximum'],
    ['Memory per room', '128 MB of ciphertext maximum'],
    ['Empty room', 'destroyed after 3 minutes'],
    ['Temporary purge', 'every 5 seconds on the server'],
    ['Participants', '16 per room, 8 in voice'],
    ['Rate per connection', '60 messages / 10 s, 240 frames / 1 s'],
    ['Max WebSocket frame', '3.4 MB'],
    ['Max ciphertext (text)', '100 KB'],
    ['Max ciphertext (voice)', '3 MB (≈ 60 s in 12 kHz WAV)'],
    ['Max file', '8 MB (16 chunks of 512 KB)'],
    ['Photo compression', 'in the browser, 1600 px max, adjustable JPEG'],
    ['Chunk frame', '≈ 915 KB sealed maximum'],
    ['WebSockets per IP', '12 simultaneous'],
    ['Rooms per IP', '30 / 10 minutes'],
    ['TURN credentials', 'ephemeral HMAC-SHA1, 12 h validity'],
    ['TLS', '1.2 / 1.3, HSTS 1 year'],
  ],
  updated: 'Last updated: October 2026.',
  cta: 'Open a session',
};

const fr: Doc = {
  ...en,
  eyebrow: 'Dossier technique · mis à jour avec Seyra 2.3',
  h1: 'Sécurité : ce que Seyra fait, ce qu’il ne fait pas',
  lede: 'Pas de slogans. Un modèle de menace, des primitives, des chiffres, et les trous assumés. Si tu cherches une page marketing qui promet l’inviolabilité, elle n’est pas ici.',
  kpis: [
    { k: '59,3 bits', v: 'd’entropie du code' },
    { k: 'XSalsa20', v: 'Poly1305, scellement authentifié' },
    { k: '0 octet', v: 'de contenu en clair côté serveur' },
  ],
  sections: [
    {
      id: 'menace', n: '01', title: 'Modèle de menace',
      blocks: [
        { t: 'p', v: 'Le serveur est considéré comme **honnête mais curieux**, et on prévoit le cas où il ne le serait plus. Il achemine, il ne doit pas pouvoir lire. Les autres participants sont considérés comme non fiables : ils peuvent copier, coller, faire des captures. Le réseau est considéré comme hostile, mais TLS est là pour ça.' },
        { t: 'p', v: 'Ce qu’on protège :' },
        { t: 'ul', v: [
          'le contenu des messages, des vocaux, des réponses et des réactions ;',
          'le fait qu’un message appartienne à un auteur donné (depuis que l’identifiant d’auteur est scellé) ;',
          'la persistance : rien n’est écrit sur disque, et fermer la session efface côté serveur comme côté clients.',
        ] },
        { t: 'p', v: 'Ce qu’on ne protège pas, et qu’il faut savoir :' },
        { t: 'ul', v: [
          'les métadonnées : qui parle, quand, dans quel salon, de quelle taille ;',
          'un appareil compromis (keylogger, extension, malware) ;',
          'un code partagé à la légère, photographié ou envoyé dans un groupe ;',
          'l’analyse de trafic : les tailles et le rythme des trames parlent ;',
          'la disponibilité : un seul VPS, pas de sauvegarde, pas de redondance.',
        ] },
        { t: 'note', v: 'Conséquence directe : l’adversaire contre lequel Seyra est réellement solide, c’est l’hébergeur, l’administrateur du serveur, ou quiconque récupère une copie du trafic. Contre quelqu’un qui contrôle ton téléphone, aucun chiffrement de bout en bout ne sert à grand-chose.' },
      ],
    },
    {
      id: 'code', n: '02', title: 'Le code est la clé, et aussi l’adresse du salon',
      blocks: [
        { t: 'p', v: 'Il n’y a pas de comptes, donc pas d’annuaire, donc pas de moyen pour deux navigateurs de se retrouver sans se parler avant. La seule information partagée, c’est le code. Il fait donc deux choses à la fois : il dérive la clé de chiffrement, et il dérive l’identifiant du salon.' },
        { t: 'pre', v: CODE_HEX },
        { t: 'p', v: 'L’alphabet fait 31 symboles : les 26 lettres moins `I`, `L` et `O`, plus les chiffres `2` à `9`. Objectif : zéro ambiguïté quand quelqu’un lit un code à voix haute ou le recopie. Douze symboles donnent :' },
        { t: 'pre', v: ENTROPY },
        { t: 'p', v: 'Le sel est **fixe**, et c’est volontaire. Un sel aléatoire par salon imposerait de le transmettre avant la dérivation, donc de faire confiance au serveur pour te donner le bon sel à chaque connexion. Ici, deux personnes qui tapent le même code calculent exactement le même salon, sans aucune coordination. Le prix : la dérivation est déterministe, donc attaquable hors ligne dès qu’un attaquant obtient un vérificateur.' },
        { t: 'p', v: 'Et justement, le `roomId` **est** ce vérificateur. Le serveur le voit passer en clair — il en a besoin pour router. Il peut donc, s’il le veut, tester des codes hors ligne : pour chaque candidat, calculer le KDF et comparer les 256 bits du roomId. C’est le compromis du modèle sans compte. Avec 59,3 bits et 210 000 itérations par candidat, on parle d’un ordre de grandeur de 10⁵ années-GPU pour un salon donné. Ce n’est pas « incassable », c’est hors de portée d’une attaque opportuniste.' },
        { t: 'p', v: '210 000 itérations, c’est en dessous des 600 000 recommandées par l’OWASP pour PBKDF2-SHA256. Assumé : sur un téléphone d’entrée de gamme, la dérivation doit rester supportable, et elle se paie à chaque ouverture de session. Argon2id serait meilleur contre le GPU, mais impose des paramètres identiques partout et un module supplémentaire à charger. On garde PBKDF2 parce que c’est une primitive du navigateur, sans dépendance, et facile à vérifier.' },
        { t: 'note', v: 'Le vrai correctif à terme, c’est un PAKE (SPAKE2 ou OPAQUE) : le code ne quitte jamais le client et le serveur n’obtient aucun vérificateur utilisable hors ligne. Ce n’est pas implémenté aujourd’hui. C’est le chantier le plus sérieux qui reste.' },
      ],
    },
    {
      id: 'scellement', n: '03', title: 'Le scellement des messages',
      blocks: [
        { t: 'p', v: 'Chaque message est un objet JSON — texte, clip audio, citation, identifiant d’auteur — transformé en chaîne, puis chiffré avec `crypto_secretbox_easy`. C’est XSalsa20 pour le chiffrement et Poly1305 pour l’authentification. Clé de 32 octets, nonce aléatoire de 24 octets tiré pour chaque message, tag de 16 octets.' },
        { t: 'pre', v: SEAL },
        { t: 'p', v: 'Le nonce est aléatoire, pas un compteur. Sur 192 bits, la probabilité de collision reste négligeable même après des milliards de messages. Un compteur serait plus élégant, mais imposerait un état partagé entre participants — exactement ce qu’on veut éviter.' },
        { t: 'p', v: 'Poly1305 authentifie le contenu : modifier un octet du ciphertext casse le tag, et le message s’affiche comme illisible au lieu d’afficher n’importe quoi. En revanche, `secretbox` n’a pas de données associées : les métadonnées externes (horodatage, ordre, présence) ne sont pas couvertes. Un serveur malveillant peut rejouer un message valide ou le réordonner. Le contenu reste authentique ; la fraîcheur ne l’est pas.' },
        { t: 'p', v: 'L’identifiant d’auteur, lui, est maintenant **dans** le JSON scellé. Le client compare l’auteur déchiffré à celui annoncé par le serveur. S’ils diffèrent, la bulle affiche « auteur non vérifié ». Un relais ne peut plus réattribuer un message sans casser le tag.' },
        { t: 'note', v: 'Il n’y a **pas de forward secrecy**. Une seule clé par salon, pas de Double Ratchet. Si le code fuite après coup et que quelqu’un a conservé les ciphertexts, il peut les ouvrir. C’est le prix du « un code = une session ». Un ratchet casserait la possibilité de rejoindre avec un simple code, ou imposerait un échange de clés par participant.' },
      ],
    },
    {
      id: 'serveur', n: '04', title: 'Ce que le serveur voit',
      blocks: [
        { t: 'p', v: 'Il voit, et c’est nécessaire au routage :' },
        { t: 'ul', v: [
          'l’identifiant de salon, qui est un dérivé du code ;',
          'l’identifiant de transfert des fichiers, aléatoire et opaque ;',
          'le ciphertext et le nonce, en base64 ;',
          'le type de message (texte, vocal, fichier, réaction, appel), l’horodatage et l’expiration éventuelle ;',
          'les pseudos, les couleurs d’avatar, qui est connecté, qui est en appel ;',
          'l’adresse IP, en mémoire vive uniquement, pour le bannissement par salon et le limiteur de débit ;',
          'la taille de chaque message et son rythme d’arrivée.',
        ] },
        { t: 'p', v: 'Il ne voit pas :' },
        { t: 'ul', v: [
          'le texte, l’audio, les réactions, les citations — tout est dans le cipher ;',
          'le code lui-même, jamais transmis ;',
          'le contenu des appels vocaux, qui passent en pair-à-pair chiffré.',
        ] },
        { t: 'p', v: 'La taille des messages fuit de l’information : un vocal de 2,6 Mo et un « ok » ne racontent pas la même chose. Il n’y a pas de padding. Un attaquant qui observe le trafic peut deviner qu’un long message a été envoyé, et quand.' },
      ],
    },
    {
      id: 'memoire', n: '05', title: 'Mémoire et durée de vie',
      blocks: [
        { t: 'p', v: 'Tout tient dans des `Map` en mémoire. Pas de base de données, pas de fichier, pas de log applicatif du contenu. Un redémarrage du processus efface absolument tout, y compris les messages qui n’avaient pas encore expiré.' },
        { t: 'ul', v: [
          '800 messages maximum par salon ; au-delà, les plus anciens sortent de la fenêtre.',
          '128 Mo de cipher par salon. Un vocal ou un fichier peut peser lourd : au plafond, le message est refusé, pas silencieusement remplacé.',
          'Un salon sans personne est détruit au bout de 3 minutes.',
          'Les messages temporaires sont purgés côté serveur toutes les 5 secondes, et côté client par un timer.',
          '« Fermer la session » détruit le salon immédiatement pour tout le monde.',
        ] },
        { t: 'p', v: 'Le limiteur est par IP : 12 WebSocket simultanées, 30 créations de salon par 10 minutes. Par connexion : 60 messages par 10 secondes et 240 trames par seconde. Une trame au-delà de 3,4 Mo est jetée avant même d’être analysée.' },
        { t: 'note', v: 'Nuance importante : la mémoire du processus peut être swappée par le noyau. On ne peut pas promettre « zéro trace » au niveau du système d’exploitation. Ce qu’on garantit, c’est qu’aucune couche applicative n’écrit sur disque.' },
      ],
    },
    {
      id: 'transport', n: '06', title: 'Transport et en-têtes',
      blocks: [
        { t: 'p', v: 'nginx termine TLS en 1.2/1.3 avec un certificat Let’s Encrypt renouvelé automatiquement. HSTS est posé pour un an. Ensuite, nginx parle à Node en clair sur `127.0.0.1` : c’est la même machine, sur l’interface de bouclage. Quiconque a déjà root sur le VPS lit de toute façon la mémoire du processus.' },
        { t: 'p', v: 'La politique de sécurité du contenu est stricte :' },
        { t: 'pre', v: CSP },
        { t: 'p', v: '`\'wasm-unsafe-eval\'` est là pour libsodium, qui compile son module WebAssembly. Ce n’est pas `\'unsafe-eval\'` : l’eval JavaScript reste interdit. Pas de CDN, pas de Google Fonts, pas d’analytics, pas de script tiers. Tout est servi par le domaine, donc aucun Referer ne part ailleurs.' },
        { t: 'p', v: 'Côté WebSocket, l’origine est vérifiée à l’upgrade : une page d’un autre domaine ne peut pas ouvrir de connexion. L’IP réelle est posée par nginx dans `X-Real-IP`, un en-tête que le client ne peut pas forger à travers le proxy.' },
        { t: 'p', v: 'Le service tourne sous l’utilisateur `seyra` avec `NoNewPrivileges`, `PrivateTmp` et `ProtectSystem=full`. La machine est en SELinux *Enforcing*.' },
      ],
    },
    {
      id: 'voix', n: '07', title: 'Appels vocaux',
      blocks: [
        { t: 'p', v: 'Le vocal est un maillage WebRTC. Chaque navigateur ouvre une connexion directe avec chaque autre, en DTLS-SRTP : le média est chiffré de navigateur à navigateur, le serveur ne relaie pas l’audio.' },
        { t: 'p', v: 'La signalisation (SDP, candidats ICE) passe par le WebSocket. Le serveur voit donc les adresses candidates et les descriptions de session. Il ne voit pas le son. Pour les réseaux restrictifs, coturn relaie le média, avec des identifiants éphémères générés en HMAC-SHA1 selon la méthode REST de coturn : le secret reste sur le serveur, aucun mot de passe fixe n’est embarqué dans le client.' },
        { t: 'note', v: 'En maillage, chaque participant connaît l’IP des autres via les candidats ICE. Si tu ne veux pas exposer ton IP à un inconnu du salon, il faut un SFU — ce n’est pas le modèle ici. Le plafond de 8 en vocal n’est pas une limite de sécurité, c’est une limite de bande passante montante.' },
      ],
    },
    {
      id: 'quantique', n: '08', title: 'Quantique : ce qui tient, ce qui ne tient pas',
      blocks: [
        { t: 'p', v: 'Deux algorithmes comptent. **Shor** casse RSA, ECDH et ECDSA. **Grover** donne une accélération quadratique sur la recherche dans un espace de clés, donc divise par deux la sécurité d’un chiffrement symétrique.' },
        { t: 'p', v: 'Le contenu est chiffré en symétrique 256 bits. Sous Grover, ça vaut 128 bits : solide. Et comme il n’y a **aucun échange de clé asymétrique** dans la couche message, Shor ne s’applique pas au contenu. C’est le sens honnête de « semi-quantique » : le ciphertext survit à un enregistrement massif puis à un ordinateur quantique, parce qu’il n’y a rien d’asymétrique à casser.' },
        { t: 'p', v: 'TLS, lui, utilise ECDHE. Un enregistrement du trafic d’aujourd’hui pourra être déchiffré plus tard par Shor. Mais ce qu’on obtient en déchiffrant TLS, c’est le ciphertext du salon. Il faut encore Grover sur la clé du salon pour lire quoi que ce soit.' },
        { t: 'p', v: 'Et là, le plafond n’est pas le chiffré, c’est le code : 59,3 bits, soit environ 29,6 bits sous Grover. Chaque « itération » de Grover doit en plus exécuter PBKDF2 avec ses 210 000 tours, ce qui est hors de portée des machines actuelles. Mais sur le papier, c’est le maillon court.' },
        { t: 'p', v: 'On ne dit pas « post-quantique » parce que ce serait faux : il n’y a pas de ML-KEM ni de signature post-quantique dans le chemin. Il n’y en a pas besoin pour le contenu symétrique. Le levier le plus simple, si tu veux plus de marge, c’est un code plus long : 20 symboles donnent ≈ 99 bits, donc ≈ 49,5 sous Grover, sans changer une ligne de crypto.' },
      ],
    },
    {
      id: 'vocaux', n: '09', title: 'Vocaux et fichiers',
      blocks: [
        { t: 'p', v: '`MediaRecorder` ne produit pas le même format partout : webm/opus sur Chrome et Android, mp4/aac sur Safari. Un vocal enregistré sur l’un n’est pas toujours lisible sur l’autre — c’est exactement le bug qu’on a corrigé.' },
        { t: 'p', v: 'À l’arrêt de l’enregistrement, le blob est décodé localement avec `decodeAudioData`, ré-échantillonné en mono 12 kHz via `OfflineAudioContext`, puis encodé en WAV PCM 16 bits. Le WAV est lu par tous les navigateurs. Il est ensuite mis en base64 dans la même enveloppe que le texte, puis scellé. Double base64 assumé : c’est le coût d’un protocole JSON.' },
        { t: 'p', v: '60 secondes donnent environ 1,44 Mo de WAV, donc à peu près 2,6 Mo de cipher. C’est gros. Un transcodage serveur serait plus efficace, mais il est impossible : le serveur n’a pas la clé. Si le décodage local échoue, on envoie le blob d’origine plutôt que de perdre le message, quitte à ce qu’il ne soit pas lisible partout.' },
        { t: 'p', v: 'Les photos sont compressées **avant** de quitter le navigateur : redimensionnement à 1600 px de côté maximum, ré-encodage JPEG avec une qualité réglable (0,6 / 0,82 / 0,95) ou envoi de l’original. Une photo de 15 Mo descend facilement sous 200 Ko. On ne garde la version compressée que si elle est réellement plus légère.' },
        { t: 'p', v: 'Un fichier, une vidéo ou une photo est découpé en morceaux de 512 Ko. Chaque morceau est scellé séparément, avec son propre nonce, et le tout voyage sous un identifiant de transfert aléatoire (`fid`) que le serveur voit sans savoir ce qu’il transporte. À l’arrivée, les morceaux sont déchiffrés, comptés, puis recollés en `Blob` local. Une barre de progression affiche l’avancement, et rien n’est écrit sur disque.' },
        { t: 'p', v: 'Plafond : 8 Mo par fichier, soit 16 morceaux. Les vidéos ne sont **pas** recompressées dans le navigateur : il faudrait un encodeur complet (H.264) embarqué, lourd et lent sur téléphone. Une vidéo trop longue doit être raccourcie ou compressée avant l’envoi.' },
        { t: 'note', v: 'Supprimer un fichier efface d’un coup les métadonnées et tous ses morceaux, côté serveur comme chez chaque participant. L’aperçu local (URL de blob) est révoqué immédiatement.' },
      ],
    },
    {
      id: 'limites', n: '10', title: 'Ce qui n’est pas couvert',
      blocks: [
        { t: 'ul', v: [
          '**Pas de forward secrecy.** Une clé par salon, pas de ratchet.',
          '**Pas de PAKE.** Le roomId sert de vérificateur au serveur.',
          '**Pas de padding.** Les tailles de messages sont visibles.',
          '**Vidéos non recompressées.** Plafond de 8 Mo ; au-delà, il faut compresser avant l’envoi.',
          '**Pas de signature d’appareil.** Deux personnes avec le même code sont dans le même salon ; rien ne prouve qui est derrière un pseudo.',
          '**Pas de protection contre un participant.** Il peut copier, capturer, réenvoyer.',
          '**Pas de récupération.** Code perdu = session perdue. Pas de compte, pas de secours.',
          '**Pas d’audit externe à ce jour.** Le code n’est pas public pour l’instant.',
          '**Un seul VPS.** Panne ou coupure = service indisponible. Aucune sauvegarde, par choix.',
        ] },
        { t: 'p', v: 'Cette liste n’est pas une excuse. C’est ce qu’il faut lire avant de confier quelque chose d’important à une session.' },
      ],
    },
    {
      id: 'verifier', n: '11', title: 'Vérifier soi-même',
      blocks: [
        { t: 'p', v: 'Tu n’es pas obligé de nous croire. Quelques manipulations suffisent :' },
        { t: 'ul', v: [
          'Ouvre les DevTools, onglet Réseau, filtre WS. Tu verras passer `{"t":"msg","cipher":"…","nonce":"…"}` en base64. Aucun texte lisible.',
          'Inspecte les en-têtes de `/app` : CSP, HSTS, COOP, CORP, X-Frame-Options.',
          '`curl -sI https://seyra.website/app` depuis un terminal.',
          'Ferme la session : les messages disparaissent pour tous les participants.',
          'Redémarre le service côté serveur : tout est perdu, y compris les messages non expirés.',
        ] },
        { t: 'p', v: 'Si tu trouves une faille, le mieux est de le signaler discrètement à l’opérateur du site avant d’en parler publiquement. Ce dossier sera mis à jour avec les corrections.' },
      ],
    },
    { id: 'chiffres', n: '12', title: 'Récapitulatif', blocks: [] },
  ],
  numbers: [
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
  ],
  updated: 'Dernière mise à jour : octobre 2026.',
  cta: 'Ouvrir une session',
};

export const SECURITY_DOC: Record<'en' | 'fr', Doc> = { en, fr };
