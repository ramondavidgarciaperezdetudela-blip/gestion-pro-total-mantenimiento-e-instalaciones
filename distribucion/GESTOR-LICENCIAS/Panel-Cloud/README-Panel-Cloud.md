# Panel-Cloud — Validación de licencias en servidor (recomendado)

La validación 100% offline obliga a llevar la clave secreta dentro de la app
(extraíble). Para protección **fuerte**, valida las licencias en un servidor
donde la clave nunca sale. Esto te da además: revocar licencias al instante,
ver qué clientes están activos y bloquear cuentas morosas.

## Opción A — Función serverless (Cloudflare Workers / Vercel)

Crea un endpoint `POST /validar` con este pseudocódigo (Node/Workers):

```js
import { createHmac, timingSafeEqual } from 'node:crypto';
const SECRET = process.env.GPT_SECRET; // tu clave maestra, SOLO en el servidor

export default async function handler(req) {
  const { license, deviceId } = await req.json();
  const [payloadB64, sigB64] = (license || '').split('.');
  const expected = createHmac('sha256', SECRET).update(payloadB64).digest();
  const provided = Buffer.from(sigB64.replace(/-/g,'+').replace(/_/g,'/'), 'base64');
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided))
    return Response.json({ valid:false, reason:'FIRMA_NO_COINCIDE' });
  const p = JSON.parse(Buffer.from(payloadB64,'base64url').toString());
  if (p.expira && Date.now() > p.expira) return Response.json({ valid:false, reason:'CADUCADA' });
  if (p.deviceId && p.deviceId !== deviceId) return Response.json({ valid:false, reason:'OTRO_EQUIPO' });
  // opcional: comprobar lista de revocadas en KV/DB
  return Response.json({ valid:true, reason:'OK', plan:p.plan, expira:p.expira });
}
```

Variables de entorno: `GPT_SECRET` = tu clave maestra (carpeta SOLO-PARA-MI).

## Conectar la app

En la app, usa `validateLicenseCloud(key, 'https://tu-endpoint/validar')`
de `src/lib/licenseManager.js`. Mira `docs/SISTEMA-LICENCIAS.md`.

## Opción B — Hoja de cálculo + Apps Script
Si no quieres servidor, puedes registrar manualmente las licencias emitidas en
una hoja de Google y revocar a mano. Menos automático, pero cero coste.
