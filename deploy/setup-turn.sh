#!/usr/bin/env bash
# Installe coturn (relais TURN) pour que les appels passent même derrière un NAT strict.
# Les identifiants sont éphémères (REST) : le secret reste sur le serveur, jamais dans le client.
set -euo pipefail

PUBLIC_IP="${1:-78.17.213.21}"
REALM="${2:-seyra.website}"

dnf -y install coturn >/dev/null

SECRET_FILE=/etc/seyra.env
if [ ! -f "$SECRET_FILE" ] || ! grep -q '^TURN_SECRET=' "$SECRET_FILE"; then
  SECRET="$(openssl rand -hex 32)"
  printf 'TURN_SECRET=%s\nTURN_HOST=%s\n' "$SECRET" "$PUBLIC_IP" > "$SECRET_FILE"
  chmod 640 "$SECRET_FILE"
  chgrp seyra "$SECRET_FILE" 2>/dev/null || true
fi
SECRET="$(grep '^TURN_SECRET=' "$SECRET_FILE" | cut -d= -f2-)"

cat > /etc/coturn/turnserver.conf <<EOF
listening-port=3478
fingerprint
use-auth-secret
static-auth-secret=${SECRET}
realm=${REALM}
server-name=${REALM}
external-ip=${PUBLIC_IP}
min-port=49160
max-port=49260
total-quota=200
stale-nonce=600
no-cli
no-tlsv1
no-tlsv1_1
no-loopback-peers
no-multicast-peers
simple-log
log-file=/var/log/coturn.log
EOF
chmod 640 /etc/coturn/turnserver.conf
chgrp coturn /etc/coturn/turnserver.conf 2>/dev/null || true

systemctl enable --now coturn
firewall-cmd --permanent --add-port=3478/tcp --add-port=3478/udp --add-port=49160-49260/udp >/dev/null
firewall-cmd --reload >/dev/null

systemctl is-active coturn
echo "TURN prêt sur ${PUBLIC_IP}:3478 (identifiants éphémères)"
