/**
 * documentacionTecnica.js — Guardar la documentación del fabricante en
 * Manuales, ordenada por marca.
 *
 * QUÉ HACE: se le da la dirección de un PDF del fabricante y lo descarga, lo
 * comprueba y lo archiva en la biblioteca de Manuales bajo la carpeta de su
 * marca, para tenerlo a mano el día que haga falta —normalmente delante de la
 * máquina y sin cobertura.
 *
 * QUÉ NO HACE, Y CONVIENE SABERLO: no rastrea internet buscando el manual de
 * un modelo. Para eso haría falta un buscador, y ninguno deja usarse así desde
 * un programa. Lo que sí hay es un atajo a la página oficial de documentación
 * de cada marca, para llegar en un toque y traerse el enlace.
 *
 * DÓNDE FUNCIONA: en el programa del ordenador y en la aplicación del móvil.
 * En el navegador normal NO, y no es un fallo: el navegador prohíbe a una
 * página descargar ficheros de otro sitio, y ningún fabricante hace la
 * excepción. Se dice en pantalla en vez de fallar sin explicar.
 */

/** Páginas oficiales de documentación, para llegar en un toque. */
export const PORTALES = [
  { marca: 'Tecumseh', url: 'https://www.tecumseh.com/products' },
  { marca: 'Danfoss', url: 'https://www.danfoss.com/es-es/service-and-support/downloads/' },
  { marca: 'Secop', url: 'https://www.secop.com/products/' },
  { marca: 'Copeland', url: 'https://www.copeland.com/en-us/tools-resources/product-literature' },
  { marca: 'Bitzer', url: 'https://www.bitzer.de/es/es/servicio/software-y-descargas/' },
  { marca: 'Daikin', url: 'https://www.daikin.es/es_es/pro/descargas.html' },
  { marca: 'Mitsubishi Electric', url: 'https://www.mitsubishielectric.es/aire-acondicionado/descargas/' },
  { marca: 'Carrier', url: 'https://www.carrier.com/commercial/es/es/literatura/' },
  { marca: 'Intarcon', url: 'https://www.intarcon.com/descargas/' },
  { marca: 'Emerson', url: 'https://climate.emerson.com/es-es/tools-resources' },
];

export function portalDeLaMarca(marca) {
  const m = String(marca || '').toLowerCase();
  if (!m) return null;
  return PORTALES.find((p) => m.includes(p.marca.toLowerCase().split(' ')[0])) || null;
}

/** ¿Se puede descargar documentación desde este aparato? */
export function sePuedeDescargar() {
  if (typeof window === 'undefined') return false;
  if (window.gptDocs?.disponible) return true;          // programa del ordenador
  try {
    return window.Capacitor?.isNativePlatform?.() === true;  // aplicación del móvil
  } catch {
    return false;
  }
}

export function porQueNoSePuede() {
  return 'Para descargar del fabricante hace falta el programa instalado en el ordenador o la aplicación del móvil. '
    + 'Desde el navegador no se puede: el navegador prohíbe a una página bajarse ficheros de otro sitio. '
    + 'Puedes descargar el PDF tú y subirlo con el botón de siempre.';
}

/** Un nombre de fichero decente a partir de la dirección. */
export function nombreDesdeUrl(url, porDefecto = 'documento.pdf') {
  try {
    const u = new URL(url);
    const ultimo = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || '');
    if (ultimo && /\.pdf$/i.test(ultimo)) return ultimo;
    if (ultimo) return `${ultimo}.pdf`;
  } catch { /* dirección rara */ }
  return porDefecto;
}

/**
 * Descarga el documento. Devuelve {ok, base64, bytes} o {ok:false, error}.
 *
 * En el móvil se pide de forma nativa, que es la única que llega; en el
 * ordenador, por el puente del programa.
 */
export async function descargarDocumento(url) {
  if (window.gptDocs?.disponible) {
    return window.gptDocs.descargar(url);
  }
  try {
    const { CapacitorHttp } = await import('@capacitor/core');
    const r = await CapacitorHttp.request({
      url, method: 'GET', responseType: 'blob', connectTimeout: 20000, readTimeout: 120000,
    });
    if (r.status < 200 || r.status >= 300) {
      return { ok: false, status: r.status, error: `El fabricante ha respondido ${r.status}.` };
    }
    const base64 = typeof r.data === 'string' ? r.data : '';
    if (!base64) return { ok: false, error: 'No ha llegado el documento.' };
    // La firma de un PDF en base64 empieza siempre por "JVBERi0" (%PDF-).
    if (!base64.startsWith('JVBERi0')) {
      return { ok: false, error: 'Eso no es un PDF. Puede que el enlace lleve a una página, no al documento.' };
    }
    return { ok: true, tipo: 'application/pdf', bytes: Math.floor(base64.length * 0.75), base64 };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

/** Los bytes descargados, convertidos en fichero para poder guardarlo. */
export function comoFichero(base64, nombre, tipo = 'application/pdf') {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return new File([bytes], nombre, { type: tipo });
}

// ── La biblioteca por marcas ────────────────────────────────────────────────

/** Lo que va guardado en cada manual además del fichero. */
export function detallesDelManual(doc) {
  try { return JSON.parse(doc?.description || '{}'); } catch { return {}; }
}

/** Marca con la que se archiva. Sin marca, a "Sin marca". */
export function marcaDelManual(doc) {
  const d = detallesDelManual(doc);
  return (d.brand || doc?.contact_name || '').trim() || 'Sin marca';
}

/**
 * Agrupa los manuales por marca, como carpetas.
 *
 * Se compara sin distinguir mayúsculas ni tildes: "danfoss", "Danfoss" y
 * "DANFOSS" tienen que ser la misma carpeta, o acaban tres carpetas con lo
 * mismo dentro y no se encuentra nada.
 */
export function porMarcas(manuales) {
  const carpetas = new Map();
  for (const m of manuales || []) {
    const marca = marcaDelManual(m);
    const clave = marca.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    if (!carpetas.has(clave)) carpetas.set(clave, { marca, documentos: [] });
    carpetas.get(clave).documentos.push(m);
  }
  return [...carpetas.values()]
    .sort((a, b) => {
      // "Sin marca" siempre al final: es el cajón de sastre, no una marca.
      if (a.marca === 'Sin marca') return 1;
      if (b.marca === 'Sin marca') return -1;
      return a.marca.localeCompare(b.marca, 'es');
    });
}
