@echo off
chcp 65001 >nul
title Crear acceso directo - Gestion Pro Total
REM ============================================================
REM   Crea un icono en el Escritorio para subir nuevas versiones
REM   Solo tienes que hacer DOBLE CLIC en este archivo una vez.
REM ============================================================

set "AQUI=%~dp0"
set "DESTINO=%AQUI%Subir-Nueva-Version.html"
set "ICONO=%AQUI%Gestion-Pro-Total.ico"

echo.
echo   Creando el acceso directo en tu Escritorio...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell;" ^
  "$lnk = $ws.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\Subir version Gestion Pro.lnk');" ^
  "$lnk.TargetPath = '%DESTINO%';" ^
  "$lnk.WorkingDirectory = '%AQUI%';" ^
  "$lnk.IconLocation = '%ICONO%';" ^
  "$lnk.Description = 'Subir nueva version de Gestion Pro Total';" ^
  "$lnk.Save()"

if %errorlevel%==0 (
  echo   ✅ Listo. Busca en tu Escritorio el icono:
  echo      "Subir version Gestion Pro"
) else (
  echo   ❌ No se pudo crear el acceso directo.
  echo      Puedes abrir igualmente "Subir-Nueva-Version.html" con doble clic.
)

echo.
echo   Pulsa una tecla para cerrar esta ventana.
pause >nul
