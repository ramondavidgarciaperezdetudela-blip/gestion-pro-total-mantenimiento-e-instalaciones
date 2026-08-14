import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

// Create a client with authentication required
// serverUrl explícita (no vacía): con '' las peticiones se hacen a rutas
// relativas, que solo resuelven bien cuando la app se sirve desde el propio
// dominio de Base44. En la app instalada (escritorio file://, APK
// https://localhost) una ruta relativa apunta al origen equivocado y toda
// petición al backend falla — se ve como "sin conexión" pese a haber
// internet real. Usar siempre la URL absoluta del backend lo arregla en
// todas las plataformas sin cambiar nada en la web servida por Base44.
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: appBaseUrl,
  requiresAuth: false,
  appBaseUrl
});
