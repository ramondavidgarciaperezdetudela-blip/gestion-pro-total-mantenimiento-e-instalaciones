@echo off
setlocal enabledelayedexpansion
title Configurador Servidor - Gestion Pro Total

echo.
echo +============================================================+
echo ^|   GESTION PRO TOTAL - Configurador Servidor Windows       ^|
echo ^|   Acceso red local + Acceso remoto para tecnicos          ^|
echo +============================================================+
echo.

:: Verificar Administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: Ejecuta como Administrador.
    echo  Clic derecho sobre el archivo y Ejecutar como administrador.
    pause & exit /b 1
)
echo  OK Ejecutando como Administrador.

:: Detectar IP local
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set RAW=%%a
    set RAW=!RAW: =!
    if not "!RAW!"=="" if "!SERVER_IP!"=="" set SERVER_IP=!RAW!
)
echo  OK IP del servidor: !SERVER_IP!

:: Configuracion de puertos y dominio
echo.
set /p DOMAIN=  Dominio publico (ej: gestion.miempresa.com) o ENTER para omitir: 
set /p PORT=  Puerto HTTP (ENTER = 80): 
if "!PORT!"=="" set PORT=80
set /p PORT_HTTPS=  Puerto HTTPS (ENTER = 443): 
if "!PORT_HTTPS!"=="" set PORT_HTTPS=443

:: ── PASO 1: Node.js ─────────────────────────────────────────
echo.
echo [1/9] Comprobando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  Descargando Node.js 20 LTS...
    powershell -NoProfile -Command "(New-Object Net.WebClient).DownloadFile('https://nodejs.org/dist/v20.17.0/node-v20.17.0-x64.msi','%TEMP%\node.msi')"
    msiexec /i "%TEMP%\node.msi" /quiet /norestart
    del "%TEMP%\node.msi" >nul 2>&1
)
for /f %%v in ('node -e "process.stdout.write(process.version)"') do echo  OK Node.js %%v

:: ── PASO 2: PM2 ─────────────────────────────────────────────
echo.
echo [2/9] Instalando PM2 (gestor de procesos)...
call npm install -g pm2 >nul 2>&1
echo  OK PM2 instalado.

:: ── PASO 3: Nginx ───────────────────────────────────────────
echo.
echo [3/9] Instalando Nginx...
set NGINX_DIR=C:\nginx
if not exist %NGINX_DIR%\nginx.exe (
    echo  Descargando Nginx...
    powershell -NoProfile -Command "(New-Object Net.WebClient).DownloadFile('https://nginx.org/download/nginx-1.26.2.zip','%TEMP%\nginx.zip')"
    powershell -NoProfile -Command "Expand-Archive -Path '%TEMP%\nginx.zip' -DestinationPath 'C:\' -Force"
    for /d %%d in (C:\nginx-*) do rename %%d nginx
    del "%TEMP%\nginx.zip" >nul 2>&1
)
echo  OK Nginx en %NGINX_DIR%

:: ── PASO 4: Localizar proyecto ──────────────────────────────
echo.
echo [4/9] Localizando proyecto...
set SDIR=%~dp0
set SDIR=%SDIR:~0,-1%
for %%i in ("%SDIR%") do set P1=%%~dpi
set P1=%P1:~0,-1%
for %%i in ("%P1%") do set P2=%%~dpi
set P2=%P2:~0,-1%

if exist "%P1%\package.json" (set PDIR=%P1%
) else if exist "%P2%\package.json" (set PDIR=%P2%
) else if exist "%P1%\codigo\package.json" (set PDIR=%P1%\codigo
) else (
    set /p PDIR=  Ruta a la carpeta del proyecto (con package.json): 
)
echo  OK Proyecto en: !PDIR!

:: ── PASO 5: Build ───────────────────────────────────────────
echo.
echo [5/9] Compilando aplicacion para produccion...
cd /d !PDIR!
if not exist .env.local (
    echo VITE_BASE44_APP_ID=6994f99700e8a842baf72997> .env.local
    echo VITE_BASE44_APP_BASE_URL=https://gestion-pro-total-mantenimiento-e-instalaciones-6994f997.base44.app>> .env.local
)
call npm install --prefer-offline >nul 2>&1
call npm run build
if errorlevel 1 (echo  ERROR en build & pause & exit /b 1)
echo  OK Compilacion completada.

:: ── PASO 6: Desplegar en Nginx ──────────────────────────────
echo.
echo [6/9] Desplegando en Nginx...
set WEB_DIR=%NGINX_DIR%\html\gestion-pro-total
if not exist %WEB_DIR% mkdir %WEB_DIR%
xcopy /E /Y /Q "!PDIR!\dist\*" "%WEB_DIR%\" >nul
echo  OK Ficheros copiados.

:: Certificado SSL con OpenSSL si esta disponible
if not exist %NGINX_DIR%\ssl mkdir %NGINX_DIR%\ssl
where openssl >nul 2>&1
if %errorlevel% equ 0 (
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 ^
        -keyout %NGINX_DIR%\ssl\gpt.key ^
        -out %NGINX_DIR%\ssl\gpt.crt ^
        -subj "/C=ES/ST=Espana/L=Local/O=Empresa/CN=!SERVER_IP!" >nul 2>&1
    echo  OK Certificado SSL generado.
) else (
    echo  AVISO: OpenSSL no encontrado. El servidor usara solo HTTP.
    echo  Instala OpenSSL desde: https://slproweb.com/products/Win32OpenSSL.html
)

