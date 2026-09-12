/**
 * datosEmpresa.js — Rellenar los datos de una empresa a partir del NIF o del nombre.
 *
 * Va por capas, de lo seguro a lo que hay que comprobar:
 *
 *   1. Lo que se saca del propio NIF sin preguntar a nadie: si es válido, qué
 *      tipo de documento es y de qué provincia está registrada la sociedad.
 *      Esto es aritmética, funciona sin cobertura y no se equivoca.
 *   2. La web y el logotipo, que se deducen del dominio.
 *   3. Lo demás —dirección, código postal, teléfono, correo— que hay que ir a
 *      buscar fuera y por tanto puede venir mal o no venir.
 *
 * Y una regla que no se salta: esto NUNCA pisa lo que ya está escrito por su
 * cuenta. Devuelve lo que ha encontrado y quien lo use decide qué aplica. Un
 * buscador que te machaca la dirección buena por una sacada de internet hace
 * más daño que no tenerlo.
 */

import { PROVINCIAS } from './codigosPostales';

// ─── NIF, NIE y CIF ──────────────────────────────────────────────────────────

const LETRAS_DNI = 'TRWAGMYFPDXBNJZSQVHLCKE';
const LETRAS_CIF = 'JABCDEFGHI';

/** Quita puntos, guiones y espacios, y lo pone en mayúsculas. */
export function limpiarNif(valor) {
  return String(valor ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '');
}

/** Qué clase de documento es: 'DNI', 'NIE', 'CIF' o null si no encaja. */
export function tipoDeNif(valor) {
  const v = limpiarNif(valor);
  if (/^[0-9]{8}[A-Z]$/.test(v)) return 'DNI';
  if (/^[XYZ][0-9]{7}[A-Z]$/.test(v)) return 'NIE';
  if (/^[ABCDEFGHJKLMNPQRSUVW][0-9]{7}[0-9A-J]$/.test(v)) return 'CIF';
  return null;
}

/** La letra que le toca a un DNI. */
function letraDni(numero) {
  return LETRAS_DNI[Number(numero) % 23];
}

/**
 * ¿El NIF está bien? Se comprueba el dígito o la letra de control, que es lo
 * que pilla el 99 % de las erratas al teclear.
 */
export function nifValido(valor) {
  const v = limpiarNif(valor);
  const tipo = tipoDeNif(v);
  if (!tipo) return false;

  if (tipo === 'DNI') return v[8] === letraDni(v.slice(0, 8));

  if (tipo === 'NIE') {
    const inicial = { X: '0', Y: '1', Z: '2' }[v[0]];
    return v[8] === letraDni(inicial + v.slice(1, 8));
  }

  // CIF: se suman las cifras pares tal cual y las impares duplicadas,
  // sumando las cifras del resultado cuando pasa de 9.
  const digitos = v.slice(1, 8).split('').map(Number);
  let suma = 0;
  digitos.forEach((d, i) => {
    if (i % 2 === 0) {
      const doble = d * 2;
      suma += doble > 9 ? doble - 9 : doble;
    } else {
      suma += d;
    }
  });
  const control = (10 - (suma % 10)) % 10;
  const letra = v[0];
  const ultimo = v[8];

  // Unas letras exigen dígito de control, otras letra, y otras admiten las dos.
  if ('PQRSNW'.includes(letra)) return ultimo === LETRAS_CIF[control];
  if ('ABEH'.includes(letra)) return ultimo === String(control);
  return ultimo === String(control) || ultimo === LETRAS_CIF[control];
}

/** Qué es cada letra inicial de un CIF, para poder explicarlo. */
export const FORMAS_JURIDICAS = {
  A: 'Sociedad anónima',
  B: 'Sociedad de responsabilidad limitada',
  C: 'Sociedad colectiva',
  D: 'Sociedad comanditaria',
  E: 'Comunidad de bienes o herencia yacente',
  F: 'Sociedad cooperativa',
  G: 'Asociación o fundación',
  H: 'Comunidad de propietarios',
  J: 'Sociedad civil',
  N: 'Entidad extranjera',
  P: 'Corporación local',
  Q: 'Organismo público',
  R: 'Congregación o institución religiosa',
  S: 'Órgano de la Administración',
  U: 'Unión temporal de empresas',
  V: 'Otro tipo no definido',
  W: 'Establecimiento permanente de entidad no residente',
};

