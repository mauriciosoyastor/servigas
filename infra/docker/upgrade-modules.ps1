#Requires -Version 5.1
<#
.SYNOPSIS
  Actualiza módulos Servigas ya instalados en el stack Docker (-u).

.DESCRIPTION
  Usar después de git pull cuando cambió custom_addons (campos nuevos, taller, caja, etc.).
  install-modules.ps1 es para la primera instalación (-i); este script aplica upgrades.

.EXAMPLE
  cd infra/docker
  git pull
  docker compose --env-file .env up -d --build web
  .\upgrade-modules.ps1
#>
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path ".env")) {
  throw "Falta .env en infra/docker. Copiá .env.example a .env primero."
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

Write-Host "Upgrading servigas_core + servigas_integrations en DB '$odooDb'..."
docker compose --env-file $envFile run --rm --no-deps odoo `
  odoo -d $odooDb `
  -u servigas_core,servigas_integrations `
  --stop-after-init `
  --db_host=db `
  --db_user=odoo `
  --db_password=odoo

Write-Host ""
Write-Host "Listo. Reiniciando servicios..."
docker compose --env-file $envFile up -d
Write-Host "Smoke: Taller -> Ordenes de trabajo (/lists/workshop/orders) y hub Inventario."
