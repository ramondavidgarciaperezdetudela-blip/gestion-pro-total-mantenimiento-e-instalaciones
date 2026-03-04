import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Bot, Loader2, Sun, Zap, Thermometer, Snowflake, ClipboardList, Save, Calendar, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import CompanyHeader from '../components/CompanyHeader';
import PrintButton from '../components/PrintButton';

const PLAN_TYPES = {
  solar: {
    label: '☀️ Instalación Solar',
    color: 'from-amber-500 to-orange-500',
    icon: Sun,
    templates: [
      { id: 'solar_residential', label: 'Solar residencial autoconsumo', desc: 'Planificación completa instalación fotovoltaica vivienda' },
      { id: 'solar_industrial', label: 'Solar industrial/comercial', desc: 'Gran instalación para empresa o industria' },
      { id: 'solar_offgrid', label: 'Solar aislada (off-grid)', desc: 'Sistema autónomo con baterías sin red' },
      { id: 'solar_battery', label: 'Ampliación con baterías', desc: 'Añadir almacenamiento a instalación existente' },
    ]
  },
  electrico: {
    label: '⚡ Instalación Eléctrica',
    color: 'from-yellow-500 to-amber-500',
    icon: Zap,
    templates: [
      { id: 'elec_vivienda', label: 'Instalación eléctrica vivienda', desc: 'Proyecto completo instalación eléctrica vivienda nueva o reforma' },
      { id: 'elec_local', label: 'Local comercial / oficina', desc: 'Instalación eléctrica local o nave industrial' },
      { id: 'elec_cargadores', label: 'Instalación cargadores EV', desc: 'Puntos de recarga vehículo eléctrico' },
      { id: 'elec_industrial', label: 'Instalación eléctrica industrial', desc: 'Cuadros eléctricos, maquinaria, fuerza industrial' },
    ]
  },
  clima: {
    label: '❄️ Climatización',
    color: 'from-blue-500 to-cyan-500',
    icon: Thermometer,
    templates: [
      { id: 'clima_split', label: 'Instalación splits / multisplit', desc: 'Planificación instalación equipos de climatización' },
      { id: 'clima_vrf', label: 'Sistema VRF / VRV', desc: 'Sistema multi-split VRF para edificio o local grande' },
      { id: 'clima_aerotermia', label: 'Aerotermia ACS + Calefacción', desc: 'Bomba de calor aerotérmica para ACS y suelo radiante' },
      { id: 'clima_industrial', label: 'Climatización industrial', desc: 'Climatización nave, almacén o proceso industrial' },
    ]
  },
  frio: {
    label: '🧊 Refrigeración Industrial',
    color: 'from-cyan-500 to-blue-600',
    icon: Snowflake,
    templates: [
      { id: 'frio_camara', label: 'Cámara frigorífica', desc: 'Instalación de cámara frigorífica de conservación o congelación' },
      { id: 'frio_tunelcongelacion', label: 'Túnel de congelación', desc: 'Sistema de congelación industrial rápida' },
      { id: 'frio_obrador', label: 'Frío en obrador / cocina', desc: 'Refrigeración para obrador, pastelería o cocina industrial' },
      { id: 'frio_supermercado', label: 'Muebles frigoríficos supermercado', desc: 'Sistema de refrigeración centralizado para comercio alimentación' },
    ]
  }
};

