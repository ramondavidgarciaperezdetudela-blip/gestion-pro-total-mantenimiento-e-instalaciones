# ==============================================================================
#  GESTION PRO TOTAL - Configurador de Servidor Windows
#  Ejecutar como Administrador:
#  PowerShell -> Boton derecho -> Ejecutar como administrador
#  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#  .\configurar-servidor.ps1
# ==============================================================================

$Host.UI.RawUI.WindowTitle = "Gestion Pro Total - Configurador de Servidor"
$ErrorActionPreference = "Continue"

# Colores
function Write-OK   { param($t) Write-Host "  [OK]  $t" -ForegroundColor Green }
function Write-WARN { param($t) Write-Host "  [!!]  $t" -ForegroundColor Yellow }
function Write-ERR  { param($t) Write-Host "  [XX]  $t" -ForegroundColor Red }
function Write-INFO { param($t) Write-Host "  [--]  $t" -ForegroundColor Cyan }
function Write-HEAD { param($t) Write-Host "`n$t" -ForegroundColor White -BackgroundColor DarkBlue }

Clear-Host
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  GESTION PRO TOTAL - Configurador Interactivo de Servidor" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# ==============================================================================
# PASO 0: Detectar proyecto
# ==============================================================================
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir   # servidor-config esta dentro del proyecto

if (Test-Path "$ProjectDir\package.json") {
    $PDIR = $ProjectDir
} elseif (Test-Path "$ProjectDir\codigo\package.json") {
    $PDIR = "$ProjectDir\codigo"
} else {
    $PDIR = $ProjectDir
}
Write-INFO "Proyecto en: $PDIR"

# ==============================================================================
# PASO 1: Recoger datos de configuracion
# ==============================================================================
Write-HEAD " PASO 1/8: Datos de red del servidor "
Write-Host ""

# Obtener IPs disponibles
$IPs = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -ne "127.0.0.1" } | Select-Object IPAddress, InterfaceAlias
Write-INFO "IPs detectadas en este equipo:"
$IPs | ForEach-Object { Write-Host "    $($_.IPAddress)  [$($_.InterfaceAlias)]" -ForegroundColor Yellow }
Write-Host ""

$SERVER_IP = Read-Host "  IP del servidor para la red local (Enter para usar $($IPs[0].IPAddress))"
if ([string]::IsNullOrWhiteSpace($SERVER_IP)) { $SERVER_IP = $IPs[0].IPAddress }

$SERVER_PORT = Read-Host "  Puerto HTTP (Enter para usar 80)"
if ([string]::IsNullOrWhiteSpace($SERVER_PORT)) { $SERVER_PORT = "80" }

$HTTPS_PORT = Read-Host "  Puerto HTTPS (Enter para usar 443)"
if ([string]::IsNullOrWhiteSpace($HTTPS_PORT)) { $HTTPS_PORT = "443" }

$EMPRESA = Read-Host "  Nombre de la empresa"
if ([string]::IsNullOrWhiteSpace($EMPRESA)) { $EMPRESA = "Mi Empresa" }

Write-Host ""
Write-HEAD " PASO 2/8: Acceso remoto para tecnicos "
Write-Host ""
Write-Host "  El acceso remoto permite a los tecnicos conectarse desde"
Write-Host "  fuera de la oficina (movil, tablet, portatil) via Internet."
Write-Host ""
$REMOTE = Read-Host "  Habilitar acceso remoto? (S/N)"
$ENABLE_REMOTE = ($REMOTE -match "^[Ss]")

if ($ENABLE_REMOTE) {
    Write-Host ""
    Write-Host "  Opciones de acceso remoto:" -ForegroundColor Cyan
    Write-Host "    1. Dominio propio (ej: gestion.miempresa.com)"
    Write-Host "    2. Servicio de tunel gratuito (ngrok - sin router)"
    Write-Host "    3. IP publica del router (requiere abrir puertos)"
    $REMOTE_TYPE = Read-Host "  Elige opcion (1/2/3)"

    if ($REMOTE_TYPE -eq "1") {
        $DOMAIN = Read-Host "  Introduce tu dominio (ej: gestion.miempresa.com)"
    } elseif ($REMOTE_TYPE -eq "2") {
        $DOMAIN = "ngrok"
        Write-INFO "Se configurara ngrok como tunel seguro"
    } else {
        $DOMAIN = Read-Host "  IP publica del router (busca en https://www.cualesmiip.com)"
    }
} else {
    $DOMAIN = $SERVER_IP
}

