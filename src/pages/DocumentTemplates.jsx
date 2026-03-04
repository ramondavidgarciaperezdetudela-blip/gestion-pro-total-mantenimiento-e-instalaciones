import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Palette, Save, Star, Eye, Download } from 'lucide-react';

const DOC_TYPES = ['factura', 'presupuesto', 'recibo', 'sat', 'mantenimiento', 'informe', 'legalización', 'tarjeta_contacto'];
const FONT_SIZES = { small: '11px', medium: '13px', large: '15px' };

const DEFAULT_TEMPLATES = [
  { name: 'Factura estándar', doc_type: 'factura', primary_color: '#1e3a5f', secondary_color: '#0ea5e9', show_logo: true, show_iban: true, show_signature_box: false, font_size: 'medium', iva_rate: 21, is_default: true, header_text: '', footer_text: 'Gracias por su confianza.', notes_template: 'Forma de pago: Transferencia bancaria. Plazo: 30 días desde factura.' },
  { name: 'Presupuesto estándar', doc_type: 'presupuesto', primary_color: '#1e3a5f', secondary_color: '#0ea5e9', show_logo: true, show_iban: false, show_signature_box: true, font_size: 'medium', iva_rate: 21, is_default: true, header_text: '', footer_text: 'Presupuesto válido por 30 días.', notes_template: 'Condiciones: Este presupuesto incluye material y mano de obra. Plazo de entrega: según disponibilidad.' },
  { name: 'Recibo estándar', doc_type: 'recibo', primary_color: '#166534', secondary_color: '#4ade80', show_logo: true, show_iban: true, show_signature_box: true, font_size: 'medium', iva_rate: 21, is_default: true, header_text: '', footer_text: '', notes_template: 'Recibido conforme. Acuse de recibo.' },
  { name: 'SAT estándar', doc_type: 'sat', primary_color: '#7c2d12', secondary_color: '#ea580c', show_logo: true, show_iban: false, show_signature_box: true, font_size: 'medium', iva_rate: 21, is_default: true, header_text: 'Orden de Trabajo SAT', footer_text: 'Garantía de trabajo realizado según normativa vigente.', notes_template: 'Se realizaron las verificaciones y reparaciones indicadas. Material utilizado conforme a especificaciones técnicas.' },
  { name: 'Mantenimiento estándar', doc_type: 'mantenimiento', primary_color: '#0369a1', secondary_color: '#0284c7', show_logo: true, show_iban: false, show_signature_box: true, font_size: 'medium', iva_rate: 21, is_default: true, header_text: 'Ficha de Mantenimiento', footer_text: 'Próximo mantenimiento recomendado según cronograma.', notes_template: 'Se han realizado las inspecciones y limpiezas estándar. Equipos en estado óptimo.' },
  { name: 'Informe técnico estándar', doc_type: 'informe', primary_color: '#4f46e5', secondary_color: '#6366f1', show_logo: true, show_iban: false, show_signature_box: false, font_size: 'medium', iva_rate: 0, is_default: true, header_text: 'Informe Técnico', footer_text: 'Informe confeccionado según normativa técnica aplicable.', notes_template: 'Inspección visual y pruebas funcionales realizadas. Recomendaciones indicadas en observaciones.' },
  { name: 'Tarjeta de contacto', doc_type: 'tarjeta_contacto', primary_color: '#1e3a5f', secondary_color: '#0ea5e9', show_logo: true, show_iban: false, show_signature_box: false, font_size: 'medium', iva_rate: 0, is_default: true, header_text: 'Técnico SAT', footer_text: 'Servicio de Asistencia Técnica', notes_template: '' },
];

const FONT_FAMILIES = ['Arial', 'Times New Roman', 'Georgia', 'Verdana', 'Calibri', 'Trebuchet MS'];

const EMPTY_TPL = { name: '', doc_type: 'factura', primary_color: '#1e3a5f', secondary_color: '#0ea5e9', show_logo: true, show_iban: true, show_signature_box: false, font_size: 'medium', font_family: 'Arial', iva_rate: 21, is_default: false, header_text: '', footer_text: '', notes_template: '', margin_top: 15, margin_bottom: 15, margin_left: 15, margin_right: 15, zoom: 100, table_style: 'striped', show_work_type_badge: true };

