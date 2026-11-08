// Búsqueda de la imagen de un artículo de tarifa: primero por el CÓDIGO del proveedor
// y, si no sale, por el NOMBRE. Sin servicios de pago ni créditos:
//   · Escritorio y móvil: el propio aparato consulta buscadores de imágenes y descarga la foto
//     (no hay bloqueo CORS por el puente nativo).
//   · Navegador: opcionalmente Google Programmable Search (clave + cx propios).
// La foto se reduce y se guarda DENTRO del artículo (data URL), así se ve sin conexión.
// Sin internet no se busca: se devuelve el aviso y no se estropea nada.

const CLAVE_CACHE = 'gpt_img_cache';
const CLAVE_GOOGLE = 'gpt_img_google';
const norm = (t) => String(t ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const alfanum = (t) => norm(t).replace(/[^a-z0-9]/g, '');
const decodifica = (t) => String(t).replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

/** Candidatas de la página de resultados de imágenes de Bing. */
export function parsearBing(html) {
  const out = [];
  for (const m of String(html).matchAll(/\sm="(\{[^"]*murl[^"]*\})"/g)) {
    try {
      const o = JSON.parse(decodifica(m[1]));
      if (o.murl) out.push({ url: o.murl, miniatura: o.turl || '', titulo: o.t || '', pagina: o.purl || '' });
    } catch { /* entrada rara */ }
  }
  return out;
}

/** Candidatas del JSON de DuckDuckGo (i.js). */
export function parsearDuck(json) {
  let o = json;
  if (typeof json === 'string') { try { o = JSON.parse(json); } catch { return []; } }
  return (o?.results || []).filter((r) => r.image).map((r) => ({ url: r.image, miniatura: r.thumbnail || '', titulo: r.title || '', pagina: r.url || '' }));
}

/** Candidatas de Google Programmable Search (searchType=image). */
export function parsearGoogle(json) {
  return (json?.items || []).filter((r) => r.link).map((r) => ({ url: r.link, miniatura: r.image?.thumbnailLink || '', titulo: r.title || '', pagina: r.image?.contextLink || '' }));
}

/** Puntúa una candidata: el código manda; luego marca y palabras del nombre. */
export function puntuar(c, { codigo, nombre, marca }) {
  const huella = alfanum(`${c.titulo} ${c.pagina} ${c.url}`);
  let p = 0;
  const cod = alfanum(codigo);
  if (cod.length >= 3 && huella.includes(cod)) p += 100;
  const palabras = norm(nombre).split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  if (palabras.length) p += (palabras.filter((w) => huella.includes(w)).length / palabras.length) * 40;
  if (marca && huella.includes(alfanum(marca))) p += 15;
  if (/^https:/i.test(c.url)) p += 3;
  if (/\.(jpe?g|png|webp)(\?|$)/i.test(c.url)) p += 3;
  if (/logo|icon|sprite|avatar|banner/i.test(c.url + c.titulo)) p -= 30;
  return p;
}

export function ordenar(cands, datos) {
  return cands.map((c) => ({ ...c, puntos: puntuar(c, datos) })).sort((a, b) => b.puntos - a.puntos);
}

export const consultas = ({ codigo, nombre, marca, proveedor }) => {
  const q = [];
  if (String(codigo || '').trim()) q.push({ por: 'codigo', texto: `${String(codigo).trim()} ${marca || proveedor || ''}`.trim() });
  if (String(nombre || '').trim()) q.push({ por: 'nombre', texto: `${marca || ''} ${String(nombre).trim()}`.trim() });
  return q;
};

export function leerCache(almacen = globalThis.localStorage) { try { return JSON.parse(almacen.getItem(CLAVE_CACHE) || '{}'); } catch { return {}; } }
export function guardarCache(c, almacen = globalThis.localStorage) {
  const claves = Object.keys(c);
  if (claves.length > 400) for (const k of claves.slice(0, claves.length - 400)) delete c[k];
  try { almacen.setItem(CLAVE_CACHE, JSON.stringify(c)); } catch { /* sin sitio */ }
}
export const claveCache = ({ proveedor, codigo, nombre }) => alfanum(proveedor) + '|' + (alfanum(codigo) || alfanum(nombre));

export const ajustesGoogle = (almacen = globalThis.localStorage) => { try { return JSON.parse(almacen.getItem(CLAVE_GOOGLE) || '{}'); } catch { return {}; } };
export const guardarAjustesGoogle = (v, almacen = globalThis.localStorage) => { try { almacen.setItem(CLAVE_GOOGLE, JSON.stringify(v)); } catch { /* sin sitio */ } };

/** Reduce la foto a un JPEG pequeño dentro de un data URL (solo navegador). */
export function reducirImagen(dataUrl, lado = 420) {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, lado / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => res(null);
    img.src = dataUrl;
  });
}

