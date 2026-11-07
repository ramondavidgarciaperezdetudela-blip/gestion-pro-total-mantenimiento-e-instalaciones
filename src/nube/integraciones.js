// Lo que antes daba el servicio de Base44 (subir archivos, IA, correo…).
import { leerConfig, leerSesion } from './config';
import { peticion } from './almacenRemoto';
import { leerError } from './errores';
import { crearEntidad } from './entidad';
import { ajustesIA, consultarIA } from '@/lib/proveedorIA';

const aDataUrl = (archivo) => new Promise((res, rej) => {
  const fr = new FileReader();
  fr.onload = () => res(fr.result);
  fr.onerror = () => rej(fr.error || new Error('No se pudo leer el archivo.'));
  fr.readAsDataURL(archivo);
});

const nombreSeguro = (n) => `${Date.now()}-${Math.random().toString(16).slice(2, 8)}-${String(n || 'archivo').replace(/[^\w.\-]+/g, '_')}`;

async function subirArchivo({ file }) {
  const c = leerConfig();
  if (!file) throw new Error('No hay ningún archivo que subir.');
  if (!c || c.modo === 'local') return { file_url: await aDataUrl(file), url: undefined };
  const nombre = nombreSeguro(file.name);
  if (c.modo === 'servidor') {
    const r = await peticion(`${c.url}/api/archivos`, { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-Nombre': encodeURIComponent(nombre) }, body: file });
    const j = await r.json();
    return { file_url: `${c.url}${j.ruta}` };
  }
  // Supabase Storage (cubo público «archivos»)
  const r = await peticion(`${c.url}/storage/v1/object/archivos/${encodeURIComponent(nombre)}`, { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'true' }, body: file });
  await r.text();
  return { file_url: `${c.url}/storage/v1/object/public/archivos/${encodeURIComponent(nombre)}` };
}

const sinCorreo = (motivo) => {
  const e = new Error(motivo || 'Enviar correos directamente necesita el servidor propio. Usa el botón de compartir o abre tu correo (mailto:).');
  e.status = 501;
  return e;
};

// El correo sale por el SMTP que se configura en Configuración → Email. Lo
// envía el servidor propio (un navegador o un móvil no pueden hablar SMTP).
async function enviarCorreo({ to, subject, body, html, from_name } = {}) {
  const c = leerConfig();
  if (!c || c.modo !== 'servidor') {
    throw sinCorreo('Para enviar correos directamente hay que usar el servidor propio (se elige al instalar). En los otros modos, usa el botón de compartir o el correo del móvil (mailto:).');
  }
  const ajustes = (await crearEntidad('CompanySettings').list())?.[0]?.email_config || {};
  if (!ajustes.smtp_host || !ajustes.smtp_user) {
    throw sinCorreo('Faltan los datos del correo: rellénalos en Configuración → Email (servidor SMTP, usuario y clave de aplicación).');
  }
  const r = await peticion(`${c.url}/api/correo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to, subject, body, html,
      smtp: { host: ajustes.smtp_host, port: ajustes.smtp_port, user: ajustes.smtp_user, pass: ajustes.smtp_pass, ssl: ajustes.use_ssl !== false, nombre: from_name || ajustes.from_name },
    }),
  });
  return r.json();
}

async function invocarIA(args) {
  let cfg = ajustesIA();
  if (cfg.proveedor === 'base44') cfg = { ...cfg, proveedor: cfg.openrouter_clave ? 'openrouter' : 'ollama' };
  try {
    return await consultarIA(args || {}, cfg);
  } catch (e) {
    if (!cfg.openrouter_clave && cfg.proveedor === 'openrouter') e.message = 'Falta la clave de OpenRouter: pégala en Configuración → IA.';
    throw e;
  }
}

async function generarImagen({ prompt }) {
  const cfg = ajustesIA();
  if (!cfg.openrouter_clave) throw new Error('Para generar imágenes con IA pega tu clave de OpenRouter en Configuración → IA.');
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST', headers: { Authorization: `Bearer ${cfg.openrouter_clave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'google/gemini-2.5-flash-image', modalities: ['image', 'text'], messages: [{ role: 'user', content: prompt }] }),
  });
  if (!r.ok) throw await leerError(r);
  const j = await r.json();
  const url = j?.choices?.[0]?.message?.images?.[0]?.image_url?.url || '';
  if (!url) throw new Error('La IA no devolvió ninguna imagen.');
  return { url };
}

export const integrations = {
  Core: {
    UploadFile: subirArchivo,
    UploadPublicFile: subirArchivo,
    UploadPrivateFile: async (a) => { const r = await subirArchivo(a); return { file_uri: r.file_url }; },
    CreateFileSignedUrl: async ({ file_uri }) => ({ signed_url: file_uri }),
    InvokeLLM: invocarIA,
    GenerateImage: generarImagen,
    SendEmail: enviarCorreo,
    ExtractDataFromUploadedFile: async () => {
      const e = new Error('Leer datos de Excel/PDF con IA no está disponible en la versión sin Base44. Importa el catálogo en CSV desde la pantalla de proveedores.');
      e.status = 501;
      throw e;
    },
  },
};
export const _sesion = leerSesion;
