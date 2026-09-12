/**
 * modelosDocumentos.js — El catálogo de modelos y el rellenado automático.
 *
 * Aquí se juntan los modelos de legalización y los del resto de documentos, y
 * se ofrece lo único que hacía falta del servidor: rellenar los huecos con lo
 * que el programa ya sabe (empresa, cliente, técnico, gas, equipo…).
 *
 * El rellenado no necesita que los modelos lleven marcas raras. Reconoce dos
 * cosas, que es como están escritos los papeles de verdad:
 *
 *   · Filas de tabla de dos celdas:  <td>Empresa Instaladora:</td><td>______</td>
 *   · Texto con dos puntos:          Técnico responsable: ______
 *
 * Si la etiqueta de la izquierda es algo que el programa conoce, el hueco de
 * la derecha se rellena. Si no, se queda con los guiones bajos para escribirlo
 * a mano o a boli sobre el papel impreso, que es como se ha hecho siempre.
 *
 * También se siguen admitiendo las marcas {{empresa}}, {{cliente}}… por si
 * alguien las escribe al editar un modelo.
 */

import { LEGALIZACION } from './modelosLegalizacion';
import { GENERALES } from './modelosGenerales';
import { EXPEDIENTE } from './modelosExpediente';

/**
 * Las familias de documentos, en el orden en que salen en pantalla.
 * `grupo` sirve para separar las legalizaciones del papeleo corriente.
 */
export const FAMILIAS = {
  solar: {
    label: '☀️ Solar Fotovoltaica',
    grupo: 'legalizacion',
    color: 'bg-amber-100 text-amber-800',
    descripcion: 'Memoria, boletín, CIE y comunicación de autoconsumo.',
  },
  electrico: {
    label: '⚡ Instalación Eléctrica',
    grupo: 'legalizacion',
    color: 'bg-yellow-100 text-yellow-800',
    descripcion: 'Memoria descriptiva, boletín y certificado de baja tensión.',
  },
  clima: {
    label: '❄️ Climatización (RITE)',
    grupo: 'legalizacion',
    color: 'bg-blue-100 text-blue-800',
    descripcion: 'Certificado, memoria técnica y libro de mantenimiento RITE.',
  },
  frio: {
    label: '🧊 Refrigeración Industrial',
    grupo: 'legalizacion',
    color: 'bg-cyan-100 text-cyan-800',
    descripcion: 'Certificado RSIF, registro F-Gas y ficha de equipo.',
  },
  trabajo: {
    label: '🔧 Partes y mantenimiento',
    grupo: 'general',
    color: 'bg-slate-100 text-slate-800',
    descripcion: 'Partes de trabajo y de avería, actas, revisiones y contratos.',
  },
  comercial: {
    label: '💶 Presupuestos y facturas',
    grupo: 'general',
    color: 'bg-emerald-100 text-emerald-800',
    descripcion: 'Presupuesto, factura, recibo y albarán para rellenar a mano.',
  },
  informe: {
    label: '📄 Informes y actas',
    grupo: 'general',
    color: 'bg-violet-100 text-violet-800',
    descripcion: 'Informe técnico, acta de entrega y declaración responsable.',
  },
  expediente: {
    label: '📎 Papeles del expediente',
    grupo: 'legalizacion',
    color: 'bg-rose-100 text-rose-800',
    descripcion: 'Certificado, memoria, proyecto, esquema unifilar, pruebas, tasas y uno en blanco.',
  },
};

/**
 * Los tipos de máquina que se manejan a diario. Salen en un desplegable y se
 * escriben tal cual en el documento, porque en un certificado no es lo mismo
 * "aire acondicionado" que "cassette de 4 vías": el que lo lea dentro de tres
 * años tiene que saber qué hay colgado del techo.
 */
