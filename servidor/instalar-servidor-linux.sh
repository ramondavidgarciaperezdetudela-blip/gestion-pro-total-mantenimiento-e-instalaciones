#!/bin/bash
# ================================================================
#  GESTION PRO TOTAL - Instalador de Servidor Linux/Ubuntu
#  Compatible: Ubuntu 20.04/22.04/24.04, Debian 11/12
#
#  QUE HACE ESTE SCRIPT:
#  1. Instala Node.js 20, Nginx, PM2
#  2. Compila la aplicacion para produccion
#  3. Configura Nginx como servidor web en el puerto 80
#  4. Configura PM2 para arranque automatico al reiniciar
#  5. Genera certificado SSL autofirmado (red local)
#  6. Abre los puertos necesarios en el firewall
#
#  USO: sudo bash instalar-servidor-linux.sh
# ================================================================

set -e
G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; B='\033[1m'; C='\033[0;36m'; N='\033[0m'
ok()   { echo -e "  ${G}[OK]${N}  $*"; }
warn() { echo -e "  ${Y}[!!]${N}  $*"; }
err()  { echo -e "  ${R}[XX]${N}  $*"; exit 1; }
info() { echo -e "  ${C}[--]${N}  $*"; }

# Verificar que se ejecuta como root
[ "$(id -u)" -ne 0 ] && err "Ejecuta como root: sudo bash instalar-servidor-linux.sh"

echo ""
echo -e "${B}================================================================"
echo -e " GESTION PRO TOTAL - Instalador de Servidor"
echo -e "================================================================${N}"
echo ""

# Detectar IP local del servidor
SERVER_IP=$(hostname -I | awk '{print $1}')
info "IP del servidor: $SERVER_IP"
echo ""

# Detectar directorio del proyecto
IDIR="$(cd "$(dirname "$0")/.." && pwd)"
if   [ -f "$IDIR/package.json" ];        then PDIR="$IDIR"
elif [ -f "$IDIR/codigo/package.json" ]; then PDIR="$IDIR/codigo"
else err "No encontre package.json. Ejecuta desde la carpeta del proyecto."; fi
info "Proyecto en: $PDIR"
cd "$PDIR"

# ── PASO 1: Actualizar sistema ────────────────────────────────
echo -e "\n${B}[1/9] Actualizando sistema...${N}"
apt-get update -qq
apt-get install -y curl wget git openssl ufw 2>/dev/null
ok "Sistema actualizado"

# ── PASO 2: Node.js 20 ───────────────────────────────────────
echo -e "\n${B}[2/9] Instalando Node.js 20 LTS...${N}"
if ! command -v node >/dev/null 2>&1 || [ "$(node -e 'process.stdout.write(String(process.version.match(/\d+/)[0]))')" -lt 18 ]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 2>/dev/null
    apt-get install -y nodejs 2>/dev/null
fi
ok "Node.js $(node -v)"

# ── PASO 3: Nginx ─────────────────────────────────────────────
echo -e "\n${B}[3/9] Instalando Nginx...${N}"
apt-get install -y nginx 2>/dev/null
systemctl enable nginx
ok "Nginx instalado"

# ── PASO 4: PM2 ──────────────────────────────────────────────
echo -e "\n${B}[4/9] Instalando PM2 (gestor de procesos)...${N}"
npm install -g pm2 2>/dev/null
ok "PM2 instalado"

# ── PASO 5: Compilar la app ───────────────────────────────────
echo -e "\n${B}[5/9] Compilando aplicacion para produccion...${N}"

# Crear .env.local si no existe
if [ ! -f "$PDIR/.env.local" ]; then
    cat > "$PDIR/.env.local" << ENV
VITE_BASE44_APP_ID=6994f99700e8a842baf72997
VITE_BASE44_APP_BASE_URL=https://gestion-pro-total-mantenimiento-e-instalaciones-6994f997.base44.app
ENV
    ok ".env.local creado"
fi

# Instalar dependencias y compilar
cd "$PDIR"
npm install --production=false 2>/dev/null
npm run build 2>/dev/null
ok "Compilacion completada -> carpeta dist/"

# ── PASO 6: Desplegar en Nginx ────────────────────────────────
echo -e "\n${B}[6/9] Desplegando en servidor web...${N}"
WEB_DIR="/var/www/gestion-pro-total"
mkdir -p "$WEB_DIR"
cp -r "$PDIR/dist/." "$WEB_DIR/"
chown -R www-data:www-data "$WEB_DIR"
chmod -R 755 "$WEB_DIR"
ok "Ficheros copiados a $WEB_DIR"

