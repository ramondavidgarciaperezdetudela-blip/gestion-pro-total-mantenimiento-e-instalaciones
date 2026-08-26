/**
 * inspeccionSanitaria.js — La hoja de inspección técnico-sanitaria de cámaras.
 *
 * Una ficha de mantenimiento normal vale para el cliente y para el archivo del
 * instalador, pero no vale para el inspector de Sanidad: él no busca presiones
 * ni recalentamientos, busca si la cámara está en condiciones para guardar
 * alimento, y quiere verlo de un vistazo y con fotos del día.
 *
 * Aquí está QUÉ se pregunta y CÓMO se imprime. Va aparte de la pantalla a
 * propósito: la lista de puntos es la misma que rellena el técnico y la que
 * sale impresa, así que si estuviera escrita dos veces acabarían diciendo
 * cosas distintas. Y sin depender del navegador se puede comprobar de verdad.
 *
 * REGLA DE LAS OPCIONES: en cada punto, la PRIMERA opción es la correcta y
 * las demás son deficiencias. De ahí sale solo el veredicto de la cabecera,
 * sin que nadie tenga que ir contando.
 */

/** Secciones de una sola respuesta (se elige una opción) o de varias (se marcan). */
export const SECCIONES = [
  {
    id: 'condensadora',
    numero: '2.1',
    titulo: 'Unidad condensadora y líneas frigoríficas',
    tipo: 'una',
    puntos: [
      { id: 'condensador', etiqueta: 'Estado visual del condensador',
        opciones: ['Limpio y despejado', 'Sucio, precisa limpieza', 'Aletas dobladas'] },
      { id: 'ventiladores_cond', etiqueta: 'Ventiladores del condensador',
        opciones: ['Funcionamiento correcto', 'Vibraciones', 'Averiado, no gira'] },
      { id: 'presostato_alta', etiqueta: 'Presostato de alta presión',
        opciones: ['Correcto', 'Descalibrado', 'Inoperativo'], medida: { etiqueta: 'Tarado a', unidad: 'bar' } },
      { id: 'presostato_baja', etiqueta: 'Presostato de baja presión',
        opciones: ['Correcto', 'Descalibrado', 'Inoperativo'], medida: { etiqueta: 'Tarado a', unidad: 'bar' } },
      { id: 'lineas', etiqueta: 'Líneas frigoríficas (tuberías)',
        opciones: ['Aislamiento íntegro', 'Falta aislamiento', 'Vibraciones'] },
      { id: 'recipiente', etiqueta: 'Recipiente de líquido',
        opciones: ['Correcto, sin corrosión', 'Signos de oxidación', 'Golpes estructurales'] },
      { id: 'visor', etiqueta: 'Visor de líquido',
        opciones: ['Transparente, carga correcta', 'Burbujas, falta gas', 'Humedad, indicador amarillo'] },
    ],
  },
  {
    id: 'evaporadora',
    numero: '2.2',
    titulo: 'Unidad evaporadora (interior de la cámara)',
    tipo: 'una',
    puntos: [
      { id: 'evaporador', etiqueta: 'Estado visual del evaporador',
        opciones: ['Correcto y limpio', 'Bloqueado de hielo', 'Suciedad acumulada'] },
      { id: 'ventiladores_evap', etiqueta: 'Ventiladores del evaporador',
        opciones: ['Flujo de aire correcto', 'Giro lento', 'Ruidosos o rodamientos gastados'] },
      { id: 'valvula', etiqueta: 'Válvula de expansión',
        opciones: ['Regulación correcta', 'Obstruida o bloqueada', 'Escarchado excesivo'] },
    ],
  },
  {
    id: 'causa',
    numero: '3.1',
    titulo: 'Causa principal de la falta de frío detectada',
    tipo: 'varias',
    puntos: [
      { id: 'electrico', etiqueta: 'Fallo eléctrico: salto de térmico, fusible quemado o fallo en el cuadro de maniobra' },
      { id: 'compresor', etiqueta: 'Fallo del compresor: gripado, bobinado quemado o fallo de arranque' },
      { id: 'fuga', etiqueta: 'Fuga de gas refrigerante: pérdida de carga por poro o rotura en tubería' },
      { id: 'hielo', etiqueta: 'Bloqueo del evaporador: exceso de hielo que impide el paso del aire' },
      { id: 'ventilacion', etiqueta: 'Fallo de ventilación: motor del ventilador del evaporador o del condensador quemado' },
      { id: 'regulacion', etiqueta: 'Fallo de regulación: termostato digital roto o presostato bloqueado por seguridad' },
    ],
  },
  {
    id: 'accion',
    numero: '3.2',
    titulo: 'Acción correctiva inmediata efectuada',
    tipo: 'varias',
    puntos: [
      { id: 'mecanico', etiqueta: 'Sustitución de componente frigorífico: compresor, ventilador o válvula de expansión' },
      { id: 'control', etiqueta: 'Sustitución de componente de control o seguridad: termostato, presostato o sondas' },
      { id: 'circuito', etiqueta: 'Reparación del circuito: fuga, vacío, cambio de filtro deshidratador y recarga de gas' },
      { id: 'desescarche', etiqueta: 'Desescarche forzado: eliminación del bloque de hielo y limpieza de desagües' },
    ],
  },
  {
    id: 'temperatura',
    numero: '4.1',
    titulo: 'Gestión del frío y temperatura',
    tipo: 'una',
    puntos: [
      { id: 'consigna', etiqueta: 'Temperatura de consigna',
        opciones: ['Regulada correctamente', 'Fuera del rango de la actividad'], medida: { etiqueta: 'Consigna', unidad: '°C' } },
      { id: 'alcanzada', etiqueta: 'Temperatura final alcanzada',
        opciones: ['Cámara recuperada, lectura estable', 'Aún en descenso', 'No alcanza la consigna'], medida: { etiqueta: 'Lectura', unidad: '°C' } },
      { id: 'termometro', etiqueta: 'Termómetro exterior',
        opciones: ['Operativo, verificado y visible', 'Poco visible', 'Averiado o inexistente'] },
      { id: 'haccp', etiqueta: 'Registros HACCP de control diario',
        opciones: ['Actualizados y operativos', 'Incompletos', 'No se llevan'] },
    ],
  },
  {
    id: 'estructura',
    numero: '4.2',
    titulo: 'Estado estructural y estanqueidad',
    tipo: 'una',
    puntos: [
      { id: 'paneles', etiqueta: 'Paneles de paredes y techo',
        opciones: ['Lisos, lavables y estancos', 'Grietas o juntas abiertas', 'Humedades o panel dañado'] },
      { id: 'suelo', etiqueta: 'Suelo y desagüe',
        opciones: ['Limpio, con pendiente y sifón libre', 'Desagüe lento', 'Atascado o con olores'] },
      { id: 'puerta', etiqueta: 'Puerta y burletes',
        opciones: ['Cierre hermético, junta limpia', 'Junta deformada', 'Pérdidas de aire evidentes'] },
      { id: 'seguridad', etiqueta: 'Apertura interior de seguridad',
        opciones: ['Totalmente operativa', 'Dura o defectuosa', 'Inoperativa'] },
    ],
  },
  {
    id: 'higiene',
    numero: '4.3',
    titulo: 'Seguridad alimentaria e higiene',
    tipo: 'una',
    puntos: [
      { id: 'separacion', etiqueta: 'Separación de productos',
        opciones: ['Carnes y vegetales en zonas diferenciadas', 'Separación parcial', 'Sin separación'] },
      { id: 'contaminacion', etiqueta: 'Prevención de contaminación cruzada',
        opciones: ['Productos en recipientes estancos', 'Recipientes sin tapa', 'Producto al descubierto'] },
      { id: 'estiba', etiqueta: 'Estiba',
        opciones: ['Separado de paredes y suelo', 'Apoyado en paredes', 'Producto en el suelo'] },
      { id: 'estanterias', etiqueta: 'Estanterías',
        opciones: ['Material anticorrosivo, limpias', 'Con óxido puntual', 'Oxidadas o no aptas'] },
      { id: 'rotulacion', etiqueta: 'Rotulación y trazabilidad',
        opciones: ['Etiquetado y fechas correctos', 'Etiquetado incompleto', 'Sin identificar'] },
    ],
  },
  {
    id: 'recomendaciones',
    numero: '5',
    titulo: 'Recomendaciones de continuidad y buenas prácticas',
    tipo: 'varias',
    puntos: [
      { id: 'monitoreo', etiqueta: 'Monitoreo intensivo: anotar la temperatura cada 4 horas durante los próximos 3 días' },
      { id: 'preventivo', etiqueta: 'Mantenimiento preventivo: limpieza del condensador y revisión de presiones cada 6 meses' },
      { id: 'limpieza', etiqueta: 'Plan de limpieza: intensificar la desinfección de estanterías con bactericida alimentario' },
    ],
  },
];

