// Filtros y orden de las fichas, al estilo de la base de datos original.
// Se hace en el aparato: los almacenes solo guardan y devuelven fichas.

const esObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

function valor(reg, campo) {
  return String(campo).split('.').reduce((a, k) => (a == null ? undefined : a[k]), reg);
}

function cumpleOperadores(v, ops) {
  return Object.entries(ops).every(([op, esp]) => {
    switch (op) {
      case '$eq': return v === esp;
      case '$ne': return v !== esp;
      case '$in': return Array.isArray(esp) && esp.includes(v);
      case '$nin': return Array.isArray(esp) && !esp.includes(v);
      case '$gt': return v != null && v > esp;
      case '$gte': return v != null && v >= esp;
      case '$lt': return v != null && v < esp;
      case '$lte': return v != null && v <= esp;
      case '$exists': return (v !== undefined && v !== null) === !!esp;
      case '$regex': try { return new RegExp(esp, 'i').test(String(v ?? '')); } catch { return false; }
      default: return true;
    }
  });
}

export function cumple(reg, q) {
  if (!esObj(q)) return true;
  return Object.entries(q).every(([k, esp]) => {
    if (k === '$or') return Array.isArray(esp) && esp.some((s) => cumple(reg, s));
    if (k === '$and') return Array.isArray(esp) && esp.every((s) => cumple(reg, s));
    const v = valor(reg, k);
    if (esObj(esp)) return cumpleOperadores(v, esp);
    if (Array.isArray(v) && !Array.isArray(esp)) return v.includes(esp);
    return v === esp;
  });
}

function comparar(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'es', { numeric: true, sensitivity: 'base' });
}

/** '-fecha' = descendente, 'nombre' = ascendente. */
export function ordenar(lista, orden) {
  if (!orden || typeof orden !== 'string') return lista;
  const claves = orden.split(',').map((s) => s.trim()).filter(Boolean).map((s) => (s.startsWith('-')
    ? { k: s.slice(1), d: -1 } : { k: s.replace(/^\+/, ''), d: 1 }));
  return [...lista].sort((x, y) => {
    for (const { k, d } of claves) {
      const c = comparar(valor(x, k), valor(y, k));
      if (c) return c * d;
    }
    return 0;
  });
}

export function recortar(lista, limite, saltar) {
  const ini = Number(saltar) > 0 ? Number(saltar) : 0;
  const fin = Number(limite) > 0 ? ini + Number(limite) : undefined;
  return lista.slice(ini, fin);
}
