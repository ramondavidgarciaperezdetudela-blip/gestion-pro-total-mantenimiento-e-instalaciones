/**
 * zonaClimatica.js — Zona climática del CTE (DB-HE) de un cliente.
 *
 * La zona del CTE es una letra (severidad de INVIERNO: α, A, B, C, D, E) y un
 * número (severidad de VERANO: 1–4). El CTE la fija por capital de provincia
 * y la corrige por altitud en cada municipio, así que aquí se da la de la
 * CAPITAL como referencia ORIENTATIVA: para el cálculo oficial de un
 * municipio concreto hay que mirar la tabla del Apéndice B del DB-HE.
 */

// [nombre, provincia (para casar), zona, lat, lon]
export const CAPITALES = [
  ['A Coruña', 'a coruña', 'C1', 43.37, -8.40], ['Albacete', 'albacete', 'D3', 38.99, -1.86], ['Alicante', 'alicante', 'B4', 38.35, -0.48],
  ['Almería', 'almería', 'A4', 36.84, -2.46], ['Ávila', 'ávila', 'E1', 40.66, -4.70], ['Badajoz', 'badajoz', 'C4', 38.88, -6.97],
  ['Barcelona', 'barcelona', 'C2', 41.39, 2.17], ['Bilbao', 'bizkaia', 'C1', 43.26, -2.93], ['Burgos', 'burgos', 'E1', 42.34, -3.70],
  ['Cáceres', 'cáceres', 'C4', 39.47, -6.37], ['Cádiz', 'cádiz', 'A3', 36.53, -6.29], ['Castellón de la Plana', 'castellón', 'B3', 39.99, -0.04],
  ['Ceuta', 'ceuta', 'B3', 35.89, -5.32], ['Ciudad Real', 'ciudad real', 'D3', 38.99, -3.93], ['Córdoba', 'córdoba', 'B4', 37.89, -4.78],
  ['Cuenca', 'cuenca', 'D2', 40.07, -2.14], ['Girona', 'girona', 'C2', 41.98, 2.82], ['Granada', 'granada', 'C3', 37.18, -3.60],
  ['Guadalajara', 'guadalajara', 'D3', 40.63, -3.17], ['Huelva', 'huelva', 'B4', 37.26, -6.95], ['Huesca', 'huesca', 'D2', 42.14, -0.41],
  ['Jaén', 'jaén', 'C4', 37.78, -3.79], ['Las Palmas de Gran Canaria', 'las palmas', 'A3', 28.12, -15.43], ['León', 'león', 'E1', 42.60, -5.57],
  ['Lleida', 'lleida', 'D3', 41.62, 0.62], ['Logroño', 'la rioja', 'D2', 42.47, -2.45], ['Lugo', 'lugo', 'D1', 43.01, -7.56],
  ['Madrid', 'madrid', 'D3', 40.42, -3.70], ['Málaga', 'málaga', 'A3', 36.72, -4.42], ['Melilla', 'melilla', 'A3', 35.29, -2.94],
  ['Murcia', 'murcia', 'B3', 37.99, -1.13], ['Ourense', 'ourense', 'C2', 42.34, -7.86], ['Oviedo', 'asturias', 'C1', 43.36, -5.85],
  ['Palencia', 'palencia', 'D1', 42.01, -4.53], ['Palma', 'baleares', 'B3', 39.57, 2.65], ['Pamplona', 'navarra', 'D1', 42.81, -1.64],
  ['Pontevedra', 'pontevedra', 'C1', 42.43, -8.64], ['Salamanca', 'salamanca', 'D2', 40.97, -5.66], ['San Sebastián', 'gipuzkoa', 'C1', 43.32, -1.98],
  ['Santa Cruz de Tenerife', 'santa cruz de tenerife', 'A3', 28.46, -16.25], ['Santander', 'cantabria', 'C1', 43.46, -3.81], ['Segovia', 'segovia', 'D2', 40.95, -4.12],
  ['Sevilla', 'sevilla', 'B4', 37.39, -5.98], ['Soria', 'soria', 'E1', 41.77, -2.46], ['Tarragona', 'tarragona', 'B3', 41.12, 1.25],
  ['Teruel', 'teruel', 'D2', 40.34, -1.11], ['Toledo', 'toledo', 'C4', 39.86, -4.02], ['Valencia', 'valencia', 'B3', 39.47, -0.38],
  ['Valladolid', 'valladolid', 'D2', 41.65, -4.72], ['Vitoria-Gasteiz', 'álava', 'D1', 42.85, -2.67], ['Zamora', 'zamora', 'D2', 41.50, -5.75],
  ['Zaragoza', 'zaragoza', 'D3', 41.65, -0.89],
].map(([nombre, provincia, zona, lat, lon]) => ({ nombre, provincia, zona, lat, lon }));

