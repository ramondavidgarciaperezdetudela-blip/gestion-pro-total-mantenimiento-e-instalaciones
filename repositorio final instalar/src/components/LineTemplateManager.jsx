import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Edit, Save, Layers, Download, Sparkles, ChevronUp, ChevronDown, Copy, Search, X } from 'lucide-react';

let _id = 0;
const newLine = () => ({ _id: ++_id, description: '', quantity: 1, unit_price: 0, discount: 0 });

const DOC_TYPES = [
  { value: 'todos', label: 'Todos los tipos' },
  { value: 'factura', label: 'Factura' },
  { value: 'presupuesto', label: 'Presupuesto' },
  { value: 'recibo', label: 'Recibo' },
];

const TYPE_COLORS = {
  todos: 'bg-purple-100 text-purple-700',
  factura: 'bg-blue-100 text-blue-700',
  presupuesto: 'bg-green-100 text-green-700',
  recibo: 'bg-orange-100 text-orange-700',
};

// Modelos predefinidos descargables agrupados por sector
const ONLINE_MODELS = [
  {
    category: 'Climatización y A/C',
    icon: '❄️',
    templates: [
      {
        name: 'Instalación Split Estándar',
        doc_type: 'presupuesto',
        items: [
          { description: 'Instalación unidad split inverter', quantity: 1, unit_price: 450, discount: 0 },
          { description: 'Tubería cobre 1/4-3/8 (por metro)', quantity: 6, unit_price: 12, discount: 0 },
          { description: 'Canaleta plástica (metro lineal)', quantity: 4, unit_price: 8, discount: 0 },
          { description: 'Material eléctrico y accesorios', quantity: 1, unit_price: 45, discount: 0 },
          { description: 'Mano de obra (horas)', quantity: 5, unit_price: 38, discount: 0 },
        ],
        notes_template: 'Instalación conforme normativa RITE. Garantía de mano de obra 2 años. No incluye equipo.',
      },
      {
        name: 'Mantenimiento Preventivo A/C',
        doc_type: 'presupuesto',
        items: [
          { description: 'Limpieza unidad interior — filtros y evaporador', quantity: 1, unit_price: 65, discount: 0 },
          { description: 'Limpieza unidad exterior — condensador', quantity: 1, unit_price: 45, discount: 0 },
          { description: 'Comprobación carga de gas refrigerante', quantity: 1, unit_price: 30, discount: 0 },
          { description: 'Revisión drenaje y bandeja', quantity: 1, unit_price: 20, discount: 0 },
          { description: 'Informe técnico escrito', quantity: 1, unit_price: 15, discount: 0 },
        ],
        notes_template: 'Mantenimiento preventivo anual. Próxima revisión recomendada en 12 meses.',
      },
      {
        name: 'Recarga Gas Refrigerante R-32',
        doc_type: 'factura',
        items: [
          { description: 'Carga gas refrigerante R-32 (kg)', quantity: 1, unit_price: 28, discount: 0 },
          { description: 'Localización y diagnóstico fuga', quantity: 1, unit_price: 55, discount: 0 },
          { description: 'Mano de obra técnico F-Gas', quantity: 1, unit_price: 70, discount: 0 },
          { description: 'Informe F-Gas obligatorio', quantity: 1, unit_price: 20, discount: 0 },
        ],
        notes_template: 'Intervención realizada por técnico certificado F-Gas. Conforme Reglamento UE 517/2014.',
      },
    ],
  },
  {
    category: 'Refrigeración Industrial',
    icon: '🏭',
    templates: [
      {
        name: 'Mantenimiento Cámara Frigorífica',
        doc_type: 'presupuesto',
        items: [
          { description: 'Revisión evaporador y desescarche', quantity: 1, unit_price: 80, discount: 0 },
          { description: 'Revisión condensador y ventiladores', quantity: 1, unit_price: 70, discount: 0 },
          { description: 'Control temperatura y sondas', quantity: 1, unit_price: 40, discount: 0 },
          { description: 'Revisión puertas y juntas frigoríficas', quantity: 1, unit_price: 35, discount: 0 },
          { description: 'Comprobación carga gas y estanqueidad', quantity: 1, unit_price: 60, discount: 0 },
        ],
        notes_template: 'Mantenimiento trimestral cámara frigorífica. Conforme RITE y normativa F-Gas.',
      },
      {
        name: 'Instalación Equipo Frío Comercial',
        doc_type: 'factura',
        items: [
          { description: 'Suministro e instalación unidad condensadora', quantity: 1, unit_price: 1200, discount: 0 },
          { description: 'Evaporador de cámara', quantity: 1, unit_price: 450, discount: 0 },
          { description: 'Gas refrigerante R-404A (kg)', quantity: 3, unit_price: 35, discount: 0 },
          { description: 'Tubería cobre + accesorios', quantity: 1, unit_price: 180, discount: 0 },
          { description: 'Mano de obra instalación y puesta en marcha', quantity: 8, unit_price: 42, discount: 0 },
        ],
        notes_template: 'Instalación con certificado de instalación frigorífica. Garantía equipos 2 años.',
      },
    ],
  },
  {
    category: 'Instalaciones Eléctricas',
    icon: '⚡',
    templates: [
      {
        name: 'Cuadro Eléctrico Residencial',
        doc_type: 'presupuesto',
        items: [
          { description: 'Cuadro eléctrico + ICP y diferencial', quantity: 1, unit_price: 180, discount: 0 },
          { description: 'Magnetotérmico unipolar 16A', quantity: 6, unit_price: 12, discount: 0 },
          { description: 'Cable eléctrico 2.5mm (metro)', quantity: 50, unit_price: 1.8, discount: 0 },
          { description: 'Canaleta 40x25 (metro)', quantity: 10, unit_price: 4.5, discount: 0 },
          { description: 'Mano de obra (horas)', quantity: 6, unit_price: 40, discount: 0 },
        ],
        notes_template: 'Instalación conforme REBT. Incluye certificado de instalación eléctrica.',
      },
      {
        name: 'Revisión REBT (ITE Eléctrico)',
        doc_type: 'factura',
        items: [
          { description: 'Inspección visual y mediciones eléctricas', quantity: 1, unit_price: 120, discount: 0 },
          { description: 'Informe técnico ITE eléctrico', quantity: 1, unit_price: 60, discount: 0 },
          { description: 'Certificado de instalación', quantity: 1, unit_price: 40, discount: 0 },
          { description: 'Desplazamiento', quantity: 1, unit_price: 25, discount: 0 },
        ],
        notes_template: 'Revisión según REBT. Informe válido 5 años para instalaciones de baja tensión.',
      },
    ],
  },
  {
    category: 'Energía Solar',
    icon: '☀️',
    templates: [
      {
        name: 'Instalación Solar Fotovoltaica (6kW)',
        doc_type: 'presupuesto',
        items: [
          { description: 'Panel solar 400W monocristalino', quantity: 15, unit_price: 180, discount: 0 },
          { description: 'Inversor solar 6kW', quantity: 1, unit_price: 1400, discount: 0 },
          { description: 'Estructura soporte cubierta', quantity: 1, unit_price: 350, discount: 0 },
          { description: 'Cable solar 4mm2 (metro)', quantity: 80, unit_price: 1.2, discount: 0 },
          { description: 'Cuadro DC y protecciones', quantity: 1, unit_price: 280, discount: 0 },
          { description: 'Mano de obra e instalación completa', quantity: 1, unit_price: 900, discount: 0 },
          { description: 'Tramitación legalización y conexión red', quantity: 1, unit_price: 250, discount: 0 },
        ],
        notes_template: 'Instalación conforme RD 244/2019. Incluye tramitación ante distribuidora. Garantía instalación 10 años.',
      },
      {
        name: 'Mantenimiento Solar Anual',
        doc_type: 'presupuesto',
        items: [
          { description: 'Limpieza paneles solares', quantity: 1, unit_price: 80, discount: 0 },
          { description: 'Revisión estructura y tornillería', quantity: 1, unit_price: 40, discount: 0 },
          { description: 'Comprobación inversor y parámetros', quantity: 1, unit_price: 60, discount: 0 },
          { description: 'Revisión conexiones y cableado DC/AC', quantity: 1, unit_price: 50, discount: 0 },
          { description: 'Informe producción y rendimiento', quantity: 1, unit_price: 30, discount: 0 },
        ],
        notes_template: 'Mantenimiento preventivo anual instalación fotovoltaica. Informe de producción incluido.',
      },
    ],
  },
  {
    category: 'Fontanería y Agua',
    icon: '🔧',
    templates: [
      {
        name: 'Instalación Fontanería Baño Completo',
        doc_type: 'presupuesto',
        items: [
          { description: 'Tubo multicapa 16mm (metro)', quantity: 15, unit_price: 4.5, discount: 0 },
          { description: 'Llave de paso empotrada', quantity: 4, unit_price: 22, discount: 0 },
          { description: 'Colector distribuidor', quantity: 1, unit_price: 85, discount: 0 },
          { description: 'Conexión sanitarios y griferías', quantity: 1, unit_price: 120, discount: 0 },
          { description: 'Mano de obra (horas)', quantity: 6, unit_price: 38, discount: 0 },
        ],
        notes_template: 'Instalación conforme CTE DB-HS4. Prueba de presión incluida. Garantía 2 años.',
      },
    ],
  },
];

