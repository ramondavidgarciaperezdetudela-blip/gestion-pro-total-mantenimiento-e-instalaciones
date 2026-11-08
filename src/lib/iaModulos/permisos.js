// Permisos de los módulos. Un módulo declara lo que necesita y la persona lo concede al
// activarlo. Formato: "leer:Contact", "crear:Contact", "editar:Contact", "borrar:Contact",
// "http:NombreDelConector", "ia". El almacenamiento propio del módulo no necesita permiso.

// Entidades que ningún módulo puede tocar: datos de acceso de la empresa y los propios
// registros del Centro de IA (un módulo no puede darse permisos a sí mismo).
export const ENTIDADES_PROHIBIDAS = new Set([
  'User', 'CompanySettings', 'ModuloIA', 'SkillIA', 'ConectorIA', 'PeticionCambioIA', 'DatoModulo'
]);

// Campos que nunca salen por el puente ni se pueden escribir desde un módulo.
export const CAMPO_SENSIBLE = /(password|passwd|token|secret|api_?key|clave_?api|iban|card_?number|pin_?code)/i;

const RE_ENTIDAD = /^[A-Za-z][A-Za-z0-9_]{0,60}$/;
const RE_CONECTOR = /^[\p{L}\p{N} _.\-]{1,60}$/u;
const ACCIONES_CON_OBJETIVO = ['leer', 'crear', 'editar', 'borrar', 'http'];
export const MAX_PERMISOS = 40;

export function parsePermiso(texto) {
  const t = String(texto ?? '').trim();
  if (t === 'ia') return { accion: 'ia', objetivo: '' };
  const i = t.indexOf(':');
  if (i < 1) return null;
  const accion = t.slice(0, i);
  const objetivo = t.slice(i + 1).trim();
  if (!ACCIONES_CON_OBJETIVO.includes(accion)) return null;
  if (accion === 'http') return RE_CONECTOR.test(objetivo) ? { accion, objetivo } : null;
  if (!RE_ENTIDAD.test(objetivo) || ENTIDADES_PROHIBIDAS.has(objetivo)) return null;
  return { accion, objetivo };
}

/** Lista limpia: solo permisos válidos, sin repetidos. Devuelve también los rechazados. */
export function normalizaPermisos(lista) {
  const validos = [];
  const rechazados = [];
  for (const p of Array.isArray(lista) ? lista : []) {
    const r = parsePermiso(p);
    if (!r) { rechazados.push(String(p)); continue; }
    const txt = r.accion === 'ia' ? 'ia' : `${r.accion}:${r.objetivo}`;
    if (!validos.includes(txt) && validos.length < MAX_PERMISOS) validos.push(txt);
  }
  return { validos, rechazados };
}

export function describePermiso(p) {
  const r = parsePermiso(p);
  if (!r) return String(p);
  switch (r.accion) {
    case 'leer': return `Ver los datos de «${r.objetivo}»`;
    case 'crear': return `Crear registros en «${r.objetivo}»`;
    case 'editar': return `Modificar registros de «${r.objetivo}»`;
    case 'borrar': return `Borrar registros de «${r.objetivo}»`;
    case 'http': return `Enviar y recibir datos por el conector «${r.objetivo}»`;
    case 'ia': return 'Hacer consultas a la IA (gasta de tu cuenta de Anthropic)';
    default: return String(p);
  }
}

/** Permisos que cambian o sacan datos (para avisar con más énfasis). */
export const esPermisoDelicado = (p) => /^(crear|editar|borrar|http):/.test(String(p));

export function permitido(concedidos, accion, objetivo = '') {
  const lista = Array.isArray(concedidos) ? concedidos : [];
  return lista.includes(accion === 'ia' ? 'ia' : `${accion}:${objetivo}`);
}

/** Copia sin campos sensibles (a cualquier profundidad razonable). */
export function quitaCamposSensibles(valor, nivel = 0) {
  if (nivel > 6) return valor;
  if (Array.isArray(valor)) return valor.map((v) => quitaCamposSensibles(v, nivel + 1));
  if (valor && typeof valor === 'object') {
    const salida = {};
    for (const [k, v] of Object.entries(valor)) {
      if (CAMPO_SENSIBLE.test(k)) continue;
      salida[k] = quitaCamposSensibles(v, nivel + 1);
    }
    return salida;
  }
  return valor;
}

export function tieneCamposSensibles(valor, nivel = 0) {
  if (nivel > 6) return false;
  if (Array.isArray(valor)) return valor.some((v) => tieneCamposSensibles(v, nivel + 1));
  if (valor && typeof valor === 'object') {
    return Object.entries(valor).some(([k, v]) => CAMPO_SENSIBLE.test(k) || tieneCamposSensibles(v, nivel + 1));
  }
  return false;
}
