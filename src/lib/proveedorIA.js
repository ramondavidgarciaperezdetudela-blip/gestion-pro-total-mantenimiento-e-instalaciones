/**
 * proveedorIA.js — Con qué IA trabaja el programa.
 *
 * Hasta ahora la única opción era la IA de Base44, que gasta créditos de la
 * cuenta. Aquí se abre a modelos LIBRES y GRATUITOS, que es lo que se pidió:
 *
 *   • Ollama — se instala en el ordenador y va por dentro. Gratis del todo,
 *     sin cuentas, sin claves y sin límite de uso. Los modelos son de código
 *     abierto (Llama, Qwen, Mistral, Gemma…). Además funciona SIN INTERNET,
 *     que en una obra sin cobertura es la diferencia entre servir o no servir.
 *
 *   • OpenRouter — no hay que instalar nada y vale para el móvil y la tablet.
 *     Da acceso gratuito a esos mismos modelos abiertos (los que acaban en
 *     ":free"). Hace falta una clave gratuita suya, y tiene un tope de
 *     consultas por día.
 *
 *   • Base44 — la de siempre, la que gasta créditos.
 *
 * Todo esto se enchufa en el mismo sitio por el que ya pasaban las llamadas
 * (base44Client.js), así que las 38 pantallas con IA funcionan sin tocar ni
 * una línea de ellas.
 */

const CLAVE = 'gpt_proveedor_ia';

export const PROVEEDORES = [
  {
    id: 'ollama',
    nombre: 'Ollama (en tu ordenador)',
    libre: true,
    gratis: 'Gratis y sin límite. Funciona sin internet.',
    nota: 'Hay que instalarlo una vez en el ordenador. En el móvil y la tablet no llega.',
  },
  {
    id: 'openrouter',
    nombre: 'OpenRouter (modelos gratuitos)',
    libre: true,
    gratis: 'Gratis con tope diario. Modelos de código abierto.',
    nota: 'No hay que instalar nada y vale para el móvil. Necesita una clave gratuita.',
  },
  {
    id: 'base44',
    nombre: 'La IA de Base44',
    libre: false,
    gratis: 'Gasta créditos de tu cuenta.',
    nota: 'Es la única que puede buscar en internet al responder.',
  },
];

export const MODELOS_OLLAMA = [
  { id: 'llama3.2', nombre: 'Llama 3.2 (3B) — rápido, ~2 GB' },
  { id: 'qwen2.5:7b', nombre: 'Qwen 2.5 (7B) — equilibrado, ~4,7 GB' },
  { id: 'mistral', nombre: 'Mistral 7B — ~4,1 GB' },
  { id: 'gemma2', nombre: 'Gemma 2 (9B) — ~5,4 GB' },
];

// Lista de respaldo, SOLO para cuando no se puede preguntar a OpenRouter (sin
// internet, por ejemplo). La buena es la que se pide en vivo con
// modelosGratisOpenRouter(): OpenRouter retira modelos gratuitos cada pocos
// meses, y cualquier lista escrita a mano aquí se queda vieja y acaba dando
// «404 · ese modelo ya no está disponible» en mitad del trabajo.
export const MODELOS_OPENROUTER = [
  { id: 'meta-llama/llama-3.3-70b-instruct:free', nombre: 'Llama 3.3 70B (gratis)' },
  { id: 'deepseek/deepseek-chat-v3-0324:free', nombre: 'DeepSeek V3 (gratis)' },
  { id: 'qwen/qwen-2.5-72b-instruct:free', nombre: 'Qwen 2.5 72B (gratis)' },
  { id: 'mistralai/mistral-7b-instruct:free', nombre: 'Mistral 7B (gratis)' },
  { id: 'google/gemma-2-9b-it:free', nombre: 'Gemma 2 9B (gratis)' },
];

/** Dónde se pregunta qué modelos hay ahora mismo. */
export const URL_MODELOS_OPENROUTER = 'https://openrouter.ai/api/v1/models';

export const POR_DEFECTO = {
  proveedor: 'ollama',
  ollama_url: 'http://localhost:11434',
  ollama_modelo: 'llama3.2',
  openrouter_clave: '',
  openrouter_modelo: 'meta-llama/llama-3.3-70b-instruct:free',
};

const oyentes = new Set();

export function ajustesIA() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE) || '{}');
    return { ...POR_DEFECTO, ...guardado };
  } catch {
    return { ...POR_DEFECTO };
  }
}

export function guardarAjustesIA(cambios) {
  const nuevo = { ...ajustesIA(), ...cambios };
  try { localStorage.setItem(CLAVE, JSON.stringify(nuevo)); } catch { /* sin sitio */ }
  oyentes.forEach((fn) => fn(nuevo));
  return nuevo;
}

export function escucharAjustesIA(fn) {
  oyentes.add(fn);
  fn(ajustesIA());
  return () => oyentes.delete(fn);
}

/** ¿El proveedor elegido es libre y gratuito? */
export function esProveedorLibre(id = ajustesIA().proveedor) {
  return (PROVEEDORES.find((p) => p.id === id) || {}).libre === true;
}

// ── Cómo se pide y cómo se lee ──────────────────────────────────────────────

/**
 * Saca el JSON de una respuesta que puede venir envuelta en texto o en un
 * bloque de código. Los modelos abiertos no siempre obedecen "responde solo
 * JSON": muchas veces contestan "Claro, aquí tienes: ```json {...} ```".
 */
