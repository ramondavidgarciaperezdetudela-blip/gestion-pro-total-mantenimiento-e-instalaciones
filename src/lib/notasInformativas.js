/**
 * notasInformativas.js — notas informativas a clientes con firma de lectura.
 *
 * Una NOTA se escribe una vez (a mano o con la IA) y se manda a todos los
 * clientes o a algunos. Por cada cliente se crea un ENVÍO con su propio enlace
 * seguro (token). Cuando el cliente firma, el envío pasa a «firmada» y se
 * archiva en su ficha (ClientDocument) para poder recuperarla e imprimirla.
 *
 * Cada envío guarda una COPIA del texto tal y como lo recibió el cliente: si
 * después se edita la nota, lo que firmó él no cambia.
 *
 * Todo lo de aquí es puro (sin red) salvo `sincronizarFirmadas`, que recibe el
 * cliente de datos, para poder comprobarlo con tests.
 */

export const ESTADOS = { pendiente: 'Pendiente de firma', firmada: 'Firmada' };

const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Texto plano → párrafos HTML, ya escapado (nunca se guarda HTML ajeno). */
export function textoAHtml(texto) {
  return String(texto ?? '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p style="margin:0 0 12px;line-height:1.55">${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
}

/** Un identificador largo e impredecible para el enlace de cada cliente. */
export function nuevoToken() {
  const b = new Uint8Array(16);
  globalThis.crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

// ── Marcadores que se rellenan solos con los datos de cada cliente ─────────
const sinAcentos = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/\s*\/\s*/g, ' / ').replace(/\s+/g, ' ').trim();

// marcador (sin acentos ni mayúsculas) → qué dato lleva
const MARCAS = {
  cliente: ['nombre de cliente', 'nombre del cliente', 'nombre cliente', 'nombre de la cliente', 'cliente'],
  empresa: ['nombre de tu empresa', 'nombre de su empresa', 'nombre de la empresa', 'nombre de mi empresa',
    'nombre de nuestra empresa', 'nombre empresa', 'nombre de empresa', 'empresa'],
  remitente: ['tu nombre', 'su nombre', 'mi nombre', 'nombre del remitente', 'nombre y apellidos', 'tu nombre y apellidos', 'firma', 'tu firma'],
  telefonoCorreo: ['telefono / correo electronico', 'telefono / correo', 'telefono / email', 'telefono / e-mail', 'telefono y correo electronico',
    'telefono o correo electronico', 'correo electronico / telefono', 'datos de contacto', 'tus datos de contacto', 'contacto'],
  telefono: ['telefono', 'tu telefono', 'telefono de contacto', 'telefono de la empresa', 'tu telefono de contacto'],
  correo: ['correo electronico', 'correo', 'email', 'e-mail', 'tu correo electronico', 'tu correo', 'tu email', 'correo de contacto', 'correo electronico de contacto'],
  direccion: ['direccion de la empresa', 'tu direccion', 'direccion de tu empresa'],
  web: ['web', 'pagina web', 'sitio web', 'tu web'],
  telefonoCliente: ['telefono del cliente', 'telefono de cliente'],
  correoCliente: ['correo del cliente', 'email del cliente', 'correo electronico del cliente'],
  direccionCliente: ['direccion del cliente', 'direccion de cliente'],
  fecha: ['fecha', 'fecha de hoy', 'fecha de envio', 'fecha de la nota', 'fecha actual', 'hoy'],
};
const DATO_DE = new Map(Object.entries(MARCAS).flatMap(([dato, lista]) => lista.map((m) => [m, dato])));
export const MARCADOR_CLIENTE = '[nombre de cliente]';
export const MARCADOR_EMPRESA = '[nombre de tu empresa]';
export const MARCADORES = [
  '[nombre de cliente]', '[nombre de tu empresa]', '[Tu nombre]', '[Teléfono / Correo electrónico]', '[fecha]',
];

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
/** 13 de noviembre de 2026 */
export const fechaEscrita = (d = new Date()) => `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;

/** ¿Este [hueco] es uno de los que el programa rellena solo? */
export const esMarcadorAutomatico = (hueco) => DATO_DE.has(sinAcentos(String(hueco).replace(/^[\[{]|[\]}]$/g, '')));

/**
 * Los datos con los que se rellena una nota para UN cliente.
 * @param cliente   el contacto
 * @param empresa   CompanySettings
 * @param remitente nombre de quien firma la nota (el usuario); si no se sabe, la empresa
 */
export function datosDeNota({ cliente, empresa, remitente, fecha } = {}) {
  const c = cliente || {};
  const e = empresa || {};
  const nombreCliente = c.__nombre || nombreDe(c);
  const contacto = [e.phone, e.email].filter(Boolean).join(' / ');
  return {
    cliente: nombreCliente, empresa: e.company_name || '', remitente: remitente || e.company_name || '',
    telefonoCorreo: contacto, telefono: e.phone || '', correo: e.email || '', direccion: e.address || '', web: e.website || '',
    telefonoCliente: c.phone || c.mobile || '', correoCliente: c.email || '',
    direccionCliente: [c.address, c.city].filter(Boolean).join(', '),
    fecha: fechaEscrita(fecha instanceof Date ? fecha : new Date()),
  };
}

/**
 * Pone en la nota los datos de este cliente y de la empresa donde aparezcan
 * [nombre de cliente], [nombre de tu empresa], [Tu nombre], [Teléfono / Correo
 * electrónico]… (con o sin mayúsculas, tildes, corchetes o llaves). Si falta el
 * dato, el marcador se queda tal cual para que se vea.
 */
export function personalizar(texto, datos = {}) {
  return String(texto ?? '').replace(/[\[{][^\]}\n]{2,45}[\]}]/g, (m) => {
    const dato = DATO_DE.get(sinAcentos(m.slice(1, -1)));
    return (dato && datos[dato]) ? datos[dato] : m;
  });
}

const nombreDe = (c) => `${c?.name || ''} ${c?.surname || ''}`.trim() || c?.company_name || c?.full_name || 'Cliente';

/**
 * Un envío por cliente. No repite los que ya tienen envío de esa nota.
 * @param {object} nota   {id, title, body}
 * @param {object[]} clientes
 * @param {object[]} existentes  envíos que ya hay (de esa nota)
 */
export function crearEnvios(nota, clientes = [], existentes = [], contexto = {}) {
  const ya = new Set(existentes.filter((e) => String(e.nota_id) === String(nota.id)).map((e) => String(e.contact_id)));
  const vistos = new Set();
  const salida = [];
  for (const c of clientes) {
    if (!c?.id || ya.has(String(c.id)) || vistos.has(String(c.id))) continue;
    vistos.add(String(c.id));
    const datos = datosDeNota({ cliente: c, empresa: contexto?.empresa, remitente: contexto?.remitente, fecha: contexto?.fecha });
    salida.push({
      nota_id: nota.id,
      nota_title: personalizar(nota.title, datos),
      nota_body: personalizar(nota.body, datos),
      contact_id: c.id,
      contact_name: nombreDe(c),
      contact_email: c.email || '',
      contact_phone: c.phone || c.mobile || '',
      token: nuevoToken(),
      status: 'pendiente',
    });
  }
  return salida;
}

/** Enlace personal del cliente (la página pública donde lee y firma). */
export function enlaceNota(base, envio) {
  const b = String(base || '').replace(/\/$/, '');
  if (!b || !envio?.id || !envio?.token) return '';
  return `${b}/nota-publica?id=${encodeURIComponent(envio.id)}&t=${encodeURIComponent(envio.token)}`;
}

export function mensajeNota({ envio, empresa, enlace }) {
  const nombre = String(envio?.contact_name || '').split(' ')[0] || 'cliente';
  const emp = empresa?.company_name || '';
  const asunto = `Nota informativa: ${envio?.nota_title || ''}${emp ? ` — ${emp}` : ''}`;
  const cuerpo = `Hola ${nombre},\n\nLe enviamos una nota informativa: «${envio?.nota_title || ''}».\n\n`
    + `Le pedimos que la lea y la firme para dejar constancia de que la ha recibido:\n${enlace}\n\n`
    + `Gracias.\n${emp}`.trim();
  const texto = `Hola ${nombre},\n\nLe enviamos una nota informativa: «${envio?.nota_title || ''}».\n\n`
    + `Le pedimos que la lea y la firme para dejar constancia de que la ha recibido.\n\nGracias.\n${emp}`.trim();
  return { asunto, cuerpo, texto };
}

export function resumenEnvios(envios = []) {
  const firmadas = envios.filter((e) => e.status === 'firmada').length;
  return { total: envios.length, firmadas, pendientes: envios.length - firmadas };
}

const fechaLarga = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso || '');
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
export { fechaLarga };

const VIA = { enlace: 'desde su enlace', pantalla: 'en la pantalla del técnico', papel: 'en papel (documento escaneado)' };

/** Documento imprimible: la nota tal y como la recibió y, si la hay, su firma. */
export function htmlNotaFirmada({ envio, empresa }) {
  const firmada = envio?.status === 'firmada';
  const firma = envio?.signature && /^data:image\/(png|jpe?g|webp);base64,/i.test(envio.signature)
    ? `<img src="${envio.signature}" alt="Firma" style="max-width:260px;max-height:120px;border:1px solid #cbd5e1;background:#fff;padding:4px"/>` : '';
  const papel = envio?.signed_file_url ? `<p style="font-size:12px;color:#475569">Documento firmado en papel: ${esc(envio.signed_file_url)}</p>` : '';
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(envio?.nota_title)}</title>
<style>body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;margin:0;padding:28px 36px;font-size:14px}h1{font-size:22px;margin:0 0 4px;color:#1e3a5f}
.cab{border-bottom:2px solid #1e3a5f;padding-bottom:10px;margin-bottom:18px;display:flex;justify-content:space-between;gap:12px}
.firma{margin-top:28px;border:1px solid #cbd5e1;border-radius:8px;padding:14px;page-break-inside:avoid}.pend{color:#b45309}.ok{color:#15803d}</style></head><body>
<div class="cab"><div><strong>${esc(empresa?.company_name)}</strong><br><span style="font-size:12px;color:#475569">${esc([empresa?.nif, empresa?.phone, empresa?.email].filter(Boolean).join(' · '))}</span></div>
<div style="text-align:right;font-size:12px;color:#475569">NOTA INFORMATIVA</div></div>
<h1>${esc(envio?.nota_title)}</h1>
<p style="font-size:12px;color:#475569;margin:0 0 16px">Dirigida a: <strong>${esc(envio?.contact_name)}</strong>${envio?.sent_date ? ` · Enviada el ${esc(fechaLarga(envio.sent_date))}` : ''}</p>
${textoAHtml(envio?.nota_body)}
<div class="firma"><p style="margin:0 0 8px"><strong>Constancia de lectura:</strong> <span class="${firmada ? 'ok' : 'pend'}">${firmada ? 'LEÍDA Y FIRMADA' : 'PENDIENTE DE FIRMA'}</span></p>
${firmada ? `<p style="margin:0 0 8px;font-size:13px">Firmada por <strong>${esc(envio.contact_name)}</strong> el <strong>${esc(fechaLarga(envio.signed_at))}</strong> ${esc(VIA[envio.signature_via] || '')}.</p>${firma}${papel}`
  : '<p style="margin:0 0 40px;font-size:13px">Firma del cliente:</p><div style="border-bottom:1px solid #0f172a;width:260px"></div>'}
</div></body></html>`;
}

