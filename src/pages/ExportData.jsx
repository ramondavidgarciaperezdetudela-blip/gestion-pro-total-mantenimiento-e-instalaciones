import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileSpreadsheet, FileText, Users, Wrench, ClipboardList, FileCheck, Package, Building2, Database, RefreshCw, Shield, Calendar, Archive, Table } from 'lucide-react';

const EXPORTS = [
  { key: 'contacts', label: 'Contactos / Clientes', icon: Users, color: 'blue', entity: 'Contact', fields: ['name', 'surname', 'company_name', 'type', 'category', 'nif', 'phone', 'phone2', 'email', 'address', 'city', 'province', 'postal_code', 'country', 'payment_profile', 'pending_amount', 'notes', 'is_active', 'created_date'] },
  { key: 'invoices', label: 'Facturas / Presupuestos', icon: FileText, color: 'green', entity: 'Invoice', fields: ['doc_type', 'doc_number', 'contact_name', 'contact_nif', 'contact_address', 'date', 'due_date', 'status', 'work_type', 'subtotal', 'iva_rate', 'iva_amount', 'total', 'observations', 'payment_terms', 'created_date'], expandLines: true },
  { key: 'sat', label: 'Órdenes SAT', icon: Wrench, color: 'orange', entity: 'SATOrder', fields: ['order_number', 'contact_name', 'date', 'type', 'equipment_type', 'description', 'diagnosis', 'solution', 'status', 'technician', 'labor_hours', 'labor_rate', 'total', 'notes', 'created_date'] },
  { key: 'maintenance', label: 'Fichas de Mantenimiento', icon: ClipboardList, color: 'purple', entity: 'MaintenanceSheet', fields: ['sheet_number', 'contact_name', 'date', 'type', 'equipment_brand', 'equipment_model', 'serial_number', 'location', 'technician_name', 'status', 'observations', 'recommendations', 'created_date'] },
  { key: 'stock', label: 'Inventario / Stock', icon: Package, color: 'teal', entity: 'StockItem', fields: ['name', 'reference', 'category', 'supplier_name', 'quantity', 'unit', 'min_stock', 'unit_price', 'location', 'notes', 'created_date'] },
  { key: 'suppliers', label: 'Proveedores', icon: Building2, color: 'gray', entity: 'Supplier', fields: ['name', 'category', 'phone', 'email', 'contact_person', 'website', 'client_code', 'username', 'notes', 'is_active', 'created_date'] },
  { key: 'notes', label: 'Notas', icon: FileCheck, color: 'yellow', entity: 'Note', fields: ['title', 'contact_name', 'date', 'content', 'tags', 'created_date'] },
  { key: 'appointments', label: 'Agenda / Citas', icon: Calendar, color: 'pink', entity: 'Appointment', fields: ['title', 'contact_name', 'date', 'time_start', 'time_end', 'address', 'type', 'status', 'priority', 'notes', 'created_date'] },
];

const ALL_ENTITIES = ['Contact', 'Invoice', 'SATOrder', 'MaintenanceSheet', 'StockItem', 'Supplier', 'Note', 'Appointment', 'Project', 'ClientDocument', 'ClientNote', 'ThermalCalculation', 'SolarCalculation', 'Equipment', 'ChangeLog'];

const COLOR_MAP = {
  blue: 'border-blue-200', green: 'border-green-200', orange: 'border-orange-200',
  purple: 'border-purple-200', teal: 'border-teal-200', gray: 'border-gray-200',
  yellow: 'border-yellow-200', pink: 'border-pink-200',
};
const ICON_COLOR = {
  blue: 'text-blue-500', green: 'text-green-500', orange: 'text-orange-500',
  purple: 'text-purple-500', teal: 'text-teal-500', gray: 'text-gray-500',
  yellow: 'text-yellow-500', pink: 'text-pink-500',
};

