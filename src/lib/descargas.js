// Gestor de descargas en segundo plano.
//
// Todo lo que se baja de internet (imágenes, tarifas, normativa) pasa por
// aquí para que: (1) el programa no se quede clavado, porque entre elemento y
// elemento se cede el hilo a la pantalla; (2) cualquier pantalla pueda
// mostrar el porcentaje; (3) al terminar la barra desaparezca sola.

const tareas = new Map();
const oyentes = new Set();
let contador = 0;

function avisar() {
  const lista = [...tareas.values()].map((t) => ({ ...t }));
  oyentes.forEach((f) => { try { f(lista); } catch { /* un oyente roto no frena a los demás */ } });
}

export function suscribirDescargas(f) {
  oyentes.add(f);
  f([...tareas.values()].map((t) => ({ ...t })));
  return () => oyentes.delete(f);
}

/** Cede el hilo para que la pantalla responda (toques, scroll, pintar la barra). */
export function cederHilo() {
  return new Promise((ok) => {
    if (typeof globalThis.scheduler?.yield === 'function') globalThis.scheduler.yield().then(ok, () => setTimeout(ok, 0));
    else setTimeout(ok, 0);
  });
}

export function porcentaje(hecho, total) {
  if (!total || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((hecho / total) * 100)));
}

/**
 * Abre una tarea visible. Devuelve { progreso, terminar, fallar, cancelada, cancelar }.
 * Al terminar, la tarea se retira sola pasado un instante (o enseguida si hubo error
 * y el usuario la cierra).
 */
export function iniciarTarea(titulo, { total = 0 } = {}) {
  const id = `d${++contador}`;
  const t = { id, titulo, total, hecho: 0, pct: 0, mensaje: '', estado: 'activa', cancelada: false };
  tareas.set(id, t);
  avisar();
  const retirar = (ms) => setTimeout(() => { tareas.delete(id); avisar(); }, ms);
  return {
    id,
    get cancelada() { return t.cancelada; },
    progreso(hecho, tot, mensaje) {
      if (tot !== undefined) t.total = tot;
      t.hecho = hecho;
      t.pct = porcentaje(hecho, t.total);
      if (mensaje !== undefined) t.mensaje = mensaje;
      avisar();
    },
    terminar(mensaje = '') {
      t.estado = 'hecha'; t.pct = 100; t.mensaje = mensaje; avisar(); retirar(1500);
    },
    fallar(mensaje = '') {
      t.estado = 'error'; t.mensaje = mensaje; avisar(); retirar(8000);
    },
  };
}

export function cancelarTarea(id) {
  const t = tareas.get(id);
  if (t) { t.cancelada = true; avisar(); }
}

export function cerrarTarea(id) { tareas.delete(id); avisar(); }

/**
 * Recorre `items` de uno en uno (o `concurrencia` a la vez) cediendo el hilo
 * entre cada uno. Un fallo en un elemento no para el resto.
 */
export async function procesarPorLotes(items, fn, { titulo, concurrencia = 2, mensaje } = {}) {
  const tarea = iniciarTarea(titulo, { total: items.length });
  const resultados = new Array(items.length);
  let siguiente = 0, hechos = 0, fallos = 0;
  const trabajador = async () => {
    while (!tarea.cancelada) {
      const i = siguiente++;
      if (i >= items.length) return;
      try { resultados[i] = await fn(items[i], i); } catch { fallos++; resultados[i] = null; }
      hechos++;
      tarea.progreso(hechos, items.length, mensaje ? mensaje(items[i]) : '');
      await cederHilo();
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrencia) }, trabajador));
  if (tarea.cancelada) tarea.fallar('Cancelada');
  else if (fallos && fallos === items.length && items.length) tarea.fallar('No se ha podido descargar nada');
  else tarea.terminar(fallos ? `Terminado (${fallos} sin datos)` : 'Terminado');
  return { resultados, fallos, cancelada: tarea.cancelada };
}

/** fetch con plazo máximo: una web lenta no puede dejar la descarga colgada. */
export async function fetchConPlazo(url, opciones = {}, ms = 12000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try { return await fetch(url, { ...opciones, signal: ctl.signal }); }
  finally { clearTimeout(timer); }
}
