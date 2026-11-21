// Búsqueda DIRECTA en la web del proveedor (Salvador Escoda, Obramat, Kide, Saltoki…): imagen y precio actual.
// 1.º el buscador de la propia web (se detecta solo leyendo su portada, o se escribe a mano en Ajustes);
// 2.º si no sale, las categorías/submenús de su página de tarifas (refrigeración, agua, gas, electricidad…).
// Funciona con cualquier proveedor: no hay selectores por tienda, se leen datos estructurados (JSON-LD, og:image)
// y, si no los hay, las «tarjetas» de producto (enlace con foto + nombre + precio).

import { puntuar } from './imagenesProducto.js';

const norm = (t) => String(t ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const alfanum = (t) => norm(t).replace(/[^a-z0-9]/g, '');
const decodifica = (t) => String(t).replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#0?39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&euro;/g, '€');
const sinTags = (h) => decodifica(String(h).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const atributo = (tag, nombre) => { const m = String(tag).match(new RegExp(`\\s${nombre}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i')); return m ? decodifica(m[2] ?? m[3] ?? '') : ''; };
const absoluta = (u, base) => { try { return new URL(decodifica(String(u).trim()), base).href; } catch { return ''; } };

export const hostDeWeb = (web) => { try { const t = String(web || '').trim(); return t ? new URL(/^https?:\/\//i.test(t) ? t : 'https://' + t).hostname.replace(/^www\./i, '').toLowerCase() : ''; } catch { return ''; } };
export const origenDeWeb = (web) => { try { const t = String(web || '').trim(); return t ? new URL(/^https?:\/\//i.test(t) ? t : 'https://' + t).origin : ''; } catch { return ''; } };

/** «1.234,56 €» o «€ 12,5» → número. */
export function precioDe(texto) {
  const t = String(texto || '');
  const m = t.match(/(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?\s*(?:€|eur\b)/i) || t.match(/(?:€|eur\s)\s*(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?/i);
  if (!m) return null;
  const v = Number(m[1].replace(/\./g, '') + '.' + (m[2] || '0'));
  return Number.isFinite(v) && v > 0 ? v : null;
}
const precioNumero = (v) => { const n = Number(String(v ?? '').replace(',', '.')); return Number.isFinite(n) && n > 0 ? n : null; };

/** Formularios de búsqueda de la portada → plantilla con {q}. */
export function descubrirBuscador(html, base) {
  for (const f of String(html).matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)) {
    const abre = f[1]; const dentro = f[2];
    if (/method\s*=\s*["']?post/i.test(abre)) continue;
    const campos = [...dentro.matchAll(/<input\b[^>]*>/gi)].map((m) => m[0]);
    const caja = campos.find((i) => {
      const tipo = atributo(i, 'type').toLowerCase(); const nombre = atributo(i, 'name');
      if (tipo && !/^(search|text)$/.test(tipo)) return false;
      return tipo === 'search' || /^(q|s|search|query|keyword|keywords|text|buscar|busqueda|term|searchterm|search_query|criteria|qry|texto)$/i.test(nombre) || /busc|search/i.test(atributo(i, 'placeholder') + atributo(i, 'aria-label') + atributo(i, 'id') + atributo(i, 'class'));
    });
    if (!caja) continue;
    const nombre = atributo(caja, 'name'); if (!nombre) continue;
    const accion = absoluta(atributo(abre, 'action') || base, base); if (!accion) continue;
    const u = new URL(accion);
    for (const i of campos) {
      if (i === caja) continue;
      const n = atributo(i, 'name');
      if (n && atributo(i, 'type').toLowerCase() === 'hidden' && !u.searchParams.has(n)) u.searchParams.set(n, atributo(i, 'value'));
    }
    return u.href + (u.search ? '&' : '?') + encodeURIComponent(nombre) + '={q}';
  }
  return null;
}

/** Plantillas habituales por si la portada no deja ver el buscador. */
export const PLANTILLAS_COMUNES = ['/search?q={q}', '/buscar?q={q}', '/catalogsearch/result/?q={q}', '/?s={q}&post_type=product', '/busqueda?q={q}', '/es/search?q={q}'];

/** «dominio=https://web/buscar?q={q}» por líneas → mapa. */
export function leerPlantillasPropias(texto) {
  const m = {};
  for (const l of String(texto || '').split(/\r?\n/)) {
    const i = l.indexOf('=');
    if (i < 1) continue;
    const h = hostDeWeb(l.slice(0, i)); const p = l.slice(i + 1).trim();
    if (h && p.includes('{q}')) m[h] = p;
  }
  return m;
}

const SIN_FOTO = /logo|icon|sprite|avatar|banner|flag|bandera|payment|pago|placeholder|loading|spinner|pixel|blank|1x1|\.svg(\?|$)|\.gif(\?|$)/i;

function imagenDeTag(tag, base) {
  let src = atributo(tag, 'data-src') || atributo(tag, 'data-lazy-src') || atributo(tag, 'data-original') || atributo(tag, 'data-lazy') || '';
  const srcset = atributo(tag, 'data-srcset') || atributo(tag, 'srcset');
  if (!src && srcset) src = srcset.split(',').map((s) => s.trim().split(/\s+/)[0]).filter(Boolean).pop() || '';
  if (!src) src = atributo(tag, 'src');
  if (!src || /^data:/i.test(src)) return '';
  return absoluta(src, base);
}

function recorrerLd(o, fn, nivel = 0) {
  if (!o || nivel > 6) return;
  if (Array.isArray(o)) { o.forEach((x) => recorrerLd(x, fn, nivel + 1)); return; }
  if (typeof o !== 'object') return;
  fn(o);
  for (const k of ['@graph', 'itemListElement', 'item', 'mainEntity', 'hasVariant']) if (o[k]) recorrerLd(o[k], fn, nivel + 1);
}
const imgLd = (i) => (typeof i === 'string' ? i : Array.isArray(i) ? imgLd(i[0]) : i?.url || i?.contentUrl || '');

/** Productos con datos estructurados (JSON-LD): nombre, foto, código y precio. */
export function productosJsonLd(html, base) {
  const out = [];
  for (const s of String(html).matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    let o; try { o = JSON.parse(s[1].trim()); } catch { continue; }
    recorrerLd(o, (n) => {
      const tipo = [].concat(n['@type'] || []).join(',');
      if (!/Product/i.test(tipo)) return;
      const ofertas = [].concat(n.offers || []).flatMap((x) => (x?.offers ? [].concat(x.offers) : [x]));
      const precio = ofertas.map((x) => precioNumero(x?.price ?? x?.lowPrice)).find(Boolean) || null;
      const img = imgLd(n.image);
      out.push({
        titulo: String(n.name || ''), texto: [n.sku, n.mpn, n.gtin13, n.gtin, n.productID, n.description, n.brand?.name || n.brand].filter((x) => typeof x === 'string' || typeof x === 'number').join(' ').slice(0, 300),
        url: img ? absoluta(img, base) : '', pagina: n.url ? absoluta(n.url, base) : '', precio
      });
    });
  }
  return out;
}

/** Tarjetas de un listado: enlace con foto + texto + precio cercano. */
export function tarjetas(html, base) {
  const out = []; const vistas = new Set();
  const limpio = String(html).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/gi, ' ');
  for (const a of limpio.matchAll(/<a\b([^>]*)>([\s\S]{0,4000}?)<\/a>/gi)) {
    const interior = a[2]; const img = interior.match(/<img\b[^>]*>/i);
    if (!img) continue;
    const url = imagenDeTag(img[0], base);
    if (!url || SIN_FOTO.test(url) || vistas.has(url)) continue;
    const href = atributo(a[1], 'href'); if (!href || /^(#|javascript:|mailto:|tel:)/i.test(href)) continue;
    vistas.add(url);
    const despues = limpio.slice(a.index + a[0].length, a.index + a[0].length + 300);
    const texto = sinTags(interior);
    const cola = sinTags(despues.split(/<a\b/i)[0]);
    out.push({
      titulo: atributo(img[0], 'alt') || atributo(a[1], 'title') || atributo(img[0], 'title') || texto.slice(0, 120),
      texto: `${texto} ${cola}`.slice(0, 350), url, pagina: absoluta(href, base), precio: precioDe(`${texto} ${cola}`)
    });
  }
  return out;
}

export function extraerProductos(html, base) {
  const ld = productosJsonLd(html, base).filter((p) => p.url);
  const t = tarjetas(html, base);
  // Las tarjetas completan el precio de lo que el JSON-LD no trae
  return [...ld, ...t.filter((c) => !ld.some((p) => p.url === c.url))];
}

/** Ficha de un producto: foto principal y precio. */
export function fichaProducto(html, base) {
  const ld = productosJsonLd(html, base).find((p) => p.url) || null;
  const meta = (n) => { const m = String(html).match(new RegExp(`<meta\\b[^>]*(?:property|name|itemprop)\\s*=\\s*["']${n}["'][^>]*>`, 'i')) || String(html).match(new RegExp(`<meta\\b[^>]*content[^>]*(?:property|name|itemprop)\\s*=\\s*["']${n}["'][^>]*>`, 'i')); return m ? atributo(m[0], 'content') : ''; };
  const og = meta('og:image') || meta('twitter:image') || meta('image');
  const url = ld?.url || (og ? absoluta(og, base) : '');
  const precio = ld?.precio || precioNumero(meta('product:price:amount') || meta('og:price:amount') || meta('price')) || null;
  const titulo = ld?.titulo || meta('og:title') || (String(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
  return { url: url && !SIN_FOTO.test(url) ? url : '', precio, titulo: sinTags(titulo), texto: ld?.texto || meta('og:description') || '' };
}

/** Enlaces de la página de tarifas/categorías: {texto, href}. */
export function enlaces(html, base) {
  const out = []; const vistos = new Set();
  for (const a of String(html).replace(/<script[\s\S]*?<\/script>|<!--[\s\S]*?-->/gi, ' ').matchAll(/<a\b([^>]*)>([\s\S]{0,600}?)<\/a>/gi)) {
    const href = atributo(a[1], 'href'); if (!href || /^(#|javascript:|mailto:|tel:)/i.test(href)) continue;
    const u = absoluta(href, base); const texto = sinTags(a[2]) || atributo(a[1], 'title');
    if (!u || !texto || texto.length > 80 || vistos.has(u)) continue;
    vistos.add(u); out.push({ texto, href: u });
  }
  return out;
}

// Familias del sector: la palabra del producto → palabras del submenú donde buscarlo.
const FAMILIAS = [
  [/refrig|frigor|compresor|condensador|evaporador|r-?(32|410|134|290|404|407|448|449|452|454)|valvula de expansion|presostato|visor|filtro deshidr|gas refrigerante|split|aire acond|climatiz|ventilador/, ['refrigeracion', 'frio', 'climatizacion', 'aire acondicionado']],
  [/agua|fontaner|grifo|tuberia|pvc|multicapa|bomba|contador|valvula de (bola|esfera)|fitting|racor|calentador|termo|deposito|sanitari|ducha|inodoro/, ['agua', 'fontaneria', 'saneamiento', 'calefaccion']],
  [/gas|quemador|regulador|caldera|butano|propano|detector/, ['gas', 'calefaccion', 'calderas']],
  [/electr|cable|interruptor|diferencial|magnetotermico|enchufe|cuadro|contactor|rele|led|lampara|mecanismo|bombilla|fusible|conductor/, ['electricidad', 'material electrico', 'iluminacion', 'electrico']],
  [/herramient|taladro|broca|atornillador|sierra|llave|alicate|soldador/, ['herramientas', 'ferreteria']],
];
export function familiasDe(nombre) {
  const n = norm(nombre); const out = [];
  for (const [re, claves] of FAMILIAS) if (re.test(n)) out.push(...claves);
  return out;
}

/** Submenús de la página de tarifas que encajan con el artículo (palabras de la familia o del nombre). */
export function categoriasPara(html, base, { nombre }, max = 3) {
  const fam = familiasDe(nombre);
  const palabras = norm(nombre).split(/[^a-z0-9]+/).filter((w) => w.length > 3);
  const host = new URL(base).hostname;
  const lista = enlaces(html, base).filter((l) => { try { return new URL(l.href).hostname === host; } catch { return false; } });
  const puntos = (l) => { const t = norm(l.texto + ' ' + decodeURIComponent(l.href)); return fam.filter((f) => t.includes(f)).length * 10 + palabras.filter((w) => t.includes(w)).length * 6; };
  return lista.map((l) => ({ ...l, p: puntos(l) })).filter((l) => l.p > 0).sort((a, b) => b.p - a.p).slice(0, max);
}

// ── Cortesía con la web del proveedor: pocas peticiones a la vez y con pausa ──
const colas = new Map();
export function conCortesia(host, fn, { pausa = 350, paralelo = 2 } = {}) {
  const c = colas.get(host) || { activos: 0, espera: [], ultimo: 0 };
  colas.set(host, c);
  return new Promise((resolver, rechazar) => {
    const lanzar = async () => {
      c.activos++;
      const dif = Date.now() - c.ultimo; if (dif < pausa) await new Promise((r) => setTimeout(r, pausa - dif));
      c.ultimo = Date.now();
      try { resolver(await fn()); } catch (e) { rechazar(e); } finally { c.activos--; const s = c.espera.shift(); if (s) s(); }
    };
    if (c.activos < paralelo) lanzar(); else c.espera.push(lanzar);
  });
}

const CLAVE_APRENDIDAS = 'gpt_web_busqueda';
export const leerAprendidas = (almacen = globalThis.localStorage) => { try { return JSON.parse(almacen.getItem(CLAVE_APRENDIDAS) || '{}'); } catch { return {}; } };
export const guardarAprendida = (host, plantilla, almacen = globalThis.localStorage) => { try { const m = leerAprendidas(almacen); m[host] = plantilla; almacen.setItem(CLAVE_APRENDIDAS, JSON.stringify(m)); } catch { /* sin sitio */ } };

function elegir(prods, datos, por, minimo) {
  const dd = { codigo: datos.codigo, nombre: datos.nombre, marca: datos.marca };
  const orden = prods.map((p) => ({ ...p, puntos: puntuar({ titulo: `${p.titulo} ${p.texto || ''}`, pagina: p.pagina, url: p.url }, dd) })).sort((a, b) => b.puntos - a.puntos);
  return orden.filter((p) => p.puntos >= (por === 'codigo' ? Math.max(minimo, 100) : minimo));
}

/**
 * Busca el artículo en la web del proveedor.
 * @param datos {codigo,nombre,descripcion,marca,web}
 * @param d {texto(url)->html, descargar(url)->dataUrl, plantillaPropia?, aprendida?, aprender?(host,plantilla), alAvisar?(txt)}
 * @returns {Promise<{ok:boolean,url?:string,precio?:number,pagina?:string,por?:string,via?:string}>}
 */
export async function buscarEnWebProveedor(datos, d) {
  const origen = origenDeWeb(datos.web); const host = hostDeWeb(datos.web);
  if (!origen || !host) return { ok: false, motivo: 'sin_web' };
  const leer = (u) => conCortesia(host, () => d.texto(u));
  const aviso = (t) => { try { d.alAvisar?.(t); } catch { /* el aviso no puede romper la búsqueda */ } };
  const consultas = [];
  if (String(datos.codigo || '').trim()) consultas.push({ por: 'codigo', q: String(datos.codigo).trim() });
  const nom = String(datos.nombre || '').trim();
  if (nom) {
    const desc = String(datos.descripcion || '').replace(/\s+/g, ' ').trim().slice(0, 50);
    if (desc.length >= 8) consultas.push({ por: 'nombre', q: `${nom} ${desc}` });
    consultas.push({ por: 'nombre', q: nom });
  }
  if (!consultas.length) return { ok: false, motivo: 'sin_datos' };

  const terminar = async (p, por, via) => {
    let { url, precio } = p;
    if (!url && p.pagina) {
      try { const f = fichaProducto(await leer(p.pagina), p.pagina); url = f.url; precio = precio || f.precio; } catch { /* sin ficha */ }
    }
    if (!url) return null;
    try {
      const img = await d.descargar(url);
      if (!img) return null;
      // el precio de la tarjeta puede faltar: se mira en la ficha si hay página
      if (!precio && p.pagina) { try { precio = fichaProducto(await leer(p.pagina), p.pagina).precio; } catch { /* sin precio */ } }
      return { ok: true, url: img, precio: precio || null, pagina: p.pagina || '', por, via };
    } catch { return null; }
  };

  // 1) El buscador de la web
  let plantillas = [];
  const propia = d.plantillaPropia; const aprendida = d.aprendida;
  if (propia) plantillas.push({ p: propia, fija: true });
  else if (aprendida) plantillas.push({ p: aprendida, fija: true });
  else {
    try {
      const portada = await leer(origen + '/');
      const t = descubrirBuscador(portada, origen + '/');
      if (t) plantillas.push({ p: t });
    } catch (e) { aviso(`No pude abrir la web de ${host}: ${e.message || e}`); return { ok: false, motivo: 'web_no_responde' }; }
    for (const c of PLANTILLAS_COMUNES) plantillas.push({ p: origen + c });
  }
  const probadas = new Set();
  for (const pl of plantillas) {
    let funciono = false;
    for (const q of consultas) {
      let html;
      try { html = await leer(pl.p.replace('{q}', encodeURIComponent(q.q))); } catch { if (!pl.fija) break; continue; }
      const prods = extraerProductos(html, origen + '/');
      if (!prods.length) continue;
      funciono = true;
      let buenos = elegir(prods, datos, q.por, 24).slice(0, 3);
      // Buscando por código, la web suele devolver solo ese producto aunque la tarjeta no escriba el código: con 1-2 resultados se acepta el primero
      if (!buenos.length && q.por === 'codigo' && prods.length <= 2) buenos = [prods[0]];
      for (const c of buenos) {
        const r = await terminar(c, q.por, 'buscador');
        if (r) { if (!pl.fija) d.aprender?.(host, pl.p); return r; }
      }
    }
    if (funciono) probadas.add(pl.p);
    if (!pl.fija && funciono) break; // esta plantilla es la buena: no seguir probando otras
  }

  // 2) Los submenús de la página de tarifas
  const inicios = new Set([origen + '/tarifas/', origen + '/tarifas', datos.web && /^https?:/i.test(datos.web) ? datos.web : ''].filter(Boolean));
  for (const inicio of inicios) {
    let html; try { html = await leer(inicio); } catch { continue; }
    const cats = categoriasPara(html, inicio, { nombre: datos.nombre });
    for (const cat of cats) {
      let h; try { h = await leer(cat.href); } catch { continue; }
      const prods = extraerProductos(h, cat.href);
      for (const q of consultas) for (const c of elegir(prods, datos, q.por, 24).slice(0, 2)) {
        const r = await terminar(c, q.por, 'categoria'); if (r) return r;
      }
    }
  }
  return { ok: false, motivo: 'sin_resultado' };
}
