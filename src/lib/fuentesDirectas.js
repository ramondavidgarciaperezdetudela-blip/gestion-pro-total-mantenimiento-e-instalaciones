// Fuentes de internet SIN IA: se consultan directamente (HTTP).
import { fetchConPlazo } from './descargas.js';

// ── Imágenes: Wikimedia Commons (API abierta, admite CORS con origin=*) ──
export function urlBusquedaImagen(consulta, ancho = 800) {
  const q = encodeURIComponent(String(consulta || '').trim());
  return `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=6&gsrsearch=${q}&prop=imageinfo&iiprop=url|mime&iiurlwidth=${ancho}&format=json&origin=*`;
}

export function primeraImagenDeWikimedia(json) {
  const paginas = Object.values(json?.query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
  for (const p of paginas) {
    const info = p.imageinfo?.[0];
    if (info && /^image\/(jpeg|png|webp)/.test(info.mime || '')) return info.thumburl || info.url;
  }
  return null;
}

export async function imagenDeWikimedia(consulta) {
  const r = await fetchConPlazo(urlBusquedaImagen(consulta));
  if (!r.ok) return null;
  return primeraImagenDeWikimedia(await r.json());
}

// ── Tarifas: fichero CSV o JSON que publica el proveedor (campo api_url) ──
export function parsearCSV(texto) {
  const filas = [];
  const sep = (texto.split('\n')[0] || '').includes(';') ? ';' : ',';
  for (const linea of String(texto).split(/\r?\n/)) {
    if (!linea.trim()) continue;
    const celdas = []; let cur = ''; let comillas = false;
    for (const ch of linea) {
      if (ch === '"') comillas = !comillas;
      else if (ch === sep && !comillas) { celdas.push(cur); cur = ''; }
      else cur += ch;
    }
    celdas.push(cur);
    filas.push(celdas.map((c) => c.trim()));
  }
  if (filas.length < 2) return [];
  const cab = filas[0].map((c) => c.toLowerCase());
  return filas.slice(1).map((f) => Object.fromEntries(cab.map((c, i) => [c, f[i] ?? ''])));
}

const num = (v) => {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').replace(/[^\d.,-]/g, '');
  if (!s) return null;
  const n = s.includes(',') ? Number(s.replace(/\./g, '').replace(',', '.')) : Number(s);
  return Number.isFinite(n) ? n : null;
};

/** Convierte filas de cualquier tarifa a { codigo, precio, nombre }. */
export function normalizarTarifa(filas) {
  const lista = Array.isArray(filas) ? filas : (filas?.items || filas?.productos || filas?.data || []);
  return lista.map((f) => {
    const g = (...claves) => { for (const k of claves) { const v = f[k] ?? f[k.toLowerCase()]; if (v !== undefined && v !== '') return v; } return null; };
    return {
      codigo: String(g('codigo', 'código', 'referencia', 'ref', 'product_code', 'sku') ?? '').trim(),
      precio: num(g('precio', 'pvp', 'cost_price', 'price', 'tarifa', 'coste')),
      nombre: g('nombre', 'descripcion', 'descripción', 'product_name', 'name'),
    };
  }).filter((x) => x.codigo && x.precio !== null && x.precio >= 0);
}

export async function descargarTarifa(url) {
  const r = await fetchConPlazo(url, {}, 20000);
  if (!r.ok) throw new Error(`El proveedor responde ${r.status}`);
  const texto = await r.text();
  let filas;
  try { filas = JSON.parse(texto); } catch { filas = parsearCSV(texto); }
  return normalizarTarifa(filas);
}

/** Cruza la tarifa descargada con los precios guardados: devuelve solo los cambios. */
export function cambiosDePrecio(guardados, tarifa) {
  const porCodigo = new Map(tarifa.map((t) => [t.codigo.toLowerCase(), t]));
  const cambios = [];
  for (const p of guardados) {
    const t = porCodigo.get(String(p.product_code || '').trim().toLowerCase());
    if (t && Math.abs((p.cost_price ?? 0) - t.precio) > 0.004) cambios.push({ id: p.id, antes: p.cost_price ?? 0, despues: t.precio });
  }
  return cambios;
}

// ── Normativa: sumario del BOE (datos abiertos) ──
export const PALABRAS_NORMATIVA = ['refriger', 'frigorífic', 'frigorific', 'fluorad', 'rite', 'climatiz', 'instalaciones térmicas', 'eficiencia energética', 'baja tensión', 'legionel'];

export function filtrarSumarioBOE(json) {
  const salida = [];
  const recorrer = (n) => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach(recorrer); return; }
    if (n.titulo && (n.identificador || n.url_pdf)) {
      const t = String(n.titulo).toLowerCase();
      if (PALABRAS_NORMATIVA.some((p) => t.includes(p))) {
        salida.push({ id: n.identificador, titulo: n.titulo, url: n.url_pdf?.texto || n.url_html || `https://www.boe.es/diario_boe/txt.php?id=${n.identificador}` });
      }
    }
    Object.values(n).forEach(recorrer);
  };
  recorrer(json?.data?.sumario ?? json);
  return salida;
}

export function fechaBOE(d = new Date()) {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

export async function normativaDelDia(fecha = new Date()) {
  const r = await fetchConPlazo(`https://www.boe.es/datosabiertos/api/boe/sumario/${fechaBOE(fecha)}`, { headers: { Accept: 'application/json' } });
  if (r.status === 404) return [];
  if (!r.ok) throw new Error(`BOE responde ${r.status}`);
  return filtrarSumarioBOE(await r.json());
}
