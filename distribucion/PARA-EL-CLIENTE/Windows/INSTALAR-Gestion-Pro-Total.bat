@echo off
chcp 65001 >nul
title Gestion Pro Total - Instalador
set "RELEASES=https://github.com/ramondavidgarciaperezdetudela-blip/gestion-pro-total-releases/releases/latest"
set "WEB=https://gestion-pro-total.base44.app"

:menu
cls
echo ============================================================
echo                  GESTION PRO TOTAL
echo            Como quieres usar el programa?
echo ============================================================
echo.
echo   [1] Instalar en este PC  (aplicacion normal de Windows)   ^<-- RECOMENDADO
echo       Icono, menu inicio y desinstalador, como cualquier app.
echo.
echo   [2] Servidor local  (usarlo desde varios equipos de tu red)
echo.
echo   [3] Usar en la nube / instalar como app web (PWA)
echo.
echo   [4] Salir
echo.
set /p "op=Escribe 1, 2, 3 o 4 y pulsa Enter: "
if "%op%"=="1" goto pc
if "%op%"=="2" goto servidor
if "%op%"=="3" goto nube
if "%op%"=="4" exit /b
goto menu

:pc
cls
echo  INSTALAR EN ESTE PC
echo  -------------------
echo  1) Se abrira la pagina de descargas.
echo  2) Descarga el archivo que termina en:  -Windows-Setup.exe
echo  3) Haz doble clic en ese archivo y sigue el asistente.
echo.
echo  Si Windows muestra "Windows protegio tu PC":
echo     pulsa  "Mas informacion"  y luego  "Ejecutar de todas formas".
echo.
echo  (Tambien hay una version PORTABLE -Windows-Portable.exe que no instala nada.)
echo.
start "" "%RELEASES%"
pause
goto menu

:servidor
cls
echo  SERVIDOR LOCAL
echo  --------------
echo  Inicia el programa en este equipo y lo deja accesible para
echo  otros dispositivos de tu red (movil, tablet, otro PC).
echo.
echo  Deja esta ventana abierta mientras lo uses. Cierrala para apagarlo.
echo.
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0servidor-gpt.ps1"
pause
goto menu

:nube
cls
echo  USAR EN LA NUBE / APP WEB
echo  -------------------------
echo  Se abrira la app en el navegador. Para tenerla como una app:
echo  en la barra de direcciones pulsa el icono "Instalar".
echo.
start "" "%WEB%"
pause
goto menu
