import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Palette, Save, Star } from 'lucide-react';
import CompanyHeader from '../components/CompanyHeader';
import PrintButton from '../components/PrintButton';

const DOC_TYPES = ['factura','presupuesto','recibo','sat','mantenimiento','informe'];
const FONT_SIZES = { small: '11px', medium: '13px', large: '15px' };

const DEFAULT_TEMPLATES = [
  { name: 'Factura estándar', doc_type: 'factura', primary_color: '#1e3a5f', secondary_color: '#0ea5e9', show_logo: true, show_iban: true, show_signature_box: false, font_size: 'medium', iva_rate: 21, is_default: true, header_text: '', footer_text: 'Gracias por su confianza.', notes_template: '' },
  { name: 'Presupuesto estándar', doc_type: 'presupuesto', primary_color: '#1e3a5f', secondary_color: '#0ea5e9', show_logo: true, show_iban: false, show_signature_box: true, font_size: 'medium', iva_rate: 21, is_default: true, header_text: '', footer_text: 'Presupuesto válido por 30 días.', notes_template: '' },
  { name: 'Recibo estándar', doc_type: 'recibo', primary_color: '#166534', secondary_color: '#4ade80', show_logo: true, show_iban: true, show_signature_box: true, font_size: 'medium', iva_rate: 21, is_default: true, header_text: '', footer_text: '', notes_template: '' },
];

const EMPTY_TPL = { name: '', doc_type: 'factura', primary_color: '#1e3a5f', secondary_color: '#0ea5e9', show_logo: true, show_iban: true, show_signature_box: false, font_size: 'medium', iva_rate: 21, is_default: false, header_text: '', footer_text: '', notes_template: '' };