export function jsonDeRespuesta(texto) {
  if (texto && typeof texto === 'object') return texto;
  const t = String(texto ?? '');
  const enBloque = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidatos = [];
  if (enBloque) candidatos.push(enBloque[1]);
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a !== -1 && b > a) candidatos.push(t.slice(a, b + 1));
  const ca = t.indexOf('[');
  const cb = t.lastIndexOf(']');
  if (ca !== -1 && cb > ca) candidatos.push(t.slice(ca, cb + 1));
  for (const c of candidatos) {
    try { return JSON.parse(c.trim()); } catch { /* siguiente */ }
  }
  return null;
}

/** El texto que se le manda al modelo, con el formato pedido si lo hay. */
export function prepararPeticion({ prompt, response_json_schema }) {
  if (!response_json_schema) return { texto: String(prompt ?? ''), pideJson: false };
  return {
    texto: `${prompt}\n\nResponde ÚNICAMENTE con un JSON válido que siga este esquema, sin ningún texto antes ni después:\n${JSON.stringify(response_json_schema)}`,
    pideJson: true,
  };
}

/**
 * ¿Hay un puente del programa de escritorio para hablar con Ollama?
 *
 * Hace falta porque la app instalada se abre como fichero local, y desde ahí
 * el navegador bloquea las llamadas a Ollama por seguridad (CORS). Yendo por
 * el proceso principal de Electron no hay ese problema y funciona sin tener
 * que configurar nada a mano.
 */
export function hayPuenteEscritorio() {
  return typeof window !== 'undefined' && window.gptIA?.disponible === true;
}

async function pedir(url, opciones, tiempoMaximo) {
  if (hayPuenteEscritorio()) {
    const r = await window.gptIA.fetch({ url, ...opciones, tiempoMaximo });
    if (!r?.ok) {
      const err = new Error(
        r?.status
          ? motivoHttp(r.status, r.error, url)
          : (url.includes('openrouter')
            ? 'No se ha podido llegar a OpenRouter. Comprueba que hay internet y que la clave está bien pegada.'
            : `No responde Ollama en ${url.replace(/\/api\/.*$/, '')}. Comprueba que está instalado y abierto en el ordenador.`),
      );
      err.status = r?.status ?? null;
      err.causa = r?.error;
      throw err;
    }
    return r.cuerpo;
  }
  // En el móvil, la petición NATIVA. El fetch del navegador de la APK no vale:
  // Android bloquea las llamadas en claro a la red local y, encima, Ollama
  // rechaza el origen. Esto estaba escrito más abajo pero solo lo usaba el
  // puente del ordenador; aquí no se usaba, y por eso en el móvil no ha
  // funcionado nunca hablar con Ollama directamente.
  if (esMovil()) {
    try {
      return await pedirNativo(url, opciones);
    } catch (e) {
      const err = new Error(
        url.includes('openrouter')
          ? 'No se ha podido llegar a OpenRouter desde el móvil. Comprueba que hay internet.'
          : `No responde Ollama en ${url.replace(/\/api\/.*$/, '')}. En el móvil, Ollama corre en el ordenador: `
            + 'enciende allí «Compartir la IA por wifi» y comprueba que los dos están en la misma red.',
      );
      err.status = e?.status ?? null;
      err.causa = String(e?.message || e);
      throw err;
    }
  }

  let resp;
  try {
    resp = await fetch(url, opciones);
  } catch (e) {
    // "Failed to fetch" a secas no le dice nada a nadie. Aquí se cuenta lo que
    // hay que hacer, que es lo que falta cuando esto pasa.
    const err = new Error(
      url.includes('openrouter')
        ? 'No se ha podido llegar a OpenRouter. Comprueba que hay internet y que la clave está bien pegada.'
        : `No responde Ollama en ${url.replace(/\/api\/.*$/, '')}. Comprueba que está instalado y abierto en el ordenador (se ve un icono junto al reloj). Si acabas de instalarlo, reinicia el programa.`,
    );
    err.status = null;
    err.causa = String(e?.message || e);
    throw err;
  }
  const texto = await resp.text();
  if (!resp.ok) {
    const err = new Error(motivoHttp(resp.status, texto, url));
    err.status = resp.status;
    throw err;
  }
  return texto;
}

/** Qué significa cada respuesta del servidor de la IA, en cristiano. */
export function motivoHttp(estado, texto, url = '') {
  const esOpenRouter = url.includes('openrouter');
  if (estado === 401 || estado === 403) {
    return esOpenRouter
      ? 'OpenRouter no acepta la clave. Vuelve a copiarla desde openrouter.ai (empieza por sk-or-).'
      : 'La IA no ha aceptado la petición.';
  }
  if (estado === 404) {
    return esOpenRouter
      ? 'Ningún modelo gratuito de OpenRouter ha contestado. Se han probado varios y todos han fallado: comprueba que hay internet y que la clave está bien, o usa la IA del ordenador (Ollama), que no depende de ellos.'
      : 'Ollama no encuentra ese modelo. Descárgalo con: ollama pull <modelo>';
  }
  if (estado === 402) {
    return esOpenRouter
      ? 'OpenRouter pide saldo para ese modelo. Los gratuitos tienen un tope diario; espera unas horas o usa Ollama en el ordenador, que no tiene tope.'
      : 'La IA pide un pago para esa consulta.';
  }
  if (estado === 429) {
    return esOpenRouter
      ? 'Has llegado al tope gratuito de OpenRouter por hoy. Espera un rato o usa Ollama en el ordenador, que no tiene tope.'
      : 'Demasiadas consultas seguidas. Espera unos segundos.';
  }
  if (estado >= 500) return 'El servidor de la IA ha dado un error. Vuelve a intentarlo.';
  return String(texto || '').slice(0, 300) || `El servidor respondió ${estado}.`;
}

