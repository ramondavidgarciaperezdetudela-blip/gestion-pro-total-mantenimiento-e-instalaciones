import { createClient } from '@/nube/cliente';
import { appParams } from '@/lib/app-params';
import {
  METODOS_QUE_GUARDAN, INTEGRACIONES_VIGILADAS, avisarDeFallo, sePuedeReintentarSolo,
  camposNumericosVacios, conNumerosVaciosANulo,
} from '@/lib/avisoServidor';
import { iaActivada, gastaCreditos, errorIAApagada } from '@/lib/modoSinIA';
import {
  camposDeFotoDemasiadoGrandes, conFotosReducidas, tamanoFotoMayor, guardarLimiteAprendido,
} from '@/lib/saveErrorMessage';
import { leerLimiteAprendido } from '@/lib/compressImage';
import {
  ajustesIA, consultarIA, esAppMovil, buscarIADelOrdenador, llamarIADelOrdenador,
  llamarOpenRouter, recogerClaveCompartida,
  seAcabaronLasConsultas, reintentarSinLimite, errorSinConsultas,
} from '@/lib/proveedorIA';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

// Create a client with authentication required
// serverUrl explícita (no vacía): con '' las peticiones se hacen a rutas
// relativas, que solo resuelven bien cuando la app se sirve desde el propio
// dominio de Base44. En la app instalada (escritorio file://, APK
// https://localhost) una ruta relativa apunta al origen equivocado y toda
// petición al backend falla — se ve como "sin conexión" pese a haber
// internet real. Usar siempre la URL absoluta del backend lo arregla en
// todas las plataformas sin cambiar nada en la web servida por Base44.
const cliente = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: appBaseUrl,
  requiresAuth: false,
  appBaseUrl
});

// ── Ningún guardado puede fallar en silencio ───────────────────────────────
//
// Al darle a "Guardar" en una ficha, si el servidor rechazaba el cambio no
// pasaba nada de nada: ni se guardaba, ni se avisaba, ni se cerraba el
// formulario. El error se quedaba en la consola del navegador. Eso ocurría en
// 141 sitios distintos de la aplicación, porque cada pantalla tenía que
// acordarse de controlarlo por su cuenta.
//
// En vez de parchear 141 sitios (y olvidarse del siguiente que se escriba),
// se controla aquí, en el único punto por el que pasan todos: cada operación
// que guarda queda envuelta. Si falla, se avisa en pantalla Y se vuelve a
// lanzar el error, para que nada se comporte como si hubiera guardado.

const ESPERA_REINTENTO = [700, 2000, 5000];

/**
 * Rehace los argumentos con los campos numéricos vacíos puestos a "sin valor".
 *
 * Los datos son siempre el último argumento: create(datos), update(id, datos),
 * bulkCreate([datos...]), bulkUpdate([datos...]). Devuelve null si no había
 * nada que arreglar, para no reintentar por gusto.
 */
function arreglarNumeros(args, campos) {
  if (!campos?.length || !args.length) return null;
  const i = args.length - 1;
  const datos = args[i];
  if (!datos || typeof datos !== 'object') return null;

  const arreglado = Array.isArray(datos)
    ? datos.map((d) => conNumerosVaciosANulo(d, campos))
    : conNumerosVaciosANulo(datos, campos);

  const cambia = Array.isArray(datos)
    ? arreglado.some((d, k) => d !== datos[k])
    : arreglado !== datos;
  if (!cambia) return null;

  const salida = [...args];
  salida[i] = arreglado;
  return salida;
}