:: Configuracion Nginx completa
if exist %NGINX_DIR%\ssl\gpt.crt (
    set SSL_MODE=1
) else (
    set SSL_MODE=0
)

(
echo worker_processes  1;
echo events { worker_connections 1024; }
echo http {
echo     include       mime.types;
echo     default_type  application/octet-stream;
echo     sendfile      on;
echo     keepalive_timeout 65;
echo     gzip on;
echo     gzip_types text/plain text/css application/javascript application/json image/svg+xml;
echo.
if "!SSL_MODE!"=="1" (
echo     server {
echo         listen !PORT!;
echo         server_name _;
echo         return 301 https://$host$request_uri;
echo     }
echo.
echo     server {
echo         listen !PORT_HTTPS! ssl;
echo         server_name !SERVER_IP! localhost !DOMAIN!;
echo         ssl_certificate     ssl/gpt.crt;
echo         ssl_certificate_key ssl/gpt.key;
echo         ssl_protocols       TLSv1.2 TLSv1.3;
)
if "!SSL_MODE!"=="0" (
echo     server {
echo         listen !PORT!;
echo         server_name !SERVER_IP! localhost !DOMAIN!;
)
echo         root   html/gestion-pro-total;
echo         index  index.html;
echo         location ~* \.(js^|css^|png^|jpg^|svg^|ico^|woff2^)$ {
echo             expires 30d;
echo             add_header Cache-Control "public, immutable";
echo         }
echo         location / { try_files $uri $uri/ /index.html; }
echo         location /api/ {
echo             proxy_pass https://gestion-pro-total-mantenimiento-e-instalaciones-6994f997.base44.app/api/;
echo             proxy_set_header Host gestion-pro-total-mantenimiento-e-instalaciones-6994f997.base44.app;
echo             proxy_read_timeout 120s;
echo             client_max_body_size 50M;
echo         }
echo         location /health { return 200 '{"ok":true}'; add_header Content-Type application/json; }
echo         access_log  logs/gpt-access.log;
echo         error_log   logs/gpt-error.log;
echo     }
echo }
) > %NGINX_DIR%\conf\nginx.conf
echo  OK Nginx configurado.

:: ── PASO 7: Firewall ────────────────────────────────────────
echo.
echo [7/9] Configurando Firewall de Windows...
netsh advfirewall firewall delete rule name="GPT-HTTP" >nul 2>&1
netsh advfirewall firewall delete rule name="GPT-HTTPS" >nul 2>&1
netsh advfirewall firewall add rule name="GPT-HTTP" protocol=TCP dir=in localport=!PORT! action=allow >nul
netsh advfirewall firewall add rule name="GPT-HTTPS" protocol=TCP dir=in localport=!PORT_HTTPS! action=allow >nul
echo  OK Puertos !PORT! y !PORT_HTTPS! abiertos.

:: ── PASO 8: Arrancar Nginx ──────────────────────────────────
echo.
echo [8/9] Arrancando Nginx...
taskkill /F /IM nginx.exe >nul 2>&1
cd /d %NGINX_DIR%
start /B nginx.exe
cd /d !PDIR!
schtasks /create /tn "GPT-Servidor" /tr "C:\nginx\nginx.exe" /sc onstart /ru SYSTEM /f >nul 2>&1
echo  OK Nginx arrancado y configurado para inicio automatico.

:: ── PASO 9: Script de actualizacion ─────────────────────────
echo.
echo [9/9] Creando script de actualizacion...
(
    echo @echo off
    echo echo Actualizando Gestion Pro Total...
    echo cd /d "!PDIR!"
    echo call npm install
    echo call npm run build
    echo xcopy /E /Y /Q "!PDIR!\dist\*" "%WEB_DIR%\" ^>nul
    echo taskkill /F /IM nginx.exe ^>nul 2^>^&1
    echo cd /d C:\nginx ^& start /B nginx.exe
    echo echo Actualizacion completada.
    echo pause
) > "!SDIR!\actualizar-servidor.bat"
echo  OK Script actualizar-servidor.bat creado.

:: Guardar datos del servidor
(
    echo IP Servidor: !SERVER_IP!
    echo Puerto HTTP: !PORT!
    echo Puerto HTTPS: !PORT_HTTPS!
    echo Dominio: !DOMAIN!
    echo Web dir: %WEB_DIR%
    echo Proyecto: !PDIR!
) > "!SDIR!\datos-servidor.txt"

echo.
echo +============================================================+
echo ^|        SERVIDOR CONFIGURADO CORRECTAMENTE                  ^|
echo +============================================================+
echo.
echo  Acceso desde la RED LOCAL (LAN):
echo    http://!SERVER_IP!
if "!SSL_MODE!"=="1" echo    https://!SERVER_IP!
echo.
if not "!DOMAIN!"=="" (
    echo  Acceso REMOTO para tecnicos:
    echo    https://!DOMAIN!
    echo    Configura el router: reenviar puerto !PORT_HTTPS! a !SERVER_IP!
    echo.
)
echo  Datos guardados en: datos-servidor.txt
echo  Actualizacion: ejecuta actualizar-servidor.bat
echo.
pause
endlocal
