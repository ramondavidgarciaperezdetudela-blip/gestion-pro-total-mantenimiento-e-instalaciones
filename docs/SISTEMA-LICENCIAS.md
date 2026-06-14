# Sistema de licencias (firma de clave pública)

La app incorpora una capa de licencias basada en **firma ECDSA P-256**:

- La app lleva solo la **clave pública** (incrustada en `src/lib/licenseManager.js`).
  Sirve para **verificar** licencias, pero **no** para crearlas: por eso es seguro
  publicar el código y el `dist`.
- Tú firmas las licencias con la **clave privada** (carpeta `SOLO-PARA-MI`,
  nunca se sube). Sin ella nadie puede generar licencias válidas.

La protección está **activada** por defecto (`enabled: true` en
`src/lib/license.config.js`). La app pide una licencia válida, salvo en rutas
públicas (presupuestos/SAT compartidos) y en builds con bypass de propietario.

## Piezas
- `src/lib/licenseManager.js` — verificación ECDSA, atado a equipo, expiración.
- `src/lib/license.config.js` — flags de la capa (activar, modo, rutas públicas).
- `src/components/LicenseGate.jsx` — envoltorio + pantalla de activación.
- **Panel de administración** (`distribucion/GESTOR-LICENCIAS/`) — firma licencias
  con tu clave privada (fuera del repo público va la privada).

## Formato de licencia
`base64url(payload).base64url(firmaECDSA)` donde
`payload = { cliente, email, deviceId, plan, emitida, expira, v }`.
Si `deviceId` está relleno, la licencia solo vale en ese equipo (anti-compartición).

## Modos
- **Local (por defecto)**: verificación offline con la clave pública incrustada.
- **Cloud (opcional)**: compila con `VITE_LICENSE_ENDPOINT=https://.../validar`
  para validar en servidor y poder **revocar** licencias. Ver
  `distribucion/GESTOR-LICENCIAS/Panel-Cloud/`.

## Variables de entorno (build, opcionales)
```
VITE_LICENSE_ENDPOINT      # URL del validador en servidor (activa modo cloud)
VITE_LICENSE_OWNER_BYPASS  # "1" para tu build personal sin pedir licencia
VITE_LICENSE_PUBKEY        # JWK alternativo si algún día rotas la clave pública
```
Pon estos valores en un `.env.local` (no se sube a git). Sin nada configurado,
la app valida offline con la clave pública incrustada.

## Desactivar la capa
Pon `enabled: false` en `src/lib/license.config.js` y recompila: la app dejará
de pedir licencia.

## Rotar la clave (si se compromete la privada)
1. Genera un nuevo par ECDSA P-256.
2. Sustituye la clave pública en `licenseManager.js` (o usa `VITE_LICENSE_PUBKEY`).
3. Reemite las licencias activas con la nueva clave privada.
