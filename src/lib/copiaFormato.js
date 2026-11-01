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
