/**
 * whatsapp.js — Enlaces para escribir por WhatsApp.
 *
 * Se usa el enlace oficial wa.me, que funciona igual en el móvil (abre la
 * aplicación) y en el ordenador (abre WhatsApp Web). No hace falta ninguna
 * cuenta de empresa ni ninguna clave: es solo un enlace.
 */

/** Prefijo por defecto cuando el número viene sin país (España). */
const PREFIJO_POR_DEFECTO = '34';

/**
 * Deja el teléfono como lo quiere wa.me: solo dígitos, con prefijo de país.
 *
 * En las fichas los teléfonos vienen de mil maneras: "600 12 34 56",
 * "+34 600123456", "0034600123456"… Todas tienen que acabar igual.
 *
 * @returns {string|null} null si no parece un número utilizable
 */
export function normalizarTelefono(telefono, prefijoPais = PREFIJO_POR_DEFECTO) {
  if (!telefono) return null;
  let n = String(telefono).trim();

  // Quitar todo lo que no sea dígito, guardando si empezaba por + o 00.
  const empiezaConMas = n.startsWith('+');
  const empiezaCon00 = n.startsWith('00');
  n = n.replace(/\D/g, '');
  if (!n) return null;

  if (empiezaCon00) n = n.slice(2);          // 0034… → 34…
  else if (empiezaConMas) { /* ya trae país */ }
  else if (n.length === 9) n = prefijoPais + n;  // número español suelto
  // Si tiene 11-15 dígitos se asume que ya lleva el país.

  // Un teléfono real tiene entre 8 y 15 dígitos con prefijo.
  if (n.length < 8 || n.length > 15) return null;
  return n;
}

/**
 * Enlace de WhatsApp listo para abrir.
 * @param {string} telefono
 * @param {string} mensaje  texto ya escrito (se codifica aquí)
 * @returns {string|null} null si el teléfono no vale
 */
export function enlaceWhatsApp(telefono, mensaje = '') {
  const n = normalizarTelefono(telefono);
  if (!n) return null;
  const texto = mensaje ? `?text=${encodeURIComponent(mensaje)}` : '';
  return `https://wa.me/${n}${texto}`;
}

/**
 * Mensaje de confirmación de cita, para mandárselo al cliente.
 *
 * Se le pide que conteste SÍ o NO, que es lo que de verdad hace falta saber:
 * si la cita se mantiene o el hueco se puede volver a ofrecer.
 */
export function mensajeConfirmacionCita({
  cliente, empresa, fecha, horaInicio, horaFin, trabajo, direccion,
}) {
  const [a, m, d] = String(fecha || '').split('-');
  const fechaES = d && m && a ? `${d}/${m}/${a}` : fecha;

  return [
    `Hola${cliente ? ` ${cliente}` : ''}, le escribo de ${empresa || 'nuestra empresa'}.`,
    '',
    `Le hemos reservado esta cita:`,
    `📅 ${fechaES}`,
    `🕐 ${horaInicio}${horaFin ? ` a ${horaFin}` : ''} (orientativo)`,
    trabajo ? `🔧 ${trabajo}` : null,
    direccion ? `📍 ${direccion}` : null,
    '',
    '¿Le va bien? Contésteme SÍ para confirmarla o NO si prefiere otro día.',
    '',
    'La hora es orientativa: según cómo venga el trabajo anterior puede haber algo de retraso. Gracias.',
  ].filter(Boolean).join('\n');
}

/** Abre el enlace. Devuelve false si el teléfono no servía. */
export function abrirWhatsApp(telefono, mensaje) {
  const url = enlaceWhatsApp(telefono, mensaje);
  if (!url) return false;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}