Write-Host ""
Write-HEAD " PASO 3/8: Contrasena de acceso "
Write-Host ""
Write-Host "  Puedes proteger el acceso con una contrasena basica."
Write-Host "  (Solo para la URL de la red local - Base44 tiene su propio login)"
Write-Host ""
$USE_AUTH = Read-Host "  Proteger con contrasena? (S/N)"
$ENABLE_AUTH = ($USE_AUTH -match "^[Ss]")

if ($ENABLE_AUTH) {
    $AUTH_USER = Read-Host "  Usuario"
    $AUTH_PASS = Read-Host "  Contrasena" -AsSecureString
    $AUTH_PASS_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($AUTH_PASS)
    )
}

# ==============================================================================
# PASO 4: Instalar Nginx si no existe
# ==============================================================================
Write-HEAD " PASO 4/8: Servidor web Nginx "
Write-Host ""

$NGINX_DIR = "C:\nginx"
if (-not (Test-Path "$NGINX_DIR\nginx.exe")) {
    Write-INFO "Descargando Nginx para Windows..."
    try {
        $ngUrl = "https://nginx.org/download/nginx-1.26.2.zip"
        $ngZip = "$env:TEMP\nginx.zip"
        (New-Object Net.WebClient).DownloadFile($ngUrl, $ngZip)
        Expand-Archive -Path $ngZip -DestinationPath "C:\" -Force
        $ngFolder = Get-ChildItem "C:\nginx-*" -Directory | Select-Object -First 1
        if ($ngFolder) { Rename-Item $ngFolder.FullName "nginx" -ErrorAction SilentlyContinue }
        Remove-Item $ngZip -Force -ErrorAction SilentlyContinue
        Write-OK "Nginx instalado en C:\nginx"
    } catch {
        Write-ERR "No se pudo descargar Nginx. Comprueba la conexion a Internet."
        Write-ERR "Descarga manual: https://nginx.org/en/download.html"
    }
} else {
    Write-OK "Nginx ya instalado: $NGINX_DIR"
}

# Crear carpeta sites-available
New-Item -ItemType Directory -Force -Path "$NGINX_DIR\conf\sites" | Out-Null

# ==============================================================================
# PASO 5: Build del proyecto
# ==============================================================================
Write-HEAD " PASO 5/8: Compilar la aplicacion "
Write-Host ""

Set-Location $PDIR
if (-not (Test-Path ".env.local")) {
    @"
VITE_BASE44_APP_ID=6994f99700e8a842baf72997
VITE_BASE44_APP_BASE_URL=https://gestion-pro-total-mantenimiento-e-instalaciones-6994f997.base44.app
"@ | Set-Content ".env.local"
    Write-OK ".env.local creado"
}

Write-INFO "Instalando dependencias npm..."
& npm install --prefer-offline 2>&1 | Out-Null
Write-INFO "Compilando para produccion..."
& npm run build 2>&1 | Out-Null
if (Test-Path "dist\index.html") {
    Write-OK "Aplicacion compilada -> dist\"
} else {
    Write-ERR "Error en la compilacion. Revisa la conexion a Internet."
}

# Desplegar en nginx/html
$WEB_DIR = "$NGINX_DIR\html\gestion-pro-total"
New-Item -ItemType Directory -Force -Path $WEB_DIR | Out-Null
Copy-Item "$PDIR\dist\*" $WEB_DIR -Recurse -Force
Write-OK "Aplicacion desplegada en $WEB_DIR"

# ==============================================================================
# PASO 6: Generar configuracion Nginx
# ==============================================================================
Write-HEAD " PASO 6/8: Configurando Nginx "
Write-Host ""

# Generar htpasswd si se usa autenticacion
$AUTH_BLOCK = ""
if ($ENABLE_AUTH) {
    $htFile = "$NGINX_DIR\conf\htpasswd"
    # Hash basico (Apache compatible)
    Add-Type -AssemblyName System.Web
    $hash = [System.Web.Security.FormsAuthentication]::HashPasswordForStoringInConfigFile($AUTH_PASS_PLAIN, "SHA1")
    "$AUTH_USER`:{SHA}$hash" | Set-Content $htFile
    $AUTH_BLOCK = @"
        auth_basic "$EMPRESA - Acceso Restringido";
        auth_basic_user_file conf/htpasswd;
"@
    Write-OK "Autenticacion configurada"
}

$NGINX_CONF = @"
# Gestion Pro Total - Configuracion Nginx
# Empresa: $EMPRESA
# Generado: $(Get-Date -Format 'dd/MM/yyyy HH:mm')

