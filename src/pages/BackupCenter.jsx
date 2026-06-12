import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Shield, Download, Upload, RefreshCw, CheckCircle,
  AlertCircle, Clock, Settings, Archive, Trash2, FileText, RotateCcw, Info, ChevronDown, ChevronRight, Copy
} from 'lucide-react';
import { format } from 'date-fns';

const ALL_ENTITIES = [
  'Contact', 'Invoice', 'SATOrder', 'MaintenanceSheet', 'StockItem',
  'Supplier', 'SupplierPrice', 'Note', 'Appointment', 'Project',
  'ClientDocument', 'ClientNote', 'ThermalCalculation', 'SolarCalculation',
  'Equipment', 'ChangeLog', 'CompanySettings', 'LineTemplate', 'PriceItem',
  'AIConsultation', 'SATChatMessage', 'EquipmentDiary',
];

const ENTITY_LABELS = {
  Contact: 'Clientes / Contactos',
  Invoice: 'Facturas y Presupuestos',
  SATOrder: 'Órdenes SAT',
  MaintenanceSheet: 'Fichas Mantenimiento',
  StockItem: 'Inventario / Stock',
  Supplier: 'Proveedores',
  SupplierPrice: 'Tarifas Proveedores',
  Note: 'Notas',
  Appointment: 'Agenda / Citas',
  Project: 'Proyectos',
  ClientDocument: 'Documentos Clientes',
  ClientNote: 'Notas Clientes',
  ThermalCalculation: 'Cálculos Térmicos',
  SolarCalculation: 'Cálculos Solares',
  Equipment: 'Equipos',
  ChangeLog: 'Historial Cambios',
  CompanySettings: 'Config. Empresa',
  LineTemplate: 'Plantillas Líneas',
  PriceItem: 'Artículos Precio',
  AIConsultation: 'Consultas IA',
  SATChatMessage: 'Mensajes SAT',
  EquipmentDiary: 'Diario Equipos',
};

const STORAGE_KEY = 'backupConfig';
const HISTORY_KEY = 'backupHistory';

function loadConfig() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}
function saveConfig(cfg) { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); }
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch { return []; }
}
function saveHistory(h) { localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 20))); }

