import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Save, Upload, Printer, Mail, Eye, EyeOff, UserCog, Plus, Trash2, LogOut, Globe, Wifi, Users, Shield, Brain, Copy, Check, RefreshCw, Layout, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function TechnicianManager({ technicians, onChange }) {
  const [newTech, setNewTech] = useState({ name: '', fgas_carnet: '', rite_certificate: '' });
  const [editing, setEditing] = useState(null);

  const addTechnician = () => {
    if (!newTech.name.trim()) return;
    const tech = {
      id: Date.now().toString(),
      name: newTech.name.trim(),
      fgas_carnet: newTech.fgas_carnet || '',
      rite_certificate: newTech.rite_certificate || ''
    };
    onChange([...technicians, tech]);
    setNewTech({ name: '', fgas_carnet: '', rite_certificate: '' });
  };

  const updateTechnician = (id, updated) => {
    onChange(technicians.map(t => t.id === id ? updated : t));
  };

  const removeTechnician = (id) => {
    onChange(technicians.filter(t => t.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
        <p className="font-medium mb-1">👷 Técnicos con credenciales</p>
        <p>Añade técnicos con su carnet F-Gas (gases fluorados) y certificado RITE (climatización). Se rellenarán automáticamente en los documentos de legalización.</p>
      </div>

      <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
        <p className="text-sm font-medium">Nuevo técnico</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input placeholder="Nombre completo" value={newTech.name} onChange={e => setNewTech({...newTech, name: e.target.value})} />
          <Input placeholder="Nº carnet F-Gas (gases fluorados)" value={newTech.fgas_carnet} onChange={e => setNewTech({...newTech, fgas_carnet: e.target.value})} />
          <Input placeholder="Nº certificado RITE (climatización)" value={newTech.rite_certificate} onChange={e => setNewTech({...newTech, rite_certificate: e.target.value})} />
        </div>
        <Button onClick={addTechnician} className="w-full gap-2">
          <Plus className="w-4 h-4" /> Añadir técnico
        </Button>
      </div>

      {technicians.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No hay técnicos. Añade el primero.</p>}
      
      <div className="space-y-2">
        {technicians.map((tech) => (
          <div key={tech.id} className="bg-white rounded-lg border p-3">
            {editing === tech.id ? (
              <div className="space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Input value={tech.name} onChange={e => updateTechnician(tech.id, {...tech, name: e.target.value})} />
                  <Input placeholder="Nº carnet F-Gas" value={tech.fgas_carnet || ''} onChange={e => updateTechnician(tech.id, {...tech, fgas_carnet: e.target.value})} />
                  <Input placeholder="Nº certificado RITE" value={tech.rite_certificate || ''} onChange={e => updateTechnician(tech.id, {...tech, rite_certificate: e.target.value})} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setEditing(null)} className="flex-1">Guardar</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div className="text-sm flex-1">
                  <p className="font-medium">{tech.name}</p>
                  {tech.fgas_carnet && <p className="text-xs text-gray-600">🧊 F-Gas: {tech.fgas_carnet}</p>}
                  {tech.rite_certificate && <p className="text-xs text-gray-600">❄️ RITE: {tech.rite_certificate}</p>}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => setEditing(tech.id)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">✏️</button>
                  <button onClick={() => removeTechnician(tech.id)} className="p-1 text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
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
    printer_config: {
      margin_top: 15, margin_bottom: 15, margin_left: 15, margin_right: 15,
      paper_size: 'A4', font_family: 'Segoe UI', font_size: 'normal',
      header_text: '', footer_text: '',
      logo_width_mm: 35, logo_height_mm: 20,
      fit_to_page: true, avoid_table_breaks: true,
    },
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
          printer_config: d.printer_config ? {
            margin_top: 15, margin_bottom: 15, margin_left: 15, margin_right: 15, paper_size: 'A4',
            font_family: 'Segoe UI', font_size: 'normal', header_text: '', footer_text: '',
            logo_width_mm: 35, logo_height_mm: 20, fit_to_page: true, avoid_table_breaks: true,
            ...d.printer_config
          } : { margin_top: 15, margin_bottom: 15, margin_left: 15, margin_right: 15, paper_size: 'A4', font_family: 'Segoe UI', font_size: 'normal', header_text: '', footer_text: '', logo_width_mm: 35, logo_height_mm: 20, fit_to_page: true, avoid_table_breaks: true },
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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Configuración de Empresa</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => base44.auth.logout()} className="gap-1 border-red-300 text-red-600 hover:bg-red-50">
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </Button>
          <Button onClick={handleSave} className={`${saved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
            <Save className="w-4 h-4 mr-2" />
            {saved ? '¡Guardado!' : 'Guardar datos'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="empresa">
        <TabsList className="w-full flex-wrap h-auto gap-1">
          <TabsTrigger value="empresa" className="flex-1 text-xs">Datos empresa</TabsTrigger>
          <TabsTrigger value="tecnicos" className="flex-1 text-xs">Técnicos</TabsTrigger>
          <TabsTrigger value="correo" className="flex-1 text-xs">Correo</TabsTrigger>
          <TabsTrigger value="impresion" className="flex-1 text-xs">Impresión</TabsTrigger>
          <TabsTrigger value="documentos" className="flex-1 text-xs">Documentos</TabsTrigger>
          <TabsTrigger value="escaner" className="flex-1 text-xs">Escáner</TabsTrigger>
          <TabsTrigger value="usuarios" className="flex-1 text-xs">Usuarios</TabsTrigger>
          <TabsTrigger value="red" className="flex-1 text-xs">Red / Acceso</TabsTrigger>
          <TabsTrigger value="ia" className="flex-1 text-xs">IA Cálculos</TabsTrigger>
          <TabsTrigger value="cuenta" className="flex-1 text-xs text-red-600">Cuenta</TabsTrigger>
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
                  <PostalCodeSearch
                    type="city"
                    onSelect={(result) => setForm({...form, postal_code: result.postal_code, city: result.city, province: result.province})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Provincia</label>
                  <PostalCodeSearch
                    type="province"
                    onSelect={(result) => setForm({...form, postal_code: result.postal_code, city: result.city, province: result.province})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Código Postal</label>
                  <PostalCodeSearch
                    type="postal_code"
                    onSelect={(result) => setForm({...form, postal_code: result.postal_code, city: result.city, province: result.province})}
                  />
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
              {form.email && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 flex items-center gap-2">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span>Dirección de empresa guardada: <strong>{form.email}</strong></span>
                </div>
              )}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                <p className="font-medium mb-1">📧 Autoconfiguración</p>
                <p className="text-xs">Introduce tu dirección de correo y detectaremos automáticamente la configuración SMTP de tu proveedor (Gmail, Outlook, Hotmail, Yahoo, etc.)</p>
              </div>

              <div>
                <label className="text-sm font-medium">Correo electrónico de envío</label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder={form.email || 'tu@empresa.com'}
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

        <TabsContent value="impresion">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Printer className="w-5 h-5" />Configuración de Impresión y Documentos</CardTitle></CardHeader>
            <CardContent className="space-y-6">

              {/* Papel y márgenes */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700 border-b pb-1">📄 Papel y márgenes</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-sm font-medium">Tamaño de papel</label>
                    <Select value={form.printer_config?.paper_size || 'A4'} onValueChange={v => updatePrinter('paper_size', v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A4">A4 (210×297mm)</SelectItem>
                        <SelectItem value="A5">A5 (148×210mm)</SelectItem>
                        <SelectItem value="Carta">Carta (216×279mm)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Margen superior (mm)</label>
                    <Input type="number" min="5" max="50" value={form.printer_config?.margin_top || 15} onChange={e => updatePrinter('margin_top', parseInt(e.target.value))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Margen inferior (mm)</label>
                    <Input type="number" min="5" max="50" value={form.printer_config?.margin_bottom || 15} onChange={e => updatePrinter('margin_bottom', parseInt(e.target.value))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Margen izquierdo (mm)</label>
                    <Input type="number" min="5" max="50" value={form.printer_config?.margin_left || 15} onChange={e => updatePrinter('margin_left', parseInt(e.target.value))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Margen derecho (mm)</label>
                    <Input type="number" min="5" max="50" value={form.printer_config?.margin_right || 15} onChange={e => updatePrinter('margin_right', parseInt(e.target.value))} className="mt-1" />
                  </div>
                </div>
              </div>

              {/* Tipografía */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700 border-b pb-1">🔤 Tipografía</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Tipo de letra</label>
                    <Select value={form.printer_config?.font_family || 'Segoe UI'} onValueChange={v => updatePrinter('font_family', v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Segoe UI">Segoe UI (moderna)</SelectItem>
                        <SelectItem value="Arial">Arial (clásica)</SelectItem>
                        <SelectItem value="Calibri">Calibri (Office)</SelectItem>
                        <SelectItem value="Times New Roman">Times New Roman (formal)</SelectItem>
                        <SelectItem value="Georgia">Georgia (elegante)</SelectItem>
                        <SelectItem value="Courier New">Courier New (técnica)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Tamaño de letra</label>
                    <Select value={form.printer_config?.font_size || 'normal'} onValueChange={v => updatePrinter('font_size', v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Pequeño (8px) — más contenido</SelectItem>
                        <SelectItem value="normal">Normal (9.5px) — recomendado</SelectItem>
                        <SelectItem value="large">Grande (11px) — más legible</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-sm border">
                  <span className="text-xs text-gray-500">Vista previa: </span>
                  <span style={{ fontFamily: form.printer_config?.font_family || 'Segoe UI', fontSize: form.printer_config?.font_size === 'small' ? '8px' : form.printer_config?.font_size === 'large' ? '13px' : '10px' }}>
                    Texto de ejemplo — Instalación solar fotovoltaica 5kWp
                  </span>
                </div>
              </div>

              {/* Logo */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700 border-b pb-1">🖼️ Logo en documentos</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Ancho logo (mm)</label>
                    <Input type="number" min="10" max="80" value={form.printer_config?.logo_width_mm || 35} onChange={e => updatePrinter('logo_width_mm', parseInt(e.target.value))} className="mt-1" />
                    <p className="text-[10px] text-gray-400 mt-1">Máx. recomendado: 35mm</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Alto logo (mm)</label>
                    <Input type="number" min="5" max="40" value={form.printer_config?.logo_height_mm || 20} onChange={e => updatePrinter('logo_height_mm', parseInt(e.target.value))} className="mt-1" />
                    <p className="text-[10px] text-gray-400 mt-1">Máx. recomendado: 20mm</p>
                  </div>
                </div>
                {form.logo_url && (
                  <div className="border rounded-lg p-3 bg-gray-50 flex items-center gap-3">
                    <img src={form.logo_url} alt="Logo" style={{ maxWidth: `${(form.printer_config?.logo_width_mm || 35) * 3.78}px`, maxHeight: `${(form.printer_config?.logo_height_mm || 20) * 3.78}px`, objectFit: 'contain' }} />
                    <span className="text-xs text-gray-500">Vista previa del tamaño en pantalla ({form.printer_config?.logo_width_mm || 35}mm × {form.printer_config?.logo_height_mm || 20}mm)</span>
                  </div>
                )}
              </div>

              {/* Encabezado y pie */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700 border-b pb-1">📋 Encabezado y pie de página</p>
                <div>
                  <label className="text-sm font-medium">Texto encabezado personalizado (opcional)</label>
                  <Input value={form.printer_config?.header_text || ''} onChange={e => updatePrinter('header_text', e.target.value)} placeholder="Ej: Empresa certificada ISO 9001 | Nº registro industrial: XXXXX" className="mt-1" />
                  <p className="text-[10px] text-gray-400 mt-1">Se muestra bajo los datos de empresa en todos los documentos</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Texto pie de página personalizado (opcional)</label>
                  <Input value={form.printer_config?.footer_text || ''} onChange={e => updatePrinter('footer_text', e.target.value)} placeholder="Ej: Documento generado por Mi Empresa S.L. — Confidencial" className="mt-1" />
                  <p className="text-[10px] text-gray-400 mt-1">Se muestra al final de todos los documentos impresos</p>
                </div>
              </div>

              {/* Ajuste de página */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700 border-b pb-1">📐 Ajuste e impresión de tablas</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <input type="checkbox" checked={form.printer_config?.fit_to_page !== false} onChange={e => updatePrinter('fit_to_page', e.target.checked)} className="w-4 h-4 accent-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">Ajustar contenido a la hoja</p>
                      <p className="text-xs text-blue-600">Reduce el tamaño del contenido automáticamente para que quepa en la hoja</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-green-50 border border-green-200 rounded-lg">
                    <input type="checkbox" checked={form.printer_config?.avoid_table_breaks !== false} onChange={e => updatePrinter('avoid_table_breaks', e.target.checked)} className="w-4 h-4 accent-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-800">Evitar corte de tablas entre páginas</p>
                      <p className="text-xs text-green-600">Las tablas que no quepan en la página actual se mueven automáticamente a la siguiente hoja, evitando que se corten filas</p>
                    </div>
                  </label>
                </div>
              </div>

              <Button onClick={handleSave} className={`w-full ${saved ? 'bg-green-600' : 'bg-blue-600'}`}>
                <Save className="w-4 h-4 mr-2" /> {saved ? '¡Guardado!' : 'Guardar configuración de impresión'}
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
                <p className="text-xs">Los documentos escaneados se pueden subir directamente desde la ficha del cliente.</p>
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
              </div>
              <Button onClick={handleSave} className={`w-full ${saved ? 'bg-green-600' : 'bg-blue-600'}`}>
                <Save className="w-4 h-4 mr-2" /> {saved ? '¡Guardado!' : 'Guardar configuración escáner'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── USUARIOS ───────────────────────────────────────────────────── */}
        <TabsContent value="usuarios">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" />Gestión de Usuarios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <UserManager />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── RED / ACCESO REMOTO ────────────────────────────────────────── */}
        <TabsContent value="red">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5 text-blue-600" />Acceso en Red y Remoto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <NetworkAccessInfo />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── ELIMINAR CUENTA ────────────────────────────────────────────── */}
        <TabsContent value="cuenta">
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700"><AlertTriangle className="w-5 h-5" />Zona de peligro</CardTitle>
            </CardHeader>
            <CardContent>
              <DeleteAccountSection />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── IA CÁLCULOS ────────────────────────────────────────────────── */}
        <TabsContent value="ia">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Brain className="w-5 h-5 text-purple-600" />IA para Cálculos Técnicos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AICalcConfig />
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}

// ─── COMPONENTE: GESTIÓN DE USUARIOS ──────────────────────────────────────────
function UserManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');

  useEffect(() => {
    base44.entities.User.list().then(u => { setUsers(u); setLoading(false); });
  }, []);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteMsg('');
    try {
      await base44.users.inviteUser(inviteEmail.trim(), inviteRole);
      setInviteMsg(`✅ Invitación enviada a ${inviteEmail}`);
      setInviteEmail('');
      const u = await base44.entities.User.list();
      setUsers(u);
    } catch (e) {
      setInviteMsg('❌ Error al enviar la invitación.');
    }
    setInviting(false);
  };

  const roleLabel = { admin: '🔑 Admin', user: '👤 Usuario' };
  const roleColor = { admin: 'bg-red-100 text-red-700', user: 'bg-blue-100 text-blue-700' };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
        <p className="font-medium mb-1">👥 Usuarios del sistema</p>
        <p>Los usuarios con rol <strong>Admin</strong> tienen acceso completo. Los usuarios normales tienen acceso estándar.
        Cada usuario accede con su propio correo y contraseña desde cualquier dispositivo.</p>
      </div>

      {/* Invitar usuario */}
      <div className="bg-white border rounded-lg p-4 space-y-3">
        <p className="text-sm font-semibold flex items-center gap-2"><Shield className="w-4 h-4" /> Invitar nuevo usuario</p>
        <div className="flex gap-2 flex-wrap">
          <Input placeholder="email@usuario.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
            className="flex-1 min-w-[200px]" onKeyDown={e => e.key === 'Enter' && handleInvite()} />
          <Select value={inviteRole} onValueChange={setInviteRole}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="user">Usuario</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleInvite} disabled={inviting} className="gap-1">
            {inviting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Invitar
          </Button>
        </div>
        {inviteMsg && <p className="text-xs">{inviteMsg}</p>}
      </div>

      {/* Lista de usuarios */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-700">Usuarios registrados ({users.length})</p>
        {loading && <p className="text-xs text-gray-400">Cargando...</p>}
        {users.map(u => (
          <div key={u.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
            <div>
              <p className="text-sm font-medium">{u.full_name || u.email}</p>
              <p className="text-xs text-gray-500">{u.email}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColor[u.role] || 'bg-gray-100 text-gray-600'}`}>
              {roleLabel[u.role] || u.role}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── COMPONENTE: ACCESO EN RED ─────────────────────────────────────────────────
function NetworkAccessInfo() {
  const [copied, setCopied] = useState('');
  const appUrl = window.location.origin + window.location.pathname.split('/').slice(0, -1).join('/');
  const currentUrl = window.location.href.split('?')[0].split('#')[0];

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const CopyBtn = ({ text, id }) => (
    <button onClick={() => copy(text, id)}
      className="ml-2 p-1 rounded hover:bg-gray-200 transition-colors flex-shrink-0">
      {copied === id ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-sm font-bold text-green-800 flex items-center gap-2 mb-2">
          <Globe className="w-4 h-4" /> Esta aplicación ya funciona en la nube
        </p>
        <p className="text-xs text-green-700">
          El programa ya está alojado en servidores seguros en internet. No necesitas instalar nada.
          Cualquier usuario con la URL y sus credenciales puede acceder desde cualquier lugar del mundo,
          tanto desde la red local (LAN) como desde internet (WiFi, 4G, 5G, cable).
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold flex items-center gap-2"><Wifi className="w-4 h-4" /> URL de acceso</p>
        <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-2">
          <span className="text-xs font-mono text-gray-800 break-all flex-1">{currentUrl}</span>
          <CopyBtn text={currentUrl} id="url" />
        </div>
        <p className="text-xs text-gray-500">Comparte esta URL con tus usuarios. Cada uno se conecta con su propio usuario y contraseña.</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div className="border rounded-lg p-3 bg-white">
          <p className="text-sm font-semibold flex items-center gap-2 mb-2">🏠 Acceso desde la red local (LAN)</p>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>✅ Abre el navegador en cualquier ordenador de la oficina</li>
            <li>✅ Escribe la URL del programa en la barra de direcciones</li>
            <li>✅ Inicia sesión con tu usuario y contraseña</li>
            <li>✅ No se necesita VPN ni configuración especial</li>
          </ul>
        </div>
        <div className="border rounded-lg p-3 bg-white">
          <p className="text-sm font-semibold flex items-center gap-2 mb-2">🌍 Acceso desde fuera (internet / móvil)</p>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>✅ Funciona desde cualquier dispositivo con internet</li>
            <li>✅ Móvil, tablet, portátil, PC de casa</li>
            <li>✅ WiFi, 4G, 5G, cable de red</li>
            <li>✅ Acceso seguro con HTTPS (cifrado)</li>
          </ul>
        </div>
        <div className="border rounded-lg p-3 bg-white">
          <p className="text-sm font-semibold flex items-center gap-2 mb-2">📱 Instalar como app en el móvil</p>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>1. Abre la URL en Chrome (Android) o Safari (iPhone)</li>
            <li>2. Pulsa el menú del navegador (⋮ o compartir)</li>
            <li>3. Selecciona "Añadir a pantalla de inicio"</li>
            <li>4. Ya tienes el icono como una app nativa</li>
          </ul>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
        <p className="font-medium mb-1">💡 Para añadir usuarios nuevos</p>
        <p>Ve a la pestaña <strong>Usuarios</strong> e invita al nuevo usuario por email. Recibirá un correo con las instrucciones de acceso.</p>
      </div>
    </div>
  );
}

// ─── COMPONENTE: ELIMINAR CUENTA ──────────────────────────────────────────────
function DeleteAccountSection() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== 'ELIMINAR') return;
    setDeleting(true);
    try {
      const me = await base44.auth.me();
      if (me?.id) {
        await base44.entities.User.delete(me.id);
      }
      base44.auth.logout('/');
    } catch (e) {
      alert('Error al eliminar la cuenta. Contacta con soporte.');
    }
    setDeleting(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
        <p className="font-bold mb-1">⚠️ Advertencia</p>
        <p>Eliminar tu cuenta borrará permanentemente tu perfil de usuario. Esta acción no se puede deshacer. Los datos de la empresa (clientes, facturas, etc.) permanecerán en la base de datos.</p>
      </div>
      <Button
        variant="outline"
        className="border-red-300 text-red-600 hover:bg-red-50 gap-2"
        onClick={() => setConfirmOpen(true)}
      >
        <Trash2 className="w-4 h-4" /> Eliminar mi cuenta
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Confirmar eliminación
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Esta acción eliminará permanentemente tu cuenta de usuario. Para confirmar, escribe <strong>ELIMINAR</strong> en el campo de abajo.</p>
            <input
              className="w-full border border-red-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-400"
              placeholder="Escribe ELIMINAR para confirmar"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setConfirmOpen(false); setConfirmText(''); }}>
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                disabled={confirmText !== 'ELIMINAR' || deleting}
                onClick={handleDelete}
              >
                {deleting ? 'Eliminando...' : 'Eliminar cuenta'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── COMPONENTE: IA PARA CÁLCULOS ─────────────────────────────────────────────
function AICalcConfig() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('solar');

  const MODES = [
    { key: 'solar', label: '☀️ Solar/FV', prompt: 'Eres un experto en instalaciones solares fotovoltaicas y sistemas de baterías.' },
    { key: 'termica', label: '🌡️ Térmica/Clima', prompt: 'Eres un experto en climatización, refrigeración industrial y bomba de calor.' },
    { key: 'electrica', label: '⚡ Eléctrica', prompt: 'Eres un experto en instalaciones eléctricas de baja tensión (REBT España).' },
    { key: 'normativa', label: '📋 Normativa', prompt: 'Eres un experto en normativa técnica española: REBT, RITE, F-Gas, RD 244/2019 autoconsumo, etc.' },
    { key: 'presupuesto', label: '💶 Presupuesto IA', prompt: 'Eres un experto en presupuestación de instalaciones técnicas en España (clima, solar, eléctrico).' },
  ];

  const activeMode = MODES.find(m => m.key === mode);

  const handleAsk = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult('');
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `${activeMode.prompt}\n\nPregunta del técnico: ${query}\n\nResponde de forma técnica, detallada y práctica. Si hay cálculos, muéstralos paso a paso. Si recomiendas materiales, da marcas y modelos reales.`,
      add_context_from_internet: true,
    });
    setResult(res);
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-800">
        <p className="font-medium mb-1">🤖 Asistente IA integrado para cálculos técnicos</p>
        <p>Usa inteligencia artificial para resolver cálculos técnicos, consultar normativa, estimar presupuestos y obtener recomendaciones de materiales en tiempo real.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {MODES.map(m => (
          <button key={m.key} onClick={() => setMode(m.key)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${mode === m.key ? 'bg-purple-600 text-white border-purple-600' : 'bg-white border-gray-200 hover:border-purple-300 text-gray-700'}`}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Consulta técnica - {activeMode.label}
        </label>
        <textarea
          className="w-full border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-purple-400"
          rows={4}
          placeholder={
            mode === 'solar' ? 'Ej: Necesito dimensionar una instalación solar de 5kWp con baterías LFP para una vivienda con consumo de 15 kWh/día...' :
            mode === 'termica' ? 'Ej: Calcula la potencia de climatización para una oficina de 80m² en Madrid, con 10 personas y orientación sur...' :
            mode === 'electrica' ? 'Ej: ¿Qué sección de cable necesito para 50m de longitud con una carga de 8kW monofásico a 230V?' :
            mode === 'normativa' ? 'Ej: ¿Qué documentación necesito para legalizar una instalación de autoconsumo de 10kWp en Cataluña?' :
            'Ej: Presupuesto para instalar 10 paneles de 400W con inversor monofásico y 5kWh de baterías en Madrid...'
          }
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <Button onClick={handleAsk} disabled={loading || !query.trim()} className="w-full bg-purple-600 hover:bg-purple-700 gap-2">
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
          {loading ? 'Consultando IA...' : 'Consultar IA técnica'}
        </Button>
      </div>

      {result && (
        <div className="bg-white border border-purple-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-purple-700 mb-2">🤖 Respuesta IA:</p>
          <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{result}</div>
        </div>
      )}
    </div>
  );
}