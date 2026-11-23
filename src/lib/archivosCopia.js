// Archivos grandes dentro de la copia de seguridad.
//
// La copia sigue siendo un fichero .json que cualquier versión del programa sabe leer. Si hay archivos grandes (catálogos,
// PDF, Excel…), se añade AL FINAL una sección extra «__archivos_grandes» con cada archivo troceado en base64, una línea por
// trozo (≈4 MB). Así:
//   · una copia sin archivos grandes es idéntica a las de siempre;
//   · las copias antiguas se leen igual;
//   · al restaurar se lee el fichero por flujo, sin juntarlo entero en memoria, así que caben copias de varios GB.
//
// Formato de la sección (cada línea es corta, el fichero se puede leer línea a línea):
//   ,\n"__archivos_grandes":[\n
//   {"id":"…","nombre":"…","tipo":"…","bytes":N,"origen":"local|servidor","partes":[\n
//   "<base64>",\n            (una línea por trozo)
//   ""]}\n                   (cierre del archivo; el siguiente empieza con ",{")
//   ]
export const MARCA = ',\n"__archivos_grandes":[\n';
export const TROZO_BYTES = 3 * 1024 * 1024; // múltiplo de 3: cada trozo se codifica sin relleno
const CLAVE = '"__archivos_grandes":[';

function aBase64(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
}
function deBase64(b64) {
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

/** Lee un flujo (reader) y entrega trozos de exactamente `tam` bytes (el último puede ser menor). */
async function* retrozear(reader, tam = TROZO_BYTES) {
  let buf = new Uint8Array(tam); let n = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    let o = 0;
    while (o < value.length) {
      const k = Math.min(tam - n, value.length - o);
      buf.set(value.subarray(o, o + k), n); n += k; o += k;
      if (n === tam) { yield buf; buf = new Uint8Array(tam); n = 0; }
    }
  }
  if (n) yield buf.subarray(0, n);
}

/**
 * Escribe los archivos en la copia.
 * @param {(t:string)=>Promise<void>} escribir
 * @param {Array<{id:string,nombre:string,tipo?:string,origen:string,abrir:()=>Promise<{reader:any,bytes?:number}>}>} items
 * @returns {Promise<{n:number,bytes:number,fallos:Array<{id:string,nombre:string,motivo:string}>}>}
 */
export async function escribirArchivos(escribir, items, { alProgreso } = {}) {
  const fallos = []; let n = 0; let bytes = 0;
  // Se abren primero: un archivo que no se puede leer no deja la copia a medias.
  const listos = [];
  for (const it of items) {
    try { listos.push({ it, fuente: await it.abrir() }); } catch (e) { fallos.push({ id: it.id, nombre: it.nombre, motivo: e?.message || String(e) }); }
  }
  if (!listos.length) return { n: 0, bytes: 0, fallos };
  await escribir(MARCA);
  for (const { it, fuente } of listos) {
    alProgreso?.(`Guardando archivo ${n + 1}/${listos.length}: ${it.nombre}`, n, listos.length);
    await escribir(`${n ? ',' : ''}{"id":${JSON.stringify(it.id)},"nombre":${JSON.stringify(it.nombre || 'archivo')},"tipo":${JSON.stringify(it.tipo || '')},"bytes":${Number(fuente.bytes) || 0},"origen":${JSON.stringify(it.origen)},"partes":[\n`);
    for await (const trozo of retrozear(fuente.reader)) { await escribir(`"${aBase64(trozo)}",\n`); bytes += trozo.length; }
    await escribir('""]}\n');
    n++;
  }
  await escribir(']');
  return { n, bytes, fallos };
}

