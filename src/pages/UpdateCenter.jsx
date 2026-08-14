import UpdateChecker from '@/components/UpdateChecker';
import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, Clock, ChevronDown, ChevronRight, Wifi, Plus, X, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import NavBar from '@/components/NavBar';
import {
  CATEGORIES, updateCategoryData, loadSavedUpdates, getCustomSources, saveCustomSources,
} from '@/lib/dailyAutoUpdate';

export default function UpdateCenter() {
  const [updating, setUpdating]     = useState(false);
  const [progress, setProgress]     = useState({});
  const [lastUpdate, setLastUpdate] = useState({});
  const [results, setResults]       = useState({});
  const [expanded, setExpanded]     = useState({});
  const [done, setDone]             = useState(false);
  const [log, setLog]               = useState([]);
  const [sources, setSources]       = useState({});
  const [newSourceUrl, setNewSourceUrl] = useState({});

  useEffect(() => {
    loadUpdateDates();
  }, []);

  const loadUpdateDates = async () => {
    const { dates, data } = await loadSavedUpdates();
    setLastUpdate(dates);
    setResults(data);
    const src = {};
    for (const cat of CATEGORIES) src[cat.id] = await getCustomSources(cat.id);
    setSources(src);
  };

  const formatDate = (iso) => {
    if (!iso) return 'Nunca actualizado';
    const d = new Date(iso);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const updateCategory = async (cat) => {
    setProgress((p) => ({ ...p, [cat.id]: 'loading' }));
    addLog(`🔄 Consultando ${cat.label} (IA + internet)...`);
    try {
      const result = await updateCategoryData(cat);
      setResults((prev) => ({ ...prev, [cat.id]: result }));
      const now = new Date().toISOString();
      setLastUpdate((prev) => ({ ...prev, [cat.id]: now }));
      setProgress((p) => ({ ...p, [cat.id]: 'done' }));
      addLog(`✅ ${cat.label} — actualizado (${result?.novedades?.length || 0} elementos revisados)`);
    } catch (e) {
      console.error('[UpdateCenter] Error real al actualizar', cat.id, e);
      setProgress((p) => ({ ...p, [cat.id]: 'error' }));
      addLog(`⚠️ ${cat.label} — no se pudo consultar (revisa la conexión)`);
    }
  };

  const addLog = (msg) => setLog((prev) => [...prev, { time: new Date().toLocaleTimeString('es-ES'), msg }]);

  const updateAll = async () => {
    setUpdating(true);
    setDone(false);
    setProgress({});
    setLog([]);
    addLog('🚀 Iniciando actualización completa...');
    for (const cat of CATEGORIES) {
      await updateCategory(cat);
    }
    addLog('🎉 Actualización completa finalizada');
    setUpdating(false);
    setDone(true);
  };

  const toggleExpand = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const addSource = async (catId) => {
    const url = (newSourceUrl[catId] || '').trim();
    if (!url) return;
    const next = [...(sources[catId] || []), { url, note: '' }];
    setSources((prev) => ({ ...prev, [catId]: next }));
    setNewSourceUrl((prev) => ({ ...prev, [catId]: '' }));
    await saveCustomSources(catId, next);
  };

  const removeSource = async (catId, idx) => {
    const next = (sources[catId] || []).filter((_, i) => i !== idx);
    setSources((prev) => ({ ...prev, [catId]: next }));
    await saveCustomSources(catId, next);
  };

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
          <p className="text-xs text-slate-400">
            Estas 5 secciones también se actualizan solas, una vez al día, en segundo plano.
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
        {CATEGORIES.map((cat) => (
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
                {progress[cat.id] === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); updateCategory(cat); }}
                  disabled={updating || progress[cat.id] === 'loading'}
                  className="text-xs"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Actualizar
                </Button>
                {expanded[cat.id]
                  ? <ChevronDown className="w-4 h-4 text-slate-400" />
                  : <ChevronRight className="w-4 h-4 text-slate-400" />}
              </div>
            </div>

            {expanded[cat.id] && (
              <div className="border-t divide-y">
                {/* Resultado de la última consulta a la IA */}
                {results[cat.id] && (
                  <div className="p-3 bg-slate-50 space-y-2">
                    {results[cat.id].resumen_general && (
                      <p className="text-sm text-slate-700">{results[cat.id].resumen_general}</p>
                    )}
                    {(results[cat.id].novedades || []).map((n, i) => (
                      <div key={i} className="text-xs bg-white border rounded-lg p-2">
                        <p className="font-semibold text-slate-700">{n.titulo}</p>
                        {n.descripcion && <p className="text-slate-500 mt-0.5">{n.descripcion}</p>}
                        {n.url && (
                          <a href={n.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1 mt-1">
                            <Link2 className="w-3 h-3" /> Ver fuente
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Referencias generales de la categoría */}
                {cat.subtipo.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-slate-700">{sub.label}</span>
                    {sub.url && (
                      <a href={sub.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1">
                        <Wifi className="w-3 h-3" /> Ver fuente
                      </a>
                    )}
                  </div>
                ))}

                {/* Fuentes propias añadidas por el usuario */}
                <div className="px-4 py-3 bg-slate-50">
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Tus fuentes/páginas concretas</p>
                  <div className="space-y-1 mb-2">
                    {(sources[cat.id] || []).map((s, i) => (
                      <div key={i} className="flex items-center justify-between bg-white border rounded-lg px-2 py-1.5 text-xs">
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">{s.url}</a>
                        <button onClick={() => removeSource(cat.id, i)} className="text-slate-400 hover:text-red-500 ml-2">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {(sources[cat.id] || []).length === 0 && (
                      <p className="text-xs text-slate-400">Sin páginas propias añadidas todavía.</p>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <Input
                      placeholder="https://pagina-oficial-del-proveedor.com/tarifas"
                      value={newSourceUrl[cat.id] || ''}
                      onChange={(e) => setNewSourceUrl((prev) => ({ ...prev, [cat.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') addSource(cat.id); }}
                      className="text-xs h-8"
                    />
                    <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => addSource(cat.id)}>
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
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