function envolverEntidad(entidad, nombre) {
  if (!entidad) return entidad;
  const cache = {};
  return new Proxy(entidad, {
    get(destino, prop) {
      const valor = destino[prop];
      if (typeof valor !== 'function' || !METODOS_QUE_GUARDAN.includes(prop)) return valor;
      if (cache[prop]) return cache[prop];
      cache[prop] = async (...args) => {
        let actuales = args;
        let arregladoYa = false;
        let fotosReducidasYa = 0;
        let limiteQueEntro = 0;
        let ultimo;
        for (let intento = 0; intento <= ESPERA_REINTENTO.length; intento++) {
          try {
            const salida = await valor.apply(destino, actuales);
            // Si hubo que reducir fotos, se recuerda el tamaño que el servidor
            // SÍ ha aceptado — no el que se probó y falló—, para que la próxima
            // vez entren a la primera.
            if (limiteQueEntro) guardarLimiteAprendido(limiteQueEntro);
            return salida;
          } catch (err) {
            ultimo = err;

            // Un campo numérico que no se ha tocado va como texto vacío y el
            // servidor rechaza el guardado entero. Él sí sabe cuáles son
            // números: se le hace caso, se mandan como "sin valor" y se
            // reintenta. Un rechazo así significa que NO ha guardado nada,
            // así que reintentar no puede duplicar.
            if (!arregladoYa) {
              const vacios = camposNumericosVacios(err);
              const corregidos = arreglarNumeros(actuales, vacios);
              if (corregidos) {
                arregladoYa = true;
                actuales = corregidos;
                intento--;                 // este intento no cuenta como reintento
                continue;
              }
            }

            // El servidor limita el tamaño de CADA foto por separado, y ese
            // tope no está documentado. Cuando rechaza una —"Field
            // 'photos_before[2]' exceeds the maximum allowed size"— la foto se
            // reduce y se reintenta, en vez de dar el error y perder el
            // trabajo. Esto estaba resuelto solo en el botón de guardar de las
            // órdenes de SAT; puesto aquí vale para TODAS las pantallas: las
            // fichas de mantenimiento, el diario de reparaciones, y también
            // para los guardados que no pasan por ese botón, como cambiar el
            // estado de una orden o firmarla — que era justo donde saltaba.
            if (fotosReducidasYa < 5) {
              const campos = camposDeFotoDemasiadoGrandes(err);
              if (campos.length) {
                const i = actuales.length - 1;
                const mayor = tamanoFotoMayor(...campos.map((c) => actuales[i]?.[c] || []));
                // Se baja de golpe a lo que se sabe que el servidor admite —el
                // tope aprendido, o 48 KB si aún no se sabe— en vez de ir
                // recortando de a poco: desde una foto de 2,5 MB, ir bajando un
                // 40% cada vez se queda sin intentos antes de llegar.
                const conocido = leerLimiteAprendido() || 48 * 1024;
                const limite = Math.max(
                  20 * 1024,
                  Math.min(Math.round((mayor || conocido) * 0.6), conocido),
                );
                const reducidos = await conFotosReducidas(actuales[i], campos, limite);
                if (reducidos) {
                  const copia = [...actuales];
                  copia[i] = reducidos;
                  actuales = copia;
                  fotosReducidasYa++;
                  limiteQueEntro = limite;
                  intento--;                 // este intento no cuenta como reintento
                  continue;
                }
              }
            }

            // Solo se reintenta solo cuando el servidor ha dicho "vas
            // demasiado rápido": ahí se sabe seguro que no ha guardado nada.
            // Con un fallo de red no se sabe, y repetir un alta crearía un
            // cliente duplicado.
            if (!sePuedeReintentarSolo(err) || intento === ESPERA_REINTENTO.length) break;
            await new Promise((r) => setTimeout(r, ESPERA_REINTENTO[intento]));
          }
        }
        avisarDeFallo({ entidad: nombre, metodo: prop, error: ultimo });
        throw ultimo;
      };
      return cache[prop];
    },
  });
}

const envueltas = {};
const entidadesVigiladas = new Proxy({}, {
  get(_destino, nombre) {
    if (typeof nombre !== 'string' || nombre === 'then' || nombre.startsWith('_')) return undefined;
    if (!envueltas[nombre]) envueltas[nombre] = envolverEntidad(cliente.entities[nombre], nombre);
    return envueltas[nombre];
  },
});

