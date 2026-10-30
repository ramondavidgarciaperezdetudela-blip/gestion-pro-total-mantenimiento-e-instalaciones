/**
 * refrigerantes.js — Todos los gases, incluidos los que ya no se pueden usar.
 *
 * Por qué están también los prohibidos: porque las máquinas antiguas siguen
 * ahí. Si vas a una cámara de 1998 que lleva R-22 y en el desplegable solo
 * tienes los gases nuevos, no puedes rellenar el papel con la verdad. Y el
 * papel tiene que decir la verdad: lo que lleva la máquina, aunque ese gas
 * esté prohibido desde hace años. Precisamente por eso hace falta ponerlo.
 *
 * Cada gas lleva:
 *   · el GWP de referencia, para la ficha y para el cálculo de toneladas
 *     equivalentes de CO₂;
 *   · el grupo de seguridad ASHRAE 34 (A1 no inflamable, A2L levemente
 *     inflamable, A3 inflamable, B2L tóxico y levemente inflamable);
 *   · el aceite que le corresponde, que es lo que se olvida en un retrofit y
 *     lo que se carga el compresor;
 *   · y a qué se puede pasar: los sustitutos compatibles.
 *
 * ⚠️ Sobre el GWP: aquí va el valor de referencia más extendido (AR4), que es
 * el que llevan las etiquetas y la mayoría de fichas técnicas. Para un cálculo
 * oficial —impuesto sobre gases fluorados, umbrales de control de fugas—
 * comprueba el valor que figure en los anexos del Reglamento (UE) 2024/573,
 * porque la referencia puede cambiar de una revisión a otra.
 *
 * ⚠️ Sobre el estado: "prohibido" y "restringido" son una guía rápida, no un
 * dictamen. Las prohibiciones del Reglamento (UE) 2024/573 van por tipo de
 * equipo y por fecha, así que comprueba tu caso concreto antes de decidir.
 */

/** Qué significa cada estado, para poder explicarlo en pantalla. */
export const ESTADOS = {
  prohibido: {
    etiqueta: 'Prohibido',
    color: 'bg-red-100 text-red-800 border-red-300',
    explicacion: 'Sustancia que agota la capa de ozono. Prohibida su producción y su uso en equipos nuevos y en recargas (Protocolo de Montreal y Reglamento (CE) 1005/2009). Solo se puede recuperar para su gestión como residuo.',
  },
  restringido: {
    etiqueta: 'Restringido',
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    explicacion: 'Gas fluorado de GWP alto. Sujeto a la reducción progresiva de cuotas y a prohibiciones por tipo de equipo del Reglamento (UE) 2024/573. Comprueba si tu aplicación concreta ya está prohibida antes de instalar o recargar.',
  },
  vigente: {
    etiqueta: 'Vigente',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    explicacion: 'Se puede usar. Aun así, comprueba la clasificación de seguridad: los A2L, A3 y B2L exigen medidas concretas de instalación, ventilación y detección.',
  },
};

/**
 * El catálogo. `sustitutos` son los gases a los que se suele pasar, ya sea
 * cambiando el equipo o haciendo retrofit; hay que comprobar siempre que el
 * compresor, el aceite y los elementos de expansión lo admiten.
 */
