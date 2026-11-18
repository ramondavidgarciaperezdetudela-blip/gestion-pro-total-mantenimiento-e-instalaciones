// Lee un catálogo «de revista» en PDF (fotos + títulos + tablas con referencia y precio) y devuelve los
// artículos CON su foto, su descripción y su precio. Todo en el propio equipo: sin IA y sin internet.
//
// Pensado para PDF enormes (cientos de MB): el archivo se lee por trozos desde el disco, se analiza una
// página cada vez y de cada foto solo se guarda una miniatura.
import { articulosDePagina, cajaDeMatriz } from './catalogoRevista.js';
import { aMiniatura, modoPocaMemoria } from './imagenesPdf.js';
import { nombreBase } from './imagenesProducto.js';

const cederPantalla = () => new Promise((r) => setTimeout(r, 0));
const por = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];

async function abrir(archivo) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default;
  const poca = modoPocaMemoria();
  const url = URL.createObjectURL(archivo);
  const tarea = pdfjs.getDocument({ url, useSystemFonts: true, disableFontFace: true, isEvalSupported: false, rangeChunkSize: poca ? 131072 : 524288, disableAutoFetch: true, stopAtErrors: false });
  const pdf = await tarea.promise;
  return { pdfjs, pdf, poca, cerrar: async () => { try { await tarea.destroy(); } catch { /* nada */ } URL.revokeObjectURL(url); } };
}

/** Texto de la página con su posición; el girado (las pestañas laterales del catálogo) no es de ningún artículo. */
function trozosDeTexto(contenido) {
  return contenido.items.filter((i) => i.str && Math.abs(i.transform[1]) <= Math.abs(i.transform[0])).map((i) => ({ t: i.str, x: i.transform[4], y: i.transform[5], w: i.width }));
}

/** Fotos de una página (con su posición) a partir de la lista de operaciones de pdf.js. */
function fotosDePagina(OPS, ops) {
  let ctm = [1, 0, 0, 1, 0, 0]; const pila = []; const out = [];
  ops.fnArray.forEach((fn, i) => {
    const a = ops.argsArray[i];
    if (fn === OPS.save) pila.push(ctm.slice());
    else if (fn === OPS.restore) ctm = pila.pop() || ctm;
    else if (fn === OPS.transform) ctm = por(a, ctm);
    // Muchos PDF (InDesign, Canva, Illustrator) meten las fotos dentro de «formularios» con su propia matriz
    else if (OPS.paintFormXObjectBegin !== undefined && fn === OPS.paintFormXObjectBegin) { pila.push(ctm.slice()); if (Array.isArray(a?.[0])) ctm = por(a[0], ctm); }
    else if (OPS.paintFormXObjectEnd !== undefined && fn === OPS.paintFormXObjectEnd) ctm = pila.pop() || ctm;
    else if (fn === OPS.paintImageXObject || (OPS.paintImageXObjectRepeat !== undefined && fn === OPS.paintImageXObjectRepeat) || (OPS.paintJpegXObject !== undefined && fn === OPS.paintJpegXObject)) out.push({ id: a[0], ...cajaDeMatriz(ctm) });
  });
  return out;
}

/**
 * Mira solo las primeras páginas para saber si el PDF es de este tipo (fotos de producto con su tabla de
 * referencias y precios). Así las tarifas que son una tabla corriente siguen leyéndose como siempre.
 */
export async function pareceCatalogoRevista(archivo, { paginas = 60 } = {}) {
  const { pdfjs, pdf, cerrar } = await abrir(archivo);
  try {
    let arts = 0; let conFoto = 0;
    for (let n = 1; n <= Math.min(pdf.numPages, paginas); n++) {
      const pagina = await pdf.getPage(n);
      try {
        const trozos = trozosDeTexto(await pagina.getTextContent());
        const fotos = fotosDePagina(pdfjs.OPS, await pagina.getOperatorList());
        const r = articulosDePagina(trozos, fotos);
        arts += r.length; conFoto += r.filter((a) => a._foto).length;
      } finally { try { pagina.cleanup(); } catch { /* nada */ } }
      if (arts >= 30) break;
    }
    const libro = arts >= 8 && conFoto >= 3 && conFoto >= arts * 0.15;
    // folleto corto (pocas páginas) con alguna foto de producto: también cuenta
    const folleto = pdf.numPages <= 12 && arts >= 3 && conFoto >= 1;
    return { ok: libro || folleto, articulos: arts, conFoto };
  } finally { await cerrar(); }
}

