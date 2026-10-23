# Seyra

Sessions de discussion chiffrées. Un code, pas de compte, rien qui reste.

En ligne : [seyra.website](https://seyra.website)

**Lire en :** [English](README.md) · [中文](README.zh.md) · [Русский](README.ru.md) · [한국어](README.ko.md)

## Ce que ça fait

- Le code est la clé. PBKDF2-HMAC-SHA256 (210 000 itérations) donne 32 octets de clé et 32 octets d'identifiant de salon.
- Les messages sont scellés en XSalsa20-Poly1305 avant de quitter le navigateur. L'identifiant d'auteur est scellé aussi.
- Texte, vocaux, photos, fichiers jusqu'à 8 Mo, sondages, fils, messages épinglés, mentions.
- Appels de groupe, caméra et partage d'écran avec le son, en pair-à-pair WebRTC.
- Tout tient en mémoire vive. Fermer la session efface tout, pour tout le monde.

## Ce que ça ne fait pas

- Pas de forward secrecy, pas de PAKE. L'identifiant de salon sert de vérificateur hors ligne pour le code.
- Pas de padding : la taille des messages fuit.
- Pas de récupération. Code perdu, session perdue.
- Pas d'audit externe à ce jour.

Le dossier complet, avec les chiffres et le modèle de menace, est sur [/securite](https://seyra.website/securite).

## Lancer

Node 20 ou plus.

```sh
cd app && npm install && npm run build   # écrit le client dans server/public
cd ../server && npm install
node src/index.js                        # 127.0.0.1:3000
```

Mettre nginx avec TLS devant (voir `deploy/nginx-seyra.conf`). Variables : `PORT`, `ALLOWED_ORIGINS`, `TURN_HOST`, `TURN_SECRET`.

Le relais TURN est optionnel mais utile sur les réseaux restrictifs (`deploy/setup-turn.sh`).

## Organisation

```
app/      client React + Vite
server/   serveur Node WebSocket, sert le client compilé
deploy/   vhost nginx, unité systemd, installation coturn
```

## Tests

```sh
cd app && npm run check
```

## Limites

Un seul VPS, pas de sauvegarde, pas de redondance. Ne confie pas à une session quelque chose qui te ruinerait si le code fuitait.

## Licence

MIT. Voir [LICENSE](LICENSE).