export default function LineTemplateManager({ onSelectTemplate }) {
  const [templates, setTemplates] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', doc_type: 'todos', items: [], notes_template: '' });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('mis-plantillas');
  const [searchOnline, setSearchOnline] = useState('');
  const [importingId, setImportingId] = useState(null);
  const [importSuccess, setImportSuccess] = useState(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  // Campos numéricos locales para evitar borrado al escribir
  const [localVals, setLocalVals] = useState({});
  const getLocal = (i, field, val) => {
    const k = `${i}_${field}`;
    return k in localVals ? localVals[k] : (val ?? '');
  };
  const setLocal = (i, field, str) => setLocalVals(p => ({ ...p, [`${i}_${field}`]: str }));
  const commitLocal = (i, field) => {
    const k = `${i}_${field}`;
    setLocalVals(p => {
      if (!(k in p)) return p;
      const num = parseFloat(p[k].replace(',', '.')) || 0;
      updateLine(i, field, num);
      const n = { ...p }; delete n[k]; return n;
    });
  };

  const load = () => base44.entities.LineTemplate.list('name', 100).then(setTemplates);
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setLocalVals({});
    setForm({ name: '', doc_type: 'todos', items: [newLine()], notes_template: '' });
    setDialogOpen(true);
  };

  const openEdit = (tpl) => {
    setEditing(tpl);
    setLocalVals({});
    setForm({ ...tpl, items: (tpl.items || []).map((it, i) => ({ _id: i, ...it })) });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const data = { ...form, items: form.items.map(({ _id, ...rest }) => rest) };
    if (editing) {
      await base44.entities.LineTemplate.update(editing.id, data);
    } else {
      await base44.entities.LineTemplate.create(data);
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta plantilla?')) return;
    await base44.entities.LineTemplate.delete(id);
    load();
  };

  const handleDuplicate = async (tpl) => {
    const data = { ...tpl, name: `${tpl.name} (copia)` };
    delete data.id; delete data.created_date; delete data.updated_date;
    await base44.entities.LineTemplate.create(data);
    load();
  };

  const updateLine = (i, field, val) => {
    setForm(prev => ({ ...prev, items: prev.items.map((it, idx) => idx === i ? { ...it, [field]: val } : it) }));
  };

  const moveLine = (i, dir) => {
    setForm(prev => {
      const items = [...prev.items];
      const j = i + dir;
      if (j < 0 || j >= items.length) return prev;
      [items[i], items[j]] = [items[j], items[i]];
      return { ...prev, items };
    });
  };

  // Importar desde modelos online
  const importOnlineTemplate = async (tpl) => {
    setImportingId(tpl.name);
    const data = { name: tpl.name, doc_type: tpl.doc_type, items: tpl.items, notes_template: tpl.notes_template || '' };
    await base44.entities.LineTemplate.create(data);
    setImportingId(null);
    setImportSuccess(tpl.name);
    setTimeout(() => setImportSuccess(null), 2500);
    load();
  };

  // Generar plantilla con IA
  const generateWithAI = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Eres un experto en instalaciones (climatización, electricidad, solar, fontanería). El usuario quiere una plantilla de conceptos para un presupuesto o factura.
Descripción del trabajo: "${aiPrompt}"

Genera una plantilla con nombre, tipo de documento y entre 4 y 8 líneas de conceptos detallados con cantidades y precios realistas en euros para España (2024).
Incluye mano de obra, materiales y desplazamiento si aplica.`,
        response_json_schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            doc_type: { type: 'string', enum: ['todos', 'factura', 'presupuesto', 'recibo'] },
            notes_template: { type: 'string' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  description: { type: 'string' },
                  quantity: { type: 'number' },
                  unit_price: { type: 'number' },
                  discount: { type: 'number' },
                },
              },
            },
          },
        },
      });
      setAiResult(result);
    } catch (e) {
      alert('Error generando con IA: ' + e.message);
    }
    setAiLoading(false);
  };

  const saveAIResult = async () => {
    if (!aiResult) return;
    await base44.entities.LineTemplate.create({ ...aiResult, items: aiResult.items || [] });
    setAiResult(null);
    setAiPrompt('');
    load();
    setActiveTab('mis-plantillas');
  };

  // Filtrar modelos online por búsqueda
  const filteredModels = ONLINE_MODELS.map(cat => ({
    ...cat,
    templates: cat.templates.filter(t =>
      !searchOnline || t.name.toLowerCase().includes(searchOnline.toLowerCase()) || cat.category.toLowerCase().includes(searchOnline.toLowerCase())
    ),
  })).filter(cat => cat.templates.length > 0);

  // Subtotal de una plantilla
  const calcSubtotal = (items) => (items || []).reduce((s, it) => {
    const base = (it.quantity || 0) * (it.unit_price || 0);
    return s + base * (1 - (it.discount || 0) / 100);
  }, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-purple-500" />
          Plantillas de líneas de trabajo
        </p>
        <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={openNew}>
          <Plus className="w-3 h-3 mr-1" />Nueva
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="mis-plantillas">Mis plantillas</TabsTrigger>
          <TabsTrigger value="modelos">
            <Download className="w-3 h-3 mr-1" />Descargar modelos
          </TabsTrigger>
          <TabsTrigger value="ia">
            <Sparkles className="w-3 h-3 mr-1" />Generar con IA
          </TabsTrigger>
        </TabsList>

        {/* ── MIS PLANTILLAS ── */}
        <TabsContent value="mis-plantillas" className="mt-3 space-y-2">
          {templates.length === 0 && (
            <p className="text-center text-gray-400 py-8 text-sm">No hay plantillas. Crea una o descarga modelos del catálogo.</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {templates.map(tpl => (
              <Card key={tpl.id} className="hover:shadow-sm transition-shadow border-l-4 border-l-purple-400">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{tpl.name}</p>
                        <Badge className={`text-[10px] py-0 ${TYPE_COLORS[tpl.doc_type] || 'bg-gray-100 text-gray-600'}`}>
                          {DOC_TYPES.find(d => d.value === tpl.doc_type)?.label || tpl.doc_type}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{tpl.items?.length || 0} líneas · Subtotal estimado: {calcSubtotal(tpl.items).toFixed(2)} €</p>
                      {tpl.items?.slice(0, 2).map((it, i) => (
                        <p key={i} className="text-xs text-gray-500 truncate">· {it.description}</p>
                      ))}
                      {tpl.items?.length > 2 && <p className="text-xs text-gray-400">...y {tpl.items.length - 2} más</p>}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => handleDuplicate(tpl)} className="p-1 text-gray-400 hover:text-purple-500 rounded" title="Duplicar">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => openEdit(tpl)} className="p-1 text-gray-400 hover:text-blue-600 rounded" title="Editar">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(tpl.id)} className="p-1 text-red-300 hover:text-red-500 rounded" title="Eliminar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── DESCARGAR MODELOS ── */}
        <TabsContent value="modelos" className="mt-3 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input className="pl-9" placeholder="Buscar modelos..." value={searchOnline} onChange={e => setSearchOnline(e.target.value)} />
            {searchOnline && <button onClick={() => setSearchOnline('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X className="w-4 h-4" /></button>}
          </div>
          {importSuccess && (
            <div className="bg-green-50 text-green-700 text-sm px-3 py-2 rounded-lg border border-green-200 text-center">
              ✓ Plantilla "{importSuccess}" importada correctamente
            </div>
          )}
          {filteredModels.map(cat => (
            <div key={cat.category}>
              <p className="text-sm font-semibold text-gray-700 mb-2">{cat.icon} {cat.category}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {cat.templates.map(tpl => {
                  const alreadyImported = templates.some(t => t.name === tpl.name);
                  return (
                    <Card key={tpl.name} className="border hover:shadow-sm transition-shadow">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm">{tpl.name}</p>
                              <Badge className={`text-[10px] py-0 ${TYPE_COLORS[tpl.doc_type] || ''}`}>
                                {tpl.doc_type}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{tpl.items.length} líneas · ~{calcSubtotal(tpl.items).toFixed(0)} €</p>
                            {tpl.items.slice(0, 2).map((it, i) => (
                              <p key={i} className="text-xs text-gray-500 truncate">· {it.description}</p>
                            ))}
                            {tpl.items.length > 2 && <p className="text-xs text-gray-400">...y {tpl.items.length - 2} más</p>}
                          </div>
                          <Button
                            size="sm"
                            variant={alreadyImported ? 'outline' : 'default'}
                            className={alreadyImported ? 'text-gray-400 border-gray-200' : 'bg-purple-600 hover:bg-purple-700'}
                            disabled={importingId === tpl.name || alreadyImported}
                            onClick={() => importOnlineTemplate(tpl)}
                          >
                            {alreadyImported ? '✓ Ya importado' : importingId === tpl.name ? '...' : (
                              <><Download className="w-3 h-3 mr-1" />Importar</>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* ── GENERAR CON IA ── */}
        <TabsContent value="ia" className="mt-3 space-y-3">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-800">
            <p className="font-semibold flex items-center gap-1.5"><Sparkles className="w-4 h-4" />Genera una plantilla con Inteligencia Artificial</p>
            <p className="text-xs mt-1 text-purple-600">Describe el trabajo y la IA creará los conceptos, cantidades y precios automáticamente.</p>
          </div>
          <Textarea
            rows={3}
            placeholder='Ej: "Presupuesto para instalar 3 splits de pared con bombas de calor en una nave industrial de 500m²" o "Revisión eléctrica completa de vivienda unifamiliar con cuadro nuevo"...'
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
          />
          <Button onClick={generateWithAI} disabled={aiLoading || !aiPrompt.trim()} className="w-full bg-purple-600 hover:bg-purple-700 gap-2">
            <Sparkles className="w-4 h-4" />
            {aiLoading ? 'Generando plantilla...' : 'Generar plantilla con IA'}
          </Button>
          {aiResult && (
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-purple-800">{aiResult.name}</p>
                  <Badge className={TYPE_COLORS[aiResult.doc_type] || 'bg-gray-100'}>{aiResult.doc_type}</Badge>
                </div>
                <div className="space-y-1">
                  {(aiResult.items || []).map((it, i) => (
                    <div key={i} className="flex justify-between text-xs text-gray-700 bg-white rounded px-2 py-1 border">
                      <span className="flex-1 truncate">{it.description}</span>
                      <span className="ml-2 text-gray-500 shrink-0">{it.quantity} × {it.unit_price}€</span>
                    </div>
                  ))}
                </div>
                {aiResult.notes_template && (
                  <p className="text-xs text-gray-500 italic border-t pt-2">{aiResult.notes_template}</p>
                )}
                <p className="text-sm font-semibold text-purple-700 text-right">
                  Subtotal estimado: {calcSubtotal(aiResult.items).toFixed(2)} €
                </p>
                <div className="flex gap-2">
                  <Button onClick={saveAIResult} className="flex-1 bg-purple-600 hover:bg-purple-700 gap-1">
                    <Save className="w-4 h-4" />Guardar plantilla
                  </Button>
                  <Button variant="outline" onClick={() => setAiResult(null)} className="flex-1">
                    Descartar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ── DIALOG EDITOR ── */}
      <Dialog open={dialogOpen} onOpenChange={o => { if (!o) setDialogOpen(false); }}>
        <DialogContent
          className="max-w-2xl max-h-[92vh] overflow-y-auto"
          onPointerDownOutside={e => e.preventDefault()}
          onInteractOutside={e => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar plantilla' : 'Nueva plantilla'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Nombre */}
            <div>
              <label className="text-xs font-medium text-gray-600">Nombre de la plantilla *</label>
              <Input className="mt-1" placeholder="Ej: Instalación Split Estándar" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>

            {/* Tipo */}
            <div>
              <label className="text-xs font-medium text-gray-600">Tipo de documento</label>
              <Select value={form.doc_type} onValueChange={v => setForm({ ...form, doc_type: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Líneas */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold">Líneas de conceptos / materiales</label>
                <Button size="sm" variant="outline" onClick={() => setForm(prev => ({ ...prev, items: [...prev.items, newLine()] }))}>
                  <Plus className="w-3 h-3 mr-1" />Añadir línea
                </Button>
              </div>

              <div className="hidden md:grid grid-cols-12 gap-1 text-[10px] text-gray-400 px-1">
                <span className="col-span-1"></span>
                <span className="col-span-4">Descripción</span>
                <span className="col-span-2">Cant.</span>
                <span className="col-span-2">€/ud</span>
                <span className="col-span-2">Dto%</span>
                <span className="col-span-1"></span>
              </div>

              {form.items.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-3">Sin líneas. Pulsa "Añadir línea" para empezar.</p>
              )}

              {form.items.map((item, i) => (
                <div key={item._id ?? i} className="grid grid-cols-12 gap-1 items-center">
                  {/* Orden */}
                  <div className="col-span-1 flex flex-col gap-0.5">
                    <button onClick={() => moveLine(i, -1)} disabled={i === 0} className="text-gray-300 hover:text-gray-500 disabled:opacity-20">
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button onClick={() => moveLine(i, 1)} disabled={i === form.items.length - 1} className="text-gray-300 hover:text-gray-500 disabled:opacity-20">
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                  <input
                    className="col-span-4 text-xs h-8 border border-input rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="Descripción del concepto"
                    value={item.description}
                    onChange={e => updateLine(i, 'description', e.target.value)}
                  />
                  <input
                    className="col-span-2 text-xs h-8 border border-input rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                    inputMode="decimal" placeholder="1"
                    value={getLocal(i, 'quantity', item.quantity)}
                    onChange={e => setLocal(i, 'quantity', e.target.value)}
                    onBlur={() => commitLocal(i, 'quantity')}
                  />
                  <input
                    className="col-span-2 text-xs h-8 border border-input rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                    inputMode="decimal" placeholder="0"
                    value={getLocal(i, 'unit_price', item.unit_price)}
                    onChange={e => setLocal(i, 'unit_price', e.target.value)}
                    onBlur={() => commitLocal(i, 'unit_price')}
                  />
                  <input
                    className="col-span-2 text-xs h-8 border border-input rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                    inputMode="decimal" placeholder="0"
                    value={getLocal(i, 'discount', item.discount ?? 0)}
                    onChange={e => setLocal(i, 'discount', e.target.value)}
                    onBlur={() => commitLocal(i, 'discount')}
                  />
                  <button className="col-span-1 text-red-400 hover:text-red-600 text-lg leading-none text-center"
                    onClick={() => setForm(prev => ({ ...prev, items: prev.items.filter((_, idx) => idx !== i) }))}>×</button>
                </div>
              ))}

              {form.items.length > 0 && (
                <div className="text-right text-xs text-gray-500 pt-1 border-t">
                  Subtotal estimado: <span className="font-semibold text-gray-700">{calcSubtotal(form.items).toFixed(2)} €</span>
                </div>
              )}
            </div>

            {/* Observaciones */}
            <div>
              <label className="text-xs font-medium text-gray-600">Observaciones predefinidas</label>
              <Textarea className="mt-1" rows={2} placeholder="Texto que se añadirá automáticamente al cargar esta plantilla..." value={form.notes_template || ''} onChange={e => setForm({ ...form, notes_template: e.target.value })} />
            </div>

            <Button onClick={handleSave} disabled={saving || !form.name} className="w-full bg-purple-600 hover:bg-purple-700 gap-2">
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : editing ? 'Actualizar plantilla' : 'Guardar plantilla'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}