// Cliente mínimo de la API de Anthropic para el Centro de IA.
// La clave es de cada empresa: se guarda solo en este aparato (gpt_ia_claude) y NO entra
// en las copias de seguridad.
export const CLAVE_AJUSTES = 'gpt_ia_claude';
export const URL_API = 'https://api.anthropic.com/v1/messages';
export const MODELOS = [
  { id: 'claude-sonnet-5-5', nombre: 'Claude Sonnet 5.5 (equilibrado, recomendado)' },
  { id: 'claude-opus-5-5', nombre: 'Claude Opus 5.5 (el más capaz, más caro)' },
  { id: 'claude-haiku-5-5', nombre: 'Claude Haiku 5.5 (rápido y barato)' }
];

export function ajustesClaude(almacen = globalThis.localStorage) {
  try {
    const g = JSON.parse(almacen.getItem(CLAVE_AJUSTES) || '{}');
    return { clave: String(g.clave || ''), modelo: String(g.modelo || MODELOS[0].id), url: String(g.url || URL_API) };
  } catch { return { clave: '', modelo: MODELOS[0].id, url: URL_API }; }
}

export function guardarAjustesClaude(cambios, almacen = globalThis.localStorage) {
  const nuevo = { ...ajustesClaude(almacen), ...cambios };
  try { almacen.setItem(CLAVE_AJUSTES, JSON.stringify(nuevo)); } catch { /* sin sitio */ }
  return nuevo;
}

export const hayClave = (cfg = ajustesClaude()) => /^sk-ant-/.test(cfg.clave.trim());

export function mensajeDeError(estado, cuerpo = '') {
  const detalle = (() => { try { return JSON.parse(cuerpo)?.error?.message || ''; } catch { return ''; } })();
  if (estado === 401 || estado === 403) return 'La clave de Anthropic no es válida o no tiene permiso. Revísala en Ajustes de IA.';
  if (estado === 429) return 'Anthropic dice que se han hecho demasiadas consultas seguidas. Espera un minuto y repite.';
  if (estado === 400 && /credit|balance/i.test(detalle)) return 'La cuenta de Anthropic se ha quedado sin saldo. Añade crédito en console.anthropic.com.';
  if (estado === 404) return 'El modelo elegido no existe en tu cuenta. Elige otro en Ajustes de IA.';
  if (estado === 413) return 'La conversación es demasiado larga. Empieza una nueva.';
  if (estado === 529 || estado >= 500) return 'Anthropic está saturado ahora mismo. Repite en un momento.';
  return `Anthropic respondió con un error (${estado}). ${detalle}`.trim();
}

/**
 * @param {{system?:string, messages:{role:'user'|'assistant', content:string}[], maxTokens?:number}} p
 * @returns {Promise<string>} texto de la respuesta
 */
export async function llamarClaude({ system, messages, maxTokens = 12000 }, cfg = ajustesClaude(), fetchFn = (...a) => fetch(...a)) {
  if (!hayClave(cfg)) throw new Error('Falta la clave de Anthropic. Ponla en la pestaña «Ajustes de IA».');
  let r;
  try {
    r = await fetchFn(cfg.url || URL_API, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': cfg.clave.trim(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({ model: cfg.modelo, max_tokens: maxTokens, ...(system ? { system } : {}), messages })
    });
  } catch {
    throw new Error('No se pudo conectar con Anthropic. Comprueba la conexión a internet.');
  }
  const cuerpo = await r.text();
  if (!r.ok) throw new Error(mensajeDeError(r.status, cuerpo));
  let datos;
  try { datos = JSON.parse(cuerpo); } catch { throw new Error('Respuesta ilegible de Anthropic.'); }
  const texto = (datos.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
  if (!texto) throw new Error('La IA no devolvió texto. Repite la petición.');
  return texto;
}