/** Lo que se le pide a la IA, y cómo se lee lo que devuelve. */
export function peticionNotaIA({ tema, tono = 'cercano y profesional', empresa }) {
  return {
    prompt: `Eres el redactor de comunicaciones de ${empresa?.company_name || 'una empresa de servicios técnicos (climatización, frío industrial, electricidad)'}. `
      + `Redacta una NOTA INFORMATIVA para clientes, en español de España, tono ${tono}, clara y breve (máximo 180 palabras), `
      + 'sin inventar datos, precios ni fechas que no se indiquen. Debe poder leerse en el móvil. '
      + `Empieza con «Estimado/a ${MARCADOR_CLIENTE},» y cierra con la despedida, ${MARCADORES[2]} y ${MARCADORES[1]}, y con ${MARCADORES[3]} si invitas a contactar; pon ${MARCADORES[4]} en la primera línea para la fecha; escribe esos marcadores EXACTAMENTE así, entre corchetes, porque el programa los sustituye por los datos de cada cliente y de la empresa. `
      + `Tema o puntos a incluir:\n${tema}\n\nDevuelve un título corto y el texto, con párrafos separados por una línea en blanco, sin viñetas raras ni HTML.`,
    response_json_schema: {
      type: 'object',
      properties: { titulo: { type: 'string' }, cuerpo: { type: 'string' } },
      required: ['titulo', 'cuerpo'],
    },
  };
}

