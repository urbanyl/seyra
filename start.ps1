$ErrorActionPreference = 'SilentlyContinue'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$logs = Join-Path $root 'logs'
New-Item -ItemType Directory -Force -Path $logs | Out-Null

foreach ($port in 3000, 5173) {
  $conn = Get-NetTCPConnection -LocalPort $port -State Listen
  if ($conn) { $conn | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force } }
}

Start-Process node -ArgumentList '--watch', 'src/index.js' -WorkingDirectory (Join-Path $root 'server') `
  -RedirectStandardOutput (Join-Path $logs 'server.log') -RedirectStandardError (Join-Path $logs 'server.err.log') -WindowStyle Hidden

Start-Process 'npm.cmd' -ArgumentList 'run', 'dev', '--', '--host' -WorkingDirectory (Join-Path $root 'app') `
  -RedirectStandardOutput (Join-Path $logs 'app.log') -RedirectStandardError (Join-Path $logs 'app.err.log') -WindowStyle Hidden

Start-Sleep -Seconds 4

$chrome = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($chrome) {
  Start-Process $chrome -ArgumentList '--app=http://localhost:5173', '--window-size=1440,900'
} else {
  Start-Process 'http://localhost:5173'
}

Write-Host "Seyra demarre : http://localhost:5173"
