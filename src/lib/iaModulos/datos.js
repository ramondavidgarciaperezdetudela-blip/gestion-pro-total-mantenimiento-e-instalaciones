// Acceso a los datos del Centro de IA (módulos, skills, conectores, peticiones)
// y a los secretos de los conectores, que se guardan SOLO en este aparato.
import { base44 } from '@/api/base44Client';

export const EVENTO_CAMBIOS = 'gpt-modulos-cambiados';
const e = (n) => base44.entities[n];

const lista = async (n) => { try { return (await e(n).list('-created_date', 500)) || []; } catch { return []; } };
export const listarModulos = () => lista('ModuloIA');
export const listarSkills = () => lista('SkillIA');
export const listarConectores = () => lista('ConectorIA');
export const listarPeticiones = () => lista('PeticionCambioIA');

export const crear = (n, d) => e(n).create(d);
export const editar = (n, id, d) => e(n).update(id, d);
export const borrar = (n, id) => e(n).delete(id);

/** Avisa al menú de que los módulos activos han cambiado. */
export const avisarCambios = () => { try { window.dispatchEvent(new Event(EVENTO_CAMBIOS)); } catch { /* sin ventana */ } };

const clave = (nombre) => 'gpt_ia_conector_' + String(nombre || '').toLowerCase();
export function leerSecreto(c, almacen = globalThis.localStorage) {
  try { return almacen.getItem(clave(c?.nombre)) || ''; } catch { return ''; }
}
export function guardarSecreto(nombre, valor, almacen = globalThis.localStorage) {
  try { if (valor) almacen.setItem(clave(nombre), valor); else almacen.removeItem(clave(nombre)); } catch { /* sin sitio */ }
}

/** Texto de una petición de cambio listo para dárselo a Claude Code o a un programador. */
export function peticionEnMarkdown(p) {
  return `# ${p.titulo}\n\n${p.detalle}\n\n---\nPetición creada desde el Centro de IA de Gestión Pro Total (${(p.created_date || new Date().toISOString()).slice(0, 10)}).\n`;
}

export function descargarTexto(nombre, texto, tipo = 'text/plain') {
  const url = URL.createObjectURL(new Blob([texto], { type: `${tipo};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
