import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { base44 } from '@/api/base44Client';
import { uploadFile } from '@/lib/uploadImage';
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

/**
 * Genera el icono IA de un equipo y devuelve su URL ('' si no se pudo).
 * Si la IA falla lanza un error con el motivo en español; quien llama puede
 * usar entonces `iconoPropio` para tener igualmente un icono.
 */
export async function generarIconoPlano(nombre, catLabel) {
  try {
    const res = await conLimite(base44.integrations.Core.GenerateImage({ prompt: promptIconoPlano(nombre, catLabel) }), ESPERA_IA_MS);
    const url = res?.url || res?.file_url || '';
    if (!url) throw new Error('La IA no devolvió ninguna imagen.');
    return url;
  } catch (e) {
    console.error('[iconoPlanoIA] Falló la generación con IA:', e);
    const err = new Error(mensajeFalloIA(e));
    err.causa = e;
    throw err;
  }
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