/**
 * modoSinIA.js — Que el programa funcione solo, sin gastar créditos.
 *
 * El problema: la ayuda con IA se llamaba sola, sin pedir permiso y sin
 * decirlo. Lo peor era la actualización diaria en segundo plano: 5 consultas
 * con búsqueda en internet CADA DÍA y EN CADA APARATO. Con el ordenador, la
 * tablet y el móvil son 15 consultas diarias que nadie ha pedido, y cuando se
 * acaban los créditos la pantalla se llena de avisos rojos.
 *
 * A partir de aquí: la IA viene APAGADA. El programa entero funciona sin
 * ella — clientes, presupuestos, facturas, partes, agenda, almacén, cálculos,
 * documentos, códigos postales y la copia de seguridad. Y la sincronización
 * entre ordenador, tablet y móvil tampoco depende de la IA: eso son los datos,
 * que van por su lado y siguen igual.
 *
 * Quien quiera la ayuda con IA la enciende en Configuración, y entonces se usa
 * solo cuando se pulsa un botón que la pide.
 */

const CLAVE = 'gpt_ia_activada';
const CLAVE_DIARIA = 'gpt_ia_diaria_activada';

/** Marca que lleva el error cuando la IA está apagada a propósito. */
export const MOTIVO_IA_APAGADA = 'IA_APAGADA';

const oyentes = new Set();

function leer(clave) {
  try { return localStorage.getItem(clave) === 'si'; } catch { return false; }
}

function escribir(clave, valor) {
  try { localStorage.setItem(clave, valor ? 'si' : 'no'); } catch { /* sin sitio: se queda apagada */ }
  oyentes.forEach((fn) => fn(estadoIA()));
}

/** ¿Está encendida la ayuda con IA? Apagada mientras no se diga lo contrario. */
export function iaActivada() {
  return leer(CLAVE);
}

/** ¿Y la actualización diaria automática? También apagada por defecto. */
export function actualizacionDiariaActivada() {
  // No tiene sentido tenerla encendida si la IA está apagada: son consultas
  // a la IA. Así no se puede dejar sin querer una puerta abierta.
  return leer(CLAVE) && leer(CLAVE_DIARIA);
}

export function activarIA(valor) {
  escribir(CLAVE, valor);
}

export function activarActualizacionDiaria(valor) {
  escribir(CLAVE_DIARIA, valor);
}

export function estadoIA() {
  return { ia: iaActivada(), diaria: actualizacionDiariaActivada() };
}

/** Avisa cuando se enciende o se apaga, para refrescar la pantalla. */
export function escucharEstadoIA(fn) {
  oyentes.add(fn);
  fn(estadoIA());
  return () => oyentes.delete(fn);
}

/** El error que se lanza en vez de gastar créditos. */
export function errorIAApagada(endpoint) {
  const err = new Error(
    'La ayuda con IA está apagada para no gastar créditos. Puedes encenderla en Configuración → IA.',
  );
  err.code = MOTIVO_IA_APAGADA;
  err.endpoint = endpoint;
  err.status = null;
  return err;
}

export function esIAApagada(err) {
  return err?.code === MOTIVO_IA_APAGADA;
}

/**
 * Endpoints que consumen créditos de IA. Se comprueba por el nombre y no con
 * una lista cerrada a propósito: si mañana se añade otro «InvokeAlgo», queda
 * cubierto sin tener que acordarse de apuntarlo aquí.
 */
export function gastaCreditos(nombre) {
  return typeof nombre === 'string' && /^(Invoke|GenerateImage|Generate)/.test(nombre);
}