/**
 * Mismo producto (título y descripción iguales) en varias medidas, aunque esté en otra página o en otro bloque:
 * todas las medidas usan la foto principal, la que más se repite (si empatan, la primera).
 * Devuelve cuántos artículos quedan con foto.
 */
export function compartirFotoPrincipal(items, grupoDe) {
  const grupos = new Map();
  for (const it of items) { const g = grupoDe.get(it); if (g) { if (!grupos.has(g)) grupos.set(g, []); grupos.get(g).push(it); } }
  for (const lista of grupos.values()) {
    if (lista.length < 2) continue;
    const cuenta = new Map();
    for (const it of lista) if (it.image_url) cuenta.set(it.image_url, (cuenta.get(it.image_url) || 0) + 1);
    if (!cuenta.size) continue;
    let mejor = ''; let n = 0;
    for (const [u, c] of cuenta) if (c > n) { mejor = u; n = c; }
    for (const it of lista) it.image_url = mejor;
  }
  return items.filter((i) => i.image_url).length;
}

/**
 * @param archivo PDF (File/Blob)
 * @param opc { onProgreso({pagina,total,articulos,fotos}), senal: AbortSignal, conFotos: true }
 * @returns {{ items, paginas, conFoto, avisos, cancelado }}  items con la forma de las tarifas (image_url = miniatura)
 */
export async function leerCatalogoRevista(archivo, { onProgreso = () => {}, senal, conFotos = true } = {}) {
  const { pdfjs, pdf, poca, cerrar } = await abrir(archivo);
  const lado = poca ? 360 : 480; const maxPixeles = poca ? 12e6 : 40e6;
  const items = []; const porCodigo = new Map(); const avisos = []; const grupoDe = new Map();
  let conFoto = 0; let cancelado = false; let fallosFoto = 0;
  try {
    for (let n = 1; n <= pdf.numPages; n++) {
      if (senal?.aborted) { cancelado = true; break; }
      let pagina;
      try {
        pagina = await pdf.getPage(n);
        const trozos = trozosDeTexto(await pagina.getTextContent());
        // Páginas sin ningún precio (con «€» o con decimales): ni se miran las fotos (es lo más lento)
        if (trozos.some((t) => /\d\s*€|\d[,.]\d{2}\b/.test(t.t))) {
          const fotos = fotosDePagina(pdfjs.OPS, await pagina.getOperatorList());
          const arts = articulosDePagina(trozos, fotos);
          const miniaturas = new Map();
          for (const a of arts) {
            let url = '';
            if (conFotos && a._foto) {
              if (!miniaturas.has(a._foto)) {
                try {
                  const obj = await new Promise((res) => {
                    const t = setTimeout(() => res(null), 4000);
                    try { const almacen = String(a._foto).startsWith('g_') ? pagina.commonObjs : pagina.objs; almacen.get(a._foto, (o) => { clearTimeout(t); res(o); }); } catch { clearTimeout(t); res(null); }
                  });
                  miniaturas.set(a._foto, aMiniatura(obj, lado, maxPixeles) || '');
                } catch { miniaturas.set(a._foto, ''); fallosFoto++; }
              }
              url = miniaturas.get(a._foto) || '';
            }
            const { _foto, _bloque, _grupo, ...item } = a; // eslint-disable-line no-unused-vars
            item.image_url = url;
            grupoDe.set(item, _grupo);
            const clave = item.product_code.toLowerCase();
            const previo = porCodigo.get(clave);
            if (previo) { // mismo código en otra página: se queda con el que trae foto
              if (!previo.image_url && item.image_url) previo.image_url = item.image_url;
              continue;
            }
            porCodigo.set(clave, item); items.push(item);
            if (url) conFoto++;
          }
        }
      } catch (e) {
        avisos.push(`Página ${n}: ${String(e?.message || e).slice(0, 120)}`);
      } finally { try { pagina?.cleanup(); } catch { /* nada */ } }
      if (n % 10 === 0 || n === pdf.numPages) onProgreso({ pagina: n, total: pdf.numPages, articulos: items.length, fotos: conFoto });
      if (n % (poca ? 5 : 25) === 0) { try { await pdf.cleanup(); } catch { /* nada */ } }
      await cederPantalla();
    }
  } finally { await cerrar(); }
  if (conFotos) conFoto = compartirFotoPrincipal(items, grupoDe);
  if (fallosFoto) avisos.push(`${fallosFoto} fotos no se pudieron leer (se quedan sin foto).`);
  return { items, paginas: pdf.numPages, conFoto, avisos, cancelado };
}


