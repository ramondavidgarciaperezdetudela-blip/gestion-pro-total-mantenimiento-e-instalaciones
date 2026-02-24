import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileText, Bot, Loader2, Download, Printer, Save, Sun, Zap, Thermometer, Snowflake, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import CompanyHeader from '../components/CompanyHeader';
import PrintButton from '../components/PrintButton';

// ─── TIPOS DE DOCUMENTOS ─────────────────────────────────────────────────────
const DOC_TYPES = {
  solar: {
    label: '☀️ Solar Fotovoltaica',
    color: 'bg-amber-100 text-amber-800',
    icon: Sun,
    docs: [
      { id: 'mtd_solar', label: 'Memoria Técnica de Diseño (MTD)', desc: 'Documento técnico completo con cálculos, esquemas y especificaciones' },
      { id: 'cie_solar', label: 'Certificado de Instalación Eléctrica (CIE)', desc: 'Certificado firmado por instalador autorizado categoría B' },
      { id: 'boletin_solar', label: 'Boletín Instalación Baja Tensión', desc: 'Boletín BT para presentar en Industria y distribuidora' },
      { id: 'cau_solar', label: 'Comunicación Autoconsumo (CAU)', desc: 'Formulario de comunicación de autoconsumo a la distribuidora' },
      { id: 'informe_solar', label: 'Informe técnico completo', desc: 'Informe técnico de la instalación con todos los datos y cálculos' },
    ]
  },
  electrico: {
    label: '⚡ Instalación Eléctrica',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Zap,
    docs: [
      { id: 'cie_bt', label: 'Certificado de Instalación Eléctrica (CIE)', desc: 'Certificado instalación baja tensión REBT' },
      { id: 'boletin_bt', label: 'Boletín Instalación Baja Tensión', desc: 'Boletín oficial para tramitación en Industria' },
      { id: 'memoria_bt', label: 'Memoria Descriptiva Instalación BT', desc: 'Descripción técnica de la instalación eléctrica' },
      { id: 'proyecto_bt', label: 'Proyecto Eléctrico (>100kW)', desc: 'Proyecto técnico firmado por ingeniero para instalaciones grandes' },
      { id: 'inspeccion_bt', label: 'Acta de Inspección OCA', desc: 'Modelo acta inspección organismo de control autorizado' },
    ]
  },
  clima: {
    label: '❄️ Climatización (RITE)',
    color: 'bg-blue-100 text-blue-800',
    icon: Thermometer,
    docs: [
      { id: 'cert_rite', label: 'Certificado Instalación Térmica (RITE)', desc: 'Certificado de instalación según RITE RD 1027/2007' },
      { id: 'memoria_rite', label: 'Memoria Técnica RITE', desc: 'Memoria técnica con cálculos de cargas térmicas y eficiencia' },
      { id: 'libro_mant_rite', label: 'Libro de Mantenimiento RITE', desc: 'Libro de mantenimiento y seguimiento de la instalación térmica' },
      { id: 'ficha_inspeccion_rite', label: 'Ficha Inspección Periódica', desc: 'Ficha de inspección periódica según IT 4 del RITE' },
      { id: 'eficiencia_rite', label: 'Certificado Eficiencia Energética', desc: 'Certificado energético con clase de eficiencia de la instalación' },
    ]
  },
  frio: {
    label: '🧊 Refrigeración Industrial',
    color: 'bg-cyan-100 text-cyan-800',
    icon: Snowflake,
    docs: [
      { id: 'cert_frigo', label: 'Certificado Instalación Frigorífica', desc: 'Certificado de instalación según RD 138/2011 Reglamento Frigorías' },
      { id: 'fgas_registro', label: 'Registro F-Gas / Libro Seguimiento', desc: 'Alta en registro F-Gas y modelo libro de seguimiento de gases fluorados' },
      { id: 'inspeccion_fugas', label: 'Protocolo Comprobación de Fugas', desc: 'Protocolo de detección de fugas según Reglamento F-Gas' },
      { id: 'ficha_equipo_fgas', label: 'Ficha de Equipo F-Gas', desc: 'Ficha técnica del equipo con datos del gas, carga y propietario' },
      { id: 'memoria_frio', label: 'Memoria Técnica Instalación Frigorífica', desc: 'Memoria con descripción del circuito, componentes y cálculos' },
    ]
  }
};

