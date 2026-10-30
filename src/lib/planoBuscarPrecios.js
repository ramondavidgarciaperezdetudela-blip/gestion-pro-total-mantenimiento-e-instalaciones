/**
 * planoBuscarPrecios.js — Buscar en las tarifas de UN proveedor las máquinas
 * que cubren la potencia calculada.
 *
 * Las tarifas son texto libre (nombre y código). La potencia se lee del propio
 * texto (kW, W, kcal/h, frigorías) y el tipo por palabras clave. Si una línea
 * no dice su potencia no se adivina: no entra en la lista.
 */

const num = (t) => parseFloat(String(t).replace(',', '.'));
const norm = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Potencia frigorífica en kW que dice el texto, o null. */
export function capacidadDeTexto(texto) {
  const t = norm(texto);
  let m = t.match(/(\d+(?:[.,]\d+)?)\s*kw/);
  if (m) return num(m[1]);
  m = t.match(/(\d+(?:[.,]\d+)?)\s*(?:kcal(?:\/h)?|fg(?:\/h)?|frig)/);
  if (m) return num(m[1]) / 860;
  m = t.match(/(\d{3,6})\s*w\b/);
  if (m) return num(m[1]) / 1000;
  return null;
}

/** 'evaporador' | 'condensadora' | null */
export function tipoDeMaquina(texto) {
  const t = norm(texto);
  if (/evaporador|aerorefrigerador|difusor/.test(t)) return 'evaporador';
  if (/condensador|grupo|unidad exterior|unidad cond/.test(t)) return 'condensadora';
  return null;
}

const precioDe = (p) => {
  const venta = Number(p.sale_price) || 0;
  const coste = Number(p.cost_price) || 0;
  return { venta, coste, precio: venta > 0 ? venta : coste };
};

/**
 * @param precios  líneas SupplierPrice del proveedor elegido
 * @param tipo     'evaporador' | 'condensadora'
 * @param kw       potencia necesaria
 * @param camaraTipo 'positiva' | 'negativa' (para dar preferencia)
 * @returns hasta `max` candidatas, la más ajustada por encima primero
 */
export function buscarMaquinas(precios = [], { tipo, kw, camaraTipo = 'positiva', max = 5 } = {}) {
  const necesario = Number(kw) || 0;
  const lista = [];
  for (const p of precios) {
    const texto = `${p.product_name || ''} ${p.product_code || ''} ${p.category || ''}`;
    if (tipoDeMaquina(texto) !== tipo) continue;
    const cap = capacidadDeTexto(texto);
    if (!cap) continue;
    const { precio, venta, coste } = precioDe(p);
    if (!(precio > 0)) continue;
    const t = norm(texto);
    const esNeg = /congel|negativ|\bbt\b|-\s?2\d|-\s?3\d/.test(t);
    const esPos = /conserv|positiv|\bmt\b|refriger/.test(t);
    const coincide = camaraTipo === 'negativa' ? esNeg || !esPos : esPos || !esNeg;
    lista.push({
      id: p.id, nombre: p.product_name || p.product_code, codigo: p.product_code || '', marca: p.brand || '',
      capacidad_kw: r2(cap), precio, venta, coste, proveedor: p.supplier_name || '',
      cubre: cap >= necesario * 0.97, coincide,
    });
  }
  const buenas = lista.filter((x) => x.cubre);
  const ordenar = (a, b) => (Number(b.coincide) - Number(a.coincide)) || (a.capacidad_kw - b.capacidad_kw) || (a.precio - b.precio);
  const salida = buenas.sort(ordenar).slice(0, max);
  // Si ninguna cubre, se enseña la mayor para que se vea que falta potencia.
  if (!salida.length && lista.length) {
    const mayor = lista.sort((a, b) => b.capacidad_kw - a.capacidad_kw)[0];
    return [{ ...mayor, insuficiente: true }];
  }
  return salida;
}
const r2 = (n) => Math.round(n * 100) / 100;
