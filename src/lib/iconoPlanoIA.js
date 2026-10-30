import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { base44 } from '@/api/base44Client';
import { uploadFile } from '@/lib/uploadImage';
import { ajustesIA } from '@/lib/proveedorIA';
import { CAT_COLOR } from '@/lib/planoFrigorificoCatalogo';
import PlanoSimbolo from '@/components/plano_frigorifico/PlanoSimbolo';

/**
 * Iconos IA del catálogo de planos.
 *
 * Cada símbolo de fábrica puede tener su versión «icono IA» (un render realista
 * del equipo visto desde arriba). Esa versión se guarda en PlanoCatalogItem con
 * `std_id` apuntando al símbolo al que pertenece, de modo que la paleta puede
 * ofrecer las dos versiones de la MISMA máquina y el instalador elige cuál
 * colocar en cada plano.
 */

export const promptIconoPlano = (nombre, catLabel) =>
  `Icono técnico realista en vista superior (planta) de "${nombre}" (${catLabel}), para plano de instalación frigorífica y climatización. Render 3D colorido y detallado visto desde arriba, con materiales realistas (metal cepillado, plástico, cobre, goma), sombras suaves y reflejos, colores vivos que diferencian cada parte de la máquina, fondo blanco, sin texto ni letras, silueta nítida e inconfundible a primera vista, estilo catálogo de fabricante de equipamiento industrial.`;

const ESPERA_IA_MS = 90000;

function conLimite(promesa, ms) {
  let t;
  const limite = new Promise((_, rej) => { t = setTimeout(() => rej(new Error('La IA ha tardado demasiado en responder.')), ms); });
  return Promise.race([promesa, limite]).finally(() => clearTimeout(t));
}

/** Traduce el fallo de la IA a un mensaje claro en español. */
function mensajeFalloIA(e) {
  const t = String(e?.message || e || '');
  if (/tard/i.test(t)) return t;
  if (/401|403|permission|permiso|unauthor|forbidden/i.test(t)) return 'La IA no tiene permiso en esta sesión: cierra sesión, vuelve a entrar y repite.';
  if (/402|429|credit|crédito|quota|límite|limit/i.test(t)) return 'Se han agotado los créditos o el límite de la IA.';
  if (/network|failed to fetch|conexi|offline/i.test(t)) return 'No hay conexión con la IA. Comprueba internet.';
  return t ? `La IA ha fallado: ${t}` : 'La IA no ha respondido.';
}

const MODELO_IMAGEN_OPENROUTER = 'google/gemini-2.5-flash-image';

/** Imagen con la clave de OpenRouter del usuario (vale en cualquier aparato). */
async function imagenOpenRouter(prompt, clave) {
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODELO_IMAGEN_OPENROUTER,
      modalities: ['image', 'text'],
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!r.ok) {
    const err = new Error(`OpenRouter ${r.status}`);
    err.status = r.status;
    throw err;
  }
  const j = await r.json();
  const url = j?.choices?.[0]?.message?.images?.[0]?.image_url?.url || '';
  if (!url) throw new Error('OpenRouter no devolvió ninguna imagen.');
  return url;
}

