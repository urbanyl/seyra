# Seyra

Encrypted chat sessions. One code, no account, nothing kept.

Live at [seyra.website](https://seyra.website)

**Read this in:** [Français](README.fr.md) · [中文](README.zh.md) · [Русский](README.ru.md) · [한국어](README.ko.md)

## What it does

- The code is the key. PBKDF2-HMAC-SHA256 (210k iterations) gives 32 bytes of key and 32 bytes of room id.
- Messages are sealed with XSalsa20-Poly1305 before leaving the browser. The author id is sealed too.
- Text, voice notes, photos, files up to 8 MB, polls, threads, pinned messages, mentions.
- Group calls, camera and screen sharing with sound, peer to peer over WebRTC.
- Everything lives in RAM. Closing the session wipes it for everyone.

## What it doesn't do

- No forward secrecy and no PAKE. The room id works as an offline verifier for the code.
- No padding, so message sizes leak.
- No account recovery. Lose the code, lose the session.
- No external audit yet.

The full dossier, with numbers and threat model, is on [/securite](https://seyra.website/securite).

## Run it

Needs Node 20+.

```sh
cd app && npm install && npm run build   # writes the client to server/public
cd ../server && npm install
node src/index.js                        # 127.0.0.1:3000
```

Put nginx with TLS in front (see `deploy/nginx-seyra.conf`). Env: `PORT`, `ALLOWED_ORIGINS`, `TURN_HOST`, `TURN_SECRET`.

TURN relay is optional but helps on strict networks (`deploy/setup-turn.sh`).

## Layout

```
app/      React + Vite client
server/   Node WebSocket server, serves the built client
deploy/   nginx vhost, systemd unit, coturn setup
```

## Tests

```sh
cd app && npm run check
```

## Limits

One VPS, no backup, no redundancy. Don't put anything in a session that would ruin you if the code leaked.
