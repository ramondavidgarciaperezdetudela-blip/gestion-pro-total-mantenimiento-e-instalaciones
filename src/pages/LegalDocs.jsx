import React, { useState, useEffect, useRef } from 'react';
import BuscadorCliente from '@/components/BuscadorCliente';
import { base44 } from '@/api/base44Client';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2, Save, Sun, Zap, Thermometer, Snowflake, Edit, Check, X, FolderOpen, Link, Download, Wrench, Euro, ClipboardList, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import CompanyHeader from '../components/CompanyHeader';
import PrintButton from '../components/PrintButton';
import LegalDocSignaturePanel from '../components/LegalDocSignaturePanel';
import SendDocumentEmailPanel from '../components/SendDocumentEmailPanel';
import { toast } from 'sonner';
import { FAMILIAS, modelosDe, buscarModelo, rellenarModelo, datosDeRelleno, cuantosModelos } from '@/lib/modelosDocumentos';

// ─── TIPOS DE DOCUMENTOS ─────────────────────────────────────────────────────
/*
 * Los modelos ya no se piden a ningún sitio. Están dentro del programa, en
 * src/lib/modelosDocumentos.js: se abren al instante, sin conexión y sin gastar
 * créditos de IA. Aquí solo se le pone el icono a cada familia.
 *
 * Antes esta lista estaba escrita a mano y no cuadraba con lo que el servidor
 * tenía: había documentos en el menú que al pedirlos no existían, y el botón se
 * quedaba girando. Ahora el menú SALE de los modelos, así que lo que se ve es
 * exactamente lo que hay.
 */
const ICONOS = {
  solar: Sun,
  electrico: Zap,
  clima: Thermometer,
  frio: Snowflake,
  trabajo: Wrench,
  comercial: Euro,
  informe: ClipboardList,
};

const DOC_TYPES = Object.fromEntries(
  Object.entries(FAMILIAS).map(([id, f]) => [id, {
    label: f.label,
    color: f.color,
    grupo: f.grupo,
    descripcion: f.descripcion,
    icon: ICONOS[id] || FileText,
    docs: modelosDe(id).map((m) => ({ id: m.id, label: m.label })),
  }]),
);

/** Las familias separadas en dos bloques, para que el menú se lea mejor. */
const GRUPOS = [
  { id: 'legalizacion', titulo: 'Legalización', familias: Object.keys(DOC_TYPES).filter((k) => DOC_TYPES[k].grupo === 'legalizacion') },
  { id: 'general', titulo: 'Resto de documentos', familias: Object.keys(DOC_TYPES).filter((k) => DOC_TYPES[k].grupo === 'general') },
];