/** Los seis bloques del anexo fotográfico, en el orden en que se imprimen. */
export const FOTOS = [
  { id: 'componente', titulo: 'Componente intervenido / avería',
    descripcion: 'Detalle de la pieza rota, el presostato defectuoso, la fuga o el fallo eléctrico.' },
  { id: 'compresores', titulo: 'Compresores y elementos de línea',
    descripcion: 'Bancada del compresor, recipiente de líquido y visor tras la carga de gas.' },
  { id: 'condensador', titulo: 'Condensador y ventiladores exteriores',
    descripcion: 'Limpieza de las aletas, ventilación exterior y presostatos de alta.' },
  { id: 'evaporador', titulo: 'Evaporador interior y válvula de expansión',
    descripcion: 'Evaporador libre de hielo, limpieza interna y estado de la válvula.' },
  { id: 'display', titulo: 'Display de temperatura y burletes',
    descripcion: 'Lectura del termómetro exterior y estado de las gomas e imanes de la puerta.' },
  { id: 'interior', titulo: 'Higiene y separación de producto',
    descripcion: 'Interior con los productos organizados por separado en estanterías aptas.' },
];

/** Una hoja recién empezada, con todo sin contestar. */
export function fichaVacia() {
  return {
    activa: false,
    establecimiento: '',
    actividad: '',
    registro_sanitario: '',
    motivo: '',
    carne_instalador: '',
    respuestas: {},          // "seccion.punto" → texto de la opción, o true/false
    medidas: {},             // "seccion.punto" → lo medido (bar, °C…)
    observaciones: {},       // "seccion" → texto libre
    fotos: {},               // "bloque" → [url, …]
  };
}

