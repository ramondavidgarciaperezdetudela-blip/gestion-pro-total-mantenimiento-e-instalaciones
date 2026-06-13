#!/bin/bash
# ================================================================
#  GESTION PRO TOTAL - Configurador Servidor Linux/Ubuntu
#  Acceso red local (LAN) + Acceso remoto para tecnicos
#  Compatible: Ubuntu 20.04/22.04/24.04, Debian 11/12
#  USO: sudo bash configurar-servidor-linux.sh
# ================================================================

set -e
G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; C='\033[0;36m'; B='\033[1m'; N='\033[0m'
ok()   { echo -e "  ${G}[OK]${N}  $*"; }
warn() { echo -e "  ${Y}[!!]${N}  $*"; }
err()  { echo -e "  ${R}[XX]${N}  $*"; exit 1; }
info() { echo -e "  ${C}[--]${N}  $*"; }

[ "$(id -u)" -ne 0 ] && err "Ejecuta como root: sudo bash configurar-servidor-linux.sh"

echo ""
echo -e "${B}================================================================"
echo -e " GESTION PRO TOTAL - Configurador de Servidor"
echo -e " Acceso LAN + Acceso remoto para tecnicos"
echo -e "================================================================${N}"
echo ""

# ── Detectar IP local ─────────────────────────────────────────
SERVER_IP=$(hostname -I | awk '{print $1}')
info "IP del servidor detectada: $SERVER_IP"
echo ""

# ── Preguntar configuracion ────────────────────────────────────
read -rp "  Dominio publico (ej: gestion.miempresa.com) o ENTER para omitir: " DOMAIN
read -rp "  Puerto HTTP (ENTER = 80): " PORT
PORT=${PORT:-80}
read -rp "  Puerto HTTPS (ENTER = 443): " PORT_HTTPS
PORT_HTTPS=${PORT_HTTPS:-443}
read -rp "  Configurar acceso remoto con VPN WireGuard? (s/N): " VPN_CHOICE

# ── Detectar proyecto ─────────────────────────────────────────
SDIR="$(cd "$(dirname "$0")" && pwd)"
P1="$(dirname "$SDIR")"
P2="$(dirname "$P1")"

if   [ -f "$P1/package.json" ];        then PDIR="$P1"
elif [ -f "$P2/package.json" ];        then PDIR="$P2"
elif [ -f "$P1/codigo/package.json" ]; then PDIR="$P1/codigo"
else
    read -rp "  Ruta completa al proyecto (carpeta con package.json): " PDIR
fi
echo ""
info "Proyecto en: $PDIR"

# ── PASO 1: Sistema ───────────────────────────────────────────
echo -e "\n${B}[1/9] Actualizando sistema...${N}"
apt-get update -qq
apt-get install -y curl wget openssl ufw nginx certbot python3-certbot-nginx 2>/dev/null
ok "Sistema actualizado."

# ── PASO 2: Node.js 20 ───────────────────────────────────────
echo -e "\n${B}[2/9] Instalando Node.js 20 LTS...${N}"
if ! command -v node >/dev/null 2>&1 || [ "$(node -e 'process.stdout.write(String(process.version.match(/\d+/)[0]))')" -lt 18 ]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 2>/dev/null
    apt-get install -y nodejs 2>/dev/null
fi
ok "Node.js $(node -v)"

# ── PASO 3: PM2 ───────────────────────────────────────────────
echo -e "\n${B}[3/9] Instalando PM2...${N}"
npm install -g pm2 2>/dev/null
ok "PM2 instalado."

# ── PASO 4: Build ────────────────────────────────────────────
echo -e "\n${B}[4/9] Compilando aplicacion...${N}"
cd "$PDIR"
if [ ! -f .env.local ]; then
    printf 'VITE_BASE44_APP_ID=6994f99700e8a842baf72997\nVITE_BASE44_APP_BASE_URL=https://gestion-pro-total-mantenimiento-e-instalaciones-6994f997.base44.app\n' > .env.local
fi
npm install --production=false 2>/dev/null
npm run build 2>/dev/null
ok "Build completado -> dist/"

# ── PASO 5: Desplegar en Nginx ───────────────────────────────
echo -e "\n${B}[5/9] Desplegando en Nginx...${N}"
WEB_DIR="/var/www/gestion-pro-total"
mkdir -p "$WEB_DIR"
cp -r "$PDIR/dist/." "$WEB_DIR/"
chown -R www-data:www-data "$WEB_DIR"
chmod -R 755 "$WEB_DIR"
ok "Ficheros en $WEB_DIR"

# ── PASO 6: Certificado SSL ──────────────────────────────────
echo -e "\n${B}[6/9] Configurando SSL...${N}"
mkdir -p /etc/nginx/ssl

