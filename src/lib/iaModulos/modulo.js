// Módulos: pantallas y automatizaciones creadas con IA (o importadas) que corren aisladas
// en un iframe sin acceso a los datos de la app. Solo hablan con el programa por el puente
// (puente.js), y solo con los permisos que la persona les concedió.
import { normalizaPermisos } from './permisos.js';

export const MAX_HTML = 400 * 1024;
export const TIPOS_RESPUESTA = ['modulo', 'skill', 'peticion_cambio'];

const limpiaTexto = (t, max) => String(t ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);

/** Valida y normaliza un módulo venga de la IA o de un archivo importado. */
export function validarModulo(obj) {
  const errores = [];
  const nombre = limpiaTexto(obj?.nombre, 80);
  const html = typeof obj?.html === 'string' ? obj.html : '';
  if (!nombre) errores.push('Falta el nombre del módulo.');
  if (!html.trim()) errores.push('El módulo no tiene contenido (html).');
  if (html.length > MAX_HTML) errores.push('El módulo es demasiado grande (máximo 400 KB).');
  const { validos, rechazados } = normalizaPermisos(obj?.permisos);
  if (errores.length) return { ok: false, errores };
  return {
    ok: true,
    errores: [],
    avisos: rechazados.length ? [`Permisos descartados por no ser válidos o estar prohibidos: ${rechazados.join(', ')}`] : [],
    modulo: {
      nombre,
      descripcion: limpiaTexto(obj?.descripcion, 400),
      icono: limpiaTexto(obj?.icono, 20) || 'cuadro',
      html,
      permisos: validos
    }
  };
}

/** Valida una skill (instrucciones reutilizables para la IA). */
export function validarSkill(obj) {
  const nombre = limpiaTexto(obj?.nombre, 80);
  const instrucciones = limpiaTexto(obj?.instrucciones, 8000);
  const errores = [];
  if (!nombre) errores.push('Falta el nombre de la skill.');
  if (!instrucciones) errores.push('Faltan las instrucciones de la skill.');
  return errores.length ? { ok: false, errores } : { ok: true, errores: [], skill: { nombre, descripcion: limpiaTexto(obj?.descripcion, 300), instrucciones } };
}

/** Valida una petición de cambio real en el programa. */
export function validarPeticion(obj) {
  const titulo = limpiaTexto(obj?.titulo || obj?.nombre, 120);
  const detalle = limpiaTexto(obj?.detalle || obj?.descripcion, 12000);
  const errores = [];
  if (!titulo) errores.push('Falta el título de la petición.');
  if (!detalle) errores.push('Falta el detalle de la petición.');
  return errores.length ? { ok: false, errores } : { ok: true, errores: [], peticion: { titulo, detalle } };
}

/**
 * Saca de la respuesta de la IA el bloque ```gpt-... con el JSON.
 * @returns {{texto:string, tipo?:string, datos?:object, error?:string}}
 */
export function extraerRespuesta(texto) {
  const t = String(texto ?? '');
  const m = t.match(/```gpt-(modulo|skill|peticion_cambio)\s*\n([\s\S]*?)\n?```/);
  if (!m) return { texto: t.trim() };
  const antes = (t.slice(0, m.index) + t.slice(m.index + m[0].length)).trim();
  try {
    return { texto: antes, tipo: m[1], datos: JSON.parse(m[2]) };
  } catch {
    return { texto: antes, tipo: m[1], error: 'La IA devolvió el bloque con un formato que no se puede leer. Pídele que lo repita.' };
  }
}

const CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:";

/** Script que corre DENTRO del iframe: define GPT y avisa del alto. */
export const SCRIPT_PUENTE = `
(function () {
  var n = 0, pend = {};
  window.addEventListener('message', function (e) {
    var m = e.data;
    if (!m || m.gpt !== 'res' || !pend[m.id]) return;
    var p = pend[m.id]; delete pend[m.id];
    if (m.ok) p.res(m.data); else p.rej(new Error(m.error || 'Error'));
  });
  function call(op, args) {
    return new Promise(function (res, rej) {
      var id = ++n; pend[id] = { res: res, rej: rej };
      parent.postMessage({ gpt: 'req', id: id, op: op, args: args || {} }, '*');
    });
  }
  window.GPT = {
    listar: function (entidad, o) { return call('listar', Object.assign({ entidad: entidad }, o || {})); },
    obtener: function (entidad, id) { return call('obtener', { entidad: entidad, id: id }); },
    crear: function (entidad, datos) { return call('crear', { entidad: entidad, datos: datos }); },
    editar: function (entidad, id, datos) { return call('editar', { entidad: entidad, id: id, datos: datos }); },
    borrar: function (entidad, id) { return call('borrar', { entidad: entidad, id: id }); },
    guardar: function (coleccion, clave, datos) { return call('guardar', { coleccion: coleccion, clave: clave, datos: datos }); },
    leer: function (coleccion, clave) { return call('leer', { coleccion: coleccion, clave: clave }); },
    listarColeccion: function (coleccion) { return call('listarColeccion', { coleccion: coleccion }); },
    borrarDato: function (coleccion, clave) { return call('borrarDato', { coleccion: coleccion, clave: clave }); },
    http: function (conector, o) { return call('http', Object.assign({ conector: conector }, o || {})); },
    ia: function (pregunta, o) { return call('ia', Object.assign({ pregunta: pregunta }, o || {})); },
    aviso: function (texto, tipo) { return call('aviso', { texto: texto, tipo: tipo || 'ok' }); },
    irA: function (pagina) { return call('irA', { pagina: pagina }); }
  };
  function alto() { parent.postMessage({ gpt: 'alto', alto: document.documentElement.scrollHeight }, '*'); }
  window.addEventListener('load', function () {
    alto();
    if (window.ResizeObserver) new ResizeObserver(alto).observe(document.body);
  });
  window.addEventListener('error', function (e) { parent.postMessage({ gpt: 'error', texto: String(e.message || e) }, '*'); });
})();`;

/** Cuerpo del módulo sin <html>, <head> ni <body> sueltos (se aceptan documentos completos). */
export function cuerpoDelModulo(html) {
  let h = String(html ?? '');
  const cuerpo = h.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const estilos = [...h.matchAll(/<style[\s\S]*?<\/style>/gi)].map((x) => x[0]);
  if (cuerpo) {
    const dentro = cuerpo[1];
    const estilosFuera = estilos.filter((s) => !dentro.includes(s));
    return estilosFuera.join('\n') + '\n' + dentro;
  }
  return h.replace(/<!doctype[^>]*>/gi, '').replace(/<\/?(html|head|body)[^>]*>/gi, '');
}

/** Documento completo del iframe: CSP primero, puente después, módulo al final. */
export function documentoDelModulo(modulo) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">`
    + `<meta http-equiv="Content-Security-Policy" content="${CSP}">`
    + `<meta name="viewport" content="width=device-width, initial-scale=1">`
    + `<style>html,body{margin:0;padding:0}body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1f2937;background:#fff;padding:12px}</style>`
    + `<script>${SCRIPT_PUENTE}</script></head><body>${cuerpoDelModulo(modulo?.html)}</body></html>`;
}
