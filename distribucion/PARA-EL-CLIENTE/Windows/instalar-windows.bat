@echo off
title Instalador - Gestion Pro Total
:menu
cls
echo ==========================================================
echo            GESTION PRO TOTAL - INSTALADOR
echo ==========================================================
echo.
echo   [A] Ejecutar ahora (sin instalar, modo portatil)
echo   [B] Instalar en este equipo (acceso directo en escritorio)
echo   [C] Descargar la app de escritorio (.exe oficial)
echo   [D] Instalar como App (PWA) desde el navegador
echo   [S] Salir
echo.
set /p op="Elige una opcion: "
if /i "%op%"=="A" goto run
if /i "%op%"=="B" goto install
if /i "%op%"=="C" goto exe
if /i "%op%"=="D" goto pwa
if /i "%op%"=="S" exit
goto menu

:run
call "%~dp0iniciar.bat"
goto menu

:install
set "DEST=%LOCALAPPDATA%\GestionProTotal"
echo Copiando archivos a %DEST% ...
xcopy "%~dp0*" "%DEST%\" /E /I /Y >/dev/null
echo Creando acceso directo en el escritorio...
powershell -NoProfile -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop')+'\Gestion Pro Total.lnk'); $s.TargetPath='%DEST%\iniciar.bat'; $s.WorkingDirectory='%DEST%'; $s.IconLocation='%DEST%\dist\favicon.ico'; $s.Save()"
echo.
echo Instalado. Tienes el acceso directo en el escritorio.
pause
goto menu

:exe
start "" "https://github.com/ramondavidgarciaperezdetudela-blip/gestion-pro-total-mantenimiento-e-instalaciones/releases/latest"
goto menu

:pwa
echo Abriendo la app en el navegador. Usa el icono "Instalar" de la barra de direcciones.
call "%~dp0iniciar.bat"
goto menu
