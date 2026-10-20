#!/usr/bin/env bash
# Émet le certificat Let's Encrypt pour seyra.website (si le DNS pointe déjà vers ce serveur)
# puis régénère la configuration nginx. Sans DNS valide, garde le certificat auto-signé.
set -uo pipefail

DOMAIN="seyra.website"
SELF_DIR="/etc/ssl/seyra"

if ! command -v certbot >/dev/null 2>&1; then
  dnf -y install epel-release >/dev/null 2>&1 || true
  dnf -y install certbot >/dev/null 2>&1 || { echo "certbot indisponible"; exit 1; }
fi

mkdir -p /var/www/html/.well-known/acme-challenge

CERT_DIR="$SELF_DIR"
ln -sf "$SELF_DIR/cert.pem" "$SELF_DIR/fullchain.pem"
ln -sf "$SELF_DIR/key.pem" "$SELF_DIR/privkey.pem"
if certbot certonly --webroot -w /var/www/html \
     -d "$DOMAIN" -d "www.$DOMAIN" \
     --non-interactive --agree-tos --register-unsafely-without-email \
     --deploy-hook "systemctl reload nginx" --keep-until-expiring; then
  CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
  echo "Certificat Let's Encrypt émis pour $DOMAIN"
else
  echo "Échec Let's Encrypt (DNS pas encore propagé ?) : certificat auto-signé conservé"
fi

sed "s#__CERT__#$CERT_DIR#g" /opt/seyra/nginx-seyra.conf > /etc/nginx/conf.d/seyra.conf
nginx -t && systemctl reload nginx
echo "nginx rechargé avec $CERT_DIR"
