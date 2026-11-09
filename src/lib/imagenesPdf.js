// Recupera las fotos de una tarifa en PDF y las reparte entre los artículos por su código:
// la foto más cercana al código dentro de la página (la tarifa suele poner la foto junto al código).
//
// Pensado para equipos justos de memoria y PDF grandes:
//  · el PDF se lee por trozos desde el propio archivo (sin copiarlo entero a memoria);
//  · de cada página se mira primero solo el TEXTO y solo se analizan las imágenes de las
//    páginas donde aparece algún código pendiente;
//  · cada foto se reduce directamente a miniatura y se guarda al momento (nada se acumula);
//  · se libera la memoria de cada página al terminarla y se cede el control a la pantalla.
const alfanum = (t) => String(t ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

const distanciaARect = (px, py, r) => {
  const dx = Math.max(r.x - px, 0, px - (r.x + r.w));
  const dy = Math.max(r.y - py, 0, py - (r.y + r.h));
  return Math.hypot(dx, dy);
};

/** Índice código → artículos, para buscar sin recorrer todos los artículos en cada trozo de texto. */
export function indexarCodigos(articulos) {
  const m = new Map();
  for (const a of articulos) {
    const c = alfanum(a.codigo);
    if (c.length < 3) continue;
    if (!m.has(c)) m.set(c, []);
    m.get(c).push(a);
  }
  return m;
}

/** Códigos de artículo que aparecen en un trozo de texto: entero, por palabras o por grupos de 2‒3 palabras. */
export function codigosEnTexto(texto, indice) {
  const out = [];
  const entero = alfanum(texto);
  if (indice.has(entero)) out.push(entero);
  const palabras = String(texto).split(/\s+/).filter(Boolean);
  for (let i = 0; i < palabras.length; i++) {
    let junto = '';
    for (let n = 0; n < 3 && i + n < palabras.length; n++) {
      junto += alfanum(palabras[i + n]);
      if (junto.length > 40) break;
      if (indice.has(junto) && !out.includes(junto)) out.push(junto);
    }
  }
  return out;
}

/**
 * @param {{texto:string,x:number,y:number}[]} textos   trozos de texto de UNA página
 * @param {{x:number,y:number,w:number,h:number,id:any}[]} imagenes  recuadros de las fotos de esa página
 * @param {{id:any,codigo:string}[]} articulos
 * @returns {{articulo:any, imagen:any, distancia:number}[]} cada foto y cada artículo se usan una sola vez
 */
export function emparejar(textos, imagenes, articulos, maxDistancia = 170, indice = indexarCodigos(articulos)) {
  const anclas = [];
  for (const t of textos) for (const c of codigosEnTexto(t.texto, indice)) for (const a of indice.get(c)) anclas.push({ articulo: a, x: t.x, y: t.y });
  const pares = [];
  for (const an of anclas) for (const im of imagenes) pares.push({ articulo: an.articulo, imagen: im, distancia: distanciaARect(an.x, an.y, im) });
  pares.sort((p, q) => p.distancia - q.distancia);
  const usadosA = new Set(); const usadasI = new Set(); const out = [];
  for (const p of pares) {
    if (p.distancia > maxDistancia || usadosA.has(p.articulo.id) || usadasI.has(p.imagen.id)) continue;
    usadosA.add(p.articulo.id); usadasI.add(p.imagen.id); out.push(p);
  }
  return out;
}

const por = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];

/** Foto de pdf.js → miniatura JPEG, sin pasar por una copia a tamaño completo siempre que se pueda. */
function aMiniatura(obj, lado, maxPixeles) {
  if (!obj) return null;
  const ancho = obj.bitmap ? (obj.bitmap.displayWidth || obj.bitmap.width || obj.width) : obj.width;
  const alto = obj.bitmap ? (obj.bitmap.displayHeight || obj.bitmap.height || obj.height) : obj.height;
  if (!ancho || !alto) return null;
  if (ancho * alto > maxPixeles) throw new Error('La foto es demasiado grande para la memoria de este equipo');
  const k = Math.min(1, lado / Math.max(ancho, alto));
  const pequeno = document.createElement('canvas');
  pequeno.width = Math.max(1, Math.round(ancho * k)); pequeno.height = Math.max(1, Math.round(alto * k));
  const g = pequeno.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, pequeno.width, pequeno.height);
  if (obj.bitmap) g.drawImage(obj.bitmap, 0, 0, pequeno.width, pequeno.height);
  else if (obj.data) {
    const px = ancho * alto; const d = obj.data;
    const completo = document.createElement('canvas'); completo.width = ancho; completo.height = alto;
    const salida = new Uint8ClampedArray(px * 4);
    if (obj.kind === 3 || d.length === px * 4) salida.set(d.subarray(0, px * 4));
    else if (obj.kind === 2 || d.length === px * 3) for (let i = 0, j = 0; i < px; i++) { salida[j++] = d[i * 3]; salida[j++] = d[i * 3 + 1]; salida[j++] = d[i * 3 + 2]; salida[j++] = 255; }
    else if (d.length === px) for (let i = 0, j = 0; i < px; i++) { salida[j++] = d[i]; salida[j++] = d[i]; salida[j++] = d[i]; salida[j++] = 255; }
    else throw new Error('Formato de foto no reconocido');
    completo.getContext('2d').putImageData(new ImageData(salida, ancho, alto), 0, 0);
    g.drawImage(completo, 0, 0, pequeno.width, pequeno.height);
    completo.width = 0; // suelta la memoria cuanto antes
  } else return null;
  const url = pequeno.toDataURL('image/jpeg', 0.8);
  pequeno.width = 0;
  return url;
}

