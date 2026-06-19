# 🛠️ Manual del Administrador — Gestión Pro Total

Dirigido a ti (propietario del software) para gestionar licencias y despliegue.

## 1. Emitir licencias
Usa `GESTOR-LICENCIAS/GESTOR-DE-LICENCIAS.html`. Necesitas tu
clave maestra (carpeta `SOLO-PARA-MI`). Pasos en `INSTRUCCIONES-PRIVADAS.md`.

## 2. Modelo de protección
- Licencia firmada con **HMAC-SHA256** y atada al **ID de equipo**.
- Validación **offline** (clave en la app) o **cloud** (recomendada).
- Para revocar/controlar morosos: despliega el **Panel-Cloud**.

## 3. Activar la capa de licencias en la app
Por defecto la app NO bloquea. Para activar el control, sigue
`docs/SISTEMA-LICENCIAS.md` (envuelve la app con la pantalla de activación).

## 4. Distribución a clientes
- Entrégale solo la carpeta `PARA-EL-CLIENTE` correspondiente a su sistema.
- Para escritorio nativo, comparte el enlace de la **Release** de GitHub.
- Nunca entregues `SOLO-PARA-MI`.

## 5. Actualizaciones
- Recompila con `npm run build:electron` y reparte la nueva carpeta `dist`,
  o publica una nueva Release.

## 6. Soporte y backups
- Pide al cliente sus copias desde el Centro de Copias antes de actualizar.
- Mantén tu clave maestra y la lista de clientes a buen recaudo.
