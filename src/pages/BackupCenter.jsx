import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NumberField } from "@/components/ui/number-field";
import {
  Shield, Download, Upload, RefreshCw, CheckCircle,
  AlertCircle, Clock, Settings, Archive, Trash2, FileText, RotateCcw, Info, ChevronDown, ChevronRight, Copy
} from 'lucide-react';
import { format } from 'date-fns';
import {
  runBackupJob, runRestoreJob, contarRegistros,
  analizarDuplicados, borrarDuplicados,
} from '@/lib/backupEngine';
import CronoProgreso from '@/components/CronoProgreso';
import SeccionesProgreso from '@/components/SeccionesProgreso';
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
  'EquipmentFailure', 'InsuranceReport', 'SATWorkTemplate', 'SupplierCatalog', 'SystemSettings',
];

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
  InsuranceReport:    (r) => _s(r.report_number) || null,
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
  InsuranceReport: 'Informes Aseguradora',
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
  const [restorePct, setRestorePct] = useState(0);
  const [restoreSelectedEntities, setRestoreSelectedEntities] = useState(new Set());
  const [restoreMode, setRestoreMode] = useState('update'); // 'clean' | 'update'

  // Duplicados. Ahora son DOS pasos: primero se mira, luego —si se quiere— se
  // borra. Antes era un solo botón que analizaba y borraba de una tacada, así
  // que no había ningún momento en el que se pudiera ver qué se iba a llevar.
  const [dupLoading, setDupLoading] = useState(false);
  const [dupProgress, setDupProgress] = useState('');
  const [dupAnalisis, setDupAnalisis] = useState(null);  // lo que se ha encontrado
  const [dupResults, setDupResults] = useState(null);    // lo que se ha borrado
  const [dupSelectedEntities, setDupSelectedEntities] = useState(new Set(ALL_ENTITIES));

  useEffect(() => {
    const cfg = loadConfig();
    if (cfg && Object.keys(cfg).length > 0) setConfig(c => ({ ...c, ...cfg }));
    setHistory(loadHistory());
    loadCounts();
  }, []);

  const loadCounts = async () => {
    const c = {};
    // Contar NO es descargar. Antes esta pantalla se traía cada ficha entera
    // —fotos, PDF y firmas incluidos— de todas las secciones sólo para poder
    // enseñar un número al lado de cada una, y eso volvía a pasar al terminar
    // de restaurar. Ahora se pide únicamente el identificador.
    const CONCURRENCY = 8;
    let idx = 0;
    const worker = async () => {
      while (idx < ALL_ENTITIES.length) {
        const e = ALL_ENTITIES[idx++];
        try {
          c[e] = await contarRegistros(e);
        } catch {
          c[e] = 0;
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ALL_ENTITIES.length) }, worker));
    setCounts(c);
  };

  const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);

  // ─── ESCRIBIR UN FICHERO DE COPIA ─────────────────────────────────────────
  /**
   * Escribe un JSON de copia SECCIÓN A SECCIÓN.
   *
   * Se hace así y no con un JSON.stringify de todo porque con muchos clientes,
   * fotos y documentos ese texto no cabe en memoria: la aplicación se cerraba
   * justo al final, cuando parecía que ya estaba hecha. Vive aquí, en una
   * función suelta, porque lo usan la copia normal Y las copias de rescate.
   */
  const escribirCopiaPorSecciones = async ({ fileName, datos, secciones, extra = {}, avisar }) => {
    const fichero = await abrirCopiaPorPartes({ nombre: fileName, destino: destinoMovil, carpetaPC });
    if (!fichero.ok) return { ok: false, error: fichero.error };

    const cabecera = {
      exported_at: new Date().toISOString(),
      version: '3.0',
      app: 'TechManager Pro',
      entities_count: secciones.length,
      ...extra,
    };

    try {
      await fichero.escribir('{\n');
      const claves = Object.keys(cabecera);
      for (let i = 0; i < claves.length; i++) {
        const k = claves[i];
        await fichero.escribir(`${JSON.stringify(k)}:${JSON.stringify(cabecera[k])}${i < claves.length - 1 ? ',' : ''}\n`);
      }
      for (let i = 0; i < secciones.length; i++) {
        const seccion = secciones[i];
        avisar?.(seccion, i);
        await fichero.escribir(`,\n${JSON.stringify(seccion)}:${JSON.stringify(datos[seccion] || [])}`);
        // Un respiro al navegador para que no se congele la pantalla.
        await new Promise(r => setTimeout(r, 0));
      }
      await fichero.escribir('\n}\n');
      const guardado = await fichero.cerrar();
      return guardado.ok ? { ok: true, ...guardado, nombre: fileName } : { ok: false, error: guardado.error };
    } catch (err) {
      await fichero.cancelar();
      return { ok: false, error: err?.message || 'error desconocido' };
    }
  };

  /**
   * Guarda una COPIA DE RESCATE antes de tocar nada.
   *
   * Esto es lo que faltaba y por lo que un borrado se llevó datos sin vuelta
   * atrás. Si el rescate no se puede guardar, no se borra: es preferible no
   * hacer la limpieza a hacerla sin red.
   */
  const guardarRescate = async (secciones, motivo, avisar) => {
    avisar?.('Leyendo los datos actuales para la copia de rescate…');
    const { datos, fallos } = await runBackupJob(secciones, ENTITY_LABELS, (msg) => avisar?.(msg));
    if (fallos.length > 0) {
      return {
        ok: false,
        error: `no se han podido leer enteras estas secciones: ${fallos.map(f => f.etiqueta).join(', ')}`,
      };
    }
    avisar?.('Escribiendo la copia de rescate…');
    const fileName = `rescate-${motivo}_${nombreCopia(new Date()).replace(/^copia-gestion-pro-total_/, '')}`;
    return escribirCopiaPorSecciones({ fileName, datos, secciones, extra: { motivo_rescate: motivo } });
  };

  // ─── EXPORTAR BACKUP ──────────────────────────────────────────────────────
  const doBackup = async () => {
    setLoading(true);
    setProgress('Iniciando copia de seguridad...');
    setProgressPct(5);

    const entitiesToBackup = ALL_ENTITIES.filter(e => selectedEntities.has(e));

    // Varias secciones a la vez (no una a una): en cuentas con muchos datos
    // (documentos, fotos, órdenes SAT...) la copia tarda mucho menos.
    const { datos: exported, fallos, duplicadosQuitados } = await runBackupJob(
      entitiesToBackup, ENTITY_LABELS,
      (msg, pct) => { setProgress(msg); setProgressPct(pct); },
      { sinDuplicados: !!config.sin_duplicados },
    );

    // Una sección que no se ha podido leer entera NO se guarda como vacía. Una
    // copia a medias que parece correcta es peor que no tener copia: el día que
    // se restaure con "copia limpia" borrará lo que a ella le faltaba.
    if (fallos.length > 0) {
      setProgressPct(0);
      setProgress(
        `❌ Copia NO guardada. El servidor ha cortado la lectura de: ${fallos.map(f => f.etiqueta).join(', ')}. `
        + 'Se para a propósito, porque el fichero habría salido incompleto sin avisar. '
        + 'Espera un par de minutos y vuelve a darle.'
      );
      setUltimaCopia(null);
      setLoading(false);
      return;
    }

    const allData = { ...exported };

    setProgress('Generando archivo...');
    setProgressPct(90);

    const fileName = nombreCopia(new Date());

    const guardado = await escribirCopiaPorSecciones({
      fileName,
      datos: allData,
      secciones: entitiesToBackup,
      avisar: (seccion, i) => {
        setProgress(`Escribiendo ${ENTITY_LABELS[seccion] || seccion}…`);
        setProgressPct(90 + Math.round((i / entitiesToBackup.length) * 9));
      },
    });

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
    const limpiezaMsg = duplicadosQuitados > 0
      ? ` · ${duplicadosQuitados.toLocaleString()} repetidos omitidos (la copia queda con uno de cada)`
      : '';
    setProgress(`✅ Copia completada: ${totalExported.toLocaleString()} registros en ${entitiesToBackup.length} secciones${limpiezaMsg}`);
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
    const entitiesToRestore = ALL_ENTITIES.filter(e => restoreSelectedEntities.has(e) && restoreData[e]?.length > 0);
    setRestoring(true);
    setRestorePct(0);

    if (restoreMode === 'clean') {
      const confirmed = window.confirm(
        '⚠️ COPIA LIMPIA: se borrarán TODOS los registros actuales de las secciones seleccionadas antes de restaurar.\n\n'
        + 'Antes de borrar nada se guardará automáticamente una COPIA DE RESCATE de lo que hay ahora, '
        + 'y si esa copia no se puede guardar no se borrará nada.\n\n¿Seguimos?'
      );
      if (!confirmed) { setRestoring(false); return; }

      // Esto es lo que faltaba: una vuelta atrás. La "copia limpia" es la única
      // función del programa que borra datos buenos a propósito, y hasta ahora
      // lo hacía sin dejar nada guardado.
      const rescate = await guardarRescate(
        entitiesToRestore, 'antes-de-restaurar', (msg) => setRestoreProgress(msg),
      );
      if (!rescate.ok) {
        setRestoreProgress(
          `❌ No se ha borrado ni restaurado nada: no se ha podido guardar la copia de rescate (${rescate.error}). `
          + 'Sin red de seguridad no se toca nada.'
        );
        setRestoring(false);
        return;
      }
      setRestoreProgress(`🛟 Copia de rescate guardada: ${rescate.nombre}. Restaurando…`);
    }

    // Varias secciones a la vez (no una a una): mucho más rápido con copias
    // grandes. El motor compartido (backupEngine.js) sigue corriendo aunque
    // se navegue a otra pantalla, y cuenta los fallos reales en vez de dar
    // un falso "completado" si algo no se guarda.
    const { total, failed, sinCambios, avisos } = await runRestoreJob(
      restoreData, entitiesToRestore, restoreMode, KEYERS, ENTITY_LABELS,
      (msg, pct) => { setRestoreProgress(msg); if (pct != null) setRestorePct(pct); },
    );
    setRestorePct(100);

    // Se dice cuántos estaban ya iguales: es lo que explica que ahora vaya
    // rápido, y evita pensar que se ha restaurado de menos.
    const igualesMsg = sinCambios > 0
      ? ` ${sinCambios.toLocaleString()} ya estaban igual y no ha hecho falta tocarlos.`
      : '';
    const okMsg = `✅ Restauración completa: ${total.toLocaleString()} registros ${restoreMode === 'clean' ? 'restaurados' : 'actualizados/añadidos (sin duplicar)'} en ${entitiesToRestore.length} secciones.${igualesMsg}`;
    const failMsg = `⚠️ ${failed.toLocaleString()} operaciones fallaron al guardar en el servidor (revisa la conexión y vuelve a intentarlo). Consulta la consola para más detalle.`;
    const avisosMsg = (avisos || []).length > 0 ? `\n⚠️ ${avisos.join('\n⚠️ ')}` : '';
    setRestoreProgress((failed > 0 ? `${okMsg}\n${failMsg}` : okMsg) + avisosMsg);
    loadCounts();
    // Tras restaurar se buscan repetidos en lo que se acaba de restaurar: si
    // la copia y los datos actuales tenían registros casi iguales, ahora están
    // duplicados. Se conserva el MÁS RECIENTE y se borra el anterior, previa
    // confirmación y con copia de rescate.
    await limpiarDuplicadosTrasRestaurar(entitiesToRestore);
    setRestoring(false);
  };

  // ─── DUPLICADOS: PRIMERO MIRAR, LUEGO BORRAR ─────────────────────────────
  //
  // Antes esto era un solo botón que analizaba y borraba de una tacada, con
  // `.catch(() => {})` en cada borrado (así que si fallaban todos, el mensaje
  // final seguía diciendo "proceso completado") y sin guardar nada antes.
  // Ahora son dos pasos, con la lista delante y con copia de rescate.

  const analizarLosDuplicados = async () => {
    setDupLoading(true);
    setDupResults(null);
    setDupAnalisis(null);
    const secciones = ALL_ENTITIES.filter(e => dupSelectedEntities.has(e));
    const analisis = await analizarDuplicados(secciones, ENTITY_LABELS, (msg) => setDupProgress(msg));
    setDupAnalisis(analisis);

    const aBorrar = analisis.filter(a => a.seguro && !a.error).reduce((n, a) => n + a.duplicados, 0);
    const bloqueadas = analisis.filter(a => !a.seguro && a.duplicados > 0).length;
    const fallidas = analisis.filter(a => a.error).length;

    const partes = [];
    partes.push(aBorrar > 0
      ? `Se han encontrado ${aBorrar.toLocaleString()} registros repetidos.`
      : 'No hay ningún registro repetido.');
    if (bloqueadas > 0) partes.push(`${bloqueadas} sección(es) no se tocarán: mira el motivo en la tabla.`);
    if (fallidas > 0) partes.push(`${fallidas} sección(es) no se han podido leer enteras y quedan fuera.`);
    partes.push('No se ha borrado nada todavía.');
    setDupProgress(partes.join(' '));
    setDupLoading(false);
  };

  const borrarLosDuplicados = async () => {
    const listas = (dupAnalisis || []).filter(a => a.seguro && !a.error && a.duplicados > 0);
    if (listas.length === 0) return;
    const cuantos = listas.reduce((n, a) => n + a.duplicados, 0);
    const detalle = listas.map(a => `  · ${a.etiqueta}: ${a.duplicados} de ${a.total}`).join('\n');

    const confirmado = window.confirm(
      `Se van a borrar ${cuantos} registros repetidos:\n\n${detalle}\n\n`
      + 'De cada grupo de fichas idénticas se CONSERVA la más antigua.\n\n'
      + 'Antes de borrar se guardará una copia de rescate con todo lo que se va a quitar. '
      + 'Si esa copia no se puede guardar, no se borrará nada.\n\n¿Seguimos?'
    );
    if (!confirmado) return;

    setDupLoading(true);

    // La copia de rescate lleva EXACTAMENTE lo que se va a borrar, sección a
    // sección. Es pequeña y se puede restaurar con el botón de restaurar.
    setDupProgress('Guardando la copia de rescate…');
    const datos = {};
    for (const a of listas) datos[a.entidad] = a.aBorrar;
    const fileName = `rescate-duplicados_${nombreCopia(new Date()).replace(/^copia-gestion-pro-total_/, '')}`;
    const rescate = await escribirCopiaPorSecciones({
      fileName,
      datos,
      secciones: listas.map(a => a.entidad),
      extra: { motivo_rescate: 'duplicados-borrados' },
    });
    if (!rescate.ok) {
      setDupProgress(`❌ No se ha borrado nada: no se ha podido guardar la copia de rescate (${rescate.error}).`);
      setDupLoading(false);
      return;
    }

    const resultados = await borrarDuplicados(dupAnalisis, (msg) => setDupProgress(msg));
    setDupResults(resultados);

    const borrados = resultados.reduce((n, r) => n + (r.borrados || 0), 0);
    const fallidos = resultados.reduce((n, r) => n + (r.fallidos || 0), 0);
    setDupProgress(
      (fallidos > 0 ? '⚠️' : '✅')
      + ` ${borrados.toLocaleString()} repetidos borrados`
      + (fallidos > 0 ? `, ${fallidos.toLocaleString()} no se han podido borrar` : '')
      + `. Copia de rescate: ${rescate.nombre}`
    );
    setDupLoading(false);
    setDupAnalisis(null);
    loadCounts();
  };

  // ─── LIMPIEZA DE DUPLICADOS TRAS RESTAURAR ─────────────────────────────────
  //
  // Al restaurar en modo "actualizar" puede quedar el mismo registro dos veces:
  // el que ya estaba y el que trae la copia, si la clave natural no los
  // emparentó (un campo que cambió de mayúsculas, un NIF con guion...). Sin
  // esto, los duplicados se quedan para siempre y la siguiente copia ya los
  // lleva duplicados también.
  //
  // Se hace solo en las secciones que se acaban de restaurar, y conservando el
  // MÁS RECIENTE de cada grupo: el dato que ya estaba en vivo suele ser más
  // nuevo que el de la copia, y es el que interesa guardar.
  const limpiarDuplicadosTrasRestaurar = async (secciones) => {
    if (!secciones || secciones.length === 0) return;
    setRestoreProgress(p => p + '\n🔍 Buscando registros repetidos tras la restauración…');
    const analisis = await analizarDuplicados(
      secciones, ENTITY_LABELS, (msg) => setRestoreProgress(p => `${p.split('\n')[0]}\n${msg}`),
      { conservar: 'reciente' },
    );
    const listas = analisis.filter(a => a.seguro && !a.error && a.duplicados > 0);
    const totalDup = listas.reduce((n, a) => n + a.duplicados, 0);
    if (totalDup === 0) {
      setRestoreProgress(p => p + '\n✅ No han quedado registros repetidos tras la restauración.');
      return;
    }
    const detalle = listas.map(a => `  · ${a.etiqueta}: ${a.duplicados}`).join('\n');
    const ok = window.confirm(
      `Tras la restauración se han encontrado ${totalDup} registros repetidos:\n\n${detalle}\n\n`
      + 'De cada grupo se CONSERVARÁ EL MÁS RECIENTE y se borrará el anterior. '
      + 'Antes de borrar se guardará una copia de rescate con todo lo que se quite.\n\n¿Borrar los repetidos ahora?'
    );
    if (!ok) {
      setRestoreProgress(p => p
        + `\nℹ️ Se han encontrado ${totalDup} repetidos, pero has decidido no borrarlos. Puedes hacerlo después en la pestaña «Duplicados».`);
      return;
    }
    setRestoreProgress(p => p + '\nGuardando copia de rescate de los repetidos…');
    const datos = {};
    for (const a of listas) datos[a.entidad] = a.aBorrar;
    const fileName = `rescate-duplicados-restauracion_${nombreCopia(new Date()).replace(/^copia-gestion-pro-total_/, '')}`;
    const rescate = await escribirCopiaPorSecciones({
      fileName, datos, secciones: listas.map(a => a.entidad),
      extra: { motivo_rescate: 'duplicados-tras-restaurar' },
    });
    if (!rescate.ok) {
      setRestoreProgress(p => p + `\n⚠️ No se han borrado los repetidos: no se pudo guardar la copia de rescate (${rescate.error}).`);
      return;
    }
    const resultados = await borrarDuplicados(analisis, (msg) => setRestoreProgress(p => `${p.split('\n')[0]}\n${msg}`));
    const borrados = resultados.reduce((n, r) => n + (r.borrados || 0), 0);
    const fallidos = resultados.reduce((n, r) => n + (r.fallidos || 0), 0);
    setRestoreProgress(p => p
      + `\n${fallidos > 0 ? '⚠️' : '✅'} ${borrados.toLocaleString()} repetidos borrados (conservando el más reciente de cada uno)`
      + (fallidos > 0 ? `, ${fallidos.toLocaleString()} no se pudieron borrar` : '')
      + `. Rescate: ${rescate.nombre}`);
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
                  <CronoProgreso active={loading} pct={progressPct} />
                  <SeccionesProgreso />
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
                  <CronoProgreso active={restoring} pct={restorePct} />
                  <SeccionesProgreso />

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
                  <h2 className="text-base font-bold text-gray-900">Registros repetidos</h2>
                  <p className="text-sm text-gray-600 mt-0.5">
                    Primero se miran y se enseñan. Solo se borra si tú le das al segundo botón, y siempre
                    guardando antes una copia de rescate con lo que se va a quitar.
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
                    const info = (dupResults || dupAnalisis)?.find(r => r.entidad === ent);
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
                          {info ? (
                            <p className={`text-[10px] font-semibold ${info.error ? 'text-amber-600' : info.duplicados > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {info.error
                                ? 'no se pudo leer'
                                : info.borrados != null
                                  ? (info.borrados > 0 ? `${info.borrados} borrados` : '✓ sin cambios')
                                  : (info.duplicados > 0 ? `${info.duplicados} repetidos` : '✓ sin repetidos')}
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
                <div className={`rounded-lg px-3 py-2 text-sm font-medium ${dupProgress.startsWith('✅') ? 'bg-green-100 text-green-800' : dupProgress.startsWith('❌') ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}`}>
                  {dupProgress}
                </div>
              )}

              {(dupResults || dupAnalisis) && (
                <div className="border rounded-xl overflow-x-auto">
                  <table className="w-full text-xs min-w-[520px]">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="text-left p-2 font-semibold text-gray-600">Sección</th>
                        <th className="text-right p-2 font-semibold text-gray-600">Registros</th>
                        <th className="text-right p-2 font-semibold text-gray-600">Repetidos</th>
                        <th className="text-right p-2 font-semibold text-gray-600">Se conservan</th>
                        <th className="text-left p-2 font-semibold text-gray-600">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(dupResults || dupAnalisis).filter(r => r.total > 0 || r.error).map(r => (
                        <tr key={r.entidad} className={r.error ? 'bg-amber-50' : !r.seguro ? 'bg-amber-50' : r.duplicados > 0 ? 'bg-red-50' : 'bg-white'}>
                          <td className="p-2 font-medium">{r.etiqueta}</td>
                          <td className="p-2 text-right text-gray-500">{r.total}</td>
                          <td className={`p-2 text-right font-bold ${r.duplicados > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {r.borrados != null && !r.omitida ? `-${r.borrados}` : r.duplicados > 0 ? r.duplicados : '0'}
                          </td>
                          <td className="p-2 text-right text-gray-600">{r.seConservan}</td>
                          <td className="p-2 text-gray-600">
                            {r.error
                              ? '⚠️ no se pudo leer entera, queda fuera'
                              : !r.seguro
                                ? `⛔ ${r.motivo}`
                                : r.fallidos > 0
                                  ? `⚠️ ${r.fallidos} no se pudieron borrar`
                                  : r.borrados != null ? '✓ hecho' : '✓ se puede limpiar'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  onClick={analizarLosDuplicados}
                  disabled={dupLoading || dupSelectedEntities.size === 0}
                  variant="outline"
                  className="w-full gap-2 py-3 h-auto text-sm"
                >
                  {dupLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Copy className="w-5 h-5" />}
                  {`1 · Buscar repetidos en ${dupSelectedEntities.size} secciones`}
                </Button>
                <Button
                  onClick={borrarLosDuplicados}
                  disabled={dupLoading || !dupAnalisis || dupAnalisis.every(a => !a.seguro || a.error || a.duplicados === 0)}
                  className="w-full bg-orange-600 hover:bg-orange-700 gap-2 py-3 h-auto text-sm"
                >
                  <Trash2 className="w-5 h-5" />
                  {dupAnalisis
                    ? `2 · Borrar ${dupAnalisis.filter(a => a.seguro && !a.error).reduce((n, a) => n + a.duplicados, 0)} repetidos`
                    : '2 · Borrar repetidos'}
                </Button>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 space-y-1">
                <p className="font-semibold">ℹ️ Cómo funciona, y qué NO puede pasar</p>
                <p>
                  Se comparan todos los campos de cada ficha menos el identificador, las fechas del
                  sistema y el usuario. Si dos fichas son idénticas, se conserva la <strong>más antigua</strong> y
                  sobran las demás.
                </p>
                <p>
                  <strong>No puede vaciar una sección.</strong> Si el análisis pretende llevarse más de la mitad de
                  una sección, esa sección se bloquea y se dice por qué: eso casi nunca son repetidos de
                  verdad, es una comparación que ha salido mal.
                </p>
                <p>
                  <strong>Siempre deja copia.</strong> Antes de borrar se guarda un fichero de rescate con todo lo
                  que se va a quitar; se restaura desde la pestaña «Restaurar». Si esa copia no se puede
                  guardar, no se borra nada.
                </p>
                <p>
                  <strong>Nunca analiza a medias.</strong> Si el servidor corta la lectura de una sección, esa
                  sección se deja fuera en vez de tomar por repetido lo que solo es una lista incompleta.
                </p>
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

              <div>
                <label className="flex items-start gap-3 cursor-pointer rounded-lg border p-3 hover:border-blue-300">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded"
                    checked={!!config.sin_duplicados}
                    onChange={e => setConfig(c => ({ ...c, sin_duplicados: e.target.checked }))}
                    aria-label="No meter registros repetidos en la copia"
                    data-prueba="copia-sin-duplicados"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-gray-700">
                      No meter registros repetidos en la copia
                    </span>
                    <span className="block text-xs text-gray-500 mt-0.5">
                      Si una ficha está cuatro veces exactamente igual, en la copia se guarda una sola.
                      La copia sale más pequeña y limpia. <strong>No borra nada del programa</strong>: solo
                      afecta al fichero que se guarda.
                    </span>
                  </span>
                </label>
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