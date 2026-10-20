# Seyra

Sessions de discussion privées et éphémères, sans compte. On ouvre une session, un code apparaît, on le partage. Le propriétaire peut retirer un invité. Quand la session se ferme, tout disparaît.

- **Site** : https://seyra.website (et https://78.17.213.21 en secours)
- **Téléphone** : le site s'utilise dans le navigateur mobile ; sur l'écran d'accueil, « Ajouter à l'écran d'accueil » l'installe comme une application.
- **Application Windows** : `desktop/dist/Seyra-1.0.0.exe` (portable, généré par `npm run build` dans `desktop/`)

## Utilisation

1. **Ouvrir une session** : un code du type `8334-BFPG-Z52Q` s'affiche.
2. **Rejoindre une session** sur un autre appareil : saisir le code.
3. Discuter. Le bouton téléphone lance un appel vocal de groupe (WebRTC).
4. Le **propriétaire** (celui qui a ouvert la session) peut **retirer** un invité depuis la liste des participants. L'invité est déconnecté et ne peut plus revenir (blocage par adresse IP pour la durée de la session).
5. **Fermer la session** efface les messages pour tout le monde.

## Chiffrement

Le code **est** la clé. Il n'est jamais envoyé au serveur.

```
code 12 caractères (≈ 60 bits) ──PBKDF2-HMAC-SHA256 (210 000 itérations)──▶ 64 octets
                                                                            ├─ 32 octets : clé de session
                                                                            └─ 32 octets : identifiant de salon
```

- Messages : `crypto_secretbox_easy` (XSalsa20-Poly1305), nonce aléatoire par message.
- Le serveur ne reçoit que l'identifiant de salon et du texte chiffré.
- Appels : WebRTC pair-à-pair, média chiffré (DTLS-SRTP) ; la signalisation transite par le serveur.
- Aucune base de données ni fichier : les sessions vivent en mémoire. Un redémarrage efface tout.

## Développement

```powershell
.\start.ps1
```

Lance l'API (`node --watch`, port 3000) et Vite (port 5173), puis ouvre l'application. Les modifications sont rechargées automatiquement. Journaux dans `logs/`.

## Déploiement

```powershell
.\deploy.ps1
```

Construit le client, envoie `server/src`, `server/public`, `server/package.json` et l'unité systemd, puis redémarre le service. Accès par la clé SSH `~/.ssh/seyra_deploy`.

### DNS (à faire chez le registrar de seyra.website)

| Type | Nom | Valeur | TTL |
| --- | --- | --- | --- |
| A | `@` (ou `seyra.website`) | `78.17.213.21` | 3600 |
| A | `www` | `78.17.213.21` | 3600 |

Une fois la propagation faite (quelques minutes à 1 h), sur le serveur :

```bash
bash /opt/seyra/tls.sh
```

Le script émet le certificat Let's Encrypt pour `seyra.website` et `www.seyra.website`, met la configuration nginx à jour et programme le renouvellement automatique. Tant que le DNS n'est pas en place, le site reste accessible en HTTPS sur l'IP avec un certificat auto-signé.

### Serveur

- Service : `systemctl status seyra` (code dans `/opt/seyra/server`)
- nginx : `/etc/nginx/conf.d/seyra.conf` (généré par `tls.sh` depuis `deploy/nginx-seyra.conf`)
- Certificats : `/etc/letsencrypt/live/seyra.website/` ou, en secours, `/etc/ssl/seyra/`

### Application Windows et certificat épinglé

Le client Electron n'accepte que le certificat dont l'empreinte est dans `desktop/config.json`. Après une émission Let's Encrypt, remplacer `url` par `https://seyra.website/` et l'empreinte par celle du nouveau certificat, puis `npm run build` dans `desktop/`.

## Limites

- Appels via STUN public, sans TURN : certains réseaux très restrictifs bloquent l'audio.
- Une seule instance : les sessions sont en mémoire, sans réplication.
- Pas de pièces jointes, pas de notifications hors application.
- Le propriétaire est lié à la connexion : s'il recharge la page, il perd ce statut.
- Le blocage d'un invité se fait par adresse IP : plusieurs personnes derrière une même box peuvent être touchées.

## Arborescence

```
app/        client React + Vite (CSS plat, libsodium)
server/     serveur HTTP + WebSocket en mémoire (Node.js, ws)
desktop/    enveloppe Electron + exécutable portable Windows
deploy/     unité systemd, configuration nginx, script TLS
```
