// Datos completos de gases refrigerantes con información de sustitución, aceites y retrofit
export const REFRIGERANT_DATABASE = [
  // Gases antiguos (CFC y HCFC)
  {
    code: 'R-11',
    name: 'R-11 (CFC - Prohibido)',
    category: 'antiguo',
    type: 'CFC',
    replacement: 'R-123 o R-134a',
    compressor_oil: 'Mineral (Naphthenic)',
    retrofit_type: 'NO - Cambio completo necesario',
    can_mix: false,
    notes: 'Completamente prohibido. Requiere cambio de equipo o retrofit completo con extracción de aceite antiguo',
    ozone_depletion: 1.0,
    gwp: 0
  },
  {
    code: 'R-12',
    name: 'R-12 (CFC - Prohibido)',
    category: 'antiguo',
    type: 'CFC',
    replacement: 'R-134a',
    compressor_oil: 'Mineral (Naphthenic)',
    retrofit_type: 'NO - Cambio completo necesario',
    can_mix: false,
    notes: 'Prohibido desde 1995. Cambio total de equipo o aceite PAO + limpieza de sistema',
    ozone_depletion: 1.0,
    gwp: 10200
  },
  {
    code: 'R-22',
    name: 'R-22 (HCFC - Prohibido 2020)',
    category: 'antiguo',
    type: 'HCFC',
    replacement: 'R-410A, R-407C, R-32, R-452A, R-290',
    compressor_oil: 'Mineral o PAO (según equipo)',
    retrofit_type: 'NO - Cambio completo necesario',
    can_mix: false,
    notes: 'Prohibido desde enero 2020. Requiere cambio total de compresor y tuberías. Extracción completa de aceite mineral',
    ozone_depletion: 0.055,
    gwp: 1810
  },
  {
    code: 'R-502',
    name: 'R-502 (Mezcla - Prohibido)',
    category: 'antiguo',
    type: 'CFC/HCFC',
    replacement: 'R-407A, R-404A, R-448A',
    compressor_oil: 'Mineral',
    retrofit_type: 'NO - Cambio completo',
    can_mix: false,
    notes: 'Mezcla de R-22 + R-115. Prohibido. Cambio total necesario',
    ozone_depletion: 0.33,
    gwp: 4657
  },

  // Gases HCFC (transitorios, siendo eliminados)
  {
    code: 'R-407C',
    name: 'R-407C (HCFC - Transición)',
    category: 'transicion',
    type: 'HCFC',
    replacement: 'R-32, R-452A, R-449A',
    compressor_oil: 'POE (Polyol Ester)',
    retrofit_type: 'RETROFIT posible desde R-22',
    can_mix: true,
    notes: 'Sustituto directo de R-22. Compatible con POE. Deslizamiento de temperatura ~8°C',
    ozone_depletion: 0.0,
    gwp: 1626
  },

  // Gases HFC (siendo eliminados - F-Gas)
  {
    code: 'R-134a',
    name: 'R-134a (HFC)',
    category: 'transicion',
    type: 'HFC',
    replacement: 'R-1234yf, R-32',
    compressor_oil: 'POE (Polyol Ester) obligatorio',
    retrofit_type: 'NO desde R-22 o R-11',
    can_mix: false,
    notes: 'Requiere cambio completo de aceite (POE). No miscible con aceite mineral. Fue común en automoción',
    ozone_depletion: 0.0,
    gwp: 1430
  },
  {
    code: 'R-404A',
    name: 'R-404A (HFC)',
    category: 'transicion',
    type: 'HFC',
    replacement: 'R-448A, R-449A, R-452A',
    compressor_oil: 'POE (Polyol Ester)',
    retrofit_type: 'NO desde gases antiguos',
    can_mix: false,
    notes: 'Prohibido en equipos nuevos desde 2020. Aún permitido para mantenimiento hasta 2030',
    ozone_depletion: 0.0,
    gwp: 3922
  },

  // Gases HFO (Bajo GWP - Nuevas generaciones)
  {
    code: 'R-32',
    name: 'R-32 (HFC - Bajo GWP)',
    category: 'moderno',
    type: 'HFC-32',
    replacement: 'Alternativa moderna a R-410A',
    compressor_oil: 'POE (Polyol Ester)',
    retrofit_type: 'SI - Directo desde R-410A',
    can_mix: false,
    notes: 'Mayor eficiencia que R-410A. Ligeramente inflamable (A2L). Cambio de compresor recomendado pero no obligatorio',
    ozone_depletion: 0.0,
    gwp: 675
  },
  {
    code: 'R-410A',
    name: 'R-410A (HFC)',
    category: 'moderno',
    type: 'HFC',
    replacement: 'R-32, R-452A, R-449A',
    compressor_oil: 'POE (Polyol Ester)',
    retrofit_type: 'SI - Directo a R-32',
    can_mix: false,
    notes: 'Muy común en aires acondicionados. Presiones más altas que R-22. Requiere POE siempre',
    ozone_depletion: 0.0,
    gwp: 2088
  },

  // Gases HFO (Ultra bajo GWP - Futuro)
  {
    code: 'R-1234yf',
    name: 'R-1234yf (HFO)',
    category: 'futuro',
    type: 'HFO',
    replacement: 'Alternativa ultra-ecológica',
    compressor_oil: 'POE (Polyol Ester)',
    retrofit_type: 'NO - Cambio completo',
    can_mix: false,
    notes: 'GWP muy bajo (4). Inflamable (A2L). Caro. Futuro estándar en automoción',
    ozone_depletion: 0.0,
    gwp: 4
  },
  {
    code: 'R-1234ze',
    name: 'R-1234ze (HFO)',
    category: 'futuro',
    type: 'HFO',
    replacement: 'Alternativa para equipos grandes',
    compressor_oil: 'POE (Polyol Ester)',
    retrofit_type: 'NO - Cambio completo',
    can_mix: false,
    notes: 'GWP = 6. No inflamable. Eficiencia similar a R-134a pero ecológico',
    ozone_depletion: 0.0,
    gwp: 6
  },

  // Gases de cuarta generación (HFC-HFO blend)
  {
    code: 'R-448A',
    name: 'R-448A (HFC/HFO)',
    category: 'moderno',
    type: 'HFC/HFO',
    replacement: 'Sustituto R-404A',
    compressor_oil: 'POE (Polyol Ester)',
    retrofit_type: 'SI - Directo desde R-404A',
    can_mix: false,
    notes: 'Drop-in para R-404A. GWP 48% menor. Cambio mínimo de aceite. Muy recomendado',
    ozone_depletion: 0.0,
    gwp: 1387
  },
  {
    code: 'R-449A',
    name: 'R-449A (HFC/HFO)',
    category: 'moderno',
    type: 'HFC/HFO',
    replacement: 'Sustituto R-404A/R-22',
    compressor_oil: 'POE (Polyol Ester)',
    retrofit_type: 'SI - Directo desde R-404A',
    can_mix: false,
    notes: 'Alternativa R-448A con ligeramente menor GWP. Drop-in compatible',
    ozone_depletion: 0.0,
    gwp: 1397
  },
  {
    code: 'R-452A',
    name: 'R-452A (HFC/HFO)',
    category: 'moderno',
    type: 'HFC/HFO',
    replacement: 'Sustituto R-410A',
    compressor_oil: 'POE (Polyol Ester)',
    retrofit_type: 'SI - Directo desde R-410A',
    can_mix: false,
    notes: 'Drop-in para R-410A con 65% menos GWP. Compatible con sistemas existentes',
    ozone_depletion: 0.0,
    gwp: 2141
  },

  // Gases naturales
  {
    code: 'R-290',
    name: 'R-290 (Propano - Natural)',
    category: 'natural',
    type: 'Hidrocarburo',
    replacement: 'Alternativa ecológica',
    compressor_oil: 'POE o Mineral (según equipo)',
    retrofit_type: 'NO - Cambio completo',
    can_mix: false,
    notes: 'GWP = 3. Inflamable (A3). Requiere seguridad especial. Excelente eficiencia. Caro a instalar',
    ozone_depletion: 0.0,
    gwp: 3
  },
  {
    code: 'R-600a',
    name: 'R-600a (Isobutano - Natural)',
    category: 'natural',
    type: 'Hidrocarburo',
    replacement: 'Para pequeños equipos',
    compressor_oil: 'Mineral o POE',
    retrofit_type: 'NO - Cambio completo',
    can_mix: false,
    notes: 'GWP = 3. Inflamable. Usado en frigoríficos domésticos. Menor eficiencia',
    ozone_depletion: 0.0,
    gwp: 3
  },
  {
    code: 'R-744',
    name: 'R-744 (CO2 - Natural)',
    category: 'natural',
    type: 'Gas natural',
    replacement: 'Alternativa segura y ecológica',
    compressor_oil: 'POE especial para CO2',
    retrofit_type: 'NO - Cambio completo',
    can_mix: false,
    notes: 'GWP = 1. Presiones muy altas (>70 bar). Requiere compresor especial. Excelente seguridad',
    ozone_depletion: 0.0,
    gwp: 1
  }
];

