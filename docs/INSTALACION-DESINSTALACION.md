# Instalación y desinstalación por plataforma

Esta guía cubre cómo **instalar** y **desinstalar** Gestión Pro Total en cada
sistema operativo. Todos los instaladores (Windows, macOS, Linux y Android) se
publican en una **única página pública de descargas**, siempre con la última versión:

➡️ **Página de descargas (todas las plataformas):**
`https://github.com/ramondavidgarciaperezdetudela-blip/gestion-pro-total-releases/releases/latest`

> Este enlace es siempre el mismo y muestra automáticamente la versión más reciente.
> La app de escritorio, además, se **actualiza sola** cuando hay una versión nueva.

Los nombres son exactamente estos (sin tildes y con guiones), donde
`<versión>` es el número de la versión que descargues (el que aparezca en la página):

| Sistema | Archivo a descargar | Tipo |
|---|---|---|
| Windows | `Gestion-Pro-Total-<versión>-Windows-Instalador.exe` | Instalador (con desinstalador) |
| Windows | `Gestion-Pro-Total-<versión>-Windows-Portable.exe` | Sin instalación |
| macOS | `Gestion-Pro-Total-<versión>-Mac.dmg` | Imagen de disco |
| Linux | `Gestion-Pro-Total-<versión>-Linux.deb` | Paquete instalable |
| Linux | `Gestion-Pro-Total-<versión>-Linux.AppImage` | Portable |
| **Chromebook** | **`Gestion-Pro-Total-<versión>-Linux.deb`** | Ver sección Chromebook |
| Android | `gestion-pro-total.apk` | APK |

---

## 🪟 Windows

### Instalar
1. Descarga **`Gestion-Pro-Total-<versión>-Windows-Instalador.exe`**.
2. Haz doble clic. Si Windows muestra "Windows protegió tu PC" (SmartScreen,
   porque la app no está firmada todavía), pulsa **Más información → Ejecutar de
   todas formas**.
3. Sigue el asistente (puedes elegir carpeta y crear acceso directo).

> Alternativa sin instalar: descarga **`Gestion-Pro-Total-<versión>-Windows-Portable.exe`** y ejecútalo directamente.

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
   chmod +x Gestion-Pro-Total-<versión>-Linux.AppImage
   ./Gestion-Pro-Total-<versión>-Linux.AppImage
   ```
3. **Desinstalar:** simplemente borra el archivo `.AppImage`.

### Opción B — Paquete .deb (Debian/Ubuntu)
1. Instalar:
   ```bash
   sudo apt install ./Gestion-Pro-Total-<versión>-Linux.deb
   # o: sudo dpkg -i Gestion-Pro-Total-<versión>-Linux.deb
   ```
2. **Desinstalar:**
   ```bash
   sudo apt remove gestion-pro-total
   # o: sudo dpkg -r gestion-pro-total
   ```

---

## 💻 Chromebook (ChromeOS)

ChromeOS no tiene instalador propio. En un Chromebook **el fichero que hay que
descargar es el `.deb` de Linux**:

`Gestion-Pro-Total-<versión>-Linux.deb`

### Vía 1 — App Linux con el `.deb` (la que hay que usar)

1. **Activa Linux una sola vez:** Configuración → **Avanzada** → **Desarrolladores**
   → **Entorno de desarrollo de Linux** → *Activar*. Tarda un par de minutos y
   no borra nada.
2. Descarga el `.deb` de la página de descargas.
3. En la app **Archivos**, arrástralo a la carpeta **Linux** y haz **doble clic**
   → *Instalar*. (O desde la terminal: `sudo apt install ./Gestion-Pro-Total-<versión>-Linux.deb`)
4. Queda en el lanzador, dentro de la carpeta **Aplicaciones de Linux**.
5. **Desinstalar:** `sudo apt remove gestion-pro-total`.

> **Antes de descargar, comprueba el procesador.** El `.deb` que se publica es
> para Chromebooks con procesador **Intel o AMD**, que son la mayoría. Si el tuyo
> lleva procesador **ARM** (MediaTek, Snapdragon, Rockchip) el `.deb` no
> instalará: en ese caso usa la Vía 2. Para saberlo: escribe `uname -m` en la
> terminal de Linux — `x86_64` es Intel/AMD, `aarch64` es ARM.

### Vía 2 — Desde el navegador, sin instalar nada

Funciona en **cualquier** Chromebook, también los ARM y los que no admiten Linux.

1. Abre `https://gestion-pro-total.base44.app` en Chrome.
2. En la barra de direcciones pulsa el icono **Instalar** (o **⋮ → Instalar
   Gestión Pro Total**). Queda con su icono en el lanzador, igual que una app.
3. **Desinstalar:** clic derecho en el icono → **Desinstalar**, o en `chrome://apps`.

Diferencia con la Vía 1: esta necesita internet para arrancar, y las copias de
seguridad van a la carpeta de descargas del navegador en vez de a una carpeta
elegida.

### El APK de Android NO sirve aquí

Aunque el Chromebook ejecute apps de Android, ChromeOS **solo instala APK que
vengan de Play Store**. Instalar un APK descargado a mano exige poner el
Chromebook en *modo desarrollador*, y eso **borra todos los datos del equipo**.
No merece la pena: usa el `.deb` o el navegador.

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
