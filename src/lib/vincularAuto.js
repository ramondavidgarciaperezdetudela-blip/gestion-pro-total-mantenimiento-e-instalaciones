/**
 * vincularAuto.js — Unir sola cada ficha con su cliente.
 *
 * Facturas, documentos, órdenes, fichas… guardan el cliente por identificador
 * (`contact_id`) y por nombre (`contact_name`). Tras restaurar una copia o
 * importar datos, el identificador puede no coincidir con ningún cliente y la
 * ficha queda suelta. Aquí se buscan esas fichas y se unen al cliente por el
 * nombre, sin tener que hacerlo a mano.
 */
import { reenlazarFilas } from './vinculos.js';

export const ENTIDADES_CON_CLIENTE = [
  'Invoice', 'SATOrder', 'MaintenanceSheet', 'Project', 'ClientDocument',
  'ClientMachine', 'ClientNote', 'Appointment', 'InsuranceReport', 'RefrigerationPlan',
];

/** Cambios a hacer: [{id, contact_id}] solo de las fichas cuyo cliente se ha podido deducir. */
export function cambiosDeVinculo(filas, clientes) {
  const { filas: nuevas } = reenlazarFilas(filas, new Map(), clientes);
  const cambios = [];
  nuevas.forEach((n, i) => {
    const f = filas[i];
    if (n.contact_id && n.contact_id !== f.contact_id) cambios.push({ id: f.id, contact_id: n.contact_id });
  });
  return cambios;
}

/** Recorre las entidades y arregla lo suelto. Devuelve cuántas fichas ha unido. */
export async function vincularTodo(base44, { entidades = ENTIDADES_CON_CLIENTE } = {}) {
  const clientes = await base44.entities.Contact.list('-created_date', 5000);
  if (!clientes?.length) return 0;
  let unidas = 0;
  for (const ent of entidades) {
    const api = base44.entities[ent];
    if (!api) continue;
    let filas = [];
    try { filas = await api.list('-created_date', 5000); } catch { continue; }
    for (const c of cambiosDeVinculo(filas || [], clientes)) {
      try { await api.update(c.id, { contact_id: c.contact_id }); unidas++; } catch { /* sin permiso: se salta */ }
    }
  }
  return unidas;
}