export default function BackupCenter() {
  const [tab, setTab] = useState('backup'); // backup | restore | duplicates | config | history
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [selectedEntities, setSelectedEntities] = useState(new Set(ALL_ENTITIES));
  const [expandEntities, setExpandEntities] = useState(false);

  // Config
  const [config, setConfig] = useState({ reminder_days: 7, include_images: false, format: 'json' });
  // History
  const [history, setHistory] = useState([]);

  // Restore
  const restoreRef = useRef(null);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreData, setRestoreData] = useState(null);
  const [restoreStatus, setRestoreStatus] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState('');
  const [restoreSelectedEntities, setRestoreSelectedEntities] = useState(new Set());
  const [restoreMode, setRestoreMode] = useState('update'); // 'clean' | 'update'

  // Duplicates
  const [dupLoading, setDupLoading] = useState(false);
  const [dupProgress, setDupProgress] = useState('');
  const [dupResults, setDupResults] = useState(null); // { entity, total, duplicates, removed }[]
  const [dupSelectedEntities, setDupSelectedEntities] = useState(new Set(ALL_ENTITIES));

  useEffect(() => {
    const cfg = loadConfig();
    if (cfg.reminder_days) setConfig(cfg);
    setHistory(loadHistory());
    loadCounts();
  }, []);

  const loadCounts = async () => {
    const c = {};
    for (const e of ALL_ENTITIES) {
      try {
        const data = await base44.entities[e]?.list('-created_date', 5000);
        c[e] = data?.length || 0;
      } catch {
        c[e] = 0;
      }
      await new Promise(r => setTimeout(r, 200));
    }
    setCounts(c);
  };

  const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);

  // ─── EXPORTAR BACKUP ──────────────────────────────────────────────────────
  const doBackup = async () => {
    setLoading(true);
    setProgress('Iniciando copia de seguridad...');
    setProgressPct(5);

    const entitiesToBackup = ALL_ENTITIES.filter(e => selectedEntities.has(e));
    const allData = {
      exported_at: new Date().toISOString(),
      version: '3.0',
      app: 'TechManager Pro',
      entities_count: entitiesToBackup.length,
    };

    for (let i = 0; i < entitiesToBackup.length; i++) {
      const ent = entitiesToBackup[i];
      setProgress(`Exportando ${ENTITY_LABELS[ent] || ent}... (${i + 1}/${entitiesToBackup.length})`);
      setProgressPct(Math.round(5 + (i / entitiesToBackup.length) * 85));
      const data = await base44.entities[ent]?.list('-created_date', 5000).catch(() => []);
      allData[ent] = data || [];
      await new Promise(r => setTimeout(r, 50));
    }

    setProgress('Generando archivo...');
    setProgressPct(95);

    const dateStr = format(new Date(), 'yyyy-MM-dd_HH-mm');
    const fileName = `backup_techmanager_${dateStr}.json`;
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);

    // Guardar en historial
    const totalExported = entitiesToBackup.reduce((s, e) => s + (allData[e]?.length || 0), 0);
    const newEntry = {
      date: new Date().toISOString(),
      fileName,
      records: totalExported,
      entities: entitiesToBackup.length,
      format: 'json',
    };
    const newHistory = [newEntry, ...loadHistory()];
    saveHistory(newHistory);
    setHistory(newHistory);

    // Actualizar config
    const updatedConfig = { ...config, last_backup: new Date().toISOString() };
    saveConfig(updatedConfig);
    setConfig(updatedConfig);

    setProgressPct(100);
    setProgress(`✅ Copia completada: ${totalExported.toLocaleString()} registros en ${entitiesToBackup.length} secciones`);
    setLoading(false);
    setTimeout(() => { setProgress(''); setProgressPct(0); }, 4000);
  };

  // ─── RESTAURAR BACKUP ────────────────────────────────────────────────────
  const handleRestoreFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setRestoreFile(file.name);
    setRestoreData(null);
    setRestoreStatus('');
    setRestoreProgress('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        setRestoreData(parsed);
        const available = ALL_ENTITIES.filter(e => parsed[e]?.length > 0);
        setRestoreSelectedEntities(new Set(available));
        const total = available.reduce((s, e) => s + (parsed[e]?.length || 0), 0);
        setRestoreStatus(`ok:Archivo válido · ${available.length} secciones · ${total.toLocaleString()} registros`);
      } catch {
        setRestoreStatus('err:Archivo no válido. Asegúrate de que es un backup JSON generado por esta aplicación.');
      }
    };
    reader.readAsText(file);
  };

  const doRestore = async () => {
    if (!restoreData) return;
    if (restoreMode === 'clean') {
      const confirmed = window.confirm(
        '⚠️ COPIA LIMPIA: Se borrarán TODOS los registros actuales de las secciones seleccionadas antes de restaurar.\n\n¿Estás seguro? Esta acción no se puede deshacer.'
      );
      if (!confirmed) return;
    }
    const entitiesToRestore = ALL_ENTITIES.filter(e => restoreSelectedEntities.has(e) && restoreData[e]?.length > 0);
    setRestoring(true);
    let total = 0;

    for (let i = 0; i < entitiesToRestore.length; i++) {
      const ent = entitiesToRestore[i];

      // Modo limpio: borrar todos los registros existentes primero
      if (restoreMode === 'clean') {
        setRestoreProgress(`Limpiando ${ENTITY_LABELS[ent] || ent}... (${i + 1}/${entitiesToRestore.length})`);
        const existing = await base44.entities[ent]?.list('-created_date', 5000).catch(() => []);
        for (const rec of (existing || [])) {
          await base44.entities[ent]?.delete(rec.id).catch(() => {});
        }
      }

      setRestoreProgress(`Restaurando ${ENTITY_LABELS[ent] || ent}... (${i + 1}/${entitiesToRestore.length})`);
      const rows = restoreData[ent] || [];

      if (restoreMode === 'update') {
        // Modo actualizar: cargar IDs existentes y solo insertar los que faltan
        const existing = await base44.entities[ent]?.list('-created_date', 5000).catch(() => []);
        const existingSignatures = new Set(
          (existing || []).map(r => JSON.stringify({ ...(({ id, created_date, updated_date, created_by, ...rest }) => rest)(r) }))
        );
        const toInsert = rows.filter(r => {
          const { id, created_date, updated_date, created_by, ...rest } = r;
          return !existingSignatures.has(JSON.stringify(rest));
        }).map(r => {
          const { id, created_date, updated_date, created_by, ...rest } = r;
          return rest;
        });
        for (let j = 0; j < toInsert.length; j += 100) {
          await base44.entities[ent]?.bulkCreate(toInsert.slice(j, j + 100)).catch(() => {});
          await new Promise(r => setTimeout(r, 100));
        }
        total += toInsert.length;
      } else {
        // Modo limpio: insertar todo
        const clean = rows.map(r => {
          const { id, created_date, updated_date, created_by, ...rest } = r;
          return rest;
        });
        for (let j = 0; j < clean.length; j += 100) {
          await base44.entities[ent]?.bulkCreate(clean.slice(j, j + 100)).catch(() => {});
          await new Promise(r => setTimeout(r, 100));
        }
        total += clean.length;
      }
    }
    setRestoreProgress(`✅ Restauración completa: ${total.toLocaleString()} registros ${restoreMode === 'clean' ? 'restaurados' : 'añadidos'} en ${entitiesToRestore.length} secciones.`);
    setRestoring(false);
    loadCounts();
  };

  // ─── ELIMINAR DUPLICADOS ──────────────────────────────────────────────────
  const findAndDeleteDuplicates = async () => {
    const confirmed = window.confirm(
      '¿Seguro que quieres eliminar los registros duplicados? Se compararán todos los campos excepto ID y fechas. Esta acción no se puede deshacer.'
    );
    if (!confirmed) return;
    setDupLoading(true);
    setDupResults(null);
    const results = [];
    const entitiesToCheck = ALL_ENTITIES.filter(e => dupSelectedEntities.has(e));

    for (let i = 0; i < entitiesToCheck.length; i++) {
      const ent = entitiesToCheck[i];
      setDupProgress(`Analizando ${ENTITY_LABELS[ent] || ent}... (${i + 1}/${entitiesToCheck.length})`);
      const all = await base44.entities[ent]?.list('-created_date', 5000).catch(() => []);
      if (!all || all.length === 0) continue;

      const seen = new Map();
      const toDelete = [];
      for (const rec of all) {
        const { id, created_date, updated_date, created_by, ...rest } = rec;
        const sig = JSON.stringify(rest);
        if (seen.has(sig)) {
          toDelete.push(id);
        } else {
          seen.set(sig, id);
        }
      }

      if (toDelete.length > 0) {
        setDupProgress(`Eliminando ${toDelete.length} duplicados en ${ENTITY_LABELS[ent] || ent}...`);
        for (const id of toDelete) {
          await base44.entities[ent]?.delete(id).catch(() => {});
        }
      }

      results.push({ entity: ent, total: all.length, duplicates: toDelete.length });
    }
    setDupResults(results);
    setDupProgress(`✅ Proceso completado. ${results.reduce((s, r) => s + r.duplicates, 0)} duplicados eliminados.`);
    setDupLoading(false);
    loadCounts();
  };

  // ─── GUARDAR CONFIG ───────────────────────────────────────────────────────
  const handleSaveConfig = () => {
    saveConfig(config);
    alert('✅ Configuración guardada');
  };

  const lastBackupDate = config.last_backup ? new Date(config.last_backup) : null;
  const daysSinceBackup = lastBackupDate ? Math.floor((new Date() - lastBackupDate) / (1000 * 60 * 60 * 24)) : null;
  const backupUrgent = daysSinceBackup === null || daysSinceBackup >= (config.reminder_days || 7);

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Cabecera */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-700" />
            Centro de Copias de Seguridad
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{totalRecords.toLocaleString()} registros en {ALL_ENTITIES.length} secciones</p>
        </div>
        {backupUrgent && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-800 font-medium">
              {daysSinceBackup === null ? 'Aún no hay ningún backup guardado' : `Último backup hace ${daysSinceBackup} días`}
            </span>
          </div>
        )}
        {!backupUrgent && lastBackupDate && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-800 font-medium">Backup al día · hace {daysSinceBackup} días</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {[
          { id: 'backup', label: 'Crear backup', icon: Download },
          { id: 'restore', label: 'Restaurar', icon: Upload },
          { id: 'duplicates', label: 'Duplicados', icon: Copy },
          { id: 'config', label: 'Configuración', icon: Settings },
          { id: 'history', label: 'Historial', icon: Clock },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              <Icon className="w-4 h-4" />{t.label}
            </button>
          );
        })}
      </div>

      {/* ═══════════ TAB: CREAR BACKUP ═══════════ */}
      {tab === 'backup' && (
        <div className="space-y-4">
          {/* Banner de acción rápida */}
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-gray-900">Copia de seguridad completa</h2>
                  <p className="text-sm text-gray-600 mt-0.5">
                    Genera un archivo JSON con <strong>todos tus datos</strong>: clientes, facturas, SATs, presupuestos, configuración, etc. Guárdalo en tu PC, disco externo o nube.
                  </p>
                </div>
                <Button
                  onClick={doBackup}
                  disabled={loading}
                  className="bg-blue-700 hover:bg-blue-800 gap-2 text-base px-6 py-3 h-auto flex-shrink-0 shadow-md"
                >
                  {loading
                    ? <RefreshCw className="w-5 h-5 animate-spin" />
                    : <Download className="w-5 h-5" />}
                  {loading ? 'Generando...' : 'Descargar backup ahora'}
                </Button>
              </div>

              {/* Progreso */}
              {loading && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs text-blue-700 font-medium">
                    <span>{progress}</span>
                    <span>{progressPct}%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2.5">
                    <div className="h-2.5 bg-blue-600 rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>
              )}
              {!loading && progress && (
                <div className="mt-3 bg-green-100 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-800 font-medium">
                  {progress}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selección de secciones */}
          <Card>
            <CardContent className="p-4">
              <button
                onClick={() => setExpandEntities(v => !v)}
                className="flex items-center gap-2 text-sm font-semibold text-gray-700 w-full text-left"
              >
                {expandEntities ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                Secciones incluidas en el backup ({selectedEntities.size} de {ALL_ENTITIES.length})
              </button>

              {expandEntities && (
                <div className="mt-3 space-y-2">
                  <div className="flex gap-2 mb-2">
                    <button onClick={() => setSelectedEntities(new Set(ALL_ENTITIES))} className="text-xs text-blue-600 underline">Seleccionar todo</button>
                    <button onClick={() => setSelectedEntities(new Set())} className="text-xs text-gray-400 underline">Deseleccionar todo</button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {ALL_ENTITIES.map(ent => {
                      const checked = selectedEntities.has(ent);
                      return (
                        <label key={ent} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${checked ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const next = new Set(selectedEntities);
                              checked ? next.delete(ent) : next.add(ent);
                              setSelectedEntities(next);
                            }}
                            className="rounded"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-800 truncate">{ENTITY_LABELS[ent] || ent}</p>
                            <p className="text-[10px] text-gray-400">{counts[ent] != null ? `${counts[ent]} registros` : '...'}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instrucciones */}
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4 space-y-2">
              <p className="text-sm font-semibold text-amber-800 flex items-center gap-2"><Info className="w-4 h-4" />¿Dónde guardar el backup?</p>
              <ul className="text-xs text-amber-700 space-y-1">
                <li>📁 <strong>PC local:</strong> Crea una carpeta "Backups TechManager" en el escritorio o en Documentos</li>
                <li>☁️ <strong>Google Drive / OneDrive:</strong> Sube el archivo .json a tu carpeta de nube</li>
                <li>💾 <strong>Disco externo / USB:</strong> Copia el archivo al disco de seguridad</li>
                <li>📧 <strong>Email:</strong> Envíate el archivo como adjunto para tenerlo en dos sitios</li>
              </ul>
              <p className="text-xs text-amber-600 font-medium mt-2">💡 Recomendamos hacer una copia cada {config.reminder_days || 7} días y después de cada trabajo importante.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════ TAB: RESTAURAR ═══════════ */}
      {tab === 'restore' && (
        <div className="space-y-4">
          <Card className="border-2 border-green-200">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-green-600 flex items-center justify-center flex-shrink-0">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Restaurar desde backup</h2>
                  <p className="text-sm text-gray-600 mt-0.5">Sube un archivo JSON generado por esta aplicación para recuperar tus datos.</p>
                </div>
              </div>

              {/* Soltar / seleccionar archivo */}
              <div
                onClick={() => restoreRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { restoreRef.current.files = e.dataTransfer.files; handleRestoreFile({ target: { files: e.dataTransfer.files } }); } }}
                className="border-2 border-dashed border-green-300 rounded-xl p-8 text-center cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors"
              >
                <Archive className="w-10 h-10 text-green-400 mx-auto mb-2" />
                <p className="font-semibold text-gray-700">Arrastra el archivo JSON aquí</p>
                <p className="text-sm text-gray-400 mt-1">o haz clic para seleccionarlo</p>
                {restoreFile && (
                  <div className="mt-3 inline-flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1.5 rounded-lg text-sm font-medium">
                    <FileText className="w-4 h-4" />{restoreFile}
                  </div>
                )}
                <input ref={restoreRef} type="file" accept=".json" className="hidden" onChange={handleRestoreFile} />
              </div>

              {/* Estado del archivo */}
              {restoreStatus && (
                <div className={`rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 ${restoreStatus.startsWith('ok:') ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
                  {restoreStatus.startsWith('ok:') ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                  {restoreStatus.replace(/^(ok:|err:)/, '')}
                </div>
              )}

              {/* Modo de restauración */}
              {restoreData && restoreStatus.startsWith('ok:') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => setRestoreMode('update')}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${restoreMode === 'update' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-200'}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <RefreshCw className={`w-5 h-5 ${restoreMode === 'update' ? 'text-blue-600' : 'text-gray-400'}`} />
                      <span className="font-semibold text-sm text-gray-900">Actualizar (recomendado)</span>
                      {restoreMode === 'update' && <CheckCircle className="w-4 h-4 text-blue-600 ml-auto" />}
                    </div>
                    <p className="text-xs text-gray-500">Solo añade los registros que <strong>faltan</strong>. No borra nada de lo existente. Ideal para recuperar datos perdidos.</p>
                  </button>
                  <button
                    onClick={() => setRestoreMode('clean')}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${restoreMode === 'clean' ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-white hover:border-red-200'}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Trash2 className={`w-5 h-5 ${restoreMode === 'clean' ? 'text-red-600' : 'text-gray-400'}`} />
                      <span className="font-semibold text-sm text-gray-900">Copia limpia</span>
                      {restoreMode === 'clean' && <CheckCircle className="w-4 h-4 text-red-600 ml-auto" />}
                    </div>
                    <p className="text-xs text-gray-500"><strong>Borra todo</strong> lo existente en las secciones seleccionadas y restaura desde el backup. Úsalo solo si quieres reemplazar completamente los datos.</p>
                  </button>
                </div>
              )}

              {/* Selector de secciones a restaurar */}
              {restoreData && restoreStatus.startsWith('ok:') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-700">Selecciona qué secciones restaurar:</p>
                    <div className="flex gap-2">
                      <button onClick={() => setRestoreSelectedEntities(new Set(ALL_ENTITIES.filter(e => restoreData[e]?.length > 0)))} className="text-xs text-blue-600 underline">Todas</button>
                      <button onClick={() => setRestoreSelectedEntities(new Set())} className="text-xs text-gray-400 underline">Ninguna</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {ALL_ENTITIES.filter(e => restoreData[e]?.length > 0).map(ent => {
                      const checked = restoreSelectedEntities.has(ent);
                      return (
                        <label key={ent} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${checked ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'}`}>
                          <input type="checkbox" checked={checked}
                            onChange={() => {
                              const next = new Set(restoreSelectedEntities);
                              checked ? next.delete(ent) : next.add(ent);
                              setRestoreSelectedEntities(next);
                            }} className="rounded" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-800 truncate">{ENTITY_LABELS[ent] || ent}</p>
                            <p className="text-[10px] text-gray-400">{restoreData[ent]?.length} registros</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {restoreProgress && (
                    <div className={`rounded-lg px-3 py-2 text-sm font-medium ${restoreProgress.startsWith('✅') ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                      {restoreProgress}
                    </div>
                  )}

                  <Button
                    onClick={doRestore}
                    disabled={restoring || restoreSelectedEntities.size === 0}
                    className={`w-full gap-2 py-3 h-auto text-base ${restoreMode === 'clean' ? 'bg-red-700 hover:bg-red-800' : 'bg-green-700 hover:bg-green-800'}`}
                  >
                    {restoring ? <RefreshCw className="w-5 h-5 animate-spin" /> : <RotateCcw className="w-5 h-5" />}
                    {restoring
                      ? restoreProgress || 'Restaurando...'
                      : restoreMode === 'clean'
                        ? `⚠️ Copia limpia: borrar y restaurar ${restoreSelectedEntities.size} secciones`
                        : `Actualizar: añadir datos faltantes en ${restoreSelectedEntities.size} secciones`}
                  </Button>

                  {restoreMode === 'clean' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
                      <p className="font-semibold mb-1">🚨 Copia limpia — Acción destructiva</p>
                      <p>Se borrarán <strong>todos los registros actuales</strong> de las secciones seleccionadas y se sustituirán por los del backup. Se pedirá confirmación antes de proceder.</p>
                    </div>
                  )}
                  {restoreMode === 'update' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                      <p className="font-semibold mb-1">ℹ️ Modo actualizar</p>
                      <p>Solo se añadirán registros que no existan ya en la base de datos. Los datos actuales no se modifican ni eliminan.</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════ TAB: DUPLICADOS ═══════════ */}
      {tab === 'duplicates' && (
        <div className="space-y-4">
          <Card className="border-2 border-orange-200">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center flex-shrink-0">
                  <Copy className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Eliminar registros duplicados</h2>
                  <p className="text-sm text-gray-600 mt-0.5">
                    Detecta y elimina automáticamente registros idénticos en cualquier sección. Se comparan todos los campos excepto el ID y las fechas del sistema.
                  </p>
                </div>
              </div>

              {/* Selección de secciones */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">Secciones a analizar:</p>
                  <div className="flex gap-2">
                    <button onClick={() => setDupSelectedEntities(new Set(ALL_ENTITIES))} className="text-xs text-blue-600 underline">Todas</button>
                    <button onClick={() => setDupSelectedEntities(new Set())} className="text-xs text-gray-400 underline">Ninguna</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {ALL_ENTITIES.map(ent => {
                    const checked = dupSelectedEntities.has(ent);
                    const result = dupResults?.find(r => r.entity === ent);
                    return (
                      <label key={ent} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${checked ? 'bg-orange-50 border-orange-300' : 'bg-gray-50 border-gray-200'}`}>
                        <input type="checkbox" checked={checked}
                          onChange={() => {
                            const next = new Set(dupSelectedEntities);
                            checked ? next.delete(ent) : next.add(ent);
                            setDupSelectedEntities(next);
                          }} className="rounded" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-gray-800 truncate">{ENTITY_LABELS[ent] || ent}</p>
                          {result ? (
                            <p className={`text-[10px] font-semibold ${result.duplicates > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {result.duplicates > 0 ? `${result.duplicates} eliminados` : '✓ Sin duplicados'}
                            </p>
                          ) : (
                            <p className="text-[10px] text-gray-400">{counts[ent] != null ? `${counts[ent]} registros` : '...'}</p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {dupProgress && (
                <div className={`rounded-lg px-3 py-2 text-sm font-medium ${dupProgress.startsWith('✅') ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                  {dupProgress}
                </div>
              )}

              {dupResults && (
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="text-left p-2 font-semibold text-gray-600">Sección</th>
                        <th className="text-right p-2 font-semibold text-gray-600">Total analizados</th>
                        <th className="text-right p-2 font-semibold text-gray-600">Duplicados eliminados</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {dupResults.filter(r => r.duplicates > 0 || r.total > 0).map(r => (
                        <tr key={r.entity} className={r.duplicates > 0 ? 'bg-red-50' : 'bg-white'}>
                          <td className="p-2 font-medium">{ENTITY_LABELS[r.entity] || r.entity}</td>
                          <td className="p-2 text-right text-gray-500">{r.total}</td>
                          <td className={`p-2 text-right font-bold ${r.duplicates > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {r.duplicates > 0 ? `-${r.duplicates}` : '✓ 0'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <Button
                onClick={findAndDeleteDuplicates}
                disabled={dupLoading || dupSelectedEntities.size === 0}
                className="w-full bg-orange-600 hover:bg-orange-700 gap-2 py-3 h-auto text-base"
              >
                {dupLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                {dupLoading ? dupProgress || 'Analizando...' : `Detectar y eliminar duplicados en ${dupSelectedEntities.size} secciones`}
              </Button>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                <p className="font-semibold mb-1">ℹ️ ¿Cómo funciona?</p>
                <p>Se comparan todos los campos de cada registro (excepto ID, fecha creación, fecha actualización y usuario). Si dos registros tienen exactamente los mismos valores, se elimina el duplicado más reciente. Se pedirá confirmación antes de borrar.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════ TAB: CONFIGURACIÓN ═══════════ */}
      {tab === 'config' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Settings className="w-4 h-4" />Configuración de copias de seguridad</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Recordatorio de backup cada (días)</label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="1" max="90"
                    value={config.reminder_days || 7}
                    onChange={e => setConfig(c => ({ ...c, reminder_days: parseInt(e.target.value) || 7 }))}
                    className="w-24"
                  />
                  <span className="text-sm text-gray-500">días entre cada copia recomendada</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Verás un aviso en la cabecera cuando superes este plazo sin hacer backup.</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Secciones incluidas por defecto</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {ALL_ENTITIES.map(ent => (
                    <div key={ent} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      <p className="text-xs text-gray-700 truncate">{ENTITY_LABELS[ent] || ent}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">Puedes excluir secciones específicas justo antes de generar el backup.</p>
              </div>

              <Button onClick={handleSaveConfig} className="bg-blue-700 hover:bg-blue-800 gap-2">
                <CheckCircle className="w-4 h-4" />Guardar configuración
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 space-y-2">
              <p className="text-sm font-semibold text-blue-800">📋 Guía de buenas prácticas</p>
              <ul className="text-xs text-blue-700 space-y-1.5">
                <li>✅ Haz backup <strong>al menos 1 vez a la semana</strong> si usas el programa a diario</li>
                <li>✅ Guarda siempre el backup en <strong>dos sitios diferentes</strong> (PC + nube o USB)</li>
                <li>✅ Haz backup extra antes de <strong>importar tarifas o datos masivos</strong></li>
                <li>✅ Nombra los archivos con la fecha para localizarlos fácilmente</li>
                <li>✅ Comprueba periódicamente que el archivo se puede restaurar correctamente</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════ TAB: HISTORIAL ═══════════ */}
      {tab === 'history' && (
        <div className="space-y-3">
          {history.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-400">
                <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>Aún no se ha generado ningún backup desde este navegador</p>
                <p className="text-xs mt-1">El historial se guarda localmente en este dispositivo</p>
              </CardContent>
            </Card>
          ) : (
            history.map((entry, i) => (
              <Card key={i} className="border-l-4 border-l-blue-400">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0">
                    <Archive className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{entry.fileName}</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(entry.date), 'dd/MM/yyyy HH:mm')} ·
                      {entry.records?.toLocaleString()} registros ·
                      {entry.entities} secciones
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs text-green-700 border-green-200 bg-green-50">
                    <CheckCircle className="w-3 h-3 mr-1" />JSON
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
          {history.length > 0 && (
            <button
              onClick={() => { saveHistory([]); setHistory([]); }}
              className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 mx-auto"
            >
              <Trash2 className="w-3 h-3" />Borrar historial local
            </button>
          )}
          <p className="text-xs text-center text-gray-400">El historial se almacena en este navegador/dispositivo. Los archivos de backup están en tu PC.</p>
        </div>
      )}
    </div>
  );
}