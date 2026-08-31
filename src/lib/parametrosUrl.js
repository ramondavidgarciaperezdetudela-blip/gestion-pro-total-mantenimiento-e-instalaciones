/**
 * parametrosUrl.js — leer los parámetros de la dirección, con # o sin él.
 *
 * ─── EL FALLO QUE ARREGLA, PARA QUE NO VUELVA ───────────────────────────────
 *
 * El programa usa dos tipos de ruta según dónde se ejecute (ver App.jsx):
 *
 *   · En la web, BrowserRouter:  /ContactDetail?id=c1
 *   · En el escritorio, que carga con file://, HashRouter:  #/ContactDetail?id=c1
 *
 * Y ahí está la trampa: con HashRouter los parámetros van DENTRO del #, así
 * que `window.location.search` está VACÍO. Las pantallas que lo leían así
 * recibían el identificador a null.
 *
 * En la ficha de cliente eso significaba quedarse en «Cargando...» para
 * siempre, porque su carga empieza con `if (!contactId) return;`: sin
 * identificador no pedía nada, no fallaba nada, y nadie se enteraba.
 *
 * Por eso se mira primero dentro del #, y solo si ahí no hay nada se cae a la
 * dirección normal. Así funciona igual en la web, en el escritorio y en el
 * móvil, sin que cada pantalla tenga que saber en cuál está.
 */

/** Los parámetros de la dirección actual, venga como venga. */
export function parametrosDeUrl(url = null) {
  const sitio = url ? new URL(url, 'http://x') : window.location;
  const hash = sitio.hash || '';
  const corte = hash.indexOf('?');
  if (corte !== -1) {
    const dentro = new URLSearchParams(hash.slice(corte + 1));
    // Si el # trae parámetros, mandan ellos: es la ruta de verdad.
    if ([...dentro.keys()].length > 0) return dentro;
  }
  return new URLSearchParams(sitio.search || '');
}

/** Atajo para pedir un parámetro suelto. */
export function parametroDeUrl(nombre, url = null) {
  return parametrosDeUrl(url).get(nombre);
}