if [ -n "$DOMAIN" ]; then
    # Intentar certbot para dominio real
    info "Obteniendo certificado Let's Encrypt para $DOMAIN..."
    certbot certonly --standalone --non-interactive --agree-tos \
        --email admin@${DOMAIN} -d ${DOMAIN} 2>/dev/null && {
        SSL_CERT="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
        SSL_KEY="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"
        ok "Certificado Let's Encrypt instalado (renovacion automatica)."
    } || {
        warn "Let's Encrypt fallo. Generando certificado autofirmado..."
        DOMAIN=""
    }
fi

if [ -z "$DOMAIN" ] || [ ! -f "$SSL_CERT" ]; then
    # Certificado autofirmado para red local
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/gpt.key \
        -out    /etc/nginx/ssl/gpt.crt \
        -subj   "/C=ES/ST=Espana/L=Local/O=Empresa/CN=$SERVER_IP" \
        -addext "subjectAltName=IP:$SERVER_IP,DNS:localhost" 2>/dev/null
    SSL_CERT="/etc/nginx/ssl/gpt.crt"
    SSL_KEY="/etc/nginx/ssl/gpt.key"
    ok "Certificado autofirmado generado."
fi

# ── PASO 7: Configurar Nginx ─────────────────────────────────
echo -e "\n${B}[7/9] Configurando Nginx...${N}"
rm -f /etc/nginx/sites-enabled/default

SERVER_NAMES="$SERVER_IP localhost"
[ -n "$DOMAIN" ] && SERVER_NAMES="$DOMAIN www.$DOMAIN $SERVER_IP localhost"

cat > /etc/nginx/sites-available/gestion-pro-total << NGINXEOF
# HTTP -> HTTPS
server {
    listen $PORT default_server;
    listen [::]:$PORT default_server;
    server_name _;
    return 301 https://\$host\$request_uri;
}