server {
    listen $SERVER_PORT default_server;
    server_name $SERVER_IP $DOMAIN;
    root html/gestion-pro-total;
    index index.html;
    charset utf-8;

    # Compresion
    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;
    gzip_vary on;

    # Cache assets estaticos (30 dias)
    location ~* \.(js|css|woff2|woff|ttf|png|jpg|jpeg|svg|ico|webp)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        $AUTH_BLOCK
    }

    # SPA - todas las rutas van a index.html
    location / {
        try_files `$uri `$uri/ /index.html;
        add_header X-Frame-Options SAMEORIGIN;
        add_header X-Content-Type-Options nosniff;
        $AUTH_BLOCK
    }

    # Proxy API -> Base44 Cloud
    location /api/ {
        proxy_pass https://gestion-pro-total-mantenimiento-e-instalaciones-6994f997.base44.app/api/;
        proxy_http_version 1.1;
        proxy_set_header Host gestion-pro-total-mantenimiento-e-instalaciones-6994f997.base44.app;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;
        proxy_read_timeout 120s;
        proxy_connect_timeout 10s;
    }

    # Health check
    location /health {
        return 200 '{"status":"ok","empresa":"$EMPRESA","servidor":"$SERVER_IP"}';
        add_header Content-Type application/json;
        access_log off;
    }

    client_max_body_size 50M;
    access_log logs/gpt-access.log;
    error_log logs/gpt-error.log;
}
"@

$NGINX_CONF | Set-Content "$NGINX_DIR\conf\gestion-pro-total.conf"

# Incluir en nginx.conf principal si no esta ya
$mainConf = Get-Content "$NGINX_DIR\conf\nginx.conf" -Raw
if (-not ($mainConf -match "gestion-pro-total.conf")) {
    $mainConf = $mainConf -replace "(http\s*\{)", "`$1`n    include gestion-pro-total.conf;"
    $mainConf | Set-Content "$NGINX_DIR\conf\nginx.conf"
}
Write-OK "nginx.conf configurado"

# Probar configuracion
Set-Location $NGINX_DIR
$testResult = & ".\nginx.exe" -t 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-OK "Configuracion Nginx valida"
} else {
    Write-WARN "Advertencia en la configuracion: $testResult"
}

# ==============================================================================
# PASO 7: Arrancar Nginx y configurar inicio automatico
# ==============================================================================
Write-HEAD " PASO 7/8: Arranque y servicio automatico "
Write-Host ""

# Parar nginx si ya corre
Get-Process -Name nginx -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep 1

# Arrancar nginx
Start-Process -FilePath "$NGINX_DIR\nginx.exe" -WorkingDirectory $NGINX_DIR -WindowStyle Hidden
Start-Sleep 2

$nginxRunning = Get-Process -Name nginx -ErrorAction SilentlyContinue
if ($nginxRunning) {
    Write-OK "Nginx arrancado y en ejecucion"
} else {
    Write-WARN "Nginx no pudo arrancar. Revisa $NGINX_DIR\logs\error.log"
}

# Tarea programada para inicio automatico con Windows
$taskAction = New-ScheduledTaskAction -Execute "$NGINX_DIR\nginx.exe" -WorkingDirectory $NGINX_DIR
$taskTrigger = New-ScheduledTaskTrigger -AtStartup
$taskSettings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit 0 -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName "GestionProTotal-Nginx" -Action $taskAction -Trigger $taskTrigger -Settings $taskSettings -RunLevel Highest -Force | Out-Null
Write-OK "Tarea programada creada (Nginx arranca con Windows)"

# ==============================================================================
# PASO 8: Firewall y acceso remoto
# ==============================================================================
Write-HEAD " PASO 8/8: Firewall y acceso remoto "
Write-Host ""

# Abrir puertos en el firewall de Windows
$rules = @(
    @{Name="GPT-HTTP";   Port=$SERVER_PORT; Proto="TCP"},
    @{Name="GPT-HTTPS";  Port=$HTTPS_PORT;  Proto="TCP"}
)
foreach ($rule in $rules) {
    netsh advfirewall firewall delete rule name=$($rule.Name) | Out-Null
    netsh advfirewall firewall add rule name=$($rule.Name) protocol=$($rule.Proto) dir=in localport=$($rule.Port) action=allow | Out-Null
    Write-OK "Puerto $($rule.Port) $($rule.Proto) abierto en firewall"
}