// Lo mismo para lo que no es una ficha: las funciones del servidor (enviar la
// copia firmada, descontar del almacén, avisar de una cita...) y las subidas
// de archivos. Si fallaban, quedaba a medias sin decir nada.
async function conAviso(llamar, funcion) {
  let ultimo;
  for (let intento = 0; intento <= ESPERA_REINTENTO.length; intento++) {
    try {
      return await llamar();
    } catch (err) {
      ultimo = err;
      if (!sePuedeReintentarSolo(err) || intento === ESPERA_REINTENTO.length) break;
      await new Promise((r) => setTimeout(r, ESPERA_REINTENTO[intento]));
    }
  }
  avisarDeFallo({ funcion, error: ultimo });
  throw ultimo;
}

/**
 * Reintenta igual que conAviso(), pero sin sacar el cartel rojo.
 *
 * Para lo que es de CORTESÍA: el correo con la copia firmada, por ejemplo. La
 * firma ya está guardada en la ficha; si el correo no sale, eso no es "no se
 * ha podido guardar", y anunciarlo con el mismo cartel que un guardado
 * fallido asusta y hace pensar que se ha perdido el documento. Quien llama
 * recibe el error y decide qué decir.
 */
async function sinCartel(llamar) {
  let ultimo;
  for (let intento = 0; intento <= ESPERA_REINTENTO.length; intento++) {
    try {
      return await llamar();
    } catch (err) {
      ultimo = err;
      if (!sePuedeReintentarSolo(err) || intento === ESPERA_REINTENTO.length) break;
      await new Promise((r) => setTimeout(r, ESPERA_REINTENTO[intento]));
    }
  }
  throw ultimo;
}

/** ¿El último argumento son opciones nuestras y no datos para el servidor? */
function opcionesDeLlamada(resto) {
  const ultimo = resto[resto.length - 1];
  if (ultimo && typeof ultimo === 'object' && 'sinAviso' in ultimo) {
    return { opciones: ultimo, args: resto.slice(0, -1) };
  }
  return { opciones: {}, args: resto };
}

const funcionesVigiladas = new Proxy(cliente.functions, {
  get(destino, prop) {
    if (prop !== 'invoke') return destino[prop];
    return (nombre, ...resto) => {
      const { opciones, args } = opcionesDeLlamada(resto);
      const llamar = () => destino.invoke(nombre, ...args);
      return opciones.sinAviso ? sinCartel(llamar) : conAviso(llamar, nombre);
    };
  },
});

