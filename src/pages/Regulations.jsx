import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Shield, ExternalLink, Search, RefreshCw, Zap, CheckCircle, Clock, Bell, BellOff, Thermometer } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import RefrigerantGuide from '../components/RefrigerantGuide';

const DEFAULT_REGULATIONS = [
  {
    category: 'F-Gas / Refrigeración',
    color: 'bg-blue-100 text-blue-700',
    items: [
      { name: 'Reglamento F-Gas UE 517/2014', description: 'Gases fluorados de efecto invernadero', url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32014R0517', boe: 'https://www.boe.es/buscar/doc.php?id=DOUE-L-2014-81006' },
      { name: 'RD 115/2017 - F-Gas España', description: 'Reglamento nacional gases fluorados', url: 'https://www.boe.es/eli/es/rd/2017/02/17/115', boe: 'https://www.boe.es/eli/es/rd/2017/02/17/115' },
      { name: 'Comprobación de fugas - IDAE', description: 'Guía comprobación fugas gases fluorados', url: 'https://www.idae.es/uploads/documentos/documentos_Gu%C3%ADa_fugas_gases_fluorados_2edicion_tcm30-178434.pdf', boe: null },
      { name: 'Reglamento Frigorías - RD 138/2011', description: 'Seguridad instalaciones frigoríficas', url: 'https://www.boe.es/eli/es/rd/2011/02/04/138', boe: 'https://www.boe.es/eli/es/rd/2011/02/04/138' },
    ]
  },
  {
    category: 'RITE - Instalaciones Térmicas',
    color: 'bg-orange-100 text-orange-700',
    items: [
      { name: 'RITE - RD 1027/2007', description: 'Reglamento de Instalaciones Térmicas en Edificios', url: 'https://www.boe.es/eli/es/rd/2007/07/20/1027/con', boe: 'https://www.boe.es/eli/es/rd/2007/07/20/1027/con' },
      { name: 'Modificación RITE - RD 1826/2009', description: 'Actualización del RITE', url: 'https://www.boe.es/eli/es/rd/2009/12/04/1826', boe: 'https://www.boe.es/eli/es/rd/2009/12/04/1826' },
      { name: 'RITE Instrucciones Técnicas (IT)', description: 'Instrucciones técnicas del RITE', url: 'https://energia.gob.es/desarrollo/EficienciaEnergetica/RITE/Paginas/InstalacionesTermicas.aspx', boe: null },
    ]
  },
  {
    category: 'Electricidad - REBT',
    color: 'bg-yellow-100 text-yellow-700',
    items: [
      { name: 'REBT - RD 842/2002', description: 'Reglamento Electrotécnico Baja Tensión completo', url: 'https://www.boe.es/eli/es/rd/2002/08/02/842/con', boe: 'https://www.boe.es/eli/es/rd/2002/08/02/842/con' },
      { name: 'ITC-BT (Instrucciones Técnicas)', description: 'Todas las ITC-BT del REBT', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099', boe: null },
      { name: 'Normas UNE Electricidad', description: 'Catálogo normas UNE eléctricas', url: 'https://www.une.org/encuentra-tu-norma/busca-tu-norma/?c=S&A=electricidad', boe: null },
    ]
  },
  {
    category: 'Eficiencia Energética',
    color: 'bg-green-100 text-green-700',
    items: [
      { name: 'CTE DB-HE Ahorro Energía', description: 'Código Técnico Edificación - Ahorro de energía', url: 'https://www.codigotecnico.org/pdf/Documentos/HE/DBHE.pdf', boe: 'https://www.boe.es/eli/es/rd/2019/12/05/732' },
      { name: 'RD 235/2013 Certificación Energética', description: 'Certificación energética de edificios', url: 'https://www.boe.es/eli/es/rd/2013/04/05/235', boe: 'https://www.boe.es/eli/es/rd/2013/04/05/235' },
      { name: 'RD 244/2019 Autoconsumo Solar', description: 'Autoconsumo de energía eléctrica', url: 'https://www.boe.es/eli/es/rd/2019/04/05/244', boe: 'https://www.boe.es/eli/es/rd/2019/04/05/244' },
      { name: 'Directiva 2018/844 Eficiencia Energética', description: 'Eficiencia energética en edificios UE', url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32018L0844', boe: null },
    ]
  },
  {
    category: 'Seguridad',
    color: 'bg-red-100 text-red-700',
    items: [
      { name: 'CTE DB-SI Seguridad Incendios', description: 'Código Técnico - Seguridad en caso de incendio', url: 'https://www.codigotecnico.org/pdf/Documentos/SI/DBSI.pdf', boe: 'https://www.boe.es/eli/es/rd/2006/03/17/314/con' },
      { name: 'RIPCI - RD 513/2017', description: 'Reglamento Instalaciones Protección Contra Incendios', url: 'https://www.boe.es/eli/es/rd/2017/05/22/513', boe: 'https://www.boe.es/eli/es/rd/2017/05/22/513' },
      { name: 'RD 513/2017 Protección Incendios', description: 'Reglamento PCI completo', url: 'https://www.boe.es/eli/es/rd/2017/05/22/513', boe: 'https://www.boe.es/eli/es/rd/2017/05/22/513' },
    ]
  },
  {
    category: 'Solar Fotovoltaica',
    color: 'bg-amber-100 text-amber-700',
    items: [
      { name: 'RD 244/2019 Autoconsumo', description: 'Autoconsumo fotovoltaico', url: 'https://www.boe.es/eli/es/rd/2019/04/05/244', boe: 'https://www.boe.es/eli/es/rd/2019/04/05/244' },
      { name: 'REBT - ITC-BT-40 Instalaciones FV', description: 'Instalaciones generadoras de baja tensión', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099', boe: null },
      { name: 'IEC 62446 - Documentación sistemas FV', description: 'Norma documentación instalaciones solares', url: 'https://www.une.org/encuentra-tu-norma/busca-tu-norma/?c=N&v=62446', boe: null },
    ]
  },
  {
    category: 'Refrigerantes - Tablas Danfoss',
    color: 'bg-purple-100 text-purple-700',
    items: [
      { name: 'Regla de refrigerantes Danfoss', description: 'Tabla presiones y temperaturas gases refrigerantes', url: 'https://www.danfoss.com/es-es/service-and-support/downloads/dcs/refrigerants/', boe: null },
      { name: 'Danfoss Coolselector®', description: 'Herramienta selección componentes refrigeración', url: 'https://www.danfoss.com/es-es/service-and-support/apps-and-tools/coolselector2/', boe: null },
      { name: 'Presiones saturación R-32 y R-410A', description: 'Tablas presiones gases refrigerantes', url: 'https://www.danfoss.com/es-es/products/dcs/refrigerants/', boe: null },
    ]
  },
];

const LS_KEY_DATA = 'regulations_ai_updates';
const LS_KEY_AUTO = 'regulations_auto_update';
const LS_KEY_LASTCHECK = 'regulations_last_check';

export default function Regulations() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [updating, setUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY_DATA) || 'null'); } catch { return null; }
  });
  const [autoUpdate, setAutoUpdate] = useState(() => localStorage.getItem(LS_KEY_AUTO) === 'true');
  const [lastCheck, setLastCheck] = useState(() => localStorage.getItem(LS_KEY_LASTCHECK) || null);

  // Auto-update: check once per day if enabled
  useEffect(() => {
    if (!autoUpdate) return;
    const last = localStorage.getItem(LS_KEY_LASTCHECK);
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    if (!last || now - parseInt(last) > oneDayMs) {
      handleUpdate(true);
    }
  }, [autoUpdate]);

  const handleAutoToggle = () => {
    const next = !autoUpdate;
    setAutoUpdate(next);
    localStorage.setItem(LS_KEY_AUTO, String(next));
  };

  const handleUpdate = async (silent = false) => {
    if (!silent) setUpdating(true);
    const today = new Date().toLocaleDateString('es-ES');
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Eres un experto en normativa española y europea de instalaciones (climatización, refrigeración, electricidad, solar, seguridad, F-Gas, RITE, REBT). 
Hoy es ${today}. 

Para cada una de las siguientes normativas, indica:
1. Si existe alguna actualización, modificación o nueva versión publicada recientemente (últimos 12 meses)
2. El número de referencia actualizado si aplica
3. El enlace oficial actualizado al BOE o EUR-Lex si cambió

Lista de normativas a verificar:
- Reglamento F-Gas UE 517/2014 (posible nuevo reglamento F-Gas 2024/573)
- RD 115/2017 - F-Gas España
- RD 138/2011 Instalaciones frigoríficas
- RITE RD 1027/2007 y modificaciones
- REBT RD 842/2002
- CTE DB-HE Ahorro Energía
- RD 235/2013 Certificación Energética
- RD 244/2019 Autoconsumo Solar
- CTE DB-SI Seguridad Incendios
- RIPCI RD 513/2017

Responde en formato JSON con este esquema exacto:
{
  "fecha_consulta": "DD/MM/YYYY",
  "novedades": [
    {
      "normativa": "nombre de la normativa",
      "estado": "vigente" | "actualizada" | "derogada" | "en_revision",
      "descripcion_cambio": "resumen breve del cambio o confirmación de vigencia",
      "referencia_nueva": "nueva referencia si aplica o null",
      "url_nueva": "URL actualizada si cambió o null"
    }
  ],
  "resumen_general": "resumen de 2-3 líneas sobre el estado actual de la normativa del sector"
}`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            fecha_consulta: { type: "string" },
            novedades: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  normativa: { type: "string" },
                  estado: { type: "string" },
                  descripcion_cambio: { type: "string" },
                  referencia_nueva: { type: "string" },
                  url_nueva: { type: "string" }
                }
              }
            },
            resumen_general: { type: "string" }
          }
        }
      });

      const ts = Date.now().toString();
      localStorage.setItem(LS_KEY_DATA, JSON.stringify(result));
      localStorage.setItem(LS_KEY_LASTCHECK, ts);
      setUpdateResult(result);
      setLastCheck(ts);
    } catch (e) {
      console.error(e);
    }
    setUpdating(false);
  };

  const getNovedadForItem = (itemName) => {
    if (!updateResult?.novedades) return null;
    return updateResult.novedades.find(n =>
      itemName.toLowerCase().includes(n.normativa?.toLowerCase()?.split(' ')[0]) ||
      n.normativa?.toLowerCase().includes(itemName.toLowerCase().split(' ')[0])
    );
  };

  const estadoColor = {
    vigente: 'bg-green-100 text-green-700',
    actualizada: 'bg-blue-100 text-blue-700',
    derogada: 'bg-red-100 text-red-700',
    en_revision: 'bg-yellow-100 text-yellow-700',
  };

  const estadoIcon = {
    vigente: <CheckCircle className="w-3 h-3" />,
    actualizada: <RefreshCw className="w-3 h-3" />,
    derogada: <Shield className="w-3 h-3" />,
    en_revision: <Clock className="w-3 h-3" />,
  };

  const [activeSection, setActiveSection] = useState('normativas'); // 'normativas' | 'refrigerantes'

  const categories = ['all', ...DEFAULT_REGULATIONS.map(r => r.category)];

  const filtered = DEFAULT_REGULATIONS.filter(cat =>
    activeCategory === 'all' || cat.category === activeCategory
  ).map(cat => ({
    ...cat,
    items: cat.items.filter(item =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(cat => cat.items.length > 0);

  const formatLastCheck = () => {
    if (!lastCheck) return null;
    return new Date(parseInt(lastCheck)).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const hasUpdates = updateResult?.novedades?.some(n => n.estado === 'actualizada' || n.estado === 'derogada');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6 text-indigo-600" />Normativas
        </h1>
        <div className="flex gap-2 flex-wrap">
          {/* Auto-actualización */}
          <Button
            size="sm"
            variant={autoUpdate ? 'default' : 'outline'}
            onClick={handleAutoToggle}
            className={`gap-1.5 text-xs ${autoUpdate ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
          >
            {autoUpdate ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
            {autoUpdate ? 'Auto-actualización ON' : 'Auto-actualización OFF'}
          </Button>

          {/* Actualizar ahora */}
          <Button
            size="sm"
            onClick={() => handleUpdate(false)}
            disabled={updating}
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
          >
            {updating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5" />
            )}
            {updating ? 'Consultando IA...' : 'Actualizar a última versión'}
          </Button>
        </div>
      </div>

      {/* Pestañas de sección */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveSection('normativas')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeSection === 'normativas' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Shield className="w-4 h-4" />
          Normativas
        </button>
        <button
          onClick={() => setActiveSection('refrigerantes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeSection === 'refrigerantes' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Thermometer className="w-4 h-4" />
          Gases Refrigerantes
        </button>
      </div>

      {activeSection === 'refrigerantes' && <RefrigerantGuide />}

      {activeSection === 'normativas' && <>

      {/* Estado de última actualización */}
      {updateResult && (
        <div className={`rounded-lg border p-3 text-sm ${hasUpdates ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-start gap-2">
            {hasUpdates
              ? <RefreshCw className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              : <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            }
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-xs mb-0.5">
                {hasUpdates ? '⚠️ Hay actualizaciones disponibles' : '✅ Normativas al día'}
                {formatLastCheck() && <span className="font-normal text-gray-500 ml-2">· Consultado: {formatLastCheck()}</span>}
              </p>
              {updateResult.resumen_general && (
                <p className="text-xs text-gray-600">{updateResult.resumen_general}</p>
              )}
              {autoUpdate && (
                <p className="text-[10px] text-gray-400 mt-1">🔔 Auto-actualización activada — se comprobará diariamente al abrir esta página</p>
              )}
            </div>
          </div>
        </div>
      )}

      {!updateResult && autoUpdate && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-700 flex items-center gap-2">
          <Bell className="w-4 h-4 flex-shrink-0" />
          Auto-actualización activada — se comprobará diariamente al abrir esta página
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Buscar normativa..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${activeCategory === cat ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
            {cat === 'all' ? 'Todas' : cat}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.map((cat, ci) => (
          <Card key={ci}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Badge className={cat.color}>{cat.category}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {cat.items.map((item, ii) => {
                  const novedad = getNovedadForItem(item.name);
                  const urlFinal = novedad?.url_nueva || item.url;
                  return (
                    <div key={ii} className={`p-4 hover:bg-gray-50 ${novedad?.estado === 'actualizada' ? 'bg-blue-50/50' : novedad?.estado === 'derogada' ? 'bg-red-50/50' : ''}`}>
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">{item.name}</p>
                            {novedad && (
                              <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium ${estadoColor[novedad.estado] || 'bg-gray-100 text-gray-600'}`}>
                                {estadoIcon[novedad.estado]}
                                {novedad.estado === 'vigente' ? 'Vigente' : novedad.estado === 'actualizada' ? 'Actualizada' : novedad.estado === 'derogada' ? 'Derogada' : 'En revisión'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                          {novedad?.descripcion_cambio && novedad.estado !== 'vigente' && (
                            <p className="text-xs mt-1 text-blue-700 bg-blue-50 rounded px-2 py-1">
                              📋 {novedad.descripcion_cambio}
                              {novedad.referencia_nueva && <span className="font-medium"> → {novedad.referencia_nueva}</span>}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 flex-shrink-0 flex-wrap">
                          <a href={urlFinal} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors">
                            <ExternalLink className="w-3 h-3" /> Acceder
                          </a>
                          {item.boe && (
                            <a href={item.boe} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors">
                              BOE
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      </>}
    </div>
  );
}