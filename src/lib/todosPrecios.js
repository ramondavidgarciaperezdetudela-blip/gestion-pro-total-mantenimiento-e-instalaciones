// Lee TODOS los artículos de tarifa (de un proveedor o de todos), de 1.000 en 1.000, sin ningún tope.
// Paginar sin ordenar y quitar repetidos: con miles de artículos creados a la vez, ordenar por fecha no es estable.
export async function todosLosPrecios(base44, consulta = {}, tamano = 1000) {
  const vistos = new Set(); const salida = [];
  for (let saltar = 0; ; saltar += tamano) {
    const lote = (await base44.entities.SupplierPrice.filter(consulta, null, tamano, saltar)) || [];
    for (const p of lote) { if (p.id && vistos.has(p.id)) continue; if (p.id) vistos.add(p.id); salida.push(p); }
    if (lote.length < tamano) break;
  }
  return salida;
}