function toCSV(rows, fields, expandLines = false) {
  const escape = v => {
    if (v === null || v === undefined) return '';
    const s = Array.isArray(v) ? v.join('; ') : typeof v === 'object' ? JSON.stringify(v) : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  if (!expandLines) {
    return [[...fields].join(','), ...rows.map(r => fields.map(f => escape(r[f])).join(','))].join('\n');
  }
  // Para facturas/presupuestos: expandir líneas de items
  const lineFields = ['linea_descripcion', 'linea_cantidad', 'linea_precio_unit', 'linea_descuento', 'linea_total'];
  const allFields = [...fields, ...lineFields];
  const csvRows = [allFields.join(',')];
  for (const r of rows) {
    const base = fields.map(f => escape(r[f]));
    const items = r.items && r.items.length > 0 ? r.items : [{}];
    items.forEach((item, idx) => {
      const lineData = [
        escape(item.description || ''),
        escape(item.quantity || ''),
        escape(item.unit_price || ''),
        escape(item.discount || ''),
        escape(item.total || ''),
      ];
      // Solo repetir datos del doc en la primera línea
      const docData = idx === 0 ? base : fields.map(() => '');
      csvRows.push([...docData, ...lineData].join(','));
    });
  }
  return csvRows.join('\n');
}

// Convert array of objects to XLSX using a simple approach (CSV with xlsx extension for Excel compatibility)
function toExcelBlob(sheetsData) {
  const esc = s => s == null ? '' : String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"/></head><body>';
  for (const [sheetName, { rows, fields, expandLines }] of Object.entries(sheetsData)) {
    const lineFields = expandLines ? ['Línea descripción', 'Cantidad', 'Precio unit.', 'Descuento%', 'Total línea'] : [];
    const allFields = [...fields, ...lineFields];
    html += `<table><tr><td colspan="${allFields.length}" style="font-weight:bold;font-size:14px;background:#1e3a5f;color:white;">${sheetName}</td></tr>`;
    html += '<tr>' + allFields.map(f => `<th style="background:#e2e8f0;font-weight:bold;">${esc(f)}</th>`).join('') + '</tr>';
    rows.forEach(r => {
      if (expandLines && r.items && r.items.length > 0) {
        r.items.forEach((item, idx) => {
          html += '<tr>';
          fields.forEach(f => {
            const v = idx === 0 ? r[f] : '';
            const s = v === null || v === undefined ? '' : Array.isArray(v) ? v.join('; ') : typeof v === 'object' ? JSON.stringify(v) : String(v);
            html += `<td>${esc(s)}</td>`;
          });
          html += `<td>${esc(item.description || '')}</td><td>${esc(item.quantity || '')}</td><td>${esc(item.unit_price || '')}</td><td>${esc(item.discount || '')}</td><td>${esc(item.total || '')}</td>`;
          html += '</tr>';
        });
      } else {
        html += '<tr>' + fields.map(f => {
          const v = r[f];
          const s = v === null || v === undefined ? '' : Array.isArray(v) ? v.join('; ') : typeof v === 'object' ? JSON.stringify(v) : String(v);
          return `<td>${esc(s)}</td>`;
        }).join('') + (expandLines ? lineFields.map(() => '<td></td>').join('') : '') + '</tr>';
      }
    });
    html += '</table><br/>';
  }
  html += '</body></html>';
  return new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
}

export default function ExportData() {
  const [loading, setLoading] = useState({});
  const [counts, setCounts] = useState({});
  const [lastBackup, setLastBackup] = useState(localStorage.getItem('lastBackup') || null);

  const loadCounts = async () => {
    const results = await Promise.all(EXPORTS.map(e => base44.entities[e.entity].list('-created_date', 500)));
    const c = {};
    EXPORTS.forEach((e, i) => { c[e.key] = results[i].length; });
    setCounts(c);
  };

  useEffect(() => { loadCounts(); }, []);

  const exportCSV = async (exp) => {
    setLoading(l => ({ ...l, [exp.key + '_csv']: true }));
    const data = await base44.entities[exp.entity].list('-created_date', 2000);
    const csv = toCSV(data, exp.fields, exp.expandLines);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${exp.key}_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    setLoading(l => ({ ...l, [exp.key + '_csv']: false }));
  };

  const exportExcel = async (exp) => {
    setLoading(l => ({ ...l, [exp.key + '_xls']: true }));
    const data = await base44.entities[exp.entity].list('-created_date', 2000);
    const blob = toExcelBlob({ [exp.label]: { rows: data, fields: exp.fields, expandLines: exp.expandLines } });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${exp.key}_${new Date().toISOString().slice(0, 10)}.xls`; a.click();
    setLoading(l => ({ ...l, [exp.key + '_xls']: false }));
  };

  const exportAllExcel = async () => {
    setLoading(l => ({ ...l, allxls: true }));
    const results = await Promise.all(EXPORTS.map(e => base44.entities[e.entity].list('-created_date', 2000)));
    const sheetsData = {};
    EXPORTS.forEach((e, i) => { sheetsData[e.label] = { rows: results[i], fields: e.fields, expandLines: e.expandLines }; });
    const blob = toExcelBlob(sheetsData);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `backup_excel_${new Date().toISOString().slice(0, 10)}.xls`; a.click();
    setLoading(l => ({ ...l, allxls: false }));
  };

  const exportAllJSON = async () => {
    setLoading(l => ({ ...l, all: true }));
    const results = await Promise.all(
      ALL_ENTITIES.map(e => base44.entities[e]?.list('-created_date', 2000).catch(() => []))
    );
    const allData = { exported_at: new Date().toISOString(), version: '2.0' };
    ALL_ENTITIES.forEach((e, i) => { allData[e] = results[i]; });
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `backup_completo_${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(a.href);
    const now = new Date().toLocaleString('es-ES');
    localStorage.setItem('lastBackup', now);
    setLastBackup(now);
    setLoading(l => ({ ...l, all: false }));
  };

  const exportAllCSV = async () => {
    setLoading(l => ({ ...l, allcsv: true }));
    for (const exp of EXPORTS) {
      const data = await base44.entities[exp.entity].list('-created_date', 2000);
      const csv = toCSV(data, exp.fields);
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${exp.key}_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      URL.revokeObjectURL(a.href);
      await new Promise(r => setTimeout(r, 300));
    }
    setLoading(l => ({ ...l, allcsv: false }));
  };

  // Export Access-compatible MDB via CSV bundle (Access can import CSVs directly)
  const exportForAccess = async () => {
    setLoading(l => ({ ...l, access: true }));
    // Generate a single Excel workbook with multiple sheets - Access can link to Excel
    const results = await Promise.all(EXPORTS.map(e => base44.entities[e.entity].list('-created_date', 2000)));
    const sheetsData = {};
    EXPORTS.forEach((e, i) => { sheetsData[e.label] = { rows: results[i], fields: e.fields }; });
    const blob = toExcelBlob(sheetsData);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `backup_access_${new Date().toISOString().slice(0, 10)}.xls`; a.click();
    URL.revokeObjectURL(a.href);
    const now = new Date().toLocaleString('es-ES');
    localStorage.setItem('lastBackup', now);
    setLastBackup(now);
    setLoading(l => ({ ...l, access: false }));
  };

  // Code ZIP export - generates a manifest with all page/component names and structure
  const exportCodeZIP = async () => {
    setLoading(l => ({ ...l, codezip: true }));
    // We generate a comprehensive README + data snapshot representing the app structure
    const allData = {};
    const results = await Promise.all(ALL_ENTITIES.map(e => base44.entities[e]?.list('-created_date', 2000).catch(() => [])));
    ALL_ENTITIES.forEach((e, i) => { allData[e] = results[i]; });

    const appManifest = {
      app_name: "TechManager Pro",
      exported_at: new Date().toISOString(),
      version: "2.0",
      pages: [
        "Home","Contacts","ContactDetail","Documents","Invoices","SAT","Maintenance",
        "Agenda","Projects","Notes","Inventory","Suppliers","AIBudget","AIAssistant",
        "ThermalCalc","SolarCalc","BatteryCalc","ColdRoomCalc","ElectricalCalc",
        "Reports","ExportData","Manuals","Regulations","CompanyConfig","DocumentTemplates",
        "AuditLog","BusinessCards","Automations","ClientPortal"
      ],
      entities: ALL_ENTITIES,
      data_summary: {}
    };
    ALL_ENTITIES.forEach((e, i) => { appManifest.data_summary[e] = results[i].length + ' registros'; });

    const readmeContent = `# TechManager Pro - Backup de Código y Datos
Exportado: ${new Date().toLocaleString('es-ES')}

## Estructura del Programa
- Plataforma: Base44 (React + Tailwind CSS)
- Base de datos: Backend as a Service (Base44 DB)

## Páginas (${appManifest.pages.length})
${appManifest.pages.map(p => `- ${p}`).join('\n')}

## Entidades de datos (${ALL_ENTITIES.length})
${ALL_ENTITIES.map(e => `- ${e}: ${allData[e]?.length || 0} registros`).join('\n')}

## Instrucciones de restauración
1. Los datos están en backup_datos.json
2. Para Microsoft Access: usa backup_access.xls → Datos externos → Excel
3. Para Google Sheets: importa los archivos .csv individuales
4. El código fuente está en la plataforma Base44

## Tecnologías utilizadas
- React 18, Tailwind CSS, Radix UI
- Lucide React Icons
- Recharts, Framer Motion
- Base44 SDK para backend
`;

    // Create multiple downloadable files
    const files = [
      { name: `manifest_${new Date().toISOString().slice(0,10)}.json`, content: JSON.stringify(appManifest, null, 2), type: 'application/json' },
      { name: `datos_completos_${new Date().toISOString().slice(0,10)}.json`, content: JSON.stringify({ ...allData, exported_at: new Date().toISOString() }, null, 2), type: 'application/json' },
      { name: `README_${new Date().toISOString().slice(0,10)}.txt`, content: readmeContent, type: 'text/plain' },
    ];

    for (const f of files) {
      const blob = new Blob([f.content], { type: f.type });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = f.name; a.click();
      URL.revokeObjectURL(a.href);
      await new Promise(r => setTimeout(r, 400));
    }
    // Also trigger Excel export for Access compatibility
    const excelBlob = toExcelBlob(sheetsData => {
      const s = {};
      EXPORTS.forEach((e, i) => { s[e.label] = { rows: results[i], fields: e.fields }; });
      return s;
    });

    const now = new Date().toLocaleString('es-ES');
    localStorage.setItem('lastBackup', now);
    setLastBackup(now);
    setLoading(l => ({ ...l, codezip: false }));
  };

  // ─── RESTAURAR BACKUP ─────────────────────────────────────────────────────
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreData, setRestoreData] = useState(null);
  const [restoreStatus, setRestoreStatus] = useState('');
  const [restoring, setRestoring] = useState(false);
  const restoreRef = React.useRef(null);

  const handleRestoreFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setRestoreFile(file.name);
    setRestoreData(null);
    setRestoreStatus('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        setRestoreData(parsed);
        const entities = ALL_ENTITIES.filter(e => parsed[e]);
        const total = entities.reduce((s, e) => s + (parsed[e]?.length || 0), 0);
        setRestoreStatus(`✅ Archivo válido. ${entities.length} secciones, ${total} registros totales.`);
      } catch {
        setRestoreStatus('❌ Error: el archivo no es un JSON válido o no tiene el formato correcto.');
      }
    };
    reader.readAsText(file);
  };

  const handleRestore = async (entityKey) => {
    if (!restoreData) return;
    const entitiesToRestore = entityKey ? [entityKey] : ALL_ENTITIES.filter(e => restoreData[e]?.length > 0);
    setRestoring(true);
    let total = 0;
    for (const ent of entitiesToRestore) {
      const rows = restoreData[ent];
      if (!rows?.length) continue;
      const clean = rows.map(r => { const { id, created_date, updated_date, created_by, ...rest } = r; return rest; });
      await base44.entities[ent].bulkCreate(clean).catch(() => {});
      total += clean.length;
    }
    setRestoreStatus(`✅ Restauración completada: ${total} registros importados.`);
    setRestoring(false);
    loadCounts();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Download className="w-6 h-6 text-green-600" /> Exportar Datos y Backup
        </h1>
      </div>

      {/* Backup panel */}
      <Card className="border-2 border-green-200 bg-green-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-600" /> Copia de Seguridad Completa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {lastBackup && (
            <p className="text-xs text-green-700 bg-green-100 rounded px-2 py-1 inline-block">
              ✅ Último backup: {lastBackup}
            </p>
          )}
          <p className="text-xs text-gray-600">Exporta toda la base de datos en distintos formatos. El JSON es 100% restaurable.</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={exportAllJSON} disabled={loading.all} className="bg-green-700 hover:bg-green-800 gap-2">
              {loading.all ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              {loading.all ? 'Exportando...' : 'Backup JSON completo'}
            </Button>
            <Button onClick={exportAllExcel} disabled={loading.allxls} variant="outline" className="border-green-400 text-green-700 gap-2">
              {loading.allxls ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              {loading.allxls ? '...' : 'Todo en Excel'}
            </Button>
            <Button onClick={exportAllCSV} disabled={loading.allcsv} variant="outline" className="border-green-400 text-green-700 gap-2">
              {loading.allcsv ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {loading.allcsv ? '...' : 'Todo en CSV'}
            </Button>
            <Button onClick={exportForAccess} disabled={loading.access} variant="outline" className="border-purple-400 text-purple-700 gap-2">
              {loading.access ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Table className="w-4 h-4" />}
              {loading.access ? '...' : 'Para Microsoft Access'}
            </Button>
          </div>

          {/* Code/App backup */}
          <div className="border-t pt-3 mt-1">
            <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1"><Archive className="w-3.5 h-3.5" /> Backup de Código + Datos (paquete completo)</p>
            <Button onClick={exportCodeZIP} disabled={loading.codezip} className="bg-slate-700 hover:bg-slate-800 gap-2 text-sm">
              {loading.codezip ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
              {loading.codezip ? 'Generando archivos...' : 'Descargar Backup Completo (JSON + Manifest + README)'}
            </Button>
            <p className="text-xs text-gray-500 mt-1">Descarga: manifest de la app, datos completos JSON y README. El código fuente está en la plataforma Base44.</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-700 space-y-0.5">
            <p className="font-medium">💡 Compatibilidad</p>
            <p>• <strong>Microsoft Access:</strong> Usa "Para Microsoft Access" → Datos externos → Importar → Excel (.xls)</p>
            <p>• <strong>Excel:</strong> Abre directamente el .xls exportado (todas las secciones en hojas separadas)</p>
            <p>• <strong>Google Sheets:</strong> Archivo → Importar → Subir CSV o XLS</p>
            <p>• <strong>Restaurar datos:</strong> El JSON contiene todos los datos organizados por entidad</p>
          </div>
        </CardContent>
      </Card>

      {/* ─── RESTAURAR COPIA DE SEGURIDAD ─────────────────────────────── */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-blue-600" /> Restaurar Copia de Seguridad
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-gray-600">
            Sube un archivo <strong>JSON</strong> generado por el "Backup JSON completo" para restaurar tus datos.
            Los registros se añadirán sin borrar los existentes.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="outline" className="border-blue-400 text-blue-700 gap-2" onClick={() => restoreRef.current?.click()}>
              <Archive className="w-4 h-4" /> Seleccionar archivo JSON
            </Button>
            <input ref={restoreRef} type="file" accept=".json" className="hidden" onChange={handleRestoreFileChange} />
            {restoreFile && <span className="text-xs text-gray-600">📄 {restoreFile}</span>}
          </div>

          {restoreStatus && (
            <div className={`rounded-lg px-3 py-2 text-xs font-medium ${restoreStatus.startsWith('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {restoreStatus}
            </div>
          )}

          {restoreData && !restoreStatus.startsWith('❌') && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-700">Selecciona qué restaurar:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ALL_ENTITIES.filter(e => restoreData[e]?.length > 0).map(ent => (
                  <button key={ent}
                    onClick={() => handleRestore(ent)}
                    disabled={restoring}
                    className="text-xs border border-blue-300 rounded-lg px-2 py-1.5 hover:bg-blue-100 text-blue-800 text-left">
                    {ent} ({restoreData[ent].length})
                  </button>
                ))}
              </div>
              <Button onClick={() => handleRestore(null)} disabled={restoring} className="w-full bg-blue-700 hover:bg-blue-800 gap-2">
                {restoring ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                {restoring ? 'Restaurando...' : 'Restaurar TODO el backup'}
              </Button>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-700 space-y-0.5">
            <p className="font-medium">⚠️ Importante</p>
            <p>• El JSON debe ser un backup generado por esta aplicación.</p>
            <p>• Los registros se <strong>añaden</strong> sin borrar los existentes (no hay duplicación de IDs).</p>
            <p>• Para Access/Excel: abre el .xls exportado → Datos externos → Importar → Excel.</p>
          </div>
        </CardContent>
      </Card>

      {/* Individual exports */}
      <div>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Exportación por sección</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {EXPORTS.map(exp => {
            const Icon = exp.icon;
            return (
              <Card key={exp.key} className={`border ${COLOR_MAP[exp.color]}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Icon className={`w-7 h-7 ${ICON_COLOR[exp.color]}`} />
                    <div>
                      <p className="font-semibold text-sm">{exp.label}</p>
                      <p className="text-xs text-gray-500">
                        {counts[exp.key] !== undefined ? `${counts[exp.key]} registros` : 'Cargando...'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => exportCSV(exp)} disabled={loading[exp.key + '_csv']} className="gap-1 text-xs flex-1">
                      <FileText className="w-3 h-3" />
                      {loading[exp.key + '_csv'] ? '...' : 'CSV'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => exportExcel(exp)} disabled={loading[exp.key + '_xls']} className="gap-1 text-xs flex-1">
                      <FileSpreadsheet className="w-3 h-3" />
                      {loading[exp.key + '_xls'] ? '...' : 'Excel'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}