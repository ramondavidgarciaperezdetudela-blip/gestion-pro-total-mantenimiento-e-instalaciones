/**
 * datosSustitucion.js — A qué gas se puede pasar desde cada gas y con qué condiciones.
 *
 * Es la ÚNICA fuente de las conversiones entre gases del programa: la pantalla «Equivalencias de gases»,
 * la pestaña de conversión del diagnóstico de carga y las fichas leen de aquí a través de
 * `equivalenciasGases.js`. Antes había tres tablas distintas escritas a mano que se contradecían
 * (el R-449A figuraba con dos GWP, el R-1234yf se «sustituía» por el R-1234yf, la carga del
 * R-404A→R-448A salía al 95 % cuando el fabricante da el 105 %).
 *
 * Cómo se ha hecho y qué garantiza:
 *   · Cada pareja lleva `fuente`: «fabricante» si las cifras salen de una guía de reconversión publicada
 *     (Honeywell, Arkema, Chemours, EPA) o «general» si es el criterio habitual del oficio y hay que
 *     confirmarlo con el fabricante del gas y del compresor.
 *   · Las cargas NO se inventan. Donde hay guía del fabricante se copian; donde no, el programa las
 *     estima con la relación de densidades del líquido (misma instalación → mismo volumen de líquido)
 *     y avisa de que es una estimación. Esa estimación reproduce las cargas publicadas por los
 *     fabricantes (R-404A→R-448A 1,06; R-22→R-407C 0,95; R-12→R-134a 0,92), y `npm run test:equivalencias`
 *     lo vuelve a comprobar cada vez.
 *   · Los gases con GWP, seguridad, aceite y estado legal salen del catálogo (`refrigerantes.js`); aquí
 *     solo va lo propio de la conversión.
 *
 * Tipos de conversión:
 *   directo     mismo compresor y, normalmente, mismo aceite; se ajusta la válvula y se cambia el filtro.
 *   conversion  hay que cambiar el aceite y/o componentes (válvula, juntas, presostatos) o el gas es
 *               inflamable (A2L) y el equipo y la instalación deben admitirlo.
 *   nuevo       solo en un equipo diseñado para ese gas: cambian las presiones, la inflamabilidad o el ciclo.
 *
 * `cambioAceite`: 'no' (se mantiene), 'parcial' (depende de la instalación) o 'si' (hay que cambiarlo).
 * `carga`: fracción del peso de la carga ORIGINAL → { inicial: con qué fracción empezar, desde/hasta: carga
 *          final esperada, max: tope que no se debe pasar }.
 */

