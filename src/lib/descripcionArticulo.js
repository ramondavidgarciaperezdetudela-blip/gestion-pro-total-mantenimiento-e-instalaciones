/**
 * descripcionArticulo.js — Un artículo de tarifa sin descripción (solo números o solo su referencia) no se importa:
 * no sabemos qué es y tampoco se puede buscar su imagen.
 */

const SIN_NOMBRE = /^(sin\s+(nombre|descripci[oó]n)|s\/n|n\/a|-+)$/i;

/** ¿El texto dice de verdad qué es el artículo? Necesita letras (no solo cifras o símbolos) y no ser igual a su referencia. */
export function tieneDescripcion(nombre, codigo = '') {
  const n = String(nombre ?? '').trim();
  if (!n || SIN_NOMBRE.test(n)) return false;
  const letras = (n.match(/\p{L}/gu) || []).length;
  if (letras < 2) return false; // «12345», «0,75», «5 x 3», «A»
  const c = String(codigo ?? '').trim();
  if (c && n.toLowerCase() === c.toLowerCase()) return false; // el nombre es solo la referencia
  return true;
}

/** Separa los artículos con descripción de los que no. `campoNombre`/`campoCodigo` según el formato del lector. */
export function separarSinDescripcion(items = [], campoNombre = 'product_name', campoCodigo = 'product_code') {
  const validos = []; const descartados = [];
  for (const it of items) (tieneDescripcion(it?.[campoNombre], it?.[campoCodigo]) ? validos : descartados).push(it);
  return { validos, descartados };
}