/** Buscadores accesibles según dónde corre el programa. Cada uno devuelve candidatas. */
export function motoresPorDefecto({ puente, google }) {
  const motores = [];
  if (puente) {
    motores.push(async (q) => parsearBing(await puente.texto(`https://www.bing.com/images/search?q=${encodeURIComponent(q)}&form=HDRSC2&first=1&setlang=es`)));
    motores.push(async (q) => {
      const html = await puente.texto(`https://duckduckgo.com/?q=${encodeURIComponent(q)}&iax=images&ia=images`);
      const vqd = html.match(/vqd=["']?([\d-]+)/)?.[1];
      if (!vqd) return [];
      return parsearDuck(await puente.texto(`https://duckduckgo.com/i.js?l=es-es&o=json&q=${encodeURIComponent(q)}&vqd=${vqd}&f=,,,,,&p=1`));
    });
  }
  if (google?.clave && google?.cx) {
    motores.push(async (q) => {
      const r = await fetch(`https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(google.clave)}&cx=${encodeURIComponent(google.cx)}&searchType=image&num=10&q=${encodeURIComponent(q)}`);
      if (!r.ok) throw new Error(`Google respondió ${r.status}`);
      return parsearGoogle(await r.json());
    });
  }
  return motores;
}

/**
 * @param {{codigo?:string,nombre?:string,marca?:string,proveedor?:string}} datos
 * @param {object} d dependencias: motores[], descargar(url)->dataUrl, elegirConIA?(cands,datos)->índice, enLinea(), cache
 * @returns {Promise<{ok:boolean, url?:string, por?:string, motivo?:string, mensaje?:string, desdeCache?:boolean}>}
 */
export async function buscarImagenProducto(datos, d) {
  const qs = consultas(datos);
  if (!qs.length) return { ok: false, motivo: 'sin_datos', mensaje: 'El artículo no tiene código ni nombre.' };
  const cache = d.cache ?? leerCache(); const k = claveCache(datos);
  if (cache[k]?.url) return { ok: true, url: cache[k].url, por: cache[k].por, desdeCache: true };
  if (d.enLinea && !d.enLinea()) return { ok: false, motivo: 'sin_conexion', mensaje: 'Sin conexión: la búsqueda de imágenes necesita internet. Las ya encontradas se siguen viendo.' };
  if (!d.motores?.length) return { ok: false, motivo: 'sin_motor', mensaje: 'Este navegador no puede buscar imágenes por sí solo. Usa la aplicación de escritorio o el móvil, o pon tu clave de Google en Ajustes de IA.' };
  let hubo = false;
  for (const q of qs) {
    let cands = [];
    for (const m of d.motores) {
      try { cands = await m(q.texto); hubo = true; if (cands.length) break; } catch { /* siguiente buscador */ }
    }
    if (!cands.length) continue;
    let orden = ordenar(cands, datos).slice(0, 8);
    // Por código solo vale lo que de verdad lleva el código; por nombre, lo que se parezca.
    orden = q.por === 'codigo' ? orden.filter((c) => c.puntos >= 100) : orden.filter((c) => c.puntos >= 20);
    if (!orden.length) continue;
    if (q.por === 'nombre' && d.elegirConIA && orden.length > 1) {
      try { const i = await d.elegirConIA(orden, datos); if (Number.isInteger(i) && orden[i]) orden.unshift(...orden.splice(i, 1)); } catch { /* sigue el orden por puntos */ }
    }
    for (const c of orden.slice(0, 4)) {
      try {
        const url = await d.descargar(c.url, c.miniatura);
        if (url) { cache[k] = { url, por: q.por }; guardarCache(cache); return { ok: true, url, por: q.por }; }
      } catch { /* siguiente candidata */ }
    }
  }
  return { ok: false, motivo: hubo ? 'sin_resultado' : 'sin_motor_responde', mensaje: hubo ? 'No he encontrado una imagen fiable por código ni por nombre.' : 'Los buscadores no han respondido. Comprueba la conexión.' };
}
