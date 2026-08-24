/**
 * umbralesRite.js — Los mínimos de eficiencia que exige el RITE.
 *
 * Van aquí y son EDITABLES, en vez de clavados en el código, por dos motivos:
 *
 *   1. El RITE (RD 1027/2007) se modifica cada cierto tiempo, y las exigencias
 *      dependen del tipo de instalación. Si el número vive en el código, el día
 *      que cambie hay que esperar a una versión nueva del programa para poder
 *      emitir un documento correcto.
 *   2. Quien firma el certificado es el instalador, no el programa. El número
 *      que se imprime bajo su firma tiene que poder ponerlo él.
 *
 * Los valores de partida son EER 3,0 y SCOP 3,5, que son los que traía el
 * programa. Se cambian en Configuración → Impresión.
 */

const CLAVE = 'gpt_umbrales_rite';

export const RITE_POR_DEFECTO = { eer: 3.0, scop: 3.5 };

/** Un número razonable o el de partida: nunca un texto vacío ni un cero. */
function numero(valor, pordefecto) {
  const n = typeof valor === 'number' ? valor : parseFloat(String(valor ?? '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 && n < 30 ? n : pordefecto;
}

export function umbralesRite() {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE) || '{}');
    return {
      eer: numero(g.eer, RITE_POR_DEFECTO.eer),
      scop: numero(g.scop, RITE_POR_DEFECTO.scop),
    };
  } catch {
    return { ...RITE_POR_DEFECTO };
  }
}

export function guardarUmbralesRite(cambios) {
  const nuevo = {
    eer: numero(cambios.eer, umbralesRite().eer),
    scop: numero(cambios.scop, umbralesRite().scop),
  };
  try { localStorage.setItem(CLAVE, JSON.stringify(nuevo)); } catch { /* sin sitio */ }
  return nuevo;
}

export function sonLosDePartida(u = umbralesRite()) {
  return u.eer === RITE_POR_DEFECTO.eer && u.scop === RITE_POR_DEFECTO.scop;
}