/** Direcciones de archivos del servidor propio que aparecen en un texto (para saber qué archivos acompañan a los datos). */
export function urlsEnTexto(texto, base, destino = new Set()) {
  if (!base || !texto) return destino;
  const pref = `${String(base).replace(/\/+$/, '')}/archivos/`;
  let i = 0;
  while ((i = texto.indexOf(pref, i)) >= 0) {
    let j = i + pref.length;
    while (j < texto.length && !/["\\\s<>]/.test(texto[j])) j++;
    destino.add(texto.slice(i, j));
    i = j;
  }
  return destino;
}

/**
 * Lee una copia desde un File/Blob SIN juntarla entera: devuelve el texto de los datos (para JSON.parse) y los archivos grandes
 * que llevara, cada uno como Blob. Vale para copias antiguas (no tienen la sección) y nuevas.
 * @returns {Promise<{texto:string, archivos:Array<{id,nombre,tipo,bytes,origen,blob:Blob}>}>}
 */
export async function leerCopiaDeFichero(file, { alProgreso, alArchivo } = {}) {
  // Copias normales (hasta ~120 MB): se lee de una vez, como siempre, que es lo que menos memoria gasta en una tablet.
  // Solo las muy grandes se leen por flujo.
  const POR_FLUJO = 120 * 1024 * 1024;
  async function* textos() {
    if (!file.stream || file.size <= POR_FLUJO) { yield await file.text(); alProgreso?.(100); return; }
    const dec = new TextDecoder('utf-8'); const reader = file.stream().getReader(); let leido = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) { const resto = dec.decode(); if (resto) yield resto; return; }
      leido += value.length; alProgreso?.(Math.min(99, Math.round((leido / file.size) * 100)));
      yield dec.decode(value, { stream: true });
    }
  }
  const prefijo = []; let cola = ''; let modoArchivos = false; let linea = '';
  const archivos = []; let actual = null;
  const cierraEntrada = async () => {
    if (!actual) return;
    const meta = { id: actual.id, nombre: actual.nombre, tipo: actual.tipo, bytes: actual.bytes, origen: actual.origen };
    const blob = new Blob(actual.partes, { type: actual.tipo || 'application/octet-stream' });
    actual = null;
    // Si quien llama lo guarda ya (en la tablet, directo al almacén), no se retiene en memoria.
    if (alArchivo && await alArchivo({ ...meta, blob })) archivos.push({ ...meta, guardado: true, blob: null });
    else archivos.push({ ...meta, blob });
  };
  const lineaArchivo = async (l) => {
    if (!l) return;
    if (l.startsWith('""]}')) { await cierraEntrada(); return; }
    if (l.startsWith('"') && actual) {
      const b64 = l.endsWith('",') ? l.slice(1, -2) : l.slice(1, -1);
      if (!b64) return;
      actual.partes.push(deBase64(b64));
      if (actual.partes.length >= 8) actual.partes = [new Blob(actual.partes)]; // que no se acumule en memoria
      return;
    }
    const t = l.startsWith(',{') ? l.slice(1) : l;
    if (t.startsWith('{"id"') && t.includes(',"partes":[')) {
      await cierraEntrada();
      try { actual = { ...JSON.parse(t.slice(0, t.lastIndexOf(',"partes":[')) + '}'), partes: [] }; } catch { actual = null; }
    }
  };
  for await (const txt of textos()) {
    if (!modoArchivos) {
      const busca = cola + txt;
      const i = busca.indexOf(MARCA);
      if (i >= 0) { prefijo.push(busca.slice(0, i)); cola = ''; modoArchivos = true; linea = busca.slice(i + MARCA.length); } else {
        const corte = Math.max(0, busca.length - MARCA.length);
        prefijo.push(corte === busca.length ? busca : busca.slice(0, corte)); cola = corte === busca.length ? '' : busca.slice(corte);
      }
    } else linea += txt;
    if (modoArchivos) {
      let k;
      while ((k = linea.indexOf('\n')) >= 0) { await lineaArchivo(linea.slice(0, k)); linea = linea.slice(k + 1); }
    }
  }
  if (cola) prefijo.push(cola);
  if (modoArchivos && linea.trim() && linea.trim() !== ']') await lineaArchivo(linea.trim());
  await cierraEntrada();
  let texto = prefijo.length === 1 ? prefijo[0] : prefijo.join('');
  prefijo.length = 0;
  if (modoArchivos) texto = `${texto.replace(/[\s,]+$/, '')}\n}\n`; // se cierra el objeto donde empezaban los archivos
  return { texto, archivos, marca: modoArchivos };
}

/** Cambia en los registros las direcciones antiguas de archivos por las nuevas. Devuelve cuántos registros tocó. */
export function remapearUrls(datos, mapa) {
  const viejas = Object.keys(mapa || {}); if (!viejas.length) return 0;
  let tocados = 0;
  for (const [ent, lista] of Object.entries(datos || {})) {
    if (!Array.isArray(lista)) continue;
    for (let i = 0; i < lista.length; i++) {
      let s; try { s = JSON.stringify(lista[i]); } catch { continue; }
      if (!viejas.some((v) => s.includes(v))) continue;
      for (const v of viejas) if (s.includes(v)) s = s.split(JSON.stringify(v).slice(1, -1)).join(JSON.stringify(mapa[v]).slice(1, -1));
      lista[i] = JSON.parse(s); tocados++;
    }
    datos[ent] = lista;
  }
  return tocados;
}
