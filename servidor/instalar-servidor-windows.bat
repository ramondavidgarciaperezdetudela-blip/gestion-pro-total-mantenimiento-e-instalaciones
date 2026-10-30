@echo off
setlocal enabledelayedexpansion
title Instalador Servidor - Gestion Pro Total

echo.
echo ================================================================
echo  GESTION PRO TOTAL - Instalador de Servidor Windows
echo ================================================================
echo.
echo  Este script instala la aplicacion como servidor web.
echo  Los demas equipos de la red podran acceder via navegador.
echo.

:: Detectar IP local
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set SERVER_IP=%%a
    set SERVER_IP=!SERVER_IP: =!
    goto :gotip
)
:gotip
echo  IP del servidor detectada: !SERVER_IP!
echo.

:: Detectar carpeta del proyecto
set IDIR=%~dp0
set IDIR=%IDIR:~0,-1%
:: El script esta en servidor\ asi que subir un nivel
for %%i in (%IDIR%) do set PARENT=%%~dpi
set PARENT=%PARENT:~0,-1%

if exist "%PARENT%\package.json" (
    set PDIR=%PARENT%
) else if exist "%PARENT%\codigo\package.json" (
    set PDIR=%PARENT%\codigo
) else if exist "%IDIR%\..\package.json" (
    set PDIR=%IDIR%\..
) else (
    echo  ERROR: No encontre package.json.
    pause & exit /b 1
)
echo  Proyecto en: !PDIR!

:: PASO 1: Node.js
echo.
echo [1/7] Comprobando Node.js...
node --version >nul 2>&1 || (
    echo  Descargando Node.js v20...
    powershell -NoProfile -Command "(New-Object Net.WebClient).DownloadFile('https://nodejs.org/dist/v20.17.0/node-v20.17.0-x64.msi','%TEMP%\node.msi')"
    msiexec /i "%TEMP%\node.msi" /quiet /norestart
    del "%TEMP%\node.msi" >nul 2>&1
)
for /f %%v in ('node -e "process.stdout.write(process.version)"') do echo  OK Node.js %%v

:: PASO 2: npm install y build
echo.
echo [2/7] Instalando dependencias...
cd /d !PDIR!
if not exist .env.local (
    echo VITE_BASE44_APP_ID=6994f99700e8a842baf72997> .env.local
    echo VITE_BASE44_APP_BASE_URL=https://gestion-pro-total-mantenimiento-e-instalaciones-6994f997.base44.app>> .env.local
)
call npm install --prefer-offline
echo.
echo [3/7] Compilando para produccion...
call npm run build
if errorlevel 1 (echo  ERROR en build & pause & exit /b 1)
echo  OK Build completado en dist\

:: PASO 3: Instalar Nginx para Windows
echo.
echo [4/7] Instalando Nginx...
set NGINX_DIR=C:\nginx
if not exist %NGINX_DIR%\nginx.exe (
    echo  Descargando Nginx...
    powershell -NoProfile -Command "(New-Object Net.WebClient).DownloadFile('https://nginx.org/download/nginx-1.26.2.zip','%TEMP%\nginx.zip')"
    powershell -NoProfile -Command "Expand-Archive -Path '%TEMP%\nginx.zip' -DestinationPath 'C:\' -Force"
    for /d %%d in (C:\nginx-*) do rename %%d nginx
    del "%TEMP%\nginx.zip" >nul 2>&1
)
echo  OK Nginx en %NGINX_DIR%

:: PASO 4: Copiar build a nginx/html
echo.
echo [5/7] Desplegando aplicacion...
set WEB_DIR=%NGINX_DIR%\html\gestion-pro-total
if not exist %WEB_DIR% mkdir %WEB_DIR%
xcopy /E /Y /Q "!PDIR!\dist\*" "%WEB_DIR%\" >nul
echo  OK Ficheros en %WEB_DIR%

:: PASO 5: Configurar Nginx
echo.
echo [6/7] Configurando Nginx...
if not exist %NGINX_DIR%\conf\sites mkdir %NGINX_DIR%\conf\sites

(
echo server {
echo     listen 80 default_server;
echo     server_name _;
echo     root html/gestion-pro-total;
echo     index index.html;
echo     gzip on;
echo     gzip_types text/plain text/css application/javascript application/json;
echo     location ~* \.(js^|css^|woff2^|png^|jpg^|svg^|ico^)$ {
echo         expires 30d;
echo         add_header Cache-Control "public, immutable";
echo     }
echo     location / {
echo         try_files $uri $uri/ /index.html;
echo     }
echo     location /api/ {
echo         proxy_pass https://gestion-pro-total-mantenimiento-e-instalaciones-6994f997.base44.app/api/;
echo         proxy_set_header Host gestion-pro-total-mantenimiento-e-instalaciones-6994f997.base44.app;
echo         proxy_read_timeout 120s;
echo     }
echo     location /health {
echo         return 200 '{"status":"ok"}';
echo         add_header Content-Type application/json;
echo     }
echo     client_max_body_size 50M;
echo     access_log logs/gpt-access.log;
echo     error_log  logs/gpt-error.log;
echo }
) > %NGINX_DIR%\conf\gestion-pro-total.conf

:: Incluir config en nginx.conf principal
findstr /c:"gestion-pro-total.conf" %NGINX_DIR%\conf\nginx.conf >nul 2>&1 || (
    echo     include gestion-pro-total.conf;>> %NGINX_DIR%\conf\nginx.conf
)

:: Arrancar nginx
taskkill /F /IM nginx.exe >nul 2>&1
cd /d %NGINX_DIR%
start /B nginx.exe
cd /d !PDIR!
echo  OK Nginx arrancado

:: PASO 6: Tarea programada para arranque automatico
echo.
echo [7/7] Configurando arranque automatico...
schtasks /create /tn "GestionProTotal-Nginx" /tr "C:\nginx\nginx.exe" /sc onstart /ru SYSTEM /f >nul 2>&1
echo  OK Nginx se iniciara automaticamente con Windows

:: Script de actualizacion
(
echo @echo off
echo echo Actualizando Gestion Pro Total...
echo cd /d !PDIR!
echo call npm install
echo call npm run build
echo xcopy /E /Y /Q "!PDIR!\dist\*" "!WEB_DIR!\" ^>nul
echo taskkill /F /IM nginx.exe ^>nul 2^>^&1
echo cd /d C:\nginx ^&^& start /B nginx.exe
echo echo Actualizacion completada.
) > !PDIR!\servidor\actualizar-servidor.bat
echo  OK Script actualizar-servidor.bat creado

echo.
echo ================================================================
echo  SERVIDOR INSTALADO CORRECTAMENTE
echo ================================================================
echo.
echo  Accede desde cualquier dispositivo de la red:
echo  http://!SERVER_IP!
echo.
echo  Para actualizar: ejecuta servidor\actualizar-servidor.bat
echo.
echo  FIREWALL: Si otros equipos no pueden acceder, abre el puerto 80:
echo  Panel de control ^> Firewall ^> Reglas de entrada ^> Puerto 80 TCP
echo.
pause
endlocal
