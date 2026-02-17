import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Save, Upload, Printer } from 'lucide-react';

export default function CompanyConfig() {
  const [form, setForm] = useState({
    company_name: '', nif: '', address: '', city: '', province: '', postal_code: '',
    phone: '', email: '', website: '', logo_url: '', iban: '',
    printer_config: { margin_top: 15, margin_bottom: 15, margin_left: 15, margin_right: 15, paper_size: 'A4' },
    payment_terms: 'Forma de pago: Máximo 3 pagos.\n1º Pago: 100% material + 50% mano de obra (al aceptar presupuesto)\n2º Pago: 25% mano de obra (al iniciar trabajos)\n3º Pago: 25% mano de obra restante (al finalizar)',
    observations_climate: 'Instalación realizada según normativa RITE (RD 1027/2007) y Reglamento F-Gas (RD 115/2017). Gases fluorados según normativa UE 517/2014.',
    observations_electric: 'Instalación realizada según REBT (RD 842/2002) y normas UNE de aplicación.',
    observations_refrigeration: 'Instalación realizada según Reglamento de Seguridad para Instalaciones Frigoríficas, F-Gas RD 115/2017 y normativa de comprobación de fugas.',
  });
  const [recordId, setRecordId] = useState(null);
  const [saved, setSaved] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    base44.entities.CompanySettings.list().then(data => {
      if (data.length > 0) {
        const d = data[0];
        setRecordId(d.id);
        setForm({
          company_name: d.company_name || '',
          nif: d.nif || '',
          address: d.address || '',
          city: d.city || '',
          province: d.province || '',
          postal_code: d.postal_code || '',
          phone: d.phone || '',
          email: d.email || '',
          website: d.website || '',
          logo_url: d.logo_url || '',
          iban: d.iban || '',
          printer_config: d.printer_config || { margin_top: 15, margin_bottom: 15, margin_left: 15, margin_right: 15, paper_size: 'A4' },
          payment_terms: d.payment_terms || form.payment_terms,
          observations_climate: d.observations_climate || form.observations_climate,
          observations_electric: d.observations_electric || form.observations_electric,
          observations_refrigeration: d.observations_refrigeration || form.observations_refrigeration,
        });
      }
    });
  }, []);

  const handleSave = async () => {
    if (recordId) {
      await base44.entities.CompanySettings.update(recordId, form);
    } else {
      const created = await base44.entities.CompanySettings.create(form);
      setRecordId(created.id);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm({ ...form, logo_url: file_url });
    setLogoUploading(false);
  };

  const updatePrinter = (field, value) => {
    setForm({ ...form, printer_config: { ...form.printer_config, [field]: value } });
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Configuración de Empresa</h1>
        <Button onClick={handleSave} className={`${saved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
          <Save className="w-4 h-4 mr-2" />
          {saved ? '¡Guardado!' : 'Guardar datos'}
        </Button>
      </div>

      <Tabs defaultValue="empresa">
        <TabsList className="w-full">
          <TabsTrigger value="empresa" className="flex-1">Datos empresa</TabsTrigger>
          <TabsTrigger value="impresora" className="flex-1">Impresora</TabsTrigger>
          <TabsTrigger value="documentos" className="flex-1">Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="empresa">
          <Card>
            <CardContent className="p-5 space-y-4">
              {/* Logo */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 border-2 border-dashed rounded-xl flex items-center justify-center bg-gray-50 overflow-hidden">
                  {form.logo_url ? (
                    <img src={form.logo_url} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <Building2 className="w-8 h-8 text-gray-300" />
                  )}
                </div>
                <div>
                  <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={logoUploading}>
                    <Upload className="w-4 h-4 mr-2" />
                    {logoUploading ? 'Subiendo...' : 'Subir logo'}
                  </Button>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG. Recomendado 200x100px</p>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Nombre de la empresa *</label>
                  <Input value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} placeholder="Mi Empresa S.L." className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">NIF / CIF</label>
                  <Input value={form.nif} onChange={e => setForm({...form, nif: e.target.value})} placeholder="B12345678" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Teléfono</label>
                  <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="600 000 000" className="mt-1" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Dirección</label>
                  <Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Calle, número, piso" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Ciudad</label>
                  <Input value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="Madrid" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Provincia</label>
                  <Input value={form.province} onChange={e => setForm({...form, province: e.target.value})} placeholder="Madrid" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Código Postal</label>
                  <Input value={form.postal_code} onChange={e => setForm({...form, postal_code: e.target.value})} placeholder="28001" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="empresa@email.com" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Web</label>
                  <Input value={form.website} onChange={e => setForm({...form, website: e.target.value})} placeholder="www.miempresa.com" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">IBAN</label>
                  <Input value={form.iban} onChange={e => setForm({...form, iban: e.target.value})} placeholder="ES00 0000 0000 0000 0000 0000" className="mt-1" />
                </div>
              </div>
              <Button onClick={handleSave} className={`w-full ${saved ? 'bg-green-600' : 'bg-blue-600'}`}>
                <Save className="w-4 h-4 mr-2" /> {saved ? '¡Guardado!' : 'Guardar datos de empresa'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="impresora">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Printer className="w-5 h-5" />Configuración de impresora</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Tamaño de papel</label>
                <Select value={form.printer_config?.paper_size || 'A4'} onValueChange={v => updatePrinter('paper_size', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A4">A4</SelectItem>
                    <SelectItem value="A5">A5</SelectItem>
                    <SelectItem value="Carta">Carta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Margen superior (mm)</label>
                  <Input type="number" value={form.printer_config?.margin_top || 15} onChange={e => updatePrinter('margin_top', parseInt(e.target.value))} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Margen inferior (mm)</label>
                  <Input type="number" value={form.printer_config?.margin_bottom || 15} onChange={e => updatePrinter('margin_bottom', parseInt(e.target.value))} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Margen izquierdo (mm)</label>
                  <Input type="number" value={form.printer_config?.margin_left || 15} onChange={e => updatePrinter('margin_left', parseInt(e.target.value))} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Margen derecho (mm)</label>
                  <Input type="number" value={form.printer_config?.margin_right || 15} onChange={e => updatePrinter('margin_right', parseInt(e.target.value))} className="mt-1" />
                </div>
              </div>
              <Button onClick={handleSave} className={`w-full ${saved ? 'bg-green-600' : 'bg-blue-600'}`}>
                <Save className="w-4 h-4 mr-2" /> {saved ? '¡Guardado!' : 'Guardar configuración'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentos">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium">Condiciones de pago por defecto</label>
                <Textarea value={form.payment_terms} onChange={e => setForm({...form, payment_terms: e.target.value})} rows={5} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Observaciones trabajos de Clima (presupuestos/facturas)</label>
                <Textarea value={form.observations_climate} onChange={e => setForm({...form, observations_climate: e.target.value})} rows={3} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Observaciones trabajos Eléctricos</label>
                <Textarea value={form.observations_electric} onChange={e => setForm({...form, observations_electric: e.target.value})} rows={3} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Observaciones Refrigeración Industrial</label>
                <Textarea value={form.observations_refrigeration} onChange={e => setForm({...form, observations_refrigeration: e.target.value})} rows={3} className="mt-1" />
              </div>
              <Button onClick={handleSave} className={`w-full ${saved ? 'bg-green-600' : 'bg-blue-600'}`}>
                <Save className="w-4 h-4 mr-2" /> {saved ? '¡Guardado!' : 'Guardar'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}