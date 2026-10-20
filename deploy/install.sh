#!/usr/bin/env bash
set -euo pipefail

DOMAIN_OR_IP="${1:-78.17.213.21}"
ALT_NAME="${2:-21.213.17.78.nl203.servers.guru}"

dnf -y install nginx firewalld >/dev/null

id -u seyra >/dev/null 2>&1 || useradd --system --home /opt/seyra --shell /sbin/nologin seyra
mkdir -p /opt/seyra/data /opt/seyra/logs
chown -R seyra:seyra /opt/seyra

if [ ! -f /etc/ssl/seyra/cert.pem ]; then
  mkdir -p /etc/ssl/seyra
  openssl req -x509 -newkey rsa:2048 -nodes -days 3650 \
    -keyout /etc/ssl/seyra/key.pem -out /etc/ssl/seyra/cert.pem \
    -subj "/CN=${DOMAIN_OR_IP}" \
    -addext "subjectAltName=IP:${DOMAIN_OR_IP},DNS:${ALT_NAME}" >/dev/null 2>&1
  chmod 600 /etc/ssl/seyra/key.pem
fi

install -m 644 seyra.service /etc/systemd/system/seyra.service
install -m 644 nginx-seyra.conf /etc/nginx/conf.d/seyra.conf
rm -f /etc/nginx/conf.d/default.conf

setsebool -P httpd_can_network_connect 1 2>/dev/null || true
systemctl daemon-reload
systemctl enable --now seyra
systemctl enable --now nginx
nginx -t && systemctl reload nginx

systemctl enable --now firewalld
firewall-cmd --permanent --add-service=http --add-service=https >/dev/null
firewall-cmd --reload >/dev/null

echo "Seyra en ligne sur https://${DOMAIN_OR_IP}/ (certificat auto-signe)"
