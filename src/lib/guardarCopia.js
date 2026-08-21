/**
 * guardarCopia.js — Dónde acaba de verdad el fichero de la copia de seguridad.
 *
 * EL PROBLEMA
 * La copia se guardaba creando un enlace `<a download>` y pulsándolo. Eso
 * funciona en un navegador de ordenador, pero:
 *   - En el móvil (WebView de Android) ese enlace con un blob NO hace nada.
 *     El botón parecía funcionar, decía "copia completada" y no había ningún
 *     fichero en el teléfono. Una copia de seguridad que no existe es peor
 *     que no tener copia, porque uno se queda tranquilo.
 *   - En el ordenador el fichero cae en Descargas, mezclado con todo, y
 *     cuando hace falta de verdad no se encuentra.
 *
 * QUÉ HACE AHORA
 *   - Escritorio: lo escribe junto al programa, en "Copias de seguridad", y
 *     devuelve la ruta exacta para poder enseñarla y abrir la carpeta.
 *   - Móvil: lo escribe con el sistema de ficheros de Android, en la carpeta
 *     que se haya elegido (Documentos por defecto, que se ve desde el
 *     explorador del teléfono) y en la subcarpeta que se quiera.
 *   - Navegador: se queda el enlace de siempre, que ahí sí funciona.
 *
 * Y en los tres casos se devuelve dónde ha quedado, o el error. Nunca se dice
 * que la copia está hecha sin que haya un fichero detrás.
 */

/** Dónde se puede guardar en el móvil. */
export const DESTINOS_MOVIL = [
  {
    id: 'Documents',
    nombre: 'Documentos del teléfono',
    detalle: 'Se ve desde el explorador de archivos y desde el ordenador al conectar el cable. Es la recomendada.',
    recomendado: true,
  },
  {
    id: 'External',
    nombre: 'Almacenamiento de la aplicación',
    detalle: 'No pide ningún permiso, pero se borra si desinstalas la aplicación.',
  },
  {
    id: 'Data',
    nombre: 'Datos internos',
    detalle: 'Siempre disponible, aunque cuesta más llegar a ella desde el explorador.',
  },
];

export const SUBCARPETA_POR_DEFECTO = 'Copias de seguridad';
const CLAVE_DESTINO = 'gpt_copias_destino';
const CLAVE_CARPETA_PC = 'gpt_copias_carpeta_pc';

/** Preferencia guardada: dónde quiere el usuario sus copias en el móvil. */
export function leerDestino(almacen = globalThis.localStorage) {
  try {
    const crudo = almacen?.getItem(CLAVE_DESTINO);
    if (!crudo) return { directorio: 'Documents', subcarpeta: SUBCARPETA_POR_DEFECTO };
    const d = JSON.parse(crudo);
    return {
      directorio: DESTINOS_MOVIL.some(x => x.id === d.directorio) ? d.directorio : 'Documents',
      subcarpeta: limpiarCarpeta(d.subcarpeta) || SUBCARPETA_POR_DEFECTO,
    };
  } catch {
    return { directorio: 'Documents', subcarpeta: SUBCARPETA_POR_DEFECTO };
  }
}

export function guardarDestino(destino, almacen = globalThis.localStorage) {
  const limpio = {
    directorio: DESTINOS_MOVIL.some(x => x.id === destino?.directorio) ? destino.directorio : 'Documents',
    subcarpeta: limpiarCarpeta(destino?.subcarpeta) || SUBCARPETA_POR_DEFECTO,
  };
  try { almacen?.setItem(CLAVE_DESTINO, JSON.stringify(limpio)); } catch { /* sin guardar */ }
  return limpio;
}

/** Carpeta elegida a mano en el ordenador (vacío = la del programa). */
export function leerCarpetaPC(almacen = globalThis.localStorage) {
  try { return almacen?.getItem(CLAVE_CARPETA_PC) || ''; } catch { return ''; }
}

export function guardarCarpetaPC(ruta, almacen = globalThis.localStorage) {
  try {
    if (ruta) almacen?.setItem(CLAVE_CARPETA_PC, ruta);
    else almacen?.removeItem(CLAVE_CARPETA_PC);
  } catch { /* sin guardar */ }
  return ruta || '';
}

/**
 * Abre el selector de carpetas del sistema (solo en el programa de escritorio).
 * @returns {Promise<{ok:boolean, carpeta?:string, cancelado?:boolean, error?:string}>}
 */
export async function elegirCarpetaPC(win = globalThis.window) {
  if (detectarEntorno(win) !== 'escritorio') return { ok: false, error: 'Solo en el programa de escritorio' };
  return win.gptCopias.elegirCarpeta();
}

/**
 * Deja el nombre de una carpeta en algo que Android acepte.
 * Se quitan las barras (que crearían carpetas de más sin querer) y los
 * caracteres que dan problemas; los espacios se respetan.
 */