# HTTPS principal
server {
    listen $PORT_HTTPS ssl http2 default_server;
    listen [::]:$PORT_HTTPS ssl http2 default_server;
    server_name $SERVER_NAMES;

    ssl_certificate     $SSL_CERT;
    ssl_certificate_key $SSL_KEY;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;

    root  $WEB_DIR;
    index index.html;

    # Compresion
    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;

    # Cache assets estaticos
    location ~* \.(js|css|woff2|png|jpg|svg|ico|webp)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing
    location / {
        try_files \$uri \$uri/ /index.html;
        add_header X-Frame-Options SAMEORIGIN;
        add_header X-Content-Type-Options nosniff;
    }

    # Proxy API Base44
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

    # Health check
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
nginx -t && systemctl restart nginx && systemctl enable nginx
ok "Nginx configurado y activo."

# ── PASO 8: Firewall UFW ─────────────────────────────────────
echo -e "\n${B}[8/9] Configurando firewall...${N}"
ufw allow 22/tcp   comment "SSH"        2>/dev/null || true
ufw allow $PORT/tcp  comment "HTTP"     2>/dev/null || true
ufw allow $PORT_HTTPS/tcp comment "HTTPS" 2>/dev/null || true
ufw --force enable 2>/dev/null || true
ok "Puertos $PORT y $PORT_HTTPS abiertos."

# ── PASO 9 (opcional): VPN WireGuard ─────────────────────────
if [ "$(echo "$VPN_CHOICE" | tr A-Z a-z)" = "s" ]; then
    echo -e "\n${B}[9/9] Instalando VPN WireGuard para acceso remoto...${N}"
    apt-get install -y wireguard 2>/dev/null

    # Generar claves del servidor
    mkdir -p /etc/wireguard
    chmod 700 /etc/wireguard
    cd /etc/wireguard
    wg genkey | tee server_private.key | wg pubkey > server_public.key
    SERVER_PRIV=$(cat server_private.key)
    SERVER_PUB=$(cat server_public.key)

    # Generar claves para un tecnico de ejemplo
    wg genkey | tee tecnico1_private.key | wg pubkey > tecnico1_public.key
    TEC1_PRIV=$(cat tecnico1_private.key)
    TEC1_PUB=$(cat tecnico1_public.key)

    # Configuracion servidor VPN
    cat > /etc/wireguard/wg0.conf << VPNEOF
[Interface]
Address = 10.8.0.1/24
ListenPort = 51820
PrivateKey = $SERVER_PRIV
PostUp   = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE
SaveConfig = true

# Tecnico 1
[Peer]
PublicKey  = $TEC1_PUB
AllowedIPs = 10.8.0.2/32
VPNEOF

    # Configuracion para el tecnico 1 (para compartir)
    cat > "$SDIR/vpn-tecnico1.conf" << TEOF
[Interface]
PrivateKey = $TEC1_PRIV
Address    = 10.8.0.2/24
DNS        = 8.8.8.8

[Peer]
PublicKey  = $SERVER_PUB
Endpoint   = ${DOMAIN:-$SERVER_IP}:51820
AllowedIPs = 10.8.0.0/24
PersistentKeepalive = 25
TEOF

    # Habilitar IP forwarding
    echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf
    sysctl -p >/dev/null 2>&1

    # Abrir puerto VPN
    ufw allow 51820/udp comment "WireGuard VPN" 2>/dev/null || true

    systemctl enable wg-quick@wg0
    systemctl start wg-quick@wg0 2>/dev/null || true

    ok "VPN WireGuard activa en puerto 51820."
    ok "Config para tecnico 1 guardada en: vpn-tecnico1.conf"
    info "Comparte vpn-tecnico1.conf con cada tecnico para que la importen en WireGuard."
    cd "$PDIR"
else
    echo -e "\n${B}[9/9] VPN omitida.${N}"
    info "Para acceso remoto sin VPN, configura el router para reenviar el puerto $PORT_HTTPS a $SERVER_IP"
fi

# ── Script de actualizacion ───────────────────────────────────
cat > /usr/local/bin/gpt-actualizar << UPDATEEOF
#!/bin/bash
echo "Actualizando Gestion Pro Total..."
cd $PDIR
npm install --production=false
npm run build
cp -r dist/. $WEB_DIR/
chown -R www-data:www-data $WEB_DIR
nginx -s reload
echo "Actualizacion completada. $(date)"
UPDATEEOF
chmod +x /usr/local/bin/gpt-actualizar

# ── Renovacion automatica SSL (si hay Let's Encrypt) ─────────
if [ -n "$DOMAIN" ] && [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && nginx -s reload") | crontab -
    ok "Renovacion automatica SSL configurada."
fi

# ── Guardar informacion del servidor ─────────────────────────
cat > "$SDIR/INFO-SERVIDOR.txt" << INFOEOF
SERVIDOR GESTION PRO TOTAL
==========================
Fecha instalacion: $(date)

IP LOCAL: $SERVER_IP
Acceso LAN HTTP:   http://$SERVER_IP
Acceso LAN HTTPS:  https://$SERVER_IP
$([ -n "$DOMAIN" ] && echo "Dominio publico:   https://$DOMAIN")

PARA CONECTARSE (red local):
  Abre el navegador en cualquier PC de la red y ve a:
  https://$SERVER_IP
  (Acepta el aviso de certificado la primera vez)

PARA TECNICOS EN REMOTO:
$([ "$(echo "$VPN_CHOICE" | tr A-Z a-z)" = "s" ] && echo "  Con VPN: instala WireGuard y carga vpn-tecnico1.conf" || echo "  Sin VPN: configura router para reenviar puerto $PORT_HTTPS a $SERVER_IP")
$([ -n "$DOMAIN" ] && echo "  URL remota: https://$DOMAIN" || echo "  URL: https://TU_IP_PUBLICA (ver router)")

ACTUALIZACION:
  sudo gpt-actualizar

LOGS:
  tail -f /var/log/nginx/gpt-access.log
  tail -f /var/log/nginx/gpt-error.log

REINICIAR NGINX:
  sudo systemctl restart nginx

ESTADO:
  sudo systemctl status nginx
INFOEOF

ok "Informacion guardada en: $SDIR/INFO-SERVIDOR.txt"

# ── Resumen ───────────────────────────────────────────────────
echo ""
echo -e "${B}${G}================================================================"
echo -e " SERVIDOR CONFIGURADO CORRECTAMENTE"
echo -e "================================================================${N}"
echo ""
echo -e "  ${B}Acceso LAN (red de empresa):${N}"
echo -e "  ${C}http://$SERVER_IP${N}"
echo -e "  ${C}https://$SERVER_IP${N}"
[ -n "$DOMAIN" ] && echo -e "  ${C}https://$DOMAIN${N}"
echo ""
echo -e "  ${B}Para tecnicos en remoto:${N}"
if [ "$(echo "$VPN_CHOICE" | tr A-Z a-z)" = "s" ]; then
    echo -e "  ${C}VPN WireGuard: comparte vpn-tecnico1.conf con cada tecnico${N}"
    echo -e "  Una vez conectados a VPN acceden a: https://10.8.0.1"
else
    echo -e "  ${C}Configura el router: reenviar puerto $PORT_HTTPS a $SERVER_IP${N}"
    [ -n "$DOMAIN" ] && echo -e "  URL remota: https://$DOMAIN" || echo -e "  URL: https://TU_IP_PUBLICA"
fi
echo ""
echo -e "  ${B}Actualizar app:${N} sudo gpt-actualizar"
echo -e "  ${B}Ver datos:${N} cat $SDIR/INFO-SERVIDOR.txt"
echo ""
