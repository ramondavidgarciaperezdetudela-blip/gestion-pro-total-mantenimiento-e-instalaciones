/**
 * guardadoDeVerdad.js — Comprobar que el servidor ha guardado lo que se le mandó.
 *
 * POR QUÉ HACE FALTA
 *
 * Cuando se le manda al servidor un campo que su ficha no tiene declarado, no
 * da error: lo TIRA A LA BASURA en silencio y contesta "guardado". Desde la
 * pantalla todo parece correcto —no sale ningún aviso, el formulario se
 * cierra— y el dato solo se echa en falta al volver a abrir la ficha, cuando
 * ya no está y nadie sabe por qué.
 *
 * Eso es justo lo que pasaba con los datos del compresor escritos a mano: se
 * escribían, se guardaba, y al reabrir habían desaparecido.
 *
 * La respuesta del servidor al guardar ES su versión del registro, así que
 * basta con comparar lo que se mandó con lo que ha contestado. Si falta algo,
 * se puede decir exactamente qué campo y qué hay que hacer, en vez de dejar a
 * quien lo usa peleándose con un dato que se borra solo.
 */

/** ¿Este valor es "nada"? Un 0 o un false SÍ son valores. */
export function estaVacio(valor) {
  if (valor === undefined || valor === null || valor === '') return true;
  if (Array.isArray(valor)) return valor.length === 0;
  if (typeof valor === 'object') return Object.keys(valor).length === 0;
  return false;
}

/**
 * De los campos que se vigilan, cuáles se mandaron con contenido y han vuelto
 * vacíos (o no han vuelto).
 *
 * @param {object} enviado   lo que se mandó
 * @param {object} devuelto  lo que ha contestado el servidor
 * @param {string[]} vigilados  qué campos comprobar
 * @returns {string[]} los que el servidor no ha guardado
 */
export function camposPerdidos(enviado, devuelto, vigilados) {
  if (!devuelto || typeof devuelto !== 'object') return [];
  const perdidos = [];
  for (const campo of vigilados || []) {
    if (estaVacio(enviado?.[campo])) continue;      // no se mandó nada: nada que perder
    if (estaVacio(devuelto?.[campo])) perdidos.push(campo);
  }
  return perdidos;
}

/**
 * El aviso, en cristiano y con la solución, para enseñarlo tal cual.
 *
 * @param {string[]} perdidos
 * @param {string} entidad       nombre de la ficha en el panel (p.ej. MaintenanceSheet)
 * @param {Record<string,string>} nombres  cómo se llama cada campo para una persona
 */
export function avisoDeCamposPerdidos(perdidos, entidad, nombres = {}) {
  if (!perdidos?.length) return '';
  const lista = perdidos.map((c) => `• ${nombres[c] || c}  (campo «${c}»)`).join('\n');
  return `⚠️ El servidor NO ha guardado estos datos:\n\n${lista}\n\n`
    + `No es cosa del programa: se le han mandado y los ha descartado porque no están `
    + `declarados en la ficha «${entidad}» de tu panel de Base44.\n\n`
    + `Para arreglarlo: entra en Base44 → Entidades → ${entidad} y añade esos campos. `
    + `Los de texto como "texto", y los que empiecen por inspeccion_ como "objeto".\n\n`
    + `Mientras tanto, esos datos se perderán al cerrar la ficha.`;
}
