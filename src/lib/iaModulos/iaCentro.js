// La IA del Centro de IA es la MISMA que usa el resto del programa (Configuración → IA):
// Claude con la clave de la empresa, Ollama (sin límite y sin internet) u OpenRouter.
import { ajustesIA, consultarIA, fallaPorRedOSaldo, llamarOllama } from '@/lib/proveedorIA';
import { llamarClaude, ajustesClaude, hayClave } from './claude';

/** ¿Hay una IA lista para el Centro de IA? */
export function iaLista(cfg = ajustesIA()) {
  if (cfg.proveedor === 'anthropic') return hayClave(ajustesClaude());
  if (cfg.proveedor === 'openrouter') return !!cfg.openrouter_clave;
  return cfg.proveedor === 'ollama';
}

export const nombreIA = (cfg = ajustesIA()) => ({ anthropic: 'Claude', ollama: 'Ollama (local)', openrouter: 'OpenRouter' }[cfg.proveedor] || 'la IA elegida');

/** Convierte el historial en un solo texto para los proveedores que no tienen sistema+mensajes. */
export function aplanar(system, messages) {
  const hist = messages.map((m) => `${m.role === 'user' ? 'Persona' : 'Asistente'}: ${m.content}`).join('\n\n');
  return `${system ? `${system}\n\n---\n` : ''}${hist}\n\nAsistente:`;
}

export async function conversar({ system, messages, maxTokens }, cfg = ajustesIA(), deps = {}) {
  if (!iaLista(cfg)) throw new Error('No hay una IA lista. Elígela en la pestaña «Ajustes de IA» (Claude con tu clave, u Ollama gratis y sin internet).');
  const claude = deps.llamarClaude || llamarClaude;
  const consultar = deps.consultarIA || consultarIA;
  if (cfg.proveedor === 'anthropic') {
    try { return await claude({ system, messages, maxTokens }, ajustesClaude()); }
    catch (e) {
      if (!fallaPorRedOSaldo(e)) throw e;
      try { return String(await (deps.llamarOllama || llamarOllama)({ prompt: aplanar(system, messages) }, cfg)); } catch { throw e; }
    }
  }
  return String(await consultar({ prompt: aplanar(system, messages) }, cfg));
}
