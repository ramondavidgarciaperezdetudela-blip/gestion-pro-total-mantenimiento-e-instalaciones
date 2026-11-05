// Lee un PDF con texto (no escaneado) y reconstruye sus filas y columnas por la posición del texto.
// pdfjs se carga solo cuando se sube un PDF, para no pesar al abrir el programa.

import { detectarColumnas } from './importarPresupuesto.js';

export async function filasDePdf(buffer) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const worker = (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise;
  // Todas las páginas seguidas (la cabecera de la tabla suele estar solo en la primera)
  const trozos = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const pagina = await pdf.getPage(n);
    const contenido = await pagina.getTextContent();
    for (const i of contenido.items) trozos.push({ t: i.str, x: i.transform[4], y: i.transform[5] - (n - 1) * 100000, w: i.width });
  }
  return filasEnColumnas(trozos, detectarColumnas);
}

/** Agrupa trozos de texto en filas (misma altura) y los separa en celdas por los huecos. */
export function filasDeTrozos(trozos, opciones = {}) {
  return filasConPosicion(trozos, opciones).map((f) => f.map((c) => c.t));
}

function filasConPosicion(trozos, { tolY = 3, hueco = 6 } = {}) {
  const items = trozos.filter((i) => i.t && i.t.trim() !== '').sort((a, b) => b.y - a.y || a.x - b.x);
  const grupos = [];
  for (const it of items) {
    const g = grupos.find((x) => Math.abs(x.y - it.y) <= tolY);
    if (g) g.items.push(it); else grupos.push({ y: it.y, items: [it] });
  }
  return grupos.sort((a, b) => b.y - a.y).map((g) => {
    const orden = g.items.sort((a, b) => a.x - b.x);
    const celdas = []; let actual = null; let finX = -1e9;
    for (const it of orden) {
      if (actual !== null && it.x - finX <= hueco) {
        actual.t += (it.x - finX > 1 ? ' ' : '') + it.t; actual.x2 = it.x + (it.w || it.t.length * 4);
      } else {
        if (actual !== null) celdas.push(actual);
        actual = { t: it.t, x: it.x, x2: it.x + (it.w || it.t.length * 4) };
      }
      finX = it.x + (it.w || it.t.length * 4);
    }
    if (actual !== null) celdas.push(actual);
    return celdas.map((c) => ({ ...c, t: c.t.trim() }));
  });
}

/**
 * Filas de una página colocadas en columnas fijas: se toman como columnas las posiciones de la fila de
 * cabeceras y cada dato va a la columna cuyo borde (izquierdo, derecho o centro) queda más cerca.
 * Así una celda vacía no desplaza las siguientes.
 */
export function filasEnColumnas(trozos, detectar) {
  const filas = filasConPosicion(trozos);
  const texto = filas.map((f) => f.map((c) => c.t));
  const det = detectar ? detectar(texto) : null;
  if (!det || det.fila < 0) return texto;
  const cab = filas[det.fila];
  const anclas = cab.map((c) => ({ i: 0, izq: c.x, der: c.x2, cen: (c.x + c.x2) / 2 }));
  return filas.map((f, r) => {
    if (r <= det.fila) return r === det.fila ? cab.map((c) => c.t) : f.map((c) => c.t);
    const fila = Array(anclas.length).fill('');
    for (const c of f) {
      let mejor = 0; let dist = Infinity;
      anclas.forEach((a, k) => {
        const d = Math.min(Math.abs(c.x - a.izq), Math.abs(c.x2 - a.der), Math.abs((c.x + c.x2) / 2 - a.cen));
        if (d < dist) { dist = d; mejor = k; }
      });
      fila[mejor] = fila[mejor] ? `${fila[mejor]} ${c.t}` : c.t;
    }
    return fila;
  });
}
