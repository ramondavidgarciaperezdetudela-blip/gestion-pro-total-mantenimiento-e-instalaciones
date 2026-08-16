import { base44 } from '@/api/base44Client';

// ── Categorías que se mantienen al día automáticamente ──────────────────────
// Compartido entre la página "Centro de Actualizaciones" (UpdateCenter.jsx) y
// el disparador silencioso en segundo plano (ver maybeRunDailyBackground).
export const CATEGORIES = [
  {
    id: 'normativas',
    icon: '📋',
    label: 'Normativas Vigentes',
    prompt: (today) => `Eres un experto en normativa española y europea de instalaciones (climatización, refrigeración, electricidad, solar, seguridad, F-Gas, RITE, REBT, RSIF). Hoy es ${today}. Indica si hay novedades, modificaciones o nuevas versiones publicadas en los últimos 12 meses de: Reglamento F-Gas UE 517/2014, RD 115/2017, RSIF RD 552/2019, RITE RD 1027/2007, REBT RD 842/2002, PRL Frigoristas RD 216/1999, CTE DB-HE.`,
    subtipo: [
      { id: 'rite',    label: 'RITE 2007 (RD 1027/2007 y modif.)', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2007-15820' },
      { id: 'rsif',    label: 'RSIF (RD 552/2019)',                 url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2019-7781' },
      { id: 'fgas',    label: 'Reglamento F-Gas (EU 517/2014)',     url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32014R0517' },
      { id: 'bt',      label: 'Reglamento BT (RD 842/2002)',        url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099' },
      { id: 'prl',     label: 'PRL Frigoristas (RD 216/1999)',      url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-1999-4433' },
      { id: 'cte',     label: 'CTE DB-HE (Ahorro energía)',         url: 'https://www.codigotecnico.org' },
    ],
  },
  {
    id: 'precios',
    icon: '💰',
    label: 'Precios de Proveedores',
    prompt: (today) => `Eres un experto en el mercado de climatización y refrigeración en España. Hoy es ${today}. Indica si hay cambios recientes relevantes (últimos 3-6 meses) en las tarifas oficiales o precios orientativos de fabricantes/proveedores habituales del sector: Daikin, Mitsubishi Electric, Samsung, LG, Vaillant, Carrier, Trane, Copeland/Emerson, Bitzer, Danfoss y en la cotización del gas refrigerante. Da valores orientativos si los conoces, sin inventar cifras exactas de tarifas privadas.`,
    subtipo: [
      { id: 'daikin',      label: 'Daikin — Tarifa Oficial'            },
      { id: 'mitsubishi',  label: 'Mitsubishi Electric — Tarifa'       },
      { id: 'samsung',     label: 'Samsung — Tarifa AC'                },
      { id: 'lg',          label: 'LG — Tarifa HVAC'                   },
      { id: 'vaillant',    label: 'Vaillant — Aerotermia'              },
      { id: 'carrier',     label: 'Carrier — Chillers y VRF'           },
      { id: 'trane',       label: 'Trane — Climatización'              },
      { id: 'copeland',    label: 'Copeland/Emerson — Compresores'     },
      { id: 'bitzer',      label: 'Bitzer — Compresores frigoríficos'  },
      { id: 'danfoss',     label: 'Danfoss — Componentes'              },
      { id: 'refrigerantes', label: 'Gas Refrigerante (cotización)'    },
    ],
  },
  {
    id: 'catalogos',
    icon: '📦',
    label: 'Catálogos de Equipos',
    prompt: (today) => `Eres un experto técnico en equipos de climatización, refrigeración y energía solar. Hoy es ${today}. Indica si hay novedades relevantes (nuevos modelos, series descatalogadas, cambios de gama) en los últimos 12 meses en: equipos de aire acondicionado (split/multi/VRF), equipos frigoríficos (evaporadores/condensadoras), instalaciones solares (paneles/inversores), aerotermia y bomba de calor, conductos/difusores, y sistemas de control/automatización.`,
    subtipo: [
      { id: 'ac',         label: 'Aire Acondicionado (split/multi/VRF)' },
      { id: 'frigorifico',label: 'Equipos Frigoríficos (evaporadores/condensadoras)' },
      { id: 'solar',      label: 'Instalaciones Solares (paneles/inversores)' },
      { id: 'aerotermia', label: 'Aerotermia y Bomba de Calor'           },
      { id: 'conductos',  label: 'Conductos y Difusores'                 },
      { id: 'control',    label: 'Control y Automatización'              },
    ],
  },
  {
    id: 'homologacion',
    icon: '🏅',
    label: 'Documentos de Homologación',
    prompt: (today) => `Eres un experto en trámites administrativos de instalaciones térmicas y frigoríficas en España. Hoy es ${today}. Indica si hay cambios recientes (últimos 12 meses) en los modelos oficiales de: proyecto técnico, certificado de instalación, memoria técnica, contratos de mantenimiento tipo, evaluación de riesgo RSIF, y modelos específicos por Comunidad Autónoma.`,
    subtipo: [
      { id: 'proyecto',   label: 'Plantillas de Proyecto Técnico'        },
      { id: 'certificado',label: 'Modelos de Certificado de Instalación'  },
      { id: 'memoria',    label: 'Modelos de Memoria Técnica'            },
      { id: 'mantenimiento', label: 'Contratos de Mantenimiento tipo'    },
      { id: 'riesgo',     label: 'Evaluaciones de Riesgo (RSIF)'         },
      { id: 'ccaa',       label: 'Modelos por Comunidad Autónoma'        },
    ],
  },
  {
    id: 'tarifas',
    icon: '🔢',
    label: 'Tarifas y Aranceles',
    prompt: (today) => `Eres un experto en fiscalidad y baremos aplicables a instalaciones y mantenimiento en España. Hoy es ${today}. Indica si hay cambios recientes (últimos 12 meses) en: baremo de mano de obra del convenio de metal/instalaciones, tasas de desplazamiento habituales, tasas de legalización de instalaciones por Comunidad Autónoma, y el IVA/tipos reducidos aplicables a este sector.`,
    subtipo: [
      { id: 'mano_obra',  label: 'Baremo de Mano de Obra (convenio)'    },
      { id: 'desplaz',    label: 'Tasas de Desplazamiento'              },
      { id: 'legaliz',    label: 'Tasas de Legalización por CCAA'       },
      { id: 'iva',        label: 'IVA y Tipos Reducidos Aplicables'     },
    ],
  },
];

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    fecha_consulta: { type: 'string' },
    resumen_general: { type: 'string' },
    novedades: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          titulo: { type: 'string' },
          estado: { type: 'string' },
          descripcion: { type: 'string' },
          url: { type: 'string' },
        },
      },
    },
  },
};

