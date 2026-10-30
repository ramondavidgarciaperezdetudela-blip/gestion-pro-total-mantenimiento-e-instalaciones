// Almacén en el propio dispositivo (IndexedDB). Sin cuenta, sin servidor, sin coste.
const BD = 'gpt-datos';
const TABLA = 'registros';

let abierta = null;
const memoria = new Map(); // respaldo si IndexedDB no está disponible

function abrir() {
  if (abierta) return abierta;
  abierta = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('sin IndexedDB'));
    const r = indexedDB.open(BD, 1);
    r.onupgradeneeded = () => {
      const os = r.result.createObjectStore(TABLA, { keyPath: 'k' });
      os.createIndex('e', 'e');
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  }).catch((e) => { console.warn('[almacenLocal] IndexedDB no disponible, se usa memoria:', e); return null; });
  return abierta;
}

const pedir = (req) => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
const clave = (e, id) => `${e}\u0000${id}`;

export const almacenLocal = {
  nombre: 'local',
  async listar(ent) {
    const db = await abrir();
    if (!db) return [...memoria.values()].filter((x) => x.e === ent).map((x) => x.d);
    const tx = db.transaction(TABLA, 'readonly');
    const filas = await pedir(tx.objectStore(TABLA).index('e').getAll(IDBKeyRange.only(ent)));
    return filas.map((x) => x.d);
  },
  async poner(ent, regs) {
    const db = await abrir();
    if (!db) { regs.forEach((d) => memoria.set(clave(ent, d.id), { k: clave(ent, d.id), e: ent, d })); return; }
    await new Promise((res, rej) => {
      const tx = db.transaction(TABLA, 'readwrite');
      const os = tx.objectStore(TABLA);
      regs.forEach((d) => os.put({ k: clave(ent, d.id), e: ent, d }));
      tx.oncomplete = res; tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error);
    });
  },
  async quitar(ent, ids) {
    const db = await abrir();
    if (!db) { ids.forEach((id) => memoria.delete(clave(ent, id))); return; }
    await new Promise((res, rej) => {
      const tx = db.transaction(TABLA, 'readwrite');
      ids.forEach((id) => tx.objectStore(TABLA).delete(clave(ent, id)));
      tx.oncomplete = res; tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error);
    });
  },
};
