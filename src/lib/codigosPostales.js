/**
 * codigosPostales.js — Buscar códigos postales de España sin conexión.
 *
 * ANTES: la búsqueda llamaba a una función del servidor. En la obra, con dos
 * rayas de cobertura o sin datos, no salía nada — y es justo donde hace falta,
 * rellenando la ficha de un cliente nuevo delante de él.
 *
 * AHORA: los datos van dentro de la aplicación (9.163 códigos postales y 6.568
 * municipios, del CNIG a través de github.com/inigoflores/ds-codigos-postales)
 * y la búsqueda es instantánea y sin conexión.
 *
 * LA PROVINCIA. El listado no la trae, pero no hace falta buscarla ni
 * escribirla a mano: sale del CÓDIGO INE del municipio, cuyas dos primeras
 * cifras son el código de provincia. Es importante sacarla de ahí y NO de las
 * dos primeras cifras del código postal, que es lo que uno haría a bote
 * pronto: hay 25 códigos postales que pertenecen a un municipio de otra
 * provincia. Yecla es de Murcia y su código postal empieza por 03, que es
 * Alicante; Alía es de Cáceres y el suyo empieza por 06, que es Badajoz. Con
 * el atajo del CP esos 25 saldrían con la provincia equivocada.
 *
 * Los datos se cargan la primera vez que se busca, no al arrancar: son 225 KB
 * que no tienen por qué retrasar la apertura de la aplicación.
 */

/**
 * Provincias por su código del INE (las dos primeras cifras del código de
 * municipio). Los nombres están en la forma en que se usan en el resto de la
 * aplicación; debajo van los nombres oficiales y cooficiales como alias, para
 * que buscar "Gipuzkoa" o "A Coruña" también encuentre.
 */
export const PROVINCIAS = {
  '01': 'Álava', '02': 'Albacete', '03': 'Alicante', '04': 'Almería',
  '05': 'Ávila', '06': 'Badajoz', '07': 'Baleares', '08': 'Barcelona',
  '09': 'Burgos', 10: 'Cáceres', 11: 'Cádiz', 12: 'Castellón',
  13: 'Ciudad Real', 14: 'Córdoba', 15: 'La Coruña', 16: 'Cuenca',
  17: 'Girona', 18: 'Granada', 19: 'Guadalajara', 20: 'Guipúzcoa',
  21: 'Huelva', 22: 'Huesca', 23: 'Jaén', 24: 'León',
  25: 'Lérida', 26: 'La Rioja', 27: 'Lugo', 28: 'Madrid',
  29: 'Málaga', 30: 'Murcia', 31: 'Navarra', 32: 'Orense',
  33: 'Asturias', 34: 'Palencia', 35: 'Las Palmas', 36: 'Pontevedra',
  37: 'Salamanca', 38: 'S.C.Tenerife', 39: 'Cantabria', 40: 'Segovia',
  41: 'Sevilla', 42: 'Soria', 43: 'Tarragona', 44: 'Teruel',
  45: 'Toledo', 46: 'Valencia', 47: 'Valladolid', 48: 'Vizcaya',
  49: 'Zamora', 50: 'Zaragoza', 51: 'Ceuta', 52: 'Melilla',
};

/** Otras formas de llamar a la misma provincia, para que la búsqueda acierte. */
export const ALIAS_PROVINCIA = {
  '01': ['Araba'], 15: ['A Coruña', 'Coruña'], 17: ['Gerona'],
  20: ['Gipuzkoa'], 25: ['Lleida'], 32: ['Ourense'],
  38: ['Santa Cruz de Tenerife', 'Tenerife'], 48: ['Bizkaia'],
  '07': ['Illes Balears', 'Islas Baleares'], 46: ['València'],
};

/** Nombre de la provincia a partir del código INE del municipio. */
export function provinciaDeMunicipio(codigoMunicipio) {
  const cod = String(codigoMunicipio ?? '').padStart(5, '0').slice(0, 2);
  return PROVINCIAS[cod] || PROVINCIAS[Number(cod)] || '';
}