export const TIPOS_EQUIPO = [
  { grupo: 'Climatización', tipos: [
    'Split mural',
    'Multisplit',
    'Consola de suelo',
    'Suelo-techo',
    'Cassette',
    'Conductos',
    'Fancoil',
    'Cortina de aire',
    'Ventana / compacto',
  ] },
  { grupo: 'Sistemas centralizados', tipos: [
    'VRF / VRV',
    'Rooftop',
    'Enfriadora / chiller',
    'Climatizadora (UTA)',
    'Aerotermia aire-agua',
    'Aerotermia aire-aire',
    'Geotermia',
    'Suelo radiante',
  ] },
  { grupo: 'Refrigeración', tipos: [
    'Cámara frigorífica',
    'Equipo compacto de cámara',
    'Unidad condensadora + evaporador',
    'Central frigorífica',
    'Mural refrigerado',
    'Vitrina expositora',
    'Arcón / isla de congelación',
    'Abatidor de temperatura',
    'Fabricador de hielo',
    'Botellero / enfriador de bebidas',
  ] },
  { grupo: 'Otros', tipos: [
    'Deshumidificador',
    'Bomba de calor para ACS',
    'Caldera',
    'Otro (escribirlo a mano)',
  ] },
];

/** Todos los modelos, por familia. */
export const MODELOS = { ...LEGALIZACION, ...EXPEDIENTE, ...GENERALES };

/** Las familias de un grupo ('legalizacion' o 'general'), en orden. */
export function familiasDe(grupo) {
  return Object.entries(FAMILIAS)
    .filter(([, f]) => f.grupo === grupo)
    .map(([id, f]) => ({ id, ...f }));
}

/** Los modelos de una familia. Nunca devuelve undefined. */
export function modelosDe(familia) {
  return MODELOS[familia] || [];
}

/** Un modelo concreto. Busca en su familia y, si no, en todas. */
export function buscarModelo(familia, id) {
  return modelosDe(familia).find((m) => m.id === id)
    || todosLosModelos().find((m) => m.id === id)
    || null;
}

/** Lista plana de todos los modelos, con su familia puesta. */
export function todosLosModelos() {
  return Object.entries(MODELOS).flatMap(([familia, lista]) =>
    lista.map((m) => ({ ...m, familia })),
  );
}

/** Cuántos modelos hay en total. Para poder decirlo en pantalla. */
export function cuantosModelos() {
  return todosLosModelos().length;
}

// ─── Rellenado ───────────────────────────────────────────────────────────────

