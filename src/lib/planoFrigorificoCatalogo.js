/**
 * planoFrigorificoCatalogo.js — todo lo que se puede poner en un plano:
 * máquinas de frío, climatización, aparamenta de seguridad, material eléctrico
 * y elementos de obra.
 *
 * Las paredes se dibujan a mano (herramienta «Pared»); el resto se pincha del
 * catálogo y se suelta en el lienzo.
 *
 * Por qué cada elemento declara sus CAMPOS: cada uno necesita saber cosas
 * distintas. Una condensadora pide potencia y refrigerante; un diferencial
 * pide sensibilidad, clase y polos; una válvula de seguridad pide el tarado y
 * a dónde descarga. Si todo fuera «un símbolo con un nombre», el plano
 * quedaría bonito y no serviría ni para calcular ni para presupuestar. El
 * panel de detalles los pinta solo, así que añadir un equipo nuevo es añadir
 * una línea aquí y nada más.
 *
 * Los precios son ORIENTATIVOS, para el presupuesto aproximado. Si el usuario
 * tiene sus tarifas (PriceItem), manda la suya.
 *
 * Cada elemento: id, cat, label, w_m/h_m (tamaño en metros), glyph (2-3
 * letras), precio y campos.
 */

export const CATEGORIAS = [
  { id: 'refrigeracion', label: 'Refrigeración', color: '#00D4FF' },
  { id: 'clima', label: 'Climatización', color: '#22D3EE' },
  { id: 'electrico', label: 'Electricidad / Aparamenta', color: '#F5A623' },
  { id: 'seguridad', label: 'Seguridad', color: '#E5484D' },
  { id: 'estructura', label: 'Estructura', color: '#7C3AED' },
];

export const CAT_COLOR = CATEGORIAS.reduce((m, c) => { m[c.id] = c.color; return m; }, {});

/* ─── Campos que se repiten ─────────────────────────────────────────────── */

const campoPotencia = { id: 'potencia_w', etiqueta: 'Potencia frigorífica (W)', tipo: 'numero', ayuda: 'La de la placa del equipo' };
const campoConsumo = { id: 'consumo_w', etiqueta: 'Consumo eléctrico (W)', tipo: 'numero' };
const campoTension = {
  id: 'tension', etiqueta: 'Tensión', tipo: 'opcion',
  opciones: ['230 V monofásica', '400 V trifásica', '24 V', '12 V'], porDefecto: '230 V monofásica',
};
const campoRefrigerante = { id: 'refrigerante', etiqueta: 'Refrigerante', tipo: 'texto', ayuda: 'R-449A, R-290, R-744…' };
const campoIntensidad = { id: 'intensidad_a', etiqueta: 'Intensidad (A)', tipo: 'numero' };
const campoCaudal = { id: 'caudal_m3h', etiqueta: 'Caudal (m³/h)', tipo: 'numero' };

/* ─── El catálogo ───────────────────────────────────────────────────────── */