const integracionesVigiladas = new Proxy({}, {
  get(_destino, paquete) {
    if (typeof paquete !== 'string' || paquete === 'then' || paquete.startsWith('_')) return undefined;
    const real = cliente.integrations[paquete];
    if (!real) return real;
    return new Proxy({}, {
      get(_d, punto) {
        if (typeof punto !== 'string' || punto === 'then' || punto.startsWith('_')) return undefined;
        const fn = real[punto];
        if (typeof fn !== 'function') return fn;

        // Lo que gasta créditos (InvokeLLM y compañía) no sale de aquí si la
        // ayuda con IA está apagada. Se corta ANTES de llamar al servidor, que
        // es la única forma de no gastar: comprobarlo en cada pantalla no
        // valdría, porque son 38 sitios distintos y el siguiente que se
        // escriba se olvidaría. Y se avisa en pantalla, para que quien pulse
        // el botón sepa por qué no pasa nada en vez de pensar que está roto.
        if (gastaCreditos(punto)) {
          return async (...args) => {
            if (!iaActivada()) {
              const err = errorIAApagada(punto);
              avisarDeFallo({ funcion: punto, error: err });
              throw err;
            }
            // Si se ha elegido una IA libre (Ollama en el propio ordenador, o
            // los modelos abiertos gratuitos de OpenRouter), la consulta va
            // ahí y NO al servidor de Base44: cero créditos. Se enchufa en
            // este punto y no en cada pantalla porque son 38 sitios distintos;
            // así ninguno se queda fuera ni hay que acordarse en el siguiente.
            const cfg = ajustesIA();
            if (punto === 'InvokeLLM' && cfg.proveedor !== 'base44') {
              try {
                // En el móvil y la tablet, Ollama no está en el aparato: está
                // en el ordenador. Se prueban las opciones por orden y se usa
                // la primera que funcione, para no dejar tirado a nadie según
                // dónde esté: en el taller, en casa o en la calle con datos.
                if (cfg.proveedor === 'ollama' && esAppMovil()) {
                  return await enElMovil(args[0] || {}, cfg, punto);
                }
                return await consultarIA(args[0] || {}, cfg);
              } catch (err) {
                // Los modelos gratuitos de internet tienen tope diario. Al
                // llegar al tope no se da la consulta por perdida: se busca un
                // Ollama a mano —en el ordenador, o el del ordenador por el
                // wifi— y se repite ahí, que no tiene límite ninguno. Si sale
                // bien, además queda puesto para las siguientes.
                if (seAcabaronLasConsultas(err)) {
                  let porQue = null;
                  try {
                    const r = await reintentarSinLimite(args[0] || {}, base44);
                    if (r.ok) return r.respuesta;
                    // Si no ha podido, al menos nos traemos el motivo para
                    // contárselo: "no lo encuentro" a secas no ayuda a nadie.
                    porQue = r.diagnostico || null;
                  } catch (e2) {
                    console.error('[base44Client] La IA sin límite tampoco ha podido:', e2);
                  }
                  const sinSalida = errorSinConsultas(porQue);
                  avisarDeFallo({ funcion: punto, error: sinSalida });
                  throw sinSalida;
                }
                avisarDeFallo({ funcion: punto, error: err });
                throw err;
              }
            }
            return fn(...args);
          };
        }

        if (!INTEGRACIONES_VIGILADAS.includes(punto)) return fn;
        return (...args) => conAviso(() => fn(...args), punto);
      },
    });
  },
});

/**
 * La IA en el móvil y la tablet, esté donde esté el aparato.
 *
 * 1. En el mismo wifi que el ordenador → la IA gratuita del ordenador.
 * 2. Con datos móviles o en otro wifi → la IA gratuita de internet, si hay
 *    clave (se pega una vez y vale para todos los aparatos).
 * 3. Si tampoco → se dice claramente qué pasa y qué se puede hacer, en vez de
 *    fallar sin más.
 */
async function enElMovil(peticion, cfg, punto) {
  const puente = await buscarIADelOrdenador(base44);
  if (puente) return llamarIADelOrdenador(peticion, puente);

  // Fuera del wifi del ordenador. ¿Hay clave gratuita de internet?
  let clave = cfg.openrouter_clave;
  if (!clave) clave = await recogerClaveCompartida(base44);
  if (clave) {
    return llamarOpenRouter(peticion, { ...ajustesIA(), openrouter_clave: clave });
  }

  const err = new Error(
    'Ahora mismo no estás en el wifi de tu ordenador, así que su IA gratuita no se alcanza. '
    + 'Para que también funcione con datos móviles o en otro wifi, pega una vez la clave gratuita '
    + 'de internet en Configuración → IA: se guarda para todos tus aparatos y no hay que repetirlo.',
  );
  err.status = null;
  avisarDeFallo({ funcion: punto, error: err });
  throw err;
}

export const base44 = new Proxy(cliente, {
  get(destino, prop) {
    if (prop === 'entities') return entidadesVigiladas;
    if (prop === 'functions') return funcionesVigiladas;
    if (prop === 'integrations') return integracionesVigiladas;
    // Para el motor de copias, que ya cuenta sus propios fallos y no quiere
    // un aviso por cada lote.
    if (prop === 'sinAvisos') return cliente;
    return destino[prop];
  },
});

// Para las pruebas automáticas y para quien quiera inspeccionar desde la consola.
if (typeof window !== "undefined") window.__gpt = { base44 };
