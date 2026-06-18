#!/bin/bash
# Menu de instalacion - Gestion Pro Total (macOS)
cd "$(dirname "$0")" || exit 1
RELEASES="https://github.com/ramondavidgarciaperezdetudela-blip/gestion-pro-total-releases/releases/latest"
WEB="https://gestion-pro-total.base44.app"

while true; do
  clear
  echo "============================================================"
  echo "                 GESTION PRO TOTAL"
  echo "           Como quieres usar el programa?"
  echo "============================================================"
  echo
  echo "  [1] Instalar en este Mac (aplicacion normal)   <- RECOMENDADO"
  echo "      Se arrastra a Aplicaciones, como cualquier app."
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
      echo "Descarga el archivo que termina en  -Mac.dmg , abrelo y arrastra"
      echo "Gestion Pro Total a la carpeta Aplicaciones."
      echo "Primera vez: clic derecho sobre la app -> Abrir -> Abrir."
      open "$RELEASES"; read -p "Pulsa Enter para volver al menu...";;
    2)
      echo
      IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "TU-IP")
      echo "Servidor en marcha. Deja esta ventana abierta."
      echo "  En este Mac:        http://localhost:8080"
      echo "  Otros equipos red:  http://$IP:8080"
      ( sleep 1 && open "http://localhost:8080" ) &
      cd dist && python3 -m http.server 8080 --bind 0.0.0.0
      read -p "Pulsa Enter para volver al menu...";;
    3)
      open "$WEB"
      echo "En el navegador pulsa el icono Instalar para tenerlo como app."
      read -p "Pulsa Enter para volver al menu...";;
    4) exit 0;;
  esac
done
