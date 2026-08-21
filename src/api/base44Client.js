import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import {
  METODOS_QUE_GUARDAN, INTEGRACIONES_VIGILADAS, avisarDeFallo, sePuedeReintentarSolo,
} from '@/lib/avisoServidor';

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

function envolverEntidad(entidad, nombre) {
  if (!entidad) return entidad;
  const cache = {};
  return new Proxy(entidad, {
    get(destino, prop) {
      const valor = destino[prop];
      if (typeof valor !== 'function' || !METODOS_QUE_GUARDAN.includes(prop)) return valor;
      if (cache[prop]) return cache[prop];
      cache[prop] = async (...args) => {
        let ultimo;
        for (let intento = 0; intento <= ESPERA_REINTENTO.length; intento++) {
          try {
            return await valor.apply(destino, args);
          } catch (err) {
            ultimo = err;
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

const funcionesVigiladas = new Proxy(cliente.functions, {
  get(destino, prop) {
    if (prop !== 'invoke') return destino[prop];
    return (nombre, ...resto) => conAviso(() => destino.invoke(nombre, ...resto), nombre);
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
        // La ayuda con IA (InvokeLLM y compañía) se queda fuera a propósito:
        // cada pantalla ya explica a su manera cuando no puede responder, y
        // un cartel rojo encima sobraría.
        if (typeof fn !== 'function' || !INTEGRACIONES_VIGILADAS.includes(punto)) return fn;
        return (...args) => conAviso(() => fn(...args), punto);
      },
    });
  },
});

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
