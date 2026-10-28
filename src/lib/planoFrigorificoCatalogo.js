// Catálogo de equipos y elementos para el diseñador de planos frigoríficos.
// Categorías con su color de marca, y la lista de elementos colocables.
// Las paredes se dibujan a mano (herramienta "Pared"); el resto se pincha
// del catálogo y se suelta en el lienzo.

export const CATEGORIAS = [
  { id: 'refrigeracion', label: 'Refrigeración', color: '#00D4FF' },
  { id: 'electrico', label: 'Electricidad / Aparamenta', color: '#F5A623' },
  { id: 'seguridad', label: 'Seguridad', color: '#E5484D' },
  { id: 'estructura', label: 'Estructura', color: '#7C3AED' },
];

export const CAT_COLOR = CATEGORIAS.reduce((m, c) => { m[c.id] = c.color; return m; }, {});

// Cada elemento: id, cat, label, w_m/h_m (tamaño en metros), glyph (2-3 letras).
export const ELEMENTOS = [
  // Refrigeración
  { id: 'compresor', cat: 'refrigeracion', label: 'Compresor', w_m: 1.0, h_m: 0.8, glyph: 'CP' },
  { id: 'condensador', cat: 'refrigeracion', label: 'Condensador', w_m: 1.2, h_m: 0.8, glyph: 'CD' },
  { id: 'evaporador', cat: 'refrigeracion', label: 'Evaporador', w_m: 1.0, h_m: 0.6, glyph: 'EV' },
  { id: 'grupo_frio', cat: 'refrigeracion', label: 'Grupo de frío', w_m: 1.8, h_m: 1.2, glyph: 'GF' },
  { id: 'camara_frigorifica', cat: 'refrigeracion', label: 'Cámara frigorífica', w_m: 3.0, h_m: 3.0, glyph: 'CF' },
  { id: 'ventilador', cat: 'refrigeracion', label: 'Ventilador', w_m: 0.6, h_m: 0.6, glyph: 'VT' },
  { id: 'valvula_expansion', cat: 'refrigeracion', label: 'Válvula expansión', w_m: 0.3, h_m: 0.3, glyph: 'VE' },
  { id: 'tuberia_refrigerante', cat: 'refrigeracion', label: 'Tubería refrigerante', w_m: 0.2, h_m: 0.2, glyph: 'TR' },
  { id: 'deshumidificador', cat: 'refrigeracion', label: 'Deshumidificador', w_m: 0.5, h_m: 0.4, glyph: 'DH' },
  // Electricidad / aparamenta
  { id: 'cuadro_electrico', cat: 'electrico', label: 'Cuadro eléctrico', w_m: 0.8, h_m: 0.3, glyph: 'CE' },
  { id: 'magnetotermico', cat: 'electrico', label: 'Magnetotérmico', w_m: 0.3, h_m: 0.2, glyph: 'MG' },
  { id: 'diferencial', cat: 'electrico', label: 'Diferencial', w_m: 0.3, h_m: 0.2, glyph: 'DF' },
  { id: 'cableado', cat: 'electrico', label: 'Cableado', w_m: 0.1, h_m: 0.1, glyph: 'CA' },
  { id: 'toma_corriente', cat: 'electrico', label: 'Toma de corriente', w_m: 0.2, h_m: 0.2, glyph: 'TC' },
  { id: 'interruptor', cat: 'electrico', label: 'Interruptor', w_m: 0.2, h_m: 0.2, glyph: 'IN' },
  { id: 'puesta_tierra', cat: 'electrico', label: 'Puesta a tierra', w_m: 0.4, h_m: 0.4, glyph: 'PT' },
  // Seguridad
  { id: 'pulsador_emergencia', cat: 'seguridad', label: 'Pulsador emergencia', w_m: 0.2, h_m: 0.2, glyph: 'PE' },
  { id: 'paro_emergencia', cat: 'seguridad', label: 'Paro de emergencia', w_m: 0.2, h_m: 0.2, glyph: 'PS' },
  { id: 'extintor', cat: 'seguridad', label: 'Extintor', w_m: 0.3, h_m: 0.3, glyph: 'EX' },
  { id: 'detector_humo', cat: 'seguridad', label: 'Detector de humo', w_m: 0.2, h_m: 0.2, glyph: 'DH' },
  { id: 'valvula_seguridad', cat: 'seguridad', label: 'Válvula de seguridad', w_m: 0.2, h_m: 0.2, glyph: 'VS' },
  { id: 'senalizacion', cat: 'seguridad', label: 'Señalización', w_m: 0.2, h_m: 0.2, glyph: 'SE' },
  // Estructura
  { id: 'pilar', cat: 'estructura', label: 'Pilar', w_m: 0.4, h_m: 0.4, glyph: 'PI' },
  { id: 'puerta', cat: 'estructura', label: 'Puerta', w_m: 1.0, h_m: 0.15, glyph: 'PU' },
  { id: 'ventana', cat: 'estructura', label: 'Ventana', w_m: 1.2, h_m: 0.15, glyph: 'VN' },
];

export const ELEMENTO_POR_ID = ELEMENTOS.reduce((m, e) => { m[e.id] = e; return m; }, {});

export function elementosPorCategoria() {
  const out = {};
  ELEMENTOS.forEach((e) => { (out[e.cat] = out[e.cat] || []).push(e); });
  return out;
}