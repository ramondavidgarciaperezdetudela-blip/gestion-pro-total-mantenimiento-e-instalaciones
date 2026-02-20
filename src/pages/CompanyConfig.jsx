import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Save, Upload, Printer, Mail, Eye, EyeOff, UserCog, Plus, Trash2 } from 'lucide-react';

function TechnicianManager({ technicians, onChange }) {
  const [newName, setNewName] = useState('');
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="Nombre del técnico"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) { onChange([...technicians, newName.trim()]); setNewName(''); }}}
        />
        <Button variant="outline" onClick={() => { if (newName.trim()) { onChange([...technicians, newName.trim()]); setNewName(''); }}}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {technicians.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No hay técnicos. Añade el primero.</p>}
      <div className="space-y-1">
        {technicians.map((t, i) => (
          <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
            <span className="text-sm font-medium">👷 {t}</span>
            <button onClick={() => onChange(technicians.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CompanyConfig() {
  const [form, setForm] = useState({
    company_name: '', nif: '', address: '', city: '', province: '', postal_code: '',
    phone: '', email: '', website: '', logo_url: '', iban: '',
    printer_config: { margin_top: 15, margin_bottom: 15, margin_left: 15, margin_right: 15, paper_size: 'A4' },
    email_config: { smtp_host: '', smtp_port: 587, smtp_user: '', smtp_pass: '', from_name: '', use_ssl: true },
    technicians: [],
    payment_terms: 'Forma de pago: Máximo 3 pagos.\n1º Pago: 100% material + 50% mano de obra (al aceptar presupuesto)\n2º Pago: 25% mano de obra (al iniciar trabajos)\n3º Pago: 25% mano de obra restante (al finalizar)',
    observations_climate: 'Instalación realizada según normativa RITE (RD 1027/2007) y Reglamento F-Gas (RD 115/2017). Gases fluorados según normativa UE 517/2014.',
    observations_electric: 'Instalación realizada según REBT (RD 842/2002) y normas UNE de aplicación.',
    observations_refrigeration: 'Instalación realizada según Reglamento de Seguridad para Instalaciones Frigoríficas, F-Gas RD 115/2017 y normativa de comprobación de fugas.',
  });
  const [recordId, setRecordId] = useState(null);
  const [saved, setSaved] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const fileRef = useRef(null);
  const [showPass, setShowPass] = useState(false);
  const [emailDetecting, setEmailDetecting] = useState(false);

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
          email_config: d.email_config || { smtp_host: '', smtp_port: 587, smtp_user: '', smtp_pass: '', from_name: '', use_ssl: true },
          technicians: d.technicians || [],
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
        <TabsList className="w-full flex-wrap h-auto gap-1">
          <TabsTrigger value="empresa" className="flex-1 text-xs">Datos empresa</TabsTrigger>
          <TabsTrigger value="tecnicos" className="flex-1 text-xs">Técnicos</TabsTrigger>
          <TabsTrigger value="correo" className="flex-1 text-xs">Correo</TabsTrigger>
          <TabsTrigger value="impresora" className="flex-1 text-xs">Impresora</TabsTrigger>
          <TabsTrigger value="documentos" className="flex-1 text-xs">Documentos</TabsTrigger>
          <TabsTrigger value="escaner" className="flex-1 text-xs">Escáner</TabsTrigger>
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

        <TabsContent value="tecnicos">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><UserCog className="w-5 h-5" />Gestión de Técnicos</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                <p className="font-medium mb-1">👷 Técnicos del equipo</p>
                <p className="text-xs">Añade los nombres de tus técnicos para seleccionarlos fácilmente en órdenes SAT, fichas de mantenimiento, facturas, etc.</p>
              </div>
              <TechnicianManager
                technicians={form.technicians || []}
                onChange={list => setForm({...form, technicians: list})}
              />
              <Button onClick={handleSave} className={`w-full ${saved ? 'bg-green-600' : 'bg-blue-600'}`}>
                <Save className="w-4 h-4 mr-2" /> {saved ? '¡Guardado!' : 'Guardar técnicos'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="correo">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="w-5 h-5" />Configuración de correo electrónico</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                <p className="font-medium mb-1">📧 Autoconfiguración</p>
                <p className="text-xs">Introduce tu dirección de correo y detectaremos automáticamente la configuración SMTP de tu proveedor (Gmail, Outlook, Hotmail, Yahoo, etc.)</p>
              </div>

              <div>
                <label className="text-sm font-medium">Correo electrónico de envío</label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="tu@empresa.com"
                    value={form.email_config?.smtp_user || ''}
                    onChange={e => setForm({...form, email_config: {...form.email_config, smtp_user: e.target.value}})}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={emailDetecting}
                    onClick={async () => {
                      const email = form.email_config?.smtp_user || '';
                      if (!email) return;
                      setEmailDetecting(true);
                      const domain = email.split('@')[1]?.toLowerCase() || '';
                      const configs = {
                        'gmail.com': { smtp_host: 'smtp.gmail.com', smtp_port: 587, use_ssl: true },
                        'googlemail.com': { smtp_host: 'smtp.gmail.com', smtp_port: 587, use_ssl: true },
                        'outlook.com': { smtp_host: 'smtp.office365.com', smtp_port: 587, use_ssl: true },
                        'hotmail.com': { smtp_host: 'smtp.office365.com', smtp_port: 587, use_ssl: true },
                        'live.com': { smtp_host: 'smtp.office365.com', smtp_port: 587, use_ssl: true },
                        'yahoo.com': { smtp_host: 'smtp.mail.yahoo.com', smtp_port: 587, use_ssl: true },
                        'yahoo.es': { smtp_host: 'smtp.mail.yahoo.com', smtp_port: 587, use_ssl: true },
                        'icloud.com': { smtp_host: 'smtp.mail.me.com', smtp_port: 587, use_ssl: true },
                      };
                      const detected = configs[domain];
                      if (detected) {
                        setForm(prev => ({...prev, email_config: {...prev.email_config, ...detected}}));
                      }
                      setEmailDetecting(false);
                    }}
                  >
                    {emailDetecting ? '...' : 'Autodetectar'}
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Nombre del remitente</label>
                <Input className="mt-1" placeholder="Mi Empresa S.L." value={form.email_config?.from_name || ''} onChange={e => setForm({...form, email_config: {...form.email_config, from_name: e.target.value}})} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Servidor SMTP</label>
                  <Input className="mt-1" placeholder="smtp.gmail.com" value={form.email_config?.smtp_host || ''} onChange={e => setForm({...form, email_config: {...form.email_config, smtp_host: e.target.value}})} />
                </div>
                <div>
                  <label className="text-sm font-medium">Puerto</label>
                  <Input className="mt-1" type="number" placeholder="587" value={form.email_config?.smtp_port || 587} onChange={e => setForm({...form, email_config: {...form.email_config, smtp_port: parseInt(e.target.value)}})} />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Contraseña de aplicación</label>
                <div className="relative mt-1">
                  <Input
                    type={showPass ? 'text' : 'password'}
                    placeholder="Contraseña o clave de aplicación"
                    value={form.email_config?.smtp_pass || ''}
                    onChange={e => setForm({...form, email_config: {...form.email_config, smtp_pass: e.target.value}})}
                  />
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" onClick={() => setShowPass(!showPass)}>
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Para Gmail usa una "Contraseña de aplicación" desde la configuración de seguridad de Google.</p>
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.email_config?.use_ssl !== false} onChange={e => setForm({...form, email_config: {...form.email_config, use_ssl: e.target.checked}})} />
                Usar SSL/TLS
              </label>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                <p className="font-medium">ℹ️ Nota</p>
                <p>El envío directo de emails necesita backend activado. Mientras tanto, el botón de correo abrirá tu cliente de email habitual (mailto:) con los datos precargados.</p>
              </div>

              <Button onClick={handleSave} className={`w-full ${saved ? 'bg-green-600' : 'bg-blue-600'}`}>
                <Save className="w-4 h-4 mr-2" /> {saved ? '¡Guardado!' : 'Guardar configuración'}
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
        <TabsContent value="escaner">
          <Card>
            <CardHeader><CardTitle>Configuración del escáner</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                <p className="font-medium mb-1">📄 Escaneo de documentos</p>
                <p className="text-xs">Configura los parámetros para escanear documentos. Los documentos escaneados se pueden subir directamente desde la ficha del cliente.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Resolución (DPI)</label>
                  <Select defaultValue="300">
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="150">150 DPI (rápido)</SelectItem>
                      <SelectItem value="200">200 DPI</SelectItem>
                      <SelectItem value="300">300 DPI (recomendado)</SelectItem>
                      <SelectItem value="600">600 DPI (alta calidad)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Formato de salida</label>
                  <Select defaultValue="pdf">
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="jpg">JPG</SelectItem>
                      <SelectItem value="png">PNG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Color</label>
                  <Select defaultValue="color">
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="color">Color</SelectItem>
                      <SelectItem value="gris">Escala de grises</SelectItem>
                      <SelectItem value="bw">Blanco y negro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Tamaño de página</label>
                  <Select defaultValue="A4">
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A4">A4</SelectItem>
                      <SelectItem value="A5">A5</SelectItem>
                      <SelectItem value="Carta">Carta</SelectItem>
                      <SelectItem value="Legal">Legal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                <p>ℹ️ Para escanear documentos ve a la ficha del cliente y usa el botón "Subir documento escaneado".</p>
              </div>
              <Button onClick={handleSave} className={`w-full ${saved ? 'bg-green-600' : 'bg-blue-600'}`}>
                <Save className="w-4 h-4 mr-2" /> {saved ? '¡Guardado!' : 'Guardar configuración escáner'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}