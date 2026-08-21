import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NumberField } from "@/components/ui/number-field";
import {
  Shield, Download, Upload, RefreshCw, CheckCircle,
  AlertCircle, Clock, Settings, Archive, Trash2, FileText, RotateCcw, Info, ChevronDown, ChevronRight, Copy
} from 'lucide-react';
import { format } from 'date-fns';
import { fetchAllRecordsFast, runBackupJob, runRestoreJob } from '@/lib/backupEngine';
import {
  detectarEntorno, nombreCopia, listarCopias,
  abrirCarpetaCopias, leerDestino, guardarDestino, DESTINOS_MOVIL,
  SUBCARPETA_POR_DEFECTO, limpiarCarpeta,
  leerCarpetaPC, guardarCarpetaPC, elegirCarpetaPC,
  listarCarpetasMovil, crearCarpetaMovil, elegirCarpetaMovil, guardarComoEnMovil,
  abrirCopiaPorPartes,
} from '@/lib/guardarCopia';

const ALL_ENTITIES = [
  'Contact', 'Invoice', 'SATOrder', 'MaintenanceSheet', 'StockItem',
  'Supplier', 'SupplierPrice', 'Note', 'Appointment', 'Project',
  'ClientDocument', 'ClientNote', 'ThermalCalculation', 'SolarCalculation',
  'Equipment', 'ChangeLog', 'CompanySettings', 'LineTemplate', 'PriceItem',
  'AIConsultation', 'SATChatMessage', 'EquipmentDiary',
  // Añadidas para cubrir TODOS los apartados del programa:
  'ChangeOpinionRequest', 'ClientMachine', 'DocumentTemplate',
  'EquipmentFailure', 'SATWorkTemplate', 'SupplierCatalog', 'SystemSettings',
];

// Lee TODOS los registros de una entidad de forma robusta y rápida (paginado
// EN PARALELO por rondas, con reintento sin orden si falla). Evita que una
// sección quede vacía en la copia por un fallo de ordenación o por superar
// un límite. Implementación real en src/lib/backupEngine.js, compartida con
// la copia de seguridad y la restauración para que todas usen el mismo
// motor rápido.
const fetchAllRecords = fetchAllRecordsFast;

