// Lee un catálogo «de revista» en PDF (fotos + títulos + tablas con referencia y precio) y devuelve los
// artículos CON su foto, su descripción y su precio. Todo en el propio equipo: sin IA y sin internet.
//
// Pensado para PDF enormes (cientos de MB): el archivo se lee por trozos desde el disco, se analiza una
// página cada vez y de cada foto solo se guarda una miniatura.
import { articulosDePagina, cajaDeMatriz } from './catalogoRevista.js';
import { aMiniatura, modoPocaMemoria } from './imagenesPdf.js';

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
    else if (fn === OPS.paintImageXObject) out.push({ id: a[0], ...cajaDeMatriz(ctm) });
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
    return { ok: arts >= 8 && conFoto >= 3 && conFoto >= arts * 0.15, articulos: arts, conFoto };
  } finally { await cerrar(); }
}

/**
 * @param archivo PDF (File/Blob)
 * @param opc { onProgreso({pagina,total,articulos,fotos}), senal: AbortSignal, conFotos: true }
 * @returns {{ items, paginas, conFoto, avisos, cancelado }}  items con la forma de las tarifas (image_url = miniatura)
 */
export async function leerCatalogoRevista(archivo, { onProgreso = () => {}, senal, conFotos = true } = {}) {
  const { pdfjs, pdf, poca, cerrar } = await abrir(archivo);
  const lado = poca ? 220 : 260; const maxPixeles = poca ? 12e6 : 40e6;
  const items = []; const porCodigo = new Map(); const avisos = [];
  let conFoto = 0; let cancelado = false; let fallosFoto = 0;
  try {
    for (let n = 1; n <= pdf.numPages; n++) {
      if (senal?.aborted) { cancelado = true; break; }
      let pagina;
      try {
        pagina = await pdf.getPage(n);
        const trozos = trozosDeTexto(await pagina.getTextContent());
        // Páginas sin ningún precio con «€»: ni se miran las fotos (es lo más lento)
        if (trozos.some((t) => /\d\s*€/.test(t.t))) {
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
            const { _foto, _bloque, ...item } = a; // eslint-disable-line no-unused-vars
            item.image_url = url;
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
  if (fallosFoto) avisos.push(`${fallosFoto} fotos no se pudieron leer (se quedan sin foto).`);
  return { items, paginas: pdf.numPages, conFoto, avisos, cancelado };
}
