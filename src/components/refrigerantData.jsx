// Datos de gases refrigerantes para los selectores, los informes y los avisos de mantenimiento.
//
// Ya no hay una lista aparte escrita a mano: se construye a partir del catálogo único
// (`src/lib/refrigerantes.js`) y de las fichas de conversión (`src/lib/equivalenciasGases.js`), de modo que
// el PCA (GWP), el estado legal, el aceite y los sustitutos son los mismos en todo el programa.
//
// Fechas: solo se escribe una fecha de prohibición cuando es firme y está en un reglamento:
//   · CFC: producción prohibida en la UE desde el 1 de enero de 1995 (Reglamento (CEE) 3093/94).
//   · HCFC: desde el 1 de enero de 2015 está prohibido TODO uso en mantenimiento, también el gas reciclado
//     o regenerado (Reglamento (CE) 1005/2009, art. 11; el gas virgen ya lo estaba desde 2010).
//   · HFC: no hay una fecha única: las prohibiciones van por tipo de equipo (Reglamento (UE) 2024/573).
import { REFRIGERANTES, buscarRefrigerante } from '@/lib/refrigerantes';
import { sustitucionesDe } from '@/lib/equivalenciasGases';

const FECHA_CFC = '1995-01-01';
const FECHA_HCFC = '2015-01-01';

function categoria(r) {
  if (r.estado === 'prohibido') return 'antiguo';
  if (String(r.familia).startsWith('Natural')) return 'natural';
  if (r.estado === 'restringido') return 'transicion';
  // HFO puros (un solo componente): R-1234yf, R-1234ze(E), R-1233zd(E), R-1336mzz(Z)
  if (/^R-1(23[3-4]|336)/.test(r.id)) return 'futuro';
  return 'moderno';
}

function estadoLegal(r) {
  if (r.familia === 'CFC') {
    return { fecha: FECHA_CFC, texto: 'Prohibido: producción prohibida en la UE desde 1995 y sin uso permitido (sustancia que agota el ozono)' };
  }
  if (r.familia === 'HCFC') {
    return { fecha: FECHA_HCFC, texto: 'Prohibido en mantenimiento desde 2015, también el gas reciclado o regenerado (Reglamento (CE) 1005/2009)' };
  }
  if (r.estado === 'prohibido') return { fecha: null, texto: 'Prohibido' };
  if (r.estado === 'restringido') {
    return { fecha: null, texto: 'Restringido: cuotas de producción y prohibiciones por tipo de equipo (Reglamento (UE) 2024/573)' };
  }
  return { fecha: null, texto: 'Permitido' };
}

function cambioDeEquipo(id) {
  const fichas = sustitucionesDe(id).filter((s) => !s.prohibido);
  if (fichas.some((s) => s.tipo === 'directo')) return 'SÍ - hay sustitución directa (ver Equivalencias de gases)';
  if (fichas.some((s) => s.tipo === 'conversion')) return 'Con cambios - ver Equivalencias de gases';
  if (fichas.length) return 'NO - solo en equipo nuevo';
  return 'NO - sin conversión conocida';
}

export const REFRIGERANT_DATABASE = REFRIGERANTES.filter((r) => r.id !== 'otro').map((r) => {
  const legal = estadoLegal(r);
  return {
    code: r.id,
    name: r.nombre,
    category: categoria(r),
    type: r.familia,
    replacement: (r.sustitutos || []).join(', '),
    compressor_oil: r.aceite,
    retrofit_type: cambioDeEquipo(r.id),
    can_mix: false, // nunca se mezclan gases
    notes: r.nota || r.uso || '',
    ozone_depletion: r.odp ?? 0,
    gwp: r.gwp ?? 0,
    fgas_ban_date: legal.fecha,
    fgas_status: legal.texto,
    safety: r.seguridad,
  };
});

/** Gases que se pueden ofrecer para instalaciones nuevas (sin los prohibidos). */
export const CODIGOS_USABLES = REFRIGERANT_DATABASE.filter((r) => r.category !== 'antiguo').map((r) => r.code);

const usan = (patron) => REFRIGERANTES.filter((r) => r.id !== 'otro' && r.id !== 'R-744' && patron.test(r.aceite || '')).map((r) => r.id);

export const OIL_TYPES = {
  Mineral: {
    name: 'Mineral (nafténico)',
    compatibility: usan(/mineral/i),
    notes: 'Aceite mineral tradicional. No es miscible con los HFC y HFO puros.',
    cost: 'Muy bajo',
  },
  POE: {
    name: 'POE (éster de poliol)',
    compatibility: usan(/POE/),
    notes: 'Aceite sintético. Absorbe la humedad del aire con facilidad: no dejes el circuito abierto y cambia el filtro deshidratador.',
    cost: 'Alto',
  },
  PAO: {
    name: 'PAO (polialfaolefina)',
    compatibility: usan(/PAO/),
    notes: 'Aceite sintético, más estable que el mineral. Habitual con amoniaco e hidrocarburos.',
    cost: 'Medio-alto',
  },
  'CO2-POE': {
    name: 'Aceite especial para CO₂',
    compatibility: ['R-744'],
    notes: 'Aceite sintético preparado para las presiones extremas del CO₂. Usa el que indique el fabricante del compresor.',
    cost: 'Muy alto',
  },
};

export function getRefrigerantInfo(code) {
  return REFRIGERANT_DATABASE.find((r) => r.code === code) || null;
}

/** Códigos de los gases a los que se puede pasar desde `code` (los que cita el catálogo). */
export function getReplacementGases(code) {
  const actual = getRefrigerantInfo(code);
  if (!actual || !actual.replacement) return [];
  return actual.replacement.split(', ').filter((id) => buscarRefrigerante(id));
}

export function getCompatibleOils(code) {
  return Object.entries(OIL_TYPES)
    .filter(([, oil]) => oil.compatibility.includes(code))
    .map(([key, oil]) => ({ key, ...oil }));
}

/**
 * Estado legal de un gas: si está prohibido y si admite gas reciclado.
 * Desde 2015 no se admite ni reciclado ni regenerado de ningún gas prohibido (CFC y HCFC).
 */
export function estadoRefrigerante(code) {
  const r = getRefrigerantInfo(code);
  if (!r) return { prohibido: false, reciclado: null, motivo: '' };
  const prohibido = r.category === 'antiguo';
  return { prohibido, reciclado: prohibido ? 'no' : null, motivo: r.fgas_status };
}
