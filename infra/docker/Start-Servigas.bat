@echo off
REM Doble clic / acceso directo del escritorio → levanta Docker Servigas y abre el browser.
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-Servigas.ps1" %*
if errorlevel 1 (
  echo.
  echo Fallo al arrancar Servigas. Revisá que Docker Desktop esté en marcha.
  pause
)
