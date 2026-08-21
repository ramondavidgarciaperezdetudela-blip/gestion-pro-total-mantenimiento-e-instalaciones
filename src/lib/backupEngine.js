import { base44 } from '@/api/base44Client';
import {
  enLotes, firmaRegistro, sinMetadatos, planRestauracion,
} from '@/lib/copiasLotes';

// ── Motor de copia de seguridad / restauración ──────────────────────────────
// Vive fuera de BackupCenter.jsx a propósito: así el trabajo sigue corriendo
// aunque el usuario navegue a otra pantalla mientras se hace (no depende del
// ciclo de vida de ese componente), y un pequeño indicador global (ver
// BackupProgressIndicator.jsx) puede mostrar el progreso desde cualquier
// página. También pagina y procesa por entidad EN PARALELO en vez de una a
// una, para que cuentas con muchos registros (documentos, fotos...) tarden
// mucho menos.

const PAGE = 1000;
const PAGE_BATCH = 6;         // páginas en paralelo dentro de una misma entidad
const ENTITY_CONCURRENCY = 8; // entidades en paralelo al hacer copia/restauración

const LOTES_A_LA_VEZ = 3;

async function runPool(items, worker, concurrency) {
  let idx = 0;
  const n = Math.min(concurrency, items.length);
  const runners = Array.from({ length: n }, async () => {
    while (idx < items.length) {
      const i = idx++;
      await worker(items[i], i);
    }
  });
  await Promise.all(runners);
}

/** Lee TODOS los registros de una entidad, paginando en paralelo por rondas. */
export async function fetchAllRecordsFast(ent) {
  const E = base44.entities[ent];
  if (!E) return [];
  let all;
  try {
    all = await E.filter({}, null, PAGE, 0);
  } catch {
    try { return (await E.list('', 10000)) || []; } catch { return []; }
  }
  if (!all) return [];
  if (all.length < PAGE) return all;

  let skip = PAGE;
  for (let guard = 0; guard < 250; guard++) {
    const skips = Array.from({ length: PAGE_BATCH }, (_, i) => skip + i * PAGE);
    const batches = await Promise.all(skips.map((s) => E.filter({}, null, PAGE, s).catch(() => [])));
    let reachedEnd = false;
    for (const batch of batches) {
      if (!batch || batch.length === 0) { reachedEnd = true; break; }
      all = all.concat(batch);
      if (batch.length < PAGE) { reachedEnd = true; break; }
    }
    if (reachedEnd) break;
    skip += PAGE * PAGE_BATCH;
  }
  // Red de seguridad: la paginación por desplazamiento sin orden estable
  // puede repetir algún registro entre rondas paralelas.
  const seen = new Set();
  return all.filter((r) => (r.id && !seen.has(r.id)) ? (seen.add(r.id), true) : !r.id);
}

/**
 * Cuenta los registros de una entidad SIN traerse los registros.
 *
 * Contar pidiendo la ficha entera era lo que hacía que la pantalla de copias
 * tardase tanto en abrirse y en volver después de restaurar: se descargaban
 * las fotos, los PDF y las firmas de todo el histórico para acabar enseñando
 * un número. Aquí se pide únicamente el campo "id".
 *
 * Si el servidor no admite pedir campos sueltos, se cuenta a la manera larga
 * para no quedarse sin el dato.
 */
export async function contarRegistros(ent) {
  const E = base44.entities[ent];
  if (!E) return 0;
  const soloIds = (skip) => E.filter({}, null, PAGE, skip, ['id']);

  let primera;
  try {
    primera = await soloIds(0);
  } catch {
    return (await fetchAllRecordsFast(ent))?.length || 0;
  }
  if (!primera) return 0;

  const vistos = new Set();
  let sueltos = 0;
  const sumar = (lote) => {
    for (const r of lote) {
      if (r?.id) vistos.add(r.id);
      else sueltos++;
    }
  };
  sumar(primera);
  if (primera.length < PAGE) return vistos.size + sueltos;

  let skip = PAGE;
  for (let guard = 0; guard < 250; guard++) {
    const skips = Array.from({ length: PAGE_BATCH }, (_, i) => skip + i * PAGE);
    const lotes = await Promise.all(skips.map((s) => soloIds(s).catch(() => [])));
    let fin = false;
    for (const lote of lotes) {
      if (!lote || lote.length === 0) { fin = true; break; }
      sumar(lote);
      if (lote.length < PAGE) { fin = true; break; }
    }
    if (fin) break;
    skip += PAGE * PAGE_BATCH;
  }
  return vistos.size + sueltos;
}

// ── Estado global compartido (para el indicador persistente) ───────────────
let state = { active: false, kind: null, message: '', pct: 0 };
const listeners = new Set();
function publish(patch) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l(state));
}
export function subscribeBackupState(fn) {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
}
export function getBackupState() { return state; }