export default function DocumentTemplates() {
  const [templates, setTemplates] = useState([]);
  const [editDialog, setEditDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_TPL);
  const [previewTpl, setPreviewTpl] = useState(null);
  const printRef = useRef(null);

  useEffect(() => {
    base44.entities.DocumentTemplate.list('name', 50).then(data => {
      if (data.length === 0) {
        // Crear plantillas por defecto
        Promise.all(DEFAULT_TEMPLATES.map(t => base44.entities.DocumentTemplate.create(t))).then(() => {
          base44.entities.DocumentTemplate.list('name', 50).then(setTemplates);
        });
      } else {
        setTemplates(data);
      }
    });
  }, []);

  const loadAll = () => base44.entities.DocumentTemplate.list('name', 50).then(setTemplates);

  const handleSave = async () => {
    if (editing) {
      await base44.entities.DocumentTemplate.update(editing.id, form);
    } else {
      await base44.entities.DocumentTemplate.create(form);
    }
    setEditDialog(false);
    setEditing(null);
    setForm(EMPTY_TPL);
    loadAll();
  };

  const handleSetDefault = async (tpl) => {
    // Quitar default de otros del mismo tipo
    const sameType = templates.filter(t => t.doc_type === tpl.doc_type && t.id !== tpl.id);
    await Promise.all(sameType.map(t => base44.entities.DocumentTemplate.update(t.id, { is_default: false })));
    await base44.entities.DocumentTemplate.update(tpl.id, { is_default: true });
    loadAll();
  };

  const grouped = DOC_TYPES.reduce((acc, type) => {
    acc[type] = templates.filter(t => t.doc_type === type);
    return acc;
  }, {});

  const PreviewDoc = ({ tpl }) => (
    <div ref={printRef} style={{ fontFamily: 'Arial, sans-serif', fontSize: FONT_SIZES[tpl.font_size] || '13px' }} className="p-4 bg-white">
      <div style={{ borderBottom: `3px solid ${tpl.primary_color}`, paddingBottom: '12px', marginBottom: '16px' }}>
        {tpl.header_text && <p style={{ color: tpl.secondary_color, fontWeight: 'bold' }}>{tpl.header_text}</p>}
        <CompanyHeader />
      </div>
      <div style={{ backgroundColor: tpl.primary_color, color: 'white', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px' }}>
        <p style={{ fontWeight: 'bold', fontSize: '1.2em', textTransform: 'uppercase' }}>{tpl.doc_type}</p>
        <p style={{ fontSize: '0.85em', opacity: 0.8 }}>Nº: 2024-001 | Fecha: {new Date().toLocaleDateString('es-ES')}</p>
      </div>
      <div style={{ marginBottom: '12px' }}>
        <p style={{ color: tpl.secondary_color, fontWeight: 'bold', fontSize: '0.85em' }}>CLIENTE</p>
        <p>Nombre del Cliente, S.L.</p>
        <p style={{ color: '#666' }}>Calle Ejemplo, 123 — 43000 Tarragona</p>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
        <thead>
          <tr style={{ backgroundColor: tpl.primary_color, color: 'white' }}>
            <th style={{ padding: '6px 8px', textAlign: 'left' }}>Descripción</th>
            <th style={{ padding: '6px 8px', textAlign: 'center' }}>Cant.</th>
            <th style={{ padding: '6px 8px', textAlign: 'right' }}>P. Unit.</th>
            <th style={{ padding: '6px 8px', textAlign: 'right' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {[['Instalación Split 3000 frig.', '1', '450,00', '450,00'],['Material tubería 1/4-3/8', '3m', '12,00', '36,00']].map(([d, c, u, t], i) => (
            <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#f9f9f9' : 'white', borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '6px 8px' }}>{d}</td>
              <td style={{ padding: '6px 8px', textAlign: 'center' }}>{c}</td>
              <td style={{ padding: '6px 8px', textAlign: 'right' }}>{u} €</td>
              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>{t} €</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ textAlign: 'right', borderTop: `2px solid ${tpl.primary_color}`, paddingTop: '8px' }}>
        <p>Subtotal: <strong>486,00 €</strong></p>
        <p>IVA ({tpl.iva_rate}%): <strong>{(486 * tpl.iva_rate / 100).toFixed(2)} €</strong></p>
        <p style={{ fontSize: '1.2em', color: tpl.primary_color, fontWeight: 'bold' }}>TOTAL: {(486 * (1 + tpl.iva_rate / 100)).toFixed(2)} €</p>
      </div>
      {tpl.show_iban && (
        <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '0.85em' }}>
          <p style={{ color: tpl.secondary_color, fontWeight: 'bold' }}>Datos bancarios</p>
          <p>IBAN: ES00 0000 0000 0000 0000 0000</p>
        </div>
      )}
      {tpl.show_signature_box && (
        <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ border: '1px solid #ccc', padding: '8px', borderRadius: '4px', minHeight: '60px' }}>
            <p style={{ fontSize: '0.75em', color: '#666' }}>Firma técnico</p>
          </div>
          <div style={{ border: '1px solid #ccc', padding: '8px', borderRadius: '4px', minHeight: '60px' }}>
            <p style={{ fontSize: '0.75em', color: '#666' }}>Firma cliente</p>
          </div>
        </div>
      )}
      {tpl.notes_template && <p style={{ marginTop: '12px', fontSize: '0.85em', color: '#666', borderTop: '1px solid #eee', paddingTop: '8px' }}>{tpl.notes_template}</p>}
      {tpl.footer_text && <p style={{ marginTop: '8px', textAlign: 'center', fontSize: '0.8em', color: '#999' }}>{tpl.footer_text}</p>}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Palette className="w-6 h-6 text-purple-600" />Plantillas de documentos</h1>
        <Button onClick={() => { setEditing(null); setForm(EMPTY_TPL); setEditDialog(true); }} className="bg-purple-600">
          <Plus className="w-4 h-4 mr-1" />Nueva plantilla
        </Button>
      </div>

      <Tabs defaultValue="factura">
        <TabsList className="w-full flex-wrap">
          {DOC_TYPES.map(t => (
            <TabsTrigger key={t} value={t} className="flex-1 capitalize text-xs">{t} ({grouped[t]?.length || 0})</TabsTrigger>
          ))}
        </TabsList>
        {DOC_TYPES.map(type => (
          <TabsContent key={type} value={type} className="space-y-3 pt-2">
            {grouped[type]?.length === 0 && (
              <p className="text-center text-gray-400 py-6">No hay plantillas para {type}</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {grouped[type]?.map(tpl => (
                <Card key={tpl.id} className="relative overflow-hidden">
                  <div className="h-2" style={{ backgroundColor: tpl.primary_color }} />
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{tpl.name}</p>
                        <div className="flex gap-1 mt-1">
                          <span className="w-5 h-5 rounded-full border" style={{ backgroundColor: tpl.primary_color }} title="Color principal" />
                          <span className="w-5 h-5 rounded-full border" style={{ backgroundColor: tpl.secondary_color }} title="Color secundario" />
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {tpl.show_logo && <Badge variant="outline" className="text-[10px]">Logo</Badge>}
                          {tpl.show_iban && <Badge variant="outline" className="text-[10px]">IBAN</Badge>}
                          {tpl.show_signature_box && <Badge variant="outline" className="text-[10px]">Firmas</Badge>}
                          <Badge variant="outline" className="text-[10px]">IVA {tpl.iva_rate}%</Badge>
                        </div>
                        {tpl.is_default && <Badge className="bg-amber-100 text-amber-700 text-[10px] mt-1">⭐ Predeterminada</Badge>}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setPreviewTpl(tpl)} className="p-1 text-gray-400 hover:text-purple-600" title="Vista previa">
                          <Palette className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setEditing(tpl); setForm({...EMPTY_TPL,...tpl}); setEditDialog(true); }} className="p-1 text-gray-400 hover:text-blue-600">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={async () => { await base44.entities.DocumentTemplate.delete(tpl.id); loadAll(); }} className="p-1 text-red-300 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {!tpl.is_default && (
                      <Button size="sm" variant="outline" className="w-full mt-2 text-xs" onClick={() => handleSetDefault(tpl)}>
                        <Star className="w-3 h-3 mr-1" />Usar como predeterminada
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Edit dialog */}
      <Dialog open={editDialog} onOpenChange={o => { setEditDialog(o); if (!o) { setEditing(null); setForm(EMPTY_TPL); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar plantilla' : 'Nueva plantilla'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nombre de la plantilla *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Tipo de documento</label>
                <Select value={form.doc_type} onValueChange={v => setForm({...form, doc_type: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-500">IVA (%)</label>
                <Input type="number" value={form.iva_rate} onChange={e => setForm({...form, iva_rate: parseFloat(e.target.value)})} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Color principal</label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={form.primary_color} onChange={e => setForm({...form, primary_color: e.target.value})} className="w-10 h-8 rounded cursor-pointer" />
                  <Input value={form.primary_color} onChange={e => setForm({...form, primary_color: e.target.value})} className="text-xs" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">Color secundario</label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={form.secondary_color} onChange={e => setForm({...form, secondary_color: e.target.value})} className="w-10 h-8 rounded cursor-pointer" />
                  <Input value={form.secondary_color} onChange={e => setForm({...form, secondary_color: e.target.value})} className="text-xs" />
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500">Tamaño de fuente</label>
              <Select value={form.font_size} onValueChange={v => setForm({...form, font_size: v})}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Pequeño</SelectItem>
                  <SelectItem value="medium">Mediano</SelectItem>
                  <SelectItem value="large">Grande</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">Opciones</label>
              {[['show_logo','Mostrar logo'],['show_iban','Mostrar IBAN/datos bancarios'],['show_signature_box','Recuadros de firma'],['is_default','Plantilla predeterminada']].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={!!form[key]} onChange={e => setForm({...form, [key]: e.target.checked})} />
                  {label}
                </label>
              ))}
            </div>
            <div>
              <label className="text-xs text-gray-500">Texto de cabecera (opcional)</label>
              <Input className="mt-1" value={form.header_text} onChange={e => setForm({...form, header_text: e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-gray-500">Texto de pie de página</label>
              <Input className="mt-1" value={form.footer_text} onChange={e => setForm({...form, footer_text: e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-gray-500">Texto por defecto en observaciones</label>
              <Textarea className="mt-1" rows={3} value={form.notes_template} onChange={e => setForm({...form, notes_template: e.target.value})} />
            </div>
            <Button onClick={handleSave} className="w-full bg-purple-600">
              <Save className="w-4 h-4 mr-2" />{editing ? 'Actualizar plantilla' : 'Crear plantilla'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={!!previewTpl} onOpenChange={() => setPreviewTpl(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Vista previa: {previewTpl?.name}</DialogTitle></DialogHeader>
          {previewTpl && <PreviewDoc tpl={previewTpl} />}
          <PrintButton contentRef={printRef} title={`Plantilla ${previewTpl?.name}`} />
        </DialogContent>
      </Dialog>
    </div>
  );
}