async function getSetting(key) {
  try {
    const rows = await base44.entities.SystemSettings.filter({ key });
    return rows?.[0] || null;
  } catch {
    return null;
  }
}

async function saveSetting(key, value) {
  try {
    const existing = await getSetting(key);
    if (existing) {
      await base44.entities.SystemSettings.update(existing.id, { value });
    } else {
      await base44.entities.SystemSettings.create({ key, value });
    }
  } catch {
    /* si falla el guardado remoto, el resultado se pierde en el próximo reinicio pero no bloquea la actualización */
  }
}

// ── Fuentes concretas añadidas por el usuario (páginas/proveedores propios) ─
// Se guardan por categoría y se incluyen en la consulta a la IA para que
// consulte esas páginas específicas, además de su búsqueda general.
export async function getCustomSources(catId) {
  const row = await getSetting(`sources_${catId}`);
  if (!row?.value) return [];
  try { return JSON.parse(row.value); } catch { return []; }
}

export async function saveCustomSources(catId, sources) {
  await saveSetting(`sources_${catId}`, JSON.stringify(sources));
}

/**
 * Consulta (IA + internet) las novedades de una categoría y guarda el
 * resultado y la fecha en SystemSettings, para que se muestre en el Centro
 * de Actualizaciones y sobreviva a recargas/reinicios.
 * @param {typeof CATEGORIES[number]} cat
 * @returns {Promise<object>} resultado de la consulta
 */
export async function updateCategoryData(cat) {
  const today = new Date().toLocaleDateString('es-ES');
  const customSources = await getCustomSources(cat.id);
  const sourcesText = customSources.length
    ? `\n\nConsulta especialmente estas páginas/proveedores concretos indicados por el usuario:\n${customSources.map(s => `- ${s.url}${s.note ? ` (${s.note})` : ''}`).join('\n')}`
    : '';
  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `${cat.prompt(today)}${sourcesText}\n\nResponde SIEMPRE en español y en formato JSON con este esquema exacto:\n{\n  "fecha_consulta": "DD/MM/YYYY",\n  "resumen_general": "resumen de 2-3 líneas del estado actual",\n  "novedades": [ { "titulo": "string", "estado": "vigente|actualizado|sin_cambios", "descripcion": "string", "url": "string o vacío" } ]\n}`,
    add_context_from_internet: true,
    response_json_schema: RESPONSE_SCHEMA,
  });
  const now = new Date().toISOString();
  await saveSetting(`update_${cat.id}`, now);
  await saveSetting(`update_data_${cat.id}`, JSON.stringify(result));
  return result;
}

/**
 * Carga las fechas y los últimos resultados guardados de todas las
 * categorías (sin volver a consultar la IA).
 */
export async function loadSavedUpdates() {
  const dates = {};
  const data = {};
  try {
    const records = await base44.entities.SystemSettings.list();
    records.forEach((r) => {
      if (r.key?.startsWith('update_data_')) {
        try { data[r.key.replace('update_data_', '')] = JSON.parse(r.value); } catch { /* valor corrupto: se ignora */ }
      } else if (r.key?.startsWith('update_')) {
        dates[r.key.replace('update_', '')] = r.value;
      }
    });
  } catch { /* sin datos previos */ }
  return { dates, data };
}

const DAILY_KEY = 'gpt_daily_autoupdate_last_date';

/**
 * Si ha cambiado el día natural desde la última vez (p.ej. se cruzaron las
 * 00:00), lanza en segundo plano la actualización de las 5 categorías, sin
 * interrumpir a quien esté usando la app. No hace nada si ya se ejecutó hoy.
 * Pensado para llamarse una vez al montar la aplicación (Layout.jsx).
 */
export function maybeRunDailyBackground() {
  const todayStr = new Date().toDateString();
  const last = localStorage.getItem(DAILY_KEY);
  if (last === todayStr) return;
  localStorage.setItem(DAILY_KEY, todayStr);
  // Espera aleatoria (0-20 min) antes de empezar: cada persona la calcula en
  // su propio dispositivo, así que si mucha gente abre la app a la misma
  // hora (p.ej. las 9:00 de la oficina), las peticiones a la IA no salen
  // todas en el mismo segundo — se reparten en el tiempo y no sobrecargan
  // el backend con un pico de tráfico simultáneo.
  const jitterMs = Math.floor(Math.random() * 20 * 60 * 1000);
  // No usar await: es una tarea de fondo, no debe bloquear el arranque de la app.
  setTimeout(() => {
    (async () => {
      for (const cat of CATEGORIES) {
        try { await updateCategoryData(cat); } catch { /* una categoría fallida no debe frenar las demás */ }
      }
    })();
  }, jitterMs);
}
