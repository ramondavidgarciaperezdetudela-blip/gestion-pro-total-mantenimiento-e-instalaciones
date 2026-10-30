import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Package, Printer, X } from 'lucide-react';

/**
 * Botón que muestra y permite imprimir la lista de materiales de un documento/SAT.
 * Props:
 *   items    - array de líneas del documento [{ description, quantity, unit_price, total, ... }]
 *   title    - string, ej: "Presupuesto P-0012 — Cliente"
 *   trigger  - 'button' | 'icon' (estilo del botón)
 */
export default function MaterialsExportButton({ items = [], title = 'Lista de materiales', trigger = 'button' }) {
  const [open, setOpen] = useState(false);

  // Filtrar solo materiales (excluir mano de obra si hay indicador, sino mostrar todos)
  const materials = items.filter(it => it.description && (it.quantity || 0) > 0);

  const handlePrint = async () => {
    const csArr = await base44.entities.CompanySettings.list();
    const cs = csArr?.[0] || {};

    const rows = materials.map((it, i) => `
      <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#fff'}">
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:11px">${it.description || ''}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:11px;font-weight:600">${it.quantity || 1}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:11px">${it.unit_price ? it.unit_price.toFixed(2) + ' €' : '-'}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:11px;font-weight:700;color:#065f46">${it.total ? it.total.toFixed(2) + ' €' : '-'}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center">
          <div style="width:16px;height:16px;border:2px solid #6b7280;border-radius:3px;display:inline-block"></div>
        </td>
      </tr>`).join('');

    const totalMaterials = materials.reduce((s, it) => s + (it.total || (it.quantity || 0) * (it.unit_price || 0)), 0);

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
    <title>Lista de materiales — ${title}</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:20px;max-width:800px;margin:0 auto}
    h1{font-size:16px;font-weight:800;color:#1e3a5f;margin-bottom:4px}
    table{width:100%;border-collapse:collapse;margin-top:16px}
    th{background:#1e3a5f;color:white;padding:8px 10px;text-align:left;font-size:11px}
    th.right{text-align:right}th.center{text-align:center}
    .footer{margin-top:16px;font-size:9px;color:#aaa;border-top:1px solid #e5e7eb;padding-top:8px;text-align:center}
    .logo{max-height:40px;max-width:100px;object-fit:contain}
    .total-row td{background:#f0fdf4;font-weight:800;color:#065f46;font-size:12px}
    @media print{@page{margin:10mm;size:A4}}</style></head><body>
    <div style="display:flex;align-items:flex-start;justify-content:space-between;border-bottom:2px solid #1e3a5f;padding-bottom:10px;margin-bottom:10px">
      <div>
        ${cs.logo_url ? `<img src="${cs.logo_url}" class="logo" alt="Logo" /><br/>` : ''}
        <strong style="font-size:13px;color:#1e3a5f">${cs.company_name || ''}</strong>
        <p style="font-size:9px;color:#555">${cs.phone || ''} ${cs.email ? '· ' + cs.email : ''}</p>
      </div>
      <div style="text-align:right">
        <h1>📦 Lista de Materiales</h1>
        <p style="font-size:10px;color:#666">${title}</p>
        <p style="font-size:9px;color:#888">Fecha: ${new Date().toLocaleDateString('es-ES')}</p>
      </div>
    </div>
    <table>
      <thead><tr>
        <th>Material / Descripción</th>
        <th class="center">Cant.</th>
        <th class="right">P. Unit.</th>
        <th class="right">Total</th>
        <th class="center">✓ Recibido</th>
      </tr></thead>
      <tbody>
        ${rows}
        <tr class="total-row">
          <td colspan="3" style="padding:8px 10px;border-top:2px solid #6ee7b7;text-align:right">TOTAL MATERIALES:</td>
          <td style="padding:8px 10px;border-top:2px solid #6ee7b7;text-align:right">${totalMaterials.toFixed(2)} €</td>
          <td></td>
        </tr>
      </tbody>
    </table>
    <p style="margin-top:12px;font-size:9px;color:#888">Total líneas: ${materials.length}</p>
    <div class="footer">${cs.company_name || ''} · ${cs.phone || ''} · ${cs.email || ''}</div>
    </body></html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 400);
  };

  if (materials.length === 0) return null;

  return (
    <>
      {trigger === 'icon' ? (
        <button onClick={() => setOpen(true)}
          className="flex items-center gap-1 text-xs px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors font-medium"
          title="Lista de materiales">
          <Package className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Materiales</span>
        </button>
      ) : (
        <Button size="sm" variant="outline" className="text-amber-700 border-amber-200 hover:bg-amber-50 gap-1" onClick={() => setOpen(true)}>
          <Package className="w-3.5 h-3.5" />Lista de materiales
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl w-[96vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-600" />
                Lista de materiales
              </DialogTitle>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">{title}</p>
          </DialogHeader>

          <div className="space-y-3">
            {/* Tabla de materiales */}
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-700 text-white">
                    <th className="text-left p-2.5 font-semibold text-xs">Descripción</th>
                    <th className="p-2.5 text-center font-semibold text-xs">Cant.</th>
                    <th className="p-2.5 text-right font-semibold text-xs">P.Unit.</th>
                    <th className="p-2.5 text-right font-semibold text-xs">Total</th>
                    <th className="p-2.5 text-center font-semibold text-xs">✓</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((it, i) => (
                    <tr key={i} className={`border-b ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-amber-50 transition-colors`}>
                      <td className="p-2.5 text-xs font-medium text-gray-800">{it.description}</td>
                      <td className="p-2.5 text-center text-xs font-bold">{it.quantity || 1}</td>
                      <td className="p-2.5 text-right text-xs text-gray-600">
                        {it.unit_price ? `${it.unit_price.toFixed(2)} €` : '—'}
                      </td>
                      <td className="p-2.5 text-right text-xs font-bold text-emerald-700">
                        {it.total ? `${it.total.toFixed(2)} €` : it.unit_price ? `${((it.quantity || 1) * it.unit_price).toFixed(2)} €` : '—'}
                      </td>
                      <td className="p-2.5 text-center">
                        <div className="w-4 h-4 border-2 border-gray-400 rounded mx-auto" />
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-emerald-50 border-t-2 border-emerald-300">
                    <td colSpan={3} className="p-2.5 text-right text-xs font-bold text-emerald-800">TOTAL MATERIALES:</td>
                    <td className="p-2.5 text-right text-sm font-extrabold text-emerald-700">
                      {materials.reduce((s, it) => s + (it.total || (it.quantity || 1) * (it.unit_price || 0)), 0).toFixed(2)} €
                    </td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-xs text-gray-400">{materials.length} línea{materials.length !== 1 ? 's' : ''} · Marcadores de "✓ Recibido" para imprimir y usar como albarán</p>

            <div className="flex gap-2 pt-2 border-t">
              <Button onClick={handlePrint} className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
                <Printer className="w-4 h-4" />Imprimir / Exportar PDF
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>Cerrar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}