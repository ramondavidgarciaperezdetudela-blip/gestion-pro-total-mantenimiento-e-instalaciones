/**
 * instalacionCatalogo.js — todo lo que se puede poner en un plano de
 * instalación: máquinas de frío, aparamenta de seguridad y material eléctrico.
 *
 * Por qué un catálogo y no una lista de nombres: cada elemento necesita saber
 * cosas distintas. Una condensadora pide potencia y refrigerante; un
 * diferencial pide sensibilidad y curva; una válvula de seguridad pide tarado.
 * Si todo fuera "un símbolo con un nombre", el plano quedaría bonito y no
 * serviría para calcular ni para presupuestar.
 *
 * Por eso cada elemento declara QUÉ campos pide (`campos`), y la pantalla los
 * pinta sola. Añadir un equipo nuevo es añadir una entrada aquí, sin tocar el
 * lienzo ni el formulario.
 *
 * Los precios son ORIENTATIVOS y sirven para el presupuesto aproximado. Se
 * pueden sobrescribir con las tarifas propias (PriceItem); lo que manda
 * siempre es la tarifa del usuario, no esto.
 */

/** Los grandes bloques del catálogo, en el orden en que se enseñan. */
export const FAMILIAS = [
  { id: 'frio', nombre: 'Frío e instalación frigorífica', color: '#0ea5e9', icono: '❄️' },
  { id: 'clima', nombre: 'Climatización', color: '#06b6d4', icono: '🌡️' },
  { id: 'seguridad', nombre: 'Aparamenta de seguridad', color: '#ef4444', icono: '🛡️' },
  { id: 'electrico', nombre: 'Electricidad y mando', color: '#eab308', icono: '⚡' },
  { id: 'obra', nombre: 'Obra y cerramientos', color: '#64748b', icono: '🧱' },
];

/* ─── Campos reutilizables ──────────────────────────────────────────────── */

const campoPotencia = { id: 'potencia_w', etiqueta: 'Potencia frigorífica (W)', tipo: 'numero', ayuda: 'La de la placa del equipo' };
const campoConsumo = { id: 'consumo_w', etiqueta: 'Consumo eléctrico (W)', tipo: 'numero' };
const campoTension = {
  id: 'tension', etiqueta: 'Tensión', tipo: 'opcion',
  opciones: ['230 V monofásica', '400 V trifásica', '24 V', '12 V'], porDefecto: '230 V monofásica',
};
const campoRefrigerante = { id: 'refrigerante', etiqueta: 'Refrigerante', tipo: 'gas' };
const campoMarca = { id: 'marca', etiqueta: 'Marca y modelo', tipo: 'texto' };

/* ─── El catálogo ───────────────────────────────────────────────────────── */

