param([switch]$SkipBuild, [switch]$SkipChecks)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$app = Join-Path $root 'app'
$key = Join-Path $env:USERPROFILE '.ssh\seyra_deploy'
$remote = 'root@78.17.213.21'
$site = 'https://seyra.website'

function Invoke-Step([string]$label, [scriptblock]$cmd) {
  Write-Host $label -ForegroundColor Cyan
  & $cmd
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Echec : $label (code $LASTEXITCODE)" -ForegroundColor Red
    exit 1
  }
}

if (-not (Test-Path $key)) {
  Write-Host "Cle SSH absente : $key" -ForegroundColor Red
  exit 1
}

Push-Location $app
try {
  # Contrôle avant envoi : types + tests. Un échec bloque le déploiement.
  # Les sorties passent par cmd (2>&1 interne) : Vite écrit sur stderr, et PowerShell
  # ne doit juger que le code de retour.
  if (-not $SkipChecks) {
    Invoke-Step 'Verification des types et des tests...' { cmd /c "npm run check 2>&1" | Out-Host }
  }
  if (-not $SkipBuild) {
    Invoke-Step 'Build du client...' { cmd /c "npm run build 2>&1" | Out-Host }
  }
} finally {
  Pop-Location
}

$opts = @('-i', $key, '-o', 'StrictHostKeyChecking=accept-new')

Invoke-Step 'Envoi du serveur...' { scp @opts -r (Join-Path $root 'server\public') "${remote}:/opt/seyra/server/" }
Invoke-Step 'Envoi du code serveur...' { scp @opts -r (Join-Path $root 'server\src') "${remote}:/opt/seyra/server/" }
Invoke-Step 'Envoi du package...' { scp @opts (Join-Path $root 'server\package.json') "${remote}:/opt/seyra/server/package.json" }
Invoke-Step 'Envoi du service...' { scp @opts (Join-Path $root 'deploy\seyra.service') "${remote}:/etc/systemd/system/seyra.service" }

# Redémarrage puis attente que Node réponde avant de rendre la main (évite les 502).
Invoke-Step 'Redemarrage du service...' {
  ssh @opts $remote "cd /opt/seyra/server && npm install --omit=dev --no-audit --no-fund >/dev/null 2>&1; systemctl daemon-reload && systemctl restart seyra && for i in 1 2 3 4 5 6 7 8 9 10; do curl -sf http://127.0.0.1:3000/api/healthz >/dev/null && break; sleep 1; done && systemctl is-active seyra"
}

$code = (Invoke-WebRequest -UseBasicParsing -Uri "$site/api/healthz" -TimeoutSec 15 -ErrorAction SilentlyContinue).StatusCode
Write-Host "Verification publique : $site/api/healthz -> $code" -ForegroundColor Green
Write-Host "En ligne : $site" -ForegroundColor Green
