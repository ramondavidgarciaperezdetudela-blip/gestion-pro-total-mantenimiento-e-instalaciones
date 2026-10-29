import { base44 } from '@/api/base44Client';

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

/** Genera el icono IA de un equipo y devuelve su URL ('' si no se pudo). */
export async function generarIconoPlano(nombre, catLabel) {
  const res = await base44.integrations.Core.GenerateImage({ prompt: promptIconoPlano(nombre, catLabel) });
  return res?.url || '';
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