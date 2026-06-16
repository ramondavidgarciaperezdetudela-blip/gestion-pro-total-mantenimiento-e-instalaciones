# Instalación y desinstalación por plataforma

Esta guía cubre cómo **instalar** y **desinstalar** Gestión Pro Total en cada
sistema operativo. Todos los instaladores (Windows, macOS, Linux y Android) se
publican en una **única página pública de descargas**, siempre con la última versión:

➡️ **Página de descargas (todas las plataformas):**
`https://github.com/ramondavidgarciaperezdetudela-blip/gestion-pro-total-releases/releases/latest`

> Este enlace es siempre el mismo y muestra automáticamente la versión más reciente.
> La app de escritorio, además, se **actualiza sola** cuando hay una versión nueva.

| Sistema | Archivo a descargar | Tipo |
|---|---|---|
| Windows | `Gestión Pro Total-<versión>-Windows-Setup.exe` | Instalador (con desinstalador) |
| Windows | `Gestión Pro Total-<versión>.exe` (portable) | Sin instalación |
| macOS | `Gestión Pro Total-<versión>-Mac.dmg` | Imagen de disco |
| Linux | `Gestión Pro Total-<versión>-Linux.AppImage` | Portable |
| Linux | `Gestión Pro Total-<versión>-Linux.deb` | Paquete instalable |
| Chromebook | APK (Android) · `.deb` (Linux) · PWA | Ver sección Chromebook |

---

## 🪟 Windows

### Instalar
1. Descarga **`...-Windows-Setup.exe`**.
2. Haz doble clic. Si Windows muestra "Windows protegió tu PC" (SmartScreen,
   porque la app no está firmada todavía), pulsa **Más información → Ejecutar de
   todas formas**.
3. Sigue el asistente (puedes elegir carpeta y crear acceso directo).

> Alternativa sin instalar: descarga el **`.exe` portable** y ejecútalo directamente.

### Desinstalar
- **Inicio → Configuración → Aplicaciones → Aplicaciones instaladas**, busca
  **Gestión Pro Total** → **Desinstalar**.
- O ejecuta el desinstalador `Uninstall Gestión Pro Total.exe` que está en la
  carpeta de instalación.

---

## 🍎 macOS

### Instalar
1. Descarga **`...-Mac.dmg`** y ábrelo.
2. Arrastra el icono **Gestión Pro Total** a la carpeta **Aplicaciones**.
3. Primera apertura: como la app no está firmada/notarizada todavía, haz
   **clic derecho → Abrir** y confirma **Abrir** (o ve a **Ajustes del Sistema →
   Privacidad y seguridad → Abrir de todas formas**).

### Desinstalar
- Abre **Aplicaciones**, arrastra **Gestión Pro Total** a la **Papelera** y
  vacíala.

---

## 🐧 Linux

### Opción A — AppImage (sin instalación)
1. Descarga **`...-Linux.AppImage`**.
2. Dale permisos de ejecución y ábrelo:
   ```bash
   chmod +x "Gestión Pro Total-<versión>-Linux.AppImage"
   ./"Gestión Pro Total-<versión>-Linux.AppImage"
   ```
3. **Desinstalar:** simplemente borra el archivo `.AppImage`.

### Opción B — Paquete .deb (Debian/Ubuntu)
1. Instalar:
   ```bash
   sudo apt install ./"Gestión Pro Total-<versión>-Linux.deb"
   # o: sudo dpkg -i "Gestión Pro Total-<versión>-Linux.deb"
   ```
2. **Desinstalar:**
   ```bash
   sudo apt remove gestion-pro-total
   # o: sudo dpkg -r gestion-pro-total
   ```

---

## 💻 Chromebook (ChromeOS)

ChromeOS no tiene un instalador propio; usa una de estas tres vías (según el modelo):

### Vía 1 — App Android (recomendada, la mayoría de Chromebooks)
- Instala el **APK** (`apk-latest`). Si tu Chromebook tiene Play Store, puedes
  abrir el `.apk` con un instalador de APK, o publicar la app en Play Store.

### Vía 2 — App Linux (Crostini)
1. Activa **Linux** en **Configuración → Avanzada → Desarrolladores → Entorno de
   desarrollo de Linux**.
2. Descarga el **`.deb`** e instálalo dentro del contenedor Linux:
   ```bash
   sudo apt install ./"Gestión Pro Total-<versión>-Linux.deb"
   ```
3. Desinstalar: `sudo apt remove gestion-pro-total`.

### Vía 3 — PWA (sin instalar nada, funciona en cualquier Chromebook)
1. Abre la app en Chrome:
   `https://gestion-pro-total.base44.app`
2. En la barra de direcciones pulsa el icono **Instalar** (o **⋮ → Instalar
   Gestión Pro Total**).
3. **Desinstalar:** clic derecho sobre el icono de la app → **Desinstalar**, o
   en `chrome://apps`.

---

## Nota sobre la firma de código

Los instaladores se generan **sin firma de código** (no hay certificado de
desarrollador configurado). Por eso Windows y macOS muestran avisos la primera
vez. Para distribución pública conviene firmar:
- **Windows:** certificado de firma de código (Authenticode).
- **macOS:** cuenta de Apple Developer + notarización.
Esos certificados pueden añadirse como *secrets* y conectarse a electron-builder
en el workflow `.github/workflows/build-desktop.yml`.

---

## Soporte y contacto

Para cualquier duda o incidencia: **kairigarcia.gestionprototal@gmail.com**