export const REFRIGERANTES = [
  // ── CFC — prohibidos ─────────────────────────────────────────────────────
  { id: 'R-11', nombre: 'R-11 (CFC-11)', familia: 'CFC', gwp: 4750, odp: 1, seguridad: 'A1', aceite: 'Mineral', estado: 'prohibido', uso: 'Enfriadoras centrífugas antiguas', sustitutos: ['R-123', 'R-1233zd(E)', 'R-514A'] },
  { id: 'R-12', nombre: 'R-12 (CFC-12)', familia: 'CFC', gwp: 10900, odp: 1, seguridad: 'A1', aceite: 'Mineral', estado: 'prohibido', uso: 'Frío comercial y doméstico antiguo, automoción', sustitutos: ['R-134a', 'R-401A', 'R-409A', 'R-513A', 'R-450A'] },
  { id: 'R-13', nombre: 'R-13 (CFC-13)', familia: 'CFC', gwp: 14400, odp: 1, seguridad: 'A1', aceite: 'Mineral', estado: 'prohibido', uso: 'Muy baja temperatura, cascada', sustitutos: ['R-23', 'R-508B', 'R-170'] },
  { id: 'R-113', nombre: 'R-113 (CFC-113)', familia: 'CFC', gwp: 6130, odp: 1, seguridad: 'A1', aceite: 'Mineral', estado: 'prohibido', uso: 'Enfriadoras industriales antiguas', sustitutos: ['R-123', 'R-1233zd(E)'] },
  { id: 'R-114', nombre: 'R-114 (CFC-114)', familia: 'CFC', gwp: 10000, odp: 1, seguridad: 'A1', aceite: 'Mineral', estado: 'prohibido', uso: 'Bombas de calor de alta temperatura antiguas', sustitutos: ['R-236fa', 'R-1233zd(E)'] },
  { id: 'R-115', nombre: 'R-115 (CFC-115)', familia: 'CFC', gwp: 7370, odp: 0.6, seguridad: 'A1', aceite: 'Mineral', estado: 'prohibido', uso: 'Componente del R-502', sustitutos: ['R-404A', 'R-448A'] },
  { id: 'R-500', nombre: 'R-500 (mezcla CFC)', familia: 'CFC', gwp: 8077, odp: 0.74, seguridad: 'A1', aceite: 'Mineral', estado: 'prohibido', uso: 'Frío comercial antiguo a 60 Hz', sustitutos: ['R-134a', 'R-401B', 'R-513A'] },
  { id: 'R-502', nombre: 'R-502 (mezcla CFC/HCFC)', familia: 'CFC', gwp: 4657, odp: 0.33, seguridad: 'A1', aceite: 'Mineral', estado: 'prohibido', uso: 'Congelación comercial antigua', sustitutos: ['R-448A', 'R-449A', 'R-407F', 'R-404A'] },

  // ── HCFC — prohibidos ────────────────────────────────────────────────────
  { id: 'R-22', nombre: 'R-22 (HCFC-22)', familia: 'HCFC', gwp: 1810, odp: 0.055, seguridad: 'A1', aceite: 'Mineral / alquilbenceno', estado: 'prohibido', uso: 'Clima y frío comercial hasta los años 2000', nota: 'Prohibido su uso en el mantenimiento y la recarga de equipos en la Unión Europea desde el 1 de enero de 2015, incluido el gas reciclado y regenerado.', sustitutos: ['R-407C', 'R-417A', 'R-422D', 'R-427A', 'R-438A', 'R-410A', 'R-32'] },
  { id: 'R-123', nombre: 'R-123 (HCFC-123)', familia: 'HCFC', gwp: 79, odp: 0.02, seguridad: 'B1', aceite: 'Mineral / POE', estado: 'prohibido', uso: 'Enfriadoras centrífugas de baja presión', sustitutos: ['R-1233zd(E)', 'R-514A'] },
  { id: 'R-124', nombre: 'R-124 (HCFC-124)', familia: 'HCFC', gwp: 609, odp: 0.022, seguridad: 'A1', aceite: 'Mineral', estado: 'prohibido', uso: 'Componente de mezclas de retrofit', sustitutos: ['R-134a', 'R-513A'] },
  { id: 'R-141b', nombre: 'R-141b (HCFC-141b)', familia: 'HCFC', gwp: 725, odp: 0.11, seguridad: '—', aceite: '—', estado: 'prohibido', uso: 'Limpieza de circuitos y espumación', sustitutos: ['Disolventes sin HCFC'] },
  { id: 'R-142b', nombre: 'R-142b (HCFC-142b)', familia: 'HCFC', gwp: 2310, odp: 0.065, seguridad: 'A2', aceite: 'Mineral', estado: 'prohibido', uso: 'Componente de mezclas antiguas', sustitutos: ['R-134a', 'R-227ea'] },
  { id: 'R-401A', nombre: 'R-401A (MP39)', familia: 'HCFC', gwp: 1182, odp: 0.027, seguridad: 'A1', aceite: 'Alquilbenceno', estado: 'prohibido', uso: 'Retrofit de R-12', sustitutos: ['R-134a', 'R-513A', 'R-450A'] },
  { id: 'R-402A', nombre: 'R-402A (HP80)', familia: 'HCFC', gwp: 2788, odp: 0.013, seguridad: 'A1', aceite: 'Alquilbenceno', estado: 'prohibido', uso: 'Retrofit de R-502', sustitutos: ['R-448A', 'R-449A'] },
  { id: 'R-403B', nombre: 'R-403B', familia: 'HCFC', gwp: 4457, odp: 0.028, seguridad: 'A1', aceite: 'Alquilbenceno', estado: 'prohibido', uso: 'Retrofit de R-502', sustitutos: ['R-448A', 'R-449A'] },
  { id: 'R-408A', nombre: 'R-408A (FX10)', familia: 'HCFC', gwp: 3152, odp: 0.016, seguridad: 'A1', aceite: 'Alquilbenceno / POE', estado: 'prohibido', uso: 'Retrofit de R-502', sustitutos: ['R-448A', 'R-449A', 'R-407F'] },
  { id: 'R-409A', nombre: 'R-409A (FX56)', familia: 'HCFC', gwp: 1585, odp: 0.039, seguridad: 'A1', aceite: 'Alquilbenceno', estado: 'prohibido', uso: 'Retrofit de R-12', sustitutos: ['R-134a', 'R-513A'] },
  { id: 'R-401B', nombre: 'R-401B (MP66)', familia: 'HCFC', gwp: 1288, odp: 0.04, seguridad: 'A1', aceite: 'Alquilbenceno', estado: 'prohibido', uso: 'Retrofit de R-12 en transporte y baja temperatura', sustitutos: ['R-134a', 'R-513A'] },

  // ── HFC de GWP alto — restringidos ───────────────────────────────────────
  { id: 'R-23', nombre: 'R-23 (HFC-23)', familia: 'HFC', gwp: 14800, odp: 0, seguridad: 'A1', aceite: 'POE', estado: 'restringido', uso: 'Etapa baja de cascada, muy baja temperatura', sustitutos: ['R-170', 'R-744', 'R-469A'] },
  { id: 'R-125', nombre: 'R-125 (HFC-125)', familia: 'HFC', gwp: 3500, odp: 0, seguridad: 'A1', aceite: 'POE', estado: 'restringido', uso: 'Componente de mezclas', sustitutos: ['R-32', 'R-454B'] },
  { id: 'R-143a', nombre: 'R-143a (HFC-143a)', familia: 'HFC', gwp: 4470, odp: 0, seguridad: 'A2L', aceite: 'POE', estado: 'restringido', uso: 'Componente del R-404A y R-507A', sustitutos: ['R-32', 'R-454C'] },
  { id: 'R-404A', nombre: 'R-404A', familia: 'HFC', gwp: 3922, odp: 0, seguridad: 'A1', aceite: 'POE', estado: 'restringido', uso: 'Frío comercial de media y baja temperatura', sustitutos: ['R-448A', 'R-449A', 'R-452A', 'R-454C', 'R-455A', 'R-744', 'R-290'] },
  { id: 'R-507A', nombre: 'R-507A', familia: 'HFC', gwp: 3985, odp: 0, seguridad: 'A1', aceite: 'POE', estado: 'restringido', uso: 'Frío comercial de baja temperatura', sustitutos: ['R-448A', 'R-449A', 'R-452A', 'R-454C', 'R-455A'] },
  { id: 'R-508B', nombre: 'R-508B (Suva 95)', familia: 'HFC', gwp: 13396, odp: 0, seguridad: 'A1', aceite: 'POE', estado: 'restringido', uso: 'Etapa baja de cascada', sustitutos: ['R-170', 'R-744', 'R-469A'] },
  { id: 'R-469A', nombre: 'R-469A', familia: 'HFC', gwp: 1357, odp: 0, seguridad: 'A1', aceite: 'POE', estado: 'restringido', uso: 'Muy baja temperatura, sustituto del R-23 y del R-508B', nota: 'Mezcla de CO₂, R-32 y R-125: trabaja a presiones altas. Consulta la ficha del fabricante.', sustitutos: ['R-170', 'R-744'] },
  { id: 'R-410A', nombre: 'R-410A', familia: 'HFC', gwp: 2088, odp: 0, seguridad: 'A1', aceite: 'POE', estado: 'restringido', uso: 'Climatización split, multisplit y VRF', sustitutos: ['R-32', 'R-454B', 'R-452B'] },
  { id: 'R-407A', nombre: 'R-407A', familia: 'HFC', gwp: 2107, odp: 0, seguridad: 'A1', aceite: 'POE', estado: 'restringido', uso: 'Frío comercial, sustituto del R-404A', sustitutos: ['R-448A', 'R-449A', 'R-454C'] },
  { id: 'R-407C', nombre: 'R-407C', familia: 'HFC', gwp: 1774, odp: 0, seguridad: 'A1', aceite: 'POE', estado: 'restringido', uso: 'Retrofit de R-22 en climatización', sustitutos: ['R-449A', 'R-32', 'R-454B'] },
  { id: 'R-407F', nombre: 'R-407F (Performax LT)', familia: 'HFC', gwp: 1825, odp: 0, seguridad: 'A1', aceite: 'POE', estado: 'restringido', uso: 'Frío comercial, sustituto del R-404A', sustitutos: ['R-448A', 'R-449A', 'R-454C'] },
  { id: 'R-407H', nombre: 'R-407H', familia: 'HFC', gwp: 1495, odp: 0, seguridad: 'A1', aceite: 'POE', estado: 'restringido', uso: 'Frío comercial de GWP reducido', sustitutos: ['R-454C', 'R-455A'] },
  { id: 'R-417A', nombre: 'R-417A (ISCEON MO59)', familia: 'HFC', gwp: 2346, odp: 0, seguridad: 'A1', aceite: 'Mineral / POE', estado: 'restringido', uso: 'Retrofit directo de R-22', sustitutos: ['R-449A', 'R-32'] },
  { id: 'R-422A', nombre: 'R-422A (ISCEON MO79)', familia: 'HFC', gwp: 3143, odp: 0, seguridad: 'A1', aceite: 'Mineral / POE', estado: 'restringido', uso: 'Retrofit de R-22 en baja temperatura', sustitutos: ['R-449A', 'R-454C'] },
  { id: 'R-422D', nombre: 'R-422D (ISCEON MO29)', familia: 'HFC', gwp: 2729, odp: 0, seguridad: 'A1', aceite: 'Mineral / POE', estado: 'restringido', uso: 'Retrofit directo de R-22', sustitutos: ['R-449A', 'R-32'] },
  { id: 'R-424A', nombre: 'R-424A (RS-44)', familia: 'HFC', gwp: 2440, odp: 0, seguridad: 'A1', aceite: 'Mineral / POE', estado: 'restringido', uso: 'Retrofit de R-22', sustitutos: ['R-449A', 'R-454B'] },
  { id: 'R-427A', nombre: 'R-427A (Forane FX100)', familia: 'HFC', gwp: 2138, odp: 0, seguridad: 'A1', aceite: 'POE', estado: 'restringido', uso: 'Retrofit de R-22', sustitutos: ['R-449A', 'R-32'] },
  { id: 'R-438A', nombre: 'R-438A (ISCEON MO99)', familia: 'HFC', gwp: 2265, odp: 0, seguridad: 'A1', aceite: 'Mineral / POE', estado: 'restringido', uso: 'Retrofit directo de R-22', sustitutos: ['R-449A', 'R-454C'] },
  { id: 'R-413A', nombre: 'R-413A (ISCEON MO49)', familia: 'HFC', gwp: 2053, odp: 0, seguridad: 'A1', aceite: 'Mineral / alquilbenceno / POE', estado: 'restringido', uso: 'Retrofit de R-12', sustitutos: ['R-134a', 'R-513A'] },
  { id: 'R-417B', nombre: 'R-417B (NU-22B)', familia: 'HFC', gwp: 3027, odp: 0, seguridad: 'A1', aceite: 'Mineral / alquilbenceno / POE', estado: 'restringido', uso: 'Retrofit de R-22 en baja temperatura', sustitutos: ['R-449A', 'R-448A'] },
  { id: 'R-453A', nombre: 'R-453A (RS-70)', familia: 'HFC', gwp: 1765, odp: 0, seguridad: 'A1', aceite: 'POE', estado: 'restringido', uso: 'Retrofit de R-22 en media temperatura', sustitutos: ['R-449A', 'R-454B'] },
  { id: 'R-134a', nombre: 'R-134a (HFC-134a)', familia: 'HFC', gwp: 1430, odp: 0, seguridad: 'A1', aceite: 'POE', estado: 'restringido', uso: 'Frío comercial de media temperatura, enfriadoras, automoción', sustitutos: ['R-513A', 'R-450A', 'R-1234yf', 'R-515B'] },
  { id: 'R-227ea', nombre: 'R-227ea (HFC-227ea)', familia: 'HFC', gwp: 3220, odp: 0, seguridad: 'A1', aceite: 'POE', estado: 'restringido', uso: 'Extinción y aplicaciones especiales', sustitutos: ['R-1233zd(E)'] },
  { id: 'R-236fa', nombre: 'R-236fa (HFC-236fa)', familia: 'HFC', gwp: 9810, odp: 0, seguridad: 'A1', aceite: 'POE', estado: 'restringido', uso: 'Bombas de calor de alta temperatura', sustitutos: ['R-1336mzz(Z)', 'R-1233zd(E)'] },

  // ── HFC de GWP bajo — vigentes ───────────────────────────────────────────
  { id: 'R-32', nombre: 'R-32 (HFC-32)', familia: 'HFC', gwp: 675, odp: 0, seguridad: 'A2L', aceite: 'POE', estado: 'vigente', uso: 'Climatización split y multisplit actual', nota: 'A2L: levemente inflamable. Hay carga máxima según el volumen del local (UNE-EN 378).', sustitutos: ['R-454B', 'R-452B', 'R-290'] },
  { id: 'R-152a', nombre: 'R-152a (HFC-152a)', familia: 'HFC', gwp: 124, odp: 0, seguridad: 'A2', aceite: 'POE', estado: 'vigente', uso: 'Aplicaciones especiales', sustitutos: ['R-1234yf', 'R-290'] },

  // ── HFO y mezclas con HFO ────────────────────────────────────────────────
  { id: 'R-1234yf', nombre: 'R-1234yf (HFO)', familia: 'HFO', gwp: 4, odp: 0, seguridad: 'A2L', aceite: 'POE', estado: 'vigente', uso: 'Automoción, enfriadoras, frío comercial', sustitutos: ['R-1234ze(E)', 'R-290'] },
  { id: 'R-1234ze(E)', nombre: 'R-1234ze(E) (HFO)', familia: 'HFO', gwp: 7, odp: 0, seguridad: 'A2L', aceite: 'POE', estado: 'vigente', uso: 'Enfriadoras y bombas de calor', sustitutos: ['R-1234yf', 'R-515B'] },
  { id: 'R-1233zd(E)', nombre: 'R-1233zd(E) (HFO)', familia: 'HFO', gwp: 1, odp: 0, seguridad: 'A1', aceite: 'POE', estado: 'vigente', uso: 'Enfriadoras centrífugas de baja presión', sustitutos: ['R-514A', 'R-1336mzz(Z)'] },
  { id: 'R-1336mzz(Z)', nombre: 'R-1336mzz(Z) (HFO)', familia: 'HFO', gwp: 2, odp: 0, seguridad: 'A1', aceite: 'POE', estado: 'vigente', uso: 'Bombas de calor de alta temperatura', sustitutos: ['R-1233zd(E)'] },
  { id: 'R-448A', nombre: 'R-448A (Solstice N40)', familia: 'HFO', gwp: 1387, odp: 0, seguridad: 'A1', aceite: 'POE', estado: 'restringido', uso: 'Sustituto del R-404A en frío comercial', sustitutos: ['R-454C', 'R-455A', 'R-744'] },
  { id: 'R-449A', nombre: 'R-449A (Opteon XP40)', familia: 'HFO', gwp: 1397, odp: 0, seguridad: 'A1', aceite: 'POE', estado: 'restringido', uso: 'Sustituto del R-404A y del R-22', sustitutos: ['R-454C', 'R-455A', 'R-744'] },
  { id: 'R-449B', nombre: 'R-449B', familia: 'HFO', gwp: 1412, odp: 0, seguridad: 'A1', aceite: 'POE', estado: 'restringido', uso: 'Sustituto del R-404A y del R-507A en frío comercial', sustitutos: ['R-454C', 'R-455A', 'R-744'] },
  { id: 'R-450A', nombre: 'R-450A (Solstice N13)', familia: 'HFO', gwp: 605, odp: 0, seguridad: 'A1', aceite: 'POE', estado: 'vigente', uso: 'Sustituto del R-134a', sustitutos: ['R-513A', 'R-515B', 'R-1234ze(E)'] },
  { id: 'R-456A', nombre: 'R-456A', familia: 'HFO', gwp: 687, odp: 0, seguridad: 'A1', aceite: 'POE', estado: 'vigente', uso: 'Sustituto del R-134a', sustitutos: ['R-513A', 'R-1234ze(E)'] },
  { id: 'R-452A', nombre: 'R-452A (Opteon XP44)', familia: 'HFO', gwp: 2140, odp: 0, seguridad: 'A1', aceite: 'POE', estado: 'restringido', uso: 'Transporte frigorífico, sustituto del R-404A', sustitutos: ['R-454C', 'R-455A'] },
  { id: 'R-452B', nombre: 'R-452B (Opteon XL55)', familia: 'HFO', gwp: 698, odp: 0, seguridad: 'A2L', aceite: 'POE', estado: 'vigente', uso: 'Sustituto del R-410A en climatización', sustitutos: ['R-454B', 'R-32'] },
  { id: 'R-454A', nombre: 'R-454A (Opteon XL40)', familia: 'HFO', gwp: 238, odp: 0, seguridad: 'A2L', aceite: 'POE', estado: 'vigente', uso: 'Frío comercial de media y baja temperatura', sustitutos: ['R-454C', 'R-455A'] },
  { id: 'R-454B', nombre: 'R-454B (Opteon XL41)', familia: 'HFO', gwp: 466, odp: 0, seguridad: 'A2L', aceite: 'POE', estado: 'vigente', uso: 'Sustituto del R-410A en split y bomba de calor', sustitutos: ['R-32', 'R-452B', 'R-290'] },
  { id: 'R-454C', nombre: 'R-454C (Opteon XL20)', familia: 'HFO', gwp: 148, odp: 0, seguridad: 'A2L', aceite: 'POE', estado: 'vigente', uso: 'Frío comercial, sustituto del R-404A', sustitutos: ['R-455A', 'R-290', 'R-744'] },
  { id: 'R-455A', nombre: 'R-455A (Solstice L40X)', familia: 'HFO', gwp: 148, odp: 0, seguridad: 'A2L', aceite: 'POE', estado: 'vigente', uso: 'Frío comercial, sustituto del R-404A', sustitutos: ['R-454C', 'R-290', 'R-744'] },
  { id: 'R-468A', nombre: 'R-468A', familia: 'HFO', gwp: 148, odp: 0, seguridad: 'A2L', aceite: 'POE', estado: 'vigente', uso: 'Sustituto del R-410A de GWP muy bajo', sustitutos: ['R-454B', 'R-290'] },
  { id: 'R-471A', nombre: 'R-471A', familia: 'HFO', gwp: 148, odp: 0, seguridad: 'A1', aceite: 'POE', estado: 'vigente', uso: 'Frío comercial de media temperatura, no inflamable', sustitutos: ['R-455A', 'R-454C'] },
  { id: 'R-513A', nombre: 'R-513A (Opteon XP10)', familia: 'HFO', gwp: 631, odp: 0, seguridad: 'A1', aceite: 'POE', estado: 'vigente', uso: 'Sustituto del R-134a', sustitutos: ['R-450A', 'R-515B', 'R-1234yf'] },
  { id: 'R-514A', nombre: 'R-514A (Opteon XP30)', familia: 'HFO', gwp: 2, odp: 0, seguridad: 'B1', aceite: 'POE', estado: 'vigente', uso: 'Enfriadoras de baja presión, sustituto del R-123', sustitutos: ['R-1233zd(E)'] },
  { id: 'R-515B', nombre: 'R-515B', familia: 'HFO', gwp: 293, odp: 0, seguridad: 'A1', aceite: 'POE', estado: 'vigente', uso: 'Sustituto del R-134a, no inflamable', sustitutos: ['R-513A', 'R-1234ze(E)'] },
  { id: 'R-459A', nombre: 'R-459A', familia: 'HFO', gwp: 460, odp: 0, seguridad: 'A2L', aceite: 'POE', estado: 'vigente', uso: 'Sustituto del R-410A de GWP bajo', sustitutos: ['R-454B', 'R-32'] },
  { id: 'R-466A', nombre: 'R-466A (Solstice N41)', familia: 'HFO', gwp: 733, odp: 0, seguridad: 'A1', aceite: 'POE', estado: 'vigente', uso: 'Sustituto del R-410A, no inflamable', nota: 'Contiene CF₃I; consulta la disponibilidad y la aprobación del fabricante del equipo.', sustitutos: ['R-454B', 'R-32'] },
  { id: 'R-516A', nombre: 'R-516A', familia: 'HFO', gwp: 142, odp: 0, seguridad: 'A2L', aceite: 'POE', estado: 'vigente', uso: 'Sustituto del R-134a de GWP muy bajo', sustitutos: ['R-1234ze(E)', 'R-513A'] },

  // ── Naturales ────────────────────────────────────────────────────────────
  { id: 'R-290', nombre: 'R-290 (Propano)', familia: 'Natural (HC)', gwp: 3, odp: 0, seguridad: 'A3', aceite: 'Mineral / POE', estado: 'vigente', uso: 'Equipos compactos, bombas de calor, frío comercial', nota: 'A3: inflamable. Carga máxima limitada según la UNE-EN 378 y el tipo de local.', sustitutos: ['R-1270', 'R-600a'] },
  { id: 'R-600a', nombre: 'R-600a (Isobutano)', familia: 'Natural (HC)', gwp: 3, odp: 0, seguridad: 'A3', aceite: 'Mineral / POE', estado: 'vigente', uso: 'Frío doméstico y pequeño comercial', nota: 'A3: inflamable.', sustitutos: ['R-290'] },
  { id: 'R-1270', nombre: 'R-1270 (Propileno)', familia: 'Natural (HC)', gwp: 2, odp: 0, seguridad: 'A3', aceite: 'Mineral / POE', estado: 'vigente', uso: 'Frío industrial compacto', nota: 'A3: inflamable.', sustitutos: ['R-290'] },
  { id: 'R-170', nombre: 'R-170 (Etano)', familia: 'Natural (HC)', gwp: 6, odp: 0, seguridad: 'A3', aceite: 'POE', estado: 'vigente', uso: 'Etapa baja de cascada, muy baja temperatura', nota: 'A3: inflamable.', sustitutos: ['R-744', 'R-1150'] },
  { id: 'R-1150', nombre: 'R-1150 (Etileno)', familia: 'Natural (HC)', gwp: 4, odp: 0, seguridad: 'A3', aceite: 'POE', estado: 'vigente', uso: 'Muy baja temperatura', nota: 'A3: inflamable.', sustitutos: ['R-170'] },
  { id: 'R-717', nombre: 'R-717 (Amoniaco, NH₃)', familia: 'Natural', gwp: 0, odp: 0, seguridad: 'B2L', aceite: 'Mineral / PAO', estado: 'vigente', uso: 'Frío industrial de gran potencia', nota: 'B2L: tóxico y levemente inflamable. Exige sala de máquinas específica, detección y ventilación de emergencia.', sustitutos: ['R-744'] },
  { id: 'R-744', nombre: 'R-744 (CO₂)', familia: 'Natural', gwp: 1, odp: 0, seguridad: 'A1', aceite: 'POE', estado: 'vigente', uso: 'Supermercados, transcrítico y cascada', nota: 'Trabaja a presiones muy altas: exige componentes y herramientas específicos.', sustitutos: ['R-717', 'R-290'] },
  { id: 'R-718', nombre: 'R-718 (Agua)', familia: 'Natural', gwp: 0, odp: 0, seguridad: 'A1', aceite: '—', estado: 'vigente', uso: 'Máquinas de absorción y enfriamiento evaporativo', sustitutos: [] },

  // ── Comodín ──────────────────────────────────────────────────────────────
  { id: 'otro', nombre: 'Otro (escribirlo a mano)', familia: 'Otro', gwp: null, odp: null, seguridad: '—', aceite: '—', estado: 'vigente', uso: 'Para lo que no esté en la lista', sustitutos: [] },
];