export function leerNotaIA(r) {
  const o = typeof r === 'string' ? (() => { try { return JSON.parse(r); } catch { return { cuerpo: r }; } })() : (r || {});
  return { titulo: String(o.titulo || o.title || '').trim(), cuerpo: String(o.cuerpo || o.body || o.texto || '').replace(/<[^>]+>/g, '').trim() };
}

/** Documento que se guarda en la ficha del cliente: desde que se envía (pendiente) y, al firmar, firmado. */
export function documentoDeFicha(envio) {
  const firmada = envio.status === 'firmada';
  return {
    contact_id: envio.contact_id,
    contact_name: envio.contact_name,
    title: firmada ? `Nota informativa firmada: ${envio.nota_title}` : `Nota informativa (pendiente de firma): ${envio.nota_title}`,
    doc_type: 'nota_informativa',
    date: String(firmada ? envio.signed_at : (envio.sent_date || envio.created_date || new Date().toISOString())).slice(0, 10),
    file_url: envio.signed_file_url || '',
    reference_id: envio.id,
    description: firmada
      ? `Leída y firmada el ${fechaLarga(envio.signed_at)} ${VIA[envio.signature_via] || ''}`.trim()
      : 'Enviada al cliente. Pendiente de firma.',
  };
}

/**
 * Mantiene la ficha del cliente al día con sus notas:
 *  · toda nota preparada para un cliente se guarda en SU ficha (como pendiente);
 *  · cuando la firma (por su enlace, en pantalla o en papel) el mismo documento
 *    pasa a «firmado», sin duplicarse.
 * Se hace con la cuenta del usuario, así la ficha es suya y la ve.
 * @returns las firmas que acaban de llegar a la ficha (para avisar).
 */