export const SUSTITUCIONES = [
  // ───────────────────────────── R-12 (CFC) ─────────────────────────────
  {
    de: 'R-12', a: 'R-134a', tipo: 'conversion',
    aceite: 'POE (el PAG es solo para el aire acondicionado de automoción)', cambioAceite: 'si',
    carga: { inicial: 0.85, desde: 0.90, hasta: 0.95 }, fuente: 'fabricante', ref: 'Arkema; IIR',
    nota: 'Hay que sacar el aceite mineral y poner POE: varios cambios de aceite, con el compresor funcionando entre uno y otro. Cambia el filtro deshidratador y las juntas. Con el mismo compresor pierde capacidad, sobre todo a baja temperatura de evaporación: úsalo en media temperatura.',
  },
  {
    de: 'R-12', a: 'R-413A', tipo: 'directo',
    aceite: 'Mineral o alquilbenceno (lleva un hidrocarburo que arrastra el aceite)', cambioAceite: 'no',
    carga: null, fuente: 'general',
    nota: 'Permite mantener el aceite mineral, pero vigila el retorno de aceite. Cambia el filtro deshidratador.',
  },

  // ───────────────────────────── R-502 (CFC/HCFC) ─────────────────────────────
  {
    de: 'R-502', a: 'R-404A', tipo: 'conversion',
    aceite: 'POE', cambioAceite: 'si',
    carga: { inicial: 0.85, desde: 0.85, hasta: 0.90 }, fuente: 'fabricante', ref: 'Arkema',
    nota: 'Cambio completo a POE. La presión de descarga sube entre 1 y 1,7 bar respecto al R-502.',
  },
  {
    de: 'R-502', a: 'R-507A', tipo: 'conversion',
    aceite: 'POE', cambioAceite: 'si',
    carga: { inicial: 0.85, desde: 0.85, hasta: 0.90 }, fuente: 'fabricante', ref: 'Arkema',
    nota: 'Cambio completo a POE. La presión de descarga sube entre 1,4 y 2,4 bar respecto al R-502.',
  },
  {
    de: 'R-502', a: 'R-448A', tipo: 'conversion',
    aceite: 'POE', cambioAceite: 'si', carga: null, fuente: 'general',
    nota: 'Cambio completo a POE. Cambia el filtro deshidratador y revisa la válvula de expansión.',
  },
  {
    de: 'R-502', a: 'R-449A', tipo: 'conversion',
    aceite: 'POE', cambioAceite: 'si', carga: null, fuente: 'general',
    nota: 'Cambio completo a POE. Cambia el filtro deshidratador y revisa la válvula de expansión.',
  },
  {
    de: 'R-502', a: 'R-407F', tipo: 'conversion',
    aceite: 'POE', cambioAceite: 'si', carga: null, fuente: 'general',
    nota: 'Cambio completo a POE. Carga siempre en fase líquida.',
  },

  // ───────────────────────────── R-22 (HCFC) ─────────────────────────────
  {
    de: 'R-22', a: 'R-407C', tipo: 'conversion',
    aceite: 'POE (mínimo un 15 % de POE en la carga que circula; lo correcto es cambiar todo el aceite)', cambioAceite: 'si',
    carga: { inicial: 0.85, desde: 0.90, hasta: 0.96 }, fuente: 'fabricante', ref: 'Honeywell; Arkema',
    nota: 'Zeótropo con unos 6 K de deslizamiento: carga siempre en fase líquida y calcula el recalentamiento con la presión de rocío y el subenfriamiento con la de burbuja. La válvula de expansión puede necesitar un pequeño ajuste. Con depósito o acumulador de aspiración hace falta más POE.',
  },
  {
    de: 'R-22', a: 'R-422D', tipo: 'directo',
    aceite: 'Se puede mantener el mineral o el alquilbenceno solo con líneas cortas; el POE mejora el retorno de aceite', cambioAceite: 'parcial',
    carga: { inicial: 0.85, desde: 0.95, hasta: 0.96 }, fuente: 'fabricante', ref: 'Honeywell; Chemours',
    nota: 'Mueve más caudal másico que el R-22 (alrededor de un 30 % más según las comparativas del fabricante): comprueba que la válvula de expansión no se queda corta. En ensayos de retorno de aceite con mineral dio problemas: en instalaciones con líneas largas o evaporadores inundados cambia a POE.',
  },
  {
    de: 'R-22', a: 'R-427A', tipo: 'directo',
    aceite: 'POE recomendado. Se admite mineral o alquilbenceno si hay separador de aceite y el retorno ya era fiable con R-22', cambioAceite: 'parcial',
    carga: { inicial: 0.95, desde: 0.95, hasta: 1.00 }, fuente: 'fabricante', ref: 'Arkema',
    nota: 'Con un solo cambio de aceite tolera hasta un 15 % de mineral residual. No suele exigir cambiar la válvula de expansión: ajusta el recalentamiento y los presostatos de baja. La temperatura de descarga baja entre 8 y 25 K respecto al R-22, según el fabricante.',
  },
  {
    de: 'R-22', a: 'R-407A', tipo: 'conversion',
    aceite: 'POE', cambioAceite: 'si',
    carga: { inicial: 0.85, desde: 0.95, hasta: 1.00 }, fuente: 'fabricante', ref: 'Arkema',
    nota: 'Para media y baja temperatura con expansión directa. La presión de descarga sube entre 1,7 y 2,4 bar respecto al R-22.',
  },
  {
    de: 'R-22', a: 'R-417A', tipo: 'directo',
    aceite: 'Admite mineral, alquilbenceno y POE', cambioAceite: 'no', carga: null, fuente: 'general',
    nota: 'Conserva el aceite, pero vigila el retorno de aceite. Es una mezcla con deslizamiento: carga en fase líquida.',
  },
  {
    de: 'R-22', a: 'R-438A', tipo: 'directo',
    aceite: 'Compatible con mineral y con POE', cambioAceite: 'no', carga: null, fuente: 'general', ref: 'Chemours',
    nota: 'Pensado para aire acondicionado. Caudal másico un 12 % mayor que el R-22, dentro de lo que suele admitir la válvula. Carga en fase líquida.',
  },
  {
    de: 'R-22', a: 'R-417B', tipo: 'directo',
    aceite: 'Admite mineral, alquilbenceno y POE', cambioAceite: 'no', carga: null, fuente: 'general',
    nota: 'Pensado para baja temperatura. Conserva el aceite, pero vigila el retorno.',
  },
  {
    de: 'R-22', a: 'R-453A', tipo: 'conversion',
    aceite: 'POE', cambioAceite: 'si', carga: null, fuente: 'general',
    nota: 'Para media temperatura. Cambia el aceite y el filtro deshidratador y carga en fase líquida.',
  },
  {
    de: 'R-22', a: 'R-449A', tipo: 'conversion',
    aceite: 'POE', cambioAceite: 'si', carga: null, fuente: 'general',
    nota: 'En refrigeración de media y baja temperatura. Cambia a POE, cambia el filtro y revisa la válvula de expansión.',
  },
  {
    de: 'R-22', a: 'R-407F', tipo: 'conversion',
    aceite: 'POE', cambioAceite: 'si', carga: null, fuente: 'general',
    nota: 'En refrigeración de media y baja temperatura. Cambia a POE y carga en fase líquida.',
  },
  {
    de: 'R-22', a: 'R-410A', tipo: 'nuevo',
    aceite: 'POE', cambioAceite: 'si', carga: null, fuente: 'general',
    nota: 'Trabaja con presiones muy superiores (alrededor de un 60 % más): no se puede conservar el compresor ni las tuberías de un equipo de R-22. Solo en equipo nuevo.',
  },
  {
    de: 'R-22', a: 'R-32', tipo: 'nuevo',
    aceite: 'POE', cambioAceite: 'si', carga: null, fuente: 'general',
    nota: 'Es inflamable (A2L) y trabaja a presiones altas. Solo en equipo nuevo diseñado para R-32.',
  },
  {
    de: 'R-22', a: 'R-454B', tipo: 'nuevo',
    aceite: 'POE', cambioAceite: 'si', carga: null, fuente: 'general',
    nota: 'Es inflamable (A2L) y trabaja a presiones altas. Solo en equipo nuevo diseñado para R-454B.',
  },

  // ───────────────────────────── R-404A ─────────────────────────────
  {
    de: 'R-404A', a: 'R-448A', tipo: 'directo',
    aceite: 'POE (el mismo que ya lleva)', cambioAceite: 'no',
    carga: { inicial: 0.85, desde: 1.00, hasta: 1.05, max: 1.07 }, fuente: 'fabricante', ref: 'Honeywell',
    nota: 'Empieza por el 85 % de la carga original y completa de 5 en 5 % pesando; no pases del 107 %. Cambia el filtro deshidratador y ajusta la válvula de expansión para tener recalentamiento suficiente. Sube un poco la presión de descarga: revisa los ventiladores del condensador. Consulta al fabricante del compresor el límite de temperatura de descarga.',
  },
  {
    de: 'R-404A', a: 'R-449A', tipo: 'directo',
    aceite: 'POE (el mismo que ya lleva)', cambioAceite: 'no', carga: null, fuente: 'fabricante', ref: 'Chemours',
    nota: 'Caudal másico entre un 20 y un 25 % menor que el R-404A y temperatura de descarga entre 10 y 20 K más alta: en baja temperatura valora enfriar la descarga (inyección de líquido o ventilador de cabeza). La válvula termostática suele necesitar cerrarse un poco para subir el recalentamiento. Revisa las consignas, porque muchas regulaciones usan la curva presión-temperatura del gas.',
  },
  {
    de: 'R-404A', a: 'R-449B', tipo: 'directo',
    aceite: 'POE (el mismo que ya lleva)', cambioAceite: 'no', carga: null, fuente: 'general',
    nota: 'Se comporta como el R-449A (composición casi igual): mismo procedimiento y mismas precauciones con la temperatura de descarga.',
  },
  {
    de: 'R-404A', a: 'R-407F', tipo: 'directo',
    aceite: 'POE (el mismo que ya lleva)', cambioAceite: 'no', carga: null, fuente: 'general',
    nota: 'Mezcla con deslizamiento de unos 5 K: carga en fase líquida. Buen rendimiento en congelación.',
  },
  {
    de: 'R-404A', a: 'R-407A', tipo: 'directo',
    aceite: 'POE (el mismo que ya lleva)', cambioAceite: 'no', carga: null, fuente: 'general',
    nota: 'Mezcla con deslizamiento de unos 5 K: carga en fase líquida. Pensado para media temperatura.',
  },
  {
    de: 'R-404A', a: 'R-452A', tipo: 'directo',
    aceite: 'POE (el mismo que ya lleva)', cambioAceite: 'no', carga: null, fuente: 'fabricante', ref: 'Chemours',
    nota: 'Caudal másico y temperatura de descarga parecidos a los del R-404A, y la válvula de expansión no suele necesitar cambio. Habitual en transporte frigorífico.',
  },
  {
    de: 'R-404A', a: 'R-507A', tipo: 'directo',
    aceite: 'POE (el mismo que ya lleva)', cambioAceite: 'no', carga: null, fuente: 'general',
    nota: 'Se comporta casi igual, pero su GWP es igual de alto: no resuelve la restricción legal del R-404A.',
  },
  {
    de: 'R-404A', a: 'R-454C', tipo: 'conversion',
    aceite: 'POE (el mismo que ya lleva)', cambioAceite: 'no', carga: null, fuente: 'general',
    nota: 'Es inflamable (A2L): solo si el equipo, la instalación y los componentes eléctricos están preparados para A2L (UNE-EN 378). Consulta antes al fabricante del compresor.',
  },
  {
    de: 'R-404A', a: 'R-455A', tipo: 'conversion',
    aceite: 'POE (el mismo que ya lleva)', cambioAceite: 'no', carga: null, fuente: 'general',
    nota: 'Es inflamable (A2L): solo si el equipo, la instalación y los componentes eléctricos están preparados para A2L (UNE-EN 378). Consulta antes al fabricante del compresor.',
  },
  {
    de: 'R-404A', a: 'R-290', tipo: 'nuevo',
    aceite: 'Aceite específico para hidrocarburos', cambioAceite: 'si', carga: null, fuente: 'general',
    nota: 'Es inflamable (A3) y la carga está limitada por la norma (UNE-EN 378 y UNE-EN 60335-2-89). Solo en equipo nuevo diseñado para propano.',
  },
  {
    de: 'R-404A', a: 'R-744', tipo: 'nuevo',
    aceite: 'POE especial para CO₂', cambioAceite: 'si', carga: null, fuente: 'general',
    nota: 'Instalación transcrítica o en cascada, con presiones de más de 100 bar: es otra instalación, no una conversión.',
  },

  // ───────────────────────────── R-507A ─────────────────────────────
  {
    de: 'R-507A', a: 'R-448A', tipo: 'directo',
    aceite: 'POE (el mismo que ya lleva)', cambioAceite: 'no',
    carga: { inicial: 0.85, desde: 1.00, hasta: 1.05, max: 1.07 }, fuente: 'fabricante', ref: 'Honeywell',
    nota: 'La guía del fabricante es la misma que para R-404A: empieza por el 85 % y completa de 5 en 5 % pesando; no pases del 107 %.',
  },
  {
    de: 'R-507A', a: 'R-449A', tipo: 'directo',
    aceite: 'POE (el mismo que ya lleva)', cambioAceite: 'no', carga: null, fuente: 'fabricante', ref: 'Chemours',
    nota: 'Mismo procedimiento que desde R-404A: vigila la temperatura de descarga y el recalentamiento.',
  },
  {
    de: 'R-507A', a: 'R-449B', tipo: 'directo',
    aceite: 'POE (el mismo que ya lleva)', cambioAceite: 'no', carga: null, fuente: 'general',
    nota: 'Se comporta como el R-449A.',
  },
  {
    de: 'R-507A', a: 'R-452A', tipo: 'directo',
    aceite: 'POE (el mismo que ya lleva)', cambioAceite: 'no', carga: null, fuente: 'fabricante', ref: 'Chemours',
    nota: 'Caudal másico y temperatura de descarga parecidos a los del R-507A.',
  },
  {
    de: 'R-507A', a: 'R-407F', tipo: 'directo',
    aceite: 'POE (el mismo que ya lleva)', cambioAceite: 'no', carga: null, fuente: 'general',
    nota: 'Mezcla con deslizamiento de unos 5 K: carga en fase líquida.',
  },
  {
    de: 'R-507A', a: 'R-454C', tipo: 'conversion',
    aceite: 'POE (el mismo que ya lleva)', cambioAceite: 'no', carga: null, fuente: 'general',
    nota: 'Es inflamable (A2L): solo si el equipo y la instalación están preparados para A2L.',
  },
  {
    de: 'R-507A', a: 'R-455A', tipo: 'conversion',
    aceite: 'POE (el mismo que ya lleva)', cambioAceite: 'no', carga: null, fuente: 'general',
    nota: 'Es inflamable (A2L): solo si el equipo y la instalación están preparados para A2L.',
  },

  // ───────────────────────────── R-410A ─────────────────────────────
  {
    de: 'R-410A', a: 'R-32', tipo: 'nuevo',
    aceite: 'POE', cambioAceite: 'si', carga: null, fuente: 'fabricante', ref: 'Arkema',
    nota: 'No es una solución de conversión para equipos existentes de R-410A (el fabricante lo dice expresamente): es inflamable (A2L) y trabaja a presiones algo mayores. Solo en equipo nuevo diseñado para R-32, que lleva una carga bastante menor.',
  },
  {
    de: 'R-410A', a: 'R-454B', tipo: 'nuevo',
    aceite: 'POE', cambioAceite: 'si', carga: null, fuente: 'fabricante', ref: 'Arkema',
    nota: 'No es una solución de conversión para equipos existentes de R-410A (el fabricante lo dice expresamente): es inflamable (A2L). Solo en equipo nuevo diseñado para R-454B.',
  },
  {
    de: 'R-410A', a: 'R-452B', tipo: 'nuevo',
    aceite: 'POE', cambioAceite: 'si', carga: null, fuente: 'general',
    nota: 'Inflamable (A2L), con presiones muy parecidas a las del R-410A. Solo en equipo nuevo diseñado para R-452B.',
  },
  {
    de: 'R-410A', a: 'R-459A', tipo: 'nuevo',
    aceite: 'POE', cambioAceite: 'si', carga: null, fuente: 'general',
    nota: 'Inflamable (A2L). Solo en equipo nuevo diseñado para R-459A.',
  },
  {
    de: 'R-410A', a: 'R-466A', tipo: 'nuevo',
    aceite: 'POE', cambioAceite: 'si', carga: null, fuente: 'general',
    nota: 'No inflamable (A1). Consulta la aprobación del fabricante del equipo: no está admitido en todos los compresores.',
  },

  // ───────────────────────────── R-407C ─────────────────────────────
  {
    de: 'R-407C', a: 'R-449A', tipo: 'conversion',
    aceite: 'POE (el mismo que ya lleva)', cambioAceite: 'no', carga: null, fuente: 'general',
    nota: 'En refrigeración de media y baja temperatura. Revisa la válvula de expansión y el recalentamiento.',
  },
  {
    de: 'R-407C', a: 'R-32', tipo: 'nuevo',
    aceite: 'POE', cambioAceite: 'si', carga: null, fuente: 'general',
    nota: 'Inflamable (A2L). Solo en equipo nuevo diseñado para R-32.',
  },
  {
    de: 'R-407C', a: 'R-454B', tipo: 'nuevo',
    aceite: 'POE', cambioAceite: 'si', carga: null, fuente: 'general',
    nota: 'Inflamable (A2L). Solo en equipo nuevo diseñado para R-454B.',
  },

  // ───────────────────────────── R-134a ─────────────────────────────
  {
    de: 'R-134a', a: 'R-513A', tipo: 'directo',
    aceite: 'POE (el mismo que ya lleva)', cambioAceite: 'no', carga: null, fuente: 'general', ref: 'Chemours',
    nota: 'No inflamable (A1) y casi sin deslizamiento. Trabaja con presiones algo mayores y deja la capacidad parecida a la del R-134a. Cambia el filtro deshidratador y ajusta el recalentamiento.',
  },
  {
    de: 'R-134a', a: 'R-450A', tipo: 'directo',
    aceite: 'POE (el mismo que ya lleva)', cambioAceite: 'no', carga: null, fuente: 'general', ref: 'Honeywell',
    nota: 'No inflamable (A1). Presiones algo menores que el R-134a y capacidad parecida o ligeramente menor. Cambia el filtro deshidratador.',
  },
  {
    de: 'R-134a', a: 'R-456A', tipo: 'directo',
    aceite: 'POE (el mismo que ya lleva)', cambioAceite: 'no', carga: null, fuente: 'general',
    nota: 'No inflamable (A1), con deslizamiento de unos 4 K: carga en fase líquida.',
  },
  {
    de: 'R-134a', a: 'R-1234ze(E)', tipo: 'nuevo',
    aceite: 'POE', cambioAceite: 'parcial', carga: null, fuente: 'general',
    nota: 'Inflamable (A2L) y con bastante menos capacidad volumétrica: en enfriadoras exige otro compresor o más caudal. Solo en equipo diseñado para él.',
  },
  {
    de: 'R-134a', a: 'R-1234yf', tipo: 'nuevo',
    aceite: 'POE (en automoción, PAG)', cambioAceite: 'parcial', carga: null, fuente: 'general',
    nota: 'Inflamable (A2L). Se usa en equipos nuevos, sobre todo de automoción; no es una conversión habitual de instalaciones fijas.',
  },
  {
    de: 'R-134a', a: 'R-516A', tipo: 'nuevo',
    aceite: 'POE', cambioAceite: 'parcial', carga: null, fuente: 'general',
    nota: 'Inflamable (A2L) y de GWP muy bajo. Solo en equipo diseñado para él.',
  },
  {
    de: 'R-134a', a: 'R-515B', tipo: 'nuevo',
    aceite: 'POE', cambioAceite: 'parcial', carga: null, fuente: 'general',
    nota: 'No inflamable (A1) y de GWP bajo; pensado para enfriadoras. Solo en equipo diseñado para él.',
  },

  // ───────────────────────────── Mezclas de sustitución de R-404A ─────────────────────────────
  {
    de: 'R-407A', a: 'R-448A', tipo: 'directo',
    aceite: 'POE (el mismo que ya lleva)', cambioAceite: 'no', carga: null, fuente: 'general',
    nota: 'Menor GWP. Carga en fase líquida.',
  },
  {
    de: 'R-407A', a: 'R-449A', tipo: 'directo',
    aceite: 'POE (el mismo que ya lleva)', cambioAceite: 'no', carga: null, fuente: 'general',
    nota: 'Menor GWP. Carga en fase líquida.',
  },
  {
    de: 'R-407F', a: 'R-448A', tipo: 'directo',
    aceite: 'POE (el mismo que ya lleva)', cambioAceite: 'no', carga: null, fuente: 'general',
    nota: 'Menor GWP. Carga en fase líquida.',
  },
  {
    de: 'R-407F', a: 'R-449A', tipo: 'directo',
    aceite: 'POE (el mismo que ya lleva)', cambioAceite: 'no', carga: null, fuente: 'general',
    nota: 'Menor GWP. Carga en fase líquida.',
  },
  {
    de: 'R-448A', a: 'R-449A', tipo: 'directo',
    aceite: 'POE (el mismo que ya lleva)', cambioAceite: 'no', carga: null, fuente: 'general',
    nota: 'Casi intercambiables: composición y propiedades muy parecidas.',
  },
  {
    de: 'R-449A', a: 'R-448A', tipo: 'directo',
    aceite: 'POE (el mismo que ya lleva)', cambioAceite: 'no', carga: null, fuente: 'general',
    nota: 'Casi intercambiables: composición y propiedades muy parecidas.',
  },
  {
    de: 'R-448A', a: 'R-454C', tipo: 'conversion',
    aceite: 'POE (el mismo que ya lleva)', cambioAceite: 'no', carga: null, fuente: 'general',
    nota: 'Inflamable (A2L): solo si el equipo y la instalación están preparados.',
  },
  {
    de: 'R-448A', a: 'R-455A', tipo: 'conversion',
    aceite: 'POE (el mismo que ya lleva)', cambioAceite: 'no', carga: null, fuente: 'general',
    nota: 'Inflamable (A2L): solo si el equipo y la instalación están preparados.',
  },
  {
    de: 'R-449A', a: 'R-454C', tipo: 'conversion',
    aceite: 'POE (el mismo que ya lleva)', cambioAceite: 'no', carga: null, fuente: 'general',
    nota: 'Inflamable (A2L): solo si el equipo y la instalación están preparados.',
  },
  {
    de: 'R-449A', a: 'R-455A', tipo: 'conversion',
    aceite: 'POE (el mismo que ya lleva)', cambioAceite: 'no', carga: null, fuente: 'general',
    nota: 'Inflamable (A2L): solo si el equipo y la instalación están preparados.',
  },
  {
    de: 'R-513A', a: 'R-450A', tipo: 'directo',
    aceite: 'POE (el mismo que ya lleva)', cambioAceite: 'no', carga: null, fuente: 'general',
    nota: 'Los dos son A1 y de GWP parecido; el R-450A trabaja con presiones algo menores.',
  },
  {
    de: 'R-450A', a: 'R-513A', tipo: 'directo',
    aceite: 'POE (el mismo que ya lleva)', cambioAceite: 'no', carga: null, fuente: 'general',
    nota: 'Los dos son A1 y de GWP parecido; el R-513A trabaja con presiones algo mayores.',
  },
];