/** Las familias, en el orden en que conviene enseñarlas. */
export const FAMILIAS_GAS = ['CFC', 'HCFC', 'HFC', 'HFO', 'Natural (HC)', 'Natural', 'Otro'];

/** Un gas por su identificador. */
export function buscarRefrigerante(id) {
  if (!id) return null;
  return REFRIGERANTES.find((r) => r.id === id) || null;
}

/** Los gases agrupados por familia, para pintar el desplegable por bloques. */
export function porFamilia() {
  return FAMILIAS_GAS
    .map((f) => ({ familia: f, gases: REFRIGERANTES.filter((r) => r.familia === f) }))
    .filter((g) => g.gases.length > 0);
}

/** A qué se puede pasar desde este gas, con su ficha completa. */
export function sustitutosDe(id) {
  const r = buscarRefrigerante(id);
  if (!r) return [];
  return (r.sustitutos || []).map(buscarRefrigerante).filter(Boolean);
}

/** ¿Es un gas que ya no se puede usar? */
export function estaProhibido(id) {
  return buscarRefrigerante(id)?.estado === 'prohibido';
}

/**
 * Toneladas equivalentes de CO₂ de una carga, que es el número por el que se
 * decide cada cuánto hay que revisar fugas.
 *
 * @param {string} id      identificador del gas
 * @param {number} kilos   carga en kilogramos
 * @returns {number|null}  toneladas de CO₂ equivalente, o null si no se sabe
 */