/**
 * La provincia donde está registrada la sociedad, sacada del propio CIF: las
 * dos cifras que van justo detrás de la letra.
 *
 * Ojo: es la provincia de REGISTRO, que no siempre es donde trabajan. Sirve
 * para proponerla, no para darla por buena sin mirar.
 */
export function provinciaDelCif(valor) {
  const v = limpiarNif(valor);
  if (tipoDeNif(v) !== 'CIF') return null;
  const codigo = v.slice(1, 3);
  const provincia = PROVINCIAS[codigo] || PROVINCIAS[Number(codigo)] || null;
  return provincia ? { codigo, provincia } : null;
}

/** Lo que se puede decir de un NIF sin salir del programa. */
export function analizarNif(valor) {
  const v = limpiarNif(valor);
  const tipo = tipoDeNif(v);
  if (!tipo) {
    return { nif: v, tipo: null, valido: false, mensaje: v ? 'No tiene forma de NIF, NIE ni CIF.' : '' };
  }
  const valido = nifValido(v);
  const prov = provinciaDelCif(v);
  const forma = tipo === 'CIF' ? FORMAS_JURIDICAS[v[0]] : null;
  return {
    nif: v,
    tipo,
    valido,
    forma,
    provincia: prov?.provincia || null,
    mensaje: valido
      ? [`${tipo} correcto`, forma, prov ? `registrado en ${prov.provincia}` : null].filter(Boolean).join(' · ')
      : `El dígito de control no cuadra: revisa el ${tipo}.`,
  };
}

// ─── Web y logotipo ──────────────────────────────────────────────────────────

/** El dominio limpio de una dirección web escrita de cualquier manera. */
export function dominioDeWeb(web) {
  const t = String(web ?? '').trim();
  if (!t) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
    return url.hostname.replace(/^www\./i, '') || null;
  } catch {
    return null;
  }
}

/** La dirección normalizada, para guardarla siempre igual. */
export function webNormalizada(web) {
  const d = dominioDeWeb(web);
  return d ? `https://${d}` : '';
}

/** Sitios de donde puede salir el logotipo de un dominio, por orden. */
export function candidatosDeLogo(dominio) {
  if (!dominio) return [];
  return [
    `https://logo.clearbit.com/${dominio}?size=400`,
    `https://icons.duckduckgo.com/ip3/${dominio}.ico`,
    `https://www.google.com/s2/favicons?domain=${dominio}&sz=256`,
  ];
}

/**
 * Prueba los candidatos y devuelve el primero que sea de verdad una imagen.
 * Se carga como <img>: un HEAD no vale porque muchos servidores lo capan.
 */
export function buscarLogo(dominio, { tiempoMaximo = 4000 } = {}) {
  const candidatos = candidatosDeLogo(dominio);
  if (candidatos.length === 0) return Promise.resolve(null);

  const probar = (url) => new Promise((resolve) => {
    const img = new Image();
    const reloj = setTimeout(() => { img.src = ''; resolve(null); }, tiempoMaximo);
    img.onload = () => {
      clearTimeout(reloj);
      // Un favicon de 16 px no sirve como logotipo de una factura.
      resolve(img.naturalWidth >= 48 ? url : null);
    };
    img.onerror = () => { clearTimeout(reloj); resolve(null); };
    img.src = url;
  });

  return candidatos.reduce(
    (cadena, url) => cadena.then((hallado) => hallado || probar(url)),
    Promise.resolve(null),
  );
}

// ─── Lo que hay que ir a buscar fuera ────────────────────────────────────────

const CAMPOS = ['company_name', 'nif', 'address', 'postal_code', 'city', 'province', 'phone', 'email', 'website', 'logo_url'];

