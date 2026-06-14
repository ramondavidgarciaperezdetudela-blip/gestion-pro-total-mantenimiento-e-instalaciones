#!/bin/bash
# Servidor local para Gestion Pro Total (ChromeOS / Linux-Crostini)
cd "$(dirname "$0")/dist" || { echo "No se encuentra dist"; read; exit 1; }
PORT=8080
echo "Gestion Pro Total en http://localhost:$PORT"
python3 -m http.server $PORT
