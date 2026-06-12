# Sistema de licencias (capa opcional)

Esta app incorpora una **capa de licencias OPCIONAL**. Por defecto **no está
activada**: la app funciona con normalidad sin pedir ninguna clave. Cuando
quieras vender con control de licencias, actívala siguiendo esta guía.

## Piezas
- `src/lib/licenseManager.js` — librería de validación (HMAC-SHA256, atado a
  equipo, expiración). No contiene la clave secreta.
- **Panel de administración** y **formulario de solicitud**: ficheros HTML del
  paquete de entrega (`GESTOR-LICENCIAS/`), fuera del repo público.
- **Clave maestra**: privada, nunca se sube a GitHub.

## Cómo funciona
Una licencia tiene el formato `payload.firma`:
- `payload` = base64url de `{cliente, email, deviceId, plan, emitida, expira}`.
- `firma` = `HMAC-SHA256(payload, CLAVE_MAESTRA)`.

La licencia se ata al `deviceId` del equipo, de modo que copiarla a otro PC la
invalida (`OTRO_EQUIPO`).

## Activar el bloqueo en la app (opcional)
Envuelve el árbol de la app con una comprobación. Ejemplo mínimo:

```jsx
import { useEffect, useState } from 'react';
import {
  loadLicense, saveLicense, getDeviceId,
  validateLicenseLocal, validateLicenseCloud, describeReason,
} from '@/lib/licenseManager';

// Modo CLOUD (recomendado): no necesita la clave en el cliente.
const CLOUD_ENDPOINT = ''; // p.ej. 'https://tu-worker/validar'
// Modo LOCAL (offline): exige tener el SECRET en el cliente (extraíble).
const LOCAL_SECRET = '';   // déjalo vacío si usas cloud

export function LicenseGate({ children }) {
  const [state, setState] = useState({ checking: true, valid: false });

  useEffect(() => { (async () => {
    const key = loadLicense();
    if (!key) return setState({ checking: false, valid: false });
    const res = CLOUD_ENDPOINT
      ? await validateLicenseCloud(key, CLOUD_ENDPOINT)
      : await validateLicenseLocal(key, LOCAL_SECRET, { deviceId: getDeviceId() });
    setState({ checking: false, valid: res.valid, reason: res.reason });
  })(); }, []);

  if (state.checking) return <p>Comprobando licencia…</p>;
  if (state.valid) return children;
  return <ActivationScreen onActivated={() => location.reload()} reason={state.reason} />;
}
```

Después, en tu `App.jsx`, envuelve las rutas privadas con `<LicenseGate>`.

> Recomendación: usa el **modo CLOUD** (carpeta `Panel-Cloud` del paquete) para
> poder **revocar** licencias y controlar morosos. El modo local es cómodo pero
> la clave es extraíble del cliente.

## Seguridad
- HMAC-SHA256 con `crypto.subtle`, comparación en tiempo constante.
- La clave maestra **nunca** debe subirse al repositorio (`.gitignore`).
- El hash público de verificación de la clave está en `MASTER_KEY_FINGERPRINT`
  (informativo, no permite firmar).