export function limpiarCarpeta(nombre) {
  return String(nombre ?? '')
    .replace(/[/\\:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

/** Nombre del fichero de la copia, con la fecha y la hora dentro. */
export function nombreCopia(fecha = new Date()) {
  const dos = (n) => String(n).padStart(2, '0');
  return `copia-gestion-pro-total_${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`
    + `_${dos(fecha.getHours())}-${dos(fecha.getMinutes())}.json`;
}

/**
 * Ruta relativa dentro del directorio elegido.
 * La subcarpeta puede llevar varios niveles ("Copias/2026") porque en el móvil
 * se navega por las carpetas: cada nivel se limpia por separado, para que un
 * nombre raro no se coma la barra ni cree carpetas de más.
 */
export function rutaRelativa(subcarpeta, nombre) {
  const carpeta = String(subcarpeta ?? '')
    .split('/')
    .map(limpiarCarpeta)
    .filter(Boolean)
    .join('/');
  const fichero = String(nombre || 'copia.json').replace(/[/\\]/g, '_');
  return carpeta ? `${carpeta}/${fichero}` : fichero;
}

/**
 * Lista las carpetas que hay dentro de una ruta del móvil, para poder
 * navegarlas y elegir dónde van las copias. En Android no hay selector de
 * carpetas del sistema como en el ordenador, así que se hace aquí dentro.
 *
 * @returns {Promise<{ok:boolean, carpetas?:string[], error?:string}>}
 */
export async function listarCarpetasMovil(directorio, ruta = '') {
  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const dir = Directory[directorio] ? directorio : 'Documents';
    const { files } = await Filesystem.readdir({
      path: rutaRelativa(ruta, '').replace(/\/$/, ''),
      directory: Directory[dir],
    });
    const carpetas = (files || [])
      .filter(f => (typeof f === 'object' ? f.type === 'directory' : true))
      .map(f => (typeof f === 'object' ? f.name : f))
      .filter(n => !String(n).startsWith('.'))
      .sort((a, b) => String(a).localeCompare(String(b), 'es'));
    return { ok: true, carpetas };
  } catch (err) {
    return { ok: false, error: err?.message || 'No se pudo leer esa carpeta', carpetas: [] };
  }
}

/** Crea una carpeta nueva dentro del móvil, para poder elegirla. */
export async function crearCarpetaMovil(directorio, ruta, nombre) {
  const limpio = limpiarCarpeta(nombre);
  if (!limpio) return { ok: false, error: 'Pon un nombre para la carpeta' };
  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const dir = Directory[directorio] ? directorio : 'Documents';
    const destino = [ruta, limpio].filter(Boolean).join('/');
    await Filesystem.mkdir({
      path: rutaRelativa(destino, '').replace(/\/$/, ''),
      directory: Directory[dir],
      recursive: true,
    });
    return { ok: true, carpeta: limpio };
  } catch (err) {
    return { ok: false, error: err?.message || 'No se pudo crear la carpeta' };
  }
}

/**
 * Dónde estamos: en el programa de escritorio, en el móvil o en el navegador.
 * Se pasa `win` para poder comprobarlo en las pruebas.
 */
export function detectarEntorno(win = globalThis.window) {
  if (win?.gptCopias?.disponible) return 'escritorio';
  if (win?.Capacitor?.isNativePlatform?.()) return 'movil';
  return 'navegador';
}

/**
 * Guarda la copia donde toque según el entorno.
 *
 * @returns {Promise<{ok:boolean, entorno:string, ruta?:string, carpeta?:string,
 *                    bytes?:number, aviso?:string, error?:string}>}
 */
export async function guardarCopiaSeguridad({
  nombre, contenido, destino, carpetaPC, win = globalThis.window,
}) {
  const entorno = detectarEntorno(win);
  const bytes = new TextEncoder().encode(contenido).length;

  if (entorno === 'escritorio') {
    const r = await win.gptCopias.guardar(nombre, contenido, carpetaPC || undefined);
    if (!r?.ok) return { ok: false, entorno, error: r?.error || 'No se pudo escribir el fichero' };
    return {
      ok: true, entorno, ruta: r.ruta, carpeta: r.carpeta, bytes: r.bytes ?? bytes,
      aviso: r.perdida
        ? `La carpeta que elegiste (${r.perdida}) ya no está disponible —disco desconectado, `
          + 'carpeta borrada o sin permisos—, así que la copia se ha guardado junto al programa. '
          + 'Vuelve a elegir carpeta cuando puedas.'
        : r.alternativa
          ? 'La carpeta del programa no admitía escritura, así que la copia se ha guardado en Documentos.'
          : undefined,
    };
  }

  if (entorno === 'movil') {
    return guardarEnMovil({ nombre, contenido, destino, bytes });
  }

  // Navegador: el enlace de toda la vida, que aquí sí funciona.
  try {
    const blob = new Blob([contenido], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = win.document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
    return { ok: true, entorno, ruta: nombre, bytes, carpeta: 'Descargas del navegador' };
  } catch (err) {
    return { ok: false, entorno, error: err?.message || 'El navegador no dejó descargar el fichero' };
  }
}

/**
 * Escritura en Android.
 *
 * Si la carpeta elegida necesita un permiso que no está dado, se pide. Si aun
 * así no se puede, se cae al almacenamiento propio de la aplicación —que no
 * pide permisos— y se DICE que se ha cambiado de sitio: lo que no puede pasar
 * es que el usuario crea que tiene la copia en Documentos y no esté.
 */
async function guardarEnMovil({ nombre, contenido, destino, bytes }) {
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
  const elegido = destino?.directorio && Directory[destino.directorio] ? destino.directorio : 'Documents';
  const ruta = rutaRelativa(destino?.subcarpeta ?? SUBCARPETA_POR_DEFECTO, nombre);

  const escribir = async (dir) => {
    await Filesystem.writeFile({
      path: ruta,
      data: contenido,
      directory: Directory[dir],
      encoding: Encoding.UTF8,
      recursive: true,   // crea la subcarpeta si no existe
    });
    const { uri } = await Filesystem.getUri({ path: ruta, directory: Directory[dir] });
    return uri;
  };

  try {
    // Documentos es pública y en Android antiguo pide permiso.
    if (elegido === 'Documents') {
      try {
        const permisos = await Filesystem.checkPermissions();
        if (permisos?.publicStorage !== 'granted') await Filesystem.requestPermissions();
      } catch { /* en Android moderno no hace falta y el método puede no existir */ }
    }
    const uri = await escribir(elegido);
    return { ok: true, entorno: 'movil', ruta: decodeURI(uri), uri, carpeta: ruta, bytes };
  } catch (err) {
    // Segundo intento donde siempre se puede escribir, avisando del cambio.
    try {
      const uri = await escribir('External');
      return {
        ok: true, entorno: 'movil', ruta: decodeURI(uri), uri, carpeta: ruta, bytes,
        aviso: `No se pudo guardar en ${nombreDestino(elegido)} (${err?.message || 'permiso denegado'}). `
          + 'La copia está en el almacenamiento de la aplicación. Ojo: esa carpeta se borra si desinstalas la aplicación.',
      };
    } catch (err2) {
      return {
        ok: false, entorno: 'movil',
        error: `No se pudo guardar el fichero: ${err2?.message || err?.message || 'error desconocido'}`,
      };
    }
  }
}

/**
 * Abre el EXPLORADOR DE FICHEROS del sistema para guardar la copia.
 *
 * Esto es lo que se pide de verdad al decir "elijo yo dónde": el cuadro de
 * Android (ACTION_CREATE_DOCUMENT) donde se navega por las carpetas del
 * teléfono, de la tarjeta o de Drive, se pone el nombre y se guarda. El
 * sistema le da permiso a la aplicación para escribir SOLO en ese fichero,
 * así que no hacen falta permisos de almacenamiento ni pelearse con las
 * restricciones de las carpetas públicas.
 *
 * Es distinto del cuadro de compartir: aquel manda el fichero a otra
 * aplicación, y si ninguna sabe recibir un .json parece que "no deja
 * guardar". Este escribe el fichero donde se le diga.
 *
 * IMPORTANTE: se le pasa la RUTA del fichero que ya está escrito en el
 * teléfono, no su contenido. Antes se mandaba el contenido codificado y con
 * una copia grande la aplicación SE CERRABA SOLA: entre el texto, su versión
 * codificada (que abulta un tercio más) y el mensaje del puente había cuatro
 * copias de lo mismo en memoria, y Android mataba la aplicación. Copiando de
 * fichero a fichero da igual lo que ocupe la copia.
 *
 * @param {string} origen  ruta (file://) del fichero ya escrito
 * @returns {Promise<{ok:boolean, uri?:string, cancelado?:boolean, motivo?:string}>}
 */
export async function guardarComoEnMovil({ nombre, origen }) {
  if (!origen) {
    return { ok: false, motivo: 'No hay ningún fichero de copia que guardar.' };
  }
  try {
    const { registerPlugin } = await import('@capacitor/core');
    // El trozo nativo va dentro de la propia aplicación (lo mete
    // scripts/anadir-guardar-como.py al compilar), no como dependencia: el
    // plugin que hay publicado para esto fija una versión de Android vieja y
    // rompía la compilación entera.
    const GuardarComo = registerPlugin('GuardarComo');
    const r = await GuardarComo.guardar({
      filename: nombre,
      mimeType: 'application/json',
      origen,
    });
    return { ok: true, uri: r?.uri || '', bytes: r?.bytes };
  } catch (err) {
    const m = String(err?.message || err || '');
    // Cerrar el explorador sin elegir no es un fallo: la copia ya está
    // escrita en el teléfono y no se ha perdido nada.
    if (/cancel/i.test(m)) return { ok: false, cancelado: true };
    return { ok: false, motivo: m || 'No se pudo abrir el explorador de ficheros' };
  }
}

/**
 * Abre el cuadro del sistema para decir dónde va la copia.
 *
 * Es lo que de verdad resuelve el lío de las carpetas en Android. El sistema
 * restringe dónde puede escribir una aplicación por su cuenta, pero NO
 * restringe lo que el usuario elige a mano: al abrir este cuadro se puede
 * mandar la copia a "Archivos" (y ahí elegir la carpeta que sea), a Drive, a
 * WhatsApp o al correo, sin permisos raros y sin que Android se queje.
 *
 * Se llama con el fichero YA escrito: si el usuario cierra el cuadro sin
 * elegir nada, la copia sigue guardada donde estaba. Nunca se pierde por
 * cancelar.
 *
 * @param {string} uri  file:// del fichero ya escrito
 */
export async function elegirCarpetaMovil({ uri, nombre }) {
  try {
    const { Share } = await import('@capacitor/share');
    const puede = await Share.canShare();
    if (!puede?.value) {
      return { ok: false, motivo: 'Este teléfono no permite elegir carpeta desde la aplicación. La copia está guardada donde indica la ruta de arriba.' };
    }
    await Share.share({
      title: nombre,
      text: `Copia de seguridad de Gestión Pro Total (${nombre})`,
      files: [uri],
      dialogTitle: 'Guardar la copia de seguridad en…',
    });
    return { ok: true };
  } catch (err) {
    // Cerrar el cuadro sin elegir no es un fallo que haya que enseñar.
    const m = String(err?.message || '');
    if (/cancel/i.test(m) || err?.name === 'AbortError') return { ok: false, motivo: null };
    return { ok: false, motivo: `No se pudo abrir el cuadro para elegir carpeta: ${m || 'error desconocido'}` };
  }
}

/**
 * Comparte el fichero de la copia con otra aplicación (Drive, WhatsApp, el
 * gestor de archivos...).
 *
 * Hace falta por dos motivos. El primero, que Android moderno restringe las
 * carpetas públicas y no siempre deja escribir donde uno quiere: compartir es
 * la forma segura de dejar la copia exactamente donde a uno le interese. El
 * segundo y más importante: una copia de seguridad que solo vive dentro del
 * teléfono se pierde con el teléfono. Sacarla fuera es media copia de
 * seguridad.
 *
 * @returns {Promise<{ok:boolean, motivo?:string}>}
 */
export async function compartirCopia({ nombre, contenido, win = globalThis.window }) {
  try {
    const nav = win?.navigator;
    if (!nav?.share) return { ok: false, motivo: 'Este dispositivo no permite compartir ficheros desde la aplicación.' };
    const fichero = new win.File([contenido], nombre, { type: 'application/json' });
    if (nav.canShare && !nav.canShare({ files: [fichero] })) {
      return { ok: false, motivo: 'Este dispositivo no deja compartir ficheros .json.' };
    }
    await nav.share({ files: [fichero], title: nombre });
    return { ok: true };
  } catch (err) {
    // Cancelar el menú de compartir no es un error que haya que enseñar.
    if (err?.name === 'AbortError') return { ok: false, motivo: null };
    return { ok: false, motivo: err?.message || 'No se pudo compartir el fichero.' };
  }
}

/** ¿Se puede compartir en este dispositivo? Para enseñar el botón o no. */
export function sePuedeCompartir(win = globalThis.window) {
  return typeof win?.navigator?.share === 'function' && typeof win?.File === 'function';
}

/** Nombre legible de un destino del móvil. */
export function nombreDestino(id) {
  return DESTINOS_MOVIL.find(d => d.id === id)?.nombre || id;
}

/** Copias ya guardadas (solo en escritorio, que es donde se pueden listar). */
export async function listarCopias(carpetaPC, win = globalThis.window) {
  if (detectarEntorno(win) !== 'escritorio') return null;
  const r = await win.gptCopias.carpeta(carpetaPC || undefined);
  return r?.ok ? r : null;
}

/** Abre la carpeta de copias en el explorador (solo escritorio). */
export async function abrirCarpetaCopias(carpetaPC, win = globalThis.window) {
  if (detectarEntorno(win) !== 'escritorio') return null;
  return win.gptCopias.abrirCarpeta(carpetaPC || undefined);
}