export const OIL_TYPES = {
  'Mineral': {
    name: 'Mineral (Naphthenic)',
    compatibility: ['R-11', 'R-12', 'R-22', 'R-502'],
    notes: 'Aceite mineral tradicional. Incompatible con HFC/HFO puro',
    cost: 'Muy bajo'
  },
  'POE': {
    name: 'POE (Polyol Ester)',
    compatibility: ['R-134a', 'R-407C', 'R-410A', 'R-32', 'R-404A', 'R-448A', 'R-449A', 'R-452A', 'R-290', 'R-1234yf', 'R-1234ze'],
    notes: 'Aceite sintético. Absorbe agua fácilmente. Requiere filtros deshidratadores frecuentes',
    cost: 'Alto'
  },
  'PAO': {
    name: 'PAO (Polyalphaolefin)',
    compatibility: ['R-22', 'R-290', 'R-600a'],
    notes: 'Aceite sintético alternativo. Mejor estabilidad que POE',
    cost: 'Medio-Alto'
  },
  'CO2-POE': {
    name: 'POE especial para CO2',
    compatibility: ['R-744'],
    notes: 'Aceite POE modificado para soportar presiones extremas',
    cost: 'Muy alto'
  }
};

export function getRefrigerantInfo(code) {
  return REFRIGERANT_DATABASE.find(r => r.code === code) || null;
}

export function getReplacementGases(code) {
  const current = getRefrigerantInfo(code);
  if (!current || !current.replacement) return [];
  return current.replacement.split(', ').map(name => {
    const gas = REFRIGERANT_DATABASE.find(r => r.name.includes(name.trim()));
    return gas ? gas.code : name.trim();
  });
}

export function getCompatibleOils(code) {
  return Object.entries(OIL_TYPES)
    .filter(([_, oil]) => oil.compatibility.includes(code))
    .map(([key, oil]) => ({ key, ...oil }));
}