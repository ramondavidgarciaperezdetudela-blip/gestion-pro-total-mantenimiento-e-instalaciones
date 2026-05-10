import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, FileText, Printer, Check, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ComparatorToBudgetDialog({ open, onClose, selectedItems = [] }) {
  const [company, setCompany] = useState(null);
  const [margin, setMargin] = useState(30);
  const [iva, setIva] = useState(21);
  const [lines, setLines] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Cargar datos de empresa una sola vez
  useEffect(() => {
    base44.entities.CompanySettings.list().then(d => { if (d[0]) setCompany(d[0]); });
  }, []);

  // Inicializar líneas cuando se abren ítems nuevos
  useEffect(() => {
    if (!open) { setSaved(false); return; }
    setLines(selectedItems.map(item => {
      const cost = item.cost_price || 0;
      const sale = item.sale_price || (cost > 0 ? Math.round(cost * (1 + margin / 100) * 100) / 100 : 0);
      return {
        id: item.id,
        description: item.product_name || '',
        reference: item.product_code || '',
        supplier: item.supplier_name || '',
        quantity: 1,
        unit_price: sale,
        cost_price: cost,
        discount: 0,
      };
    }));
  }, [open, selectedItems]);

  const updateLine = (idx, field, value) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const removeLine = (idx) => setLines(prev => prev.filter((_, i) => i !== idx));

  const totals = lines.reduce((acc, l) => {
    const base = (l.quantity || 0) * (l.unit_price || 0) * (1 - (l.discount || 0) / 100);
    acc.subtotal += base;
    return acc;
  }, { subtotal: 0 });
  const ivaAmount = totals.subtotal * iva / 100;
  const total = totals.subtotal + ivaAmount;

  const handleSave = async () => {
    setSaving(true);
    const items = lines.map(l => ({
      description: [l.description, l.reference && `Ref: ${l.reference}`, l.supplier && `Prov: ${l.supplier}`].filter(Boolean).join(' · '),
      quantity: l.quantity,
      unit_price: l.unit_price,
      discount: l.discount || 0,
      total: (l.quantity || 0) * (l.unit_price || 0) * (1 - (l.discount || 0) / 100),
    }));

    const now = new Date();
    const doc = {
      doc_type: 'presupuesto',
      date: now.toISOString().split('T')[0],
      status: 'borrador',
      items,
      subtotal: totals.subtotal,
      iva_rate: iva,
      iva_amount: ivaAmount,
      total,
      contact_name: 'Cliente',
      observations: `Materiales seleccionados desde comparador de tarifas · ${now.toLocaleDateString('es-ES')}`,
    };

    await base44.entities.Invoice.create(doc);
    setSaving(false);
    setSaved(true);
    toast.success('Presupuesto creado en Documentos');
  };

  const handlePrint = () => {
    const win = window.open('', '_blank');
    const rows = lines.map(l => {
      const lineTotal = ((l.quantity || 0) * (l.unit_price || 0) * (1 - (l.discount || 0) / 100));
      return `
        <tr>
          <td style="padding:8px 10px;border-bottom:1px solid #eee">
            <b>${l.description}</b><br>
            <small style="color:#888">${[l.reference && `Ref: ${l.reference}`, l.supplier && `Prov: ${l.supplier}`].filter(Boolean).join(' · ')}</small>
          </td>
          <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center">${l.quantity}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right">${Number(l.unit_price).toFixed(2)} €</td>
          <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center">${l.discount || 0}%</td>
          <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;font-weight:600">${lineTotal.toFixed(2)} €</td>
        </tr>`;
    }).join('');

    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Presupuesto</title>
      <style>body{font-family:Arial,sans-serif;padding:30px;color:#222}
      table{width:100%;border-collapse:collapse}th{background:#f5f5f5;padding:8px 10px;text-align:left;font-size:12px;text-transform:uppercase;color:#555}</style>
      </head><body>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
        <div>
          ${company?.logo_url ? `<img src="${company.logo_url}" style="height:50px;object-fit:contain;margin-bottom:8px"><br>` : ''}
          <b style="font-size:18px">${company?.company_name || 'Mi Empresa'}</b><br>
          <small style="color:#777">${company?.nif || ''} · ${company?.address || ''} · ${company?.phone || ''}</small>
        </div>
        <div style="text-align:right">
          <b style="font-size:22px;color:#1e3a5f">PRESUPUESTO</b><br>
          <small style="color:#777">Fecha: ${new Date().toLocaleDateString('es-ES')}</small>
        </div>
      </div>
      <table>
        <thead><tr>
          <th>Descripción</th><th style="text-align:center">Cant.</th>
          <th style="text-align:right">Precio u.</th><th style="text-align:center">Dto.</th>
          <th style="text-align:right">Total</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="display:flex;justify-content:flex-end;margin-top:24px">
        <table style="width:280px">
          <tr><td style="padding:4px 8px;color:#555">Base imponible</td><td style="padding:4px 8px;text-align:right">${totals.subtotal.toFixed(2)} €</td></tr>
          <tr><td style="padding:4px 8px;color:#555">IVA ${iva}%</td><td style="padding:4px 8px;text-align:right">${ivaAmount.toFixed(2)} €</td></tr>
          <tr style="background:#1e3a5f;color:white"><td style="padding:8px;font-weight:700">TOTAL</td><td style="padding:8px;text-align:right;font-weight:700;font-size:16px">${total.toFixed(2)} €</td></tr>
        </table>
      </div>
      ${company?.payment_terms ? `<p style="color:#777;font-size:12px;margin-top:20px">${company.payment_terms}</p>` : ''}
      </body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-3xl w-[96vw] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Generar presupuesto desde comparador
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Ajustes globales */}
          <div className="flex gap-4 bg-blue-50 border border-blue-200 rounded-xl p-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-blue-700 whitespace-nowrap">IVA (%)</label>
              <select value={iva} onChange={e => setIva(parseInt(e.target.value))}
                className="text-sm border border-blue-300 rounded px-2 py-1 bg-white w-20">
                <option value={21}>21%</option>
                <option value={10}>10%</option>
                <option value={4}>4%</option>
                <option value={0}>0%</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-blue-700 whitespace-nowrap">Margen venta (%)</label>
              <Input type="number" min="0" max="300" value={margin}
                onChange={e => {
                  const m = parseInt(e.target.value) || 0;
                  setMargin(m);
                  setLines(prev => prev.map(l => ({
                    ...l,
                    unit_price: l.cost_price > 0
                      ? Math.round(l.cost_price * (1 + m / 100) * 100) / 100
                      : l.unit_price,
                  })));
                }}
                className="w-20 text-sm" />
            </div>
            <p className="text-xs text-blue-600 self-center">
              {company?.company_name || 'Empresa'} · {lines.length} líneas
            </p>
          </div>

          {/* Tabla de líneas */}
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 text-xs text-gray-500 uppercase">
                  <th className="text-left p-3">Descripción</th>
                  <th className="text-center p-3 w-20">Cant.</th>
                  <th className="text-right p-3 w-28">P. venta (€)</th>
                  <th className="text-center p-3 w-20">Dto. (%)</th>
                  <th className="text-right p-3 w-24">Total</th>
                  <th className="p-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lines.map((l, idx) => {
                  const lineTotal = (l.quantity || 0) * (l.unit_price || 0) * (1 - (l.discount || 0) / 100);
                  return (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-2">
                        <p className="font-medium text-gray-900 text-xs">{l.description}</p>
                        <p className="text-[10px] text-gray-400">
                          {[l.reference && `Ref: ${l.reference}`, l.supplier && `Prov: ${l.supplier}`].filter(Boolean).join(' · ')}
                        </p>
                        {l.cost_price > 0 && (
                          <p className="text-[10px] text-blue-500">Coste: {l.cost_price.toFixed(2)} €</p>
                        )}
                      </td>
                      <td className="p-2">
                        <Input type="number" min="0.01" step="0.01" value={l.quantity}
                          onChange={e => updateLine(idx, 'quantity', parseFloat(e.target.value) || 1)}
                          className="w-full text-center text-sm h-8" />
                      </td>
                      <td className="p-2">
                        <Input type="number" min="0" step="0.01" value={l.unit_price}
                          onChange={e => updateLine(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="w-full text-right text-sm h-8" />
                      </td>
                      <td className="p-2">
                        <Input type="number" min="0" max="100" value={l.discount}
                          onChange={e => updateLine(idx, 'discount', parseFloat(e.target.value) || 0)}
                          className="w-full text-center text-sm h-8" />
                      </td>
                      <td className="p-2 text-right font-semibold text-gray-800 whitespace-nowrap">
                        {lineTotal.toFixed(2)} €
                      </td>
                      <td className="p-2 text-center">
                        <button onClick={() => removeLine(idx)} className="text-gray-300 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totales */}
          <div className="flex justify-end">
            <div className="w-64 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Base imponible</span>
                <span className="font-semibold">{totals.subtotal.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>IVA {iva}%</span>
                <span className="font-semibold">{ivaAmount.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between bg-[#1e3a5f] text-white rounded-lg px-3 py-2 font-bold text-base">
                <span>TOTAL</span>
                <span>{total.toFixed(2)} €</span>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-3 flex-wrap">
            <Button onClick={handlePrint} variant="outline" className="gap-2 flex-1">
              <Printer className="w-4 h-4" /> Imprimir / PDF
            </Button>
            <Button onClick={handleSave} disabled={saving || saved || lines.length === 0}
              className="gap-2 flex-1 bg-blue-700 hover:bg-blue-800">
              {saving
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : saved
                  ? <Check className="w-4 h-4" />
                  : <FileText className="w-4 h-4" />
              }
              {saved ? 'Guardado en Documentos' : 'Guardar como presupuesto'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}