const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Para tarifas y folletos que se leyeron como TABLA (sin fotos): busca cada artículo en su página y le pone la
 * foto más cercana de esa página (la imagen que lleva la página/el bloque). Los logos que se repiten en
 * todas las páginas y los fondos a página completa se ignoran. Las medidas del mismo producto comparten foto.
 * Devuelve cuántos artículos recibieron foto.
 */
export async function fotosParaItems(archivo, items, { onProgreso = () => {}, senal } = {}) {
  const pendientes = items.filter((i) => !i.image_url);
  if (!pendientes.length) return 0;
  const porCodigo = new Map(); const porNombre = [];
  for (const it of pendientes) {
    const c = String(it.product_code || '').trim().toLowerCase();
    if (c.length >= 3) { if (!porCodigo.has(c)) porCodigo.set(c, []); porCodigo.get(c).push(it); } else if (norm(it.product_name).length >= 8) porNombre.push({ it, k: norm(it.product_name).slice(0, 22) });
  }
  const { pdfjs, pdf, poca, cerrar } = await abrir(archivo);
  const lado = poca ? 360 : 480; const maxPixeles = poca ? 6e6 : 16e6;
  const colocado = new Set(); let puestas = 0; const grupoDe = new Map();
  try {
    // 1) logos/adornos: pdf.js llama «g_…» a las imágenes que se usan en más de una página (el logo, un sello…)
    const repetida = (f) => String(f.id).startsWith('g_');
    // 2) cada página
    for (let n = 1; n <= pdf.numPages; n++) {
      if (senal?.aborted) break;
      await new Promise((r) => setTimeout(r, 0)); // cede el hilo: la pantalla sigue respondiendo mientras se leen las páginas
      let pagina;
      try {
        pagina = await pdf.getPage(n);
        const trozos = trozosDeTexto(await pagina.getTextContent());
        const hallados = [];
        const vistos = new Set();
        for (const t of trozos) {
          for (const tok of (t.t.match(/[A-Za-z0-9][\w.\-/]{2,}/g) || [])) {
            for (const it of porCodigo.get(tok.toLowerCase()) || []) if (!colocado.has(it) && !vistos.has(it)) { vistos.add(it); hallados.push({ it, x: t.x, y: t.y }); }
          }
          if (porNombre.length) { const nt = norm(t.t); for (const o of porNombre) if (!colocado.has(o.it) && !vistos.has(o.it) && nt.includes(o.k)) { vistos.add(o.it); hallados.push({ it: o.it, x: t.x, y: t.y }); } }
        }
        if (hallados.length) {
          const [, , pw, ph] = pagina.view || [0, 0, 600, 800];
          const fotos = fotosDePagina(pdfjs.OPS, await pagina.getOperatorList())
            .filter((f) => Math.max(f.w, f.h) >= 28 && Math.min(f.w, f.h) >= 18 && f.w * f.h >= 800 && f.w * f.h < pw * ph * 0.6 && !repetida(f));
          if (fotos.length) {
            const mini = new Map();
            for (const h of hallados) {
              let mejor = null; let dMejor = Infinity;
              for (const f of fotos) {
                const dx = Math.max(f.x - h.x, 0, h.x - (f.x + f.w)); const dy = Math.max(f.y - h.y, 0, h.y - (f.y + f.h));
                const d = Math.hypot(dx, dy) - Math.sqrt(f.w * f.h) * 0.05; // a igual distancia, la más grande
                if (d < dMejor) { dMejor = d; mejor = f; }
              }
              if (!mejor) continue;
              if (!mini.has(mejor.id)) {
                let url = '';
                try {
                  const obj = await new Promise((res) => {
                    const t = setTimeout(() => res(null), 4000);
                    try { const almacen = String(mejor.id).startsWith('g_') ? pagina.commonObjs : pagina.objs; almacen.get(mejor.id, (o) => { clearTimeout(t); res(o); }); } catch { clearTimeout(t); res(null); }
                  });
                  url = aMiniatura(obj, lado, maxPixeles) || '';
                } catch { url = ''; }
                mini.set(mejor.id, url);
              }
              const url = mini.get(mejor.id);
              if (url) { h.it.image_url = url; colocado.add(h.it); puestas++; }
            }
          }
        }
      } catch { /* esa página se queda sin fotos */ } finally { try { pagina?.cleanup(); } catch { /* nada */ } }
      if (n % 5 === 0 || n === pdf.numPages) onProgreso({ pagina: n, total: pdf.numPages, articulos: items.length, fotos: puestas });
      if (n % (poca ? 5 : 25) === 0) { try { await pdf.cleanup(); } catch { /* nada */ } }
      await cederPantalla();
    }
  } finally { await cerrar(); }
  // mismas medidas del mismo producto = foto principal
  for (const it of items) { const b = nombreBase(it.product_name); if (b) grupoDe.set(it, norm(b)); }
  const antes = items.filter((i) => i.image_url).length;
  const tras = compartirFotoPrincipal(items, grupoDe);
  return puestas + Math.max(0, tras - antes - 0);
}