export async function sincronizarDocumentos(base44, envios = []) {
  const nuevasFirmas = [];
  for (const e of envios) {
    const firmada = e.status === 'firmada';
    try {
      if (!e.client_doc_id) {
        const doc = await base44.entities.ClientDocument.create(documentoDeFicha(e));
        const marca = { client_doc_id: doc?.id || 'ok', client_doc_estado: firmada ? 'firmada' : 'pendiente' };
        await base44.entities.NotaEnvio.update(e.id, marca);
        Object.assign(e, marca);
        if (firmada) nuevasFirmas.push(e);
      } else if (firmada && e.client_doc_estado !== 'firmada') {
        const { title, description, file_url, date } = documentoDeFicha(e);
        if (e.client_doc_id !== 'ok') await base44.entities.ClientDocument.update(e.client_doc_id, { title, description, file_url, date });
        await base44.entities.NotaEnvio.update(e.id, { client_doc_estado: 'firmada' });
        e.client_doc_estado = 'firmada';
        nuevasFirmas.push(e);
      }
    } catch (err) { console.warn('[notas] no se pudo actualizar la ficha del cliente:', err); }
  }
  return nuevasFirmas;
}

/** Se mantiene por compatibilidad: ahora archiva también las pendientes. */
export const sincronizarFirmadas = sincronizarDocumentos;

/** Registrar una firma tomada aquí (pantalla o papel). */
export async function registrarFirma(base44, envio, { signature = '', signed_file_url = '', via = 'pantalla' }) {
  const datos = { status: 'firmada', signature, signed_file_url, signature_via: via, signed_at: new Date().toISOString() };
  await base44.entities.NotaEnvio.update(envio.id, datos);
  const completo = { ...envio, ...datos };
  await sincronizarDocumentos(base44, [completo]);
  return completo;
}

/**
 * Cambiar el texto de una nota que ya se preparó: los envíos PENDIENTES se
 * rehacen con el texto nuevo (y los datos de cada cliente); los ya firmados no
 * se tocan, porque lo que firmó el cliente no puede cambiar.
 */
export async function actualizarPendientes(base44, nota, envios = [], clientes = [], contexto = {}) {
  let n = 0;
  for (const e of envios) {
    if (e.status === 'firmada' || String(e.nota_id) !== String(nota.id)) continue;
    const c = clientes.find((x) => String(x.id) === String(e.contact_id));
    const datos = datosDeNota({ cliente: c || { __nombre: e.contact_name }, empresa: contexto?.empresa, remitente: contexto?.remitente, fecha: e.sent_date || e.created_date ? new Date(e.sent_date || e.created_date) : undefined });
    const cambios = { nota_title: personalizar(nota.title, datos), nota_body: personalizar(nota.body, datos) };
    await base44.entities.NotaEnvio.update(e.id, cambios);
    if (e.client_doc_id && e.client_doc_id !== 'ok') {
      await base44.entities.ClientDocument.update(e.client_doc_id, { title: documentoDeFicha({ ...e, ...cambios }).title }).catch(() => {});
    }
    n++;
  }
  return n;
}