function buildPlanPrompt(type, templateId, form, contact) {
  const cliente = contact ? `${contact.name} ${contact.surname || ''} ${contact.company_name ? '— ' + contact.company_name : ''}` : form.cliente;
  const direccion = contact ? `${contact.address || ''} ${contact.city || ''} ${contact.province || ''}` : form.direccion;
  const today = format(new Date(), 'dd/MM/yyyy');
  const inicio = form.fecha_inicio || format(new Date(), 'yyyy-MM-dd');

  const common = `
Cliente: ${cliente}
Dirección obra: ${direccion}
Descripción: ${form.descripcion}
Potencia / Capacidad: ${form.potencia}
Superficie / Dimensiones: ${form.superficie}
Técnicos disponibles: ${form.tecnicos || '2'}
Fecha de inicio prevista: ${inicio}
Notas adicionales: ${form.notas}
Fecha del informe: ${today}
`;

  const prompts = {
    // SOLAR
    solar_residential: `Eres el jefe de proyectos de una empresa de instalaciones técnicas especializada en energía solar en España. 
Genera un plan de instalación COMPLETO y DETALLADO para instalación solar fotovoltaica residencial de autoconsumo.
${common}

El plan debe incluir en formato de tablas y secciones claras:

## 1. RESUMEN DEL PROYECTO
- Resumen ejecutivo, alcance, objetivos
- KPIs esperados (producción anual kWh, ahorro €/año, retorno inversión estimado)

## 2. PLANIFICACIÓN TEMPORAL (DIAGRAMA GANTT TEXTUAL)
Tabla con: Fase | Tarea | Duración | Días desde inicio | Responsable | Dependencias
Incluir todas las fases: visita técnica, proyecto, trámites, aprovisionamiento, obra, legalización, puesta en marcha

## 3. FASES DEL PROYECTO DETALLADAS
Para cada fase: descripción, tareas concretas, duración, recursos, entregables

### Fase 1: ESTUDIO PREVIO Y VISITA TÉCNICA (Días 1-3)
### Fase 2: DISEÑO Y PROYECTO (Días 4-10)
### Fase 3: TRÁMITES ADMINISTRATIVOS (Días 11-40)
  - Solicitud CAU distribuidora
  - MTD y documentación Industria
### Fase 4: APROVISIONAMIENTO MATERIAL (Días 15-25)
  - Lista de materiales con proveedores y plazos
### Fase 5: INSTALACIÓN (Días 26-35)
  - Instalación estructura y paneles
  - Instalación inversor y baterías
  - Conexionado eléctrico
  - Pruebas y verificaciones
### Fase 6: LEGALIZACIÓN Y PUESTA EN MARCHA (Días 36-60)
  - Tramitación en Industria
  - Activación con distribuidora
  - Formación cliente

## 4. LISTA DE MATERIALES (TABLA)
Columnas: Material | Especificación | Cantidad | Proveedor sugerido | Plazo entrega aprox.

## 5. RECURSOS HUMANOS Y MEDIOS
Tabla: Recurso | Categoría | Días/Horas | Fase

## 6. PRESUPUESTO ESTIMADO (TABLA)
Partidas: Material, Mano de obra, Legalización, Otros. Totales sin/con IVA.

## 7. RIESGOS Y CONTINGENCIAS
Tabla: Riesgo | Probabilidad | Impacto | Medida preventiva

## 8. DOCUMENTACIÓN A GENERAR
Lista de documentos a preparar para la legalización

## 9. CHECKLIST PUESTA EN MARCHA
Lista verificación antes de entregar al cliente`,

    solar_industrial: `Genera un plan de proyecto COMPLETO para instalación solar fotovoltaica industrial/comercial en España.
${common}
Incluye todas las fases con tablas: planificación Gantt, materiales, recursos, presupuesto, trámites (incluido estudio impacto si > 100kW), riesgos. 
Especialmente detalla los trámites administrativos para instalaciones industriales (autorización previa, EIA si aplica, conexión red transporte/distribución, RAIPREE).`,

    solar_offgrid: `Genera un plan de proyecto COMPLETO para instalación solar autónoma (off-grid) con baterías en España.
${common}
Incluye: dimensionado del sistema, planificación completa, materiales (paneles, baterías, inversor/cargador, MPPT, generador apoyo), fases de instalación, pruebas de autonomía, configuración BMS y sistemas de monitorización.`,

    solar_battery: `Genera un plan de proyecto para ampliación de instalación solar existente con sistema de almacenamiento en baterías.
${common}
Incluye: auditoría instalación existente, compatibilidad inversor, selección baterías, modificación cuadros, actualización CAU si es necesario, pruebas de integración.`,

    // ELÉCTRICO
    elec_vivienda: `Genera un plan de proyecto COMPLETO para instalación eléctrica de vivienda (nueva construcción o reforma) según REBT en España.
${common}
Incluye: planificación Gantt detallada, lista de circuitos según ITC-BT-25, materiales con especificaciones, cuadro de protecciones, puesta a tierra, fases de obra, verificaciones y boletín BT.`,

    elec_local: `Genera un plan de proyecto COMPLETO para instalación eléctrica de local comercial u oficina según REBT en España.
${common}
Incluye: estudio de cargas, planificación Gantt, circuitos fuerza e iluminación, emergencias, SAI si aplica, materiales, cuadros eléctricos, boletín BT o proyecto técnico, trámites.`,

    elec_cargadores: `Genera un plan de proyecto COMPLETO para instalación de puntos de recarga para vehículo eléctrico según REBT e ITC-BT-52 en España.
${common}
Incluye: estudio potencia disponible, modos de carga, tipo de cargadores, gestión de carga dinámica, acometida, cuadro, trámites con distribuidora, subvenciones MOVES III disponibles.`,

    elec_industrial: `Genera un plan de proyecto COMPLETO para instalación eléctrica industrial en España.
${common}
Incluye: estudio de cargas industriales, cuadros eléctricos (CGBT, subcuadros), motores y arrancadores, compensación de reactiva, medida de energía, proyecto técnico, inspección OCA.`,

    // CLIMA
    clima_split: `Genera un plan de proyecto COMPLETO para instalación de equipos de climatización (splits/multisplit) según RITE en España.
${common}
Incluye: cálculo de cargas térmicas por estancias (tabla), selección equipos, planificación de instalación, pasos obra (ubicación unidades, tendido tuberías, drenaje, eléctrico, carga gas), certificado RITE.`,

    clima_vrf: `Genera un plan de proyecto COMPLETO para sistema de climatización VRF/VRV en edificio o local en España.
${common}
Incluye: cálculo cargas, selección sistema VRF, distribución unidades interiores, tendido tuberías frigoríficas, control centralizado, comisionado del sistema, documentación RITE completa.`,

    clima_aerotermia: `Genera un plan de proyecto COMPLETO para instalación de aerotermia (ACS + calefacción/refrigeración) con suelo radiante en España.
${common}
Incluye: dimensionado bomba de calor, circuito hidráulico, depósito acumulador, suelo radiante o fan-coils, integración con instalación existente, trámites RITE, subvenciones IDAE disponibles.`,

    clima_industrial: `Genera un plan de proyecto COMPLETO para climatización de nave o instalación industrial en España.
${common}
Incluye: cálculo de cargas industriales (equipos, procesos, ventilación), sistema seleccionado (HVAC, climatizadores, enfriadora), distribución, control BMS, trámites RITE, mantenimiento preventivo.`,

    // FRÍO
    frio_camara: `Genera un plan de proyecto COMPLETO para instalación de cámara frigorífica según RD 138/2011 y normativa F-Gas en España.
${common}
Incluye: dimensionado frigorífico (carga total, equipos), materiales (paneles sandwich, evaporador, condensador, compresor, gas), planificación de obra (estructura, sellado, instalación equipo, carga gas, pruebas), legalización F-Gas y Reglamento Frigorías.`,

    frio_tunelcongelacion: `Genera un plan de proyecto COMPLETO para instalación de túnel de congelación industrial en España.
${common}
Incluye: cálculo potencia frigorífica necesaria, selección gas refrigerante, componentes, plazos de ejecución, pruebas de rendimiento, normativa de seguridad RD 138/2011.`,

    frio_obrador: `Genera un plan de proyecto COMPLETO para instalación de refrigeración en obrador, pastelería o cocina industrial.
${common}
Incluye: análisis de necesidades (cámaras, expositores, mesas refrigeradas), dimensionado, selección equipos, instalación, gases (R-290 recomendado si aplica), trámites F-Gas.`,

    frio_supermercado: `Genera un plan de proyecto COMPLETO para sistema de refrigeración centralizado para comercio de alimentación/supermercado en España.
${common}
Incluye: central frigorífica, muebles de frío positivo y negativo, distribución de gas, gestión de la instalación, recuperación de calor, normativa F-Gas completa, mantenimiento.`,
  };

  return prompts[templateId] || `Genera un plan de proyecto completo para instalación de tipo ${type} - ${templateId}. ${common}`;
}

