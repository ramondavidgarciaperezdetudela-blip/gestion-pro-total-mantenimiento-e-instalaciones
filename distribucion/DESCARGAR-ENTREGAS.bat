@echo off
chcp 65001 >nul 2>&1
title Descargar entregas - Gestion Pro Total
setlocal
set REPO=ramondavidgarciaperezdetudela-blip/gestion-pro-total-mantenimiento-e-instalaciones
set TAG=v1.0.0
cd /d "%~dp0"

echo.
echo  Descarga los instaladores %TAG% y los coloca en Windows\ macOS\ Linux\ Android\
echo.

:: Requiere GitHub CLI (gh). Una sola vez: instalar y "gh auth login".
where gh >nul 2>&1
if errorlevel 1 (
  echo  ERROR: Falta GitHub CLI.
  echo  1) Instalalo desde https://cli.github.com
  echo  2) Abre una terminal y ejecuta:  gh auth login
  echo  3) Vuelve a ejecutar este archivo.
  pause
  exit /b 1
)

if exist "_descargas" rmdir /S /Q "_descargas"
mkdir "_descargas" 2>nul
mkdir Windows macOS Linux Android 2>nul

echo  Descargando ficheros de la release %TAG% ...
gh release download %TAG% --repo %REPO% --dir "_descargas" --pattern "*-1.0.0-*" --pattern "gestion-pro-total.apk" --clobber
if errorlevel 1 (
  echo  ERROR al descargar. Has iniciado sesion con "gh auth login"?
  pause
  exit /b 1
)

move /Y "_descargas\*Windows*" Windows\ >nul 2>&1
move /Y "_descargas\*Mac*"     macOS\   >nul 2>&1
move /Y "_descargas\*Linux*"   Linux\   >nul 2>&1
move /Y "_descargas\*.apk"     Android\ >nul 2>&1
rmdir /S /Q "_descargas" 2>nul

echo.
echo  LISTO. Ficheros colocados por sistema:
echo    Windows\  macOS\  Linux\  Android\
echo  Ya puedes comprimir cada carpeta y enviarla al cliente.
echo.
pause
endlocal
