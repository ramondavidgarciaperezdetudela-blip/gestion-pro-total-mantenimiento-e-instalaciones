import { base44 } from '@/api/base44Client';

// ── Motor de copia de seguridad / restauración ──────────────────────────────
// Vive fuera de BackupCenter.jsx a propósito: así el trabajo sigue corriendo
// aunque el usuario navegue a otra pantalla mientras se hace (no depende del
// ciclo de vida de ese componente), y un pequeño indicador global (ver
// BackupProgressIndicator.jsx) puede mostrar el progreso desde cualquier
// página. También pagina y procesa por entidad EN PARALELO en vez de una a
// una, para que cuentas con muchos registros (documentos, fotos...) tarden
// mucho menos.

const PAGE = 1000;
const PAGE_BATCH = 4;       // páginas en paralelo dentro de una misma entidad
const ENTITY_CONCURRENCY = 4; // entidades en paralelo al hacer copia/restauración

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

const KEYERS_STRIP = ['id', 'created_date', 'updated_date', 'created_by'];
function stripMeta(r) {
  const out = { ...r };
  for (const k of KEYERS_STRIP) delete out[k];
  return out;
}

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

    if (mode === 'clean') {
      const existing = await fetchAllRecordsFast(ent);
      await runPool(existing || [], (rec) => base44.entities[ent]?.delete(rec.id).catch(trackFail), 6);
      const clean = rows.map(stripMeta);
      await runPool(
        Array.from({ length: Math.ceil(clean.length / 100) }, (_, i) => clean.slice(i * 100, i * 100 + 100)),
        (chunk) => base44.entities[ent]?.bulkCreate(chunk).catch(trackFail),
        3
      );
      total += clean.length;
    } else {
      const existing = await fetchAllRecordsFast(ent);
      const keyer = keyers[ent];
      if (keyer) {
        const byKey = {};
        (existing || []).forEach((r) => { const k = keyer(r); if (k) byKey[k] = r; });
        const toCreate = [];
        const toUpdate = [];
        for (const r of rows) {
          const k = keyer(r);
          const data = stripMeta(r);
          if (k && byKey[k]) toUpdate.push({ id: byKey[k].id, data });
          else toCreate.push(data);
        }
        await runPool(
          Array.from({ length: Math.ceil(toCreate.length / 100) }, (_, i) => toCreate.slice(i * 100, i * 100 + 100)),
          (chunk) => base44.entities[ent]?.bulkCreate(chunk).catch(trackFail),
          3
        );
        await runPool(toUpdate, (it) => base44.entities[ent]?.update(it.id, it.data).catch(trackFail), 6);
        total += toCreate.length + toUpdate.length;
      } else {
        const existingSignatures = new Set((existing || []).map((r) => JSON.stringify(stripMeta(r))));
        const toInsert = rows.map(stripMeta).filter((r) => !existingSignatures.has(JSON.stringify(r)));
        await runPool(
          Array.from({ length: Math.ceil(toInsert.length / 100) }, (_, i) => toInsert.slice(i * 100, i * 100 + 100)),
          (chunk) => base44.entities[ent]?.bulkCreate(chunk).catch(trackFail),
          3
        );
        total += toInsert.length;
      }
    }
    done++;
    report(` (${done}/${entities.length})`);
  }, ENTITY_CONCURRENCY);

  publish({ active: false, message: '', pct: 100 });
  return { total, failed };
}
