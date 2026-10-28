import { base44 } from '@/api/base44Client';
import {
  enLotes, sinMetadatos, planRestauracion,
  planDuplicados, revisarPlanDuplicados, quitarDuplicados,
} from '@/lib/copiasLotes';
import {
  conReintento, crearFreno, esDemasiadasPeticiones, errorLecturaIncompleta,
} from '@/lib/limiteServidor';

// ── Motor de copia de seguridad / restauración / duplicados ────────────────
// Vive fuera de BackupCenter.jsx a propósito: así el trabajo sigue corriendo
// aunque el usuario navegue a otra pantalla mientras se hace (no depende del
// ciclo de vida de ese componente), y un pequeño indicador global (ver
// BackupProgressIndicator.jsx) puede mostrar el progreso desde cualquier
// página. También pagina y procesa por entidad EN PARALELO en vez de una a
// una, para que cuentas con muchos registros (documentos, fotos...) tarden
// mucho menos.

// El motor usa el cliente SIN los avisos automáticos: ya cuenta sus propios
// fallos y los enseña al final. Si no, una restauración con mala cobertura
// llenaría la pantalla de carteles rojos, uno por lote.
//
// OJO con esto: ese cliente en crudo tampoco trae el reintento por "demasiadas
// peticiones" que sí tiene el resto del programa. Por eso TODA petición de
// este fichero pasa por pedir(), que lo pone aquí. Sin ello, la parte que más
// aprieta al servidor era la única sin protección — y una página fallada se
// daba por "fin de los datos", con lo que la copia salía a medias sin avisar.
const entidades = base44.sinAvisos?.entities || base44.entities;

const PAGE = 1000;
// El servidor limita a 140 lecturas/min por usuario. Antes se lanzaban 4
// entidades a la vez × 3 páginas en paralelo = 12 lecturas simultáneas, que
// vaciaban el cupo en unos segundos; entonces el freno paraba a todos, pero
// al soltar volvían a salir 12 de golpe y se volvía a saturar, hasta que
// los reintentos de una página se agotaban y la copia fallaba entera.
//
// Ahora las páginas van SEGUIDAS dentro de cada entidad (PAGE_BATCH=1) y solo
// 2 entidades a la vez: 2 lecturas concurrentes como mucho. Con el freno y
// los reintentos alargados, cuando el servidor dice "para" se espera, y al
// seguir solo sale una o dos peticiones, que ya no lo vuelven a saturar.
const PAGE_BATCH = 1;         // páginas en paralelo dentro de una misma entidad
const ENTITY_CONCURRENCY = 2; // entidades en paralelo al hacer copia/restauración

const LOTES_A_LA_VEZ = 2;
const BORRADOS_A_LA_VEZ = 4;

/** Una petición al servidor, con espera y reintento si dice "demasiadas". */
function pedir(freno, hacer) {
  return conReintento(hacer, { freno });
}

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

/**
 * Lee TODOS los registros de una entidad, paginando en paralelo por rondas.
 *
 * Si una página no se puede leer, esto FALLA en vez de devolver lo que llevaba.
 * Parece más incómodo y es justo lo contrario: antes una página cortada por
 * exceso de peticiones se tomaba por "ya no hay más", así que la copia se
 * guardaba incompleta con toda tranquilidad, y restaurar esa copia en modo
 * "copia limpia" —que borra antes de escribir— se llevaba por delante lo que
 * faltaba. Mejor parar y decirlo.
 *
 * @param {string} ent
 * @param {{tolerante?: boolean, freno?: object}} [opciones]
 *   tolerante: para pintar una lista en pantalla, donde enseñar lo que haya es
 *   mejor que no enseñar nada. NUNCA para copiar, restaurar ni borrar.
 */