// ─── LINKS DOCUMENTOS OFICIALES ──────────────────────────────────────────────
const OFFICIAL_LINKS = {
  solar: [
    { label: 'Modelo MTD - MINCOTUR', url: 'https://www.mincotur.gob.es/energia/electricidad/AutoconsumoFotovoltaico/Paginas/Autoconsumo.aspx' },
    { label: 'RD 244/2019 Autoconsumo (BOE)', url: 'https://www.boe.es/eli/es/rd/2019/04/05/244' },
    { label: 'ITC-BT-40 Instalaciones generadoras', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099' },
    { label: 'Solicitud punto conexión distribuidora (REE)', url: 'https://www.ree.es/es/clientes/generador/acceso-conexion-red' },
    { label: 'RD 1183/2020 Acceso y Conexión', url: 'https://www.boe.es/eli/es/rd/2020/12/29/1183' },
  ],
  electrico: [
    { label: 'REBT RD 842/2002 completo (BOE)', url: 'https://www.boe.es/eli/es/rd/2002/08/02/842/con' },
    { label: 'Modelo CIE Baja Tensión - MINCOTUR', url: 'https://www.mincotur.gob.es/energia/electricidad/InstalacionesElectricas/Paginas/InstalacionesElectricas.aspx' },
    { label: 'Instrucciones Técnicas ITC-BT', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099' },
    { label: 'Normas UNE Electricidad', url: 'https://www.une.org/encuentra-tu-norma/busca-tu-norma/?c=S&A=electricidad' },
  ],
  clima: [
    { label: 'RITE RD 1027/2007 (BOE)', url: 'https://www.boe.es/eli/es/rd/2007/07/20/1027/con' },
    { label: 'RITE - Instrucciones Técnicas (IT)', url: 'https://energia.gob.es/desarrollo/EficienciaEnergetica/RITE/Paginas/InstalacionesTermicas.aspx' },
    { label: 'CTE DB-HE Ahorro de Energía', url: 'https://www.codigotecnico.org/pdf/Documentos/HE/DBHE.pdf' },
    { label: 'Certificación Energética RD 235/2013', url: 'https://www.boe.es/eli/es/rd/2013/04/05/235' },
  ],
  frio: [
    { label: 'RD 138/2011 Reglamento Frigorías', url: 'https://www.boe.es/eli/es/rd/2011/02/04/138' },
    { label: 'Reglamento F-Gas UE 517/2014', url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32014R0517' },
    { label: 'RD 115/2017 F-Gas España (BOE)', url: 'https://www.boe.es/eli/es/rd/2017/02/17/115' },
    { label: 'Registro F-Gas MITECO', url: 'https://www.miteco.gob.es/es/calidad-y-evaluacion-ambiental/temas/atmosfera-y-calidad-del-aire/clima/gases-fluorados/' },
    { label: 'Guía comprobación fugas IDAE', url: 'https://www.idae.es/uploads/documentos/documentos_Gu%C3%ADa_fugas_gases_fluorados_2edicion_tcm30-178434.pdf' },
  ]
};

function buildPrompt(type, docId, form, contact) {
  const today = format(new Date(), 'dd/MM/yyyy');
  const empresa = form.empresa || 'Empresa instaladora';
  const tecnico = form.tecnico || 'Técnico cualificado';
  const cliente = contact ? `${contact.name} ${contact.surname || ''}` : (form.cliente || 'Cliente');
  const direccion = contact ? `${contact.address || ''}, ${contact.city || ''} ${contact.province || ''}` : (form.direccion || '');
  const nif_cliente = contact?.nif || form.nif_cliente || '';
  const descripcion = form.descripcion || '';
  const potencia = form.potencia || '';

  const baseInfo = `
Empresa instaladora: ${empresa}
Técnico responsable: ${tecnico}
Nº carnet: ${form.num_carnet || 'XXXX-XXXX'}
Cliente/titular: ${cliente}
NIF titular: ${nif_cliente}
Dirección instalación: ${direccion}
Descripción instalación: ${descripcion}
Fecha: ${today}
`;

  const prompts = {
    // SOLAR
    mtd_solar: `Genera una Memoria Técnica de Diseño (MTD) para instalación fotovoltaica de autoconsumo en España según modelo MINCOTUR y RD 244/2019.
${baseInfo}
Potencia instalación: ${potencia || '5 kWp'}
Número de paneles: ${form.num_paneles || '12'}
Potencia panel: ${form.potencia_panel || '415'} Wp
Inversor: ${form.inversor || '5 kW'}
Baterías: ${form.baterias || 'No'}
Tipo instalación: ${form.tipo_instalacion || 'Individual con excedentes acogida compensación'}

Incluye en formato de documento oficial:
1. DATOS DE LA INSTALACIÓN (promotor, empresa, dirección, descripción)
2. DESCRIPCIÓN TÉCNICA (paneles, inversor, estructura, cableado, protecciones)
3. CÁLCULOS JUSTIFICATIVOS (producción estimada, dimensionado inversor, caídas de tensión, secciones cable)
4. PROTECCIONES (cuadro DC, cuadro AC, puesta a tierra)
5. NORMATIVA APLICADA (RD 244/2019, REBT, ITC-BT-40, RD 1183/2020)
6. DECLARACIÓN DEL TÉCNICO (firma y responsabilidad)
Usa tablas donde sea apropiado. Formato profesional para presentar en Industria.`,

    cie_solar: `Genera un Certificado de Instalación Eléctrica (CIE) para instalación fotovoltaica de autoconsumo en España según modelo oficial REBT.
${baseInfo}
Potencia: ${potencia || '5 kWp'}

Incluye:
1. DATOS IDENTIFICATIVOS (instalador, empresa, nº carnet, titular, dirección)
2. DESCRIPCIÓN DE LA INSTALACIÓN (tipo, potencia, tensión, componentes principales)
3. NORMATIVA CUMPLIDA (REBT RD 842/2002, ITC-BT-40, RD 244/2019)
4. DECLARACIÓN DE CONFORMIDAD
5. DATOS TÉCNICOS (secciones cable, protecciones, puesta a tierra)
6. FIRMA DEL INSTALADOR AUTORIZADO (espacio para firma y sello)
Formato oficial con campos completos para presentar en Delegación de Industria.`,

    boletin_solar: `Genera un Boletín de Instalación Eléctrica de Baja Tensión para instalación fotovoltaica en España.
${baseInfo}
Potencia: ${potencia || '5 kWp'}

Incluye todos los campos del boletín oficial:
1. DATOS DEL INSTALADOR (nombre, empresa, categoría, nº registro)
2. DATOS DEL TITULAR (nombre, NIF, dirección suministro)  
3. CARACTERÍSTICAS DE LA INSTALACIÓN (potencia, tensión, esquema, nº hilos)
4. PROTECCIONES INSTALADAS (IGA, diferenciales, magnétotérmicos con calibres)
5. CONDUCTORES (secciones, tipo aislamiento, longitudes)
6. PUESTA A TIERRA (resistencia, electrodo)
7. DECLARACIÓN DE CONFORMIDAD con REBT
8. FECHA Y FIRMA
Usa tablas para los valores técnicos.`,

    cau_solar: `Genera un modelo de Comunicación de Autoconsumo (CAU) para presentar a la distribuidora eléctrica según RD 244/2019 en España.
${baseInfo}
Potencia instalación: ${potencia || '5 kWp'}
CUPS (Código Unificado Punto Suministro): ${form.cups || 'ES0000000000000000XX'}
Distribuidora: ${form.distribuidora || 'Distribuidora eléctrica de la zona'}
Modalidad autoconsumo: ${form.modalidad || 'Individual con excedentes acogido a compensación simplificada'}

Incluye:
1. DATOS DEL SOLICITANTE
2. DATOS DEL PUNTO DE SUMINISTRO (CUPS, dirección, potencia contratada)
3. DATOS DE LA INSTALACIÓN DE PRODUCCIÓN (tipo, potencia nominal, número paneles)
4. MODALIDAD DE AUTOCONSUMO solicitada
5. DATOS DEL INVERSOR (marca, modelo, potencia, nº serie)
6. DECLARACIÓN RESPONSABLE
7. DOCUMENTACIÓN ADJUNTA que se presenta
8. SOLICITUD DE ALTA en el Registro de autoconsumo`,

    informe_solar: `Genera un informe técnico completo de instalación fotovoltaica de autoconsumo.
${baseInfo}
Potencia: ${potencia || '5 kWp'}
Nº paneles: ${form.num_paneles || '12'} x ${form.potencia_panel || '415'}Wp
Inversor: ${form.inversor || '5kW híbrido'}
Baterías: ${form.baterias || 'No'}

Informe con:
1. RESUMEN EJECUTIVO
2. DESCRIPCIÓN COMPLETA DEL SISTEMA (componentes, marcas, modelos)
3. CÁLCULOS DE PRODUCCIÓN (kWh/año, ahorro estimado, retorno inversión)
4. ESQUEMA DE CONEXIONADO (descripción textual detallada)
5. ESPECIFICACIONES TÉCNICAS EN TABLAS
6. MANTENIMIENTO RECOMENDADO
7. GARANTÍAS Y CERTIFICACIONES`,

    // ELÉCTRICO
    cie_bt: `Genera un Certificado de Instalación Eléctrica (CIE) de Baja Tensión en España según modelo oficial REBT RD 842/2002.
${baseInfo}
Tipo instalación: ${form.tipo_instalacion || 'Instalación interior vivienda/local'}
Potencia prevista: ${potencia || '15 kW'}
Tensión: ${form.tension || '230/400 V'}

CIE completo con:
1. DATOS DEL INSTALADOR AUTORIZADO
2. DATOS DEL TITULAR/PROMOTOR
3. EMPLAZAMIENTO DE LA INSTALACIÓN
4. CARACTERÍSTICAS TÉCNICAS (potencia, tensión, esquema de tierra, tipo local)
5. PROTECCIONES (ICP, IGA, diferenciales, magnetotérmicos en tabla)
6. CONDUCTORES (tabla con circuito, sección, long., protección)
7. PUESTA A TIERRA
8. NORMATIVA (REBT, ITC-BTs aplicables)
9. DECLARACIÓN DE CONFORMIDAD Y FIRMA`,

    boletin_bt: `Genera un Boletín Oficial de Instalación Eléctrica de Baja Tensión en España.
${baseInfo}
Tipo: ${form.tipo_instalacion || 'Instalación interior'}
Potencia: ${potencia || '15 kW'}

Boletín con todos los campos:
1. Nº de boletín y fecha
2. Datos instalador (nombre, empresa, categoría carnet, nº registro autonómico)
3. Datos titular (nombre/razón social, NIF, dirección)
4. Descripción instalación (tipo, uso, potencia, tensión, nº fases)
5. Tabla de circuitos (nº circuito, uso, sección cable, protección, longitud)
6. Cuadro de protecciones (IGA, diferencial, PIA por circuito en tabla)
7. Puesta a tierra (resistencia medida, electrodo tipo)
8. Resultado verificación (CONFORME/NO CONFORME)
9. Fecha, firma y sello empresa`,

    memoria_bt: `Genera una Memoria Descriptiva de Instalación Eléctrica de Baja Tensión según REBT.
${baseInfo}
Tipo: ${form.tipo_instalacion || 'Local comercial / Vivienda'}
Potencia prevista: ${potencia || '15 kW'}
Descripción: ${descripcion}

Memoria técnica con:
1. OBJETO Y ALCANCE
2. NORMATIVA APLICABLE (REBT, ITC-BTs específicas, UNE)
3. DESCRIPCIÓN DEL SUMINISTRO (potencia, tensión, acometida)
4. CUADRO GENERAL DE PROTECCIÓN (tabla completa de circuitos)
5. CÁLCULO DE SECCIONES DE CONDUCTORES (tabla con intensidades, caídas de tensión)
6. CÁLCULO PUESTA A TIERRA
7. ILUMINACIÓN DE EMERGENCIA (si aplica)
8. PROTECCIÓN CONTRA SOBRETENSIONES`,

    proyecto_bt: `Genera el índice y estructura completa de un Proyecto Eléctrico de Baja Tensión para instalación > 100kW en España, con el contenido de cada apartado.
${baseInfo}
Potencia: ${potencia || '200 kW'}

Proyecto completo:
1. MEMORIA (objeto, emplazamiento, normativa, descripción, justificación técnica)
2. CÁLCULOS JUSTIFICATIVOS (tabla circuitos, secciones, caídas tensión, cortocircuitos)
3. PLANOS (lista de planos necesarios: unifilares, planta, alzados, detalles)
4. PLIEGO DE CONDICIONES (materiales, ejecución, pruebas, normativa)
5. MEDICIONES Y PRESUPUESTO (tabla partidas)
6. ESTUDIO DE SEGURIDAD Y SALUD`,

    inspeccion_bt: `Genera un Acta de Inspección de Instalación Eléctrica de Baja Tensión según modelo OCA (Organismo de Control Autorizado) en España.
${baseInfo}
Potencia: ${potencia || '100 kW'}

Acta con:
1. DATOS GENERALES (instalación, titular, instalador, fecha)
2. OBJETO DE LA INSPECCIÓN (primera inspección / periódica / reforma)
3. VERIFICACIONES REALIZADAS (tabla con: ítem verificado, resultado OK/NOK/NA, observación)
   - Documentación presentada
   - Características generales
   - Cuadros eléctricos
   - Conductores y canalizaciones
   - Puesta a tierra
   - Protecciones
   - Instalaciones especiales
4. DEFECTOS DETECTADOS (clasificación: muy grave / grave / leve)
5. RESULTADO GLOBAL (FAVORABLE / CONDICIONADO / DESFAVORABLE)
6. FIRMAS (inspector, titular)`,

    // CLIMA RITE
    cert_rite: `Genera un Certificado de Instalación Térmica según RITE (RD 1027/2007) en España.
${baseInfo}
Tipo instalación: ${form.tipo_instalacion || 'Climatización central edificio'}
Potencia térmica: ${potencia || '50 kW'}
Fluido caloportador: ${form.fluido || 'Aire / Agua'}
Sistema: ${form.sistema || 'Bomba de calor aire-agua'}

Certificado oficial con:
1. DATOS DEL INSTALADOR (empresa, carnet de empresa instaladora RITE)
2. DATOS DEL TITULAR / EDIFICIO
3. DESCRIPCIÓN DE LA INSTALACIÓN (tipo sistema, potencia, rendimiento, EER/COP)
4. COMPONENTES INSTALADOS (tabla: equipo, marca, modelo, potencia, rendimiento)
5. CUMPLIMIENTO IT 1 A IT 4 DEL RITE
6. EFICIENCIA ENERGÉTICA (COP/EER de los equipos instalados)
7. MANTENIMIENTO RECOMENDADO según IT 3
8. DECLARACIÓN DE CONFORMIDAD Y FIRMA`,

    memoria_rite: `Genera una Memoria Técnica completa de Instalación Térmica según RITE para climatización.
${baseInfo}
Tipo sistema: ${form.sistema || 'Split multi VRF / Bomba de calor'}
Potencia: ${potencia || '50 kW'}
Descripción: ${descripcion}

Memoria con:
1. OBJETO Y ALCANCE
2. NORMATIVA (RITE, ITE, CTE DB-HE, UNE-EN)
3. DESCRIPCIÓN DEL EDIFICIO / LOCAL (uso, superficie, orientación, cerramientos)
4. CÁLCULO DE CARGAS TÉRMICAS (tabla por zona: carga refrigeración / calefacción en W)
5. DESCRIPCIÓN DEL SISTEMA (equipos, unidades interiores, distribución)
6. CARACTERÍSTICAS TÉCNICAS (tabla de equipos con marca, modelo, potencia, EER, COP, SCOP)
7. DISTRIBUCIÓN DE AIRE / AGUA (caudales, velocidades, dimensionado conductos)
8. EFICIENCIA ENERGÉTICA Y ETIQUETADO
9. PLAN DE MANTENIMIENTO`,

    libro_mant_rite: `Genera un modelo de Libro de Mantenimiento para instalación de climatización según IT 3 del RITE.
${baseInfo}
Sistema: ${form.sistema || 'Climatización central'}
Potencia: ${potencia || '50 kW'}

Libro de mantenimiento con:
1. DATOS DE LA INSTALACIÓN (titular, dirección, empresa mantenedora, carnet empresa)
2. DESCRIPCIÓN DE EQUIPOS (tabla: equipo, marca, modelo, nº serie, ubicación, potencia)
3. PROGRAMA DE MANTENIMIENTO (tabla con: operación, periodicidad, quién lo hace, fecha última)
   Incluir operaciones: limpieza filtros, revisión circuito frigorífico, comprobación caudales, control temperatura, análisis agua, etc.
4. HOJA DE REGISTRO DE VISITAS (tabla para registrar fecha, operaciones, técnico, firma)
5. REGISTRO DE INCIDENCIAS
6. CONTROL DE GASES REFRIGERANTES (si aplica)`,

    ficha_inspeccion_rite: `Genera una Ficha de Inspección Periódica de instalación térmica según IT 4 del RITE en España.
${baseInfo}
Sistema: ${form.sistema || 'Climatización'}
Potencia nominal: ${potencia || '50 kW'}

Ficha de inspección con:
1. DATOS GENERALES (instalación, titular, empresa inspectora, técnico, fecha)
2. TIPO DE INSPECCIÓN (inicial / periódica - indicar periodo)
3. LISTA DE VERIFICACIÓN (tabla con: aspecto verificado, resultado, observaciones):
   - Documentación (proyecto, certificado, libro mantenimiento)
   - Equipos de producción (estado, rendimiento, controles)
   - Sistemas de distribución (aislamiento, fugas, caudales)
   - Unidades terminales
   - Control y regulación
   - Calidad del aire interior
4. MEDICIONES REALIZADAS (temperatura, caudales, consumos en tabla)
5. DEFICIENCIAS DETECTADAS
6. CALIFICACIÓN (FAVORABLE / DESFAVORABLE)
7. PRÓXIMA INSPECCIÓN`,

    eficiencia_rite: `Genera un Certificado de Eficiencia Energética simplificado para instalación de climatización / RITE.
${baseInfo}
Sistema: ${form.sistema || 'Climatización'}
Potencia: ${potencia || '50 kW'}

Incluye:
1. DATOS DEL EDIFICIO/LOCAL
2. SISTEMAS INSTALADOS (tabla: sistema, potencia, COP/EER, SCOP/SEER, clase energética)
3. CONSUMO ESTIMADO ANUAL (kWh/año por sistema)
4. CLASE ENERGÉTICA GLOBAL (A+++ a G según Reglamento UE 2017/1369)
5. RECOMENDACIONES DE MEJORA`,

    // FRÍO INDUSTRIAL
    cert_frigo: `Genera un Certificado de Instalación Frigorífica según RD 138/2011 (Reglamento de Seguridad para Instalaciones Frigoríficas) en España.
${baseInfo}
Tipo instalación: ${form.tipo_instalacion || 'Cámara frigorífica industrial'}
Gas refrigerante: ${form.gas || 'R-404A'}
Carga de gas (kg): ${form.carga_gas || '10'}
Temperatura diseño: ${form.temperatura || '-18°C (congelados)'}
Potencia frigorífica: ${potencia || '15 kW'}

Certificado oficial con:
1. DATOS DEL INSTALADOR (empresa frigorista, carnet categoría B o superior)
2. DATOS DEL TITULAR Y EMPLAZAMIENTO
3. DESCRIPCIÓN DEL SISTEMA (tipo circuito, componentes principales)
4. CARACTERÍSTICAS DEL CIRCUITO FRIGORÍFICO (tabla: componente, marca, modelo, características)
5. GAS REFRIGERANTE (tipo, carga total kg, GWP, equivalencia CO2 toneladas)
6. PRESIONES DE TRABAJO (alta y baja presión en bar, temperaturas correspondientes)
7. PROTECCIONES DE SEGURIDAD (presostatos, válvulas seguridad, detectores gas)
8. CUMPLIMIENTO RD 138/2011 y F-Gas
9. DECLARACIÓN Y FIRMA`,

    fgas_registro: `Genera el modelo de Alta en Registro F-Gas y Libro de Seguimiento de gases fluorados según RD 115/2017 y Reglamento UE 517/2014.
${baseInfo}
Gas refrigerante: ${form.gas || 'R-404A'}
GWP del gas: ${form.gwp || '3922'}
Carga total (kg): ${form.carga_gas || '10'}
Equivalente CO2 (t): ${form.co2_eq || parseFloat(form.carga_gas || 10) * parseFloat(form.gwp || 3922) / 1000 + ' t CO2eq'}
Propietario del equipo: ${cliente}

Incluye:
1. DATOS DEL SISTEMA (propietario, instalador, equipo, ubicación, nº serie)
2. GAS REFRIGERANTE (tipo, GWP, carga inicial kg, equivalencia CO2)
3. REGISTRO DE CARGAS/RECUPERACIONES (tabla: fecha, tipo operación, kg añadidos/retirados, técnico, carnet F-Gas)
4. REGISTRO DE COMPROBACIONES DE FUGAS (tabla: fecha, resultado, técnico, próxima revisión)
5. PERIODICIDAD DE INSPECCIÓN según carga CO2 eq:
   - <5 t CO2eq: no obligatorio (recomendado anual)
   - 5-50 t CO2eq: cada 12 meses
   - 50-500 t CO2eq: cada 6 meses
   - >500 t CO2eq: cada 3 meses
6. OBLIGACIONES DEL OPERADOR`,

    inspeccion_fugas: `Genera un Protocolo y Acta de Comprobación de Fugas de gases fluorados según Reglamento F-Gas UE 517/2014 y RD 115/2017.
${baseInfo}
Equipo: ${form.equipo || 'Sistema de refrigeración / climatización'}
Gas: ${form.gas || 'R-404A'}
Carga: ${form.carga_gas || '10'} kg
GWP: ${form.gwp || '3922'}
CO2 eq: ${parseFloat(form.carga_gas || 10) * parseFloat(form.gwp || 3922) / 1000} t

Protocolo completo con:
1. DATOS DEL EQUIPO Y DEL TÉCNICO (carnet F-Gas categoría I o II)
2. MÉTODO DE DETECCIÓN UTILIZADO (detector electrónico, fluorescente UV, solución jabonosa)
3. PUNTOS DE INSPECCIÓN VERIFICADOS (tabla: punto, accesible S/N, resultado, observaciones):
   - Compresor (juntas, válvulas, visor)
   - Condensador (conexiones, tuberías)
   - Evaporador (conexiones, tuberías)
   - Válvulas de expansión
   - Conexiones soldadas
   - Válvulas de servicio
4. RESULTADO (SIN FUGAS / CON FUGAS - indicar punto y tasa estimada g/año)
5. ACCIONES CORRECTORAS (si aplica)
6. PRÓXIMA INSPECCIÓN obligatoria
7. FIRMA TÉCNICO CON CARNET F-GAS`,

    ficha_equipo_fgas: `Genera una Ficha de Equipo F-Gas completa para sistema de refrigeración / climatización.
${baseInfo}
Marca equipo: ${form.marca_equipo || 'XXXX'}
Modelo: ${form.modelo_equipo || 'XXXX'}
Nº de serie: ${form.num_serie || 'XXXX'}
Gas: ${form.gas || 'R-404A'}
Carga: ${form.carga_gas || '10'} kg
GWP: ${form.gwp || '3922'}
Temperatura evaporación: ${form.temp_evap || '-18°C'}
Temperatura condensación: ${form.temp_cond || '+40°C'}

Ficha completa con:
1. IDENTIFICACIÓN DEL EQUIPO (propietario, ubicación, nº serie, año instalación)
2. DATOS DEL GAS (tipo, GWP, carga inicial, equivalencia CO2, categoría F-Gas)
3. DATOS TÉCNICOS (potencia frigorífica, presiones, temperaturas diseño)
4. DATOS DE LA EMPRESA INSTALADORA / MANTENEDORA (carnet F-Gas)
5. HISTORIAL DE INTERVENCIONES (tabla para registrar todas las revisiones)
6. OBLIGACIONES LEGALES del operador según carga CO2`,

    memoria_frio: `Genera una Memoria Técnica completa de Instalación Frigorífica Industrial según RD 138/2011.
${baseInfo}
Tipo: ${form.tipo_instalacion || 'Cámara frigorífica de conservación'}
Gas: ${form.gas || 'R-404A'}
Potencia: ${potencia || '15 kW'}
Temperatura: ${form.temperatura || '-18°C'}
Descripción: ${descripcion}

Memoria con:
1. OBJETO Y EMPLAZAMIENTO
2. NORMATIVA (RD 138/2011, F-Gas, EN-378, ISO 5149)
3. DESCRIPCIÓN DEL SISTEMA (tipo ciclo, componentes, circuito)
4. TABLA DE COMPONENTES (equipo, marca, modelo, características técnicas)
5. CÁLCULO DE CARGA FRIGORÍFICA (tabla por fuente de calor: producto, paredes, infiltraciones, equipos)
6. GAS REFRIGERANTE (tipo, propiedades, carga calculada, GWP, CO2eq)
7. PRESIONES DE TRABAJO (tabla: temperatura, presión condensación, presión evaporación)
8. SISTEMAS DE SEGURIDAD (presostatos, válvulas, detección de fugas, ventilación sala)
9. PLAN DE MANTENIMIENTO PREVENTIVO`
  };

  return prompts[docId] || `Genera el documento ${docId} para instalación tipo ${type}. ${baseInfo}`;
}

export default function LegalDocs() {
  const [contacts, setContacts] = useState([]);
  const [activeType, setActiveType] = useState('solar');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedContact, setSelectedContact] = useState('');
  const [form, setForm] = useState({
    empresa: '', tecnico: '', num_carnet: '', cliente: '', nif_cliente: '',
    direccion: '', potencia: '', descripcion: '', tipo_instalacion: '',
    num_paneles: '', potencia_panel: '415', inversor: '', baterias: 'No',
    cups: '', distribuidora: '', modalidad: '', gas: 'R-410A', carga_gas: '',
    gwp: '2088', sistema: '', fluido: '', tension: '230/400 V',
    marca_equipo: '', modelo_equipo: '', num_serie: '', temp_evap: '', temp_cond: '',
    temperatura: '', equipo: '',
  });
  const [generating, setGenerating] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState(null);
  const [companyData, setCompanyData] = useState(null);
  const printRef = useRef(null);

  useEffect(() => {
    base44.entities.Contact.list('name', 300).then(setContacts);
    base44.entities.CompanySettings.list().then(d => { if (d[0]) setCompanyData(d[0]); });
  }, []);

  const contact = contacts.find(c => c.id === selectedContact);

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const generate = async () => {
    if (!selectedDoc) return;
    setGenerating(true);
    setGeneratedDoc(null);
    const prompt = buildPrompt(activeType, selectedDoc.id, {
      ...form,
      empresa: form.empresa || companyData?.company_name || '',
      tecnico: form.tecnico || '',
    }, contact);
    const res = await base44.integrations.Core.InvokeLLM({ prompt, add_context_from_internet: false });
    setGeneratedDoc({ content: res, title: selectedDoc.label, date: format(new Date(), 'dd/MM/yyyy HH:mm') });
    setGenerating(false);
  };

  const typeConfig = DOC_TYPES[activeType];

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
          <FileText className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Generador de Documentos de Legalización</h1>
          <p className="text-sm text-gray-500">Genera documentos oficiales para legalizar instalaciones solares, eléctricas, clima y refrigeración</p>
        </div>
      </div>

      <Tabs value={activeType} onValueChange={t => { setActiveType(t); setSelectedDoc(null); setGeneratedDoc(null); }}>
        <TabsList className="w-full flex-wrap h-auto gap-1">
          {Object.entries(DOC_TYPES).map(([k, v]) => (
            <TabsTrigger key={k} value={k} className="flex-1 gap-1 text-xs">
              {v.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(DOC_TYPES).map(([typeKey, typeVal]) => (
          <TabsContent key={typeKey} value={typeKey} className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Col izq: selector documento + formulario */}
              <div className="md:col-span-1 space-y-3">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">1. Selecciona el documento</CardTitle></CardHeader>
                  <CardContent className="p-3 space-y-2">
                    {typeVal.docs.map(doc => (
                      <button key={doc.id} onClick={() => { setSelectedDoc(doc); setGeneratedDoc(null); }}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${selectedDoc?.id === doc.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-gray-200 hover:border-indigo-300'}`}>
                        <p className="text-xs font-semibold">{doc.label}</p>
                        <p className={`text-[10px] mt-0.5 ${selectedDoc?.id === doc.id ? 'text-indigo-200' : 'text-gray-400'}`}>{doc.desc}</p>
                      </button>
                    ))}
                  </CardContent>
                </Card>

                {/* Links oficiales */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">📥 Documentos oficiales</CardTitle></CardHeader>
                  <CardContent className="p-3 space-y-1">
                    {(OFFICIAL_LINKS[typeKey] || []).map((l, i) => (
                      <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-blue-600 hover:underline py-1">
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />{l.label}
                      </a>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Col dcha: formulario datos + resultado */}
              <div className="md:col-span-2 space-y-3">
                {selectedDoc && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">2. Datos de la instalación</CardTitle></CardHeader>
                    <CardContent className="p-4 space-y-3">
                      {/* Cliente */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500">Empresa instaladora</label>
                          <Input value={form.empresa || companyData?.company_name || ''} onChange={e => setF('empresa', e.target.value)} placeholder="Nombre empresa" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Técnico responsable</label>
                          <Input value={form.tecnico} onChange={e => setF('tecnico', e.target.value)} placeholder="Nombre técnico" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Nº carnet / registro</label>
                          <Input value={form.num_carnet} onChange={e => setF('num_carnet', e.target.value)} placeholder="XXXX-YYYYY" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Cliente / Titular</label>
                          <Select value={selectedContact} onValueChange={v => setSelectedContact(v)}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar cliente..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sin vincular (rellenar manualmente)</SelectItem>
                              {contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.surname || ''} {c.company_name ? `— ${c.company_name}` : ''}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        {!selectedContact || selectedContact === 'none' ? (
                          <>
                            <div><label className="text-xs text-gray-500">Nombre titular</label><Input value={form.cliente} onChange={e => setF('cliente', e.target.value)} /></div>
                            <div><label className="text-xs text-gray-500">NIF titular</label><Input value={form.nif_cliente} onChange={e => setF('nif_cliente', e.target.value)} /></div>
                            <div className="col-span-2"><label className="text-xs text-gray-500">Dirección instalación</label><Input value={form.direccion} onChange={e => setF('direccion', e.target.value)} /></div>
                          </>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500">Potencia / Capacidad</label>
                          <Input value={form.potencia} onChange={e => setF('potencia', e.target.value)} placeholder="ej: 5 kWp / 15 kW / 20 kW" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Tipo de instalación</label>
                          <Input value={form.tipo_instalacion} onChange={e => setF('tipo_instalacion', e.target.value)} placeholder="ej: Vivienda unifamiliar" />
                        </div>
                      </div>

                      {/* Campos específicos por tipo */}
                      {typeKey === 'solar' && (
                        <div className="grid grid-cols-3 gap-2">
                          <div><label className="text-xs text-gray-500">Nº paneles</label><Input type="number" value={form.num_paneles} onChange={e => setF('num_paneles', e.target.value)} /></div>
                          <div><label className="text-xs text-gray-500">Wp/panel</label><Input type="number" value={form.potencia_panel} onChange={e => setF('potencia_panel', e.target.value)} /></div>
                          <div><label className="text-xs text-gray-500">Inversor</label><Input value={form.inversor} onChange={e => setF('inversor', e.target.value)} placeholder="5kW híbrido" /></div>
                          <div><label className="text-xs text-gray-500">Baterías</label><Input value={form.baterias} onChange={e => setF('baterias', e.target.value)} placeholder="Pylontech 5kWh / No" /></div>
                          <div><label className="text-xs text-gray-500">CUPS</label><Input value={form.cups} onChange={e => setF('cups', e.target.value)} placeholder="ES00000..." /></div>
                          <div><label className="text-xs text-gray-500">Distribuidora</label><Input value={form.distribuidora} onChange={e => setF('distribuidora', e.target.value)} placeholder="Endesa / Iberdrola..." /></div>
                        </div>
                      )}
                      {typeKey === 'frio' && (
                        <div className="grid grid-cols-3 gap-2">
                          <div><label className="text-xs text-gray-500">Gas refrigerante</label>
                            <Select value={form.gas} onValueChange={v => {
                              const gwps = { 'R-32': '675', 'R-410A': '2088', 'R-404A': '3922', 'R-134a': '1430', 'R-448A': '1387', 'R-449A': '1282', 'R-290': '3', 'R-744': '1' };
                              setForm(f => ({ ...f, gas: v, gwp: gwps[v] || '' }));
                            }}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {['R-32','R-410A','R-404A','R-134a','R-448A','R-449A','R-290','R-744'].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div><label className="text-xs text-gray-500">Carga gas (kg)</label><Input type="number" value={form.carga_gas} onChange={e => setF('carga_gas', e.target.value)} /></div>
                          <div><label className="text-xs text-gray-500">GWP</label><Input value={form.gwp} onChange={e => setF('gwp', e.target.value)} /></div>
                          <div><label className="text-xs text-gray-500">Temp. diseño</label><Input value={form.temperatura} onChange={e => setF('temperatura', e.target.value)} placeholder="-18°C" /></div>
                          <div><label className="text-xs text-gray-500">Marca equipo</label><Input value={form.marca_equipo} onChange={e => setF('marca_equipo', e.target.value)} /></div>
                          <div><label className="text-xs text-gray-500">Nº serie</label><Input value={form.num_serie} onChange={e => setF('num_serie', e.target.value)} /></div>
                        </div>
                      )}
                      {typeKey === 'clima' && (
                        <div className="grid grid-cols-2 gap-2">
                          <div><label className="text-xs text-gray-500">Sistema</label><Input value={form.sistema} onChange={e => setF('sistema', e.target.value)} placeholder="VRF / Split / Aerotermia..." /></div>
                          <div><label className="text-xs text-gray-500">Gas refrigerante</label>
                            <Select value={form.gas} onValueChange={v => setF('gas', v)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>{['R-32','R-410A','R-290'].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="text-xs text-gray-500">Descripción adicional / Notas</label>
                        <Input value={form.descripcion} onChange={e => setF('descripcion', e.target.value)} placeholder="Detalles adicionales para el documento..." />
                      </div>

                      <Button onClick={generate} disabled={generating} className="w-full bg-indigo-600 hover:bg-indigo-700">
                        {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generando documento...</> : <><Bot className="w-4 h-4 mr-2" />Generar {selectedDoc.label}</>}
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {!selectedDoc && (
                  <div className="flex items-center justify-center h-40 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <p className="text-sm text-gray-400">← Selecciona un documento para comenzar</p>
                  </div>
                )}

                {/* Documento generado */}
                {generatedDoc && (
                  <Card className="border-indigo-200">
                    <CardHeader className="pb-2 bg-indigo-50">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <FileText className="w-4 h-4 text-indigo-600" />{generatedDoc.title}
                        </CardTitle>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(generatedDoc.content)}>Copiar</Button>
                          <PrintButton contentRef={printRef} title={generatedDoc.title} />
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400">Generado: {generatedDoc.date} · Revisar y completar antes de presentar</p>
                    </CardHeader>
                    <CardContent className="p-5">
                      <div ref={printRef}>
                        <CompanyHeader className="pb-3 border-b mb-4" />
                        <ReactMarkdown className="text-xs prose prose-sm max-w-none prose-headings:text-gray-800 prose-table:text-xs [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-gray-300 [&_td]:p-1 [&_th]:border [&_th]:border-gray-300 [&_th]:p-1 [&_th]:bg-gray-100">
                          {generatedDoc.content}
                        </ReactMarkdown>
                        <div className="mt-8 pt-4 border-t text-[10px] text-gray-400">
                          ⚠️ Documento generado por IA con fines orientativos. Debe ser revisado, completado y firmado por técnico cualificado antes de su presentación oficial.
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}