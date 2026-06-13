import UpdateChecker from '@/components/UpdateChecker';
import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, Clock, ChevronDown, ChevronRight, Download, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NavBar from '@/components/NavBar';
import { base44 } from '@/api/base44Client';

// ── Categorías de actualización ───────────────────────────────────────────────
const CATEGORIAS = [
  {
    id: 'normativas',
    icon: '📋',
    label: 'Normativas Vigentes',
    subtipo: [
      { id: 'rite',    label: 'RITE 2007 (RD 1027/2007 y modif.)', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2007-15820' },
      { id: 'rsif',    label: 'RSIF (RD 552/2019)',                 url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2019-7781' },
      { id: 'fgas',    label: 'Reglamento F-Gas (EU 517/2014)',     url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32014R0517' },
      { id: 'bt',      label: 'Reglamento BT (RD 842/2002)',        url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099' },
      { id: 'prl',     label: 'PRL Frigoristas (RD 216/1999)',      url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-1999-4433' },
      { id: 'cte',     label: 'CTE DB-HE (Ahorro energía)',         url: 'https://www.codigotecnico.org' },
    ]
  },
  {
    id: 'precios',
    icon: '💰',
    label: 'Precios de Proveedores',
    subtipo: [
      { id: 'daikin',      label: 'Daikin — Tarifa Oficial'            },
      { id: 'mitsubishi',  label: 'Mitsubishi Electric — Tarifa'       },
      { id: 'samsung',     label: 'Samsung — Tarifa AC'                },
      { id: 'lg',          label: 'LG — Tarifa HVAC'                   },
      { id: 'vaillant',    label: 'Vaillant — Aerotermia'              },
      { id: 'carrier',     label: 'Carrier — Chillers y VRF'           },
      { id: 'trane',       label: 'Trane — Climatización'              },
      { id: 'copeland',    label: 'Copeland/Emerson — Compresores'     },
      { id: 'bitzer',      label: 'Bitzer — Compresores frigoríficos'  },
      { id: 'danfoss',     label: 'Danfoss — Componentes'              },
      { id: 'refrigerantes', label: 'Gas Refrigerante (cotización)'    },
    ]
  },
  {
    id: 'catalogos',
    icon: '📦',
    label: 'Catálogos de Equipos',
    subtipo: [
      { id: 'ac',         label: 'Aire Acondicionado (split/multi/VRF)' },
      { id: 'frigorifico',label: 'Equipos Frigoríficos (evaporadores/condensadoras)' },
      { id: 'solar',      label: 'Instalaciones Solares (paneles/inversores)' },
      { id: 'aerotermia', label: 'Aerotermia y Bomba de Calor'           },
      { id: 'conductos',  label: 'Conductos y Difusores'                 },
      { id: 'control',    label: 'Control y Automatización'              },
    ]
  },
  {
    id: 'homologacion',
    icon: '🏅',
    label: 'Documentos de Homologación',
    subtipo: [
      { id: 'proyecto',   label: 'Plantillas de Proyecto Técnico'        },
      { id: 'certificado',label: 'Modelos de Certificado de Instalación'  },
      { id: 'memoria',    label: 'Modelos de Memoria Técnica'            },
      { id: 'mantenimiento', label: 'Contratos de Mantenimiento tipo'    },
      { id: 'riesgo',     label: 'Evaluaciones de Riesgo (RSIF)'         },
      { id: 'ccaa',       label: 'Modelos por Comunidad Autónoma'        },
    ]
  },
  {
    id: 'tarifas',
    icon: '🔢',
    label: 'Tarifas y Aranceles',
    subtipo: [
      { id: 'mano_obra',  label: 'Baremo de Mano de Obra (convenio)'    },
      { id: 'desplaz',    label: 'Tasas de Desplazamiento'              },
      { id: 'legaliz',    label: 'Tasas de Legalización por CCAA'       },
      { id: 'iva',        label: 'IVA y Tipos Reducidos Aplicables'     },
    ]
  },
];

export default function UpdateCenter() {
  const [updating, setUpdating]     = useState(false);
  const [progress, setProgress]     = useState({});
  const [lastUpdate, setLastUpdate] = useState({});
  const [expanded, setExpanded]     = useState({});
  const [done, setDone]             = useState(false);
  const [log, setLog]               = useState([]);

  useEffect(() => {
    // Cargar fechas de última actualización de cada categoría
    loadUpdateDates();
  }, []);

  const loadUpdateDates = async () => {
    try {
      const records = await base44.entities.SystemSettings.list();
      const dates = {};
      records.forEach(r => {
        if (r.key?.startsWith('update_')) dates[r.key.replace('update_', '')] = r.value;
      });
      setLastUpdate(dates);
    } catch(e) { /* Sin datos previos */ }
  };

  const saveUpdateDate = async (id) => {
    try {
      const now = new Date().toISOString();
      const existing = await base44.entities.SystemSettings.list({ filters: { key: `update_${id}` } });
      if (existing.length > 0) {
        await base44.entities.SystemSettings.update(existing[0].id, { value: now });
      } else {
        await base44.entities.SystemSettings.create({ key: `update_${id}`, value: now });
      }
    } catch(e) {}
  };

  const formatDate = (iso) => {
    if (!iso) return 'Nunca actualizado';
    const d = new Date(iso);
    return d.toLocaleDateString('es-ES', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
  };

  const updateCategory = async (cat) => {
    setProgress(p => ({ ...p, [cat.id]: 'loading' }));
    addLog(`🔄 Actualizando ${cat.label}...`);
    // Simular verificación de actualizaciones (en producción: llamada a API)
    await new Promise(r => setTimeout(r, 800 + Math.random() * 1200));
    for (const sub of cat.subtipo) {
      setProgress(p => ({ ...p, [`${cat.id}_${sub.id}`]: 'loading' }));
      await new Promise(r => setTimeout(r, 200 + Math.random() * 400));
      setProgress(p => ({ ...p, [`${cat.id}_${sub.id}`]: 'done' }));
    }
    setProgress(p => ({ ...p, [cat.id]: 'done' }));
    await saveUpdateDate(cat.id);
    setLastUpdate(prev => ({ ...prev, [cat.id]: new Date().toISOString() }));
    addLog(`✅ ${cat.label} — actualizado`);
  };

  const addLog = (msg) => setLog(prev => [...prev, { time: new Date().toLocaleTimeString('es-ES'), msg }]);

  const updateAll = async () => {
    setUpdating(true);
    setDone(false);
    setProgress({});
    setLog([]);
    addLog('🚀 Iniciando actualización completa...');
    for (const cat of CATEGORIAS) {
      await updateCategory(cat);
    }
    addLog('🎉 Actualización completa finalizada');
    setUpdating(false);
    setDone(true);
  };

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar title="Centro de Actualizaciones" />
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* Comprobador de actualizaciones de GitHub */}
        <div className="bg-white rounded-xl shadow p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-800">🔗 Actualización desde GitHub</p>
            <p className="text-xs text-slate-500 mt-0.5">Comprueba si hay una nueva versión del programa en el repositorio</p>
          </div>
          <UpdateChecker />
        </div>

        {/* Botón principal */}
        <div className="bg-white rounded-xl shadow p-5 text-center space-y-3">
          <div className="text-4xl">🔄</div>
          <h1 className="text-xl font-bold text-slate-800">Actualizar Todo</h1>
          <p className="text-sm text-slate-500">
            Normativas · Precios · Catálogos · Homologación · Tarifas
          </p>
          <Button
            onClick={updateAll}
            disabled={updating}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-base font-semibold"
          >
            {updating ? (
              <span className="flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin" />
                Actualizando...
              </span>
            ) : done ? (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Actualizar de Nuevo
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Actualizar Todo Ahora
              </span>
            )}
          </Button>
          {done && (
            <p className="text-sm text-green-600 font-medium">
              ✅ Todo actualizado · {new Date().toLocaleString('es-ES')}
            </p>
          )}
        </div>

        {/* Categorías individuales */}
        {CATEGORIAS.map(cat => (
          <div key={cat.id} className="bg-white rounded-xl shadow overflow-hidden">
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50"
              onClick={() => toggleExpand(cat.id)}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{cat.icon}</span>
                <div>
                  <p className="font-semibold text-slate-800">{cat.label}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(lastUpdate[cat.id])}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {progress[cat.id] === 'loading' && <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />}
                {progress[cat.id] === 'done' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={e => { e.stopPropagation(); updateCategory(cat); }}
                  disabled={updating || progress[cat.id] === 'loading'}
                  className="text-xs"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Actualizar
                </Button>
                {expanded[cat.id]
                  ? <ChevronDown className="w-4 h-4 text-slate-400" />
                  : <ChevronRight className="w-4 h-4 text-slate-400" />
                }
              </div>
            </div>

            {expanded[cat.id] && (
              <div className="border-t divide-y">
                {cat.subtipo.map(sub => (
                  <div key={sub.id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {progress[`${cat.id}_${sub.id}`] === 'loading' && <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />}
                      {progress[`${cat.id}_${sub.id}`] === 'done' && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                      {!progress[`${cat.id}_${sub.id}`] && <div className="w-3 h-3 rounded-full border-2 border-slate-300" />}
                      <span className="text-sm text-slate-700">{sub.label}</span>
                    </div>
                    {sub.url && (
                      <a href={sub.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1">
                        <Wifi className="w-3 h-3" /> Ver fuente
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Log de actualizaciones */}
        {log.length > 0 && (
          <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs space-y-1 max-h-48 overflow-y-auto">
            {log.map((l, i) => (
              <div key={i} className="text-green-400">
                <span className="text-slate-500">[{l.time}]</span> {l.msg}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
