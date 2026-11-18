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
 * Borra de golpe: UNA petición por cada 1.000 líneas (`deleteMany` con la lista de ids), no una por línea.
 * Si el servidor rechaza un bloque entero, solo ese bloque se reintenta línea a línea para saber cuáles
 * fallan y por qué (casi siempre permisos: la línea la creó otra cuenta).
 */
export async function borrarEnLotes(api, items, { concurrencia = 5, bloque = 1000, onProgreso, freno } = {}) {
  const borradas = [];
  const fallidas = [];
  const hecho = () => borradas.length + fallidas.length;
  const uno = async (item) => {
    try { await api.delete(item.id); borradas.push(item); }
    catch (e) { fallidas.push({ item, error: e?.response?.data?.message || e?.message || 'error desconocido' }); }
  };
  for (let d = 0; d < items.length; d += bloque) {
    if (freno?.parar) break;
    const trozo = items.slice(d, d + bloque);
    let hechoDeGolpe = false;
    // Solo si la entidad garantiza que `deleteMany` con ids borra exactamente esos (almacén propio): en otros back-ends una consulta mal entendida podría borrar de más.
    if (api.borradoEnBloque === true && typeof api.deleteMany === 'function' && trozo.length > 1) {
      try {
        await api.deleteMany({ id: { $in: trozo.map((x) => x.id) } });
        borradas.push(...trozo);
        hechoDeGolpe = true;
      } catch { /* se prueba una a una solo este bloque */ }
    }
    if (!hechoDeGolpe) {
      let i = 0;
      const trabajador = async () => { while (i < trozo.length) { if (freno?.parar) return; await uno(trozo[i++]); } };
      await Promise.all(Array.from({ length: Math.max(1, concurrencia) }, trabajador));
    }
    onProgreso?.(hecho(), items.length);
  }
  return { borradas, fallidas };
}

/** Vuelve a crear líneas borradas (sin los campos que pone el servidor), por bloques de 500 si se puede. */
export async function recrearLineas(api, items, { concurrencia = 5, bloque = 500 } = {}) {
  const limpias = items.map(({ id, created_date, updated_date, created_by, created_by_id, ...resto }) => resto); // eslint-disable-line no-unused-vars
  let hechas = 0;
  const unaAUna = async (lista) => {
    let i = 0;
    const trabajador = async () => {
      while (i < lista.length) {
        const fila = lista[i++];
        try { await api.create(fila); hechas++; } catch { /* se cuenta como no recuperada */ }
      }
    };
    await Promise.all(Array.from({ length: Math.max(1, concurrencia) }, trabajador));
  };
  for (let d = 0; d < limpias.length; d += bloque) {
    const trozo = limpias.slice(d, d + bloque);
    if (api.borradoEnBloque === true && typeof api.bulkCreate === 'function' && trozo.length > 1) {
      try { await api.bulkCreate(trozo); hechas += trozo.length; continue; } catch { /* este bloque, una a una */ }
    }
    await unaAUna(trozo);
  }
  return hechas;
}