const TEMPLATE_DESCRIPTIONS = {
  factura: 'Documento de cobro con datos bancarios y términos de pago',
  presupuesto: 'Oferta con límite de validez y recuadro de firma del cliente',
  recibo: 'Comprobante de pago conforme con firmas',
  sat: 'Orden de trabajo técnica con especificaciones y garantía',
  mantenimiento: 'Ficha de mantenimiento preventivo con cronograma',
  informe: 'Informe técnico sin IVA aplicable',
  legalización: 'Documentos legalizados y normalizados',
  tarjeta_contacto: 'Tarjeta de visita del técnico'
};

export default function DocumentTemplates() {
   const [templates, setTemplates] = useState([]);
   const [company, setCompany] = useState(null);
   const [editDialog, setEditDialog] = useState(false);
   const [editing, setEditing] = useState(null);
   const [form, setForm] = useState(EMPTY_TPL);
   const [previewTpl, setPreviewTpl] = useState(null);
   const [showPreviewInEdit, setShowPreviewInEdit] = useState(false);
   const printRef = useRef(null);
   const fileUploadRef = useRef(null);
   const [uploading, setUploading] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.DocumentTemplate.list('name', 50),
      base44.entities.CompanySettings.list().then(r => r[0] || null),
    ]).then(([data, comp]) => {
      setCompany(comp);
      if (data.length === 0) {
        Promise.all(DEFAULT_TEMPLATES.map(t => base44.entities.DocumentTemplate.create(t)))
          .then(() => base44.entities.DocumentTemplate.list('name', 50).then(setTemplates));
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
    const sameType = templates.filter(t => t.doc_type === tpl.doc_type && t.id !== tpl.id);
    await Promise.all(sameType.map(t => base44.entities.DocumentTemplate.update(t.id, { is_default: false })));
    await base44.entities.DocumentTemplate.update(tpl.id, { is_default: true });
    loadAll();
  };

  const handleUploadExample = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !form.doc_type) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm({ ...form, example_file_url: file_url, example_file_name: file.name });
    setUploading(false);
  };

  const handleSaveAsDefault = async () => {
    const sameType = templates.filter(t => t.doc_type === form.doc_type && t.id !== editing?.id);
    await Promise.all(sameType.map(t => base44.entities.DocumentTemplate.update(t.id, { is_default: false })));
    await handleSave();
  };

  const grouped = DOC_TYPES.reduce((acc, type) => {
    acc[type] = templates.filter(t => t.doc_type === type);
    return acc;
  }, {});

  const PreviewContactCard = ({ tpl }) => (
    <div style={{ fontFamily: tpl.font_family || 'Arial', maxWidth: 400, margin: '0 auto' }}>
      <div style={{ background: tpl.primary_color, color: '#fff', borderRadius: 10, padding: '20px 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: tpl.secondary_color, opacity: 0.2 }} />
        <div style={{ position: 'absolute', bottom: -15, right: 20, width: 60, height: 60, borderRadius: '50%', background: tpl.secondary_color, opacity: 0.15 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          {tpl.show_logo && company?.logo_url
            ? <img src={company.logo_url} alt="logo" style={{ height: 36, background: '#fff', borderRadius: 6, padding: '2px 4px', objectFit: 'contain' }} />
            : <div style={{ width: 36, height: 36, background: tpl.secondary_color, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 16, color: tpl.primary_color }}>{company?.company_name?.[0] || 'E'}</div>
          }
          <div>
            <p style={{ fontWeight: 'bold', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.6px', color: tpl.secondary_color }}>{company?.company_name || 'Mi Empresa S.L.'}</p>
          </div>
        </div>
        <p style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 3 }}>{tpl.header_text || 'Nombre del Técnico'}</p>
        <p style={{ fontSize: 11, color: '#c7d8f0', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14 }}>{tpl.footer_text || 'Cargo / Departamento'}</p>
        <div style={{ fontSize: 10, color: '#aac8e8', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {company?.phone && <span>📞 {company.phone}</span>}
          {company?.email && <span>✉️ {company.email}</span>}
          {company?.website && <span>🌐 {company.website}</span>}
          {company?.address && <span>📍 {company.address}, {company.city}</span>}
        </div>
      </div>
      <p style={{ textAlign: 'center', fontSize: 10, color: '#999', marginTop: 6 }}>Personaliza el nombre y cargo en Cabecera / Pie de página</p>
    </div>
  );

  const PreviewDoc = ({ tpl }) => {
    if (tpl.doc_type === 'tarjeta_contacto') return <PreviewContactCard tpl={tpl} />;
    return (
    <div ref={printRef} style={{ fontFamily: 'Arial, sans-serif', fontSize: FONT_SIZES[tpl.font_size] || '13px', maxWidth: '720px', margin: '0 auto' }} className="p-4 bg-white text-gray-900">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `3px solid ${tpl.primary_color}`, paddingBottom: '12px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {tpl.show_logo && company?.logo_url && (
            <img src={company.logo_url} alt="logo" style={{ height: '50px', objectFit: 'contain' }} />
          )}
          {tpl.show_logo && !company?.logo_url && (
            <div style={{ width: '50px', height: '50px', background: tpl.primary_color, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.2em' }}>
              {company?.company_name?.[0] || 'E'}
            </div>
          )}
          <div>
            <p style={{ fontWeight: 'bold', fontSize: '1.1em', color: tpl.primary_color }}>{company?.company_name || 'Tu Empresa, S.L.'}</p>
            {company?.nif && <p style={{ fontSize: '0.8em', color: '#666' }}>NIF: {company.nif}</p>}
            {company?.address && <p style={{ fontSize: '0.8em', color: '#666' }}>{company.address}, {company.city}</p>}
            {company?.phone && <p style={{ fontSize: '0.8em', color: '#666' }}>Tel: {company.phone}</p>}
          </div>
        </div>
        {tpl.header_text && <p style={{ color: tpl.secondary_color, fontWeight: 'bold', textAlign: 'right', maxWidth: '200px' }}>{tpl.header_text}</p>}
      </div>

      {/* Doc title bar */}
      <div style={{ backgroundColor: tpl.primary_color, color: 'white', padding: '8px 16px', borderRadius: '6px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontWeight: 'bold', fontSize: '1.3em', textTransform: 'uppercase', letterSpacing: '1px' }}>{tpl.doc_type}</p>
        <div style={{ textAlign: 'right', fontSize: '0.85em', opacity: 0.9 }}>
          <p>Nº: 2024-001</p>
          <p>Fecha: {new Date().toLocaleDateString('es-ES')}</p>
        </div>
      </div>

      {/* Client block */}
      <div style={{ marginBottom: '16px', padding: '10px 12px', background: '#f8f8f8', borderLeft: `4px solid ${tpl.secondary_color}`, borderRadius: '0 4px 4px 0' }}>
        <p style={{ color: tpl.secondary_color, fontWeight: 'bold', fontSize: '0.8em', textTransform: 'uppercase', marginBottom: '4px' }}>Cliente</p>
        <p style={{ fontWeight: 'bold' }}>Nombre del Cliente, S.L.</p>
        <p style={{ color: '#666', fontSize: '0.9em' }}>NIF: B12345678</p>
        <p style={{ color: '#666', fontSize: '0.9em' }}>Calle Ejemplo, 123 — 43000 Tarragona</p>
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '0.9em' }}>
        <thead>
          <tr style={{ backgroundColor: tpl.primary_color, color: 'white' }}>
            <th style={{ padding: '7px 10px', textAlign: 'left' }}>Descripción</th>
            <th style={{ padding: '7px 8px', textAlign: 'center', width: '60px' }}>Cant.</th>
            <th style={{ padding: '7px 8px', textAlign: 'right', width: '80px' }}>P. Unit.</th>
            <th style={{ padding: '7px 8px', textAlign: 'right', width: '80px' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {[['Instalación Split 3000 frig.', '1', '450,00', '450,00'], ['Material tubería 1/4-3/8 (3m)', '3', '12,00', '36,00'], ['Mano de obra instalación', '4h', '35,00', '140,00']].map(([d, c, u, t], i) => (
            <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#f9f9f9' : 'white', borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '7px 10px' }}>{d}</td>
              <td style={{ padding: '7px 8px', textAlign: 'center' }}>{c}</td>
              <td style={{ padding: '7px 8px', textAlign: 'right' }}>{u} €</td>
              <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 'bold' }}>{t} €</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <div style={{ width: '220px', borderTop: `2px solid ${tpl.primary_color}`, paddingTop: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.9em' }}>
            <span>Subtotal:</span><strong>626,00 €</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.9em' }}>
            <span>IVA ({tpl.iva_rate}%):</span><strong>{(626 * tpl.iva_rate / 100).toFixed(2)} €</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2em', color: tpl.primary_color, fontWeight: 'bold', borderTop: '1px solid #ccc', paddingTop: '6px' }}>
            <span>TOTAL:</span><span>{(626 * (1 + tpl.iva_rate / 100)).toFixed(2)} €</span>
          </div>
        </div>
      </div>

      {/* IBAN */}
      {tpl.show_iban && company?.iban && (
        <div style={{ padding: '8px 12px', backgroundColor: '#f0f4ff', borderRadius: '4px', fontSize: '0.85em', marginBottom: '12px' }}>
          <p style={{ color: tpl.secondary_color, fontWeight: 'bold', marginBottom: '2px' }}>Datos bancarios</p>
          <p>IBAN: {company.iban}</p>
        </div>
      )}
      {tpl.show_iban && !company?.iban && (
        <div style={{ padding: '8px 12px', backgroundColor: '#f0f4ff', borderRadius: '4px', fontSize: '0.85em', marginBottom: '12px' }}>
          <p style={{ color: tpl.secondary_color, fontWeight: 'bold' }}>Datos bancarios · IBAN: ES00 0000 0000 00 0000000000</p>
        </div>
      )}

      {/* Signatures */}
      {tpl.show_signature_box && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          {['Firma y sello técnico', 'Conforme cliente'].map(label => (
            <div key={label} style={{ border: '1px solid #ccc', padding: '8px 12px', borderRadius: '4px', minHeight: '70px' }}>
              <p style={{ fontSize: '0.75em', color: '#888' }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      {tpl.notes_template && (
        <p style={{ fontSize: '0.8em', color: '#666', borderTop: '1px solid #eee', paddingTop: '8px', marginBottom: '8px', whiteSpace: 'pre-wrap' }}>{tpl.notes_template}</p>
      )}

      {/* Footer */}
      {tpl.footer_text && (
        <p style={{ textAlign: 'center', fontSize: '0.8em', color: '#aaa', borderTop: '1px dashed #ddd', paddingTop: '8px' }}>{tpl.footer_text}</p>
      )}
    </div>
  );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Palette className="w-6 h-6 text-purple-600" />Plantillas de documentos
        </h1>
        <Button onClick={() => { setEditing(null); setForm(EMPTY_TPL); setEditDialog(true); }} className="bg-purple-600">
          <Plus className="w-4 h-4 mr-1" />Nueva plantilla
        </Button>
      </div>

      {!company?.logo_url && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
          ⚠️ Para que el logo aparezca en documentos, súbelo en <strong>Configuración → Empresa</strong>.
        </div>
      )}

      <Tabs defaultValue="factura">
        <TabsList className="w-full flex-wrap h-auto">
           {DOC_TYPES.map(t => (
             <TabsTrigger key={t} value={t} className="flex-1 capitalize text-xs" title={TEMPLATE_DESCRIPTIONS[t]}>{t} ({grouped[t]?.length || 0})</TabsTrigger>
           ))}
         </TabsList>

        {DOC_TYPES.map(type => (
          <TabsContent key={type} value={type} className="space-y-3 pt-3">
            {grouped[type]?.length === 0 && (
              <p className="text-center text-gray-400 py-8">No hay plantillas para {type}</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {grouped[type]?.map(tpl => (
                <Card key={tpl.id} className="relative overflow-hidden hover:shadow-md transition-shadow">
                  <div className="h-2" style={{ backgroundColor: tpl.primary_color }} />
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{tpl.name}</p>
                        <div className="flex gap-1.5 mt-1.5">
                          <span className="w-5 h-5 rounded-full border-2 border-white shadow" style={{ backgroundColor: tpl.primary_color }} title="Color principal" />
                          <span className="w-5 h-5 rounded-full border-2 border-white shadow" style={{ backgroundColor: tpl.secondary_color }} title="Color secundario" />
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {tpl.show_logo && <Badge variant="outline" className="text-[10px]">Logo</Badge>}
                          {tpl.show_iban && <Badge variant="outline" className="text-[10px]">IBAN</Badge>}
                          {tpl.show_signature_box && <Badge variant="outline" className="text-[10px]">Firmas</Badge>}
                          <Badge variant="outline" className="text-[10px]">IVA {tpl.iva_rate}%</Badge>
                          <Badge variant="outline" className="text-[10px]">{tpl.font_size}</Badge>
                        </div>
                        {tpl.is_default && <Badge className="bg-amber-100 text-amber-700 text-[10px] mt-1.5">⭐ Predeterminada</Badge>}
                      </div>
                      <div className="flex flex-col gap-1">
                        <button onClick={() => setPreviewTpl(tpl)} className="p-1.5 text-gray-400 hover:text-purple-600 rounded hover:bg-purple-50" title="Vista previa">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setEditing(tpl); setForm({ ...EMPTY_TPL, ...tpl }); setEditDialog(true); }} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={async () => { if (confirm('¿Eliminar plantilla?')) { await base44.entities.DocumentTemplate.delete(tpl.id); loadAll(); } }} className="p-1.5 text-red-300 hover:text-red-500 rounded hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {!tpl.is_default && (
                      <Button size="sm" variant="outline" className="w-full mt-3 text-xs" onClick={() => handleSetDefault(tpl)}>
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
      <Dialog open={editDialog} onOpenChange={o => { setEditDialog(o); if (!o) { setEditing(null); setForm(EMPTY_TPL); setShowPreviewInEdit(false); } }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar plantilla' : 'Nueva plantilla'}</DialogTitle></DialogHeader>
          <div className="flex gap-4 h-[calc(90vh-100px)]">
            {/* Formulario */}
            <div className="flex-1 overflow-y-auto space-y-3">
            <Input placeholder="Nombre de la plantilla *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Tipo de documento</label>
                <Select value={form.doc_type} onValueChange={v => setForm({ ...form, doc_type: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-500">IVA por defecto (%)</label>
                <Select value={String(form.iva_rate)} onValueChange={v => setForm({ ...form, iva_rate: parseFloat(v) })} className="mt-1">
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0% (Exento)</SelectItem>
                    <SelectItem value="4">4% (Superreducido)</SelectItem>
                    <SelectItem value="10">10% (Reducido)</SelectItem>
                    <SelectItem value="21">21% (General)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Color principal</label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={form.primary_color} onChange={e => setForm({ ...form, primary_color: e.target.value })} className="w-10 h-8 rounded cursor-pointer border" />
                  <Input value={form.primary_color} onChange={e => setForm({ ...form, primary_color: e.target.value })} className="text-xs" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">Color secundario</label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={form.secondary_color} onChange={e => setForm({ ...form, secondary_color: e.target.value })} className="w-10 h-8 rounded cursor-pointer border" />
                  <Input value={form.secondary_color} onChange={e => setForm({ ...form, secondary_color: e.target.value })} className="text-xs" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Tamaño de fuente</label>
                <Select value={form.font_size} onValueChange={v => setForm({ ...form, font_size: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Pequeño (11px)</SelectItem>
                    <SelectItem value="medium">Mediano (13px)</SelectItem>
                    <SelectItem value="large">Grande (15px)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Tipo de letra</label>
                <Select value={form.font_family || 'Arial'} onValueChange={v => setForm({ ...form, font_family: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FONT_FAMILIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500">Estilo de tabla</label>
              <Select value={form.table_style || 'striped'} onValueChange={v => setForm({ ...form, table_style: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="striped">Filas alternadas</SelectItem>
                  <SelectItem value="bordered">Con bordes</SelectItem>
                  <SelectItem value="minimal">Minimalista</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-gray-500">Zoom de impresión: {form.zoom || 100}%</label>
              <input type="range" min={60} max={120} step={5} value={form.zoom || 100}
                onChange={e => setForm({ ...form, zoom: parseInt(e.target.value) })}
                className="w-full mt-1" />
            </div>

            <div className="grid grid-cols-2 gap-2 border rounded-lg p-3 bg-gray-50">
              <label className="text-xs font-semibold text-gray-600 col-span-2">Márgenes de impresión (mm)</label>
              {[['margin_top', 'Superior'], ['margin_bottom', 'Inferior'], ['margin_left', 'Izquierdo'], ['margin_right', 'Derecho']].map(([k, l]) => (
                <div key={k}>
                  <label className="text-xs text-gray-500">{l}</label>
                  <Input type="number" className="mt-1 h-8 text-sm" value={form[k] ?? 15} onChange={e => setForm({ ...form, [k]: parseInt(e.target.value) })} />
                </div>
              ))}
            </div>

            <div className="space-y-2 border rounded-lg p-3 bg-gray-50">
              <label className="text-xs font-semibold text-gray-600">Elementos del documento</label>
              {[['show_logo', 'Mostrar logo de empresa'], ['show_iban', 'Mostrar IBAN/datos bancarios'], ['show_signature_box', 'Recuadros de firma (técnico/cliente)'], ['is_default', 'Usar como plantilla predeterminada']].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={!!form[key]} onChange={e => setForm({ ...form, [key]: e.target.checked })} className="rounded" />
                  {label}
                </label>
              ))}
            </div>
            <div>
              <label className="text-xs text-gray-500">Texto de cabecera (opcional)</label>
              <Input className="mt-1" placeholder="Ej: Servicio Técnico Oficial..." value={form.header_text} onChange={e => setForm({ ...form, header_text: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-gray-500">Pie de página</label>
              <Input className="mt-1" placeholder="Ej: Gracias por su confianza." value={form.footer_text} onChange={e => setForm({ ...form, footer_text: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-gray-500">Observaciones por defecto</label>
              <Textarea className="mt-1" rows={3} placeholder="Texto que aparecerá automáticamente en observaciones" value={form.notes_template} onChange={e => setForm({ ...form, notes_template: e.target.value })} />
            </div>
            <div className="space-y-2 border rounded-lg p-3 bg-blue-50">
              <label className="text-xs font-semibold text-blue-700">📄 Ejemplo de documento personalizado</label>
              <p className="text-xs text-gray-600 mb-2">Sube un PDF o imagen como referencia para usar este estilo en los documentos generados</p>
              <Button variant="outline" className="w-full text-xs" onClick={() => fileUploadRef.current?.click()} disabled={uploading}>
                <Download className="w-3 h-3 mr-1" />{uploading ? 'Subiendo...' : 'Subir ejemplo de documento'}
              </Button>
              <input ref={fileUploadRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleUploadExample} />
              {form.example_file_name && (
                <p className="text-xs text-green-700 bg-white p-2 rounded">✓ {form.example_file_name}</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setShowPreviewInEdit(!showPreviewInEdit)} variant="outline" className="w-full">
                <Eye className="w-4 h-4 mr-2" />{showPreviewInEdit ? 'Ocultar vista previa' : 'Ver vista previa'}
              </Button>
              <Button onClick={handleSaveAsDefault} className="w-full bg-amber-600" title="Guardar como plantilla predeterminada para este tipo de documento">
                <Star className="w-4 h-4 mr-2" />Guardar como predeterminada
              </Button>
              <Button onClick={handleSave} className="w-full bg-purple-600">
                <Save className="w-4 h-4 mr-2" />Guardar plantilla
              </Button>
            </div>
            </div>

            {/* Vista previa en tiempo real */}
            {showPreviewInEdit && (
              <div className="flex-1 border-l overflow-y-auto bg-gray-50 p-3">
                <p className="text-xs font-semibold text-gray-600 mb-2">👁️ Vista previa en vivo</p>
                <div className="bg-white rounded-lg overflow-hidden border">
                  <PreviewDoc tpl={form} />
                </div>
              </div>
            )}
            </div>
            </DialogContent>
            </Dialog>

      {/* Preview dialog */}
      <Dialog open={!!previewTpl} onOpenChange={() => setPreviewTpl(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Vista previa: {previewTpl?.name}</DialogTitle></DialogHeader>
          <div className="border rounded-lg overflow-hidden">
            {previewTpl && <PreviewDoc tpl={previewTpl} />}
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => {
              const w = window.open('', '_blank');
              if (w) { w.document.write(`<html><body style="margin:0">${printRef.current?.innerHTML || ''}</body></html>`); w.print(); }
            }}>Imprimir vista previa</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}