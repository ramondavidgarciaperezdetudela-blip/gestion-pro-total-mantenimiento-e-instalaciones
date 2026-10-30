/**
 * borrarTarifas.js — Quitar tarifas viejas de golpe, y poder deshacerlo.
 *
 * Borrar de una en una con miles de líneas no es práctico. Aquí: elegir cuáles
 * están caducadas, borrar por lotes contando los fallos (sin parar a la primera)
 * y volver a crear las borradas si fue un error.
 */

const fechaDe = (v) => { const t = Date.parse(v); return Number.isFinite(t) ? t : null; };

/** Líneas cuya vigencia ya pasó (o, sin vigencia, creadas antes de `antesDe`). */
export function tarifasCaducadas(items = [], { hoy = Date.now(), antesDe = null } = {}) {
  const corte = antesDe ? fechaDe(antesDe) : null;
  return items.filter((p) => {
    const vig = fechaDe(p.validity_date);
    if (vig !== null) return vig < hoy;
    if (corte !== null) { const cre = fechaDe(p.created_date); return cre !== null && cre < corte; }
    return false;
  });
}

/**
 * Borra por lotes. No se detiene si alguna falla: devuelve cuáles no se pudieron
 * borrar y por qué (casi siempre permisos: la línea la creó otra cuenta).
 */
export async function borrarEnLotes(api, items, { concurrencia = 5, onProgreso, freno } = {}) {
  const borradas = [];
  const fallidas = [];
  let i = 0;
  const trabajador = async () => {
    while (i < items.length) {
      if (freno?.parar) return;
      const item = items[i++];
      try {
        await api.delete(item.id);
        borradas.push(item);
      } catch (e) {
        fallidas.push({ item, error: e?.response?.data?.message || e?.message || 'error desconocido' });
      }
      onProgreso?.(borradas.length + fallidas.length, items.length);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrencia) }, trabajador));
  return { borradas, fallidas };
}

/** Vuelve a crear líneas borradas (sin los campos que pone el servidor). */
export async function recrearLineas(api, items, { concurrencia = 5 } = {}) {
  const limpias = items.map(({ id, created_date, updated_date, created_by, created_by_id, ...resto }) => resto); // eslint-disable-line no-unused-vars
  let i = 0; let hechas = 0;
  const trabajador = async () => {
    while (i < limpias.length) {
      const fila = limpias[i++];
      try { await api.create(fila); hechas++; } catch { /* se cuenta como no recuperada */ }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrencia) }, trabajador));
  return hechas;
}
