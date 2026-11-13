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

const nombreDe = (c) => `${c?.name || ''} ${c?.surname || ''}`.trim() || c?.company_name || c?.full_name || 'Cliente';

/**
 * Un envío por cliente. No repite los que ya tienen envío de esa nota.
 * @param {object} nota   {id, title, body}
 * @param {object[]} clientes
 * @param {object[]} existentes  envíos que ya hay (de esa nota)
 */
export function crearEnvios(nota, clientes = [], existentes = []) {
  const ya = new Set(existentes.filter((e) => String(e.nota_id) === String(nota.id)).map((e) => String(e.contact_id)));
  const vistos = new Set();
  const salida = [];
  for (const c of clientes) {
    if (!c?.id || ya.has(String(c.id)) || vistos.has(String(c.id))) continue;
    vistos.add(String(c.id));
    salida.push({
      nota_id: nota.id,
      nota_title: nota.title,
      nota_body: nota.body,
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

/** Datos de la copia de la firma en la ficha del cliente. */
export function documentoDeFicha(envio) {
  return {
    contact_id: envio.contact_id,
    contact_name: envio.contact_name,
    title: `Nota informativa firmada: ${envio.nota_title}`,
    doc_type: 'nota_informativa',
    date: String(envio.signed_at || new Date().toISOString()).slice(0, 10),
    file_url: envio.signed_file_url || '',
    reference_id: envio.id,
    description: `Leída y firmada el ${fechaLarga(envio.signed_at)} ${VIA[envio.signature_via] || ''}`.trim(),
  };
}

/**
 * Las firmas que llegan por el enlace las guarda el servidor en el envío.
 * Aquí, con la cuenta del usuario, se archivan en la ficha del cliente (así la
 * ficha es suya y la ve) y se devuelve cuántas firmas nuevas había.
 */
export async function sincronizarFirmadas(base44, envios = []) {
  const nuevas = envios.filter((e) => e.status === 'firmada' && !e.client_doc_id);
  const hechas = [];
  for (const e of nuevas) {
    try {
      const doc = await base44.entities.ClientDocument.create(documentoDeFicha(e));
      await base44.entities.NotaEnvio.update(e.id, { client_doc_id: doc?.id || 'ok' });
      hechas.push({ ...e, client_doc_id: doc?.id || 'ok' });
    } catch (err) { console.warn('[notas] no se pudo archivar la firma:', err); }
  }
  return hechas;
}

/** Registrar una firma tomada aquí (pantalla o papel). */
export async function registrarFirma(base44, envio, { signature = '', signed_file_url = '', via = 'pantalla' }) {
  const datos = { status: 'firmada', signature, signed_file_url, signature_via: via, signed_at: new Date().toISOString() };
  await base44.entities.NotaEnvio.update(envio.id, datos);
  const completo = { ...envio, ...datos };
  const [hecha] = await sincronizarFirmadas(base44, [completo]);
  return hecha || completo;
}