export default function AIPlanning() {
  const [contacts, setContacts] = useState([]);
  const [activeType, setActiveType] = useState('solar');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedContact, setSelectedContact] = useState('');
  const [form, setForm] = useState({
    cliente: '', direccion: '', descripcion: '', potencia: '', superficie: '',
    tecnicos: '2', fecha_inicio: format(new Date(), 'yyyy-MM-dd'), notas: '',
  });
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState(null);
  const [savedPlans, setSavedPlans] = useState([]);
  const [editingPlan, setEditingPlan] = useState(false);
  const printRef = useRef(null);

  useEffect(() => {
    base44.entities.Contact.list('name', 300).then(setContacts);
    const stored = localStorage.getItem('ai_plans_history');
    if (stored) setSavedPlans(JSON.parse(stored).slice(0, 15));
  }, []);

  const contact = contacts.find(c => c.id === selectedContact);
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const generate = async () => {
    if (!selectedTemplate) return;
    setGenerating(true);
    setPlan(null);
    const prompt = buildPlanPrompt(activeType, selectedTemplate.id, form, contact);
    const res = await base44.integrations.Core.InvokeLLM({ prompt, add_context_from_internet: false });
    const newPlan = {
      id: Date.now(),
      title: selectedTemplate.label,
      type: activeType,
      typeLabel: PLAN_TYPES[activeType].label,
      client: contact ? `${contact.name} ${contact.surname || ''}` : form.cliente,
      content: res,
      date: format(new Date(), 'dd/MM/yyyy HH:mm'),
    };
    setPlan(newPlan);
    const updated = [newPlan, ...savedPlans].slice(0, 15);
    setSavedPlans(updated);
    localStorage.setItem('ai_plans_history', JSON.stringify(updated));
    setGenerating(false);
  };

  const savePlan = async () => {
    if (!plan || !selectedContact) return;
    await base44.entities.ClientDocument.create({
      contact_id: selectedContact,
      contact_name: contact ? `${contact.name} ${contact.surname || ''}` : form.cliente,
      title: `Plan proyecto: ${plan.title} — ${format(new Date(), 'dd/MM/yyyy')}`,
      doc_type: 'informe',
      date: format(new Date(), 'yyyy-MM-dd'),
      description: plan.content.slice(0, 200),
    });
  };

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl">
          <ClipboardList className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Planificación IA de Proyectos</h1>
          <p className="text-sm text-gray-500">Genera planes de proyecto detallados con fases, Gantt, materiales, presupuesto y trámites</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Panel izquierdo */}
        <div className="space-y-3">
          {/* Tipo de instalación */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">1. Tipo de instalación</CardTitle></CardHeader>
            <CardContent className="p-3 space-y-2">
              {Object.entries(PLAN_TYPES).map(([k, v]) => {
                const Icon = v.icon;
                return (
                  <button key={k} onClick={() => { setActiveType(k); setSelectedTemplate(null); setPlan(null); }}
                    className={`w-full text-left p-3 rounded-lg border transition-all flex items-center gap-2 ${activeType === k ? `bg-gradient-to-r ${v.color} text-white border-transparent` : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium">{v.label}</span>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Tipo de proyecto */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">2. Tipo de proyecto</CardTitle></CardHeader>
            <CardContent className="p-3 space-y-2">
              {PLAN_TYPES[activeType].templates.map(t => (
                <button key={t.id} onClick={() => { setSelectedTemplate(t); setPlan(null); }}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${selectedTemplate?.id === t.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-gray-200 hover:border-indigo-200'}`}>
                  <p className="text-xs font-semibold">{t.label}</p>
                  <p className={`text-[10px] mt-0.5 ${selectedTemplate?.id === t.id ? 'text-indigo-200' : 'text-gray-400'}`}>{t.desc}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Historial */}
          {savedPlans.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Planes anteriores</CardTitle></CardHeader>
              <CardContent className="p-0 max-h-56 overflow-y-auto">
                {savedPlans.map((p, i) => (
                  <button key={p.id || i} onClick={() => setPlan(p)}
                    className="w-full text-left p-3 hover:bg-gray-50 border-b flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 mt-1 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{p.title}</p>
                      <p className="text-[10px] text-gray-400">{p.client} · {p.date}</p>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Panel derecho */}
        <div className="lg:col-span-2 space-y-3">
          {selectedTemplate && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bot className="w-4 h-4 text-indigo-600" />
                  3. Datos del proyecto: {selectedTemplate.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">Cliente</label>
                    <Select value={selectedContact} onValueChange={setSelectedContact}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Manual (sin vincular)</SelectItem>
                        {contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.surname || ''} {c.company_name ? `— ${c.company_name}` : ''}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {(!selectedContact || selectedContact === 'none') && (
                    <div><label className="text-xs text-gray-500">Nombre cliente</label><Input value={form.cliente} onChange={e => setF('cliente', e.target.value)} /></div>
                  )}
                  <div>
                    <label className="text-xs text-gray-500">Dirección de la obra</label>
                    <Input value={form.direccion || (contact?.address ? `${contact.address}, ${contact.city}` : '')} onChange={e => setF('direccion', e.target.value)} placeholder="Calle, nº, ciudad" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Potencia / Capacidad</label>
                    <Input value={form.potencia} onChange={e => setF('potencia', e.target.value)} placeholder="ej: 10 kWp / 50 kW / 20 m²" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Superficie / Dimensiones</label>
                    <Input value={form.superficie} onChange={e => setF('superficie', e.target.value)} placeholder="ej: 200 m² / 15x8 m" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Nº de técnicos disponibles</label>
                    <Select value={form.tecnicos} onValueChange={v => setF('tecnicos', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['1','2','3','4','5'].map(n => <SelectItem key={n} value={n}>{n} técnico{n!='1'?'s':''}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Fecha inicio prevista</label>
                    <Input type="date" value={form.fecha_inicio} onChange={e => setF('fecha_inicio', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Descripción / Detalles del proyecto</label>
                  <Input value={form.descripcion} onChange={e => setF('descripcion', e.target.value)} placeholder="Describe los detalles específicos del proyecto para que el plan sea más preciso..." />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Notas adicionales</label>
                  <Input value={form.notas} onChange={e => setF('notas', e.target.value)} placeholder="Condicionantes especiales, materiales ya disponibles, etc." />
                </div>
                <Button onClick={generate} disabled={generating} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white">
                  {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generando plan de proyecto...</> : <><Bot className="w-4 h-4 mr-2" />Generar Plan Completo con IA</>}
                </Button>
              </CardContent>
            </Card>
          )}

          {!selectedTemplate && !plan && (
            <div className="flex items-center justify-center h-48 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <div className="text-center">
                <ClipboardList className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-400">Selecciona el tipo de instalación y proyecto</p>
              </div>
            </div>
          )}

          {/* Plan generado */}
          {plan && (
            <Card className="border-indigo-200">
              <CardHeader className="pb-2 bg-gradient-to-r from-indigo-50 to-purple-50">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-indigo-600" />{plan.title}
                    </CardTitle>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {plan.typeLabel} · {plan.client && <span>Cliente: <strong>{plan.client}</strong> · </span>}{plan.date}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap no-print">
                    <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(plan.content)}>Copiar</Button>
                    {selectedContact && selectedContact !== 'none' && (
                      <Button size="sm" variant="outline" onClick={savePlan}><Save className="w-3 h-3 mr-1" />Guardar en cliente</Button>
                    )}
                    <PrintButton contentRef={printRef} title={`Plan: ${plan.title}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <div ref={printRef}>
                  <CompanyHeader className="pb-3 border-b mb-4" />
                  <div className="mb-3">
                    <h2 className="text-lg font-bold">Plan de Proyecto: {plan.title}</h2>
                    {plan.client && <p className="text-sm text-gray-500">Cliente: {plan.client} · Generado: {plan.date}</p>}
                  </div>
                  <ReactMarkdown className="text-xs prose prose-sm max-w-none prose-headings:text-gray-800 prose-headings:font-bold prose-h2:text-sm prose-h3:text-xs [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-gray-300 [&_td]:p-1 [&_th]:border [&_th]:border-gray-300 [&_th]:p-1 [&_th]:bg-gray-100 prose-ul:list-disc prose-ol:list-decimal">
                    {plan.content}
                  </ReactMarkdown>
                  <div className="mt-6 pt-3 border-t text-[10px] text-gray-400">
                    Plan generado por IA · {plan.date} · Adaptar según condiciones reales de la instalación
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