/**
 * Exporta todas las entidades indicadas en paralelo (varias a la vez).
 * @param {string[]} entities
 * @param {(label:string, pct:number)=>void} [onProgress]
 * @returns {Promise<Record<string, any[]>>}
 */
export async function runBackupJob(entities, entityLabels = {}, onProgress) {
  publish({ active: true, kind: 'backup', message: 'Iniciando copia de seguridad...', pct: 5 });
  const result = {};
  let done = 0;
  await runPool(entities, async (ent) => {
    const label = entityLabels[ent] || ent;
    const msg = `Exportando ${label}...`;
    onProgress?.(msg, Math.round(5 + (done / entities.length) * 85));
    publish({ message: msg, pct: Math.round(5 + (done / entities.length) * 85) });
    result[ent] = (await fetchAllRecordsFast(ent)) || [];
    done++;
    const pct = Math.round(5 + (done / entities.length) * 85);
    onProgress?.(`Exportado ${label} (${done}/${entities.length})`, pct);
    publish({ message: `Exportando... (${done}/${entities.length})`, pct });
  }, ENTITY_CONCURRENCY);
  publish({ active: false, message: '', pct: 100 });
  return result;
}

const stripMeta = sinMetadatos;

/**
 * Restaura las entidades indicadas en paralelo (varias entidades a la vez;
 * dentro de cada una, por lotes, para no saturar la API).
 * @param {Record<string, any[]>} restoreData
 * @param {string[]} entities
 * @param {'update'|'clean'} mode
 * @param {Record<string, (r:any)=>string|null>} keyers
 * @param {(label:string, pct:number)=>void} [onProgress]
 */
export async function runRestoreJob(restoreData, entities, mode, keyers, entityLabels = {}, onProgress) {
  publish({ active: true, kind: 'restore', message: 'Iniciando restauración...', pct: 5 });
  let total = 0;
  let failed = 0;
  let sinCambios = 0;
  const trackFail = (err) => { failed++; console.error('[backupEngine] Error real al restaurar:', err); };
  let done = 0;

  await runPool(entities, async (ent) => {
    const label = entityLabels[ent] || ent;
    const rows = restoreData[ent] || [];
    const report = (extra = '') => {
      const pct = Math.round(5 + (done / entities.length) * 90);
      onProgress?.(`Restaurando ${label}...${extra}`, pct);
      publish({ message: `Restaurando... (${done}/${entities.length})`, pct });
    };
    report();

    const E = base44.entities[ent];
    const crear = (lista) => runPool(
      enLotes(lista), (lote) => E?.bulkCreate(lote).catch(trackFail), LOTES_A_LA_VEZ,
    );

    if (mode === 'clean') {
      await borrarTodo(ent, trackFail);
      const clean = rows.map(stripMeta);
      await crear(clean);
      total += clean.length;
    } else {
      const existing = await fetchAllRecordsFast(ent);
      // Qué hay que crear, qué actualizar y qué dejar en paz. Lo decide una
      // función aparte y comprobada (src/lib/copiasLotes.js).
      const plan = planRestauracion(existing, rows, keyers[ent]);
      sinCambios += plan.sinCambios;
      // Se dice ya lo que va a costar: así no parece parado cuando la
      // mayoría de los registros están igual y no hay nada que mandar.
      const porHacer = plan.aCrear.length + plan.aActualizar.length;
      report(porHacer === 0
        ? ` (${plan.sinCambios} sin cambios, nada que mandar)`
        : ` (${porHacer} por guardar)`);
      await crear(plan.aCrear);
      // En bloque, no de uno en uno: 2.000 registros pasan de 2.000
      // peticiones a ocho.
      await runPool(
        enLotes(plan.aActualizar), (lote) => E?.bulkUpdate(lote).catch(trackFail), LOTES_A_LA_VEZ,
      );
      total += porHacer;
    }
    done++;
    report(` (${done}/${entities.length})`);
  }, ENTITY_CONCURRENCY);

  publish({ active: false, message: '', pct: 100 });
  return { total, failed, sinCambios };
}

/**
 * Vacía una entidad para la restauración "limpia".
 *
 * Se intenta primero de una sola petición (deleteMany), que es lo rápido. Si
 * el servidor no lo admite o quedan registros, se borra uno a uno. Y se
 * comprueba que de verdad se ha vaciado: si se diera por bueno sin mirar y
 * hubiera quedado algo, la restauración duplicaría todo.
 */
async function borrarTodo(ent, trackFail) {
  const E = base44.entities[ent];
  if (!E) return;
  try {
    await E.deleteMany({});
    const quedan = await E.filter({}, null, 1, 0).catch(() => []);
    if (!quedan || quedan.length === 0) return;
  } catch {
    // No lo admite: se hace a la manera lenta.
  }
  const existing = await fetchAllRecordsFast(ent);
  await runPool(existing || [], (rec) => E.delete(rec.id).catch(trackFail), 10);
}
