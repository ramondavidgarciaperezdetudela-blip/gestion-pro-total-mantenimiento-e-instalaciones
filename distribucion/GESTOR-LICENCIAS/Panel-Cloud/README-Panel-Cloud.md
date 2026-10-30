# Panel-Cloud — Validación de licencias en servidor (recomendado)

Con firma de clave pública, la app ya valida offline de forma segura (nadie
puede falsificar licencias). El servidor solo es necesario si además quieres
**revocar licencias al instante** o llevar control de clientes/morosos.

## Función serverless (Cloudflare Workers / Vercel)

Endpoint `POST /validar` (Node/Workers). Verifica la firma con la CLAVE
PÚBLICA (no necesita la privada) y consulta tu lista de revocadas:

```js
// La clave PÚBLICA es segura de poner aquí.
const PUBLIC_JWK = { kty:'EC', crv:'P-256', x:'...', y:'...' };

export default async function handler(req) {
  const { license, deviceId } = await req.json();
  const [pB64, sigB64] = (license || '').split('.');
  const key = await crypto.subtle.importKey('jwk', PUBLIC_JWK,
    { name:'ECDSA', namedCurve:'P-256' }, false, ['verify']);
  const unb64 = s => Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')), c=>c.charCodeAt(0));
  const ok = await crypto.subtle.verify({ name:'ECDSA', hash:'SHA-256' }, key,
    unb64(sigB64), new TextEncoder().encode(pB64));
  if (!ok) return Response.json({ valid:false, reason:'FIRMA_NO_COINCIDE' });
  const p = JSON.parse(new TextDecoder().decode(unb64(pB64)));
  if (p.expira && Date.now() > p.expira) return Response.json({ valid:false, reason:'CADUCADA' });
  if (p.deviceId && p.deviceId !== deviceId) return Response.json({ valid:false, reason:'OTRO_EQUIPO' });
  // if (await estaRevocada(license)) return Response.json({ valid:false, reason:'REVOCADA' });
  return Response.json({ valid:true, reason:'OK', plan:p.plan, expira:p.expira });
}
```

## Conectar la app
Compila con `VITE_LICENSE_ENDPOINT=https://tu-endpoint/validar`. La app usará
`validateLicenseCloud` automáticamente. Mira `docs/SISTEMA-LICENCIAS.md`.
