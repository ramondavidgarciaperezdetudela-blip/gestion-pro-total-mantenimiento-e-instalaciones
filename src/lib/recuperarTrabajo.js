/**
 * recuperarTrabajo.js — Que no se pierda lo que estabas escribiendo.
 *
 * EL PROBLEMA: en el móvil, si te sales de la aplicación para mirar otra cosa
 * (una llamada, WhatsApp, el correo), Android puede cerrarla por su cuenta para
 * liberar memoria. No avisa. Al volver, la aplicación arranca de cero: te deja
 * en la pantalla de inicio y el parte, el presupuesto o la ficha que estabas
 * rellenando se ha perdido entero. Estando en casa de un cliente, eso significa
 * volver a escribirlo todo delante de él.
 *
 * No se puede impedir que Android lo cierre: lo decide el sistema. Lo que sí se
 * puede es que la aplicación se acuerde de dónde estaba y de lo que había
 * escrito, y lo devuelva todo al volver.
 *
 * CÓMO: se guarda en el propio aparato, mientras se escribe, el contenido de
 * cada campo y en qué pantalla se estaba. Al arrancar, se vuelve a esa pantalla
 * y se rellenan los campos. Se avisa de que se ha recuperado, y se puede
 * descartar de un toque por si no se quiere.
 *
 * Se guarda SOLO en el aparato: no se manda a ningún servidor. Y nunca se
 * guardan contraseñas ni campos marcados con data-no-recuperar.
 */

const CLAVE = 'gpt_trabajo_a_medias';
const HORAS_QUE_DURA = 12;
const ESPERA_AL_GUARDAR = 400;

/** Campos que no se tocan jamás. */
function seGuarda(el) {
  if (!el || el.disabled || el.readOnly) return false;
  if (el.closest?.('[data-no-recuperar]')) return false;
  const etiqueta = el.tagName;
  if (etiqueta === 'SELECT' || etiqueta === 'TEXTAREA') return true;
  if (etiqueta !== 'INPUT') return false;
  const tipo = (el.type || 'text').toLowerCase();
  // Ni contraseñas, ni ficheros, ni botones, ni buscadores.
  return !['password', 'file', 'hidden', 'submit', 'button', 'image', 'reset', 'search'].includes(tipo);
}

/**
 * Un nombre estable para el campo.
 *
 * No vale usar la posición a secas: si una lista carga más tarde y mueve las
 * cosas de sitio, el texto acabaría en el campo equivocado. Se usa lo que
 * identifica al campo (name, id, la etiqueta que lee un lector de pantalla o
 * el texto de ayuda) y solo se recurre a la posición cuando no hay nada más.
 */
export function nombreDelCampo(el, indice) {
  const propio = el.getAttribute('name') || el.id
    || el.getAttribute('aria-label') || el.getAttribute('placeholder');
  if (propio) return `${el.tagName}:${propio}`;
  return `${el.tagName}:#${indice}`;
}

/** Dónde estamos, sirva el router que sirva. */
export function dondeEstamos() {
  const { pathname, search, hash } = window.location;
  return hash && hash.length > 1 ? hash : `${pathname}${search}`;
}

function leer() {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    if (!d?.cuando) return null;
    const horas = (Date.now() - d.cuando) / 3600000;
    if (horas > HORAS_QUE_DURA) return null;
    return d;
  } catch {
    return null;
  }
}

function escribir(d) {
  try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch { /* sin sitio */ }
}

export function olvidarTrabajo() {
  try { localStorage.removeItem(CLAVE); } catch { /* nada */ }
}

/** Lo que hay escrito ahora mismo en pantalla. */
export function loQueHayEscrito(raiz = document) {
  const campos = {};
  const elementos = [...raiz.querySelectorAll('input, textarea, select')];
  elementos.forEach((el, i) => {
    if (!seGuarda(el)) return;
    const tipo = (el.type || '').toLowerCase();
    const valor = (tipo === 'checkbox' || tipo === 'radio') ? el.checked : el.value;
    if (valor === '' || valor === false || valor == null) return;
    campos[nombreDelCampo(el, i)] = valor;
  });
  return campos;
}

/**
 * Escribe un valor de forma que React se entere.
 *
 * Poner el .value a secas no vale: React guarda su propia copia y al siguiente
 * repintado lo borra. Hay que usar el asignador original del navegador y luego
 * avisar con el mismo evento que dispara el teclado.
 */
