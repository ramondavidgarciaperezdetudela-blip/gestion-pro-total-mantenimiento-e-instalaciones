import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Save, Upload, Loader2, Printer } from 'lucide-react';
import { toast } from "sonner";

export default function CompanyConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState(null);
  const [form, setForm] = useState({
    company_name: '', nif: '', address: '', city: '', province: '', postal_code: '',
    phone: '', email: '', website: '', logo_url: '', iban: '',
    printer_config: { margin_top: 10, margin_bottom: 10, margin_left: 10, margin_right: 10, paper_size: 'A4' },
    payment_terms: "Forma de pago: Máximo 3 pagos.\n1º Pago: 100% material + 50% mano de obra\n2º Pago: 25% mano de obra (al iniciar)\n3º Pago: 25% mano de obra restante (al finalizar)",
    observations_climate: 'Normativa aplicable: RITE RD 1027/2007, F-Gas RD 115/2017',
    observations_electric: 'Normativa aplicable: REBT RD 842/2002',
    observations_refrigeration: 'Normativa aplicable: Reglamento Seguridad Instalaciones Frigoríficas, F-Gas RD 115/2017'
  });

  useEffect(() => {
    base44.entities.CompanySettings.list().then(data => {
      if (data.length > 0) {
        setExistingId(data[0].id);
        setForm({
          company_name: data[0].company_name || '',
          nif: data[0].nif || '',
          address: data[0].address || '',
          city: data[0].city || '',
          province: data[0].province || '',
          postal_code: data[0].postal_code || '',
          phone: data[0].phone || '',
          email: data[0].email || '',
          website: data[0].website || '',
          logo_url: data[0].logo_url || '',
          iban: data[0].iban || '',
          printer_config: data[0].printer_config || form.printer_config,
          payment_terms: data[0].payment_terms || form.payment_terms,
          observations_climate: data[0].observations_climate || form.observations_climate,
          observations_electric: data[0].observations_electric || form.observations_electric,
          observations_refrigeration: data[0].observations_refrigeration || form.observations_refrigeration,
        });
      }
      setLoading(false);
    });
  }, []);

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm({...form, logo_url: file_url});
  };

  const handleSave = async () => {
    setSaving(true);
    if (existingId) {
      await base44.entities.CompanySettings.update(existingId, form);
    } else {
      const created = await base44.entities.CompanySettings.create(form);
      setExistingId(created.id);
    }
    setSaving(false);
    toast.success('Datos de empresa guardados correctamente');
  };

  const updatePrinter = (field, value) => {
    setForm({...form, printer_config: {...form.printer_config, [field]: value}});
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="w-6 h-6 text-gray-500" />Configuración Empresa</h1>

      <Card>
        <CardHeader><CardTitle className="text-lg">Datos de la empresa</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4">
            {form.logo_url ? (
              <img src={form.logo_url} alt="Logo" className="h-20 w-20 object-contain rounded-lg border" />
            ) : (
              <div className="h-20 w-20 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">Logo</div>
            )}
            <div>
              <label className="cursor-pointer bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 inline-flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Subir logo
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
            </div>
          </div>
          <Input placeholder="Nombre empresa *" value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} />
          <Input placeholder="NIF" value={form.nif} onChange={e => setForm({...form, nif: e.target.value})} />
          <Input placeholder="Dirección" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="Ciudad" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
            <Input placeholder="Provincia" value={form.province} onChange={e => setForm({...form, province: e.target.value})} />
            <Input placeholder="C.P." value={form.postal_code} onChange={e => setForm({...form, postal_code: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Teléfono" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            <Input placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          </div>
          <Input placeholder="Sitio web" value={form.website} onChange={e => setForm({...form, website: e.target.value})} />
          <Input placeholder="IBAN" value={form.iban} onChange={e => setForm({...form, iban: e.target.value})} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Printer className="w-5 h-5" />Configuración impresora</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs text-gray-500">Margen superior (mm)</label><Input type="number" value={form.printer_config.margin_top} onChange={e => updatePrinter('margin_top', parseInt(e.target.value))} /></div>
            <div><label className="text-xs text-gray-500">Margen inferior (mm)</label><Input type="number" value={form.printer_config.margin_bottom} onChange={e => updatePrinter('margin_bottom', parseInt(e.target.value))} /></div>
            <div><label className="text-xs text-gray-500">Margen izquierdo (mm)</label><Input type="number" value={form.printer_config.margin_left} onChange={e => updatePrinter('margin_left', parseInt(e.target.value))} /></div>
            <div><label className="text-xs text-gray-500">Margen derecho (mm)</label><Input type="number" value={form.printer_config.margin_right} onChange={e => updatePrinter('margin_right', parseInt(e.target.value))} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Observaciones por defecto</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea placeholder="Condiciones de pago" value={form.payment_terms} onChange={e => setForm({...form, payment_terms: e.target.value})} rows={4} />
          <Textarea placeholder="Observaciones clima" value={form.observations_climate} onChange={e => setForm({...form, observations_climate: e.target.value})} rows={2} />
          <Textarea placeholder="Observaciones electricidad" value={form.observations_electric} onChange={e => setForm({...form, observations_electric: e.target.value})} rows={2} />
          <Textarea placeholder="Observaciones refrigeración" value={form.observations_refrigeration} onChange={e => setForm({...form, observations_refrigeration: e.target.value})} rows={2} />
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg">
        {saving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
        Guardar datos
      </Button>
    </div>
  );
}