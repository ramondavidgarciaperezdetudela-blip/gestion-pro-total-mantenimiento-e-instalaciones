#!/bin/bash
# Menu de instalacion - Gestion Pro Total (Linux / Chromebook)
cd "$(dirname "$0")" || exit 1
RELEASES="https://github.com/ramondavidgarciaperezdetudela-blip/gestion-pro-total-releases/releases/latest"
WEB="https://gestion-pro-total.base44.app"
abrir(){ xdg-open "$1" >/dev/null 2>&1 || echo "Abre esta direccion en el navegador: $1"; }

while true; do
  clear
  echo "============================================================"
  echo "                 GESTION PRO TOTAL"
  echo "           Como quieres usar el programa?"
  echo "============================================================"
  echo
  echo "  [1] Instalar en este equipo (aplicacion normal)   <- RECOMENDADO"
  echo "      Linux: .AppImage (doble clic) o .deb (apt/dpkg)."
  echo "      Chromebook con Play Store: usa el .apk de la carpeta Android."
  echo
  echo "  [2] Servidor local (usarlo desde varios equipos de tu red)"
  echo
  echo "  [3] Usar en la nube / instalar como app web (PWA)"
  echo
  echo "  [4] Salir"
  echo
  read -p "Escribe 1, 2, 3 o 4 y pulsa Enter: " op
  case "$op" in
    1)
      echo
      echo "Se abrira la pagina de descargas."
      echo "  Linux: descarga el .AppImage (dale permiso de ejecucion y doble clic)"
      echo "         o el .deb (sudo dpkg -i archivo.deb)."
      echo "  Chromebook: si tiene Play Store, instala el .apk (carpeta Android)."
      abrir "$RELEASES"; read -p "Pulsa Enter para volver al menu...";;
    2)
      echo
      IP=$(hostname -I 2>/dev/null | awk '{print $1}'); [ -z "$IP" ] && IP="TU-IP"
      echo "Servidor en marcha. Deja esta ventana abierta."
      echo "  En este equipo:     http://localhost:8080"
      echo "  Otros equipos red:  http://$IP:8080"
      ( sleep 1 && abrir "http://localhost:8080" ) &
      cd dist && python3 -m http.server 8080 --bind 0.0.0.0
      read -p "Pulsa Enter para volver al menu...";;
    3)
      abrir "$WEB"
      echo "En Chrome pulsa el icono Instalar para tenerlo como app."
      read -p "Pulsa Enter para volver al menu...";;
    4) exit 0;;
  esac
done
