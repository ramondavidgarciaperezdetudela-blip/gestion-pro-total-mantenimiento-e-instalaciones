<div align="center">

# 🛠️ Gestión Pro Total

### Software de gestión integral para empresas de mantenimiento e instalaciones

**Web · Android (APK) · Escritorio (Windows / macOS / Linux) · Expo Go**

[![Release](https://img.shields.io/github/v/release/ramondavidgarciaperezdetudela-blip/gestion-pro-total-mantenimiento-e-instalaciones?label=versi%C3%B3n&color=0ea5e9)](../../releases/latest)
[![APK](https://img.shields.io/badge/Descargar-APK%20Android-3ddc84?logo=android&logoColor=white)](../../releases/latest)
[![Escritorio](https://img.shields.io/badge/Descargar-Windows%20%7C%20macOS%20%7C%20Linux-1e3a5f)](../../releases/latest)
[![Hecho con React](https://img.shields.io/badge/React-Vite-61dafb?logo=react&logoColor=white)](#)

</div>

---

## ✨ ¿Qué es?

**Gestión Pro Total** reúne en una sola aplicación todo lo que necesita una empresa de **mantenimiento, instalaciones y servicio de asistencia técnica (SAT)**: clientes, proyectos, mantenimientos, inventario, proveedores, técnicos en campo, calculadoras técnicas especializadas y asistentes de inteligencia artificial. Funciona en el navegador, como app de Android y como programa de escritorio.

> 55 pantallas · calculadoras eléctricas/climatización/solar · asistentes IA · portal del cliente · copias de seguridad · auditoría.

## ⬇️ Descargas

Ve a la **[última versión (Releases)](../../releases/latest)** y descarga:

| Plataforma | Archivo |
|-----------|---------|
| 🤖 **Android** | `gestion-pro-total.apk` |
| 🪟 **Windows** | `...-Windows-Setup.exe` (instalador) |
| 🍎 **macOS** | `...-Mac.dmg` |
| 🐧 **Linux / Chromebook** | `...-Linux.AppImage` o `...-Linux.deb` |

## 🚀 Funcionalidades

- **Gestión:** contactos (clientes/proveedores), agenda, proyectos y cronograma.
- **Operativa:** mantenimientos preventivos/correctivos, **SAT** (partes, calendario, chat y portal público), incidencias.
- **Inventario y compras:** stock, repuestos, proveedores, tarifas y catálogos.
- **Técnicos en campo:** jornada, partes de trabajo, rutas; diario e historial de averías por equipo.
- **Calculadoras técnicas:** eléctrica, climatización (potencia y análisis), térmica, cámaras frigoríficas, multi-área, baterías y **solar fotovoltaica con PVGIS**.
- **Inteligencia artificial:** asistente, presupuestos, planificación, informes y búsqueda inteligente.
- **Documentos:** plantillas, presupuestos públicos, tarjetas de visita, normativa y manuales.
- **Administración:** configuración de empresa, actualizaciones, copias de seguridad, auditoría y exportación de datos.
- **Licencias:** sistema de activación por firma **ECDSA P-256** con planes y portal de suscripción.

## 🖥️ Tecnología

`React` + `Vite` · backend **Base44** · móvil con **Capacitor** · escritorio con **Electron** · pruebas con **Expo Go**.

## 🧑‍💻 Desarrollo

```bash
npm install        # instalar dependencias
npm run dev        # desarrollo (web) con recarga en caliente
npm run build      # compilar la web (dist/)
```

## 📦 Compilar instaladores

```bash
# Escritorio (Windows/macOS/Linux según tu sistema)
npm run desktop:dist

# APK de Android
npm run android:build
```

## 🔄 Publicar una versión (release automática)

La CI genera y publica los binarios sola:

- **Manual:** pestaña **Actions** → *Build Android APK* / *Build Desktop Installers* → **Run workflow**.
  - Indica `version` (ej. `v1.1.0`) para publicar una **release oficial** con ese número.
  - Sin `version`, actualiza las releases rodantes `apk-latest` / `desktop-latest`.
- **Por etiqueta:** crea una etiqueta `vX.Y.Z` y se publicará la release automáticamente.

## 📱 Probar antes de instalar (Expo Go)

```bash
cd movil-expo && npm install && npx expo start
```
Escanea el QR con **Expo Go**. Más detalles en `movil-expo/README-EXPO.md`.

## 📚 Documentación

En la carpeta [`docs/`](docs):

- **Manuales** (instalación, uso, administración) — en Markdown, **PDF** y **Word**.
- **Registro de la Propiedad Intelectual** ([`docs/propiedad-intelectual/`](docs/propiedad-intelectual)): memoria descriptiva, declaración de autoría, guía de registro e inventario de código — en PDF y Word.
- **Sistema de licencias** y guía de **instalación/desinstalación** por plataforma.

## 🔐 Seguridad

- El repositorio y la app solo contienen la **clave pública** de licencias; la **clave privada** y los **keystores** nunca se versionan (`.gitignore` los excluye).
- Genera tu clave de firma de Android con `CREAR-CLAVE-FIRMA.bat` (Windows) o `crear-clave-firma.sh` (Mac/Linux).

## 📄 Licencia y autoría

Software propietario. © Ramón David García Pérez de Tudela. Todos los derechos reservados.