/** Quita tildes, etiquetas y sobrantes para poder comparar etiquetas. */
function normalizar(t) {
  return String(t || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Qué etiqueta corresponde a qué dato. El orden IMPORTA: se mira de arriba
 * abajo y gana la primera que encaja, así que lo específico va antes que lo
 * general ("nif empresa" antes que "empresa", "direccion empresa" antes que
 * "direccion").
 *
 * `exacto: true` obliga a que la etiqueta sea justo esa. Se usa con las fechas,
 * porque "fecha" sí es la de hoy pero "fecha de la proxima revision" no.
 */
const REGLAS = [
  { clave: 'num_registro_empresa', frases: ['n registro empresa', 'registro empresa instaladora', 'registro empresa mantenedora', 'numero de registro industrial', 'registro industrial'] },
  { clave: 'nif_empresa', frases: ['nif empresa', 'cif empresa', 'nif de la empresa', 'nif cif empresa', 'nif del instalador'] },
  { clave: 'direccion_empresa', frases: ['direccion empresa', 'domicilio empresa', 'direccion de la empresa'] },
  { clave: 'tel_empresa', frases: ['telefono empresa', 'telefono de la empresa'] },
  { clave: 'empresa', frases: ['empresa instaladora', 'empresa mantenedora', 'razon social', 'empresa'] },

  { clave: 'nif_cliente', frases: ['nif dni titular', 'nif titular', 'dni titular', 'nif dni cliente', 'nif cliente', 'dni cliente', 'nif dni', 'dni del representante'] },
  { clave: 'cliente', frases: ['titular de la instalacion', 'titular instalacion', 'propietario titular', 'titular cliente', 'solicitante cliente', 'he recibido de cliente', 'destinatario', 'titular', 'propietario', 'cliente'] },

  { clave: 'direccion', frases: ['direccion de la instalacion', 'direccion instalacion', 'direccion de la intervencion', 'direccion de entrega', 'emplazamiento', 'direccion'] },
  { clave: 'municipio', frases: ['municipio provincia', 'municipio', 'localidad', 'poblacion'] },

  { clave: 'num_carnet', frases: ['n carnet', 'numero de carnet', 'carnet profesional', 'n colegiado', 'colegiado n', 'colegiado', 'n carnet registro', 'carnet registro'] },
  { clave: 'tecnico', frases: ['tecnico rite responsable', 'tecnico responsable', 'tecnico frigorista', 'tecnico mantenedor', 'tecnico redactor', 'tecnico competente', 'instalador habilitado', 'representante legal', 'tecnico'] },

  { clave: 'tipo_instalacion', frases: ['tipo de instalacion', 'tipo instalacion', 'uso del edificio', 'tipo de edificio'] },
  { clave: 'potencia', frases: ['potencia termica nominal', 'potencia capacidad', 'potencia instalada', 'potencia nominal', 'potencia total', 'potencia'] },
  { clave: 'sistema', frases: ['sistema empleado', 'sistema'] },
  { clave: 'tension', frases: ['tension de alimentacion', 'tension'] },

  { clave: 'gas', frases: ['gas refrigerante', 'tipo de refrigerante', 'fluido refrigerante', 'refrigerante'] },
  { clave: 'gwp', frases: ['gwp', 'pca'] },
  { clave: 'carga_gas', frases: ['carga de refrigerante', 'carga de gas', 'carga total', 'carga'] },
  { clave: 'temperatura', frases: ['temperatura de diseno', 'temp diseno', 'temperatura de regimen'] },

  { clave: 'tipo_maquina', frases: ['tipo de maquina', 'tipo de equipo', 'tipo de unidad', 'clase de equipo'] },
  { clave: 'ubicacion_condensadora', frases: ['ubicacion de la condensadora', 'situacion de la condensadora', 'ubicacion condensadora', 'ubicacion de la unidad exterior', 'situacion de la unidad exterior', 'unidad exterior situada', 'emplazamiento de la condensadora'] },
  { clave: 'ubicacion_evaporadora', frases: ['ubicacion de la evaporadora', 'situacion de la evaporadora', 'ubicacion evaporadora', 'ubicacion de la unidad interior', 'situacion de la unidad interior', 'unidad interior situada', 'emplazamiento de la evaporadora'] },
  { clave: 'aceite', frases: ['tipo de aceite', 'aceite del compresor', 'aceite'] },
  { clave: 'seguridad_gas', frases: ['grupo de seguridad', 'clasificacion de seguridad'] },
  { clave: 'toneladas_co2', frases: ['co2 equivalente', 'co equivalente', 'toneladas equivalentes', 't co2'] },

  { clave: 'marca_equipo', frases: ['marca del equipo', 'marca equipo', 'marca'] },
  { clave: 'modelo_equipo', frases: ['modelo del equipo', 'modelo equipo', 'modelo'] },
  { clave: 'num_serie', frases: ['n de serie', 'numero de serie', 'n serie'] },

  { clave: 'cups', frases: ['cups'] },
  { clave: 'distribuidora', frases: ['distribuidora', 'compania distribuidora'] },
  { clave: 'num_paneles', frases: ['n de paneles', 'numero de paneles', 'n paneles'] },
  { clave: 'potencia_panel', frases: ['potencia por panel', 'wp panel', 'potencia unitaria'] },
  { clave: 'inversor', frases: ['inversor'] },
  { clave: 'baterias', frases: ['baterias', 'acumulacion'] },

  { clave: 'fecha', exacto: true, frases: ['fecha', 'fecha del documento', 'fecha proyecto', 'fecha del proyecto', 'fecha de expedicion', 'fecha de emision', 'fecha de hoy'] },
];

/** Qué dato pide una etiqueta, o null si no lo sabemos. */
function claveDeEtiqueta(etiqueta) {
  const t = normalizar(etiqueta);
  if (!t || t.length > 60) return null;
  for (const regla of REGLAS) {
    const encaja = regla.exacto
      ? regla.frases.includes(t)
      : regla.frases.some((f) => t.includes(f));
    if (encaja) return regla.clave;
  }
  return null;
}

/** Un hueco: tres guiones bajos o más. */
const HUECO = /_{3,}/;

/** Escapa lo que se mete en el HTML, que puede venir de un nombre de cliente. */
function esc(t) {
  return String(t ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Sustituye el primer hueco de un trozo de HTML por el valor. */
function ponerEnElHueco(html, valor) {
  if (!HUECO.test(html)) return null;
  return html.replace(HUECO, esc(valor));
}

/**
 * Rellena un modelo con los datos que el programa ya tiene.
 *
 * No toca nada de lo que no esté seguro: si un dato viene vacío, o la etiqueta
 * no se reconoce, el hueco se queda tal cual para escribirlo a mano.
 *
 * @param {string} html    el modelo
 * @param {object} datos   { empresa, nif_empresa, cliente, tecnico, gas… }
 * @returns {string} el modelo con lo que se sabe ya puesto
 */
export function rellenarModelo(html, datos = {}) {
  if (!html) return '';
  const hay = (k) => {
    const v = datos[k];
    return v !== undefined && v !== null && String(v).trim() !== '';
  };
  let salida = String(html);

  // 1) Las marcas de toda la vida, {{empresa}} y compañía.
  salida = salida.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (marca, clave) => {
    const k = String(clave).toLowerCase();
    return hay(k) ? esc(datos[k]) : marca;
  });

  // 2) Filas de tabla de dos celdas: etiqueta a la izquierda, hueco a la derecha.
  salida = salida.replace(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi, (fila) => {
    const celdas = fila.match(/<t[dh]\b[^>]*>[\s\S]*?<\/t[dh]>/gi);
    if (!celdas || celdas.length !== 2) return fila;
    const abre = (c) => (c.match(/^<t[dh]\b[^>]*>/i) || [''])[0];
    const dentro = (c) => c.replace(/^<t[dh]\b[^>]*>/i, '').replace(/<\/t[dh]>$/i, '');
    const cierra = (c) => (c.match(/<\/t[dh]>$/i) || [''])[0];

    // Si la celda de la izquierda también tiene hueco no es una etiqueta: es
    // media fila de firmas (Técnico | Cliente). Ahí no se toca nada, que si no
    // el nombre del técnico acaba en la casilla del cliente.
    if (HUECO.test(dentro(celdas[0]))) return fila;

    const clave = claveDeEtiqueta(dentro(celdas[0]));
    if (!clave || !hay(clave)) return fila;
    const puesto = ponerEnElHueco(dentro(celdas[1]), datos[clave]);
    if (puesto === null) return fila;

    // Se rehace la fila por trozos: nada de replace() con el valor dentro, que
    // un "$&" en un nombre de cliente haría cosas raras.
    const corte = fila.lastIndexOf(celdas[1]);
    return fila.slice(0, corte) + abre(celdas[1]) + puesto + cierra(celdas[1])
      + fila.slice(corte + celdas[1].length);
  });

  // 3) Texto suelto del tipo «Técnico responsable: ______».
  salida = salida.replace(
    /([A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9º°.,/()\s]{3,50}?):(\s*(?:<[^>]+>\s*)*)(_{3,})/g,
    (todo, etiqueta, medio, hueco) => {
      const clave = claveDeEtiqueta(etiqueta);
      if (!clave || !hay(clave)) return todo;
      return `${etiqueta}:${medio}${esc(datos[clave])}`;
    },
  );

  return salida;
}

/**
 * Los datos de relleno, sacados de lo que la pantalla ya tiene cargado.
 * Se deja fuera todo lo que esté vacío para no pisar huecos con nada.
 */
export function datosDeRelleno({ form = {}, contacto = null, empresa = null, fecha = null } = {}) {
  const nombreContacto = contacto
    ? `${contacto.name || ''} ${contacto.surname || ''}`.trim()
    : '';
  const gas = form.gas === 'otro' ? (form.gas_custom || '') : (form.gas || '');

  const datos = {
    empresa: form.empresa || empresa?.company_name,
    nif_empresa: form.nif_empresa || empresa?.nif,
    direccion_empresa: form.direccion_empresa || empresa?.address,
    tel_empresa: form.tel_empresa || empresa?.phone,
    num_registro_empresa: form.num_registro_empresa,

    cliente: nombreContacto || form.cliente,
    nif_cliente: contacto?.nif || form.nif_cliente,
    direccion: contacto?.address || form.direccion,
    municipio: [contacto?.city, contacto?.province].filter(Boolean).join(' / ') || form.municipio,

    tecnico: form.tecnico,
    num_carnet: form.num_carnet,

    tipo_instalacion: form.tipo_instalacion,
    potencia: form.potencia,
    sistema: form.sistema,
    tension: form.tension,

    gas,
    gwp: form.gwp,
    carga_gas: form.carga_gas,
    temperatura: form.temperatura,

    tipo_maquina: form.tipo_maquina === 'Otro (escribirlo a mano)' ? (form.tipo_maquina_otro || '') : form.tipo_maquina,
    ubicacion_condensadora: form.ubicacion_condensadora,
    ubicacion_evaporadora: form.ubicacion_evaporadora,
    aceite: form.aceite,
    seguridad_gas: form.seguridad_gas,
    toneladas_co2: form.toneladas_co2,

    marca_equipo: form.marca_equipo,
    modelo_equipo: form.modelo_equipo,
    num_serie: form.num_serie,

    cups: form.cups,
    distribuidora: form.distribuidora,
    num_paneles: form.num_paneles,
    potencia_panel: form.potencia_panel,
    inversor: form.inversor,
    baterias: form.baterias,

    fecha: fecha || hoy(),
  };

  for (const k of Object.keys(datos)) {
    if (datos[k] === undefined || datos[k] === null || String(datos[k]).trim() === '') {
      delete datos[k];
    }
  }
  return datos;
}

/**
 * Lo contrario de rellenar: quita del documento los datos que puso el programa
 * y vuelve a dejar el hueco.
 *
 * Hace falta para poder guardar un modelo corregido "a mi manera". Si se
 * guardara el documento tal cual está en pantalla, el nombre y el NIF del
 * cliente de ese día quedarían pegados dentro del modelo y saldrían en todos
 * los documentos siguientes. Así el modelo se guarda limpio.
 *
 * Solo toca valores de cuatro caracteres o más: los cortos (un "12", un "5")
 * aparecen en cualquier parte del texto y borrarlos haría más daño que bien.
 */
export function desrellenarModelo(html, datos = {}) {
  if (!html) return '';
  let salida = String(html);
  // De más largo a más corto: si el nombre completo y el apellido son datos
  // distintos, primero se quita el largo para no dejar cachos sueltos.
  const valores = Object.values(datos)
    .map((v) => String(v ?? '').trim())
    .filter((v) => v.length >= 4)
    .sort((a, b) => b.length - a.length);

  for (const v of valores) {
    const buscado = esc(v);
    let desde = 0;
    for (;;) {
      const i = salida.indexOf(buscado, desde);
      if (i === -1) break;
      salida = salida.slice(0, i) + '_______________________' + salida.slice(i + buscado.length);
      desde = i + 23;
    }
  }
  return salida;
}

/** La fecha de hoy tal y como se escribe en un papel: 09/03/2026. */
function hoy() {
  const d = new Date();
  const dos = (n) => String(n).padStart(2, '0');
  return `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// ─── Bloques que se añaden al documento ──────────────────────────────────────

/** Una fila de tabla, o nada si el dato está vacío. */
function fila(etiqueta, valor) {
  if (valor === undefined || valor === null || String(valor).trim() === '') return '';
  return `<tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>${esc(etiqueta)}</strong></td>`
    + `<td style="padding:8px;border:1px solid #ccc">${esc(valor)}</td></tr>`;
}

/**
 * Ficha del equipo: qué máquina es, dónde está cada parte y qué gas lleva.
 *
 * Solo se añade si el modelo no tenía ya sitio para esos datos. Así, en un
 * certificado frigorífico —que ya trae su tabla de equipo— no salen dos veces,
 * y en un albarán o en un justificante de tasas, que no la traen, sí sale.
 */
export function bloqueEquipo(datos = {}, yaPuestos = new Set()) {
  const p = (k, etiqueta) => (yaPuestos.has(k) ? '' : fila(etiqueta, datos[k]));
  const filas = [
    p('tipo_maquina', 'Tipo de máquina'),
    p('marca_equipo', 'Marca del equipo'),
    p('modelo_equipo', 'Modelo'),
    p('num_serie', 'Nº de serie'),
    p('potencia', 'Potencia / Capacidad'),
    p('ubicacion_condensadora', 'Ubicación de la condensadora'),
    p('ubicacion_evaporadora', 'Ubicación de la evaporadora'),
    p('gas', 'Gas refrigerante'),
    p('seguridad_gas', 'Grupo de seguridad'),
    p('gwp', 'GWP'),
    p('carga_gas', 'Carga de refrigerante (kg)'),
    p('toneladas_co2', 'CO₂ equivalentes (t)'),
    p('aceite', 'Tipo de aceite'),
  ].filter(Boolean).join('\n    ');

  if (!filas) return '';
  return `<h3>DATOS DEL EQUIPO</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    ${filas}
  </tbody>
</table>`;
}

/**
 * El plano o croquis de la instalación, con su leyenda y las aclaraciones.
 *
 * @param {object} plano  { imagen, leyenda: [{simbolo, texto}], notas }
 */
export function bloquePlano(plano) {
  if (!plano || !plano.imagen) return '';
  const leyenda = (plano.leyenda || [])
    .filter((l) => l && (l.texto || l.simbolo))
    .map((l) => `<tr><td style="padding:6px;border:1px solid #ccc;width:30%"><strong>${esc(l.simbolo || '')}</strong></td>`
      + `<td style="padding:6px;border:1px solid #ccc">${esc(l.texto || '')}</td></tr>`)
    .join('\n    ');

  return `<h3>PLANO / CROQUIS DE LA INSTALACIÓN</h3>
<p style="margin:6px 0"><img src="${esc(plano.imagen)}" alt="Croquis de la instalación" style="max-width:100%;border:1px solid #ccc"/></p>
${leyenda ? `<p style="margin:10px 0 4px"><strong>Leyenda</strong></p>
<table border="1" style="border-collapse:collapse;width:100%;margin:4px 0">
  <tbody>
    ${leyenda}
  </tbody>
</table>` : ''}
${plano.notas ? `<p style="margin:10px 0 4px"><strong>Aclaraciones</strong></p><p style="border:1px solid #ccc;padding:10px;white-space:pre-wrap">${esc(plano.notas)}</p>` : ''}`;
}

/**
 * Mete un bloque justo antes del apartado de firmas.
 *
 * Un documento acaba firmándose; si los datos del equipo o el plano fueran
 * después de la firma, quedaría como un añadido posterior. Si el modelo no
 * tiene apartado de firmas, va al final y ya está.
 */
export function insertarAntesDeFirmas(html, bloque) {
  if (!bloque) return html;
  const encabezados = [...String(html).matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi)];
  for (let i = encabezados.length - 1; i >= 0; i--) {
    if (/firma|certificaci[oó]n|conformidad|recepci[oó]n|aceptaci[oó]n/i.test(encabezados[i][1])) {
      const en = encabezados[i].index;
      return html.slice(0, en) + bloque + '\n\n' + html.slice(en);
    }
  }
  return html + '\n\n' + bloque;
}

/**
 * El documento completo: el modelo relleno, más la ficha del equipo y el
 * plano si hacen falta. Es lo que usa la pantalla.
 */
export function componerDocumento(contenido, datos = {}, plano = null) {
  const relleno = rellenarModelo(contenido, datos);

  // Qué datos han encontrado ya su hueco en el modelo: esos no se repiten en
  // la ficha del equipo.
  const yaPuestos = new Set();
  for (const [k, v] of Object.entries(datos)) {
    const valor = String(v ?? '').trim();
    if (valor.length >= 2 && relleno.includes(esc(valor)) && !contenido.includes(esc(valor))) {
      yaPuestos.add(k);
    }
  }

  let salida = insertarAntesDeFirmas(relleno, bloqueEquipo(datos, yaPuestos));
  salida = insertarAntesDeFirmas(salida, bloquePlano(plano));
  return salida;
}

/** Buscar modelos por nombre o familia, para el buscador de la pantalla. */
export function buscarModelos(texto) {
  const q = normalizar(texto);
  if (!q) return todosLosModelos();
  return todosLosModelos().filter((m) => {
    const heno = normalizar(`${m.label} ${m.id} ${FAMILIAS[m.familia]?.label || ''}`);
    return q.split(' ').every((p) => heno.includes(p));
  });
}