/** La clave con la que se guarda cada punto. */
export function clave(seccion, punto) {
  return `${seccion}.${punto}`;
}

/** ¿Se ha contestado algo? Para no imprimir una hoja en blanco. */
export function hayAlgoContestado(ficha) {
  if (!ficha) return false;
  const r = ficha.respuestas || {};
  if (Object.values(r).some((v) => v === true || (typeof v === 'string' && v))) return true;
  if (Object.values(ficha.medidas || {}).some((v) => v !== '' && v != null)) return true;
  if (Object.values(ficha.observaciones || {}).some((v) => String(v || '').trim())) return true;
  return Object.values(ficha.fotos || {}).some((l) => (l || []).length > 0);
}

/**
 * El veredicto de un vistazo, que es lo que mira el inspector.
 *
 * Cuenta cuántos puntos se han contestado con algo distinto de la primera
 * opción (la correcta). No inventa nada: lo que no se ha contestado no cuenta
 * ni a favor ni en contra, y se dice cuántos son.
 */
export function veredicto(ficha) {
  let correctos = 0;
  const deficiencias = [];
  let sinContestar = 0;

  for (const seccion of SECCIONES) {
    if (seccion.tipo !== 'una') continue;
    for (const punto of seccion.puntos) {
      const valor = ficha?.respuestas?.[clave(seccion.id, punto.id)];
      if (!valor) { sinContestar++; continue; }
      if (valor === punto.opciones[0]) correctos++;
      else deficiencias.push({ seccion: seccion.titulo, punto: punto.etiqueta, estado: valor });
    }
  }

  const estado = deficiencias.length === 0
    ? (correctos > 0 ? 'conforme' : 'sin_datos')
    : (deficiencias.length <= 2 ? 'conforme_con_observaciones' : 'no_conforme');

  return { estado, correctos, sinContestar, deficiencias };
}

export const ETIQUETA_VEREDICTO = {
  conforme: { texto: 'CONFORME', color: '#15803d', fondo: '#dcfce7' },
  conforme_con_observaciones: { texto: 'CONFORME CON OBSERVACIONES', color: '#a16207', fondo: '#fef9c3' },
  no_conforme: { texto: 'NO CONFORME — REQUIERE ACTUACIÓN', color: '#b91c1c', fondo: '#fee2e2' },
  sin_datos: { texto: 'SIN CUMPLIMENTAR', color: '#475569', fondo: '#f1f5f9' },
};

/** Lo marcado en una sección de varias respuestas. */
export function marcadosDe(ficha, seccion) {
  return seccion.puntos
    .filter((p) => ficha?.respuestas?.[clave(seccion.id, p.id)] === true)
    .map((p) => p.etiqueta);
}

/**
 * Un resumen de una línea para el diario de reparaciones del cliente.
 * Ahí no cabe la hoja entera: cabe qué se hizo y cómo quedó.
 */
export function resumenParaDiario(ficha) {
  if (!hayAlgoContestado(ficha)) return '';
  const v = veredicto(ficha);
  const causas = marcadosDe(ficha, SECCIONES.find((s) => s.id === 'causa'));
  const acciones = marcadosDe(ficha, SECCIONES.find((s) => s.id === 'accion'));
  const partes = [`Inspección técnico-sanitaria: ${ETIQUETA_VEREDICTO[v.estado].texto}`];
  if (causas.length) partes.push(`Causa: ${causas.map(primeraFrase).join('; ')}`);
  if (acciones.length) partes.push(`Actuación: ${acciones.map(primeraFrase).join('; ')}`);
  if (v.deficiencias.length) {
    partes.push(`Deficiencias: ${v.deficiencias.map((d) => `${d.punto} (${d.estado})`).join('; ')}`);
  }
  return partes.join('. ');
}

/** "Fallo eléctrico: salto de térmico…" → "Fallo eléctrico". */
function primeraFrase(texto) {
  return String(texto).split(':')[0].trim();
}

/** Todas las fotos de la hoja, en el orden de los bloques. */
export function todasLasFotos(ficha) {
  return FOTOS.flatMap((b) => (ficha?.fotos?.[b.id] || []).map((url) => ({ bloque: b, url })));
}
