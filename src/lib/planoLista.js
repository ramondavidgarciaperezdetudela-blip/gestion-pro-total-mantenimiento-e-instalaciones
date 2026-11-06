// Lista de lo que hay en el plano, cambio de escala y hoja de materiales para el pedido.
// Sin React ni dibujo: solo datos, para poder probarlo aparte.
import { elementoDe, CATEGORIAS } from './planoFrigorificoCatalogo.js';
import { longitudConexion } from './planoCalculo.js';
import { camarasDePlano } from './planoCargaFrigorifica.js';
import { esHueco, anchoHueco, altoHueco } from './planoHuecos.js';

const fmt = (n, d = 2) => Number(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: d });
const redondea = (n, d = 2) => Math.round((Number(n) || 0) * 10 ** d) / 10 ** d;
const SIN_DIBUJO = new Set(['cota', 'trazo', 'texto', 'nota']);

export const nombreElemento = (e) => e?.label || elementoDe(e?.type || e?.id)?.label || e?.type || 'Elemento';

// ── Cambio de escala ───────────────────────────────────────────────────────

/**
 * Cambia los píxeles por metro del plano SIN cambiar lo que mide el dibujo: las coordenadas (en píxeles) se
 * multiplican por nueva/anterior, así una pared de 4 m sigue siendo de 4 m. Las medidas en metros no se tocan.
 */
export function reescalarPlano({ walls = [], elements = [], connections = [] }, escalaAnterior, escalaNueva) {
  const a = Number(escalaAnterior), n = Number(escalaNueva);
  if (!(a > 0) || !(n > 0) || a === n) return { walls, elements, connections };
  const k = n / a;
  const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v * k : v);
  return {
    walls: walls.map((w) => ({ ...w, x1: num(w.x1), y1: num(w.y1), x2: num(w.x2), y2: num(w.y2), ...(w.room_x !== undefined ? { room_x: num(w.room_x) } : {}), ...(w.room_y !== undefined ? { room_y: num(w.room_y) } : {}) })),
    elements: elements.map((e) => {
      const o = { ...e, x: num(e.x), y: num(e.y) };
      if (e.datos && (e.datos.x2 !== undefined || e.datos.y2 !== undefined || Array.isArray(e.datos.points))) {
        o.datos = { ...e.datos };
        if (e.datos.x2 !== undefined) o.datos.x2 = num(e.datos.x2);
        if (e.datos.y2 !== undefined) o.datos.y2 = num(e.datos.y2);
        if (Array.isArray(e.datos.points)) o.datos.points = e.datos.points.map((p) => ({ ...p, x: num(p.x), y: num(p.y) }));
      }
      return o;
    }),
    connections: connections.map((c) => (Array.isArray(c.path) ? { ...c, path: c.path.map((p) => ({ ...p, x: num(p.x), y: num(p.y) })) } : c)),
  };
}