export const ELEMENTOS = [
  /* ── Frío ── */
  {
    id: 'unidad_condensadora', familia: 'frio', nombre: 'Unidad condensadora', icono: '🔲',
    dibujo: 'unidad_condensadora', precio: 1800,
    campos: [campoMarca, campoPotencia, campoConsumo, campoRefrigerante, campoTension,
      { id: 'compresores', etiqueta: 'Nº de compresores', tipo: 'numero', porDefecto: 1 }],
  },
  {
    id: 'central_frigorifica', familia: 'frio', nombre: 'Central frigorífica', icono: '🏭',
    dibujo: 'unidad_condensadora', precio: 9000,
    campos: [campoMarca, campoPotencia, campoRefrigerante, campoTension,
      { id: 'compresores', etiqueta: 'Nº de compresores', tipo: 'numero', porDefecto: 3 },
      { id: 'etapas', etiqueta: 'Etapas', tipo: 'opcion', opciones: ['Simple', 'Booster', 'Doble etapa', 'Cascada'] }],
  },
  {
    id: 'evaporador_camara', familia: 'frio', nombre: 'Evaporador de cámara', icono: '🧊',
    dibujo: 'evaporador_camara', precio: 950,
    campos: [campoMarca, campoPotencia, campoRefrigerante,
      { id: 'desescarche', etiqueta: 'Desescarche', tipo: 'opcion', opciones: ['Aire', 'Eléctrico', 'Gas caliente', 'Agua'], porDefecto: 'Eléctrico' },
      { id: 'ventiladores', etiqueta: 'Nº de ventiladores', tipo: 'numero', porDefecto: 2 }],
  },
  {
    id: 'camara', familia: 'frio', nombre: 'Cámara frigorífica', icono: '🚪',
    dibujo: 'camara_puerta', precio: 4500, esRecinto: true,
    campos: [
      { id: 'temperatura', etiqueta: 'Temperatura de trabajo (°C)', tipo: 'numero', porDefecto: 2 },
      { id: 'uso', etiqueta: 'Uso', tipo: 'opcion', opciones: ['Conservación positiva', 'Congelación', 'Antecámara', 'Obrador', 'Muelle'] },
      { id: 'panel_mm', etiqueta: 'Espesor del panel (mm)', tipo: 'opcion', opciones: ['60', '80', '100', '120', '150', '200'], porDefecto: '100' }],
  },
  { id: 'vitrina', familia: 'frio', nombre: 'Vitrina / expositor', icono: '🛒', dibujo: 'vitrina', precio: 2400,
    campos: [campoMarca, campoPotencia, campoRefrigerante, { id: 'largo_m', etiqueta: 'Largo (m)', tipo: 'numero', porDefecto: 2.5 }] },
  { id: 'mural', familia: 'frio', nombre: 'Mural refrigerado', icono: '🧱', dibujo: 'mural', precio: 3200,
    campos: [campoMarca, campoPotencia, campoRefrigerante, { id: 'largo_m', etiqueta: 'Largo (m)', tipo: 'numero', porDefecto: 3.75 }] },
  { id: 'arcon', familia: 'frio', nombre: 'Arcón congelador', icono: '📦', dibujo: 'arcon', precio: 1100,
    campos: [campoMarca, campoPotencia, campoRefrigerante] },
  { id: 'abatidor', familia: 'frio', nombre: 'Abatidor de temperatura', icono: '⬇️', dibujo: 'arcon', precio: 5200,
    campos: [campoMarca, campoPotencia, campoRefrigerante] },
  { id: 'botellero', familia: 'frio', nombre: 'Botellero / bajo mostrador', icono: '🍾', dibujo: 'arcon', precio: 900, campos: [campoMarca, campoPotencia] },
  { id: 'recibidor', familia: 'frio', nombre: 'Recibidor de líquido', icono: '🛢️', dibujo: 'bancada', precio: 320,
    campos: [{ id: 'litros', etiqueta: 'Capacidad (litros)', tipo: 'numero' }] },
  { id: 'separador', familia: 'frio', nombre: 'Separador de aceite', icono: '🫗', dibujo: 'bancada', precio: 280, campos: [campoMarca] },
  { id: 'filtro_deshidratador', familia: 'frio', nombre: 'Filtro deshidratador', icono: '🔵', dibujo: 'bancada', precio: 65,
    campos: [{ id: 'conexion', etiqueta: 'Conexión', tipo: 'opcion', opciones: ['Roscada', 'Soldada'] }] },
  { id: 'visor_liquido', familia: 'frio', nombre: 'Visor de líquido', icono: '👁️', dibujo: 'bancada', precio: 38, campos: [] },
  { id: 'valvula_expansion', familia: 'frio', nombre: 'Válvula de expansión', icono: '🔺', dibujo: 'bancada', precio: 190,
    campos: [{ id: 'tipo_valvula', etiqueta: 'Tipo', tipo: 'opcion', opciones: ['Termostática', 'Electrónica', 'Capilar'], porDefecto: 'Termostática' }, campoRefrigerante] },
  { id: 'valvula_solenoide', familia: 'frio', nombre: 'Válvula solenoide', icono: '🔀', dibujo: 'bancada', precio: 130, campos: [campoTension] },
  { id: 'presostato', familia: 'frio', nombre: 'Presostato', icono: '📟', dibujo: 'control_temperatura', precio: 85,
    campos: [{ id: 'funcion', etiqueta: 'Función', tipo: 'opcion', opciones: ['Alta', 'Baja', 'Combinado', 'Aceite'] }] },
  { id: 'control_temperatura', familia: 'frio', nombre: 'Control / termostato', icono: '🎛️', dibujo: 'control_temperatura', precio: 140,
    campos: [campoMarca, campoTension] },

  /* ── Clima ── */
  { id: 'exterior', familia: 'clima', nombre: 'Unidad exterior', icono: '🔳', dibujo: 'exterior', precio: 1500,
    campos: [campoMarca, campoPotencia, campoConsumo, campoRefrigerante, campoTension] },
  { id: 'cassette', familia: 'clima', nombre: 'Cassette', icono: '⬜', dibujo: 'cassette', precio: 1200, campos: [campoMarca, campoPotencia, campoRefrigerante] },
  { id: 'conductos', familia: 'clima', nombre: 'Unidad de conductos', icono: '▭', dibujo: 'conductos', precio: 1600, campos: [campoMarca, campoPotencia, campoRefrigerante] },
  { id: 'suelo', familia: 'clima', nombre: 'Consola suelo-techo', icono: '🗄️', dibujo: 'suelo', precio: 1000, campos: [campoMarca, campoPotencia, campoRefrigerante] },
  { id: 'split_pared', familia: 'clima', nombre: 'Split de pared', icono: '📺', dibujo: 'mural', precio: 700, campos: [campoMarca, campoPotencia, campoRefrigerante] },
  { id: 'fancoil', familia: 'clima', nombre: 'Fancoil', icono: '🌀', dibujo: 'conductos', precio: 850, campos: [campoMarca, campoPotencia] },
  { id: 'recuperador', familia: 'clima', nombre: 'Recuperador de calor', icono: '♻️', dibujo: 'conductos', precio: 2100,
    campos: [campoMarca, { id: 'caudal_m3h', etiqueta: 'Caudal (m³/h)', tipo: 'numero' }] },

  /* ── Seguridad ── */
  {
    id: 'valvula_seguridad', familia: 'seguridad', nombre: 'Válvula de seguridad', icono: '⚠️', dibujo: 'bancada', precio: 180,
    campos: [{ id: 'tarado_bar', etiqueta: 'Tarado (bar)', tipo: 'numero' },
      { id: 'descarga', etiqueta: 'Descarga', tipo: 'opcion', opciones: ['A la atmósfera', 'Conducida al exterior', 'A recipiente'] }],
    nota: 'Obligatoria en recipientes a presión. Su descarga debe conducirse donde no pueda alcanzar a personas.',
  },
  {
    id: 'detector_fugas', familia: 'seguridad', nombre: 'Detector de fugas de refrigerante', icono: '📡', dibujo: 'control_temperatura', precio: 650,
    campos: [campoRefrigerante, campoTension,
      { id: 'umbral_ppm', etiqueta: 'Umbral de alarma (ppm)', tipo: 'numero' }],
    nota: 'Obligatorio por encima de cierta carga. Con detector, la periodicidad del control de fugas se duplica (Reglamento (UE) 2024/573).',
  },
  { id: 'alarma_camara', familia: 'seguridad', nombre: 'Alarma de persona encerrada', icono: '🔔', dibujo: 'control_temperatura', precio: 210,
    campos: [campoTension], nota: 'Obligatoria en cámaras en las que pueda entrar una persona.' },
  { id: 'seta_emergencia', familia: 'seguridad', nombre: 'Seta de emergencia', icono: '🛑', dibujo: 'control_temperatura', precio: 95, campos: [] },
  { id: 'extraccion_emergencia', familia: 'seguridad', nombre: 'Ventilación de emergencia', icono: '🌬️', dibujo: 'conductos', precio: 780,
    campos: [campoTension, { id: 'caudal_m3h', etiqueta: 'Caudal (m³/h)', tipo: 'numero' }] },
  { id: 'extintor', familia: 'seguridad', nombre: 'Extintor', icono: '🧯', dibujo: 'bancada', precio: 70,
    campos: [{ id: 'agente', etiqueta: 'Agente', tipo: 'opcion', opciones: ['Polvo ABC', 'CO₂', 'Agua', 'Espuma'] }] },
  { id: 'luz_emergencia', familia: 'seguridad', nombre: 'Luz de emergencia', icono: '💡', dibujo: 'control_temperatura', precio: 45, campos: [] },
  { id: 'cartel_senal', familia: 'seguridad', nombre: 'Señalización', icono: '🪧', dibujo: 'bancada', precio: 18,
    campos: [{ id: 'texto_senal', etiqueta: 'Qué señaliza', tipo: 'texto' }] },

  /* ── Eléctrico ── */
  { id: 'cuadro', familia: 'electrico', nombre: 'Cuadro eléctrico', icono: '🗃️', dibujo: 'unidad_condensadora', precio: 1200,
    campos: [campoTension, { id: 'modulos', etiqueta: 'Nº de módulos', tipo: 'numero', porDefecto: 24 },
      { id: 'ip', etiqueta: 'Grado IP', tipo: 'opcion', opciones: ['IP20', 'IP44', 'IP55', 'IP65'], porDefecto: 'IP55' }] },
  { id: 'magnetotermico', familia: 'electrico', nombre: 'Magnetotérmico', icono: '🔌', dibujo: 'bancada', precio: 28,
    campos: [{ id: 'intensidad_a', etiqueta: 'Intensidad (A)', tipo: 'numero' },
      { id: 'curva', etiqueta: 'Curva', tipo: 'opcion', opciones: ['B', 'C', 'D'], porDefecto: 'C' },
      { id: 'polos', etiqueta: 'Polos', tipo: 'opcion', opciones: ['1P+N', '2P', '3P', '4P'], porDefecto: '1P+N' }] },
  { id: 'diferencial', familia: 'electrico', nombre: 'Diferencial', icono: '🛟', dibujo: 'bancada', precio: 75,
    campos: [{ id: 'intensidad_a', etiqueta: 'Intensidad (A)', tipo: 'numero' },
      { id: 'sensibilidad_ma', etiqueta: 'Sensibilidad (mA)', tipo: 'opcion', opciones: ['10', '30', '300', '500'], porDefecto: '30' },
      { id: 'clase', etiqueta: 'Clase', tipo: 'opcion', opciones: ['AC', 'A', 'A-Si', 'B'], porDefecto: 'A' }] },
  { id: 'contactor', familia: 'electrico', nombre: 'Contactor', icono: '🔗', dibujo: 'bancada', precio: 55,
    campos: [{ id: 'intensidad_a', etiqueta: 'Intensidad (A)', tipo: 'numero' }, campoTension] },
  { id: 'guardamotor', familia: 'electrico', nombre: 'Guardamotor', icono: '⚙️', dibujo: 'bancada', precio: 92,
    campos: [{ id: 'rango_a', etiqueta: 'Rango de regulación (A)', tipo: 'texto' }] },
  { id: 'variador', familia: 'electrico', nombre: 'Variador de frecuencia', icono: '📈', dibujo: 'unidad_condensadora', precio: 680,
    campos: [campoMarca, { id: 'potencia_kw', etiqueta: 'Potencia (kW)', tipo: 'numero' }, campoTension] },
  { id: 'toma_corriente', familia: 'electrico', nombre: 'Toma de corriente', icono: '🔋', dibujo: 'bancada', precio: 22,
    campos: [{ id: 'tipo_toma', etiqueta: 'Tipo', tipo: 'opcion', opciones: ['Schuko 16A', 'CETAC 16A', 'CETAC 32A', 'CETAC 63A'] }] },
  { id: 'luminaria', familia: 'electrico', nombre: 'Luminaria', icono: '🔆', dibujo: 'bancada', precio: 60,
    campos: [{ id: 'potencia_w_luz', etiqueta: 'Potencia (W)', tipo: 'numero' },
      { id: 'estanca', etiqueta: 'Estanca', tipo: 'opcion', opciones: ['Sí', 'No'], porDefecto: 'Sí' }] },
  { id: 'puesta_tierra', familia: 'electrico', nombre: 'Puesta a tierra', icono: '⏚', dibujo: 'bancada', precio: 150, campos: [] },
  { id: 'autómata', familia: 'electrico', nombre: 'Autómata / PLC', icono: '🧠', dibujo: 'unidad_condensadora', precio: 1400,
    campos: [campoMarca, campoTension] },

  /* ── Obra ── */
  { id: 'pilar', familia: 'obra', nombre: 'Pilar', icono: '⬛', dibujo: 'bancada', precio: 0, esPilar: true,
    campos: [{ id: 'lado_cm', etiqueta: 'Lado (cm)', tipo: 'numero', porDefecto: 30 }] },
  { id: 'puerta', familia: 'obra', nombre: 'Puerta', icono: '🚪', dibujo: 'camara_puerta', precio: 0,
    campos: [{ id: 'ancho_cm', etiqueta: 'Ancho (cm)', tipo: 'numero', porDefecto: 90 },
      { id: 'apertura', etiqueta: 'Apertura', tipo: 'opcion', opciones: ['Derecha', 'Izquierda', 'Corredera', 'Doble hoja'] }] },
  { id: 'ventana', familia: 'obra', nombre: 'Ventana', icono: '🪟', dibujo: 'bancada', precio: 0,
    campos: [{ id: 'ancho_cm', etiqueta: 'Ancho (cm)', tipo: 'numero', porDefecto: 120 }] },
  { id: 'desague', familia: 'obra', nombre: 'Desagüe', icono: '🕳️', dibujo: 'bancada', precio: 0, campos: [] },
];

