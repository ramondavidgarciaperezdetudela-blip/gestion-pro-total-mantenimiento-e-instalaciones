#!/usr/bin/env bash
# Generar la clave de firma (keystore) - Gestión Pro Total (Mac/Linux)
set -e

echo "============================================================"
echo "  GENERAR TU CLAVE DE FIRMA (keystore) - Gestión Pro Total"
echo "============================================================"
echo
echo "Crea TU clave privada (release.keystore). Se queda SOLO en tu equipo."
echo "Es PERMANENTE: usa siempre el mismo fichero para actualizar la app."
echo "Si la pierdes, NO podrás volver a actualizar la app. Haz copia."
echo

command -v keytool >/dev/null 2>&1 || {
  echo "ERROR: falta 'keytool' (Java). Instala el JDK 17: https://adoptium.net"
  exit 1
}

DESTDIR="$HOME/ClavesGestionProTotal"
mkdir -p "$DESTDIR"
KSFILE="$DESTDIR/release.keystore"
ALIAS="gestionpro"

if [ -f "$KSFILE" ]; then
  echo "AVISO: ya existe $KSFILE"
  read -p "¿Continuar de todas formas? (s/N): " OVER
  [ "$OVER" = "s" ] || [ "$OVER" = "S" ] || { echo "Cancelado."; exit 0; }
fi

echo
echo "keytool te pedirá: contraseña del almacén (KEYSTORE_PASSWORD), tus datos,"
echo "y la contraseña de la clave (KEY_PASSWORD). Apúntalas en un gestor seguro."
echo
read -p "Pulsa ENTER para continuar..."

keytool -genkey -v -keystore "$KSFILE" -alias "$ALIAS" -keyalg RSA -keysize 2048 -validity 10000

echo
echo "============================================================"
echo "  CLAVE CREADA: $KSFILE   (alias: $ALIAS)"
echo "============================================================"
echo "Guarda en un gestor de contraseñas:"
echo "  KEYSTORE_PASSWORD = la del almacén   KEY_ALIAS = $ALIAS   KEY_PASSWORD = la de la clave"
echo "Haz copia de seguridad del fichero. NO lo metas en el proyecto ni en GitHub."
echo "Ver clave pública: keytool -list -v -keystore \"$KSFILE\" -alias $ALIAS"
