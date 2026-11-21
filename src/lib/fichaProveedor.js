// Ficha de proveedor: enlaces seguros, y lectura de su web para sacar logotipo y datos de contacto (dirección, teléfono, CIF…).
// Funciones puras (sin red): la descarga la hace fichaProveedorApp.js con el puente del aparato.

const decodifica = (t) => String(t).replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#0?39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
const sinTags = (h) => decodifica(String(h).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/gi, ' ').replace(/<br\s*\/?>/gi, ', ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const atributo = (tag, nombre) => { const m = String(tag).match(new RegExp(`\\s${nombre}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i')); return m ? decodifica(m[2] ?? m[3] ?? '') : ''; };
const absoluta = (u, base) => { try { return new URL(decodifica(String(u).trim()), base).href; } catch { return ''; } };

/**
 * Dirección web segura para abrir: «saltoki.es» → «https://saltoki.es». Sin esquema, el enlace se tomaba por una página
 * de la propia aplicación (y en escritorio abría otra ventana de Gestión Pro Total). Devuelve '' si no es una web válida.
 */
export function urlWeb(texto) {
  let t = String(texto ?? '').trim().replace(/\s+/g, '');
  if (!t) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(t) && !/^https?:\/\//i.test(t)) return '';
  if (!/^https?:\/\//i.test(t)) t = 'https://' + t.replace(/^\/+/, '');
  try {
    const u = new URL(t);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.') || u.username || u.password) return '';
    return u.href;
  } catch { return ''; }
}
export const hostDe = (web) => { const u = urlWeb(web); return u ? new URL(u).hostname.replace(/^www\./i, '') : ''; };

const PROVINCIAS = ['Álava', 'Albacete', 'Alicante', 'Almería', 'Ávila', 'Badajoz', 'Baleares', 'Barcelona', 'Burgos', 'Cáceres', 'Cádiz', 'Castellón', 'Ciudad Real', 'Córdoba', 'La Coruña', 'Cuenca', 'Girona', 'Granada', 'Guadalajara', 'Guipúzcoa', 'Huelva', 'Huesca', 'Jaén', 'León', 'Lérida', 'La Rioja', 'Lugo', 'Madrid', 'Málaga', 'Murcia', 'Navarra', 'Orense', 'Asturias', 'Palencia', 'Las Palmas', 'Pontevedra', 'Salamanca', 'Tenerife', 'Cantabria', 'Segovia', 'Sevilla', 'Soria', 'Tarragona', 'Teruel', 'Toledo', 'Valencia', 'Valladolid', 'Vizcaya', 'Zamora', 'Zaragoza', 'Ceuta', 'Melilla'];
/** Provincia por las dos primeras cifras del código postal. */
export const provinciaDeCp = (cp) => { const n = Number(String(cp || '').slice(0, 2)); return n >= 1 && n <= 52 ? PROVINCIAS[n - 1] : ''; };

// ── Logotipo ──────────────────────────────────────────────────────────────
function recorrerLd(o, fn, n = 0) {
  if (!o || n > 6) return;
  if (Array.isArray(o)) { o.forEach((x) => recorrerLd(x, fn, n + 1)); return; }
  if (typeof o !== 'object') return;
  fn(o);
  for (const k of ['@graph', 'publisher', 'brand', 'provider', 'mainEntity', 'itemListElement']) if (o[k]) recorrerLd(o[k], fn, n + 1);
}
const bloquesLd = (html) => { const out = []; for (const s of String(html).matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) { try { out.push(JSON.parse(s[1].trim())); } catch { /* ld roto */ } } return out; };
const imgLd = (i) => (typeof i === 'string' ? i : Array.isArray(i) ? imgLd(i[0]) : i?.url || i?.contentUrl || '');
const meta = (html, n) => { const m = String(html).match(new RegExp(`<meta\\b[^>]*(?:property|name|itemprop)\\s*=\\s*["']${n}["'][^>]*>`, 'i')); return m ? atributo(m[0], 'content') : ''; };
const noRaster = (u) => /\.svg(\?|#|$)|\.ico(\?|$)|^data:/i.test(u);

/** Posibles logotipos de la portada, de más a menos fiable (sin SVG ni .ico: no se pueden guardar reducidos). */
export function candidatasLogo(html, base) {
  const out = []; const ver = new Set();
  const poner = (u, tipo) => { const a = u && absoluta(u, base); if (a && /^https?:/i.test(a) && !ver.has(a)) { ver.add(a); out.push({ url: a, tipo }); } };
  for (const o of bloquesLd(html)) recorrerLd(o, (n) => { if (n.logo) poner(imgLd(n.logo), 'datos'); });
  const imgs = (trozo) => [...String(trozo).matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const esLogo = (tag) => /logo/i.test(atributo(tag, 'src') + ' ' + atributo(tag, 'alt') + ' ' + atributo(tag, 'class') + ' ' + atributo(tag, 'id') + ' ' + atributo(tag, 'data-src'));
  const cab = String(html).match(/<header\b[\s\S]*?<\/header>/i)?.[0] || '';
  for (const trozo of [cab, String(html)]) {
    for (const tag of imgs(trozo).filter(esLogo).slice(0, 8)) {
      const src = atributo(tag, 'data-src') || atributo(tag, 'src') || (atributo(tag, 'srcset').split(',')[0] || '').trim().split(/\s+/)[0];
      if (src && !noRaster(src)) poner(src, 'logo');
    }
  }
  poner(meta(html, 'og:image') || meta(html, 'og:image:url'), 'og');
  const iconos = [...String(html).matchAll(/<link\b[^>]*rel\s*=\s*["'][^"']*icon[^"']*["'][^>]*>/gi)].map((m) => m[0])
    .map((t) => ({ href: atributo(t, 'href'), lado: Number((atributo(t, 'sizes').match(/(\d+)x/) || [])[1] || 0), apple: /apple/i.test(t) }))
    .filter((i) => i.href && !noRaster(i.href)).sort((a, b) => (b.apple - a.apple) || (b.lado - a.lado));
  for (const i of iconos) poner(i.href, 'icono');
  poner('/apple-touch-icon.png', 'icono');
  return out.filter((c) => !noRaster(c.url));
}

// ── Datos de contacto ─────────────────────────────────────────────────────
const CALLE = '(?:C\\/|Calle|Carrer|Avda\\.?|Avinguda|Avenida|Pol\\.?\\s?Ind\\.?|Polígono|Poligon|Pol[ií]gon|Paseo|Passeig|Ctra\\.?|Carretera|Camino|Plaza|Plaça|Pl\\.|Travesía|Ronda|Rambla|Pg\\.?)';
const RE_DIRECCION = new RegExp(`(${CALLE}[^<|;]{2,110}?)[\\s,.\\-–|]+(?:[A-Z]{1,2}[-\\s])?((?:0[1-9]|[1-4]\\d|5[0-2])\\d{3})\\s+([A-ZÁÉÍÓÚÑÜ][\\wÁÉÍÓÚÑÜáéíóúñü'.\\- ]{2,40}?)(?=\\s*[,(|.\\-–]|\\s{2,}|$|\\s(?:Tel|Tfno|Teléfono|Email|E-mail|España|Spain|CIF|NIF))`, 'i');

const limpiaTel = (t) => String(t || '').replace(/[^\d+ ]/g, '').replace(/\s+/g, ' ').trim();
const esTelOk = (t) => { const d = String(t).replace(/\D/g, ''); return d.length >= 9 && d.length <= 13; };

/** Dirección, teléfono, correo, razón social y CIF que se leen de una página. Solo devuelve lo que encuentra. */
export function datosContacto(html, base = 'https://x.es/') {
  const r = {};
  for (const o of bloquesLd(html)) recorrerLd(o, (n) => {
    const tipo = [].concat(n['@type'] || []).join(',');
    if (/PostalAddress/i.test(tipo) || n.address || n.streetAddress) {
      const a = /PostalAddress/i.test(tipo) ? n : (typeof n.address === 'object' ? [].concat(n.address)[0] : null);
      if (a?.streetAddress && !r.address) { r.address = String(a.streetAddress).trim(); if (a.postalCode) r.postal_code = String(a.postalCode).trim(); if (a.addressLocality) r.city = String(a.addressLocality).trim(); if (a.addressRegion) r.province = String(a.addressRegion).trim(); }
    }
    if (/Organization|LocalBusiness|Store|Corporation|Company/i.test(tipo)) {
      if (n.telephone && !r.phone) r.phone = limpiaTel(n.telephone);
      if (n.email && !r.email) r.email = String(n.email).replace(/^mailto:/i, '').trim();
      if (n.legalName && !r.legal_name) r.legal_name = String(n.legalName).trim();
      if ((n.vatID || n.taxID) && !r.tax_id) r.tax_id = String(n.vatID || n.taxID).replace(/^ES-?/i, '').trim();
    }
  });
  const texto = sinTags(html);
  if (!r.address) {
    const m = texto.match(RE_DIRECCION);
    if (m) { r.address = m[1].replace(/\s+/g, ' ').replace(/[,\s.\-–|]+$/, '').trim(); r.postal_code = m[2]; r.city = m[3].replace(/\s+/g, ' ').trim(); }
  }
  if (r.postal_code && !r.province) r.province = provinciaDeCp(r.postal_code);
  if (!r.phone) {
    const t = [...String(html).matchAll(/href\s*=\s*["']tel:([^"']+)["']/gi)].map((m) => limpiaTel(decodeURIComponent(m[1]))).find(esTelOk);
    const t2 = t || (texto.match(/(?:Tel[ée]?f?o?n?o?\.?|Tfno\.?|Llámanos|Teléfono)[:\s]*((?:\+34|0034)?[\s.]?[6-9](?:[\s.]?\d){8})/i) || [])[1];
    if (t2) r.phone = limpiaTel(t2);
  }
  if (!r.email) {
    const e = [...String(html).matchAll(/mailto:([^"'?\s>]+)/gi)].map((m) => decodeURIComponent(m[1])).find((x) => /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(x) && !/no-?reply|example|sentry|wixpress/i.test(x));
    const e2 = e || (texto.match(/\b[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.(?:es|com|cat|net|eu|org)\b/i) || [])[0];
    if (e2) r.email = e2.toLowerCase();
  }
  if (!r.tax_id) { const m = texto.match(/(?:CIF|NIF|C\.I\.F\.|N\.I\.F\.)[\s:.\-]*(?:ES-?)?([ABCDEFGHJNPQRSUVW]-?\d{7}-?[\dA-J])/i); if (m) r.tax_id = m[1].replace(/-/g, '').toUpperCase(); }
  if (!r.legal_name) { const m = texto.match(/((?:[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ&.'-]*\s+){0,4}(?:S\.?\s?L\.?\s?U?\.?|S\.?\s?A\.?|S\.?\s?L\.?\s?L\.?|S\.?\s?C\.?\s?P\.?))(?=[\s,.;(]|$)/); if (m && m[1].length < 70 && /\s/.test(m[1])) r.legal_name = m[1].trim(); }
  return r;
}

/** Páginas de la web que suelen traer la dirección (contacto, aviso legal, dónde estamos…). */
export function enlacesContacto(html, base, max = 4) {
  const host = new URL(base).hostname; const out = []; const ver = new Set();
  const re = /contact|donde[- ]?estamos|dónde|aviso[- ]?legal|legal|quienes[- ]?somos|quiénes|sobre[- ]?nosotros|empresa|tiendas|delegaciones|nuestras[- ]?tiendas|about/i;
  for (const a of String(html).matchAll(/<a\b([^>]*)>([\s\S]{0,300}?)<\/a>/gi)) {
    const href = atributo(a[1], 'href'); if (!href || /^(#|javascript:|mailto:|tel:)/i.test(href)) continue;
    const u = absoluta(href, base); if (!u) continue;
    let h; try { h = new URL(u).hostname; } catch { continue; }
    if (h !== host || ver.has(u.split('#')[0])) continue;
    if (re.test(sinTags(a[2]) + ' ' + href)) { ver.add(u.split('#')[0]); out.push(u.split('#')[0]); }
  }
  // los de contacto primero
  return out.sort((x, y) => (/contact/i.test(y) ? 1 : 0) - (/contact/i.test(x) ? 1 : 0)).slice(0, max);
}

/** Une varios resultados de datosContacto: el primero que traiga cada campo. */
export const unirDatos = (...ds) => { const r = {}; for (const d of ds) for (const [k, v] of Object.entries(d || {})) if (v && !r[k]) r[k] = v; if (r.postal_code && !r.province) r.province = provinciaDeCp(r.postal_code); return r; };

/** Enlace a Google Maps con la dirección completa. */
export const enlaceMapa = (p) => { const q = [p.address, p.postal_code, p.city, p.province].filter(Boolean).join(', '); return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : ''; };
export const direccionCompleta = (p) => [p.address, [p.postal_code, p.city].filter(Boolean).join(' '), p.province].filter(Boolean).join(', ');

// ── Mapa y GPS ────────────────────────────────────────────────────────────
const consulta = (p) => [p.address, p.postal_code, p.city, p.province, p.country && p.country !== 'España' ? p.country : ''].filter(Boolean).join(', ');
/** Ruta desde donde estés hasta la dirección (Google Maps elige la más rápida; en el móvil abre la app de mapas). */
export const enlaceRuta = (p) => { const q = consulta(p); return q ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}&travelmode=driving` : ''; };
/** Lo mismo en Waze (avisa de atascos y radares). */
export const enlaceWaze = (p) => { const q = consulta(p); return q ? `https://waze.com/ul?q=${encodeURIComponent(q)}&navigate=yes` : ''; };
/** Plano para incrustar en la ficha (necesita internet). */
export const urlMapaIncrustado = (p) => { const q = consulta(p); return q ? `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=16&output=embed&hl=es` : ''; };
