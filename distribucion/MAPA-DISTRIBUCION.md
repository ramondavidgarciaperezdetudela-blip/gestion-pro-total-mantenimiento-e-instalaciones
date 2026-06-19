# 🗺️ Mapa de distribución — Gestión Pro Total

Visión general de **qué hay, dónde va y cómo llega al cliente**. Diagrama visual en
`MAPA-DISTRIBUCION.png` (misma carpeta).

---

## 1) Repositorios (GitHub)
- **Privado** `gestion-pro-...-instalaciones`: código fuente, workflows de CI y **solo la clave PÚBLICA** (segura).
- **Público** `gestion-pro-total-releases`: solo **descargas** (instaladores). Enlace fijo: `…/releases/latest`.

## 2) Solo para ti (privado, no se entrega al cliente)
- `SOLO-PARA-MI/CLAVE-PRIVADA-MAESTRA.json` 🔑 — tu clave secreta para firmar licencias.
- `distribucion/GESTOR-LICENCIAS/` — el **panel de licencias**: generas/firmas claves, buscas clientes (nombre/email/empresa), y **guardas/restauras** la clave (config).

## 3) Compilación (GitHub Actions)
Genera solo: Windows `.exe` (instalador + portable), macOS `.dmg`, Linux `.AppImage`/`.deb`, Android `.apk` → publica en `releases/latest`.

## 4) Lo que recibe el cliente — `distribucion/PARA-EL-CLIENTE/`
```
PARA-EL-CLIENTE/
├── _LEEME.txt · _COMO-ABRIR.txt
├── Windows/     INSTALAR-Gestion-Pro-Total.bat   (menú: PC / servidor / nube)
├── Mac/         INSTALAR-Gestion-Pro-Total.command
├── ChromeBook/  INSTALAR-Gestion-Pro-Total.sh    (Linux/Chromebook)
└── Android/     gestion-pro-total.apk
```
Menú **INSTALAR**: [1] instalar en el PC (app normal) · [2] servidor local (red) · [3] nube/PWA.

## 5) El cliente usa la app
Windows · macOS · Linux · Android · Web (PWA). Online y **offline**. Auto‑actualización en escritorio.
La app **verifica** la licencia con la clave **pública** embebida.

## 6) Licencias (planes)
Demo 7 días gratis → luego elige plan · **Estudiantes** gratis (matrícula) 1 año · Mensual/Trimestral/Semestral/Anual · Perpetuo · Empresa (packs).

---

## 🔄 Flujo de una licencia (de extremo a extremo)
1. El cliente abre la app → **"Solicitar licencia"** (envía su **ID de equipo** a tu correo / Google Sheet).
2. **Tú**, en el panel, firmas la clave con tu **CLAVE PRIVADA**.
3. Le envías la clave → 4. El cliente la pega en **"Ya tengo mi clave"** → 5. La app la **valida con la clave pública** → ✅ **Activada**.

> 🔒 La **clave privada nunca sale de tu poder**. La app y las descargas solo llevan la **clave pública** (segura de publicar).

---

## 📦 Otras carpetas del paquete
```
distribucion/
├── COMERCIAL/        Presentación, vídeos, capturas, argumentario, tarifas
├── GESTOR-LICENCIAS/ Panel de licencias (+ Panel-Cloud: Apps Script + guía PDF)
├── MANUALES/         Guía rápida, manual de usuario y de administrador
├── LEGAL/            EULA, privacidad
├── PARA-EL-CLIENTE/  Lo que entregas al cliente (ver arriba)
├── MAPA-DISTRIBUCION.png / .md   (este mapa)
└── LEEME-PRIMERO.txt
docs/                 Instalación, sistema de licencias, firma de instaladores, etc.
```