/** Caja que envuelve el dibujo, en píxeles del plano. */
function caja(walls, elements, connections, scale) {
  const xs = [], ys = [];
  walls.forEach((w) => { xs.push(w.x1, w.x2); ys.push(w.y1, w.y2); });
  elements.forEach((e) => { const w = (e.w_m || 0.5) * scale / 2, h = (e.h_m || 0.5) * scale / 2; xs.push(e.x - w, e.x + w); ys.push(e.y - h, e.y + h); });
  connections.forEach((c) => (c.path || []).forEach((p) => { xs.push(p.x); ys.push(p.y); }));
  if (!xs.length) return null;
  return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

export const ESCALAS_PAPEL = [10, 20, 25, 50, 75, 100, 125, 150, 200, 250, 500, 1000];
const AREA_UTIL = { a4: [277, 190], a3: [400, 277] }; // mm útiles en horizontal (descontando marco y cajetín)

/** Escala normalizada 1:N en la que cabe el dibujo en una hoja (null si no hay dibujo). */
export function escalaEnPapel({ walls = [], elements = [], connections = [], scale = 50 }, papel = 'a3') {
  const c = caja(walls, elements, connections, scale);
  if (!c) return null;
  const [pw, ph] = AREA_UTIL[papel] || AREA_UTIL.a3;
  const metrosAncho = c.w / scale, metrosAlto = c.h / scale;
  const exacta = Math.max(metrosAncho * 1000 / pw, metrosAlto * 1000 / ph);
  return ESCALAS_PAPEL.find((n) => n >= exacta) ?? ESCALAS_PAPEL[ESCALAS_PAPEL.length - 1];
}

/** Texto de escala para poner bajo el plano. */
export function textoEscala({ walls = [], elements = [], connections = [], scale = 50, zoom = 1, gridMeters = 1 }) {
  const datos = { walls, elements, connections, scale };
  const a3 = escalaEnPapel(datos, 'a3'), a4 = escalaEnPapel(datos, 'a4');
  return {
    dibujo: `Dibujado a ${scale} px por metro · cuadrícula de ${fmt(gridMeters)} m · zoom ${Math.round(zoom * 100)} %`,
    papel: a3 ? `Impreso: A3 a 1:${a3}${a4 ? ` · A4 a 1:${a4}` : ''}` : 'Impreso: dibuja algo para calcular la escala',
    a3, a4,
  };
}

// ── Lista de elementos del plano ───────────────────────────────────────────

const GRUPOS = ['Cámaras y salas', 'Puertas y ventanas', 'Equipos', 'Conexiones', 'Paredes', 'Cotas y dibujo'];
const CONEXION = { refrigerante: 'Tubería frigorífica', electrica: 'Línea eléctrica', conducto: 'Conducto', comunicacion: 'Comunicación' };

/**
 * Todo lo que hay dibujado, en grupos, con el id que usa el plano para seleccionarlo:
 * [{ grupo, items: [{ id, etiqueta, detalle, color }] }].
 */
export function listaDelPlano({ walls = [], elements = [], connections = [], scale = 50 }) {
  const por = new Map(GRUPOS.map((g) => [g, []]));
  const cat = (id) => CATEGORIAS.find((c) => c.id === id);

  // Recintos: una entrada por sala o cámara, con la primera pared (así lo selecciona el propio plano).
  const vistos = new Set();
  let nCam = 0, nSala = 0;
  walls.forEach((w) => {
    if (!w.room_id || vistos.has(w.room_id)) return;
    vistos.add(w.room_id);
    const medidas = `${fmt(w.room_w_m)} × ${fmt(w.room_h_m)} m${w.alto_m ? ` · alto ${fmt(w.alto_m)} m` : ''}`;
    if (w.camara) por.get('Cámaras y salas').push({ id: w.id, etiqueta: `Cámara ${++nCam}${w.tipo === 'negativa' ? ' negativa' : ' positiva'}`, detalle: `${medidas}${w.espesor_mm ? ` · panel ${w.espesor_mm} mm` : ''}`, color: '#06B6D4' });
    else por.get('Cámaras y salas').push({ id: w.id, etiqueta: `Sala ${++nSala}`, detalle: medidas, color: '#A855F7' });
  });

  const contador = {};
  elements.forEach((e) => {
    const nombre = nombreElemento(e);
    contador[nombre] = (contador[nombre] || 0) + 1;
    const etiqueta = `${nombre} ${contador[nombre]}`;
    if (SIN_DIBUJO.has(e.type)) { por.get('Cotas y dibujo').push({ id: e.id, etiqueta, detalle: '', color: '#64748b' }); return; }
    if (esHueco(e)) {
      por.get('Puertas y ventanas').push({ id: e.id, etiqueta, detalle: `${fmt(anchoHueco(e))} × ${fmt(altoHueco(e))} m`, color: '#A855F7' });
      return;
    }
    const d = e.datos || {};
    const detalle = [d.marca || d.brand, d.modelo || d.model, d.referencia].filter(Boolean).join(' ');
    por.get('Equipos').push({ id: e.id, etiqueta, detalle, color: cat(e.cat || elementoDe(e.type)?.cat)?.color || '#64748b', cat: cat(e.cat || elementoDe(e.type)?.cat)?.label || 'Otros' });
  });

  connections.forEach((c, i) => {
    const a = elements.find((e) => e.id === c.from_id), b = elements.find((e) => e.id === c.to_id);
    const m = longitudConexion(c, elements, scale);
    const diam = c.type === 'refrigerante' ? [c.gas_diameter && `gas ${c.gas_diameter}`, c.liquid_diameter && `líq. ${c.liquid_diameter}`].filter(Boolean).join(' · ') : (c.section_mm2 ? `${c.section_mm2} mm²` : '');
    por.get('Conexiones').push({ id: c.id, etiqueta: `${CONEXION[c.type] || 'Conexión'} ${i + 1}`, detalle: `${a ? nombreElemento(a) : '?'} → ${b ? nombreElemento(b) : '?'} · ${fmt(m)} m${diam ? ` · ${diam}` : ''}`, color: '#0ea5e9' });
  });

  let nP = 0;
  walls.filter((w) => !w.room_id).forEach((w) => {
    por.get('Paredes').push({ id: w.id, etiqueta: `Pared ${++nP}`, detalle: `${fmt(Math.hypot(w.x2 - w.x1, w.y2 - w.y1) / scale)} m`, color: '#78716c' });
  });

  return GRUPOS.map((g) => ({ grupo: g, items: por.get(g) })).filter((g) => g.items.length);
}

// ── Hoja de materiales ─────────────────────────────────────────────────────

export const MERMA = 0.10;
const pedido = (m) => Math.ceil(m * (1 + MERMA));

/**
 * Los materiales del plano con sus medidas y distancias, listos para hacer el pedido.
 * [{ id, titulo, columnas, filas, nota }]. Las longitudes salen del dibujo (por eso dependen de la escala).
 */
export function hojaMateriales({ walls = [], elements = [], connections = [], scale = 50 }) {
  const secciones = [];
  const L = (c) => longitudConexion(c, elements, scale);
  const nombre = (id) => { const e = elements.find((x) => x.id === id); return e ? nombreElemento(e) : '?'; };

  // 1. Tubería frigorífica por diámetro
  const tub = connections.filter((c) => c.type === 'refrigerante');
  if (tub.length) {
    const lineas = new Map(); // "Gas|5/8" → {linea, diam, tramos, m, codos}
    let sinDiam = 0;
    const suma = (linea, diam, m, codos) => {
      const k = `${linea}|${diam}`;
      const o = lineas.get(k) || { linea, diam, tramos: 0, m: 0, codos: 0 };
      o.tramos += 1; o.m += m; o.codos += codos; lineas.set(k, o);
    };
    tub.forEach((c) => {
      const m = L(c), codos = (c.path || []).length;
      if (c.gas_diameter) suma('Aspiración / gas', c.gas_diameter, m, codos);
      if (c.liquid_diameter) suma('Líquido', c.liquid_diameter, m, codos);
      if (!c.gas_diameter && !c.liquid_diameter) sinDiam += m;
    });
    const filas = [...lineas.values()].sort((a, b) => a.linea.localeCompare(b.linea) || String(a.diam).localeCompare(String(b.diam), 'es', { numeric: true }))
      .map((o) => [o.linea, `${o.diam}`, o.tramos, redondea(o.m), o.codos, pedido(o.m)]);
    if (sinDiam > 0) filas.push(['Sin diámetro asignado', '—', '', redondea(sinDiam), '', pedido(sinDiam)]);
    secciones.push({
      id: 'tuberia', titulo: 'Tubería frigorífica (cobre)',
      columnas: ['Línea', 'Diámetro', 'Tramos', 'Metros', 'Codos', `Pedido (+${Math.round(MERMA * 100)} %)`],
      filas,
      nota: `Metros medidos sobre el plano (a ${scale} px/m). «Pedido» suma un ${Math.round(MERMA * 100)} % para recortes y uniones, redondeado a metros. Los codos son los cambios de dirección dibujados en cada tramo.${sinDiam > 0 ? ' Hay tuberías sin diámetro: asígnalo en cada conexión.' : ''}`,
    });
    secciones.push({
      id: 'tramos', titulo: 'Distancias de cada tramo',
      columnas: ['Desde', 'Hasta', 'Metros', 'Gas', 'Líquido', 'Desnivel (m)'],
      filas: tub.map((c) => [nombre(c.from_id), nombre(c.to_id), redondea(L(c)), c.gas_diameter || '—', c.liquid_diameter || '—', c.height_m ? redondea(c.height_m) : '']),
    });
  }

  // 2. Eléctrica
  const ele = connections.filter((c) => c.type === 'electrica');
  if (ele.length) {
    const porSec = new Map();
    ele.forEach((c) => {
      const k = c.section_mm2 ? `${c.section_mm2} mm²` : 'Sección sin asignar';
      const o = porSec.get(k) || { tramos: 0, m: 0, w: 0 };
      o.tramos += 1; o.m += L(c); o.w += Number(c.power_w) || 0; porSec.set(k, o);
    });
    secciones.push({
      id: 'electrica', titulo: 'Cableado eléctrico',
      columnas: ['Sección', 'Tramos', 'Metros', 'Potencia (W)', `Pedido (+${Math.round(MERMA * 100)} %)`],
      filas: [...porSec.entries()].map(([k, o]) => [k, o.tramos, redondea(o.m), o.w ? Math.round(o.w) : '', pedido(o.m)]),
      nota: 'Longitud en línea sobre el plano: añade la bajada y subida de cada equipo.',
    });
  }

  // 3. Conductos
  const cond = connections.filter((c) => c.type === 'conducto');
  if (cond.length) {
    const por = new Map();
    cond.forEach((c) => {
      const k = `${c.duct_shape || 'Rectangular'} ${c.duct_section || '(sección sin asignar)'}`.trim();
      const o = por.get(k) || { tramos: 0, m: 0 };
      o.tramos += 1; o.m += L(c); por.set(k, o);
    });
    secciones.push({
      id: 'conductos', titulo: 'Conductos',
      columnas: ['Tipo y sección', 'Tramos', 'Metros', `Pedido (+${Math.round(MERMA * 100)} %)`],
      filas: [...por.entries()].map(([k, o]) => [k, o.tramos, redondea(o.m), pedido(o.m)]),
    });
  }

  // 4. Cámaras: paneles
  const camaras = camarasDePlano(walls);
  if (camaras.length) {
    const filas = [];
    camaras.forEach((c, i) => {
      const per = 2 * (c.ancho + c.largo);
      const paredes = per * c.alto, techo = c.ancho * c.largo, suelo = c.suelo ? c.ancho * c.largo : 0;
      filas.push([`Cámara ${i + 1} ${c.tipo === 'negativa' ? '(negativa)' : '(positiva)'}`, `${fmt(c.ancho)} × ${fmt(c.largo)} × ${fmt(c.alto)} m`, `${c.espesor_mm} mm`, redondea(paredes), redondea(techo), redondea(suelo), redondea(paredes + techo + suelo)]);
    });
    secciones.push({
      id: 'paneles', titulo: 'Cámaras frigoríficas: paneles',
      columnas: ['Cámara', 'Medidas (ancho × largo × alto)', 'Espesor', 'Paredes m²', 'Techo m²', 'Suelo m²', 'Total m²'],
      filas,
      nota: 'Superficies en bruto, sin descontar puertas. Pide el panel con el despiece del fabricante.',
    });
    const lados = [];
    camaras.forEach((c, i) => {
      walls.filter((w) => w.room_id === c.room_id).forEach((w, j) => {
        lados.push([`Cámara ${i + 1}`, `Pared ${j + 1}`, redondea(Math.hypot(w.x2 - w.x1, w.y2 - w.y1) / scale), redondea(c.alto), `${c.espesor_mm} mm`]);
      });
    });
    if (lados.length) secciones.push({ id: 'lados', titulo: 'Cámaras: medidas de cada pared', columnas: ['Cámara', 'Pared', 'Largo (m)', 'Alto (m)', 'Panel'], filas: lados });
  }

  // 5. Paredes sueltas
  const sueltas = walls.filter((w) => !w.room_id);
  if (sueltas.length) {
    const por = new Map();
    sueltas.forEach((w) => {
      const k = `${w.material || 'sin material'}|${w.espesor_mm || ''}|${w.alto_m || ''}`;
      const o = por.get(k) || { material: w.material || 'Sin material', esp: w.espesor_mm, alto: w.alto_m, tramos: 0, m: 0 };
      o.tramos += 1; o.m += Math.hypot(w.x2 - w.x1, w.y2 - w.y1) / scale; por.set(k, o);
    });
    secciones.push({
      id: 'paredes', titulo: 'Paredes y tabiques',
      columnas: ['Material', 'Espesor', 'Alto (m)', 'Tramos', 'Metros lineales', 'Superficie m²'],
      filas: [...por.values()].map((o) => [o.material, o.esp ? `${o.esp} mm` : '—', o.alto ? redondea(o.alto) : '—', o.tramos, redondea(o.m), o.alto ? redondea(o.m * o.alto) : '—']),
    });
  }

  // 6. Equipos y elementos, agrupados por tipo y medidas
  const porTipo = new Map();
  elements.filter((e) => !SIN_DIBUJO.has(e.type)).forEach((e) => {
    const hueco = esHueco(e);
    const medidas = hueco ? `${fmt(anchoHueco(e))} × ${fmt(altoHueco(e))} m (hueco)` : `${fmt(e.w_m || 0.5)} × ${fmt(e.h_m || 0.5)} m`;
    const nom = nombreElemento(e);
    const d = e.datos || {};
    const ref = [d.marca || d.brand, d.modelo || d.model, d.referencia].filter(Boolean).join(' ');
    const k = `${nom}|${medidas}|${ref}`;
    const o = porTipo.get(k) || { nom, medidas, ref, n: 0 };
    o.n += 1; porTipo.set(k, o);
  });
  if (porTipo.size) {
    secciones.push({
      id: 'equipos', titulo: 'Equipos, puertas y elementos',
      columnas: ['Elemento', 'Cantidad', 'Medidas', 'Marca / modelo / referencia'],
      filas: [...porTipo.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'es')).map((o) => [o.nom, o.n, o.medidas, o.ref]),
    });
  }
  return secciones;
}

const comillas = (v) => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

/** La hoja de materiales como CSV con «;» (se abre bien en Excel en español). */
export function materialesCSV(secciones, titulo = '') {
  const out = [];
  if (titulo) out.push(comillas(titulo), '');
  secciones.forEach((s) => {
    out.push(comillas(s.titulo));
    out.push(s.columnas.map(comillas).join(';'));
    s.filas.forEach((f) => out.push(f.map((v) => comillas(typeof v === 'number' ? String(v).replace('.', ',') : v)).join(';')));
    if (s.nota) out.push(comillas(s.nota));
    out.push('');
  });
  return '﻿' + out.join('\r\n');
}