export async function fetchAllRecordsFast(ent, opciones = {}) {
  const { tolerante = false, freno = crearFreno() } = opciones;
  const E = entidades[ent];
  if (!E) return [];

  const pagina = (skip) => pedir(freno, () => E.filter({}, null, PAGE, skip));
  const fallar = (causa) => {
    if (tolerante) return null;
    throw errorLecturaIncompleta(ent, causa);
  };

  let all;
  try {
    all = await pagina(0);
  } catch (e) {
    // El camino alternativo (list) solo tiene sentido si el servidor no admite
    // filter. Si lo que ha dicho es "demasiadas peticiones", repetir de otra
    // manera da lo mismo y encima devolvería una lista corta.
    if (esDemasiadasPeticiones(e)) { const r = fallar(e); return r ?? []; }
    try { all = (await pedir(freno, () => E.list('', 10000))) || []; }
    catch (e2) { const r = fallar(e2); return r ?? []; }
  }
  if (!all) return [];
  if (all.length < PAGE) return all;

  let skip = PAGE;
  for (let guard = 0; guard < 250; guard++) {
    const skips = Array.from({ length: PAGE_BATCH }, (_, i) => skip + i * PAGE);
    let batches;
    try {
      batches = await Promise.all(skips.map((s) => pagina(s)));
    } catch (e) {
      const r = fallar(e);
      if (r === null) break;      // tolerante: se devuelve lo leído hasta aquí
      return r;
    }
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
 * Esto sí es tolerante: es un número informativo en pantalla, no la base de
 * ningún borrado.
 */
export async function contarRegistros(ent, freno = crearFreno()) {
  const E = entidades[ent];
  if (!E) return 0;
  const soloIds = (skip) => pedir(freno, () => E.filter({}, null, PAGE, skip, ['id']));

  let primera;
  try {
    primera = await soloIds(0);
  } catch {
    return (await fetchAllRecordsFast(ent, { tolerante: true, freno }))?.length || 0;
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
 *
 * Devuelve TAMBIÉN qué secciones no se han podido leer enteras. Antes esto se
 * perdía: una sección que fallaba salía como lista vacía y la copia se
 * guardaba igual, aparentemente correcta. Quien la restaurase después creería
 * que esa sección estaba vacía de verdad.
 *
 * @param {string[]} entities
 * @param {Record<string,string>} entityLabels
 * @param {(label:string, pct:number)=>void} [onProgress]
 * @param {{sinDuplicados?: boolean}} [opciones]
 * @returns {Promise<{datos: Record<string, any[]>, fallos: Array, duplicadosQuitados: number}>}
 */
export async function runBackupJob(entities, entityLabels = {}, onProgress, opciones = {}) {
  const { sinDuplicados = false } = opciones;
  publish({ active: true, kind: 'backup', message: 'Iniciando copia de seguridad...', pct: 5 });
  const freno = crearFreno();
  const datos = {};
  const fallos = [];
  let duplicadosQuitados = 0;
  let done = 0;

  await runPool(entities, async (ent) => {
    const label = entityLabels[ent] || ent;
    const msg = `Exportando ${label}...`;
    onProgress?.(msg, Math.round(5 + (done / entities.length) * 85));
    publish({ message: msg, pct: Math.round(5 + (done / entities.length) * 85) });
    try {
      let registros = (await fetchAllRecordsFast(ent, { freno })) || [];
      if (sinDuplicados) {
        const { limpios, quitados } = quitarDuplicados(registros);
        registros = limpios;
        duplicadosQuitados += quitados;
      }
      datos[ent] = registros;
    } catch (err) {
      // No se pone [] : una sección que no se ha podido leer NO es una sección
      // vacía, y confundirlas es lo que convierte una copia en una trampa.
      fallos.push({ entidad: ent, etiqueta: label, motivo: err?.message || String(err) });
    }
    done++;
    const pct = Math.round(5 + (done / entities.length) * 85);
    onProgress?.(`Exportado ${label} (${done}/${entities.length})`, pct);
    publish({ message: `Exportando... (${done}/${entities.length})`, pct });
  }, ENTITY_CONCURRENCY);

  publish({ active: false, message: '', pct: 100 });
  return { datos, fallos, duplicadosQuitados };
}

const stripMeta = sinMetadatos;

/**
 * Restaura las entidades indicadas en paralelo (varias entidades a la vez;
 * dentro de cada una, por lotes, para no saturar la API).
 *
 * @param {Record<string, any[]>} restoreData
 * @param {string[]} entities
 * @param {'update'|'clean'} mode
 * @param {Record<string, (r:any)=>string|null>} keyers
 * @param {(label:string, pct:number)=>void} [onProgress]
 * @param {{alRescatar?: (ent:string, registros:any[]) => Promise<void>}} [opciones]
 */
export async function runRestoreJob(
  restoreData, entities, mode, keyers, entityLabels = {}, onProgress, opciones = {},
) {
  publish({ active: true, kind: 'restore', message: 'Iniciando restauración...', pct: 5 });
  const freno = crearFreno();
  let total = 0;
  let failed = 0;
  let sinCambios = 0;
  const avisos = [];
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

    const E = entidades[ent];
    const crear = (lista) => runPool(
      enLotes(lista),
      (lote) => pedir(freno, () => E?.bulkCreate(lote)).catch(trackFail),
      LOTES_A_LA_VEZ,
    );

    if (mode === 'clean') {
      // Nunca vaciar una sección para no meter nada dentro. Una copia con la
      // sección vacía casi siempre significa que esa sección no se pudo leer
      // cuando se hizo la copia — no que estuviera vacía de verdad.
      if (rows.length === 0) {
        avisos.push(`«${label}» no se ha tocado: la copia no trae ningún registro de esa sección, `
          + 'y vaciarla para no poner nada es la forma más rápida de perder datos.');
        done++; report();
        return;
      }
      const rescate = await borrarTodo(ent, trackFail, freno, opciones.alRescatar);
      if (rescate === 'sin_rescate') {
        avisos.push(`«${label}» no se ha tocado: no se ha podido guardar antes la copia de rescate, `
          + 'así que no se ha borrado nada.');
        done++; report();
        return;
      }
      const clean = rows.map(stripMeta);
      await crear(clean);
      total += clean.length;
    } else {
      const existing = await fetchAllRecordsFast(ent, { freno });
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
        enLotes(plan.aActualizar),
        (lote) => pedir(freno, () => E?.bulkUpdate(lote)).catch(trackFail),
        LOTES_A_LA_VEZ,
      );
      total += porHacer;
    }
    done++;
    report(` (${done}/${entities.length})`);
  }, ENTITY_CONCURRENCY);

  publish({ active: false, message: '', pct: 100 });
  return { total, failed, sinCambios, avisos };
}

/**
 * Vacía una entidad para la restauración "limpia".
 *
 * Antes de borrar nada se lee lo que hay y se entrega a quien haya pedido el
 * rescate (la pantalla lo guarda en un fichero). Si eso no sale bien, NO se
 * borra: la "copia limpia" es la única función del programa que borra datos
 * buenos a propósito, y tiene que haber una vuelta atrás.
 *
 * @returns {'ok'|'sin_rescate'}
 */
async function borrarTodo(ent, trackFail, freno, alRescatar) {
  const E = entidades[ent];
  if (!E) return 'ok';

  let existing;
  try {
    existing = await fetchAllRecordsFast(ent, { freno });
  } catch {
    return 'sin_rescate';        // sin poder leerlo, no se borra
  }

  if (alRescatar && existing.length > 0) {
    try { await alRescatar(ent, existing); }
    catch { return 'sin_rescate'; }
  }

  try {
    await pedir(freno, () => E.deleteMany({}));
    const quedan = await pedir(freno, () => E.filter({}, null, 1, 0)).catch(() => []);
    if (!quedan || quedan.length === 0) return 'ok';
  } catch {
    // No lo admite: se hace a la manera lenta.
  }
  await runPool(
    existing || [],
    (rec) => (rec?.id ? pedir(freno, () => E.delete(rec.id)).catch(trackFail) : null),
    BORRADOS_A_LA_VEZ,
  );
  return 'ok';
}

// ── Duplicados ─────────────────────────────────────────────────────────────

/**
 * MIRA qué duplicados hay. No borra nada.
 *
 * Separado del borrado a propósito: hasta ahora se analizaba y se borraba en
 * el mismo botón, así que no había ningún momento en el que se pudiera ver lo
 * que iba a pasar. Ahora primero se enseña y luego, si se quiere, se borra.
 *
 * @returns {Promise<Array<{entidad, etiqueta, total, duplicados, seConservan, seguro, motivo, aBorrar, error}>>}
 */
export async function analizarDuplicados(entities, entityLabels = {}, onProgress, opciones = {}) {
  const { conservar = 'antiguo' } = opciones;
  const freno = crearFreno();
  const salida = [];
  for (let i = 0; i < entities.length; i++) {
    const ent = entities[i];
    const etiqueta = entityLabels[ent] || ent;
    onProgress?.(`Analizando ${etiqueta}… (${i + 1}/${entities.length})`);
    try {
      const todos = await fetchAllRecordsFast(ent, { freno });
      const plan = planDuplicados(todos, { conservar });
      const revision = revisarPlanDuplicados(plan);
      salida.push({
        entidad: ent,
        etiqueta,
        total: plan.total,
        duplicados: plan.aBorrar.length,
        seConservan: plan.seConservan,
        grupos: plan.grupos.length,
        seguro: revision.seguro,
        motivo: revision.motivo,
        aBorrar: plan.aBorrar,
        error: null,
      });
    } catch (err) {
      // Una sección que no se ha podido leer entera NO se analiza: los
      // "duplicados" que salieran de una lectura a medias no serían reales.
      salida.push({
        entidad: ent, etiqueta, total: 0, duplicados: 0, seConservan: 0, grupos: 0,
        seguro: false, motivo: err?.message || String(err), aBorrar: [], error: true,
      });
    }
  }
  return salida;
}

/**
 * BORRA los duplicados de un análisis previo.
 *
 * Solo toca lo que el análisis marcó como seguro, solo registros con id, y
 * cuenta los borrados que fallan en vez de tragárselos. Antes se hacía
 * `.catch(() => {})` en cada borrado: si fallaban todos, el mensaje final
 * seguía diciendo "proceso completado".
 *
 * @param {Array} analisis  lo que devolvió analizarDuplicados()
 * @param {(msg:string)=>void} [onProgress]
 */
export async function borrarDuplicados(analisis, onProgress) {
  const freno = crearFreno();
  const resultados = [];
  for (const fila of analisis || []) {
    if (!fila.seguro || fila.error || fila.duplicados === 0) {
      resultados.push({ ...fila, borrados: 0, fallidos: 0, omitida: !fila.seguro || !!fila.error });
      continue;
    }
    const E = entidades[fila.entidad];
    let borrados = 0;
    let fallidos = 0;
    onProgress?.(`Borrando ${fila.duplicados} duplicados de ${fila.etiqueta}…`);
    await runPool(fila.aBorrar, async (rec) => {
      if (!rec?.id) { fallidos++; return; }
      try { await pedir(freno, () => E.delete(rec.id)); borrados++; }
      catch (err) { fallidos++; console.error('[backupEngine] No se pudo borrar duplicado:', err); }
    }, BORRADOS_A_LA_VEZ);
    resultados.push({ ...fila, borrados, fallidos, omitida: false });
  }
  return resultados;
}