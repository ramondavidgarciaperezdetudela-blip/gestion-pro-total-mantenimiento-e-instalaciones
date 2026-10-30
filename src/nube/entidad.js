// La API de entidades (list, filter, create…) sobre cualquier almacén.
import { almacenActivo } from './almacen';
import { leerConfig, escucharConfig } from './config';
import { cumple, ordenar, recortar } from './consulta';
import { usuarioActual } from './autenticacion';

const TTL_REMOTO = 4000;
const cache = new Map(); // ent -> { t, lista }
const oyentes = new Map(); // ent -> Set
escucharConfig(() => cache.clear());

const ahora = () => new Date().toISOString();
const nuevoId = () => (globalThis.crypto?.randomUUID
  ? crypto.randomUUID().replace(/-/g, '').slice(0, 24)
  : `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 12)}`);

const copia = (x) => (typeof structuredClone === 'function' ? structuredClone(x) : JSON.parse(JSON.stringify(x)));

function emitir(ent, type, data) {
  oyentes.get(ent)?.forEach((f) => { try { f({ type, id: data?.id, data }); } catch (e) { console.error(e); } });
}

async function todos(ent) {
  const c = cache.get(ent);
  const remoto = leerConfig()?.modo !== 'local';
  if (c && (!remoto || Date.now() - c.t < TTL_REMOTO)) return c.lista;
  const lista = await almacenActivo().listar(ent);
  cache.set(ent, { t: Date.now(), lista });
  return lista;
}

function noEncontrado(ent, id) {
  const e = new Error(`${ent} ${id} no existe`);
  e.status = 404;
  return e;
}

export function crearEntidad(ent) {
  const guardar = async (regs) => {
    await almacenActivo().poner(ent, regs);
    const c = cache.get(ent);
    if (c) {
      const m = new Map(c.lista.map((r) => [r.id, r]));
      regs.forEach((r) => m.set(r.id, r));
      cache.set(ent, { t: Date.now(), lista: [...m.values()] });
    }
  };
  const api = {
    async list(orden, limite, saltar) {
      return copia(recortar(ordenar(await todos(ent), orden), limite, saltar));
    },
    async filter(q, orden, limite, saltar) {
      return copia(recortar(ordenar((await todos(ent)).filter((r) => cumple(r, q)), orden), limite, saltar));
    },
    async get(id) {
      const r = (await todos(ent)).find((x) => x.id === id);
      if (!r) throw noEncontrado(ent, id);
      return copia(r);
    },
    async create(datos) {
      const u = usuarioActual();
      const r = { ...copia(datos || {}), id: nuevoId(), created_date: ahora(), updated_date: ahora(), created_by: u?.email, created_by_id: u?.id };
      await guardar([r]);
      emitir(ent, 'create', r);
      return copia(r);
    },
    async bulkCreate(lista) {
      const u = usuarioActual();
      const regs = (lista || []).map((d) => ({ ...copia(d || {}), id: nuevoId(), created_date: ahora(), updated_date: ahora(), created_by: u?.email, created_by_id: u?.id }));
      if (regs.length) await guardar(regs);
      regs.forEach((r) => emitir(ent, 'create', r));
      return copia(regs);
    },
    async update(id, datos) {
      const actual = (await todos(ent)).find((x) => x.id === id);
      if (!actual) throw noEncontrado(ent, id);
      const r = { ...actual, ...copia(datos || {}), id, created_date: actual.created_date, updated_date: ahora() };
      await guardar([r]);
      emitir(ent, 'update', r);
      return copia(r);
    },
    async bulkUpdate(lista) {
      const salida = [];
      for (const d of lista || []) { if (d?.id) salida.push(await api.update(d.id, d)); }
      return salida;
    },
    async updateMany(q, datos) {
      const objetivo = (await todos(ent)).filter((r) => cumple(r, q));
      const regs = objetivo.map((a) => ({ ...a, ...copia(datos || {}), id: a.id, updated_date: ahora() }));
      if (regs.length) await guardar(regs);
      regs.forEach((r) => emitir(ent, 'update', r));
      return { success: true, updated: regs.length };
    },
    async delete(id) {
      await almacenActivo().quitar(ent, [id]);
      const c = cache.get(ent);
      if (c) cache.set(ent, { t: Date.now(), lista: c.lista.filter((r) => r.id !== id) });
      emitir(ent, 'delete', { id });
      return { success: true };
    },
    async deleteMany(q) {
      const ids = (await todos(ent)).filter((r) => cumple(r, q)).map((r) => r.id);
      if (ids.length) await almacenActivo().quitar(ent, ids);
      const c = cache.get(ent);
      if (c) cache.set(ent, { t: Date.now(), lista: c.lista.filter((r) => !ids.includes(r.id)) });
      ids.forEach((id) => emitir(ent, 'delete', { id }));
      return { success: true, deleted: ids.length };
    },
    async schema() { return { name: ent, properties: {} }; },
    subscribe(fn) {
      if (!oyentes.has(ent)) oyentes.set(ent, new Set());
      oyentes.get(ent).add(fn);
      // En modo remoto se refresca cada tanto para ver lo que graben otros aparatos.
      let t = null; let ultimo = '';
      if (leerConfig()?.modo !== 'local') {
        t = setInterval(async () => {
          try {
            cache.delete(ent);
            const lista = await todos(ent);
            const firma = lista.map((r) => `${r.id}:${r.updated_date}`).sort().join('|');
            if (ultimo && firma !== ultimo) fn({ type: 'update', id: null, data: null });
            ultimo = firma;
          } catch { /* sin red: se reintenta */ }
        }, 15000);
      }
      return () => { oyentes.get(ent)?.delete(fn); if (t) clearInterval(t); };
    },
  };
  return api;
}

export function vaciarCache() { cache.clear(); }
