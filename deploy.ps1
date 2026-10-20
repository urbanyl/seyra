param([switch]$SkipBuild)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$key = Join-Path $env:USERPROFILE '.ssh\seyra_deploy'
$remote = 'root@78.17.213.21'

if (-not (Test-Path $key)) {
  Write-Host "Cle SSH absente : $key" -ForegroundColor Red
  exit 1
}

if (-not $SkipBuild) {
  Write-Host "Build du client..." -ForegroundColor Cyan
  Push-Location (Join-Path $root 'app')
  npm run build
  Pop-Location
}

$opts = @('-i', $key, '-o', 'StrictHostKeyChecking=accept-new')

Write-Host "Envoi du serveur..." -ForegroundColor Cyan
scp @opts -r (Join-Path $root 'server\public') "${remote}:/opt/seyra/server/"
scp @opts -r (Join-Path $root 'server\src') "${remote}:/opt/seyra/server/"
scp @opts (Join-Path $root 'server\package.json') "${remote}:/opt/seyra/server/package.json"
scp @opts (Join-Path $root 'deploy\seyra.service') "${remote}:/etc/systemd/system/seyra.service"

Write-Host "Redemarrage du service..." -ForegroundColor Cyan
ssh @opts $remote "cd /opt/seyra/server && npm install --omit=dev --no-audit --no-fund >/dev/null; systemctl daemon-reload && systemctl restart seyra && sleep 1 && systemctl is-active seyra"

Write-Host "En ligne : https://78.17.213.21/" -ForegroundColor Green