/** Quita acentos y mayúsculas, para poder comparar como se escribe deprisa. */
export function normalizar(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

/**
 * Deja el nombre del municipio como se dice.
 * En el listado oficial vienen invertidos ("Molsosa, La", "Coruña, A") para
 * poder ordenarlos alfabéticamente; en una ficha de cliente eso queda raro.
 */
export function nombreNatural(nombre) {
  const m = String(nombre ?? '').match(/^(.+),\s*(el|la|los|las|a|as|o|os|es|s'|l')$/i);
  return m ? `${m[2]} ${m[1]}` : String(nombre ?? '');
}

// ── Carga de los datos, una sola vez y solo cuando hacen falta ────────────
let cargando = null;
let datos = null;

async function cargar() {
  if (datos) return datos;
  if (!cargando) {
    cargando = import('./cp-espana-datos.js').then(({ MUNICIPIOS, RELACION }) => {
      const municipios = MUNICIPIOS.map((linea) => {
        const corte = linea.indexOf('|');
        const codigo = linea.slice(0, corte);
        const nombre = linea.slice(corte + 1);
        return {
          codigo,
          nombre: nombreNatural(nombre),
          nombreOriginal: nombre,
          provincia: provinciaDeMunicipio(codigo),
        };
      });

      const porCp = new Map();
      for (const trozo of RELACION.split(';')) {
        const corte = trozo.indexOf('>');
        if (corte < 0) continue;
        const cp = trozo.slice(0, corte);
        const indices = trozo.slice(corte + 1).split(',').map(Number);
        porCp.set(cp, indices);
      }

      datos = { municipios, porCp };
      return datos;
    });
  }
  return cargando;
}

/** Deja los datos listos de antemano (opcional, para que la primera búsqueda vaya fina). */
export function precargar() {
  cargar().catch(() => { /* si falla, se reintenta al buscar */ });
}

const resultado = (cp, m) => ({
  cp,
  municipio: m.nombre,
  provincia: m.provincia,
  codigo_municipio: m.codigo,
  // Nombres que usa el resto de la aplicación en las fichas.
  postal_code: cp,
  city: m.nombre,
  province: m.provincia,
});

/**
 * Busca por código postal exacto.
 * Devuelve TODOS los municipios de ese código postal: 1.704 códigos postales
 * de España tocan más de un municipio, y quedarse con el primero sería
 * ponerle al cliente un pueblo que no es.
 */
export async function buscarPorCodigoPostal(cp) {
  const limpio = String(cp ?? '').replace(/\D/g, '').padStart(5, '0');
  if (limpio.length !== 5) return [];
  const { municipios, porCp } = await cargar();
  return (porCp.get(limpio) || []).map((i) => resultado(limpio, municipios[i]));
}

/** Busca códigos postales que empiecen por lo que se ha escrito. */
export async function buscarPorPrefijo(prefijo, limite = 25) {
  const p = String(prefijo ?? '').replace(/\D/g, '');
  if (!p) return [];
  if (p.length === 5) return buscarPorCodigoPostal(p);
  const { municipios, porCp } = await cargar();
  const salida = [];
  for (const [cp, indices] of porCp) {
    if (!cp.startsWith(p)) continue;
    for (const i of indices) {
      salida.push(resultado(cp, municipios[i]));
      if (salida.length >= limite) return salida;
    }
  }
  return salida;
}

/**
 * Busca por nombre de municipio. Los que empiezan por lo escrito van
 * primero: quien escribe "sant" busca Santander antes que "Puerto de
 * Santa María".
 */
export async function buscarPorMunicipio(texto, limite = 25) {
  const q = normalizar(texto);
  if (q.length < 2) return [];
  const { municipios, porCp } = await cargar();

  // Código postal de cada municipio (el más bajo, que suele ser el del casco).
  const cpDeMunicipio = new Map();
  for (const [cp, indices] of porCp) {
    for (const i of indices) {
      const actual = cpDeMunicipio.get(i);
      if (!actual || cp < actual) cpDeMunicipio.set(i, cp);
    }
  }

  const empiezan = [];
  const contienen = [];
  municipios.forEach((m, i) => {
    const n = normalizar(m.nombre);
    const orig = normalizar(m.nombreOriginal);
    if (n.startsWith(q) || orig.startsWith(q)) empiezan.push(i);
    else if (n.includes(q) || orig.includes(q)) contienen.push(i);
  });

  return [...empiezan, ...contienen]
    .slice(0, limite)
    .map((i) => resultado(cpDeMunicipio.get(i) || '', municipios[i]));
}

/** Busca por provincia y devuelve sus municipios. */
export async function buscarPorProvincia(texto, limite = 25) {
  const q = normalizar(texto);
  if (q.length < 2) return [];

  const codigos = Object.entries(PROVINCIAS)
    .filter(([cod, nombre]) => {
      if (normalizar(nombre).includes(q)) return true;
      return (ALIAS_PROVINCIA[cod] || ALIAS_PROVINCIA[String(cod).padStart(2, '0')] || [])
        .some((a) => normalizar(a).includes(q));
    })
    .map(([cod]) => String(cod).padStart(2, '0'));
  if (!codigos.length) return [];

  const { municipios, porCp } = await cargar();
  const salida = [];
  for (const [cp, indices] of porCp) {
    for (const i of indices) {
      const m = municipios[i];
      if (!codigos.includes(m.codigo.slice(0, 2))) continue;
      salida.push(resultado(cp, m));
      if (salida.length >= limite) return salida;
    }
  }
  return salida;
}

/** Busca sin saber qué le han escrito: si son cifras, CP; si no, nombre. */
export async function buscar(texto, limite = 25) {
  const t = String(texto ?? '').trim();
  if (!t) return [];
  if (/^\d+$/.test(t)) return buscarPorPrefijo(t, limite);
  const porNombre = await buscarPorMunicipio(t, limite);
  if (porNombre.length) return porNombre;
  return buscarPorProvincia(t, limite);
}
