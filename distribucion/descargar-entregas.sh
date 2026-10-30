#!/usr/bin/env bash
# Descarga los instaladores v1.0.0 de la release y los reparte por sistema operativo.
# Requiere GitHub CLI (gh): https://cli.github.com  ->  una vez:  gh auth login
set -e
cd "$(dirname "$0")"
REPO="ramondavidgarciaperezdetudela-blip/gestion-pro-total-mantenimiento-e-instalaciones"
TAG="v1.0.0"

command -v gh >/dev/null 2>&1 || {
  echo "ERROR: falta GitHub CLI."
  echo "  1) Instálalo: https://cli.github.com"
  echo "  2) Ejecuta:   gh auth login"
  echo "  3) Vuelve a lanzar este script."
  exit 1
}

rm -rf _descargas
mkdir -p _descargas Windows macOS Linux Android

echo "Descargando ficheros de la release $TAG ..."
gh release download "$TAG" --repo "$REPO" --dir _descargas \
  --pattern "*-1.0.0-*" --pattern "gestion-pro-total.apk" --clobber

shopt -s nullglob
for f in _descargas/*; do
  n=$(basename "$f")
  case "$n" in
    *Windows*) mv -f "$f" Windows/ ;;
    *Mac*)     mv -f "$f" macOS/ ;;
    *Linux*)   mv -f "$f" Linux/ ;;
    *.apk)     mv -f "$f" Android/ ;;
  esac
done
rm -rf _descargas

echo "LISTO. Ficheros colocados en Windows/ macOS/ Linux/ Android/"
echo "Ya puedes comprimir cada carpeta y enviarla al cliente."