/**
 * Condición de referencia con la que se comparan por defecto las presiones y la capacidad de cada
 * gas (si no está aquí, 'media'). Es solo la pestaña con la que se abre la comparación.
 */
export const CONDICION_TIPICA = {
  'R-22': 'clima', 'R-32': 'clima', 'R-410A': 'clima', 'R-407C': 'clima', 'R-454B': 'clima', 'R-452B': 'clima',
  'R-459A': 'clima', 'R-466A': 'clima', 'R-417A': 'clima', 'R-422D': 'clima', 'R-427A': 'clima', 'R-438A': 'clima',
  'R-453A': 'clima', 'R-502': 'baja', 'R-507A': 'baja',
};

/** Procedimiento general de una conversión (guías de Honeywell, Arkema y EPA). */
export const PASOS_CONVERSION = [
  'Antes de empezar, anota el gas, el aceite y el peso de la carga original (placa y libro de la instalación) y confirma con el fabricante del compresor que admite el gas nuevo.',
  'Recupera todo el gas anterior con una recuperadora (nunca lo ventiles) y pésalo.',
  'Si la ficha lo pide, cambia el aceite: drénalo, mide el volumen y repón el mismo volumen de aceite nuevo. El POE absorbe la humedad del aire: no lo dejes abierto más de 10 o 15 minutos.',
  'Cambia el filtro deshidratador (y el filtro de aspiración, si lo hay) y revisa las juntas y los elastómeros.',
  'Haz el vacío por alta y por baja hasta 1.000 micras o menos con un vacuómetro electrónico y comprueba que lo mantiene.',
  'Carga siempre en fase líquida (si cargas vapor, la mezcla se fracciona), con una válvula reguladora para que al compresor llegue vapor. Nunca líquido por la aspiración con el compresor en marcha.',
  'Empieza por el 85 % de la carga original y completa de 5 en 5 % pesando, hasta que el recalentamiento y el subenfriamiento sean los correctos. Con mezclas, el recalentamiento se calcula con la presión de rocío y el subenfriamiento con la de burbuja.',
  'Ajusta la válvula de expansión, los presostatos y las consignas de la regulación, y vigila la temperatura de descarga del compresor.',
  'Etiqueta el equipo con el gas y el aceite nuevos, comprueba que no hay fugas y anótalo en el libro de la instalación.',
];