/** Consulta a Ollama, en el propio ordenador. */
export async function llamarOllama({ prompt, response_json_schema }, cfg = ajustesIA()) {
  const { texto, pideJson } = prepararPeticion({ prompt, response_json_schema });
  const cuerpo = await pedir(`${cfg.ollama_url.replace(/\/$/, '')}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: cfg.ollama_modelo,
      messages: [{ role: 'user', content: texto }],
      stream: false,
      ...(pideJson ? { format: 'json' } : {}),
    }),
  });
  const datos = typeof cuerpo === 'string' ? JSON.parse(cuerpo) : cuerpo;
  const salida = datos?.message?.content ?? '';
  return pideJson ? (jsonDeRespuesta(salida) ?? salida) : salida;
}

// ── Los modelos gratuitos de OpenRouter cambian solos ───────────────────────
//
// OpenRouter retira y renombra los modelos «:free» cada pocos meses. Con la
// lista escrita a mano dentro del programa, el día que retiran el que estaba
// puesto la consulta contesta 404 y el trabajo se para hasta que alguien entra
// en Configuración y elige otro a mano — que es exactamente lo que se pidió
// que NO hiciera falta. Así que la lista se pide en vivo y, si el modelo
// guardado ya no está, el programa se busca otro y sigue sin decir nada.

// Orden de preferencia cuando hay que elegir solo. A igualdad, gana el de más
// contexto, que es el que aguanta las fichas técnicas largas.
const PREFERIDOS_OPENROUTER = [
  /llama-3\.3/i, /deepseek/i, /qwen/i, /mistral/i, /gemma/i, /llama-3/i, /phi/i,
];

function puntosDeModelo(id) {
  const i = PREFERIDOS_OPENROUTER.findIndex((r) => r.test(id));
  return i === -1 ? 0 : PREFERIDOS_OPENROUTER.length - i;
}

function esGratisEnOpenRouter(m) {
  if (String(m?.id || '').endsWith(':free')) return true;
  const p = m?.pricing || {};
  const cero = (v) => v === undefined || v === null || v === '' || Number(v) === 0;
  return cero(p.prompt) && cero(p.completion);
}

/**
 * La lista VIVA de modelos gratuitos de OpenRouter, ya ordenada por cuál
 * conviene más. Se pregunta a OpenRouter, así que está al día siempre sin
 * tener que tocar ni publicar el programa.
 */
export async function modelosGratisOpenRouter(cfg = ajustesIA()) {
  const cuerpo = await pedir(URL_MODELOS_OPENROUTER, {
    method: 'GET',
    headers: cfg.openrouter_clave ? { Authorization: `Bearer ${cfg.openrouter_clave}` } : {},
  }, 20000);
  const datos = typeof cuerpo === 'string' ? JSON.parse(cuerpo) : cuerpo;
  return (datos?.data || [])
    .filter(esGratisEnOpenRouter)
    .map((m) => ({
      id: m.id,
      nombre: `${m.name || m.id}${/gratis|free/i.test(m.name || '') ? '' : ' (gratis)'}`,
      contexto: Number(m.context_length) || 0,
    }))
    .sort((a, b) => puntosDeModelo(b.id) - puntosDeModelo(a.id) || b.contexto - a.contexto);
}

/** ¿El fallo es «ese modelo ya no existe» y no otra cosa? */
export function esModeloRetirado(err) {
  const estado = err?.status ?? null;
  if (estado === 404) return true;
  return estado === 400 && /model|modelo/i.test(String(err?.message || ''));
}

/** Una sola llamada, con el modelo que se le diga. */
async function unaLlamadaOpenRouter({ prompt, response_json_schema }, cfg, modelo) {
  const { texto, pideJson } = prepararPeticion({ prompt, response_json_schema });
  const cuerpo = await pedir('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.openrouter_clave}`,
    },
    body: JSON.stringify({
      model: modelo,
      messages: [{ role: 'user', content: texto }],
      ...(pideJson ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  const datos = typeof cuerpo === 'string' ? JSON.parse(cuerpo) : cuerpo;
  // OpenRouter a veces contesta 200 con el error dentro. Si no se mira aquí,
  // llega vacío a la pantalla y parece que la IA «no ha dicho nada».
  if (datos?.error) {
    const err = new Error(String(datos.error.message || datos.error));
    err.status = Number(datos.error.code) || 404;
    throw err;
  }
  const salida = datos?.choices?.[0]?.message?.content ?? '';
  return pideJson ? (jsonDeRespuesta(salida) ?? salida) : salida;
}

/**
 * Consulta a OpenRouter, con los modelos abiertos gratuitos.
 *
 * Si el modelo guardado ya no existe, prueba con otros de la lista viva hasta
 * cuatro veces y deja apuntado el que ha funcionado. Quien lo usa no se entera
 * de nada: la consulta simplemente sale.
 */
export async function llamarOpenRouter(peticion, cfg = ajustesIA()) {
  if (!cfg.openrouter_clave) {
    const err = new Error('Falta la clave gratuita de OpenRouter. Pégala en Configuración → IA.');
    err.status = null;
    throw err;
  }

  const probados = new Set();
  let candidatos = null;
  let modelo = cfg.openrouter_modelo || POR_DEFECTO.openrouter_modelo;
  let ultimoFallo = null;

  for (let vuelta = 0; vuelta < 4 && modelo; vuelta += 1) {
    probados.add(modelo);
    try {
      const salida = await unaLlamadaOpenRouter(peticion, cfg, modelo);
      if (modelo !== cfg.openrouter_modelo) guardarAjustesIA({ openrouter_modelo: modelo });
      return salida;
    } catch (e) {
      if (!esModeloRetirado(e)) throw e;
      ultimoFallo = e;
      if (!candidatos) {
        const vivos = await modelosGratisOpenRouter(cfg).catch(() => []);
        candidatos = vivos.length
          ? vivos.map((m) => m.id)
          : MODELOS_OPENROUTER.map((m) => m.id);
      }
      modelo = candidatos.find((id) => !probados.has(id)) || null;
    }
  }

  throw ultimoFallo || new Error('Ningún modelo gratuito de OpenRouter ha contestado.');
}

/** Los modelos que ya están descargados en el Ollama del ordenador. */
export async function modelosInstalados(cfg = ajustesIA()) {
  const cuerpo = await pedir(`${cfg.ollama_url.replace(/\/$/, '')}/api/tags`, { method: 'GET' });
  const datos = typeof cuerpo === 'string' ? JSON.parse(cuerpo) : cuerpo;
  return (datos?.models || []).map((m) => m.name);
}

// ── Cuando OpenRouter dice que no quedan consultas ─────────────────────────
//
// Los modelos gratuitos de OpenRouter tienen tope diario. Al llegar al tope se
// acabó la ayuda con IA hasta el día siguiente, y eso en mitad de un trabajo
// no vale. Ollama, en cambio, corre en el propio ordenador: no tiene tope, no
// tiene cuenta y funciona sin internet.
//
// Así que al toparse con el límite no se da la consulta por perdida: se mira
// si hay un Ollama a mano —en el ordenador, o el del ordenador por el wifi si
// estamos en el móvil— y se repite ahí. Y si funciona, se deja puesto para
// que la siguiente vez vaya directa y no se vuelva a gastar el intento.

/** ¿El servidor está diciendo "hasta aquí por hoy"? */
export function seAcabaronLasConsultas(err) {
  const estado = err?.status ?? err?.response?.status ?? null;
  if (estado === 429 || estado === 402) return true;
  return /tope|rate.?limit|quota|too many requests|insufficient|credits?/i
    .test(String(err?.message || ''));
}

/**
 * ¿Estamos dentro de la aplicación del móvil (APK)?
 *
 * Importa porque ahí no vale el fetch del navegador: Android bloquea las
 * llamadas en claro a la red local y, además, Ollama rechaza el origen. La
 * petición nativa de Capacitor se salta las dos cosas.
 */
export function esMovil() {
  return typeof window !== 'undefined'
    && Boolean(window.Capacitor?.isNativePlatform?.());
}

/**
 * Averigua QUÉ le pasa a Ollama, no solo si va o no.
 *
 * Esto es lo que faltaba. Antes, si no se encontraba Ollama, se devolvía null
 * y punto: ni el usuario ni yo podíamos saber si es que no estaba arrancado,
 * si estaba en otro puerto, o si estaba funcionando perfectamente pero
 * rechazando al programa. Son tres problemas distintos con tres soluciones
 * distintas, y sin distinguirlos no se arregla ninguno.
 *
 * El truco para distinguir "no hay nada escuchando" de "hay algo pero me
 * rechaza": se repite la petición con mode:'no-cors'. Si esa SÍ responde
 * (aunque venga vacía), es que el servidor está ahí y lo que falla es el
 * permiso de origen. Si tampoco responde, no hay nadie al otro lado.
 *
 * @returns {Promise<{estado:string, titulo:string, detalle:string, arreglo?:string, url?:string, modelos?:string[]}>}
 */
export async function diagnosticarOllama(cfg = ajustesIA()) {
  const base = String(cfg.ollama_url || 'http://localhost:11434').replace(/\/$/, '');
  const url = `${base}/api/tags`;

  // 1. El camino normal (puente del escritorio, nativo en el móvil o fetch).
  try {
    const cuerpo = await conTiempo(modelosInstalados(cfg), 6000);
    if (cuerpo.length === 0) {
      return {
        estado: 'sin_modelos',
        url: base,
        modelos: [],
        titulo: 'Ollama está funcionando, pero no tiene ningún modelo descargado.',
        detalle: 'El motor está ahí; le falta el cerebro.',
        arreglo: 'Dale al botón de descargar el modelo, o escribe en una consola: ollama pull llama3.2',
      };
    }
    return {
      estado: 'ok',
      url: base,
      modelos: cuerpo,
      titulo: `Ollama funcionando con ${cuerpo.length} ${cuerpo.length === 1 ? 'modelo' : 'modelos'}.`,
      detalle: cuerpo.join(', '),
    };
  } catch (e) {
    var fallo = e;
  }

  // 2. ¿Hay algo escuchando en ese puerto, aunque nos rechace?
  //    Solo se puede comprobar así en el navegador; con el puente del
  //    escritorio o en el móvil no hay CORS que valga.
  const porNavegador = !hayPuenteEscritorio() && !esMovil() && typeof fetch === 'function';
  if (porNavegador) {
    let respondeAlgo = false;
    try {
      await conTiempo(fetch(url, { mode: 'no-cors' }), 4000);
      respondeAlgo = true;
    } catch { /* no hay nadie */ }

    if (respondeAlgo) {
      return {
        estado: 'bloqueado',
        url: base,
        titulo: 'Ollama SÍ está funcionando, pero no deja que el programa le hable.',
        detalle: 'Ollama solo atiende a las páginas que tiene permitidas, y esta aplicación no está en esa lista. '
          + 'No es que no lo encuentre: lo encuentra y le cierra la puerta.',
        arreglo: 'Hay que darle permiso una sola vez, poniendo la variable OLLAMA_ORIGINS=* y reiniciando Ollama.\n\n'
          + 'En Windows, en una ventana de comandos:\n'
          + '    setx OLLAMA_ORIGINS "*"\n'
          + '  y luego cierra Ollama del todo (icono junto al reloj → Quit) y vuelve a abrirlo.\n\n'
          + 'En Mac o Linux:\n'
          + '    launchctl setenv OLLAMA_ORIGINS "*"   (Mac)\n'
          + '    export OLLAMA_ORIGINS="*"             (Linux, antes de arrancar ollama serve)\n\n'
          + 'Otra salida, si no quieres tocar nada: usa el programa instalado en el ordenador '
          + '(la versión de escritorio) en vez de la del navegador. Ahí no hace falta permiso ninguno.',
      };
    }
  }

  // 3. No hay nadie escuchando.
  const puerto = base.match(/:(\d+)/)?.[1] || '11434';
  return {
    estado: 'apagado',
    url: base,
    titulo: `No hay nada escuchando en ${base}.`,
    detalle: fallo?.causa || fallo?.message || 'No responde.',
    arreglo: esMovil()
      ? 'En el móvil, Ollama no corre aquí: corre en el ordenador. Enciende en el ordenador «Compartir la IA por wifi» '
        + '(Configuración → Qué IA usar) y asegúrate de que móvil y ordenador están en la misma red.'
      : `Comprueba que Ollama está abierto (en Windows y Mac se ve un icono junto al reloj). Si lo tienes en otro `
        + `puerto distinto del ${puerto}, cámbialo aquí abajo. Si acabas de instalarlo, ciérralo y ábrelo otra vez.`,
  };
}

/**
 * Busca Ollama en las direcciones de siempre, no solo en la configurada.
 *
 * Mucha gente lo tiene en 127.0.0.1 y no en localhost, o al revés, y en algún
 * equipo con IPv6 «localhost» resuelve a ::1 y no contesta. Probar las tres
 * cuesta un segundo y evita un «no lo encuentro» que no era verdad.
 */
export const DIRECCIONES_HABITUALES = [
  'http://127.0.0.1:11434',
  'http://localhost:11434',
  'http://[::1]:11434',
];

export async function buscarOllamaPorAhi(cfg = ajustesIA()) {
  const suya = String(cfg.ollama_url || '').replace(/\/$/, '');
  const candidatas = [suya, ...DIRECCIONES_HABITUALES].filter((u, i, a) => u && a.indexOf(u) === i);
  let mejor = null;
  for (const url of candidatas) {
    const r = await diagnosticarOllama({ ...cfg, ollama_url: url });
    if (r.estado === 'ok') {
      if (url !== suya) guardarAjustesIA({ ollama_url: url });
      return r;
    }
    // Un "bloqueado" o un "sin modelos" dicen más que un "apagado".
    if (!mejor || (mejor.estado === 'apagado' && r.estado !== 'apagado')) mejor = r;
  }
  return mejor;
}

/** ¿Hay un Ollama utilizable desde este aparato, ahora mismo? */
export async function hayOllamaAMano(cfg = ajustesIA()) {
  try {
    const modelos = await conTiempo(modelosInstalados(cfg), 3500);
    if (modelos.length) return { donde: 'aqui', modelo: elegirModelo(modelos, cfg.ollama_modelo) };
  } catch { /* no está en este aparato */ }
  return null;
}

/**
 * Deja la IA gratuita puesta SIN preguntar nada, si ya está lista.
 *
 * Se llama al arrancar. No descarga nada ni abre ventanas: si Ollama está
 * funcionando con algún modelo, lo elige y punto. Quien lo tenga instalado no
 * tiene que entrar en ninguna pantalla de configuración, que es justo lo que
 * se pidió.
 *
 * @returns {Promise<{puesto: boolean, modelo?: string}>}
 */
export async function autoConfigurarIALibre() {
  const cfg = ajustesIA();
  if (cfg.proveedor === 'ollama' && cfg.ollama_modelo) {
    // Ya está elegido: solo se comprueba que el modelo guardado siga estando.
    const hay = await hayOllamaAMano(cfg);
    if (hay && hay.modelo !== cfg.ollama_modelo) {
      guardarAjustesIA({ ollama_modelo: hay.modelo });
      return { puesto: true, modelo: hay.modelo };
    }
    return { puesto: !!hay, modelo: cfg.ollama_modelo };
  }
  // Se prueban también 127.0.0.1 y ::1, no solo la dirección guardada: en
  // algún equipo «localhost» resuelve a IPv6 y ahí Ollama no contesta.
  const r = await buscarOllamaPorAhi(cfg);
  if (r?.estado !== 'ok') return { puesto: false, diagnostico: r };
  const modelo = elegirModelo(r.modelos, cfg.ollama_modelo);
  guardarAjustesIA({ proveedor: 'ollama', ollama_modelo: modelo });
  return { puesto: true, modelo };
}

/**
 * Vuelve a mirar cada poco si ha aparecido un Ollama.
 *
 * Hace falta porque la comprobación del arranque se hacía UNA vez y ya está.
 * Y lo normal es abrir el programa y que Ollama tarde un poco en levantarse, o
 * arrancarlo después de ver el aviso de que no quedan consultas. En esos casos
 * el programa se quedaba en OpenRouter para siempre aunque Ollama estuviera
 * ahí desde hacía media hora.
 *
 * Se para en cuanto lo encuentra: no tiene sentido seguir mirando.
 */
export function vigilarOllama({ cada = 60000, veces = 30 } = {}) {
  let intentos = 0;
  let parado = false;
  const reloj = setInterval(async () => {
    if (parado) return;
    intentos += 1;
    if (intentos > veces) { clearInterval(reloj); return; }
    if (ajustesIA().proveedor === 'ollama' && ajustesIA().ollama_modelo) { clearInterval(reloj); return; }
    try {
      const r = await autoConfigurarIALibre();
      if (r.puesto) { clearInterval(reloj); }
    } catch { /* se reintenta en la siguiente vuelta */ }
  }, cada);
  return () => { parado = true; clearInterval(reloj); };
}

/**
 * Repite la consulta en un Ollama sin límite, si se puede.
 *
 * @returns {Promise<{ok: boolean, respuesta?: any, motivo?: string}>}
 */
export async function reintentarSinLimite(peticion, base44) {
  const cfg = ajustesIA();

  // 1. ¿Ollama en este mismo aparato? (ordenador)
  const aqui = await hayOllamaAMano(cfg);
  if (aqui) {
    const usando = { ...cfg, proveedor: 'ollama', ollama_modelo: aqui.modelo };
    const respuesta = await llamarOllama(peticion, usando);
    guardarAjustesIA({ proveedor: 'ollama', ollama_modelo: aqui.modelo });
    return { ok: true, respuesta, donde: 'este ordenador' };
  }

  // 2. ¿El Ollama del ordenador, por el wifi? (móvil y tablet)
  if (base44) {
    try {
      const puente = await buscarIADelOrdenador(base44);
      if (puente) {
        const respuesta = await llamarIADelOrdenador(peticion, puente);
        return { ok: true, respuesta, donde: `tu ordenador (${puente.ip})` };
      }
    } catch { /* no se llega */ }
  }

  // Si no hay salida, al menos que se sepa POR QUÉ.
  let diagnostico = null;
  try { diagnostico = await diagnosticarOllama(cfg); } catch { /* ni eso */ }
  return { ok: false, motivo: 'sin_ollama', diagnostico };
}

/** El aviso de que se acabaron las consultas gratis, con la salida. */
export function errorSinConsultas(diagnostico = null) {
  // Antes esto decía siempre lo mismo: "no he encontrado ninguna IA sin límite
  // a mano" y a instalar Ollama. A quien YA lo tiene instalado eso le suena a
  // tomadura de pelo, y encima no le dice qué mirar. Ahora, si sabemos qué le
  // pasa a su Ollama, se lo decimos.
  const cola = diagnostico && diagnostico.estado !== 'ok'
    ? `\n\n${diagnostico.titulo}\n${diagnostico.arreglo || diagnostico.detalle || ''}`
    : '\n\nSi ya tienes Ollama instalado, entra en Configuración → Qué IA usar y dale a '
      + '«Buscar Ollama ahora»: te dirá exactamente qué le pasa.';

  const err = new Error(
    'OpenRouter no acepta más consultas gratuitas por hoy. La solución definitiva es Ollama '
    + 'en el ordenador: es gratis, no tiene tope, no pide cuenta y funciona sin internet.'
    + cola,
  );
  err.status = 429;
  err.sinConsultas = true;
  err.diagnostico = diagnostico;
  return err;
}

/** Manda la consulta al proveedor elegido. */
export async function consultarIA(peticion, cfg = ajustesIA()) {
  if (cfg.proveedor === 'ollama') return llamarOllama(peticion, cfg);
  if (cfg.proveedor === 'openrouter') return llamarOpenRouter(peticion, cfg);
  throw new Error('Ese proveedor no se atiende aquí.');
}

// ── Que no haya que configurar nada ─────────────────────────────────────────
//
// Pedir que alguien elija proveedor, modelo y dirección es pedirle que sepa de
// esto. Aquí el programa se busca la vida solo: mira si hay una IA gratuita
// funcionando en el ordenador, y si la hay la usa. Y si no hay ningún modelo
// descargado, se lo descarga él, sin ventanas negras ni comandos.

/** Espera corta: si Ollama no está, no tiene sentido dejar la pantalla colgada. */
const PRONTO = 4000;

async function conTiempo(promesa, ms = PRONTO) {
  let corta;
  const reloj = new Promise((_, rechazar) => {
    corta = setTimeout(() => rechazar(new Error('Ha tardado demasiado en contestar.')), ms);
  });
  try {
    return await Promise.race([promesa, reloj]);
  } finally {
    clearTimeout(corta);
  }
}

/**
 * ¿Hay una IA gratuita lista en este aparato?
 * Devuelve { lista, modelos, motivo }.
 */
export async function mirarSiHayIALibre(cfg = ajustesIA()) {
  try {
    const modelos = await conTiempo(modelosInstalados(cfg));
    return { lista: modelos.length > 0, modelos, motivo: modelos.length ? '' : 'sin_modelo' };
  } catch (e) {
    return { lista: false, modelos: [], motivo: 'sin_ollama', detalle: String(e?.message || e) };
  }
}

/**
 * Deja la IA gratuita lista para usar, sola.
 *
 * 1) Si Ollama está y ya tiene un modelo, lo elige y listo.
 * 2) Si está pero está vacío, se descarga el modelo pequeño (unos 2 GB).
 * 3) Si no está, lo dice para poder ofrecer el botón de instalarlo.
 *
 * @param {(paso: {estado: string, texto: string}) => void} avisar
 */
export async function prepararIALibre(avisar = () => {}) {
  const cfg = ajustesIA();
  avisar({ estado: 'mirando', texto: 'Mirando si ya tienes la IA gratuita en el ordenador…' });
  const hay = await mirarSiHayIALibre(cfg);

  if (hay.lista) {
    // Se usa el que ya esté descargado: no hay por qué bajar otro de 2 GB.
    const elegido = elegirModelo(hay.modelos, cfg.ollama_modelo);
    guardarAjustesIA({ proveedor: 'ollama', ollama_modelo: elegido });
    avisar({ estado: 'listo', texto: `Listo. La IA gratuita ya funciona con «${elegido}». No hay nada más que hacer.` });
    return { listo: true, modelo: elegido };
  }

  if (hay.motivo === 'sin_modelo') {
    avisar({
      estado: 'descargando',
      texto: `Descargando la IA (${cfg.ollama_modelo}, unos 2 GB). Puede tardar unos minutos; puedes seguir trabajando mientras.`,
    });
    await descargarModelo(cfg.ollama_modelo, cfg);
    guardarAjustesIA({ proveedor: 'ollama' });
    avisar({ estado: 'listo', texto: 'Listo. La IA gratuita ya funciona, y no gasta créditos.' });
    return { listo: true, modelo: cfg.ollama_modelo };
  }

  avisar({ estado: 'falta_ollama', texto: 'Falta instalar el motor de la IA gratuita. Es una instalación normal, de las de «Siguiente, siguiente».' });
  return { listo: false, motivo: 'sin_ollama' };
}

/** De los modelos que hay, el que ya estaba puesto o el primero. */
export function elegirModelo(instalados, preferido) {
  if (!instalados?.length) return preferido;
  const exacto = instalados.find((m) => m === preferido || m.startsWith(`${preferido}:`));
  return exacto || instalados[0];
}

/**
 * Le pide a Ollama que se descargue un modelo.
 *
 * Se hace por aquí y no con «ollama pull» en una ventana negra porque quien
 * usa esto no tiene por qué saber abrir una consola.
 */
export async function descargarModelo(modelo, cfg = ajustesIA()) {
  // Sin trocear la respuesta: se espera a que termine. Tarda, pero no hace
  // falta nada más que esperar, y así el puente del escritorio es simple.
  const cuerpo = await pedir(`${cfg.ollama_url.replace(/\/$/, '')}/api/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: modelo, name: modelo, stream: false }),
  }, 45 * 60 * 1000);
  const datos = typeof cuerpo === 'string' ? (jsonDeRespuesta(cuerpo) || {}) : cuerpo;
  if (datos?.error) {
    const err = new Error(`No se ha podido descargar «${modelo}»: ${datos.error}`);
    err.status = null;
    throw err;
  }
  return true;
}

/** La página oficial desde donde se instala el motor de la IA gratuita. */
export const PAGINA_OLLAMA = 'https://ollama.com/download';

/** Abre esa página en el navegador, sin que haya que copiar direcciones. */
export function abrirPaginaDeInstalacion() {
  try {
    if (typeof window !== 'undefined' && window.gptIA?.abrir) {
      window.gptIA.abrir(PAGINA_OLLAMA);
      return true;
    }
    window.open(PAGINA_OLLAMA, '_blank', 'noopener');
    return true;
  } catch {
    return false;
  }
}

// ── El móvil y la tablet usan la IA del ordenador ───────────────────────────
//
// Para que la IA gratuita funcione en TODOS los aparatos y no solo en el
// ordenador. Dos cosas lo impedían:
//
//   1. Ollama solo escucha en el propio ordenador, así que desde el móvil no
//      se llega. Lo resuelve el puente que levanta el programa de escritorio.
//   2. La app de Android va por https y el sistema no deja llamar a un http de
//      la red local. Se resuelve pidiéndolo de forma NATIVA (CapacitorHttp),
//      que no pasa por esa limitación del navegador.
//
// Y para no tener que escribir ninguna dirección: el ordenador apunta la suya
// en la configuración compartida, que ya se sincroniza entre aparatos. El
// móvil la lee y va solo.

export const CLAVE_PUENTE = 'ia_puente_lan';

/** ¿Estamos dentro de la app instalada de Android? */
export function esAppMovil() {
  try {
    return window.Capacitor?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

/** Petición nativa, la única que llega a la red local desde el móvil. */
async function pedirNativo(url, opciones = {}) {
  const { CapacitorHttp } = await import('@capacitor/core');
  const r = await CapacitorHttp.request({
    url,
    method: opciones.method || 'GET',
    headers: opciones.headers || {},
    data: opciones.body ? JSON.parse(opciones.body) : undefined,
    connectTimeout: 15000,
    readTimeout: 15 * 60 * 1000,
  });
  if (r.status < 200 || r.status >= 300) {
    const err = new Error(motivoHttp(r.status, JSON.stringify(r.data || ''), url));
    err.status = r.status;
    throw err;
  }
  return typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
}

/**
 * El ordenador enciende el puente y apunta dónde está, para que el móvil lo
 * encuentre sin que nadie escriba una dirección IP.
 */
export async function compartirIAConLosDemas(base44, cfg = ajustesIA()) {
  if (!window.gptIA?.compartirEncender) return { ok: false, error: 'Esto solo lo puede hacer el programa del ordenador.' };
  const r = await window.gptIA.compartirEncender(cfg.ollama_url);
  if (!r?.ok) return r;
  await guardarPuenteEnLaNube(base44, { ip: r.ip, puerto: r.puerto, llave: r.llave });
  return r;
}

async function guardarPuenteEnLaNube(base44, datos) {
  // Se guarda una LISTA, no una sola dirección: en casa el ordenador tiene una
  // y en el taller otra, y con una sola el móvil solo funcionaría en un sitio.
  try {
    const filas = await base44.entities.SystemSettings.filter({ key: CLAVE_PUENTE });
    const previas = leerPuentes(filas?.[0]?.value);
    const lista = [datos, ...previas.filter((p) => p.ip !== datos.ip)].slice(0, 5);
    const valor = JSON.stringify(lista);
    if (filas?.[0]) await base44.entities.SystemSettings.update(filas[0].id, { value: valor });
    else await base44.entities.SystemSettings.create({ key: CLAVE_PUENTE, value: valor });
    return true;
  } catch {
    return false;
  }
}

function leerPuentes(valor) {
  try {
    const d = JSON.parse(valor || 'null');
    if (Array.isArray(d)) return d.filter((x) => x?.ip && x?.puerto && x?.llave);
    if (d?.ip && d?.puerto && d?.llave) return [d];
  } catch { /* nada guardado */ }
  return [];
}

/**
 * El móvil busca dónde está la IA del ordenador.
 *
 * Se prueban TODAS las direcciones conocidas (la de casa, la del taller…) y se
 * usa la primera que conteste. Si no contesta ninguna, es que no se está en la
 * misma red que el ordenador: con datos móviles o en otro wifi, no se llega.
 */
export async function buscarIADelOrdenador(base44, comprobar = true) {
  let candidatos = [];
  try {
    const filas = await base44.entities.SystemSettings.filter({ key: CLAVE_PUENTE });
    candidatos = leerPuentes(filas?.[0]?.value);
  } catch {
    return null;
  }
  if (!candidatos.length) return null;
  if (!comprobar) return candidatos[0];

  for (const puente of candidatos) {
    try {
      await conTiempo(probarIADelOrdenador(puente), 3500);
      return puente;
    } catch { /* esa red no; se prueba la siguiente */ }
  }
  return null;
}

/**
 * La clave gratuita de internet, compartida entre los aparatos.
 *
 * Se pega UNA vez, en el aparato que sea, y desde ahí vale para el ordenador,
 * la tablet y el móvil. Pedirla en cada aparato sería configurar tres veces.
 */
export async function guardarClaveCompartida(base44, clave) {
  guardarAjustesIA({ openrouter_clave: clave });
  try {
    const filas = await base44.entities.SystemSettings.filter({ key: 'ia_clave_internet' });
    if (filas?.[0]) await base44.entities.SystemSettings.update(filas[0].id, { value: clave });
    else await base44.entities.SystemSettings.create({ key: 'ia_clave_internet', value: clave });
    return true;
  } catch {
    return false;
  }
}

export async function recogerClaveCompartida(base44) {
  try {
    const filas = await base44.entities.SystemSettings.filter({ key: 'ia_clave_internet' });
    const clave = filas?.[0]?.value;
    if (clave && clave !== ajustesIA().openrouter_clave) guardarAjustesIA({ openrouter_clave: clave });
    return clave || '';
  } catch {
    return '';
  }
}

/** Consulta a la IA del ordenador desde el móvil. */
export async function llamarIADelOrdenador(peticion, puente) {
  const { texto, pideJson } = prepararPeticion(peticion);
  const cfg = ajustesIA();
  const url = `http://${puente.ip}:${puente.puerto}/api/chat`;
  const cuerpo = await pedirNativo(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-gpt-llave': puente.llave },
    body: JSON.stringify({
      model: cfg.ollama_modelo,
      messages: [{ role: 'user', content: texto }],
      stream: false,
      ...(pideJson ? { format: 'json' } : {}),
    }),
  });
  const datos = typeof cuerpo === 'string' ? JSON.parse(cuerpo) : cuerpo;
  const salida = datos?.message?.content ?? '';
  return pideJson ? (jsonDeRespuesta(salida) ?? salida) : salida;
}

/** ¿Se puede llegar a la IA del ordenador desde aquí? */
export async function probarIADelOrdenador(puente) {
  const url = `http://${puente.ip}:${puente.puerto}/api/tags`;
  const cuerpo = await pedirNativo(url, { headers: { 'x-gpt-llave': puente.llave } });
  const datos = typeof cuerpo === 'string' ? JSON.parse(cuerpo) : cuerpo;
  return (datos?.models || []).map((m) => m.name);
}
