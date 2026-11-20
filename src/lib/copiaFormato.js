// Lectura tolerante de copias de seguridad: valen las de cualquier versión.
//
// Una copia solo es «del programa» si trae secciones con registros; la
// versión, el nombre de la app o campos que hoy no existen NO cuentan.

const ENVOLTORIOS = ['data', 'datos', 'entities', 'entidades', 'tablas', 'backup'];

/** Quita BOM y espacios; devuelve el texto listo para JSON.parse. */
export function limpiarTexto(t) {
  return String(t ?? '').replace(/^﻿/, '').trim();
}

const esLista = (v) => Array.isArray(v) || (v && typeof v === 'object' && Array.isArray(v.items || v.records || v.registros));
const comoLista = (v) => (Array.isArray(v) ? v : (v.items || v.records || v.registros));

/**
 * Devuelve { datos, cabecera, secciones } con cada sección como array de
 * objetos. Acepta secciones en la raíz o dentro de un envoltorio (data,
 * entities…), y nombres con otra capitalización.
 */
export function normalizarCopia(parsed, conocidas = []) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { datos: {}, cabecera: {}, secciones: [] };
  const porMinuscula = new Map(conocidas.map((c) => [c.toLowerCase(), c]));
  const datos = {}; const cabecera = {};
  const volcar = (obj) => {
    for (const [k, v] of Object.entries(obj)) {
      if (esLista(v)) {
        const lista = comoLista(v).filter((r) => r && typeof r === 'object');
        const nombre = porMinuscula.get(k.toLowerCase()) || k;
        datos[nombre] = (datos[nombre] || []).concat(lista);
      } else if (!(ENVOLTORIOS.includes(k) && v && typeof v === 'object')) {
        cabecera[k] = v;
      }
    }
  };
  volcar(parsed);
  for (const w of ENVOLTORIOS) if (parsed[w] && typeof parsed[w] === 'object' && !Array.isArray(parsed[w])) volcar(parsed[w]);
  return { datos, cabecera, secciones: Object.keys(datos).filter((k) => datos[k].length > 0) };
}

/** Mensaje claro cuando el archivo no se puede leer. */
export function motivoCopiaIlegible(texto, error) {
  const t = limpiarTexto(texto);
  if (!t) return 'El archivo está vacío.';
  if (t[0] !== '{' && t[0] !== '[') return 'El archivo no es una copia en formato JSON (¿es un ZIP, un PDF o un Excel?). Abre el ZIP y elige el archivo .json de dentro.';
  if (!/[}\]]$/.test(t)) return 'El archivo está incompleto o cortado (la descarga o el guardado no terminó). Vuelve a copiarlo o usa otra copia.';
  return `El archivo está dañado y no se puede leer (${String(error?.message || error).slice(0, 80)}).`;
}

// ─── Rescate de copias dañadas ───────────────────────────────────────────────
// Si el programa se cerró a mitad de una copia, el fichero queda con un trozo roto. Antes eso hacía perder TODA la copia
// («Expected ',' or '}'…»). Ahora se leen una a una las secciones y los registros que están enteros y se avisa de lo que falta.

/** Fin (exclusivo) del valor JSON que empieza en i, respetando textos con comillas; -1 si el texto se acaba antes de cerrarse. */
function finDeValor(t, i) {
  const c = t[i];
  if (c === '"') {
    for (let j = i + 1; j < t.length; j++) { if (t[j] === '\\') j++; else if (t[j] === '"') return j + 1; }
    return -1;
  }
  if (c === '{' || c === '[') {
    let prof = 0;
    for (let j = i; j < t.length; j++) {
      const ch = t[j];
      if (ch === '"') { const f = finDeValor(t, j); if (f < 0) return -1; j = f - 1; }
      else if (ch === '{' || ch === '[') prof++;
      else if (ch === '}' || ch === ']') { prof--; if (prof === 0) return j + 1; }
    }
    return -1;
  }
  let j = i; while (j < t.length && !/[,}\]\s]/.test(t[j])) j++;
  return j;
}

const saltar = (t, i) => { while (i < t.length && /[\s,]/.test(t[i])) i++; return i; };

/**
 * Recupera lo que se pueda de una copia cuyo JSON está roto.
 * @returns {{ datos: object, secciones: number, registros: number, danadas: string[], perdidaFinal: boolean }|null}
 */
export function rescatarCopiaDanada(textoCrudo) {
  const t = limpiarTexto(textoCrudo);
  if (t[0] !== '{') return null;
  const datos = {}; const danadas = [];
  let registros = 0; let perdidaFinal = false;
  let i = saltar(t, 1);
  while (i < t.length && t[i] === '"') {
    const finClave = finDeValor(t, i); if (finClave < 0) { perdidaFinal = true; break; }
    let clave; try { clave = JSON.parse(t.slice(i, finClave)); } catch { break; }
    i = finClave; while (i < t.length && /\s/.test(t[i])) i++;
    if (t[i] !== ':') break;
    i++; while (i < t.length && /\s/.test(t[i])) i++;
    if (t[i] === '[') {
      const lista = []; let rota = false;
      i++;
      for (;;) {
        i = saltar(t, i);
        if (i >= t.length) { rota = true; perdidaFinal = true; break; }
        if (t[i] === ']') { i++; break; }
        const fin = t[i] === '{' ? finDeValor(t, i) : -1;
        let ok = false;
        if (fin > 0) { try { const r = JSON.parse(t.slice(i, fin)); if (r && typeof r === 'object') { lista.push(r); ok = true; } } catch { /* registro roto */ } }
        if (ok) { i = fin; continue; }
        // Registro roto o cortado: se busca el siguiente que empiece limpio, o la siguiente sección.
        rota = true;
        const sig = t.indexOf(',{"', i + 1);
        const proxSeccion = (() => { const m = /,\n"[A-Za-z0-9_]+":/g; m.lastIndex = i + 1; const r = m.exec(t); return r ? r.index : -1; })();
        if (sig >= 0 && (proxSeccion < 0 || sig < proxSeccion)) { i = sig + 1; continue; }
        if (proxSeccion >= 0) { i = proxSeccion; break; }
        perdidaFinal = true; i = t.length; break;
      }
      if (rota) danadas.push(clave);
      if (lista.length) { datos[clave] = lista; registros += lista.length; }
      else if (rota) datos[clave] = [];
    } else {
      const fin = finDeValor(t, i);
      if (fin < 0) { perdidaFinal = true; break; }
      try { datos[clave] = JSON.parse(t.slice(i, fin)); } catch { /* ajuste roto: se ignora */ }
      i = fin;
    }
    i = saltar(t, i);
  }
  const secciones = Object.keys(datos).filter((k) => Array.isArray(datos[k]) && datos[k].length).length;
  return { datos, secciones, registros, danadas, perdidaFinal };
}