// Clave natural por sección para el UPSERT al restaurar (actualizar en vez de
// duplicar). Devuelve una cadena estable o null (si null → se usa el cotejo por
// contenido exacto, pensado para registros de tipo "histórico" que solo se añaden).
const _s = (v) => (v == null ? '' : String(v).trim().toLowerCase());
const KEYERS = {
  Contact:            (r) => _s(r.nif) || _s(r.email) || _s(r.phone) || (_s(r.name) && `${_s(r.name)}|${_s(r.surname)}`) || null,
  Supplier:           (r) => _s(r.nif) || _s(r.cif) || _s(r.name) || null,
  SupplierPrice:      (r) => (_s(r.product_code) && `${_s(r.supplier_id)}|${_s(r.product_code)}`) || (_s(r.product_name) && `${_s(r.supplier_id)}|${_s(r.product_name)}`) || null,
  PriceItem:          (r) => _s(r.supplier_ref) || _s(r.description) || null,
  Invoice:            (r) => (_s(r.doc_number) && `${_s(r.doc_type)}|${_s(r.doc_number)}`) || null,
  SATOrder:           (r) => _s(r.order_number) || null,
  MaintenanceSheet:   (r) => _s(r.sheet_number) || null,
  StockItem:          (r) => _s(r.sku) || _s(r.ref) || _s(r.name) || null,
  Project:            (r) => _s(r.name) || null,
  LineTemplate:       (r) => _s(r.name) || null,
  Equipment:          (r) => _s(r.serial_number) || (_s(r.brand) && `${_s(r.brand)}|${_s(r.model)}|${_s(r.name)}`) || null,
  ThermalCalculation: (r) => _s(r.name) || null,
  SolarCalculation:   (r) => _s(r.name) || null,
  CompanySettings:    () => 'singleton',
  Appointment:        (r) => (_s(r.date) && `${_s(r.date)}|${_s(r.time_start)}|${_s(r.title)}`) || null,
  Note:               (r) => _s(r.title) || null,
  ClientDocument:     (r) => (_s(r.contact_id) && `${_s(r.contact_id)}|${_s(r.name)}`) || null,
  ClientNote:         (r) => (_s(r.contact_id) && `${_s(r.contact_id)}|${_s(r.content).slice(0,60)}`) || null,
  ClientMachine:      (r) => _s(r.serial_number) || (_s(r.contact_id) && `${_s(r.contact_id)}|${_s(r.brand)}|${_s(r.model)}`) || null,
  DocumentTemplate:   (r) => _s(r.name) || null,
  SATWorkTemplate:    (r) => _s(r.name) || null,
  SupplierCatalog:    (r) => (_s(r.supplier_id) && `${_s(r.supplier_id)}|${_s(r.name)}`) || _s(r.name) || null,
  SystemSettings:     (r) => _s(r.key) || null,
  // ChangeLog, AIConsultation, SATChatMessage, EquipmentDiary, ChangeOpinionRequest,
  // EquipmentFailure → histórico: sin clave (solo añadir lo que falte)
};

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
  ChangeOpinionRequest: 'Solicitudes Cambio Opinión',
  ClientMachine: 'Máquinas de Clientes',
  DocumentTemplate: 'Plantillas de Documento',
  EquipmentFailure: 'Averías de Equipos',
  SATWorkTemplate: 'Plantillas de Trabajo SAT',
  SupplierCatalog: 'Catálogos de Proveedor',
  SystemSettings: 'Ajustes del Sistema',
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

  // Dónde se guarda el fichero de la copia.
  // El enlace de descarga de siempre no escribe nada en el móvil, así que
  // aquí se lleva el sitio de verdad: carpeta del programa en el ordenador,
  // carpeta elegida en el teléfono.
  const entornoCopias = detectarEntorno();
  const [destinoMovil, setDestinoMovil] = useState(() => leerDestino());
  const [carpetaEscritorio, setCarpetaEscritorio] = useState(null);
  const [carpetaPC, setCarpetaPC] = useState(() => leerCarpetaPC());
  const [errorCarpeta, setErrorCarpeta] = useState('');
  const [ultimaCopia, setUltimaCopia] = useState(null);
  const [compartirError, setCompartirError] = useState('');
  // En el móvil, al terminar la copia se abre el cuadro del sistema para
  // decir dónde va. Es lo único que Android permite sin pelearse con los
  // permisos: la aplicación no puede escribir donde quiera, pero el usuario
  // sí puede mandar el fichero donde quiera.
  const [preguntarDonde, setPreguntarDonde] = useState(() => {
    try { return localStorage.getItem('gpt_copias_preguntar') !== 'no'; } catch { return true; }
  });
  const cambiarPreguntarDonde = (valor) => {
    setPreguntarDonde(valor);
    try { localStorage.setItem('gpt_copias_preguntar', valor ? 'si' : 'no'); } catch { /* sin guardar */ }
  };

  /**
   * Abre el EXPLORADOR DE FICHEROS del sistema para que elija la carpeta.
   * Si el explorador no está disponible en ese teléfono, se ofrece el cuadro
   * de compartir, que al menos permite mandarla a Drive o al correo.
   */
  const elegirDondeDejarla = async (copia) => {
    setCompartirError('');
    // Se le pasa la RUTA del fichero ya escrito, no su contenido: mandarlo
    // entero por el puente cerraba la aplicación con las copias grandes.
    const r = await guardarComoEnMovil({ nombre: copia.nombre, origen: copia.uri });
    if (r.ok) {
      setUltimaCopia(c => (c ? { ...c, guardadaEn: r.uri, aviso: undefined } : c));
      return;
    }
    if (r.cancelado) return;   // ha cerrado el explorador: la copia sigue guardada
    // Segundo camino: el cuadro de compartir.
    const r2 = await elegirCarpetaMovil({ uri: copia.uri, nombre: copia.nombre });
    if (!r2.ok && r2.motivo) {
      setCompartirError(`${r.motivo}. Tampoco se pudo abrir el cuadro de compartir: ${r2.motivo}`);
    } else if (!r2.ok && !r2.motivo) {
      setCompartirError('');
    }
  };

  const refrescarCarpeta = React.useCallback(async (ruta) => {
    const r = await listarCopias(ruta !== undefined ? ruta : carpetaPC);
    if (r) setCarpetaEscritorio(r);
  }, [carpetaPC]);

  useEffect(() => { refrescarCarpeta(); }, [refrescarCarpeta]);

  /** Abre el selector de carpetas del sistema y se queda con la elegida. */
  const elegirCarpetaDelPC = async () => {
    setErrorCarpeta('');
    const r = await elegirCarpetaPC();
    if (r?.cancelado) return;
    if (!r?.ok) { setErrorCarpeta(r?.error || 'No se pudo elegir la carpeta'); return; }
    guardarCarpetaPC(r.carpeta);
    setCarpetaPC(r.carpeta);
    refrescarCarpeta(r.carpeta);
  };

  /** Vuelve a la carpeta de al lado del programa. */
  const volverACarpetaDelPrograma = () => {
    guardarCarpetaPC('');
    setCarpetaPC('');
    setErrorCarpeta('');
    refrescarCarpeta('');
  };

  const cambiarDestino = (cambio) => {
    setDestinoMovil(prev => guardarDestino({ ...prev, ...cambio }));
  };

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
    // En paralelo (con límite) en vez de una entidad cada 200ms: en cuentas
    // con muchas secciones esto pasaba de tardar varios segundos a menos de uno.
    const CONCURRENCY = 5;
    let idx = 0;
    const worker = async () => {
      while (idx < ALL_ENTITIES.length) {
        const e = ALL_ENTITIES[idx++];
        try {
          const data = await fetchAllRecords(e);
          c[e] = data?.length || 0;
        } catch {
          c[e] = 0;
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ALL_ENTITIES.length) }, worker));
    setCounts(c);
  };

  const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);

  // ─── EXPORTAR BACKUP ──────────────────────────────────────────────────────
  const doBackup = async () => {
    setLoading(true);
    setProgress('Iniciando copia de seguridad...');
    setProgressPct(5);

    const entitiesToBackup = ALL_ENTITIES.filter(e => selectedEntities.has(e));

    // Varias secciones a la vez (no una a una): en cuentas con muchos datos
    // (documentos, fotos, órdenes SAT...) la copia tarda mucho menos.
    const exported = await runBackupJob(entitiesToBackup, ENTITY_LABELS, (msg, pct) => {
      setProgress(msg);
      setProgressPct(pct);
    });
    const allData = {
      exported_at: new Date().toISOString(),
      version: '3.0',
      app: 'TechManager Pro',
      entities_count: entitiesToBackup.length,
      ...exported,
    };

    setProgress('Generando archivo...');
    setProgressPct(90);

    const fileName = nombreCopia(new Date());

    // El fichero se escribe SECCIÓN A SECCIÓN. Antes se montaba la copia
    // entera como un solo texto (JSON.stringify de todo) y con muchos
    // clientes, fotos y documentos ese texto no cabe en memoria: la
    // aplicación se cerraba justo al llegar al final, cuando parecía que ya
    // estaba hecha. Así en memoria solo está la sección que toca.
    const fichero = await abrirCopiaPorPartes({
      nombre: fileName, destino: destinoMovil, carpetaPC,
    });
    if (!fichero.ok) {
      setProgressPct(0);
      setProgress(`❌ No se pudo crear el fichero: ${fichero.error}`);
      setUltimaCopia(null);
      setLoading(false);
      return;
    }

    let guardado;
    try {
      // Cabecera de la copia.
      await fichero.escribir('{\n');
      await fichero.escribir(`"exported_at":${JSON.stringify(allData.exported_at)},\n`);
      await fichero.escribir(`"version":${JSON.stringify(allData.version)},\n`);
      await fichero.escribir(`"app":${JSON.stringify(allData.app)},\n`);
      await fichero.escribir(`"entities_count":${allData.entities_count}`);

      // Y ahora una sección por vez.
      for (let i = 0; i < entitiesToBackup.length; i++) {
        const nombreSeccion = entitiesToBackup[i];
        const registros = allData[nombreSeccion] || [];
        setProgress(`Escribiendo ${ENTITY_LABELS[nombreSeccion] || nombreSeccion}…`);
        setProgressPct(90 + Math.round((i / entitiesToBackup.length) * 9));
        await fichero.escribir(`,\n${JSON.stringify(nombreSeccion)}:${JSON.stringify(registros)}`);
        // Un respiro al navegador para que no se atragante ni se congele la
        // pantalla mientras escribe secciones grandes.
        await new Promise(r => setTimeout(r, 0));
      }
      await fichero.escribir('\n}\n');
      guardado = await fichero.cerrar();
    } catch (err) {
      await fichero.cancelar();
      setProgressPct(0);
      setProgress(`❌ No se pudo escribir la copia: ${err?.message || 'error desconocido'}`);
      setUltimaCopia(null);
      setLoading(false);
      return;
    }

    if (!guardado.ok) {
      setProgressPct(0);
      setProgress(`❌ No se pudo guardar la copia: ${guardado.error}`);
      setUltimaCopia(null);
      setLoading(false);
      return;   // sin fichero no hay copia: no se apunta en el historial
    }

    // El contenido de la copia NO se guarda en memoria: ya está en disco, y
    // tenerlo aquí además era parte del problema con las copias grandes.
    const copia = { ...guardado, nombre: fileName };
    setUltimaCopia(copia);
    setCompartirError('');
    if (guardado.entorno === 'escritorio') refrescarCarpeta();

    // Guardar en historial
    const totalExported = entitiesToBackup.reduce((s, e) => s + (allData[e]?.length || 0), 0);
    const newEntry = {
      date: new Date().toISOString(),
      fileName,
      records: totalExported,
      entities: entitiesToBackup.length,
      format: 'json',
      ruta: guardado.ruta || '',
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

    // El fichero YA está escrito. Ahora se pregunta dónde quiere dejarlo, con
    // el cuadro del sistema. Si lo cierra sin elegir, la copia sigue estando
    // donde se escribió: no se pierde por cancelar.
    if (guardado.entorno === 'movil' && preguntarDonde && guardado.uri) {
      elegirDondeDejarla(copia);
    }
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

    // Varias secciones a la vez (no una a una): mucho más rápido con copias
    // grandes. El motor compartido (backupEngine.js) sigue corriendo aunque
    // se navegue a otra pantalla, y cuenta los fallos reales en vez de dar
    // un falso "completado" si algo no se guarda.
    const { total, failed } = await runRestoreJob(
      restoreData, entitiesToRestore, restoreMode, KEYERS, ENTITY_LABELS,
      (msg) => setRestoreProgress(msg)
    );

    const okMsg = `✅ Restauración completa: ${total.toLocaleString()} registros ${restoreMode === 'clean' ? 'restaurados' : 'actualizados/añadidos (sin duplicar)'} en ${entitiesToRestore.length} secciones.`;
    const failMsg = `⚠️ ${failed.toLocaleString()} operaciones fallaron al guardar en el servidor (revisa la conexión y vuelve a intentarlo). Consulta la consola para más detalle.`;
    setRestoreProgress(failed > 0 ? `${okMsg}\n${failMsg}` : okMsg);
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
      const all = await fetchAllRecords(ent);
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
                    Genera un archivo JSON con <strong>todos tus datos</strong>: clientes, facturas,
                    SATs, presupuestos, configuración, etc. Se guarda solo en la carpeta que tengas
                    elegida aquí abajo, y al terminar se te dice la ruta exacta del fichero.
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
                  {loading ? 'Generando...' : 'Hacer copia ahora'}
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
                <div className={`mt-3 border rounded-lg px-3 py-2 text-sm font-medium ${
                  progress.startsWith('❌')
                    ? 'bg-red-100 border-red-200 text-red-800'
                    : 'bg-green-100 border-green-200 text-green-800'
                }`}>
                  {progress}
                </div>
              )}

              {/* Dónde ha quedado el fichero. Antes no se decía y en el móvil
                  ni siquiera existía: ahora se enseña la ruta de verdad. */}
              {!loading && ultimaCopia?.ok && (
                <div className="mt-2 bg-white border border-green-200 rounded-lg px-3 py-2 text-xs text-gray-700">
                  <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                    Fichero guardado ({(ultimaCopia.bytes / 1024).toFixed(0)} KB)
                  </p>
                  <p className="mt-1 font-mono text-[11px] break-all text-gray-600">{ultimaCopia.ruta}</p>
                  {ultimaCopia.aviso && (
                    <p className="mt-1 text-amber-700 bg-amber-50 border border-amber-200 rounded p-1.5">
                      {ultimaCopia.aviso}
                    </p>
                  )}
                  <div className="mt-1.5 flex items-center gap-3 flex-wrap">
                    {ultimaCopia.entorno === 'escritorio' && (
                      <button onClick={() => abrirCarpetaCopias(carpetaPC)}
                        className="text-blue-700 hover:underline font-medium">
                        Abrir la carpeta
                      </button>
                    )}
                    {/* Sacar la copia del aparato es media copia de seguridad:
                        si se pierde el móvil, se pierde lo que hay dentro. */}
                    {ultimaCopia.entorno === 'movil' && ultimaCopia.uri && (
                      <button
                        onClick={() => elegirDondeDejarla(ultimaCopia)}
                        className="text-blue-700 hover:underline font-medium">
                        Guardar en otra carpeta
                      </button>
                    )}

                  </div>
                  {ultimaCopia.guardadaEn && (
                    <p className="mt-1 text-green-700 bg-green-50 border border-green-200 rounded p-1.5">
                      También guardada donde la has puesto tú:{' '}
                      <span className="font-mono break-all">{decodeURIComponent(ultimaCopia.guardadaEn)}</span>
                    </p>
                  )}
                  {compartirError && (
                    <p className="mt-1 text-amber-700">{compartirError}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <DondeSeGuarda
            entorno={entornoCopias}
            carpeta={carpetaEscritorio}
            carpetaPropia={carpetaPC}
            errorCarpeta={errorCarpeta}
            onElegir={elegirCarpetaDelPC}
            onRestablecer={volverACarpetaDelPrograma}
            destino={destinoMovil}
            onDestino={cambiarDestino}
            onAbrir={() => abrirCarpetaCopias(carpetaPC)}
            preguntarDonde={preguntarDonde}
            onPreguntarDonde={cambiarPreguntarDonde}
          />

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
              <p className="text-sm font-semibold text-amber-800 flex items-center gap-2"><Info className="w-4 h-4" />Ten la copia en dos sitios</p>
              <ul className="text-xs text-amber-700 space-y-1">
                <li>💾 <strong>Disco externo o pendrive:</strong> elígelo como carpeta de copias y se escribe directamente ahí</li>
                <li>☁️ <strong>Google Drive / OneDrive:</strong> elige la carpeta que ya tengas sincronizada y sube sola</li>
                <li>📱 <strong>En el móvil:</strong> con el botón de enviar que sale al terminar, mándatela a Drive, WhatsApp o correo</li>
                <li>⚠️ <strong>Lo importante:</strong> una copia guardada solo en el aparato se pierde con el aparato</li>
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
                  <NumberField
                    decimals={false}
                    value={config.reminder_days || 7}
                    onChange={v => setConfig(c => ({ ...c, reminder_days: v }))}
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
/**
 * DondeSeGuarda — el sitio donde acaba el fichero de la copia.
 *
 * Va a la vista porque es la pregunta que se hace uno justo después de pulsar
 * el botón, y hasta ahora no había respuesta: en el ordenador el fichero se
 * perdía entre las descargas y en el móvil directamente no se creaba.
 */
function DondeSeGuarda({
  entorno, carpeta, destino, onDestino, onAbrir,
  carpetaPropia, errorCarpeta, onElegir, onRestablecer,
  preguntarDonde, onPreguntarDonde,
}) {
  if (entorno === 'escritorio') {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Archive className="w-4 h-4 text-blue-600" />Dónde se guardan las copias
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-gray-600">
            {carpetaPropia
              ? <>En la carpeta que has elegido tú:</>
              : <>En la carpeta del programa, dentro de <strong>Copias de seguridad</strong>:</>}
          </p>
          <p className="font-mono text-[11px] break-all bg-gray-50 border rounded p-2 text-gray-700">
            {carpeta?.carpeta || 'calculando…'}
          </p>
          {carpeta?.perdida && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
              La carpeta que elegiste (<span className="font-mono">{carpeta.perdida}</span>) no
              está disponible ahora mismo: disco desconectado, carpeta borrada o sin permisos.
              Las copias se están guardando junto al programa. Vuelve a elegir carpeta.
            </p>
          )}
          {carpeta?.alternativa && !carpeta?.perdida && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              La carpeta del programa no admite escritura en este equipo (suele pasar
              cuando está instalado en Archivos de programa), así que las copias van a
              Documentos. Se guardan igual.
            </p>
          )}
          {errorCarpeta && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">{errorCarpeta}</p>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <Button size="sm" onClick={onElegir} className="gap-1.5">
              <Archive className="w-3.5 h-3.5" />Elegir carpeta
            </Button>
            {carpetaPropia && (
              <Button size="sm" variant="outline" onClick={onRestablecer} className="gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" />Usar la del programa
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onAbrir} className="gap-1.5">
              <Archive className="w-3.5 h-3.5" />Abrir la carpeta
            </Button>
            {carpeta && (
              <span className="text-xs text-gray-500">
                {carpeta.copias?.length
                  ? `${carpeta.copias.length} copia${carpeta.copias.length === 1 ? '' : 's'} guardada${carpeta.copias.length === 1 ? '' : 's'}`
                  : 'Todavía no hay ninguna copia en esta carpeta'}
              </span>
            )}
          </div>
          {!!carpeta?.copias?.length && (
            <div className="border rounded-lg divide-y max-h-44 overflow-y-auto">
              {carpeta.copias.slice(0, 10).map(c => (
                <div key={c.nombre} className="flex items-center justify-between px-2.5 py-1.5 text-xs">
                  <span className="font-mono truncate mr-2 text-gray-700">{c.nombre}</span>
                  <span className="text-gray-400 whitespace-nowrap">
                    {(c.bytes / 1024).toFixed(0)} KB · {format(new Date(c.fecha), 'dd/MM/yyyy HH:mm')}
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-gray-500">
            Puedes poner aquí un disco externo, un pendrive o una carpeta sincronizada
            con Drive o OneDrive: la copia se escribe directamente ahí. Y aunque la
            guardes en el propio ordenador, saca una fuera de vez en cuando: si se
            estropea este equipo, la copia que está dentro de él se pierde con él.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (entorno === 'movil') {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Archive className="w-4 h-4 text-blue-600" />Dónde guardar las copias
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            {DESTINOS_MOVIL.map(d => {
              const activo = destino.directorio === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => onDestino({ directorio: d.id })}
                  className={`w-full text-left rounded-lg border p-2.5 transition-colors ${
                    activo ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <p className={`text-sm font-medium ${activo ? 'text-blue-800' : 'text-gray-800'}`}>
                    {d.nombre}{d.recomendado && <span className="ml-1.5 text-[10px] text-blue-600">recomendada</span>}
                  </p>
                  <p className="text-[11px] text-gray-500 leading-snug mt-0.5">{d.detalle}</p>
                </button>
              );
            })}
          </div>

          <ExploradorCarpetas destino={destino} onDestino={onDestino} />

          <label className="flex items-start gap-2 text-sm text-gray-700 bg-blue-50 border border-blue-200 rounded-lg p-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={preguntarDonde}
              onChange={(e) => onPreguntarDonde(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <b>Abrir el explorador al terminar para elegir carpeta</b>
              <span className="block text-[11px] text-gray-600 leading-snug mt-0.5">
                Al acabar la copia se abre el explorador de ficheros de Android: navegas por
                las carpetas del teléfono, de la tarjeta o de Drive, y guardas donde quieras.
                Android le da permiso a la aplicación solo para ese fichero, así que no hay
                que pelearse con permisos ni con carpetas restringidas.
                El fichero se guarda en el teléfono ANTES de preguntar: si cierras el
                explorador sin elegir, la copia no se pierde.
              </span>
            </span>
          </label>

          <p className="text-[11px] text-gray-500">
            Después de hacer la copia se enseña la ruta exacta del fichero. Si el
            teléfono no deja escribir en la carpeta elegida —Android restringe las
            carpetas públicas en las versiones nuevas— la copia se guarda en el
            almacenamiento de la aplicación y se avisa: nunca se dice que está hecha
            si no hay fichero.
          </p>
          <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
            Y saca la copia del teléfono en cuanto la tengas, con el botón de enviar
            a Drive, WhatsApp o correo que sale al terminar. Una copia que solo está
            dentro del móvil se pierde con el móvil, que es justo de lo que estamos
            intentando protegernos.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 text-sm text-gray-600 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <span>
          Estás usando la versión web: el fichero se descarga a la carpeta de descargas
          del navegador. En la aplicación de escritorio se guarda solo en la carpeta del
          programa, y en el móvil en la carpeta que elijas.
        </span>
      </CardContent>
    </Card>
  );
}

/**
 * ExploradorCarpetas — elegir la carpeta del móvil moviéndose por ella.
 *
 * Android no tiene un selector de carpetas que se pueda abrir desde dentro de
 * la aplicación como el del ordenador, así que se navega aquí: se listan las
 * carpetas que hay, se entra y se sale, y se puede crear una nueva. También
 * se puede escribir la ruta a mano, que para el que ya sabe dónde la quiere
 * es más rápido que ir pulsando.
 */
function ExploradorCarpetas({ destino, onDestino }) {
  const [abierto, setAbierto] = useState(false);
  const [ruta, setRuta] = useState(destino.subcarpeta || '');
  const [carpetas, setCarpetas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [nueva, setNueva] = useState('');
  const [creando, setCreando] = useState(false);

  const cargar = React.useCallback(async (destinoRuta) => {
    setCargando(true);
    setError('');
    const r = await listarCarpetasMovil(destino.directorio, destinoRuta);
    setCarpetas(r.carpetas || []);
    if (!r.ok) setError(r.error);
    setCargando(false);
  }, [destino.directorio]);

  useEffect(() => {
    if (abierto) cargar(ruta);
  }, [abierto, ruta, cargar]);

  const partes = ruta.split('/').filter(Boolean);

  const crear = async () => {
    setCreando(true);
    const r = await crearCarpetaMovil(destino.directorio, ruta, nueva);
    setCreando(false);
    if (!r.ok) { setError(r.error); return; }
    setNueva('');
    setRuta(p => [p, r.carpeta].filter(Boolean).join('/'));
  };

  return (
    <div>
      <label className="text-xs text-gray-500 mb-1 block">Carpeta dentro de ese sitio</label>
      <div className="flex gap-2">
        <input
          value={destino.subcarpeta}
          onChange={(e) => onDestino({ subcarpeta: e.target.value })}
          placeholder={SUBCARPETA_POR_DEFECTO}
          className="flex-1 border border-input rounded-md px-3 py-2 text-sm min-w-0"
        />
        <Button size="sm" variant="outline" onClick={() => { setRuta(destino.subcarpeta || ''); setAbierto(v => !v); }}
          className="gap-1.5 shrink-0">
          <Archive className="w-3.5 h-3.5" />{abierto ? 'Cerrar' : 'Explorar'}
        </Button>
      </div>
      <p className="text-[11px] text-gray-500 mt-1">
        Se crea sola la primera vez. Quedará en{' '}
        <span className="font-mono">{limpiarCarpeta(destino.subcarpeta) || SUBCARPETA_POR_DEFECTO}/</span>
      </p>

      {abierto && (
        <div className="mt-2 border rounded-lg p-2 bg-gray-50 space-y-2">
          {/* Migas de pan: dónde estoy y cómo volver atrás */}
          <div className="flex items-center gap-1 flex-wrap text-xs">
            <button onClick={() => setRuta('')} className="text-blue-700 hover:underline font-medium">
              inicio
            </button>
            {partes.map((p, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="text-gray-400">/</span>
                <button onClick={() => setRuta(partes.slice(0, i + 1).join('/'))}
                  className="text-blue-700 hover:underline">{p}</button>
              </span>
            ))}
          </div>

          {cargando && <p className="text-xs text-gray-500">Leyendo carpetas…</p>}
          {error && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              {error}. Puedes escribir la ruta a mano en el cuadro de arriba: la carpeta
              se crea sola al hacer la copia.
            </p>
          )}

          {!cargando && !carpetas.length && !error && (
            <p className="text-xs text-gray-500">Aquí dentro no hay ninguna carpeta todavía.</p>
          )}

          {!!carpetas.length && (
            <div className="max-h-40 overflow-y-auto border rounded bg-white divide-y">
              {carpetas.map(c => (
                <button key={c} onClick={() => setRuta(r => [r, c].filter(Boolean).join('/'))}
                  className="w-full text-left px-2.5 py-1.5 text-sm hover:bg-blue-50 flex items-center gap-2">
                  <Archive className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="truncate">{c}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              placeholder="Crear una carpeta nueva aquí"
              className="flex-1 border border-input rounded-md px-2.5 py-1.5 text-sm min-w-0"
            />
            <Button size="sm" variant="outline" onClick={crear} disabled={!nueva.trim() || creando}
              className="shrink-0">
              {creando ? '…' : 'Crear'}
            </Button>
          </div>

          <Button size="sm" onClick={() => { onDestino({ subcarpeta: ruta }); setAbierto(false); }}
            className="w-full gap-1.5 bg-blue-700 hover:bg-blue-800">
            <CheckCircle className="w-3.5 h-3.5" />
            Guardar las copias en {ruta ? `…/${partes[partes.length - 1]}` : 'esta carpeta'}
          </Button>
        </div>
      )}
    </div>
  );
}