export const ELEMENTOS = [
  /* ── Refrigeración ── */
  { id: 'compresor', cat: 'refrigeracion', label: 'Compresor', w_m: 1.0, h_m: 0.8, glyph: 'CP', precio: 1600,
    campos: [campoPotencia, campoConsumo, campoRefrigerante, campoTension,
      { id: 'tipo_compresor', etiqueta: 'Tipo', tipo: 'opcion', opciones: ['Hermético', 'Semihermético', 'Scroll', 'Tornillo'] }] },
  { id: 'condensador', cat: 'refrigeracion', label: 'Condensador', w_m: 1.2, h_m: 0.8, glyph: 'CD', precio: 900,
    campos: [campoPotencia, campoRefrigerante,
      { id: 'ventiladores', etiqueta: 'Nº de ventiladores', tipo: 'numero', porDefecto: 2 }] },
  { id: 'evaporador', cat: 'refrigeracion', label: 'Evaporador', w_m: 1.0, h_m: 0.6, glyph: 'EV', precio: 950,
    campos: [campoPotencia, campoRefrigerante,
      { id: 'desescarche', etiqueta: 'Desescarche', tipo: 'opcion', opciones: ['Aire', 'Eléctrico', 'Gas caliente', 'Agua'], porDefecto: 'Eléctrico' },
      { id: 'ventiladores', etiqueta: 'Nº de ventiladores', tipo: 'numero', porDefecto: 2 }] },
  { id: 'grupo_frio', cat: 'refrigeracion', label: 'Grupo de frío', w_m: 1.8, h_m: 1.2, glyph: 'GF', precio: 1800,
    campos: [campoPotencia, campoConsumo, campoRefrigerante, campoTension,
      { id: 'compresores', etiqueta: 'Nº de compresores', tipo: 'numero', porDefecto: 1 }] },
  { id: 'central_frigorifica', cat: 'refrigeracion', label: 'Central frigorífica', w_m: 3.0, h_m: 1.5, glyph: 'CF+', precio: 9000,
    campos: [campoPotencia, campoRefrigerante, campoTension,
      { id: 'compresores', etiqueta: 'Nº de compresores', tipo: 'numero', porDefecto: 3 },
      { id: 'etapas', etiqueta: 'Etapas', tipo: 'opcion', opciones: ['Simple', 'Booster', 'Doble etapa', 'Cascada'] }] },
  { id: 'camara_frigorifica', cat: 'refrigeracion', label: 'Cámara frigorífica', w_m: 3.0, h_m: 3.0, glyph: 'CF', precio: 4500,
    campos: [{ id: 'temperatura', etiqueta: 'Temperatura de trabajo (°C)', tipo: 'numero', porDefecto: 2 },
      { id: 'uso', etiqueta: 'Uso', tipo: 'opcion', opciones: ['Conservación positiva', 'Congelación', 'Antecámara', 'Obrador', 'Muelle'] },
      { id: 'panel_mm', etiqueta: 'Espesor del panel (mm)', tipo: 'opcion', opciones: ['60', '80', '100', '120', '150', '200'], porDefecto: '100' }] },
  { id: 'ventilador', cat: 'refrigeracion', label: 'Ventilador', w_m: 0.6, h_m: 0.6, glyph: 'VT', precio: 180,
    campos: [campoCaudal, campoTension] },
  { id: 'valvula_expansion', cat: 'refrigeracion', label: 'Válvula expansión', w_m: 0.3, h_m: 0.3, glyph: 'VE', precio: 190,
    campos: [{ id: 'tipo_valvula', etiqueta: 'Tipo', tipo: 'opcion', opciones: ['Termostática', 'Electrónica', 'Capilar'], porDefecto: 'Termostática' }, campoRefrigerante] },
  { id: 'tuberia_refrigerante', cat: 'refrigeracion', label: 'Tubería refrigerante', w_m: 0.2, h_m: 0.2, glyph: 'TR', precio: 28,
    campos: [{ id: 'diametro', etiqueta: 'Diámetro', tipo: 'texto' }] },
  { id: 'deshumidificador', cat: 'refrigeracion', label: 'Deshumidificador', w_m: 0.5, h_m: 0.4, glyph: 'DH', precio: 620,
    campos: [campoConsumo, campoTension] },
  { id: 'vitrina', cat: 'refrigeracion', label: 'Vitrina / expositor', w_m: 2.5, h_m: 1.0, glyph: 'VI', precio: 2400,
    campos: [campoPotencia, campoRefrigerante, { id: 'largo_m', etiqueta: 'Largo (m)', tipo: 'numero', porDefecto: 2.5 }] },
  { id: 'mural', cat: 'refrigeracion', label: 'Mural refrigerado', w_m: 3.75, h_m: 0.9, glyph: 'MU', precio: 3200,
    campos: [campoPotencia, campoRefrigerante, { id: 'largo_m', etiqueta: 'Largo (m)', tipo: 'numero', porDefecto: 3.75 }] },
  { id: 'arcon', cat: 'refrigeracion', label: 'Arcón congelador', w_m: 1.5, h_m: 0.7, glyph: 'AR', precio: 1100,
    campos: [campoPotencia, campoRefrigerante] },
  { id: 'abatidor', cat: 'refrigeracion', label: 'Abatidor de temperatura', w_m: 0.8, h_m: 0.8, glyph: 'AB', precio: 5200,
    campos: [campoPotencia, campoRefrigerante] },
  { id: 'botellero', cat: 'refrigeracion', label: 'Botellero / bajo mostrador', w_m: 1.5, h_m: 0.6, glyph: 'BO', precio: 900,
    campos: [campoPotencia] },
  { id: 'recibidor', cat: 'refrigeracion', label: 'Recibidor de líquido', w_m: 0.5, h_m: 0.5, glyph: 'RL', precio: 320,
    campos: [{ id: 'litros', etiqueta: 'Capacidad (litros)', tipo: 'numero' }] },
  { id: 'separador_aceite', cat: 'refrigeracion', label: 'Separador de aceite', w_m: 0.4, h_m: 0.4, glyph: 'SA', precio: 280, campos: [] },
  { id: 'filtro_deshidratador', cat: 'refrigeracion', label: 'Filtro deshidratador', w_m: 0.2, h_m: 0.2, glyph: 'FD', precio: 65,
    campos: [{ id: 'conexion', etiqueta: 'Conexión', tipo: 'opcion', opciones: ['Roscada', 'Soldada'] }] },
  { id: 'visor_liquido', cat: 'refrigeracion', label: 'Visor de líquido', w_m: 0.15, h_m: 0.15, glyph: 'VL', precio: 38, campos: [] },
  { id: 'valvula_solenoide', cat: 'refrigeracion', label: 'Válvula solenoide', w_m: 0.2, h_m: 0.2, glyph: 'VS+', precio: 130,
    campos: [campoTension] },
  { id: 'presostato', cat: 'refrigeracion', label: 'Presostato', w_m: 0.2, h_m: 0.2, glyph: 'PR', precio: 85,
    campos: [{ id: 'funcion', etiqueta: 'Función', tipo: 'opcion', opciones: ['Alta', 'Baja', 'Combinado', 'Aceite'] }] },
  { id: 'control_temperatura', cat: 'refrigeracion', label: 'Control / termostato', w_m: 0.2, h_m: 0.2, glyph: 'CT', precio: 140,
    campos: [campoTension] },

  /* ── Climatización ── */
  { id: 'exterior_clima', cat: 'clima', label: 'Unidad exterior', w_m: 1.0, h_m: 0.4, glyph: 'UE', precio: 1500,
    campos: [campoPotencia, campoConsumo, campoRefrigerante, campoTension] },
  { id: 'cassette', cat: 'clima', label: 'Cassette', w_m: 0.9, h_m: 0.9, glyph: 'CS', precio: 1200,
    campos: [campoPotencia, campoRefrigerante] },
  { id: 'conductos', cat: 'clima', label: 'Unidad de conductos', w_m: 1.2, h_m: 0.6, glyph: 'CO', precio: 1600,
    campos: [campoPotencia, campoRefrigerante] },
  { id: 'consola_suelo', cat: 'clima', label: 'Consola suelo-techo', w_m: 1.0, h_m: 0.25, glyph: 'CL', precio: 1000,
    campos: [campoPotencia, campoRefrigerante] },
  { id: 'split_pared', cat: 'clima', label: 'Split de pared', w_m: 0.9, h_m: 0.2, glyph: 'SP', precio: 700,
    campos: [campoPotencia, campoRefrigerante] },
  { id: 'fancoil', cat: 'clima', label: 'Fancoil', w_m: 0.8, h_m: 0.3, glyph: 'FC', precio: 850,
    campos: [campoPotencia] },
  { id: 'recuperador', cat: 'clima', label: 'Recuperador de calor', w_m: 1.2, h_m: 0.8, glyph: 'RC', precio: 2100,
    campos: [campoCaudal] },

  /* ── Electricidad / aparamenta ── */
  { id: 'cuadro_electrico', cat: 'electrico', label: 'Cuadro eléctrico', w_m: 0.8, h_m: 0.3, glyph: 'CE', precio: 1200,
    campos: [campoTension, { id: 'modulos', etiqueta: 'Nº de módulos', tipo: 'numero', porDefecto: 24 },
      { id: 'ip', etiqueta: 'Grado IP', tipo: 'opcion', opciones: ['IP20', 'IP44', 'IP55', 'IP65'], porDefecto: 'IP55' }] },
  { id: 'magnetotermico', cat: 'electrico', label: 'Magnetotérmico', w_m: 0.3, h_m: 0.2, glyph: 'MG', precio: 28,
    campos: [campoIntensidad,
      { id: 'curva', etiqueta: 'Curva', tipo: 'opcion', opciones: ['B', 'C', 'D'], porDefecto: 'C' },
      { id: 'polos', etiqueta: 'Polos', tipo: 'opcion', opciones: ['1P+N', '2P', '3P', '4P'], porDefecto: '1P+N' }] },
  { id: 'diferencial', cat: 'electrico', label: 'Diferencial', w_m: 0.3, h_m: 0.2, glyph: 'DF', precio: 75,
    campos: [campoIntensidad,
      { id: 'sensibilidad_ma', etiqueta: 'Sensibilidad (mA)', tipo: 'opcion', opciones: ['10', '30', '300', '500'], porDefecto: '30' },
      { id: 'clase', etiqueta: 'Clase', tipo: 'opcion', opciones: ['AC', 'A', 'A-Si', 'B'], porDefecto: 'A' },
      { id: 'polos', etiqueta: 'Polos', tipo: 'opcion', opciones: ['2P', '4P'], porDefecto: '2P' }] },
  { id: 'contactor', cat: 'electrico', label: 'Contactor', w_m: 0.25, h_m: 0.2, glyph: 'CN', precio: 55,
    campos: [campoIntensidad, campoTension] },
  { id: 'guardamotor', cat: 'electrico', label: 'Guardamotor', w_m: 0.25, h_m: 0.2, glyph: 'GM', precio: 92,
    campos: [{ id: 'rango_a', etiqueta: 'Rango de regulación (A)', tipo: 'texto' }] },
  { id: 'variador', cat: 'electrico', label: 'Variador de frecuencia', w_m: 0.4, h_m: 0.3, glyph: 'VF', precio: 680,
    campos: [{ id: 'potencia_kw', etiqueta: 'Potencia (kW)', tipo: 'numero' }, campoTension] },
  { id: 'automata', cat: 'electrico', label: 'Autómata / PLC', w_m: 0.4, h_m: 0.3, glyph: 'PLC', precio: 1400,
    campos: [campoTension] },
  { id: 'cableado', cat: 'electrico', label: 'Cableado', w_m: 0.1, h_m: 0.1, glyph: 'CA', precio: 14,
    campos: [{ id: 'seccion_mm2', etiqueta: 'Sección (mm²)', tipo: 'numero' }] },
  { id: 'toma_corriente', cat: 'electrico', label: 'Toma de corriente', w_m: 0.2, h_m: 0.2, glyph: 'TC', precio: 22,
    campos: [{ id: 'tipo_toma', etiqueta: 'Tipo', tipo: 'opcion', opciones: ['Schuko 16A', 'CETAC 16A', 'CETAC 32A', 'CETAC 63A'] }] },
  { id: 'interruptor', cat: 'electrico', label: 'Interruptor', w_m: 0.2, h_m: 0.2, glyph: 'IN', precio: 18, campos: [] },
  { id: 'luminaria', cat: 'electrico', label: 'Luminaria', w_m: 1.2, h_m: 0.2, glyph: 'LU', precio: 60,
    campos: [{ id: 'potencia_w_luz', etiqueta: 'Potencia (W)', tipo: 'numero' },
      { id: 'estanca', etiqueta: 'Estanca', tipo: 'opcion', opciones: ['Sí', 'No'], porDefecto: 'Sí' }] },
  { id: 'puesta_tierra', cat: 'electrico', label: 'Puesta a tierra', w_m: 0.4, h_m: 0.4, glyph: 'PT', precio: 150, campos: [] },

  /* ── Seguridad ── */
  { id: 'valvula_seguridad', cat: 'seguridad', label: 'Válvula de seguridad', w_m: 0.2, h_m: 0.2, glyph: 'VS', precio: 180,
    campos: [{ id: 'tarado_bar', etiqueta: 'Tarado (bar)', tipo: 'numero' },
      { id: 'descarga', etiqueta: 'Descarga', tipo: 'opcion', opciones: ['A la atmósfera', 'Conducida al exterior', 'A recipiente'] }],
    nota: 'Obligatoria en recipientes a presión. Su descarga debe conducirse donde no pueda alcanzar a personas.' },
  { id: 'detector_fugas', cat: 'seguridad', label: 'Detector de fugas', w_m: 0.2, h_m: 0.2, glyph: 'DFG', precio: 650,
    campos: [campoRefrigerante, campoTension, { id: 'umbral_ppm', etiqueta: 'Umbral de alarma (ppm)', tipo: 'numero' }],
    nota: 'Obligatorio por encima de cierta carga. Con detector, la periodicidad del control de fugas se duplica (Reglamento (UE) 2024/573).' },
  { id: 'alarma_camara', cat: 'seguridad', label: 'Alarma persona encerrada', w_m: 0.2, h_m: 0.2, glyph: 'AL', precio: 210,
    campos: [campoTension], nota: 'Obligatoria en cámaras en las que pueda entrar una persona.' },
  { id: 'pulsador_emergencia', cat: 'seguridad', label: 'Pulsador emergencia', w_m: 0.2, h_m: 0.2, glyph: 'PE', precio: 95, campos: [] },
  { id: 'paro_emergencia', cat: 'seguridad', label: 'Paro de emergencia', w_m: 0.2, h_m: 0.2, glyph: 'PS', precio: 95, campos: [] },
  { id: 'extraccion_emergencia', cat: 'seguridad', label: 'Ventilación de emergencia', w_m: 0.6, h_m: 0.6, glyph: 'VEM', precio: 780,
    campos: [campoTension, campoCaudal],
    nota: 'La sala de máquinas pide ventilación de emergencia enclavada con el detector de fugas.' },
  { id: 'extintor', cat: 'seguridad', label: 'Extintor', w_m: 0.3, h_m: 0.3, glyph: 'EX', precio: 70,
    campos: [{ id: 'agente', etiqueta: 'Agente', tipo: 'opcion', opciones: ['Polvo ABC', 'CO₂', 'Agua', 'Espuma'] }] },
  { id: 'detector_humo', cat: 'seguridad', label: 'Detector de humo', w_m: 0.2, h_m: 0.2, glyph: 'DH2', precio: 55, campos: [] },
  { id: 'luz_emergencia', cat: 'seguridad', label: 'Luz de emergencia', w_m: 0.3, h_m: 0.15, glyph: 'LE', precio: 45, campos: [] },
  { id: 'senalizacion', cat: 'seguridad', label: 'Señalización', w_m: 0.2, h_m: 0.2, glyph: 'SE', precio: 18,
    campos: [{ id: 'texto_senal', etiqueta: 'Qué señaliza', tipo: 'texto' }] },

  /* ── Estructura ── */
  { id: 'pilar', cat: 'estructura', label: 'Pilar', w_m: 0.4, h_m: 0.4, glyph: 'PI', precio: 0,
    campos: [{ id: 'lado_cm', etiqueta: 'Lado (cm)', tipo: 'numero', porDefecto: 40 }] },
  { id: 'puerta', cat: 'estructura', label: 'Puerta', w_m: 1.0, h_m: 0.15, glyph: 'PU', precio: 0,
    campos: [{ id: 'ancho_cm', etiqueta: 'Ancho (cm)', tipo: 'numero', porDefecto: 90 },
      { id: 'apertura', etiqueta: 'Apertura', tipo: 'opcion', opciones: ['Derecha', 'Izquierda', 'Corredera', 'Doble hoja'] }] },
  { id: 'ventana', cat: 'estructura', label: 'Ventana', w_m: 1.2, h_m: 0.15, glyph: 'VN', precio: 0,
    campos: [{ id: 'ancho_cm', etiqueta: 'Ancho (cm)', tipo: 'numero', porDefecto: 120 }] },
  { id: 'desague', cat: 'estructura', label: 'Desagüe', w_m: 0.2, h_m: 0.2, glyph: 'DE', precio: 0, campos: [] },
];

export const ELEMENTO_POR_ID = ELEMENTOS.reduce((m, e) => { m[e.id] = e; return m; }, {});

export function elementosPorCategoria() {
  const out = {};
  ELEMENTOS.forEach((e) => { (out[e.cat] = out[e.cat] || []).push(e); });
  return out;
}

/** Un elemento del catálogo por su identificador. */
export function elementoDe(id) {
  return ELEMENTO_POR_ID[id] || null;
}

/** Lo que pide un elemento, ya con los valores por defecto puestos. */
export function valoresPorDefecto(id) {
  const def = elementoDe(id);
  if (!def) return {};
  const out = {};
  (def.campos || []).forEach((c) => { if (c.porDefecto !== undefined) out[c.id] = c.porDefecto; });
  return out;
}

/** Busca por nombre, sin tildes ni mayúsculas. */
export function buscar(texto) {
  const q = String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  if (!q) return ELEMENTOS;
  return ELEMENTOS.filter((e) => `${e.label} ${e.cat}`
    .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes(q));
}
