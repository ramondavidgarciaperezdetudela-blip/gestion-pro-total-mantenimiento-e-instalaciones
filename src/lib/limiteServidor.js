/**
 * limiteServidor.js — Cuando el servidor dice «demasiadas peticiones».
 *
 * POR QUÉ EXISTE ESTO
 *
 * El programa entero ya reintentaba solo cuando el servidor contestaba 429
 * («vas demasiado rápido»): está en base44Client.js y funciona. Pero el motor
 * de copias, restauraciones y duplicados usa `base44.sinAvisos`, que es el
 * cliente EN CRUDO — se hizo así para que no salieran carteles rojos, uno por
 * lote, durante una restauración larga. El efecto secundario es que se quedó
 * fuera también del reintento: justo la parte del programa que más aprieta al
 * servidor (ocho secciones a la vez, seis páginas en paralelo cada una) era la
 * única sin ninguna protección.
 *
 * Y lo peor no era el aviso, era lo que pasaba después: una página que fallaba
 * se daba por «fin de los datos», así que la lectura salía a medias SIN DECIR
 * NADA. Una copia guardada así parece correcta y le faltan registros; y si esa
 * copia se restaura en modo «copia limpia» —que borra antes de escribir— se
 * pierde de verdad lo que faltaba.
 *
 * Aquí está lo que evita las dos cosas: esperar y repetir cuando el servidor
 * lo pide, y un freno compartido para que, cuando uno se topa con el límite,
 * los demás no sigan empujando.
 */

/** Esperas entre reintentos (ms). Suben rápido: el límite se levanta con tiempo.
 * Las dos últimas permiten esperar a que pase el minuto entero del cupo del
 * servidor (140/min) cuando la copia llega a pillar muchas secciones a la vez. */
export const ESPERAS = [700, 2000, 5000, 12000, 25000, 40000, 60000];

/**
 * ¿El servidor está diciendo «demasiadas peticiones» o «ahora no puedo»?
 *
 * Solo estos casos se reintentan solos. Un fallo de red NO entra: ahí no se
 * sabe si la petición llegó, y repetir un alta crearía un duplicado.
 */
export function esDemasiadasPeticiones(err) {
  const estado = err?.status ?? err?.response?.status ?? null;
  if (estado === 429 || estado === 502 || estado === 503 || estado === 504) return true;
  const texto = String(err?.message || err?.data?.detail || '');
  return /too many requests|rate.?limit|muchas solicitudes|429/i.test(texto);
}

/**
 * Un freno compartido por todo un trabajo.
 *
 * Hace DOS cosas:
 *
 * 1) RITMO PROACTIVO. El servidor admite 140 lecturas/min por usuario. Si se
 *    lanzan sincontrol, se vacía el cupo en unos segundos y llega el 429. El
 *    freno reparte las peticiones para que salgan como mucho una cada
 *    `interval` ms (500 ms = 120/min), por debajo del límite. Así no hace
 *    falta esperar a que el servidor nos pare: nunca llegamos ahí.
 *
 *    El "turno" se RESERVA antes de esperar, no después. Si se reservase al
 *    final, dos peticiones que entran a la vez leerían la misma marca, no
 *    esperarían ninguna y saldrían juntas: justo lo que satura. Reservando
 *    antes, cada una se queda con su hueco y salen desfazadas aunque haya
 *    varias en curso.
 *
 * 2) FRENO REACTIVO. Cuando aun así el servidor dice "demasiadas", el primer
 *    429 para a TODOS un rato y el trabajo sale adelante despacio pero entero.
 */
export function crearFreno(interval = 500) {
  let hasta = 0;        // freno reactivo (429)
  let veces = 0;
  let proxima = 0;      // marca del siguiente hueco libre (ritmo proactivo)
  return {
    /** Espera su hueco y el freno reactivo. Se llama antes de cada petición. */
    async turno() {
      if (interval > 0) {
        const ahora = Date.now();
        const slot = Math.max(proxima, ahora);
        proxima = slot + interval;     // reserva el hueco ANTES de esperar
        const espera = slot - ahora;
        if (espera > 0) await new Promise((r) => setTimeout(r, espera));
      }
      const falta = hasta - Date.now();
      if (falta > 0) await new Promise((r) => setTimeout(r, falta));
    },
    /** Pone el freno reactivo para todos durante `ms`. */
    frenar(ms) {
      veces++;
      hasta = Math.max(hasta, Date.now() + ms);
    },
    /** Cuántas veces ha hecho falta frenar (para poder contarlo al final). */
    get frenadas() { return veces; },
  };
}

/**
 * Un ÚNICO freno para TODA la pantalla de copias.
 *
 * El servidor admite 140 lecturas/min por usuario. Si los conteos de la
 * pantalla y la copia/restauración misma salen cada uno con su propio freno,
 * entre los dos se pasan del cupo y el servidor empieza a devolver 429 a todo:
 * fallan TODAS las secciones. Compartiendo este freno, conteos + copia +
 * restauración suman juntos por debajo del límite, porque salen en cola a un
 * ritmo solo.
 *
 * Se crea una vez y se reutiliza: el estado (hueco reactivo y ritmo proactivo)
 * vive en el módulo, así que aunque la pantalla se monte y desmonte el freno
 * no se reinicia a medias de un trabajo.
 */
let _frenoGlobal = null;
export function crearFrenoGlobal(interval = 500) {
  if (!_frenoGlobal) _frenoGlobal = crearFreno(interval);
  return _frenoGlobal;
}

/**
 * Hace algo y, si el servidor dice «demasiadas peticiones», espera y repite.
 *
 * Si se le pasa un freno, también para a los demás mientras tanto.
 *
 * @param {() => Promise<any>} hacer
 * @param {{freno?: ReturnType<typeof crearFreno>, esperas?: number[], alEsperar?: Function}} [opciones]
 */
export async function conReintento(hacer, opciones = {}) {
  const { freno, esperas = ESPERAS, alEsperar } = opciones;
  for (let intento = 0; ; intento++) {
    if (freno) await freno.turno();
    try {
      return await hacer();
    } catch (err) {
      if (!esDemasiadasPeticiones(err) || intento >= esperas.length) throw err;
      // Un poco de azar para que los que esperan no vuelvan todos en el mismo
      // milisegundo y se sature otra vez.
      const espera = esperas[intento] + Math.floor(Math.random() * 500);
      freno?.frenar(espera);
      alEsperar?.(espera, intento + 1);
      await new Promise((r) => setTimeout(r, espera));
    }
  }
}

/**
 * El error que se lanza cuando una lectura NO se ha podido completar.
 *
 * Se marca con `incompleta` para que quien lo reciba sepa que el problema no
 * es «no hay datos», sino «no se han podido leer todos» — que es exactamente
 * la diferencia entre guardar una copia buena y guardar una copia a medias.
 */
export function errorLecturaIncompleta(seccion, causa) {
  const err = new Error(
    `No se han podido leer todos los registros de «${seccion}»: el servidor ha cortado `
    + 'por exceso de peticiones. Se para aquí a propósito, porque seguir habría guardado '
    + 'una copia incompleta sin avisar. Espera un par de minutos y vuelve a intentarlo.',
  );
  err.incompleta = true;
  err.seccion = seccion;
  err.status = causa?.status ?? causa?.response?.status ?? null;
  err.causa = causa;
  return err;
}