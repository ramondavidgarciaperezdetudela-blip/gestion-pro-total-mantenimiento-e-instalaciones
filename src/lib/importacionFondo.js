/**
 * importacionFondo.js — Estado compartido de las importaciones que siguen trabajando en segundo plano.
 *
 * La importación de una tarifa guarda aquí su avance (porcentaje y detalle) y el aviso final; un panel
 * fijo abajo a la derecha lo enseña mientras se sigue usando el programa. Sin dependencias de pantalla.
 */
let estado = { activa: false, titulo: '', pct: 0, detalle: '', inicio: 0, id: null };
const oyentes = new Set();
const emitir = () => oyentes.forEach((f) => f());

export const leerImportacion = () => estado;
export const suscribirImportacion = (f) => { oyentes.add(f); return () => oyentes.delete(f); };

export function iniciarImportacion(titulo, ahora = Date.now()) {
  const id = `${ahora}-${Math.random().toString(36).slice(2, 7)}`;
  estado = { activa: true, titulo, pct: 0, detalle: '', inicio: ahora, id };
  emitir();
  return id;
}
export function avanzarImportacion(id, { pct, detalle } = {}) {
  if (estado.id !== id) return;
  estado = { ...estado, pct: pct != null ? Math.max(0, Math.min(100, Math.round(pct))) : estado.pct, detalle: detalle ?? estado.detalle };
  emitir();
}
export function terminarImportacion(id) {
  if (estado.id !== id) return;
  estado = { ...estado, activa: false, pct: 100 };
  emitir();
}

/** Segundos que quedan según el ritmo llevado, o null si aún no se puede saber. */
export function segundosRestantes(pct, inicio, ahora = Date.now()) {
  if (!(pct >= 3)) return null;
  const gastado = (ahora - inicio) / 1000;
  return Math.max(0, Math.round((gastado * (100 - pct)) / pct));
}
export function textoTiempo(seg) {
  if (seg == null) return '';
  const m = Math.floor(seg / 60), s = seg % 60;
  return m > 0 ? `${m} min ${String(s).padStart(2, '0')} s` : `${s} s`;
}

/** Aviso final: { tipo: 'ok' | 'aviso' | 'error', titulo, detalle } a partir del resultado de guardar. */
export function avisoFinal({ proveedor = '', guardados = 0, actualizados = 0, fallidos = [], total = 0 } = {}) {
  const donde = proveedor ? ` en la tarifa de ${proveedor}` : '';
  if (!fallidos.length) {
    return { tipo: 'ok', titulo: 'Importación realizada con éxito', detalle: `${guardados} nuevos y ${actualizados} actualizados${donde}.` };
  }
  const ejemplos = fallidos.slice(0, 3).map((f) => `${f.product_name || f.product_code || '—'}: ${f.reason || 'error'}`).join(' · ');
  const hechos = guardados + actualizados;
  return {
    tipo: hechos > 0 ? 'aviso' : 'error',
    titulo: hechos > 0 ? `Importación terminada con ${fallidos.length} errores` : 'La importación ha fallado',
    detalle: `${hechos} de ${total} guardados${donde}. ${fallidos.length} con problema (${ejemplos}${fallidos.length > 3 ? '…' : ''}). Ábrela de nuevo para ver el detalle y reintentar.`,
  };
}
