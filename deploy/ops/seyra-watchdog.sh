#!/bin/bash
# Redémarre le service si /api/healthz échoue 3 fois de suite.
STATE=/run/seyra-watchdog.fail
if curl -sf --max-time 5 http://127.0.0.1:3000/api/healthz >/dev/null 2>&1; then
  rm -f "$STATE"
  exit 0
fi
N=$(cat "$STATE" 2>/dev/null || echo 0)
N=$((N + 1))
echo "$N" > "$STATE"
if [ "$N" -ge 3 ]; then
  logger -t seyra-watchdog "healthz en échec ($N), redémarrage du service"
  systemctl restart seyra
  rm -f "$STATE"
fi
