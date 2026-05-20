# Guía de Instalación y Ejecución

Esta guía detalla los pasos para poner en marcha el proyecto en tu entorno local.

## 📋 Requisitos Previos

Asegúrate de tener instalado en tu sistema:
- **Node.js** (versión 18 o superior recomendada)
- **npm** (normalmente se instala junto con Node.js)
- **Git**

## 🚀 Instalación Rápida

Hemos incluido un script de automatización para sistemas basados en Unix (Linux/macOS):

```bash
chmod +x setup.sh
./setup.sh
```

## 🛠️ Instalación Manual

Si prefieres realizar los pasos manualmente o estás en Windows:

1. **Clonar el repositorio:**
   ```bash
   git clone [URL-DEL-REPOSITORIO]
   cd gestion-pro-total-mantenimiento-e-instalaciones
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   Crea un archivo llamado `.env.local` en la raíz del proyecto y añade lo siguiente:
   ```env
   VITE_BASE44_APP_ID=6994f99700e8a842baf72997
   VITE_BASE44_APP_BASE_URL=https://gestion-pro-total-mantenimiento-e-instalaciones-6994f997.base44.app
   ```

## 🏃 Ejecución

### Modo Desarrollo
Para ejecutar la aplicación con recarga en vivo (hot reload):
```bash
npm run dev
```
La aplicación estará disponible normalmente en `http://localhost:5173`.

### Modo Producción
Para compilar la aplicación para su despliegue:
```bash
npm run build
```
Los archivos resultantes se encontrarán en la carpeta `dist/`.

## 📂 Estructura de Archivos Actualizada en GitHub

Los cambios realizados hasta ahora se encuentran en la rama actual. Si estás visualizando la rama `main` en GitHub y no ves los cambios, asegúrate de cambiar a la rama de la Pull Request o fusionar (merge) los cambios.

### Cambios Relevantes Incluidos:
- Límite de 500.000 productos en tarifas.
- Búsqueda de imágenes priorizando referencia.
- Botón de borrado de tarifas por proveedor.
- Cálculo de Aire Acondicionado Multi-área.
- Diagramas de Mollier interactivos y optimizaciones de cálculo térmico.
- Menús y accesos directos ordenados alfabéticamente.
