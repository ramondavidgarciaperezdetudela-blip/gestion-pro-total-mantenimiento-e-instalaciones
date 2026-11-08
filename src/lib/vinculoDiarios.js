/**
 * vinculoDiarios.js — Vincula los diarios de reparaciones con sus clientes y máquinas.
 *
 * Un diario puede haberse creado sin cliente, con otro registro del mismo cliente
 * (duplicado) o importado solo con el NOMBRE. Antes la ficha del cliente solo
 * enseñaba los diarios con su contact_id exacto, y el resto quedaba suelto.
 * Aquí se reconoce el diario por:
 *   1. el id del cliente, si existe;
 *   2. el nombre del cliente (sin mayúsculas, tildes ni signos), si lo identifica
 *      sin dudas (si dos clientes se llaman igual, no se adivina);
 * y la máquina por número de serie, por el id guardado o por el TIPO de equipo
 * (más marca/modelo/nombre cuando hay varias del mismo tipo).
 * Todo es puro (sin servidor) para poder probarlo con `npm run test:diarios`.
 */

export function normaliza(texto) {
  return String(texto ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

const palabras = (t) => normaliza(t).split(' ').filter(Boolean);

/** Todas las formas en que se puede escribir el nombre de un cliente. */
export function nombresDelContacto(c) {
  const nombre = normaliza(c?.name);
  const apellidos = normaliza(c?.surname);
  const set = new Set();
  if (nombre) set.add(nombre);
  if (nombre && apellidos) { set.add(`${nombre} ${apellidos}`); set.add(`${apellidos} ${nombre}`); }
  const empresa = normaliza(c?.company_name);
  if (empresa) set.add(empresa);
  return set;
}

/** ¿Este nombre escrito en el diario es el de este cliente? 'exacto' | 'parecido' | null */
export function coincideNombre(nombre, contacto) {
  const n = normaliza(nombre);
  if (!n) return null;
  const formas = nombresDelContacto(contacto);
  if (formas.has(n)) return 'exacto';
  // Parecido: todas las palabras de uno están en el otro (mínimo dos palabras en el más corto).
  const pn = palabras(n);
  for (const f of formas) {
    const pf = palabras(f);
    const [corto, largo] = pn.length <= pf.length ? [pn, pf] : [pf, pn];
    if (corto.length >= 2 && corto.every((w) => largo.includes(w))) return 'parecido';
  }
  return null;
}

/**
 * Cliente al que pertenece el diario.
 * @returns {{contacto, por: 'id'|'nombre'}|{ambiguo: true}|null}
 */
export function contactoDelDiario(diario, contactos) {
  const lista = contactos || [];
  const porId = diario?.contact_id ? lista.find((c) => c.id === diario.contact_id) : null;
  if (porId) return { contacto: porId, por: 'id' };
  const nombre = diario?.contact_name;
  if (!normaliza(nombre)) return null;
  const coincidencias = lista.map((c) => ({ c, t: coincideNombre(nombre, c) })).filter((x) => x.t);
  const exactos = coincidencias.filter((x) => x.t === 'exacto');
  const elegidos = exactos.length ? exactos : coincidencias;
  if (elegidos.length === 1) return { contacto: elegidos[0].c, por: 'nombre' };
  return elegidos.length > 1 ? { ambiguo: true } : null;
}

const serie = (x) => normaliza(x).replace(/ /g, '');

/**
 * Máquina del cliente a la que corresponde el diario (entre las máquinas de ESE cliente).
 * @returns {{maquina, por: 'id'|'serie'|'tipo+nombre'|'tipo'}|null}
 */
export function maquinaDelDiario(diario, maquinas) {
  const lista = maquinas || [];
  if (!lista.length) return null;
  if (diario?.machine_id) {
    const m = lista.find((x) => x.id === diario.machine_id);
    if (m) return { maquina: m, por: 'id' };
  }
  const s = serie(diario?.serial_number);
  if (s) {
    const m = lista.find((x) => serie(x.serial_number) === s);
    if (m) return { maquina: m, por: 'serie' };
  }
  const tipo = diario?.machine_type || 'otro';
  const delTipo = lista.filter((m) => (m.machine_type || 'otro') === tipo);
  if (!delTipo.length) return null;
  if (delTipo.length === 1) return { maquina: delTipo[0], por: 'tipo' };
  // Varias del mismo tipo: nombre, o marca + modelo.
  const nd = normaliza(diario?.machine_name);
  const bd = normaliza(diario?.equipment_brand);
  const md = normaliza(diario?.equipment_model);
  const afinadas = delTipo.filter((m) => {
    const nm = normaliza(m.name);
    if (nd && nm && (nd.includes(nm) || nm.includes(nd))) return true;
    return !!(bd && md && normaliza(m.brand) === bd && normaliza(m.model) === md);
  });
  return afinadas.length === 1 ? { maquina: afinadas[0], por: 'tipo+nombre' } : null;
}

/**
 * Cambios que hay que guardar para que los diarios queden vinculados.
 * @param {{diarios: any[], contactos: any[], maquinasDe: (contactId:string)=>any[]}} datos
 * @returns {{diarioId:string, cambios:object, motivos:string[]}[]}
 */
export function planDeVinculos({ diarios, contactos, maquinasDe }) {
  const plan = [];
  for (const d of diarios || []) {
    const cambios = {};
    const motivos = [];
    const r = contactoDelDiario(d, contactos);
    if (!r || r.ambiguo) continue;
    const nombreOficial = `${r.contacto.name || ''} ${r.contacto.surname || ''}`.trim();
    if (d.contact_id !== r.contacto.id) { cambios.contact_id = r.contacto.id; motivos.push('cliente por nombre'); }
    if (nombreOficial && d.contact_name !== nombreOficial) cambios.contact_name = nombreOficial;
    const m = maquinaDelDiario({ ...d, ...cambios }, maquinasDe ? maquinasDe(r.contacto.id) : []);
    if (m && d.machine_id !== m.maquina.id) { cambios.machine_id = m.maquina.id; motivos.push('máquina por ' + m.por); }
    if (Object.keys(cambios).length && motivos.length) plan.push({ diarioId: d.id, cambios, motivos });
  }
  return plan;
}

/** Filtro por tipo de equipo para la lista. 'todos' deja pasar todo. */
export function filtrarPorTipo(diarios, tipo) {
  return !tipo || tipo === 'todos' ? diarios : (diarios || []).filter((d) => (d.machine_type || 'otro') === tipo);
}

/** Tipos presentes en una lista de diarios, con cuántos hay de cada uno. */
export function tiposPresentes(diarios) {
  const cuenta = {};
  for (const d of diarios || []) { const t = d.machine_type || 'otro'; cuenta[t] = (cuenta[t] || 0) + 1; }
  return Object.entries(cuenta).map(([tipo, n]) => ({ tipo, n })).sort((a, b) => b.n - a.n);
}
