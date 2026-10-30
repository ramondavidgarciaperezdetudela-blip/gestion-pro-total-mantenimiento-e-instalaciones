import { base44 } from '@/api/base44Client';
import { motivoDelFallo } from '@/lib/avisoServidor';
import { actualizacionDiariaActivada, esIAApagada } from '@/lib/modoSinIA';
import { ajustesIA } from '@/lib/proveedorIA';

// ── Categorías que se mantienen al día automáticamente ──────────────────────
// Compartido entre la página "Centro de Actualizaciones" (UpdateCenter.jsx) y
// el disparador silencioso en segundo plano (ver maybeRunDailyBackground).
export const CATEGORIES = [
  {
    id: 'normativas',
    icon: '📋',
    label: 'Normativas Vigentes',
    prompt: (today) => `Eres un experto en normativa española y europea de instalaciones (climatización, refrigeración, electricidad, solar, seguridad, F-Gas, RITE, REBT, RSIF). Hoy es ${today}. Indica si hay novedades, modificaciones o nuevas versiones publicadas en los últimos 12 meses de: Reglamento F-Gas (UE) 2024/573 —que sustituyó al 517/2014—, RD 115/2017, RSIF RD 552/2019, RITE RD 1027/2007, REBT RD 842/2002, CTE DB-HE.`,
    subtipo: [
      { id: 'rite',    label: 'RITE (RD 1027/2007 y modificaciones)', url: 'https://www.boe.es/buscar/doc.php?id=BOE-A-2021-4572' },
      { id: 'rsif',    label: 'RSIF (RD 552/2019)',                 url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2019-7781' },
      { id: 'fgas',    label: 'Reglamento F-Gas (UE 2024/573)',     url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32024R0573' },
      { id: 'bt',      label: 'Reglamento BT (RD 842/2002)',        url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099' },
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
    return true;
  } catch {
    return false;
  }
}

// ── Copia en el propio aparato ──────────────────────────────────────────────
// El guardado en el servidor puede fallar (sin cobertura, cuenta sin créditos,
// permisos). Antes eso se tragaba en silencio y la pantalla seguía diciendo
// "Nunca actualizado" aunque la consulta hubiera ido bien, porque la fecha
// solo vivía en el servidor. Ahora se guarda también aquí.
const LOCAL = 'gpt_actualizaciones';

function leerLocal() {
  try { return JSON.parse(localStorage.getItem(LOCAL) || '{}'); } catch { return {}; }
}

function guardarLocal(catId, fecha, datos) {
  try {
    const todo = leerLocal();
    todo[catId] = { fecha, datos };
    localStorage.setItem(LOCAL, JSON.stringify(todo));
  } catch { /* sin sitio o sin permiso: no es motivo para tumbar la actualización */ }
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

/** Saca el JSON de una respuesta en texto ("aquí tienes: { ... }"). */
export function jsonDelTexto(texto) {
  if (texto && typeof texto === 'object') return texto;
  const t = String(texto || '');
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a === -1 || b <= a) return null;
  try { return JSON.parse(t.slice(a, b + 1)); } catch { return null; }
}

/** Deja el resultado en condiciones venga como venga de la IA. */
function saneado(bruto) {
  const r = jsonDelTexto(bruto);
  if (!r || typeof r !== 'object') return null;
  const novedades = Array.isArray(r.novedades) ? r.novedades : [];
  return {
    fecha_consulta: String(r.fecha_consulta || new Date().toLocaleDateString('es-ES')),
    resumen_general: String(r.resumen_general || ''),
    novedades: novedades.filter((n) => n && n.titulo).map((n) => ({
      titulo: String(n.titulo),
      estado: String(n.estado || ''),
      descripcion: String(n.descripcion || ''),
      url: String(n.url || ''),
    })),
  };
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

/** ¿Merece la pena reintentar tal cual, o va a volver a fallar igual? */
function esPasajero(err) {
  const estado = err?.status ?? err?.response?.status ?? null;
  return estado === 429 || (typeof estado === 'number' && estado >= 500) || estado === null;
}

/**
 * Consulta (IA + internet) las novedades de una categoría y guarda el
 * resultado y la fecha, para que se muestre en el Centro de Actualizaciones y
 * sobreviva a recargas y reinicios.
 *
 * Antes esto era UNA sola llamada con búsqueda en internet y esquema JSON
 * obligatorio: si el servidor no podía buscar en internet, o devolvía el JSON
 * envuelto en texto, la categoría entera se daba por fallida y salía el aviso
 * rojo. Ahora se prueban tres formas, de la mejor a la más simple, antes de
 * darse por vencido.
 *
 * @param {typeof CATEGORIES[number]} cat
 * @returns {Promise<{resultado: object, modo: 'internet'|'sin_internet'}>}
 */
export async function updateCategoryData(cat) {
  const today = new Date().toLocaleDateString('es-ES');
  const customSources = await getCustomSources(cat.id);
  const sourcesText = customSources.length
    ? `\n\nConsulta especialmente estas páginas/proveedores concretos indicados por el usuario:\n${customSources.map(s => `- ${s.url}${s.note ? ` (${s.note})` : ''}`).join('\n')}`
    : '';
  const prompt = `${cat.prompt(today)}${sourcesText}\n\nResponde SIEMPRE en español y en formato JSON con este esquema exacto:\n{\n  "fecha_consulta": "DD/MM/YYYY",\n  "resumen_general": "resumen de 2-3 líneas del estado actual",\n  "novedades": [ { "titulo": "string", "estado": "vigente|actualizado|sin_cambios", "descripcion": "string", "url": "string o vacío" } ]\n}`;

  const intentos = [
    { modo: 'internet',     opciones: { add_context_from_internet: true,  response_json_schema: RESPONSE_SCHEMA } },
    { modo: 'internet',     opciones: { add_context_from_internet: true } },
    { modo: 'sin_internet', opciones: { response_json_schema: RESPONSE_SCHEMA } },
    { modo: 'sin_internet', opciones: {} },
  ];

  let ultimoError = null;
  for (const intento of intentos) {
    for (let vuelta = 0; vuelta < 2; vuelta++) {
      try {
        const bruto = await base44.integrations.Core.InvokeLLM({ prompt, ...intento.opciones });
        const resultado = saneado(bruto);
        if (!resultado) throw new Error('La IA ha respondido algo que no se entiende.');
        const now = new Date().toISOString();
        guardarLocal(cat.id, now, resultado);
        await saveSetting(`update_${cat.id}`, now);
        await saveSetting(`update_data_${cat.id}`, JSON.stringify(resultado));
        return { resultado, modo: intento.modo };
      } catch (e) {
        ultimoError = e;
        // Si la IA está apagada a propósito, no hay nada que reintentar: sería
        // esperar 1,5 s entre cuatro formas distintas y cinco secciones, medio
        // minuto mirando una pantalla que ya sabe que no va a consultar.
        if (esIAApagada(e)) throw e;
        // Solo se repite el MISMO intento si el fallo es pasajero (el servidor
        // saturado o caído). Si no, se pasa directo a la forma siguiente.
        if (vuelta === 0 && esPasajero(e)) { await espera(1500); continue; }
        break;
      }
    }
  }
  throw ultimoError || new Error('No se ha podido consultar.');
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
  } catch { /* sin datos previos en el servidor */ }
  // Lo guardado en el propio aparato manda cuando el servidor no lo tiene: es
  // lo que evita que salga "Nunca actualizado" después de una actualización
  // que sí funcionó pero cuyo guardado remoto falló.
  const local = leerLocal();
  for (const [id, v] of Object.entries(local)) {
    if (!dates[id] && v?.fecha) dates[id] = v.fecha;
    if (!data[id] && v?.datos) data[id] = v.datos;
  }
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
  // Apagada mientras no se encienda a mano. Esto eran 5 consultas a la IA con
  // búsqueda en internet CADA DÍA y EN CADA APARATO: con el ordenador, la
  // tablet y el móvil, 15 consultas diarias que nadie había pedido y que se
  // comían los créditos en segundo plano. Ahora hay que quererlo.
  if (!actualizacionDiariaActivada()) return;
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

/**
 * Por qué ha fallado la consulta, en cristiano.
 *
 * motivoDelFallo() de avisoServidor.js está escrito para GUARDAR fichas, y
 * aquí algunas respuestas no encajan: un 404 no significa "el registro ya no
 * existe", significa que la ayuda con IA no está disponible en la cuenta.
 */
export function motivoDeLaConsulta(err) {
  const estado = err?.status ?? err?.response?.status ?? null;
  const detalle = String(err?.data?.detail || err?.data?.message || err?.message || '');

  if (estado === 404) {
    // Solo es cosa de Base44 si la consulta ha ido a Base44. Con una IA libre
    // un 404 quiere decir otra cosa (el modelo ya no existe), y mandar a mirar
    // el panel de Base44 es mandar a buscar donde no está el problema.
    if (ajustesIA().proveedor === 'base44') {
      return 'La ayuda con IA no está disponible en tu cuenta de Base44 (no responde a la consulta). Compruébalo en el panel de Base44.';
    }
    return detalle || 'La IA no ha reconocido la consulta. Compruébalo en Configuración → Qué IA usar.';
  }
  if (estado === 408 || estado === 504 || /timeout|timed out|ETIMEDOUT/i.test(detalle)) {
    return 'La consulta ha tardado demasiado y el servidor la ha cortado. Buscar en internet es lento; vuelve a intentarlo.';
  }
  if (estado === null && /network|failed to fetch|abort|ERR_/i.test(detalle)) {
    return 'No se ha podido llegar al servidor. Si el resto del programa sí funciona, no es tu conexión: es que la consulta a la IA no ha salido.';
  }
  return motivoDelFallo(err);
}

/**
 * El detalle técnico del fallo, para poder enseñarlo tal cual.
 *
 * Sin esto no hay forma de saber qué está pasando de verdad: el usuario ve un
 * mensaje amable y quien tiene que arreglarlo se queda a ciegas.
 */
export function detalleTecnico(err) {
  const estado = err?.status ?? err?.response?.status ?? null;
  const detalle = err?.data?.detail || err?.data?.message || err?.message || '';
  const texto = typeof detalle === 'string' ? detalle : JSON.stringify(detalle);
  return `${estado === null || estado === undefined ? 'sin código' : `código ${estado}`} · ${String(texto).slice(0, 300) || 'sin detalle'}`;
}