export function toneladasCO2(id, kilos) {
  const gwp = buscarRefrigerante(id)?.gwp;
  const kg = Number(kilos);
  if (!gwp || !Number.isFinite(kg) || kg <= 0) return null;
  return Math.round((gwp * kg) / 1000 * 100) / 100;
}

/**
 * Cada cuánto hay que comprobar fugas, según las toneladas de CO₂ equivalente.
 *
 * Los umbrales son los del Reglamento (UE) 2024/573 para equipos que contienen
 * gases fluorados. Con detector de fugas instalado, el plazo se duplica.
 * Los equipos herméticamente sellados de menos de 10 t CO₂e y los que llevan
 * menos de 5 t CO₂e quedan fuera de la obligación.
 */
export function periodicidadFugas(toneladas) {
  const t = Number(toneladas);
  if (!Number.isFinite(t) || t <= 0) return null;
  if (t < 5) return 'Sin obligación de control periódico de fugas (menos de 5 t CO₂e).';
  if (t < 50) return 'Control de fugas al menos cada 12 meses (cada 24 con detector de fugas instalado).';
  if (t < 500) return 'Control de fugas al menos cada 6 meses (cada 12 con detector de fugas instalado).';
  return 'Control de fugas al menos cada 3 meses (cada 6 con detector de fugas instalado). Obligatorio instalar sistema de detección de fugas.';
}