// Los dos primeros dígitos del código postal identifican la provincia.
const CP_PROVINCIA = {
  '01': 'álava', '02': 'albacete', '03': 'alicante', '04': 'almería', '05': 'ávila', '06': 'badajoz', '07': 'baleares', '08': 'barcelona', '09': 'burgos',
  '10': 'cáceres', '11': 'cádiz', '12': 'castellón', '13': 'ciudad real', '14': 'córdoba', '15': 'a coruña', '16': 'cuenca', '17': 'girona', '18': 'granada',
  '19': 'guadalajara', '20': 'gipuzkoa', '21': 'huelva', '22': 'huesca', '23': 'jaén', '24': 'león', '25': 'lleida', '26': 'la rioja', '27': 'lugo',
  '28': 'madrid', '29': 'málaga', '30': 'murcia', '31': 'navarra', '32': 'ourense', '33': 'asturias', '34': 'palencia', '35': 'las palmas', '36': 'pontevedra',
  '37': 'salamanca', '38': 'santa cruz de tenerife', '39': 'cantabria', '40': 'segovia', '41': 'sevilla', '42': 'soria', '43': 'tarragona', '44': 'teruel',
  '45': 'toledo', '46': 'valencia', '47': 'valladolid', '48': 'bizkaia', '49': 'zamora', '50': 'zaragoza', '51': 'ceuta', '52': 'melilla',
};

const INVIERNO = {
  'α': 'invierno muy suave', A: 'invierno suave', B: 'invierno templado', C: 'invierno frío moderado', D: 'invierno frío', E: 'invierno muy frío',
};
const VERANO = { 1: 'verano suave', 2: 'verano templado', 3: 'verano cálido', 4: 'verano muy cálido' };

/** Sin tildes ni mayúsculas, para casar «Málaga», «malaga» o «MÁLAGA». */
export const normalizar = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const ALIAS = { 'vizcaya': 'bizkaia', 'guipuzcoa': 'gipuzkoa', 'alava': 'álava', 'islas baleares': 'baleares', 'illes balears': 'baleares', 'rioja': 'la rioja',
  'asturias': 'asturias', 'principado de asturias': 'asturias', 'cantabria': 'cantabria', 'a coruna': 'a coruña', 'la coruna': 'a coruña', 'coruna': 'a coruña',
  'tenerife': 'santa cruz de tenerife', 'gran canaria': 'las palmas', 'castellon': 'castellón', 'comunidad de madrid': 'madrid', 'navarra': 'navarra' };

const kmEntre = (a, b, c, d) => {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (c - a) * rad, dLon = (d - b) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a * rad) * Math.cos(c * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

/** Capital de referencia: por código postal, por provincia o por la posición más cercana. */
export function capitalDe({ postal_code, province, city, latitude, longitude } = {}) {
  const cp = String(postal_code ?? '').trim();
  if (/^\d{5}$/.test(cp) && CP_PROVINCIA[cp.slice(0, 2)]) {
    const c = CAPITALES.find((x) => x.provincia === CP_PROVINCIA[cp.slice(0, 2)]);
    if (c) return { ...c, por: 'código postal' };
  }
  for (const campo of [province, city]) {
    const n = normalizar(campo);
    if (!n) continue;
    const buscada = normalizar(ALIAS[n] || n);
    const c = CAPITALES.find((x) => normalizar(x.provincia) === buscada || normalizar(x.nombre) === n);
    if (c) return { ...c, por: campo === province ? 'provincia' : 'localidad' };
  }
  const lat = parseFloat(latitude), lon = parseFloat(longitude);
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    let mejor = null;
    CAPITALES.forEach((c) => { const d = kmEntre(lat, lon, c.lat, c.lon); if (!mejor || d < mejor.d) mejor = { ...c, d }; });
    if (mejor && mejor.d < 250) return { ...mejor, por: 'posición' };
  }
  return null;
}

/** @returns {{zona:string, invierno:string, verano:string, capital:string, por:string, lat:number, lon:number}|null} */
export function zonaClimaticaDe(contacto = {}) {
  const c = capitalDe(contacto);
  if (!c) return null;
  const letra = c.zona[0], num = Number(c.zona.slice(1));
  return {
    zona: c.zona, letra, numero: num, capital: c.nombre, por: c.por, lat: c.lat, lon: c.lon,
    invierno: INVIERNO[letra], verano: VERANO[num],
  };
}

/** Color por severidad de invierno (frío → cian/azul, cálido → ámbar/rojo). */
export const COLOR_LETRA = { E: '#2563eb', D: '#06b6d4', C: '#10b981', B: '#f59e0b', A: '#ef4444', 'α': '#be123c' };
