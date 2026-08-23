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

export const MODELOS_OPENROUTER = [
  { id: 'meta-llama/llama-3.3-70b-instruct:free', nombre: 'Llama 3.3 70B (gratis)' },
  { id: 'qwen/qwen-2.5-72b-instruct:free', nombre: 'Qwen 2.5 72B (gratis)' },
  { id: 'mistralai/mistral-7b-instruct:free', nombre: 'Mistral 7B (gratis)' },
  { id: 'google/gemma-2-9b-it:free', nombre: 'Gemma 2 9B (gratis)' },
];

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

async function pedir(url, opciones) {
  if (hayPuenteEscritorio()) {
    const r = await window.gptIA.fetch({ url, ...opciones });
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
      ? 'Ese modelo ya no está disponible en OpenRouter. Elige otro de la lista.'
      : 'Ollama no encuentra ese modelo. Descárgalo con: ollama pull <modelo>';
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

/** Consulta a OpenRouter, con los modelos abiertos gratuitos. */
export async function llamarOpenRouter({ prompt, response_json_schema }, cfg = ajustesIA()) {
  if (!cfg.openrouter_clave) {
    const err = new Error('Falta la clave gratuita de OpenRouter. Pégala en Configuración → IA.');
    err.status = null;
    throw err;
  }
  const { texto, pideJson } = prepararPeticion({ prompt, response_json_schema });
  const cuerpo = await pedir('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.openrouter_clave}`,
    },
    body: JSON.stringify({
      model: cfg.openrouter_modelo,
      messages: [{ role: 'user', content: texto }],
      ...(pideJson ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  const datos = typeof cuerpo === 'string' ? JSON.parse(cuerpo) : cuerpo;
  const salida = datos?.choices?.[0]?.message?.content ?? '';
  return pideJson ? (jsonDeRespuesta(salida) ?? salida) : salida;
}

/** Los modelos que ya están descargados en el Ollama del ordenador. */
export async function modelosInstalados(cfg = ajustesIA()) {
  const cuerpo = await pedir(`${cfg.ollama_url.replace(/\/$/, '')}/api/tags`, { method: 'GET' });
  const datos = typeof cuerpo === 'string' ? JSON.parse(cuerpo) : cuerpo;
  return (datos?.models || []).map((m) => m.name);
}

/** Manda la consulta al proveedor elegido. */
export async function consultarIA(peticion, cfg = ajustesIA()) {
  if (cfg.proveedor === 'ollama') return llamarOllama(peticion, cfg);
  if (cfg.proveedor === 'openrouter') return llamarOpenRouter(peticion, cfg);
  throw new Error('Ese proveedor no se atiende aquí.');
}
