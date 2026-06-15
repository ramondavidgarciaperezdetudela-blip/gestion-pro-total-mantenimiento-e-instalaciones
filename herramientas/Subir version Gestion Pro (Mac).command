#!/bin/bash
# ============================================================
#   Abre el programa para subir nuevas versiones (macOS)
#   Doble clic sobre este archivo.
#
#   La primera vez, si macOS no deja abrirlo:
#   clic derecho sobre el archivo  ->  "Abrir"  ->  "Abrir".
# ============================================================
DIR="$(cd "$(dirname "$0")" && pwd)"
open "$DIR/Subir-Nueva-Version.html"