/** Deja pasar solo un SVG limpio (sin scripts ni enlaces externos). */
export function svgLimpio(texto) {
  const m = String(texto || '').match(/<svg[\s\S]*?<\/svg>/i);
  if (!m) return '';
  let svg = m[0];
  if (/<script|on\w+\s*=|javascript:|<foreignObject|xlink:href\s*=\s*["']https?:/i.test(svg)) return '';
  if (!/xmlns=/.test(svg)) svg = svg.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  return svg.length > 60000 ? '' : svg;
}

/** Icono dibujado por la IA de texto (la misma de Configuración → IA), como SVG. */
async function iconoSvgPorLLM(nombre, catLabel) {
  const prompt = `Dibuja un icono técnico en vista superior (planta) de "${nombre}" (${catLabel}) para un plano de instalación frigorífica. `
    + 'Devuelve SOLO el código SVG, sin explicaciones ni bloques de código: viewBox="0 0 200 200", fondo blanco, formas sencillas y nítidas, '
    + 'colores diferenciados por piezas, sin texto ni letras, sin scripts ni imágenes externas.';
  const res = await base44.integrations.Core.InvokeLLM({ prompt });
  const texto = typeof res === 'string' ? res : (res?.svg || res?.text || res?.response || JSON.stringify(res || ''));
  const svg = svgLimpio(texto.replace(/\\n/g, '\n').replace(/\\"/g, '"'));
  if (!svg) throw new Error('La IA de texto no devolvió un dibujo válido.');
  const archivo = new File([svg], `icono-ia-${Date.now()}.svg`, { type: 'image/svg+xml' });
  try {
    return await uploadFile(archivo);
  } catch {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }
}

/**
 * Genera el icono IA de un equipo y devuelve su URL.
 *
 * Prueba varias vías, de la más vistosa a la más segura, para que funcione en
 * ordenador, móvil y tablet sin depender de un solo permiso:
 *   1. El generador de imágenes del servicio (si está disponible).
 *   2. Tu clave de OpenRouter (modelo de imagen) — vale en cualquier aparato.
 *   3. La IA de texto configurada (Ollama / OpenRouter / servicio) dibujando un SVG.
 * Si ninguna responde lanza un error en español; quien llama usa entonces
 * `iconoPropio`, que no necesita IA ni permisos.
 */
export async function generarIconoPlano(nombre, catLabel) {
  const prompt = promptIconoPlano(nombre, catLabel);
  const fallos = [];
  const url1 = async () => {
    const res = await conLimite(base44.integrations.Core.GenerateImage({ prompt }), ESPERA_IA_MS);
    return res?.url || res?.file_url || '';
  };
  const url2 = async () => {
    const clave = ajustesIA().openrouter_clave;
    if (!clave) throw new Error('Sin clave de OpenRouter.');
    return conLimite(imagenOpenRouter(prompt, clave), ESPERA_IA_MS);
  };
  const url3 = () => conLimite(iconoSvgPorLLM(nombre, catLabel), ESPERA_IA_MS);
  for (const via of [url1, url2, url3]) {
    try {
      const url = await via();
      if (url) return url;
    } catch (e) {
      console.error('[iconoPlanoIA] Una vía de la IA ha fallado:', e);
      fallos.push(e);
    }
  }
  const err = new Error(mensajeFalloIA(fallos[0] || new Error('')));
  err.causa = fallos[0];
  throw err;
}

/**
 * Icono propio, sin IA: dibuja el símbolo estándar del equipo como imagen SVG.
 * Funciona sin conexión y sin permisos, así siempre se puede guardar un icono.
 */
export async function iconoPropio(el) {
  const w = Math.max(14, (el.w_m || 0.6) * 100), h = Math.max(14, (el.h_m || 0.6) * 100);
  const pad = 8;
  const marcado = renderToStaticMarkup(
    React.createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: `${-w / 2 - pad} ${-h / 2 - pad} ${w + pad * 2} ${h + pad * 2}`, width: 256, height: Math.round(256 * (h + pad * 2) / (w + pad * 2)) },
      React.createElement('rect', { x: -w / 2 - pad, y: -h / 2 - pad, width: w + pad * 2, height: h + pad * 2, fill: '#ffffff' }),
      React.createElement(PlanoSimbolo, { el: { ...el, id: `ico-${el.id}`, type: el.id, color: CAT_COLOR[el.cat], datos: {} }, scale: 100 }),
    ),
  );
  const archivo = new File([marcado], `icono-${el.id}.svg`, { type: 'image/svg+xml' });
  try {
    return await uploadFile(archivo);
  } catch {
    // Sin subida posible: se guarda dentro del propio registro.
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(marcado)}`;
  }
}

/**
 * Guarda (o actualiza) el icono IA de un símbolo del catálogo.
 * Si ese símbolo ya tenía icono, se reemplaza; si no, se crea la versión IA.
 */
export async function guardarIconoPlano({ stdId, nombre, catLabel, glyph, w_m, h_m, precio, imageUrl, existenteId }) {
  if (existenteId) {
    await base44.entities.PlanoCatalogItem.update(existenteId, { image_url: imageUrl });
    return existenteId;
  }
  const creado = await base44.entities.PlanoCatalogItem.create({
    name: nombre,
    cat: 'ia',
    std_id: stdId,
    glyph: glyph || (nombre || '').slice(0, 3).toUpperCase(),
    w_m: w_m || 0.6,
    h_m: h_m || 0.6,
    precio: precio || 0,
    image_url: imageUrl,
    is_active: true,
  });
  return creado?.id || '';
}