# ── PASO 7: Certificado SSL autofirmado ───────────────────────
echo -e "\n${B}[7/9] Generando certificado SSL para red local...${N}"
mkdir -p /etc/nginx/ssl
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/gestion-pro-total.key \
    -out    /etc/nginx/ssl/gestion-pro-total.crt \
    -subj   "/C=ES/ST=España/L=Local/O=Empresa/CN=$SERVER_IP" \
    -addext "subjectAltName=IP:$SERVER_IP,DNS:localhost" 2>/dev/null
chmod 600 /etc/nginx/ssl/gestion-pro-total.key
ok "Certificado SSL creado (valido 10 años)"

# ── PASO 8: Configurar Nginx ──────────────────────────────────
echo -e "\n${B}[8/9] Configurando Nginx...${N}"

# Eliminar config por defecto
rm -f /etc/nginx/sites-enabled/default

cat > /etc/nginx/sites-available/gestion-pro-total << NGINXEOF
# Redirigir HTTP -> HTTPS
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2 default_server;
    listen [::]:443 ssl http2 default_server;
    server_name _;

    ssl_certificate     /etc/nginx/ssl/gestion-pro-total.crt;
    ssl_certificate_key /etc/nginx/ssl/gestion-pro-total.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;

    root  $WEB_DIR;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;

    # Assets estaticos con cache larga
    location ~* \.(js|css|woff2|woff|ttf|png|jpg|jpeg|svg|ico|webp)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # SPA - todas las rutas van a index.html
    location / {
        try_files \$uri \$uri/ /index.html;
        add_header X-Frame-Options SAMEORIGIN;
        add_header X-Content-Type-Options nosniff;
    }

    # Proxy API -> Base44 (evita problemas CORS desde la red local)
    location /api/ {
        proxy_pass         https://gestion-pro-total-mantenimiento-e-instalaciones-6994f997.base44.app/api/;
        proxy_http_version 1.1;
        proxy_set_header   Host gestion-pro-total-mantenimiento-e-instalaciones-6994f997.base44.app;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto https;
        proxy_read_timeout 120s;
        client_max_body_size 50M;
    }

    # Health check para monitorizar
    location /health {
        return 200 '{"status":"ok","server":"Gestion Pro Total"}';
        add_header Content-Type application/json;
    }

    access_log /var/log/nginx/gpt-access.log;
    error_log  /var/log/nginx/gpt-error.log;
    client_max_body_size 50M;
}
NGINXEOF

ln -sf /etc/nginx/sites-available/gestion-pro-total /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx
ok "Nginx configurado y activo"

# ── PASO 9: Firewall y PM2 ────────────────────────────────────
echo -e "\n${B}[9/9] Firewall y arranque automatico...${N}"

# Abrir puertos
ufw allow 22/tcp  comment "SSH" 2>/dev/null || true
ufw allow 80/tcp  comment "HTTP" 2>/dev/null || true
ufw allow 443/tcp comment "HTTPS" 2>/dev/null || true
ufw --force enable 2>/dev/null || true
ok "Puertos 80 y 443 abiertos"

# PM2 para recompilar y redeployar automaticamente si cambia algo
pm2 startup 2>/dev/null || true
pm2 save 2>/dev/null || true
ok "PM2 configurado"

# Script de actualizacion
cat > /usr/local/bin/gpt-actualizar << UPDATEEOF
#!/bin/bash
# Actualizar Gestion Pro Total desde el codigo fuente
echo "Actualizando Gestion Pro Total..."
cd $PDIR
npm install --production=false
npm run build
cp -r dist/. $WEB_DIR/
chown -R www-data:www-data $WEB_DIR
nginx -s reload
echo "Actualizacion completada."
UPDATEEOF
chmod +x /usr/local/bin/gpt-actualizar
ok "Comando 'gpt-actualizar' creado"

# ── RESUMEN FINAL ──────────────────────────────────────────────
echo ""
echo -e "${B}${G}================================================================"
echo -e " SERVIDOR INSTALADO CORRECTAMENTE"
echo -e "================================================================${N}"
echo ""
echo -e "  ${B}Accede desde cualquier dispositivo de la red:${N}"
echo -e "  ${C}http://$SERVER_IP${N}   (redirige a HTTPS)"
echo -e "  ${C}https://$SERVER_IP${N}"
echo ""
echo -e "  ${Y}NOTA:${N} El navegador mostrara aviso de certificado autofirmado."
echo -e "  Haz clic en 'Avanzado' > 'Continuar' la primera vez."
echo ""
echo -e "  ${B}Para actualizar la app en el futuro:${N}"
echo -e "  ${C}sudo gpt-actualizar${N}"
echo ""
echo -e "  ${B}Logs del servidor:${N}"
echo -e "  ${C}tail -f /var/log/nginx/gpt-access.log${N}"
echo ""
