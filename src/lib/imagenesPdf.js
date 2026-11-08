// Recupera las fotos de una tarifa en PDF y las reparte entre los artículos por su código:
// la foto más cercana al código dentro de la página (la tarifa suele poner la foto junto al código).
const alfanum = (t) => String(t ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

const distanciaARect = (px, py, r) => {
  const dx = Math.max(r.x - px, 0, px - (r.x + r.w));
  const dy = Math.max(r.y - py, 0, py - (r.y + r.h));
  return Math.hypot(dx, dy);
};

/**
 * @param {{texto:string,x:number,y:number}[]} textos   trozos de texto de UNA página
 * @param {{x:number,y:number,w:number,h:number,id:any}[]} imagenes  recuadros de las fotos de esa página
 * @param {{id:any,codigo:string}[]} articulos
 * @returns {{articulo:any, imagen:any, distancia:number}[]} cada foto y cada artículo se usan una sola vez
 */
export function emparejar(textos, imagenes, articulos, maxDistancia = 170) {
  const anclas = [];
  for (const a of articulos) {
    const cod = alfanum(a.codigo);
    if (cod.length < 3) continue;
    // El código tiene que aparecer como texto propio o ser la parte principal de un trozo.
    const hits = textos.filter((t) => { const c = alfanum(t.texto); return c === cod || (c.includes(cod) && c.length <= cod.length * 3); });
    for (const h of hits) anclas.push({ articulo: a, x: h.x, y: h.y });
  }
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

/** Convierte lo que da pdf.js en un data URL JPEG reducido. */
async function aDataUrl(obj, reducir) {
  if (!obj) return null;
  const c = document.createElement('canvas');
  if (obj.bitmap) {
    // ImageBitmap o, en JPEG, VideoFrame (de ahí displayWidth).
    c.width = obj.bitmap.displayWidth || obj.bitmap.width || obj.width; c.height = obj.bitmap.displayHeight || obj.bitmap.height || obj.height;
    c.getContext('2d').drawImage(obj.bitmap, 0, 0, c.width, c.height);
  }
  else if (obj.data && obj.width && obj.height) {
    c.width = obj.width; c.height = obj.height;
    const out = new Uint8ClampedArray(obj.width * obj.height * 4);
    const px = obj.width * obj.height;
    if (obj.kind === 3 || obj.data.length === px * 4) out.set(obj.data.subarray(0, px * 4));
    else if (obj.kind === 2 || obj.data.length === px * 3) for (let i = 0, j = 0; i < px; i++) { out[j++] = obj.data[i * 3]; out[j++] = obj.data[i * 3 + 1]; out[j++] = obj.data[i * 3 + 2]; out[j++] = 255; }
    else if (obj.data.length === px) for (let i = 0, j = 0; i < px; i++) { out[j++] = obj.data[i]; out[j++] = obj.data[i]; out[j++] = obj.data[i]; out[j++] = 255; }
    else return null;
    c.getContext('2d').putImageData(new ImageData(out, obj.width, obj.height), 0, 0);
  } else return null;
  return reducir(c.toDataURL('image/png'));
}

/**
 * Extrae las fotos del PDF y las reparte por código.
 * @param {ArrayBuffer} buffer
 * @param {{id:any,codigo:string}[]} articulos
 * @returns {Promise<{id:any,dataUrl:string,pagina:number}[]>}
 */
export async function recuperarImagenesDePdf(buffer, articulos, reducir, avanzar = () => {}) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const worker = (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise;
  const { OPS } = pdfjs;
  const resultado = []; const hechos = new Set();
  for (let n = 1; n <= pdf.numPages; n++) {
    avanzar(n, pdf.numPages);
    const pendientes = articulos.filter((a) => !hechos.has(a.id));
    if (!pendientes.length) break;
    const pagina = await pdf.getPage(n);
    const vista = pagina.getViewport({ scale: 1 });
    const textos = (await pagina.getTextContent()).items.filter((i) => i.str?.trim()).map((i) => ({ texto: i.str, x: i.transform[4], y: i.transform[5] }));
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
    for (const par of emparejar(textos, cajas, pendientes)) {
      try {
        const c = par.imagen;
        const obj = c.inline || await new Promise((res) => { try { pagina.objs.get(c.nombre, res); } catch { res(null); } });
        const dataUrl = await aDataUrl(obj, reducir);
        if (dataUrl) { resultado.push({ id: par.articulo.id, dataUrl, pagina: n }); hechos.add(par.articulo.id); }
      } catch { /* esa foto no se pudo leer */ }
    }
  }
  return resultado;
}