const cederPantalla = () => new Promise((r) => setTimeout(r, 0));

/** Equipos con poca RAM (≤ 4 GB): fotos grandes se descartan antes y se libera memoria más a menudo. */
export const modoPocaMemoria = () => typeof navigator !== 'undefined' && navigator.deviceMemory !== undefined && navigator.deviceMemory <= 4;

/**
 * @param {File|Blob} archivo  el PDF
 * @param {{id:any,codigo:string}[]} articulos  los que aún no tienen foto
 * @param {{onProgreso?:(p:{pagina:number,total:number,encontradas:number})=>void,
 *          onFoto:(f:{id:any,dataUrl:string,pagina:number})=>Promise<void>, senal?:AbortSignal}} opc
 * @returns {Promise<{encontradas:any[], fallos:{id:any,motivo:string,pagina:number}[], paginas:number, cancelado:boolean}>}
 */
export async function recuperarImagenesDePdf(archivo, articulos, { onProgreso = () => {}, onFoto, senal } = {}) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default;
  const poca = modoPocaMemoria();
  const lado = poca ? 320 : 420;
  const maxPixeles = poca ? 12e6 : 40e6;
  const url = URL.createObjectURL(archivo);
  const tarea = pdfjs.getDocument({ url, useSystemFonts: true, disableFontFace: true, isEvalSupported: false, rangeChunkSize: poca ? 131072 : 524288, disableAutoFetch: true, stopAtErrors: false });
  const resultado = { encontradas: [], fallos: [], paginas: 0, cancelado: false };
  try {
    const pdf = await tarea.promise;
    resultado.paginas = pdf.numPages;
    const { OPS } = pdfjs;
    let pendientes = new Map(articulos.map((a) => [a.id, a]));
    let indice = indexarCodigos(articulos);
    for (let n = 1; n <= pdf.numPages; n++) {
      if (senal?.aborted) { resultado.cancelado = true; break; }
      onProgreso({ pagina: n, total: pdf.numPages, encontradas: resultado.encontradas.length });
      if (!pendientes.size) { onProgreso({ pagina: pdf.numPages, total: pdf.numPages, encontradas: resultado.encontradas.length }); break; }
      let pagina;
      try {
        pagina = await pdf.getPage(n);
        const vista = pagina.getViewport({ scale: 1 });
        const textos = (await pagina.getTextContent()).items.filter((i) => i.str?.trim()).map((i) => ({ texto: i.str, x: i.transform[4], y: i.transform[5] }));
        // Sin ningún código pendiente en el texto no hace falta mirar las imágenes de la página (lo más lento).
        if (!textos.some((t) => codigosEnTexto(t.texto, indice).length)) continue;
        const ops = await pagina.getOperatorList();
        let ctm = [1, 0, 0, 1, 0, 0]; const pila = []; const cajas = [];
        ops.fnArray.forEach((fn, i) => {
          const a = ops.argsArray[i];
          if (fn === OPS.save) pila.push(ctm.slice());
          else if (fn === OPS.restore) ctm = pila.pop() || ctm;
          else if (fn === OPS.transform) ctm = por(a, ctm);
          else if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject) {
            const w = Math.hypot(ctm[0], ctm[1]); const h = Math.hypot(ctm[2], ctm[3]);
            const x = Math.min(ctm[4], ctm[4] + ctm[0] + ctm[2]); const y = Math.min(ctm[5], ctm[5] + ctm[1] + ctm[3]);
            // Fuera fotos diminutas (viñetas, iconos) y fondos que ocupan casi toda la página.
            if (w < 25 || h < 25 || (w * h) / (vista.width * vista.height) > 0.7) return;
            cajas.push({ id: `${n}-${i}`, x, y, w, h, nombre: fn === OPS.paintImageXObject ? a[0] : null, inline: fn === OPS.paintInlineImageXObject ? a[0] : null });
          }
        });
        if (!cajas.length) continue;
        const pares = emparejar(textos, cajas, [...pendientes.values()], 170, indice);
        for (const par of pares) {
          if (senal?.aborted) break;
          try {
            const c = par.imagen;
            const obj = c.inline || await new Promise((res) => { try { pagina.objs.get(c.nombre, res); } catch { res(null); } });
            const dataUrl = aMiniatura(obj, lado, maxPixeles);
            if (!dataUrl) throw new Error('No se pudo leer la foto');
            await onFoto({ id: par.articulo.id, dataUrl, pagina: n });
            resultado.encontradas.push(par.articulo.id); pendientes.delete(par.articulo.id);
          } catch (e) {
            resultado.fallos.push({ id: par.articulo.id, motivo: String(e?.message || e), pagina: n });
            pendientes.delete(par.articulo.id); // ya está anotado como fallo; no se repite en otras páginas
          }
          onProgreso({ pagina: n, total: pdf.numPages, encontradas: resultado.encontradas.length });
        }
        indice = indexarCodigos([...pendientes.values()]);
      } catch (e) {
        resultado.fallos.push({ id: null, motivo: `Página ${n}: ${String(e?.message || e)}`, pagina: n });
      } finally {
        try { pagina?.cleanup(); } catch { /* nada */ }
      }
      if (n % (poca ? 5 : 20) === 0) { try { await pdf.cleanup(); } catch { /* nada */ } }
      await cederPantalla(); // la pantalla (barra de progreso) sigue viva
    }
    onProgreso({ pagina: pdf.numPages, total: pdf.numPages, encontradas: resultado.encontradas.length });
  } finally {
    try { await tarea.destroy(); } catch { /* nada */ }
    URL.revokeObjectURL(url);
  }
  return resultado;
}
