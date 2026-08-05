# Arranca el stack Docker Servigas (mostrador) y abre el navegador.
# Uso:
#   .\Start-Servigas.ps1
#   .\Start-Servigas.ps1 -NoBrowser
#   .\Start-Servigas.ps1 -CreateDesktopShortcut

[CmdletBinding()]
param(
  [switch]$NoBrowser,
  [switch]$CreateDesktopShortcut,
  [int]$DockerWaitSeconds = 120,
  [int]$WebWaitSeconds = 180
)

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here

function Write-Step([string]$Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Get-EnvValue([string]$Name, [string]$Default) {
  if (-not (Test-Path ".env")) { return $Default }
  $line = Get-Content ".env" | Where-Object { $_ -match "^\s*$([regex]::Escape($Name))=(.+)$" } | Select-Object -First 1
  if (-not $line) { return $Default }
  return ($line -replace "^[^=]+=", "").Trim()
}

function Wait-Until([scriptblock]$Test, [int]$Seconds, [string]$Label) {
  $deadline = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $deadline) {
    try {
      if (& $Test) { return $true }
    } catch {
      # keep waiting
    }
    Start-Sleep -Seconds 2
  }
  throw "Timeout esperando: $Label (${Seconds}s)"
}

if ($CreateDesktopShortcut) {
  $bat = Join-Path $here "Start-Servigas.bat"
  $desktop = [Environment]::GetFolderPath("Desktop")
  $lnkPath = Join-Path $desktop "Servigas.lnk"
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($lnkPath)
  $shortcut.TargetPath = $bat
  $shortcut.WorkingDirectory = $here
  $shortcut.WindowStyle = 1
  $shortcut.Description = "Abrir Servigas (Docker mostrador)"
  $iconCandidate = Join-Path (Split-Path (Split-Path $here -Parent) -Parent) "web\public\servigas-mark.png"
  if (Test-Path $iconCandidate) {
    # .lnk prefiere .ico; dejamos el default si no hay ico
  }
  $shortcut.Save()
  Write-Host "Acceso directo creado: $lnkPath"
  Write-Host "Tip: clic derecho → Propiedades → Cambiar icono (si tenés un .ico)."
  return
}

if (-not (Test-Path ".env")) {
  if (Test-Path ".env.example") {
    Copy-Item ".env.example" ".env"
    Write-Host "Creado .env desde .env.example"
  } else {
    throw "Falta .env (y .env.example) en $here"
  }
}

$webPort = Get-EnvValue "WEB_HOST_PORT" "4322"
$odooPort = Get-EnvValue "ODOO_HOST_PORT" "8069"
$webUrl = "http://127.0.0.1:$webPort"

Write-Step "Esperando Docker Desktop..."
Wait-Until {
  docker info 2>$null | Out-Null
  $LASTEXITCODE -eq 0
} $DockerWaitSeconds "Docker Desktop (docker info)"

Write-Step "Levantando stack (db + odoo + web)..."
docker compose --env-file .env up -d
if ($LASTEXITCODE -ne 0) {
  throw "docker compose up falló (código $LASTEXITCODE)"
}

Write-Step "Esperando Astro en $webUrl ..."
Wait-Until {
  $res = Invoke-WebRequest -Uri $webUrl -UseBasicParsing -TimeoutSec 3
  $res.StatusCode -ge 200 -and $res.StatusCode -lt 500
} $WebWaitSeconds "Astro en $webUrl"

Write-Host ""
Write-Host "Servigas listo." -ForegroundColor Green
Write-Host "  Shell:  $webUrl"
Write-Host "  Odoo:   http://127.0.0.1:$odooPort"
Write-Host ""

if (-not $NoBrowser) {
  Start-Process $webUrl
}
