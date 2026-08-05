#Requires -Version 5.1
<#
.SYNOPSIS
  Primera instalación de módulos Servigas en el stack Docker (opción C).

.DESCRIPTION
  Crea/actualiza la DB "servigas" e instala servigas_core + servigas_integrations
  sin demos. Idempotente: si los módulos ya están, Odoo solo actualiza lo necesario.

.EXAMPLE
  cd infra/docker
  copy .env.example .env
  docker compose --env-file .env up -d --build
  .\install-modules.ps1
#>
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Creado .env desde .env.example"
}

$envFile = ".env"
$odooDb = "servigas"
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*ODOO_DB=(.+)$') { $odooDb = $Matches[1].Trim() }
}

Write-Host "Esperando Odoo healthy..."
$deadline = (Get-Date).AddMinutes(5)
do {
  $ps = docker compose --env-file $envFile ps --format json 2>$null | ConvertFrom-Json
  $odoo = @($ps) | Where-Object { $_.Service -eq "odoo" } | Select-Object -First 1
  if ($odoo.Health -eq "healthy" -or $odoo.State -eq "running") { break }
  Start-Sleep -Seconds 5
} while ((Get-Date) -lt $deadline)

Write-Host "Instalando módulos en DB '$odooDb' (puede tardar varios minutos)..."
docker compose --env-file $envFile run --rm --no-deps odoo `
  odoo -d $odooDb `
  -i servigas_core,servigas_integrations `
  --without-demo=all `
  --stop-after-init `
  --db_host=db `
  --db_user=odoo `
  --db_password=odoo

Write-Host ""
Write-Host "Listo. Reiniciando servicios..."
docker compose --env-file $envFile up -d
Write-Host "Shell Astro: http://127.0.0.1:4322  |  Odoo nativo: http://127.0.0.1:8069"
Write-Host "Creá el usuario admin en el wizard Odoo la primera vez (o usá el que ya exista)."