/* ─── Consultas ─────────────────────────────────────────────────────────── */

const PORID = Object.fromEntries(ELEMENTOS.map((e) => [e.id, e]));

/** Un elemento del catálogo por su identificador. */
export function elemento(id) {
  return PORID[id] || null;
}

/** Los elementos de una familia. */
export function deFamilia(idFamilia) {
  return ELEMENTOS.filter((e) => e.familia === idFamilia);
}

/** El catálogo agrupado, para pintar el panel lateral. */
export function porFamilias() {
  return FAMILIAS.map((f) => ({ ...f, elementos: deFamilia(f.id) })).filter((f) => f.elementos.length > 0);
}

/** Busca por nombre, sin tildes ni mayúsculas. */
export function buscar(texto) {
  const q = String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  if (!q) return ELEMENTOS;
  return ELEMENTOS.filter((e) => `${e.nombre} ${e.familia}`
    .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes(q));
}

/** El color con el que se pinta un elemento en el plano. */
export function colorDe(id) {
  const e = elemento(id);
  return FAMILIAS.find((f) => f.id === e?.familia)?.color || '#64748b';
}

/** Los valores por defecto de los campos de un elemento. */
export function valoresPorDefecto(id) {
  const e = elemento(id);
  if (!e) return {};
  const v = {};
  for (const c of e.campos || []) if (c.porDefecto !== undefined) v[c.id] = c.porDefecto;
  return v;
}