# Ngrok si se eligio
if ($ENABLE_REMOTE -and $REMOTE_TYPE -eq "2") {
    Write-Head " Configurando ngrok para acceso remoto "
    Write-Host ""
    if (-not (Get-Command ngrok -ErrorAction SilentlyContinue)) {
        Write-INFO "Descargando ngrok..."
        try {
            (New-Object Net.WebClient).DownloadFile("https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip","$env:TEMP\ngrok.zip")
            Expand-Archive "$env:TEMP\ngrok.zip" "C:\ngrok" -Force
            $env:PATH += ";C:\ngrok"
            Write-OK "ngrok descargado"
            Write-WARN "Necesitas una cuenta gratuita en https://ngrok.com"
            $ngrokToken = Read-Host "  Introduce tu ngrok authtoken (de https://dashboard.ngrok.com)"
            if (-not [string]::IsNullOrWhiteSpace($ngrokToken)) {
                & "C:\ngrok\ngrok.exe" config add-authtoken $ngrokToken
                Write-OK "ngrok configurado"
            }
        } catch {
            Write-WARN "No se pudo instalar ngrok automaticamente"
        }
    }

    # Crear script para arrancar ngrok
    @"
@echo off
echo Iniciando tunel ngrok para acceso remoto...
C:\ngrok\ngrok.exe http $SERVER_PORT
"@ | Set-Content "$PDIR\servidor-config\iniciar-acceso-remoto.bat"
    Write-OK "Script de acceso remoto: servidor-config\iniciar-acceso-remoto.bat"
}

# ==============================================================================
# Generar fichero de configuracion guardada
# ==============================================================================
$CONFIG_FILE = "$ScriptDir\configuracion-activa.txt"
@"
================================================================
 GESTION PRO TOTAL - CONFIGURACION DEL SERVIDOR
 Empresa: $EMPRESA
 Configurado: $(Get-Date -Format 'dd/MM/yyyy HH:mm')
================================================================

IP DEL SERVIDOR:     $SERVER_IP
PUERTO HTTP:         $SERVER_PORT
PUERTO HTTPS:        $HTTPS_PORT
DOMINIO/ACCESO:      $DOMAIN
ACCESO REMOTO:       $( if ($ENABLE_REMOTE) { "SI - $REMOTE_TYPE" } else { "NO" } )
AUTENTICACION:       $( if ($ENABLE_AUTH) { "SI - Usuario: $AUTH_USER" } else { "NO" } )
DIRECTORIO WEB:      $WEB_DIR
NGINX DIR:           $NGINX_DIR
PROYECTO:            $PDIR

URL RED LOCAL:       http://$SERVER_IP:$SERVER_PORT
URL ALTERNATIVA:     http://localhost:$SERVER_PORT

COMO CONECTARSE:
  Red local (oficina):  http://$SERVER_IP:$SERVER_PORT
$( if ($ENABLE_REMOTE -and $DOMAIN -ne $SERVER_IP) { "  Acceso remoto:        http://$DOMAIN`:$SERVER_PORT" } )
$( if ($ENABLE_REMOTE -and $REMOTE_TYPE -eq "2") { "  Ngrok (remoto):       ejecutar servidor-config\iniciar-acceso-remoto.bat" } )

ACTUALIZACION:
  Ejecutar: servidor-config\actualizar-servidor.bat

LOGS:
  C:\nginx\logs\gpt-access.log
  C:\nginx\logs\gpt-error.log
================================================================
"@ | Set-Content $CONFIG_FILE

# Script de actualizacion
@"
@echo off
echo Actualizando Gestion Pro Total...
cd /d $PDIR
call npm install --prefer-offline
call npm run build
xcopy /E /Y /Q "dist\*" "$WEB_DIR\" >nul
cd /d C:\nginx && nginx.exe -s reload
echo Actualizacion completada.
pause
"@ | Set-Content "$ScriptDir\actualizar-servidor.bat"

Write-OK "Scripts de mantenimiento creados"

# ==============================================================================
# RESUMEN FINAL
# ==============================================================================
Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  SERVIDOR CONFIGURADO CORRECTAMENTE" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Acceso desde la red local:" -ForegroundColor White
Write-Host "    http://$SERVER_IP`:$SERVER_PORT" -ForegroundColor Yellow
Write-Host ""
if ($ENABLE_REMOTE -and $REMOTE_TYPE -eq "2") {
    Write-Host "  Acceso remoto (tecnicos externos):" -ForegroundColor White
    Write-Host "    Ejecutar: servidor-config\iniciar-acceso-remoto.bat" -ForegroundColor Yellow
    Write-Host "    La URL ngrok aparece en pantalla al arrancar" -ForegroundColor Gray
}
Write-Host ""
Write-Host "  Configuracion guardada en:" -ForegroundColor White
Write-Host "    $CONFIG_FILE" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Para actualizar la app:" -ForegroundColor White
Write-Host "    servidor-config\actualizar-servidor.bat" -ForegroundColor Yellow
Write-Host ""
Write-Host "================================================================" -ForegroundColor Green

# Abrir el navegador para verificar
Start-Sleep 2
Start-Process "http://$SERVER_IP`:$SERVER_PORT/health"