function ponerValor(el, valor) {
  const tipo = (el.type || '').toLowerCase();
  if (tipo === 'checkbox' || tipo === 'radio') {
    if (el.checked === valor) return false;
    const asignador = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'checked')?.set;
    asignador ? asignador.call(el, valor) : (el.checked = valor);
    el.dispatchEvent(new Event('click', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  if (el.value === valor) return false;
  const prototipo = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype
    : el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype
      : window.HTMLInputElement.prototype;
  const asignador = Object.getOwnPropertyDescriptor(prototipo, 'value')?.set;
  asignador ? asignador.call(el, valor) : (el.value = valor);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

/**
 * Devuelve a la pantalla lo que había escrito. Cuántos campos ha rellenado.
 *
 * SOLO rellena campos vacíos. Es la regla que impide el desastre: si se abre
 * la ficha de OTRO proveedor, sus datos no se pisan con los del borrador.
 */
export function devolverLoEscrito(campos, raiz = document) {
  if (!campos) return 0;
  let puestos = 0;
  const elementos = [...raiz.querySelectorAll('input, textarea, select')];
  elementos.forEach((el, i) => {
    if (!seGuarda(el)) return;
    const nombre = nombreDelCampo(el, i);
    if (!(nombre in campos)) return;
    const tipo = (el.type || '').toLowerCase();
    const estaVacio = (tipo === 'checkbox' || tipo === 'radio') ? el.checked === false : !el.value;
    if (!estaVacio) return;
    if (ponerValor(el, campos[nombre])) puestos++;
  });
  return puestos;
}

// ── El funcionamiento en la aplicación ──────────────────────────────────────

let temporizador = null;
let oyentes = new Set();
let aviso = null;

export function escucharRecuperacion(fn) {
  oyentes.add(fn);
  fn(aviso);
  return () => oyentes.delete(fn);
}

function anunciar(v) {
  aviso = v;
  oyentes.forEach((fn) => fn(v));
}

function guardarAhora() {
  const campos = loQueHayEscrito();
  const donde = dondeEstamos();
  // Sin nada escrito solo se guarda la pantalla: así al volver se sigue donde
  // se estaba aunque no hubiera un formulario a medias.
  escribir({ cuando: Date.now(), donde, campos });
}

function guardarPronto() {
  clearTimeout(temporizador);
  temporizador = setTimeout(guardarAhora, ESPERA_AL_GUARDAR);
}

/**
 * Arranca el sistema. Se llama una vez, al abrir la aplicación.
 * @param {(donde: string) => void} irA  Cómo volver a una pantalla.
 */
export function recordarTrabajo(irA) {
  const guardado = leer();

  document.addEventListener('input', guardarPronto, true);
  document.addEventListener('change', guardarPronto, true);
  // Al irse a otra aplicación, guardar YA: puede que no haya otra oportunidad,
  // porque Android cierra la aplicación sin avisar.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { clearTimeout(temporizador); guardarAhora(); }
  });
  window.addEventListener('pagehide', guardarAhora);

  if (!guardado) return;
  const hayEscrito = Object.keys(guardado.campos || {}).length > 0;
  const otraPantalla = guardado.donde && guardado.donde !== dondeEstamos();
  if (!hayEscrito && !otraPantalla) return;

  if (otraPantalla) {
    try { irA(guardado.donde); } catch { /* si no se puede, al menos los campos */ }
  }

  if (!hayEscrito) return;

  vigilarParaDevolver(guardado);
}

/**
 * Espera a que aparezcan los campos y los rellena.
 *
 * No basta con intentarlo al arrancar: casi todos los formularios del programa
 * (proveedor, cliente, artículo, parte…) viven dentro de un cuadro que se abre
 * con un botón. Al volver, ese cuadro está cerrado y los campos ni existen, así
 * que no hay dónde devolver el texto. Por eso se queda vigilando: en cuanto se
 * abre el cuadro, se rellena solo.
 *
 * Se vigila un rato acotado y se deja de vigilar en cuanto se ha devuelto algo:
 * ni conviene tener un observador de por vida, ni volver a rellenar más tarde
 * un formulario que ya se está usando para otra cosa.
 */
function vigilarParaDevolver(guardado, milisegundos = 180000) {
  let puestos = 0;
  let anunciado = false;

  const intentar = () => {
    puestos += devolverLoEscrito(guardado.campos);
    if (puestos > 0 && !anunciado) {
      anunciado = true;
      anunciar({ campos: puestos, cuando: guardado.cuando });
      parar();
    }
  };

  const observador = new MutationObserver(() => {
    clearTimeout(observador._espera);
    // Un respiro tras el último cambio: mientras se pinta el cuadro llegan
    // muchos cambios seguidos y no tiene sentido probar con cada uno.
    observador._espera = setTimeout(intentar, 150);
  });

  const parar = () => {
    clearTimeout(observador._espera);
    observador.disconnect();
    clearTimeout(reloj);
  };

  observador.observe(document.body, { childList: true, subtree: true });
  const reloj = setTimeout(parar, milisegundos);
  // Un primer intento por si los campos ya están puestos.
  setTimeout(intentar, 400);
  setTimeout(intentar, 1200);
}

export function cerrarAvisoRecuperacion() {
  anunciar(null);
}

/** Descartar lo recuperado: se limpian los campos y se olvida. */
export function descartarRecuperado() {
  olvidarTrabajo();
  anunciar(null);
}