export const ETIQUETAS_CAMPO = {
  company_name: 'Nombre / Razón social',
  nif: 'NIF / CIF',
  address: 'Dirección',
  postal_code: 'Código postal',
  city: 'Población',
  province: 'Provincia',
  phone: 'Teléfono',
  email: 'Correo electrónico',
  website: 'Web',
  logo_url: 'Logotipo',
};

const vacio = (v) => v === undefined || v === null || String(v).trim() === '';

/**
 * Busca los datos de una empresa y devuelve SOLO lo encontrado, sin tocar nada.
 *
 * @param {object} opciones
 * @param {string} [opciones.nif]
 * @param {string} [opciones.nombre]
 * @param {string} [opciones.web]
 * @param {object} [opciones.actuales]  lo que ya hay escrito, para saber qué falta
 * @param {object} opciones.base44      el cliente, para poder preguntar a la IA
 * @returns {Promise<{campos:object, origen:object, avisos:string[], nif:object}>}
 */
export async function completarDatosEmpresa({ nif = '', nombre = '', web = '', actuales = {}, base44 } = {}) {
  const campos = {};
  const origen = {};
  const avisos = [];
  const poner = (clave, valor, deDonde) => {
    if (vacio(valor)) return;
    const limpio = String(valor).trim();
    if (limpio === String(actuales[clave] ?? '').trim()) return;  // ya lo tiene igual
    campos[clave] = limpio;
    origen[clave] = deDonde;
  };

  // ── 1. Lo que sale del propio NIF ──
  const analisis = analizarNif(nif);
  if (analisis.tipo && !analisis.valido) {
    avisos.push(analisis.mensaje);
  }
  if (analisis.valido) {
    poner('nif', analisis.nif, 'el propio NIF');
    if (analisis.provincia) poner('province', analisis.provincia, 'el propio NIF (provincia de registro)');
  }

  // ── 2. La web y el logotipo ──
  const dominio = dominioDeWeb(web);
  if (dominio) {
    poner('website', `https://${dominio}`, 'la dirección web');
    const logo = await buscarLogo(dominio);
    if (logo) poner('logo_url', logo, 'el dominio de la web');
    else avisos.push('No se ha encontrado logotipo en ese dominio. Puedes subirlo a mano.');
  }

  // ── 3. Lo que hay que buscar fuera ──
  if (base44 && (nombre.trim() || analisis.valido)) {
    try {
      const quien = analisis.valido
        ? `NIF/CIF: ${analisis.nif}${nombre.trim() ? ` (nombre: "${nombre.trim()}")` : ''}`
        : `nombre: "${nombre.trim()}"`;
      const r = await base44.integrations.Core.InvokeLLM({
        prompt: `Busca en fuentes públicas los datos de contacto de la empresa española con ${quien}. `
          + 'Devuelve solo lo que encuentres con seguridad y deja vacío lo que no. '
          + 'La dirección, en formato español: calle, número, piso.',
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            company_name: { type: 'string' },
            address: { type: 'string' },
            postal_code: { type: 'string' },
            city: { type: 'string' },
            province: { type: 'string' },
            phone: { type: 'string' },
            email: { type: 'string' },
            website: { type: 'string' },
          },
        },
      });
      if (r && typeof r === 'object') {
        for (const clave of CAMPOS) {
          if (clave === 'logo_url' || clave === 'nif') continue;
          poner(clave, r[clave], 'búsqueda en internet');
        }
        // Si la búsqueda ha traído web y aún no había logotipo, se intenta con ella.
        const dominioNuevo = dominioDeWeb(campos.website || r.website);
        if (dominioNuevo && !campos.logo_url) {
          const logo = await buscarLogo(dominioNuevo);
          if (logo) poner('logo_url', logo, 'el dominio encontrado');
        }
      }
    } catch (e) {
      avisos.push('La búsqueda en internet no ha respondido. Lo que sale a continuación es solo lo que se saca del NIF y del dominio, que funciona sin conexión.');
    }
  }

  return { campos, origen, avisos, nif: analisis };
}

/** Los campos encontrados que además están vacíos en la ficha: los seguros de aplicar. */
export function losQueFaltan(campos, actuales = {}) {
  return Object.keys(campos).filter((k) => vacio(actuales[k]));
}
