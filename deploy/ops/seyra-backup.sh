#!/bin/bash
# Sauvegarde de la configuration du serveur Seyra (pas les binaires, reproductibles).
set -euo pipefail
DEST=/var/backups/seyra
mkdir -p "$DEST"
chmod 700 "$DEST"
STAMP=$(date +%Y%m%d-%H%M)
FILES=(
  /etc/seyra.env
  /etc/nginx/conf.d/seyra.conf
  /etc/nginx/conf.d/ai.seyra.website.conf
  /etc/nginx/conf.d/00-limits.conf
  /etc/systemd/system/seyra.service
  /etc/systemd/system/ollama.service.d
  /etc/ssh/sshd_config.d/00-seyra.conf
)
EXISTING=()
for f in "${FILES[@]}"; do [ -e "$f" ] && EXISTING+=("$f"); done
tar -czf "$DEST/seyra-config-$STAMP.tar.gz" "${EXISTING[@]}"
chmod 600 "$DEST/seyra-config-$STAMP.tar.gz"
find "$DEST" -name 'seyra-config-*.tar.gz' -mtime +60 -delete
