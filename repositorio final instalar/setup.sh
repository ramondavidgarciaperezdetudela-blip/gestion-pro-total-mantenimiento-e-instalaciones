#!/bin/bash

# Script de instalación para Gestión Pro Total
echo "🚀 Iniciando instalación de Gestión Pro Total..."

# 1. Comprobar si Node.js está instalado
if ! command -v node &> /dev/null
then
    echo "❌ Node.js no está instalado. Por favor, instálalo desde https://nodejs.org/"
    exit
fi

# 2. Instalar dependencias
echo "📦 Instalando dependencias (esto puede tardar un poco)..."
npm install

# 3. Crear archivo de configuración si no existe
if [ ! -f .env.local ]; then
    echo "📝 Creando archivo .env.local de ejemplo..."
    echo "VITE_BASE44_APP_ID=6994f99700e8a842baf72997" > .env.local
    echo "VITE_BASE44_APP_BASE_URL=https://gestion-pro-total-mantenimiento-e-instalaciones-6994f997.base44.app" >> .env.local
    echo "✅ Archivo .env.local creado con los valores por defecto."
else
    echo "ℹ️ El archivo .env.local ya existe."
fi

echo ""
echo "✅ Instalación completada con éxito."
echo "🏃 Para ejecutar la aplicación en modo desarrollo, usa: npm run dev"
echo "🏗️ Para compilar para producción, usa: npm run build"