/**
 * «Fotos desde PDF»: recupera las fotos de la tarifa/catálogo para los artículos que ya están guardados (por código).
 * Mismo resultado que recuperarImagenesDePdf, pero entiende catálogos de revista (foto + tabla), fotos dentro de
 * «formularios» y tarifas con una foto por bloque o por página. Las medidas del mismo producto comparten la foto.
 * @param {{id:any,codigo:string,nombre?:string}[]} articulos
 */
export async function recuperarFotosPorCodigo(archivo, articulos, { onProgreso = () => {}, onFoto, senal } = {}) {
  const resultado = { encontradas: [], fallos: [], paginas: 0, cancelado: false };
  const pendientes = new Map();
  const porCodigo = new Map();
  for (const a of articulos) {
    const c = String(a.codigo || '').trim().toLowerCase();
    if (c.length < 3) continue;
    pendientes.set(a.id, a);
    if (!porCodigo.has(c)) porCodigo.set(c, []); porCodigo.get(c).push(a);
  }
  if (!pendientes.size) return resultado;
  const { pdfjs, pdf, poca, cerrar } = await abrir(archivo);
  resultado.paginas = pdf.numPages;
  const lado = poca ? 360 : 480; const maxPixeles = poca ? 8e6 : 24e6;
  const fotoDe = new Map(); // id del artículo → dataUrl (para repartirla luego a sus otras medidas)
  const dar = async (art, dataUrl, n) => {
    if (!pendientes.has(art.id)) return;
    try { await onFoto({ id: art.id, dataUrl, pagina: n }); resultado.encontradas.push(art.id); fotoDe.set(art.id, dataUrl); }
    catch (e) { resultado.fallos.push({ id: art.id, motivo: String(e?.message || e), pagina: n }); }
    pendientes.delete(art.id);
  };
  try {
    for (let n = 1; n <= pdf.numPages; n++) {
      if (senal?.aborted) { resultado.cancelado = true; break; }
      onProgreso({ pagina: n, total: pdf.numPages, encontradas: resultado.encontradas.length });
      await new Promise((r) => setTimeout(r, 0)); // cede el hilo: la pantalla sigue respondiendo mientras se leen las páginas
      if (!pendientes.size) break;
      let pagina;
      try {
        pagina = await pdf.getPage(n);
        const trozos = trozosDeTexto(await pagina.getTextContent());
        const hallados = []; const vistos = new Set();
        for (const t of trozos) for (const tok of (t.t.match(/[A-Za-z0-9][\w.\-/]{2,}/g) || [])) {
          for (const a of porCodigo.get(tok.toLowerCase()) || []) if (pendientes.has(a.id) && !vistos.has(a.id)) { vistos.add(a.id); hallados.push({ a, x: t.x, y: t.y, cod: tok.toLowerCase() }); }
        }
        if (!hallados.length) continue; // sin códigos nuestros en la página: ni se miran las fotos
        const [, , pw, ph] = pagina.view || [0, 0, 600, 800];
        const fotos = fotosDePagina(pdfjs.OPS, await pagina.getOperatorList())
          .filter((f) => Math.max(f.w, f.h) >= 50 && Math.min(f.w, f.h) >= 18 && f.w * f.h >= 1500 && f.w * f.h < pw * ph * 0.6);
        if (!fotos.length) continue;
        // 1.º la lectura de catálogo (la foto del bloque de cada referencia); 2.º la foto más cercana
        const delBloque = new Map();
        try { for (const r of articulosDePagina(trozos, fotos)) if (r._foto) delBloque.set(String(r.product_code).toLowerCase(), r._foto); } catch { /* sigue con la cercanía */ }
        const mini = new Map();
        const miniatura = async (id) => {
          if (mini.has(id)) return mini.get(id);
          let url = '';
          try {
            const obj = await new Promise((res) => {
              const t = setTimeout(() => res(null), 4000);
              try { const almacen = String(id).startsWith('g_') ? pagina.commonObjs : pagina.objs; almacen.get(id, (o) => { clearTimeout(t); res(o); }); } catch { clearTimeout(t); res(null); }
            });
            url = aMiniatura(obj, lado, maxPixeles) || '';
          } catch { url = ''; }
          mini.set(id, url); return url;
        };
        for (const h of hallados) {
          let id = delBloque.get(h.cod);
          if (!id) {
            let d0 = Infinity;
            for (const f of fotos) {
              const dx = Math.max(f.x - h.x, 0, h.x - (f.x + f.w)); const dy = Math.max(f.y - h.y, 0, h.y - (f.y + f.h));
              const d = Math.hypot(dx, dy);
              if (d < d0) { d0 = d; id = f.id; }
            }
            if (d0 > 320) id = null; // demasiado lejos: probablemente no es su foto
          }
          if (!id) continue;
          const url = await miniatura(id);
          if (url) await dar(h.a, url, n);
        }
      } catch (e) {
        resultado.fallos.push({ id: null, motivo: `Página ${n}: ${String(e?.message || e)}`, pagina: n });
      } finally { try { pagina?.cleanup(); } catch { /* nada */ } }
      if (n % (poca ? 5 : 25) === 0) { try { await pdf.cleanup(); } catch { /* nada */ } }
      await cederPantalla();
    }
    // Mismo producto en otra medida (mismo nombre sin la medida): comparte la foto principal
    if (!resultado.cancelado && pendientes.size) {
      const porNombre = new Map();
      for (const a of articulos) { const url = fotoDe.get(a.id); const b = nombreBase(a.nombre || '').toLowerCase(); if (url && b.length >= 6 && !porNombre.has(b)) porNombre.set(b, url); }
      for (const a of [...pendientes.values()]) {
        const url = porNombre.get(nombreBase(a.nombre || '').toLowerCase());
        if (url) await dar(a, url, 0);
      }
    }
    onProgreso({ pagina: pdf.numPages, total: pdf.numPages, encontradas: resultado.encontradas.length });
  } finally { await cerrar(); }
  return resultado;
}
