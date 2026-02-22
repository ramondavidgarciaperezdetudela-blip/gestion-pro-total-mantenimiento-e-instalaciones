import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText, Users, Wrench, ClipboardList, FileCheck, Package, Building2 } from 'lucide-react';

const EXPORTS = [
  { key: 'contacts', label: 'Contactos / Clientes', icon: Users, color: 'blue', entity: 'Contact', fields: ['name', 'surname', 'company_name', 'type', 'category', 'nif', 'phone', 'phone2', 'email', 'address', 'city', 'province', 'postal_code', 'country', 'payment_profile', 'pending_amount', 'notes', 'is_active', 'created_date'] },
  { key: 'invoices', label: 'Facturas / Presupuestos', icon: FileText, color: 'green', entity: 'Invoice', fields: ['doc_type', 'doc_number', 'contact_name', 'contact_nif', 'contact_address', 'date', 'due_date', 'status', 'work_type', 'subtotal', 'iva_rate', 'iva_amount', 'total', 'observations', 'payment_terms', 'created_date'] },
  { key: 'sat', label: 'Órdenes SAT', icon: Wrench, color: 'orange', entity: 'SATOrder', fields: ['order_number', 'contact_name', 'date', 'type', 'equipment_type', 'description', 'diagnosis', 'solution', 'status', 'technician', 'labor_hours', 'labor_rate', 'total', 'notes', 'created_date'] },
  { key: 'maintenance', label: 'Fichas de Mantenimiento', icon: ClipboardList, color: 'purple', entity: 'MaintenanceSheet', fields: ['sheet_number', 'contact_name', 'date', 'type', 'equipment_brand', 'equipment_model', 'serial_number', 'location', 'technician_name', 'status', 'observations', 'recommendations', 'created_date'] },
  { key: 'stock', label: 'Inventario / Stock', icon: Package, color: 'teal', entity: 'StockItem', fields: ['name', 'reference', 'category', 'supplier_name', 'quantity', 'unit', 'min_stock', 'unit_price', 'location', 'notes', 'created_date'] },
  { key: 'suppliers', label: 'Proveedores', icon: Building2, color: 'gray', entity: 'Supplier', fields: ['name', 'category', 'phone', 'email', 'contact_person', 'website', 'client_code', 'username', 'notes', 'is_active', 'created_date'] },
  { key: 'notes', label: 'Notas', icon: FileCheck, color: 'yellow', entity: 'Note', fields: ['title', 'contact_name', 'date', 'content', 'tags', 'created_date'] },
];

const COLOR_MAP = {
  blue: 'bg-blue-50 border-blue-200 text-blue-700',
  green: 'bg-green-50 border-green-200 text-green-700',
  orange: 'bg-orange-50 border-orange-200 text-orange-700',
  purple: 'bg-purple-50 border-purple-200 text-purple-700',
  teal: 'bg-teal-50 border-teal-200 text-teal-700',
  gray: 'bg-gray-50 border-gray-200 text-gray-700',
  yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
};
const ICON_COLOR = {
  blue: 'text-blue-500', green: 'text-green-500', orange: 'text-orange-500',
  purple: 'text-purple-500', teal: 'text-teal-500', gray: 'text-gray-500', yellow: 'text-yellow-500',
};

function toCSV(rows, fields) {
  const escape = v => {
    if (v === null || v === undefined) return '';
    const s = Array.isArray(v) ? v.join('; ') : typeof v === 'object' ? JSON.stringify(v) : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = fields.join(',');
  const lines = rows.map(r => fields.map(f => escape(r[f])).join(','));
  return [header, ...lines].join('\n');
}

export default function ExportData() {
  const [loading, setLoading] = useState({});
  const [counts, setCounts] = useState({});

  const loadCounts = async () => {
    const results = await Promise.all(EXPORTS.map(e => base44.entities[e.entity].list('-created_date', 500)));
    const c = {};
    EXPORTS.forEach((e, i) => { c[e.key] = results[i].length; });
    setCounts(c);
  };

  React.useEffect(() => { loadCounts(); }, []);

  const exportCSV = async (exp) => {
    setLoading(l => ({ ...l, [exp.key]: true }));
    const data = await base44.entities[exp.entity].list('-created_date', 1000);
    const csv = toCSV(data, exp.fields);
    const bom = '\uFEFF'; // UTF-8 BOM for Excel
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url; a.download = `${exp.key}_${date}.csv`; a.click();
    URL.revokeObjectURL(url);
    setLoading(l => ({ ...l, [exp.key]: false }));
  };

  const exportAllJSON = async () => {
    setLoading(l => ({ ...l, all: true }));
    const results = await Promise.all(EXPORTS.map(e => base44.entities[e.entity].list('-created_date', 1000)));
    const allData = {};
    EXPORTS.forEach((e, i) => { allData[e.key] = results[i]; });
    allData.exported_at = new Date().toISOString();
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `backup_completo_${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
    setLoading(l => ({ ...l, all: false }));
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Download className="w-6 h-6 text-green-600" /> Exportar Datos
        </h1>
        <Button onClick={exportAllJSON} disabled={loading.all} className="bg-green-700 hover:bg-green-800 gap-2">
          <Download className="w-4 h-4" />
          {loading.all ? 'Exportando...' : 'Backup completo (JSON)'}
        </Button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
        <p className="font-medium">📊 Exportación de datos</p>
        <p className="text-xs mt-1">Los archivos CSV se abren directamente en Excel o Access (usar importar datos → CSV). El backup JSON contiene todos los datos para restaurar o migrar.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {EXPORTS.map(exp => {
          const Icon = exp.icon;
          return (
            <Card key={exp.key} className={`border ${COLOR_MAP[exp.color].split(' ').slice(1).join(' ')}`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className={`w-8 h-8 ${ICON_COLOR[exp.color]}`} />
                  <div>
                    <p className="font-semibold text-sm">{exp.label}</p>
                    <p className="text-xs text-gray-500">{counts[exp.key] !== undefined ? `${counts[exp.key]} registros` : 'Cargando...'}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Button size="sm" variant="outline" onClick={() => exportCSV(exp)} disabled={loading[exp.key]} className="gap-1 text-xs">
                    <FileSpreadsheet className="w-3 h-3" />
                    {loading[exp.key] ? '...' : 'CSV'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-dashed border-gray-300">
        <CardContent className="p-4 text-center text-gray-400 text-sm">
          <p className="font-medium mb-1">💡 Compatibilidad</p>
          <p className="text-xs">Los CSV exportados son compatibles con <strong>Microsoft Excel</strong>, <strong>Access</strong>, <strong>LibreOffice</strong> y <strong>Google Sheets</strong>. El backup JSON es útil para migrar o restaurar datos.</p>
        </CardContent>
      </Card>
    </div>
  );
}