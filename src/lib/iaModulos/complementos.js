// Complementos: paquete (archivo .json) con módulos, skills y conectores para compartir
// entre empresas o copiar a otro equipo. Los conectores se exportan SIN claves.
import { validarModulo, validarSkill } from './modulo.js';

export const FORMATO = 'gpt-complemento';
export const VERSION_FORMATO = 1;
export const MAX_ARCHIVO = 6 * 1024 * 1024;

const RE_URL = /^https:\/\/[^\s]+$/i;

export function validarConector(obj) {
  const nombre = String(obj?.nombre ?? '').trim().slice(0, 60);
  const tipo = ['http', 'github'].includes(obj?.tipo) ? obj.tipo : 'http';
  const errores = [];
  if (!nombre) errores.push('Falta el nombre del conector.');
  if (!/^[\p{L}\p{N} _.\-]{1,60}$/u.test(nombre)) errores.push('El nombre solo puede llevar letras, números, espacios, guion y punto.');
  const url = String(obj?.url_base ?? '').trim();
  if (tipo === 'http' && !RE_URL.test(url) && !/^http:\/\/(localhost|127\.0\.0\.1)/i.test(url)) errores.push('La dirección debe empezar por https://');
  if (tipo === 'github' && !/^[\w.\-]+\/[\w.\-]+$/.test(String(obj?.repo ?? ''))) errores.push('El repositorio debe ser «usuario/nombre».');
  if (errores.length) return { ok: false, errores };
  return {
    ok: true, errores: [],
    conector: {
      nombre, tipo, notas: String(obj?.notas ?? '').slice(0, 300),
      ...(tipo === 'http'
        ? { url_base: url.replace(/\/+$/, ''), cabecera_nombre: String(obj?.cabecera_nombre ?? '').replace(/[^A-Za-z0-9\-]/g, '').slice(0, 60) }
        : { repo: String(obj.repo) })
    }
  };
}

/** Paquete listo para guardar en un archivo. Sin ids, sin permisos concedidos y sin claves. */
export function exportarComplemento({ modulos = [], skills = [], conectores = [] }, nombre = 'Complemento') {
  return {
    formato: FORMATO,
    version: VERSION_FORMATO,
    nombre: String(nombre).slice(0, 80),
    creado: new Date().toISOString(),
    modulos: modulos.map((m) => ({ nombre: m.nombre, descripcion: m.descripcion || '', icono: m.icono || 'cuadro', html: m.html, permisos: m.permisos || [] })),
    skills: skills.map((s) => ({ nombre: s.nombre, descripcion: s.descripcion || '', instrucciones: s.instrucciones })),
    conectores: conectores.map((c) => (c.tipo === 'github'
      ? { nombre: c.nombre, tipo: 'github', repo: c.repo, notas: c.notas || '' }
      : { nombre: c.nombre, tipo: 'http', url_base: c.url_base, cabecera_nombre: c.cabecera_nombre || '', notas: c.notas || '' }))
  };
}

/**
 * Lee el texto de un archivo de complemento y devuelve lo que se puede importar.
 * Todo entra DESACTIVADO: los permisos los concede la persona al activar.
 */
export function leerComplemento(texto) {
  if (typeof texto !== 'string' || texto.length > MAX_ARCHIVO) return { ok: false, errores: ['El archivo es demasiado grande o no es de texto.'] };
  let obj;
  try { obj = JSON.parse(texto); } catch { return { ok: false, errores: ['El archivo no es un complemento válido (no es JSON).'] }; }
  if (obj?.formato !== FORMATO) return { ok: false, errores: ['El archivo no es un complemento de Gestión Pro Total.'] };
  if (!Number.isInteger(obj.version) || obj.version > VERSION_FORMATO) return { ok: false, errores: ['El complemento es de una versión más nueva del programa. Actualiza el programa.'] };
  const modulos = []; const skills = []; const conectores = []; const avisos = [];
  for (const m of Array.isArray(obj.modulos) ? obj.modulos : []) {
    const r = validarModulo(m);
    if (r.ok) { modulos.push(r.modulo); avisos.push(...(r.avisos || [])); } else avisos.push(`Módulo «${m?.nombre || '?'}» descartado: ${r.errores.join(' ')}`);
  }
  for (const s of Array.isArray(obj.skills) ? obj.skills : []) {
    const r = validarSkill(s);
    if (r.ok) skills.push(r.skill); else avisos.push(`Skill «${s?.nombre || '?'}» descartada: ${r.errores.join(' ')}`);
  }
  for (const c of Array.isArray(obj.conectores) ? obj.conectores : []) {
    const r = validarConector(c);
    if (r.ok) conectores.push(r.conector); else avisos.push(`Conector «${c?.nombre || '?'}» descartado: ${r.errores.join(' ')}`);
  }
  if (!modulos.length && !skills.length && !conectores.length) return { ok: false, errores: ['El complemento no contiene nada que se pueda importar.', ...avisos] };
  return { ok: true, nombre: String(obj.nombre || 'Complemento').slice(0, 80), modulos, skills, conectores, avisos };
}

/** Nombre que no choque con los existentes: «Nombre», «Nombre (2)», … */
export function nombreLibre(nombre, existentes) {
  const usados = new Set((existentes || []).map((x) => String(x).toLowerCase()));
  if (!usados.has(String(nombre).toLowerCase())) return nombre;
  for (let i = 2; i < 1000; i++) if (!usados.has(`${nombre} (${i})`.toLowerCase())) return `${nombre} (${i})`;
  return `${nombre} (${Date.now()})`;
}