// ─── NORMATIVA VIGENTE CON ENLACES BOE ────────────────────────────────────────
const NORMATIVA = {
  solar: [
    { label: 'RD 244/2019 Autoconsumo fotovoltaico', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2019-5089' },
    { label: 'REBT RD 842/2002 (texto consolidado)', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099' },
    { label: 'RD 1183/2020 Acceso y Conexión', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2020-17277' },
    { label: 'RD 647/2020 Modalidades autoconsumo', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2020-6614' },
  ],
  electrico: [
    { label: 'REBT RD 842/2002 (texto consolidado)', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099' },
    { label: 'RD 560/2010 ITC instalaciones eléctricas', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2010-9232' },
    { label: 'RD 614/2001 Disposiciones seguridad eléctrica', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2001-11736' },
  ],
  clima: [
    { label: 'RITE RD 1027/2007 y modificaciones', url: 'https://www.boe.es/buscar/doc.php?id=BOE-A-2021-4572' },
    { label: 'RD 390/2021 Certificación Energética (sustituyó al RD 235/2013)', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2021-9176' },
    { label: 'CTE DB-HE Ahorro de energía (Código Técnico)', url: 'https://www.codigotecnico.org/DocumentosCTE/AhorroEnergia.html' },
  ],
  frio: [
    { label: 'RSIF RD 552/2019 Instalaciones frigoríficas (consolidado)', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2019-12703' },
    { label: 'RD 115/2017 F-Gas España (consolidado)', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2017-1664' },
    { label: 'Reglamento (UE) 2024/573 F-Gas (EUR-Lex)', url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32024R0573' },
  ],
  trabajo: [
    { label: 'RITE RD 1027/2007 — IT 3 Mantenimiento', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2007-15820' },
    { label: 'RSIF RD 552/2019 Instalaciones frigoríficas', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2019-12703' },
    { label: 'RD 115/2017 Gases fluorados — registro de intervenciones', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2017-1664' },
  ],
  comercial: [
    { label: 'RD 1619/2012 Reglamento de facturación', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2012-14696' },
    { label: 'Ley 37/1992 del IVA (texto consolidado)', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740' },
    { label: 'RDL 1/2007 Defensa de consumidores y usuarios', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2007-20555' },
  ],
  informe: [
    { label: 'Ley 39/2015 Procedimiento Administrativo (declaración responsable, art. 69)', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565' },
    { label: 'Reglamento (UE) 2016/679 RGPD', url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32016R0679' },
    { label: 'Ley Orgánica 3/2018 Protección de Datos', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673' },
  ],
};

// ─── TODOS LOS GASES REFRIGERANTES ───────────────────────────────────────────
const ALL_GASES = [
  // HFCs comunes climatización
  { value: 'R-32', label: 'R-32', gwp: '675' },
  { value: 'R-410A', label: 'R-410A', gwp: '2088' },
  { value: 'R-134a', label: 'R-134a', gwp: '1430' },
  { value: 'R-407C', label: 'R-407C', gwp: '1774' },
  { value: 'R-407F', label: 'R-407F', gwp: '1825' },
  // HFCs refrigeración industrial
  { value: 'R-404A', label: 'R-404A', gwp: '3922' },
  { value: 'R-507A', label: 'R-507A', gwp: '3985' },
  { value: 'R-422D', label: 'R-422D', gwp: '2729' },
  // HFOs y mezclas bajas GWP
  { value: 'R-448A', label: 'R-448A (HFO)', gwp: '1387' },
  { value: 'R-449A', label: 'R-449A (HFO)', gwp: '1282' },
  { value: 'R-452A', label: 'R-452A (HFO)', gwp: '2140' },
  { value: 'R-452B', label: 'R-452B (HFO)', gwp: '698' },
  { value: 'R-454B', label: 'R-454B (HFO)', gwp: '466' },
  { value: 'R-454C', label: 'R-454C (HFO)', gwp: '148' },
  { value: 'R-455A', label: 'R-455A (HFO)', gwp: '148' },
  { value: 'R-1234yf', label: 'R-1234yf (HFO)', gwp: '4' },
  { value: 'R-1234ze', label: 'R-1234ze (HFO)', gwp: '7' },
  // Naturales
  { value: 'R-290', label: 'R-290 (Propano)', gwp: '3' },
  { value: 'R-600a', label: 'R-600a (Isobutano)', gwp: '3' },
  { value: 'R-717', label: 'R-717 (Amoniaco/NH3)', gwp: '0' },
  { value: 'R-744', label: 'R-744 (CO2)', gwp: '1' },
  { value: 'R-170', label: 'R-170 (Etano)', gwp: '6' },
  // Otros
  { value: 'R-22', label: 'R-22 (uso restringido)', gwp: '1810' },
  { value: 'otro', label: 'Otro gas (especificar)', gwp: '' },
];

function buildPrompt(typeKey, docId, form, contact, companyData) {
  const today = format(new Date(), 'dd/MM/yyyy');
  const empresa = form.empresa || companyData?.company_name || 'EMPRESA INSTALADORA, S.L.';
  const tecnico = form.tecnico || 'Técnico cualificado';
  const nif_empresa = companyData?.nif || form.nif_empresa || 'B00000000';
  const direccion_empresa = companyData ? `${companyData.address || ''}, ${companyData.city || ''} ${companyData.province || ''}`.trim() : (form.direccion_empresa || '');
  const tel_empresa = companyData?.phone || form.tel_empresa || '';
  const email_empresa = companyData?.email || form.email_empresa || '';
  const cliente = contact ? `${contact.name} ${contact.surname || ''}`.trim() : (form.cliente || 'TITULAR DE LA INSTALACIÓN');
  const nif_cliente = contact?.nif || form.nif_cliente || 'XXXXXXXX-X';
  const tel_cliente = contact?.phone || '';
  const direccion = contact ? `${contact.address || ''}, ${contact.city || ''} ${contact.postal_code || ''} (${contact.province || ''})` : (form.direccion || 'DIRECCIÓN DE LA INSTALACIÓN');

  const baseInfo = `
EMPRESA INSTALADORA: ${empresa}
NIF empresa: ${nif_empresa}
Dirección empresa: ${direccion_empresa}
Teléfono empresa: ${tel_empresa}
Email empresa: ${email_empresa}
Técnico responsable: ${tecnico}
Nº carnet/registro: ${form.num_carnet || 'XXXX-XXXX'}
TITULAR/CLIENTE: ${cliente}
NIF titular: ${nif_cliente}
Teléfono titular: ${tel_cliente}
DIRECCIÓN DE LA INSTALACIÓN: ${direccion}
Fecha del documento: ${today}
Potencia/Capacidad: ${form.potencia || '(indicar potencia)'}
Descripción adicional: ${form.descripcion || ''}
`;

  const specific = {
    solar: `Nº paneles: ${form.num_paneles || 'XX'} · Potencia panel: ${form.potencia_panel || '415'} Wp · Inversor: ${form.inversor || 'inversor híbrido'} · Baterías: ${form.baterias || 'No'} · CUPS: ${form.cups || 'ES0000000000000000XX'} · Distribuidora: ${form.distribuidora || 'distribuidora eléctrica'}`,
    frio: `Gas refrigerante: ${form.gas || 'R-410A'} · GWP: ${form.gwp || '2088'} · Carga gas: ${form.carga_gas || 'XX'} kg · CO2eq: ${(parseFloat(form.carga_gas||0)*parseFloat(form.gwp||2088)/1000).toFixed(2)} t · Temperatura diseño: ${form.temperatura || '-18°C'} · Marca equipo: ${form.marca_equipo || ''} · Modelo: ${form.modelo_equipo || ''} · Nº serie: ${form.num_serie || ''}`,
    clima: `Sistema: ${form.sistema || 'split/VRF/bomba de calor'} · Gas: ${form.gas || 'R-32'} · Fluido caloportador: ${form.fluido || 'aire'}`,
    electrico: `Tipo instalación: ${form.tipo_instalacion || 'interior'} · Tensión: ${form.tension || '230/400V'}`,
  }[typeKey] || '';

  const instructions = {
    mtd_solar: `Genera una MEMORIA TÉCNICA DE DISEÑO (MTD) COMPLETA para instalación fotovoltaica de autoconsumo según modelo oficial MINCOTUR y RD 244/2019.
INSTRUCCIONES CRÍTICAS:
- Genera UN ÚNICO DOCUMENTO completo y coherente
- USA TABLAS HTML (no markdown) para todos los datos técnicos: <table border="1" style="border-collapse:collapse;width:100%"><tr><th>Col1</th><th>Col2</th></tr><tr><td>dato</td><td>dato</td></tr></table>
- Formato oficial con secciones numeradas
- Rellena con los datos proporcionados y usa "___________" para campos que el usuario debe completar
- NO incluyas links de internet ni URLs`,

    cie_solar: `Genera un CERTIFICADO DE INSTALACIÓN ELÉCTRICA (CIE) OFICIAL para instalación fotovoltaica según modelo REBT.
INSTRUCCIONES CRÍTICAS:
- Genera UN ÚNICO DOCUMENTO en formato certificado oficial
- USA TABLAS HTML para datos técnicos (protecciones, conductores)
- Incluye espacio para firma y sello
- NO incluyas links de internet`,

    boletin_solar: `Genera un BOLETÍN OFICIAL DE INSTALACIÓN ELÉCTRICA DE BAJA TENSIÓN para instalación fotovoltaica.
INSTRUCCIONES CRÍTICAS:
- Genera UN ÚNICO BOLETÍN con todos los campos
- USA TABLAS HTML para circuitos, protecciones y conductores
- NO incluyas links de internet`,

    cau_solar: `Genera una COMUNICACIÓN DE AUTOCONSUMO (CAU) completa para presentar a la distribuidora según RD 244/2019.
INSTRUCCIONES CRÍTICAS:
- Genera UN ÚNICO FORMULARIO oficial
- USA TABLAS HTML donde sea apropiado
- NO incluyas links de internet`,

    cie_bt: `Genera un CERTIFICADO DE INSTALACIÓN ELÉCTRICA (CIE) DE BAJA TENSIÓN completo según REBT RD 842/2002.
INSTRUCCIONES CRÍTICAS:
- Genera UN ÚNICO CERTIFICADO oficial
- USA TABLAS HTML para la relación de circuitos y protecciones
- Incluye espacio para firma del instalador autorizado
- NO incluyas links de internet`,

    boletin_bt: `Genera un BOLETÍN OFICIAL DE INSTALACIÓN ELÉCTRICA DE BAJA TENSIÓN completo.
INSTRUCCIONES CRÍTICAS:
- Genera UN ÚNICO BOLETÍN
- USA TABLAS HTML para circuitos, protecciones y conductores
- NO incluyas links de internet`,

    memoria_bt: `Genera una MEMORIA DESCRIPTIVA COMPLETA DE INSTALACIÓN ELÉCTRICA DE BAJA TENSIÓN según REBT.
INSTRUCCIONES CRÍTICAS:
- Genera UNA ÚNICA MEMORIA
- USA TABLAS HTML para cálculo de secciones y protecciones
- NO incluyas links de internet`,

    cert_rite: `Genera un CERTIFICADO DE INSTALACIÓN TÉRMICA COMPLETO según RITE RD 1027/2007.
INSTRUCCIONES CRÍTICAS:
- Genera UN ÚNICO CERTIFICADO oficial
- USA TABLAS HTML para la relación de equipos instalados (equipo, marca, modelo, potencia, rendimiento)
- Incluye espacio para firma del instalador autorizado RITE
- NO incluyas links de internet`,

    memoria_rite: `Genera una MEMORIA TÉCNICA COMPLETA DE INSTALACIÓN TÉRMICA según RITE.
INSTRUCCIONES CRÍTICAS:
- Genera UNA ÚNICA MEMORIA
- USA TABLAS HTML para cargas térmicas por zona y características de equipos
- NO incluyas links de internet`,

    libro_mant_rite: `Genera un LIBRO DE MANTENIMIENTO COMPLETO para instalación de climatización según IT 3 del RITE.
INSTRUCCIONES CRÍTICAS:
- Genera UN ÚNICO LIBRO de mantenimiento
- USA TABLAS HTML para el programa de mantenimiento y hojas de registro
- NO incluyas links de internet`,

    cert_frigo: `Genera un CERTIFICADO DE INSTALACIÓN FRIGORÍFICA COMPLETO según el RSIF (RD 552/2019).
INSTRUCCIONES CRÍTICAS:
- Genera UN ÚNICO CERTIFICADO oficial
- USA TABLAS HTML para características del circuito frigorífico y componentes
- Incluye espacio para firma del instalador frigorista
- NO incluyas links de internet`,

    fgas_registro: `Genera el REGISTRO F-GAS COMPLETO con Libro de Seguimiento de gases fluorados según el RD 115/2017 y el Reglamento (UE) 2024/573.
INSTRUCCIONES CRÍTICAS:
- Genera UN ÚNICO DOCUMENTO de registro
- USA TABLAS HTML para el registro de cargas/recuperaciones y comprobaciones de fugas
- NO incluyas links de internet`,

    ficha_equipo_fgas: `Genera una FICHA DE EQUIPO F-GAS COMPLETA para sistema de refrigeración/climatización.
INSTRUCCIONES CRÍTICAS:
- Genera UNA ÚNICA FICHA
- USA TABLAS HTML para datos técnicos e historial de intervenciones
- NO incluyas links de internet`,
  }[docId] || `Genera el documento ${docId} completo y oficial.`;

  return `${instructions}

DATOS PARA EL DOCUMENTO:
${baseInfo}
Datos específicos: ${specific}

REGLAS DE FORMATO ESTRICTAS (seguir siempre igual):
- Responde ÚNICAMENTE con HTML puro. NUNCA uses bloques de código markdown (\`\`\`html), NUNCA uses triple backtick.
- Estructura SIEMPRE: <h2> para secciones principales numeradas (1., 2., 3...), <h3> para subsecciones, <p> para texto, <table> para datos técnicos.
- Las tablas SIEMPRE con este formato exacto: <table border="1" style="border-collapse:collapse;width:100%"><thead><tr><th>...</th></tr></thead><tbody><tr><td>...</td></tr></tbody></table>
- El documento en español, profesional y completo con estructura oficial.
- NO incluyas <!DOCTYPE>, <html>, <head>, <body> — solo el contenido interior del documento.
- El resultado debe ser siempre del mismo tipo de estructura para el mismo tipo de documento.`;
}

export default function LegalDocs() {
  const urlParams = new URLSearchParams(window.location.search);
  const preContactId = urlParams.get('contact_id');

  const [contacts, setContacts] = useState([]);
  const [activeType, setActiveType] = useState('solar');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedContact, setSelectedContact] = useState(preContactId || '');
  const [selectedTechnician, setSelectedTechnician] = useState(null);
  const [form, setForm] = useState({
    empresa: '', tecnico: '', num_carnet: '', cliente: '', nif_cliente: '',
    direccion: '', potencia: '', descripcion: '', tipo_instalacion: '',
    num_paneles: '', potencia_panel: '415', inversor: '', baterias: 'No',
    cups: '', distribuidora: '', gas: 'R-410A', carga_gas: '',
    gwp: '2088', sistema: '', fluido: '', tension: '230/400 V',
    marca_equipo: '', modelo_equipo: '', num_serie: '', temperatura: '',
  });
  const [generating, setGenerating] = useState(false);
  const [docContent, setDocContent] = useState('');
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [companyData, setCompanyData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedDocs, setSavedDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  // Plantillas que el usuario ha guardado o editado él, por familia y modelo.
  // Mandan sobre las de fábrica. { clima: { cert_rite: '<h2>…' } }
  const [misPlantillas, setMisPlantillas] = useState({});
  const [guardandoModelos, setGuardandoModelos] = useState(false);
  const [technicianSignature, setTechnicianSignature] = useState(null);
  const [clientSignature, setClientSignature] = useState(null);
  const printRef = useRef(null);

  useEffect(() => {
    // Sin .catch() esto lanzaba un error suelto al arrancar sin conexión. Los
    // clientes y los datos de empresa son un extra para rellenar los huecos:
    // si no llegan, los modelos se abren igual y se escriben a mano.
    Promise.all([
      base44.entities.Contact.list('name', 300),
      base44.entities.CompanySettings.list(),
    ]).then(([cs, settings]) => {
      setContacts(cs || []);
      if (settings?.[0]) setCompanyData(settings[0]);
    }).catch(() => setContacts([]));
    loadDefaultTemplates();
  }, []);

  /**
   * Cargar los modelos.
   *
   * Antes esto era una llamada a la IA pidiéndole que se inventara las
   * plantillas. Si fallaba —y falla: sin cobertura, sin créditos, o el modelo
   * retirado— la pantalla se quedaba sin nada y luego el botón de generar se
   * colgaba intentándolo otra vez.
   *
   * Ahora los modelos están en el programa y salen al instante. Lo único que
   * se va a buscar al servidor son las plantillas que el usuario haya guardado
   * o editado él, que mandan sobre las de fábrica. Si el servidor no contesta,
   * no pasa nada: se sigue con las de fábrica.
   */
  const loadDefaultTemplates = async () => {
    const propias = {};
    try {
      const guardadas = await base44.entities.DocumentTemplate.list();
      for (const t of guardadas || []) {
        if (!t?.notes_template || !t?.doc_type) continue;
        const nombre = String(t.name || '').replace(/^LEGAL:\s*/i, '').trim();
        const modelo = modelosDe(t.doc_type).find((m) => m.label === nombre || m.id === t.template_key);
        if (!modelo) continue;
        (propias[t.doc_type] ||= {})[modelo.id] = t.notes_template;
      }
    } catch {
      // Sin conexión no hay plantillas propias, pero las de fábrica están aquí.
    }
    setMisPlantillas(propias);
  };

  useEffect(() => {
    if (selectedContact) loadSavedDocs();
  }, [selectedContact]);

  const loadSavedDocs = async () => {
    if (!selectedContact) return;
    setLoadingDocs(true);
    try {
      const docs = await base44.entities.ClientDocument.filter({ contact_id: selectedContact, doc_type: 'informe' });
      // Los que salieron de esta pantalla: los nuevos y los de antes.
      setSavedDocs((docs || []).filter(d => /^(MODELO|LEGAL):/i.test(d.title || '')));
    } catch {
      setSavedDocs([]);
    } finally {
      setLoadingDocs(false);
    }
  };

  const contact = contacts.find(c => c.id === selectedContact);
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const cleanHtml = (raw) => {
    // Eliminar bloques ```html ... ``` y similares
    return raw
      .replace(/^```html\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
  };

  /** Lo que el programa ya sabe: empresa, cliente, técnico, equipo, gas… */
  const datosParaRellenar = () => datosDeRelleno({
    form,
    contacto: contact,
    empresa: companyData,
  });

  /** El modelo tal y como se va a abrir: el del usuario si lo tiene, si no el de fábrica. */
  const modeloDe = (familia, id) => {
    const propia = misPlantillas[familia]?.[id];
    if (propia) return { contenido: propia, propia: true };
    const modelo = buscarModelo(familia, id);
    return modelo ? { contenido: modelo.contenido, propia: false } : null;
  };

  /**
   * Abrir el documento.
   *
   * Esto ya no llama a nadie: el modelo está en el programa, se rellena con lo
   * que se sabe y sale. Instantáneo y sin conexión.
   *
   * El try/finally no es adorno. Antes no estaba, y cuando la IA fallaba el
   * botón se quedaba en "Generando documento..." para siempre y había que
   * cerrar el programa. Ahora, pase lo que pase, el botón vuelve.
   */
  const generate = async () => {
    if (!selectedDoc) return;
    setGenerating(true);
    try {
      setEditing(false);
      setTechnicianSignature(null);
      setClientSignature(null);

      const elegido = modeloDe(activeType, selectedDoc.id);
      if (!elegido) {
        toast.error('Ese modelo no está en el programa. Elige otro de la lista.');
        return;
      }

      const contenido = rellenarModelo(elegido.contenido, datosParaRellenar());
      setDocContent(contenido);
      setEditContent(contenido);
      toast.success(elegido.propia
        ? '📋 Abierto tu modelo guardado, listo para rellenar'
        : '📋 Modelo abierto, listo para rellenar');
    } catch (e) {
      // No debería pasar nunca, pero si pasa se dice y el botón se libera.
      toast.error('No se ha podido abrir el modelo: ' + (e?.message || 'error desconocido'));
    } finally {
      setGenerating(false);
    }
  };

  /**
   * Extra opcional: pedirle a la IA que redacte una versión más desarrollada.
   *
   * Es un botón aparte a propósito. El documento ya lo tienes sin esto; esto
   * solo añade. Si la IA no contesta, se avisa y te quedas con el modelo, que
   * es lo que antes no pasaba.
   */
  const ampliarConIA = async () => {
    if (!selectedDoc) return;
    setGenerating(true);
    try {
      const prompt = buildPrompt(activeType, selectedDoc.id, form, contact, companyData);
      const res = await base44.integrations.Core.InvokeLLM({ prompt, add_context_from_internet: false });
      const contenido = rellenarModelo(cleanHtml(res), datosParaRellenar());
      if (!contenido.trim()) throw new Error('la IA no ha devuelto nada');
      setDocContent(contenido);
      setEditContent(contenido);
      setEditing(false);
      toast.success('🤖 Redactado por la IA. Revísalo antes de firmarlo.');
    } catch {
      toast.error('La IA no ha podido redactarlo. Tienes el modelo del programa, que no la necesita.');
    } finally {
      setGenerating(false);
    }
  };

  const startEditing = () => {
    setEditContent(docContent);
    setEditing(true);
  };

  const saveEdit = () => {
    // editContent se actualiza en onInput, pero por si acaso también leemos el div
    setDocContent(editContent);
    setEditing(false);
  };

  const saveToClient = async () => {
    if (!selectedContact || !docContent) {
      toast.error('Selecciona un cliente antes de guardar');
      return;
    }
    setSaving(true);

    // Insertar las firmas en el documento si existen
    let finalContent = docContent;
    if (technicianSignature) {
      const techDate = technicianSignature.date ? new Date(technicianSignature.date).toLocaleDateString('es-ES') : format(new Date(), 'dd/MM/yyyy');
      finalContent = finalContent.replace(
        'Firma: ☐',
        `Firma: <img src="${technicianSignature.signature}" style="max-width:100px;height:auto"/><br/><small>${technicianSignature.name}</small><br/><small>Fecha: ${techDate}</small>`
      );
      finalContent = finalContent.replace(
        /<th[^>]*>FIRMA<\/th>/,
        `<th>${technicianSignature.name}</th>`
      );
      finalContent = finalContent.replace(
        /Técnico responsable:|Técnico Frigorista:|Instalador:/gi,
        `$& ${technicianSignature.name}`
      );
      finalContent = finalContent.replace(
        /Fecha de instalación|Fecha del documento|Fecha:/gi,
        `$& ${techDate}`
      );
    }
    if (clientSignature) {
      finalContent = finalContent.replace(
        /Firma: ☐(\s|<)/g,
        `Firma: <img src="${clientSignature.signature}" style="max-width:100px;height:auto"/> $1`
      );
    }

    // El prefijo es la marca de que el documento salió de esta pantalla; se
    // quita al mostrarlo. Se sigue admitiendo el "LEGAL:" de antes al leer.
    const title = `MODELO: ${selectedDoc?.label || 'Documento'} — ${format(new Date(), 'dd/MM/yyyy')}`;
    try {
      await base44.entities.ClientDocument.create({
        contact_id: selectedContact,
        contact_name: contact ? `${contact.name} ${contact.surname || ''}`.trim() : '',
        title,
        doc_type: 'informe',
        description: finalContent,
        date: format(new Date(), 'yyyy-MM-dd'),
      });
      toast.success('Documento guardado en la ficha del cliente');
      loadSavedDocs();
    } catch (e) {
      toast.error('No se ha podido guardar: ' + (e?.message || 'revisa la conexión'));
    } finally {
      // Sin este finally el botón se quedaba en "Guardando..." si fallaba.
      setSaving(false);
    }
  };

  const deleteSavedDoc = async (id) => {
    if (!confirm('¿Eliminar este documento guardado?')) return;
    try {
      await base44.entities.ClientDocument.delete(id);
      loadSavedDocs();
    } catch (e) {
      toast.error('No se ha podido borrar: ' + (e?.message || 'revisa la conexión'));
    }
  };

  const downloadAsHTML = () => {
    if (!docContent) return;
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${selectedDoc?.label || 'Documento'}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; color: #333; }
    h2 { border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; margin: 20px 0 10px; }
    h3 { margin: 15px 0 8px; color: #374151; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
    th { background: #f3f4f6; font-weight: 600; }
    p { margin: 8px 0; }
  </style>
</head>
<body>
  ${docContent}
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc; font-size: 11px; color: #999;">
    <p>Documento generado automáticamente - Revisar y firmar antes de presentar</p>
  </div>
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedDoc?.label || 'documento'}.html`;
    a.click();
  };

  /**
   * Guardar los modelos de fábrica como plantillas propias, para poder
   * editarlos a gusto en la pantalla de Plantillas.
   *
   * Esto ANTES era el botón "Descargar plantillas", y llamaba a una función del
   * servidor (downloadLegalDocuments) que había que tener publicada en Base44.
   * Si no lo estaba —que es lo que pasaba— el botón se quedaba girando y no
   * bajaba ningún documento.
   *
   * Ya no descarga nada: los modelos están dentro del programa. Esto solo hace
   * una copia editable de los que aún no tengas, aquí mismo, y si el servidor
   * no responde te lo dice en vez de quedarse colgado.
   */
  const guardarModelosComoPlantillas = async () => {
    const familia = activeType;
    const modelos = modelosDe(familia);
    if (modelos.length === 0) return;

    setGuardandoModelos(true);
    try {
      const yaTengo = misPlantillas[familia] || {};
      const nuevas = modelos
        .filter((m) => !yaTengo[m.id])
        .map((m) => ({
          name: m.label,
          doc_type: familia,
          template_key: m.id,
          primary_color: '#1e3a5f',
          secondary_color: '#0ea5e9',
          header_text: m.label,
          footer_text: 'Revisar y firmar antes de presentar',
          show_logo: true,
          show_iban: false,
          show_signature_box: true,
          font_size: 'medium',
          iva_rate: 21,
          is_default: false,
          notes_template: m.contenido,
        }));

      if (nuevas.length === 0) {
        toast.info(`Ya tienes copia editable de los ${modelos.length} modelos de ${DOC_TYPES[familia]?.label}`);
        return;
      }

      await base44.entities.DocumentTemplate.bulkCreate(nuevas);
      toast.success(`✅ ${nuevas.length} modelos de ${DOC_TYPES[familia]?.label} copiados a tus plantillas`);
      await loadDefaultTemplates();
    } catch (e) {
      toast.error('No se han podido copiar a tus plantillas: ' + (e?.message || 'revisa la conexión') + '. Los modelos siguen aquí y funcionan igual.');
    } finally {
      // Pase lo que pase el botón vuelve. Este finally es el arreglo.
      setGuardandoModelos(false);
    }
  };

  const loadSavedDocContent = (doc) => {
    setDocContent(doc.description || '');
    setEditContent(doc.description || '');
    setEditing(false);
    // Encontrar el tipo de doc si es posible
    toast.success('Documento cargado para visualización/edición');
  };

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Modelos de documento</h1>
            <p className="text-sm text-gray-500">
              Legalizaciones, partes, contratos, presupuestos e informes. Los {cuantosModelos()} modelos
              están dentro del programa: no hay que descargar nada, funcionan sin cobertura.
            </p>
          </div>
        </div>
        <Button
          onClick={guardarModelosComoPlantillas}
          disabled={guardandoModelos}
          variant="outline"
          className="gap-2 whitespace-nowrap"
          title="Hace una copia editable de estos modelos en la pantalla de Plantillas"
        >
          {guardandoModelos ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Copiando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Copiar a mis plantillas
            </>
          )}
        </Button>
      </div>

      {/* Selector de cliente global */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Vincular a cliente:</span>
            </div>
            <div className="flex-1 min-w-48">
              <BuscadorCliente
                contacts={contacts}
                value={selectedContact}
                onValueChange={setSelectedContact}
                placeholder="Seleccionar cliente (opcional)"
              />
            </div>
            {contact && (
              <Badge className="bg-blue-100 text-blue-800">
                📍 {contact.address ? `${contact.city || contact.address}` : contact.name}
              </Badge>
            )}
          </div>

          {/* Documentos guardados del cliente */}
          {selectedContact && selectedContact !== 'none' && savedDocs.length > 0 && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1">
                <FolderOpen className="w-3.5 h-3.5" /> Documentos guardados de este cliente ({savedDocs.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {savedDocs.map(d => (
                  <div key={d.id} className="flex items-center gap-1 bg-white rounded border border-blue-200 px-2 py-1">
                    <button onClick={() => loadSavedDocContent(d)} className="text-xs text-blue-700 hover:underline max-w-48 truncate text-left">
                      {d.title?.replace(/^(MODELO|LEGAL):\s*/i, '')}
                    </button>
                    <button onClick={() => deleteSavedDoc(d.id)} className="text-red-400 hover:text-red-600 ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Columna izquierda */}
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">1. Tipo de documento</CardTitle></CardHeader>
            <CardContent className="p-3 space-y-3">
              {GRUPOS.map(g => (
                <div key={g.id} className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 px-1">{g.titulo}</p>
                  {g.familias.map(k => (
                    <button key={k} onClick={() => { setActiveType(k); setSelectedDoc(null); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all ${activeType === k ? 'bg-indigo-600 text-white' : 'bg-gray-50 hover:bg-indigo-50 text-gray-700 border border-gray-200'}`}>
                      <span className="block">{DOC_TYPES[k].label}</span>
                      <span className={`block text-[10px] font-normal mt-0.5 ${activeType === k ? 'text-indigo-100' : 'text-gray-400'}`}>
                        {DOC_TYPES[k].docs.length} modelos
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">2. Modelo a rellenar</CardTitle>
              <p className="text-[10px] text-gray-400 mt-0.5">{DOC_TYPES[activeType]?.descripcion}</p>
            </CardHeader>
            <CardContent className="p-3 space-y-1" data-prueba="lista-modelos">
              {DOC_TYPES[activeType]?.docs.map(doc => (
                <button key={doc.id} onClick={() => { setSelectedDoc(doc); setDocContent(''); setEditing(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all ${selectedDoc?.id === doc.id ? 'bg-indigo-600 text-white' : 'bg-gray-50 hover:bg-indigo-50 text-gray-700 border border-gray-200'}`}>
                  {doc.label}
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Normativa de referencia */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">📋 Normativa — enlaces BOE</CardTitle></CardHeader>
            <CardContent className="p-3 space-y-1">
              {(NORMATIVA[activeType] || []).map((n, i) => (
                <a key={i} href={n.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-start gap-1.5 text-xs py-1.5 border-b border-gray-100 last:border-0 text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded px-1 transition-colors group">
                  <span className="mt-0.5 flex-shrink-0 text-blue-400 group-hover:text-blue-600">↗</span>
                  <span className="underline underline-offset-2">{n.label}</span>
                </a>
              ))}
              <p className="text-[10px] text-gray-400 pt-1">* Los enlaces abren el texto oficial en el BOE/EUR-Lex</p>
            </CardContent>
          </Card>
        </div>

        {/* Columna derecha */}
        <div className="md:col-span-2 space-y-3">
          {selectedDoc && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">3. Datos que se rellenan solos</CardTitle>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Lo que pongas aquí (y los datos del cliente) va directo a los huecos del modelo.
                  Lo que dejes vacío se queda con la línea de puntos para escribirlo a mano.
                </p>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">Empresa instaladora</label>
                    <Input value={form.empresa || companyData?.company_name || ''} onChange={e => setF('empresa', e.target.value)} placeholder="Nombre empresa" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Técnico responsable</label>
                    {companyData?.technicians && companyData.technicians.length > 0 ? (
                      <>
                        <Select value={selectedTechnician || ''} onValueChange={v => {
                          let tech = null;
                          if (v !== '__otro__') {
                            const techIdx = companyData.technicians.findIndex((t, idx) => {
                              const key = t?.id || `tech-${idx}`;
                              return key === v;
                            });
                            if (techIdx >= 0) {
                              tech = companyData.technicians[techIdx];
                            }
                          }
                          setSelectedTechnician(v);
                          if (tech) {
                            setF('tecnico', tech.name || '');
                            setF('num_carnet', tech.fgas_carnet || '');
                          }
                        }}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar técnico" /></SelectTrigger>
                          <SelectContent>
                            {companyData.technicians.map((t, idx) => {
                              const key = t?.id || `tech-${idx}`;
                              const name = t?.name || '';
                              const creds = t?.fgas_carnet ? `F-Gas: ${t.fgas_carnet}` : (t?.rite_certificate ? `RITE: ${t.rite_certificate}` : '');
                              return name ? (
                                <SelectItem key={key} value={key}>
                                  {name} {creds && `(${creds})`}
                                </SelectItem>
                              ) : null;
                            })}
                            <SelectItem value="__otro__">Otro (escribir manualmente)</SelectItem>
                          </SelectContent>
                        </Select>
                        {selectedTechnician === '__otro__' && (
                          <Input className="mt-1" placeholder="Nombre técnico" onChange={e => setF('tecnico', e.target.value)} />
                        )}
                      </>
                    ) : (
                      <Input value={form.tecnico} onChange={e => setF('tecnico', e.target.value)} placeholder="Nombre técnico" />
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Nº carnet / registro autonómico</label>
                    <Input value={form.num_carnet} onChange={e => setF('num_carnet', e.target.value)} placeholder="XXXX-YYYYY" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Potencia / Capacidad</label>
                    <Input value={form.potencia} onChange={e => setF('potencia', e.target.value)} placeholder="ej: 5 kWp / 15 kW" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Tipo de instalación</label>
                    <Input value={form.tipo_instalacion} onChange={e => setF('tipo_instalacion', e.target.value)} placeholder="ej: Vivienda unifamiliar" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Descripción adicional</label>
                    <Input value={form.descripcion} onChange={e => setF('descripcion', e.target.value)} placeholder="Detalles adicionales..." />
                  </div>
                </div>

                {/* Campos específicos solar */}
                {activeType === 'solar' && (
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t">
                    <div><label className="text-xs text-gray-500">Nº paneles</label><Input type="number" value={form.num_paneles} onChange={e => setF('num_paneles', e.target.value)} /></div>
                    <div><label className="text-xs text-gray-500">Wp/panel</label><Input type="number" value={form.potencia_panel} onChange={e => setF('potencia_panel', e.target.value)} /></div>
                    <div><label className="text-xs text-gray-500">Inversor</label><Input value={form.inversor} onChange={e => setF('inversor', e.target.value)} placeholder="5kW híbrido" /></div>
                    <div><label className="text-xs text-gray-500">Baterías</label><Input value={form.baterias} onChange={e => setF('baterias', e.target.value)} placeholder="Pylontech 5kWh / No" /></div>
                    <div><label className="text-xs text-gray-500">CUPS</label><Input value={form.cups} onChange={e => setF('cups', e.target.value)} placeholder="ES00000..." /></div>
                    <div><label className="text-xs text-gray-500">Distribuidora</label><Input value={form.distribuidora} onChange={e => setF('distribuidora', e.target.value)} placeholder="Endesa / Iberdrola..." /></div>
                  </div>
                )}

                {/* Campos específicos frío */}
                {activeType === 'frio' && (
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t">
                    <div className="col-span-2">
                      <label className="text-xs text-gray-500">Gas refrigerante</label>
                      <Select value={form.gas} onValueChange={v => {
                        const g = ALL_GASES.find(x => x.value === v);
                        setForm(f => ({ ...f, gas: v, gwp: g?.gwp || f.gwp, gas_custom: '' }));
                      }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent className="max-h-64">
                          {ALL_GASES.map(g => <SelectItem key={g.value} value={g.value}>{g.label}{g.gwp ? ` — GWP ${g.gwp}` : ''}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {form.gas === 'otro' && (
                        <Input className="mt-1" placeholder="Especificar gas (ej: R-513A)" value={form.gas_custom || ''} onChange={e => setF('gas_custom', e.target.value)} />
                      )}
                    </div>
                    <div><label className="text-xs text-gray-500">GWP</label><Input value={form.gwp} onChange={e => setF('gwp', e.target.value)} placeholder="GWP del gas" /></div>
                    <div><label className="text-xs text-gray-500">Carga gas (kg)</label><Input type="number" value={form.carga_gas} onChange={e => setF('carga_gas', e.target.value)} /></div>
                    <div><label className="text-xs text-gray-500">Temp. diseño</label><Input value={form.temperatura} onChange={e => setF('temperatura', e.target.value)} placeholder="-18°C" /></div>
                    <div><label className="text-xs text-gray-500">Marca equipo</label><Input value={form.marca_equipo} onChange={e => setF('marca_equipo', e.target.value)} /></div>
                    <div><label className="text-xs text-gray-500">Nº serie</label><Input value={form.num_serie} onChange={e => setF('num_serie', e.target.value)} /></div>
                  </div>
                )}

                {/* Campos específicos clima */}
                {activeType === 'clima' && (
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t">
                    <div><label className="text-xs text-gray-500">Sistema</label><Input value={form.sistema} onChange={e => setF('sistema', e.target.value)} placeholder="VRF / Split / Aerotermia..." /></div>
                    <div>
                      <label className="text-xs text-gray-500">Gas refrigerante</label>
                      <Select value={form.gas} onValueChange={v => {
                        const g = ALL_GASES.find(x => x.value === v);
                        setForm(f => ({ ...f, gas: v, gwp: g?.gwp || f.gwp, gas_custom: '' }));
                      }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent className="max-h-64">
                          {ALL_GASES.map(g => <SelectItem key={g.value} value={g.value}>{g.label}{g.gwp ? ` — GWP ${g.gwp}` : ''}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {form.gas === 'otro' && (
                        <Input className="mt-1" placeholder="Especificar gas (ej: R-513A)" value={form.gas_custom || ''} onChange={e => setF('gas_custom', e.target.value)} />
                      )}
                    </div>
                  </div>
                )}

                <Button onClick={generate} disabled={generating} className="w-full bg-indigo-600 hover:bg-indigo-700">
                  {generating
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Abriendo...</>
                    : <><FileText className="w-4 h-4 mr-2" />Abrir {selectedDoc.label}</>}
                </Button>
                <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                  <p className="text-[10px] text-gray-400">
                    El modelo está en el programa: se abre al instante y funciona sin cobertura.
                  </p>
                  <Button onClick={ampliarConIA} disabled={generating} size="sm" variant="ghost"
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 gap-1 h-7"
                    title="Opcional: pedirle a la IA una redacción más desarrollada. Si falla, te quedas con el modelo.">
                    <Sparkles className="w-3.5 h-3.5" />
                    Redactar con IA (opcional)
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!selectedDoc && !docContent && (
            <div className="flex items-center justify-center h-40 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <p className="text-sm text-gray-400">← Selecciona tipo e instalación para comenzar</p>
            </div>
          )}

          {/* Documento generado / editado */}
          {docContent && (
            <Card className="border-indigo-200">
              <CardHeader className="pb-2 bg-indigo-50">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    {selectedDoc?.label || 'Documento'}
                    {contact && <Badge className="bg-blue-100 text-blue-700 text-[10px]">📌 {contact.name} {contact.surname || ''}</Badge>}
                  </CardTitle>
                  <div className="flex gap-2 flex-wrap">
                    {!editing ? (
                      <Button size="sm" variant="outline" onClick={startEditing}>
                        <Edit className="w-3.5 h-3.5 mr-1" />Editar
                      </Button>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" className="text-green-700 border-green-300" onClick={saveEdit}>
                          <Check className="w-3.5 h-3.5 mr-1" />Aplicar cambios
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-500" onClick={() => setEditing(false)}>
                          <X className="w-3.5 h-3.5 mr-1" />Cancelar
                        </Button>
                      </>
                    )}
                    {selectedContact && selectedContact !== 'none' && !editing && (
                       <Button size="sm" onClick={saveToClient} disabled={saving} className="bg-green-600 hover:bg-green-700">
                         <Save className="w-3.5 h-3.5 mr-1" />{saving ? 'Guardando...' : 'Guardar en cliente'}
                       </Button>
                     )}
                     {!editing && <PrintButton contentRef={printRef} title={selectedDoc?.label || 'Documento'} />}
                                {!editing && (
                                  <Button size="sm" variant="outline" onClick={downloadAsHTML}>
                                    <Download className="w-3.5 h-3.5 mr-1" />Descargar HTML
                                  </Button>
                                )}
                             </div>
                           </div>
                           <p className="text-[10px] text-gray-400 mt-1">⚠️ Revisar y firmar por técnico cualificado antes de presentar oficialmente</p>
                         </CardHeader>

                         <CardContent className="p-4 space-y-4">
                           {!editing && (
                             <div className="space-y-3">
                               <LegalDocSignaturePanel 
                                 onTechnicianSign={setTechnicianSignature}
                                 onClientSign={setClientSignature}
                                 docContent={docContent}
                                 setDocContent={setDocContent}
                                 technicians={companyData?.technicians || []}
                                 technicianName={form.tecnico}
                                 contactName={contact ? `${contact.name} ${contact.surname || ''}`.trim() : ''}
                                 contacts={contacts}
                               />
                               <SendDocumentEmailPanel
                                 docContent={docContent}
                                 selectedDoc={selectedDoc}
                                 contact={contact}
                                 companyData={companyData}
                                 onEmailSent={loadSavedDocs}
                               />
                             </div>
                           )}
                <div ref={printRef}>
                  <CompanyHeader className="pb-3 border-b mb-4" />
                  {editing ? (
                    <div
                      className="text-xs border rounded-lg p-4 bg-white"
                      style={{ lineHeight: '1.6', minHeight: '600px' }}
                      contentEditable
                      suppressContentEditableWarning
                      onInput={e => setEditContent(e.currentTarget.innerHTML)}
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(editContent
                        .replace(/<table(?![^>]*style)/g, '<table style="border-collapse:collapse;width:100%;margin:8px 0"')
                        .replace(/<td(?![^>]*style)/g, '<td style="border:1px solid #ccc;padding:4px 6px;vertical-align:top"')
                        .replace(/<th(?![^>]*style)/g, '<th style="border:1px solid #ccc;padding:4px 6px;background:#f3f4f6;font-weight:600;text-align:left"')
                        .replace(/<h2(?![^>]*style)/g, '<h2 style="font-size:14px;font-weight:700;margin:16px 0 6px;color:#1e3a5f;border-bottom:2px solid #1e3a5f;padding-bottom:4px"')
                        .replace(/<h3(?![^>]*style)/g, '<h3 style="font-size:12px;font-weight:600;margin:12px 0 4px;color:#374151"'))
                      }}
                    />
                  ) : (
                    <div
                      className="text-xs"
                      style={{ lineHeight: '1.6' }}
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(docContent
                        .replace(/<table(?![^>]*style)/g, '<table style="border-collapse:collapse;width:100%;margin:8px 0"')
                        .replace(/<td(?![^>]*style)/g, '<td style="border:1px solid #ccc;padding:4px 6px;vertical-align:top"')
                        .replace(/<th(?![^>]*style)/g, '<th style="border:1px solid #ccc;padding:4px 6px;background:#f3f4f6;font-weight:600;text-align:left"')
                        .replace(/<h2(?![^>]*style)/g, '<h2 style="font-size:14px;font-weight:700;margin:16px 0 6px;color:#1e3a5f;border-bottom:2px solid #1e3a5f;padding-bottom:4px"')
                        .replace(/<h3(?![^>]*style)/g, '<h3 style="font-size:12px;font-weight:600;margin:12px 0 4px;color:#374151"'))
                      }}
                    />
                  )}
                  <div className="mt-8 pt-4 border-t text-[10px] text-gray-400">
                    Documento generado por sistema informático — Requiere revisión y firma de técnico cualificado
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}