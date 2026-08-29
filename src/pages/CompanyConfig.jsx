import React, { useState, useEffect, useRef } from 'react';
import InterruptorIA from '@/components/InterruptorIA';
import ElegirTema from '@/components/ElegirTema';
import VerificacionDocumentos from '@/components/VerificacionDocumentos';
import ElegirImpresora from '@/components/ElegirImpresora';
import { umbralesRite, guardarUmbralesRite, sonLosDePartida } from '@/lib/umbralesRite';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberField } from "@/components/ui/number-field";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TipoDeFuentePanel from '@/components/TipoDeFuentePanel';
import {
  ALINEACIONES, ESPACIADOS, ESTILOS_CABECERA, POSICIONES_CLIENTE, POSICIONES_LOGO,
  DISENO_POR_DEFECTO, esDisenoPorDefecto, normalizarDiseno, resumenDiseno,
} from '@/lib/disenoDocumento';
import { Building2, Save, Upload, Printer, Mail, Eye, EyeOff, UserCog, Plus, Trash2, LogOut, Globe, Wifi, Users, Shield, Brain, Copy, Check, RefreshCw, AlertTriangle, Type, Image as ImageIcon, CalendarClock } from 'lucide-react';
import PostalCodeSearch from '@/components/PostalCodeSearch';
import CompletarDatosEmpresa from '@/components/CompletarDatosEmpresa';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ValidCharsConfig from '@/components/ValidCharsConfig';
import { loadLicense, parseLicense, getDeviceId, clearLicense } from '@/lib/licenseManager';
import { uploadImage } from '@/lib/uploadImage';
import { resetStorageConfig } from '@/lib/externalStorage';

// Días de la semana con la misma numeración que usa src/lib/availability.js:
// 1 = lunes … 7 = domingo, para que el domingo no rompa el orden de la fila.
const DIAS_SEMANA = [
  { valor: 1, nombre: 'Lunes' },
  { valor: 2, nombre: 'Martes' },
  { valor: 3, nombre: 'Miércoles' },
  { valor: 4, nombre: 'Jueves' },
  { valor: 5, nombre: 'Viernes' },
  { valor: 6, nombre: 'Sábado' },
  { valor: 7, nombre: 'Domingo' },
];

// ── Gestión de la licencia en este equipo ────────────────────────────────────
function LicenseSection() {
  const [key, setKey] = useState(loadLicense());
  const payload = parseLicense(key);
  const deviceId = getDeviceId();

  const expiraTxt = payload?.expira
    ? new Date(payload.expira).toLocaleDateString('es-ES')
    : 'Sin caducidad';
  const dias = payload?.expira
    ? Math.max(0, Math.ceil((payload.expira - Date.now()) / 86400000))
    : null;

  const desactivar = () => {
    if (!window.confirm('¿Seguro que quieres DESACTIVAR la licencia en este equipo?\n\nLa app volverá a pedir la clave de activación. Podrás volver a activarla con la misma clave.')) return;
    clearLicense();
    window.location.reload();
  };

  const copiarEquipo = async () => {
    try { await navigator.clipboard.writeText(deviceId); alert('Identificador de equipo copiado.'); }
    catch { alert(deviceId); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
        <p className="font-medium mb-1">🔑 Licencia de este equipo</p>
        <p>Aquí puedes ver el estado de tu licencia y desactivarla en este equipo (por ejemplo, para liberar la clave y activarla en otro ordenador, o para volver a probar la activación).</p>
      </div>

      {payload ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="border rounded-lg p-3 bg-green-50">
            <p className="text-xs text-gray-500">Estado</p>
            <p className="font-bold text-green-700">✓ Activada</p>
          </div>
          <div className="border rounded-lg p-3">
            <p className="text-xs text-gray-500">Plan</p>
            <p className="font-semibold capitalize">{payload.plan || '—'}</p>
          </div>
          <div className="border rounded-lg p-3">
            <p className="text-xs text-gray-500">Cliente</p>
            <p className="font-semibold truncate">{payload.cliente || '—'}</p>
          </div>
          <div className="border rounded-lg p-3">
            <p className="text-xs text-gray-500">Email</p>
            <p className="font-semibold truncate">{payload.email || '—'}</p>
          </div>
          <div className="border rounded-lg p-3">
            <p className="text-xs text-gray-500">Válida hasta</p>
            <p className="font-semibold">{expiraTxt}{dias !== null && ` · ${dias} día(s)`}</p>
          </div>
          <div className="border rounded-lg p-3">
            <p className="text-xs text-gray-500">Equipo vinculado</p>
            <p className="font-mono text-xs truncate">{payload.deviceId || 'Cualquiera'}</p>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg p-3 bg-amber-50">
          <p className="font-bold text-amber-700">Sin licencia activada en este equipo</p>
          <p className="text-xs text-amber-600 mt-1">La app pedirá la clave de activación al abrirse.</p>
        </div>
      )}

      <div className="border rounded-lg p-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-gray-500">Tu identificador de equipo</p>
          <p className="font-mono text-sm truncate">{deviceId}</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 flex-shrink-0" onClick={copiarEquipo}>
          <Copy className="w-4 h-4" /> Copiar
        </Button>
      </div>

      {payload && (
        <Button variant="destructive" className="gap-2" onClick={desactivar}>
          <LogOut className="w-4 h-4" /> Desactivar licencia en este equipo
        </Button>
      )}
    </div>
  );
}

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
    storage_config: { provider: 'cloudinary', cloud_name: '', upload_preset: '', enabled: false },
    availability_config: { dias_laborables: [1,2,3,4,5], hora_inicio: '09:00', hora_fin: '18:00', descanso_inicio: '14:00', descanso_fin: '15:00', duracion_cita: 60, dias_vista: 14 },
    technicians: [],
    payment_terms: 'Forma de pago: Máximo 3 pagos.\n1º Pago: 100% material + 50% mano de obra (al aceptar presupuesto)\n2º Pago: 25% mano de obra (al iniciar trabajos)\n3º Pago: 25% mano de obra restante (al finalizar)',
    observations_climate: 'Instalación realizada según el RITE (RD 1027/2007) y el RD 115/2017. Gases fluorados según el Reglamento (UE) 2024/573.',
    observations_electric: 'Instalación realizada según REBT (RD 842/2002) y normas UNE de aplicación.',
    observations_refrigeration: 'Instalación realizada según Reglamento de Seguridad para Instalaciones Frigoríficas, F-Gas RD 115/2017 y normativa de comprobación de fugas.',
  });
  const [recordId, setRecordId] = useState(null);
  const [saved, setSaved] = useState(false);
  const [rite, setRite] = useState(() => umbralesRite());
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
          storage_config: d.storage_config || { provider: 'cloudinary', cloud_name: '', upload_preset: '', enabled: false },
          availability_config: d.availability_config || { dias_laborables: [1,2,3,4,5], hora_inicio: '09:00', hora_fin: '18:00', descanso_inicio: '14:00', descanso_fin: '15:00', duracion_cita: 60, dias_vista: 14 },
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
    // El almacén externo cachea su configuración: sin esto habría que cerrar y
    // abrir la app para que los cambios surtieran efecto.
    resetStorageConfig();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const file_url = await uploadImage(file);
      setForm({ ...form, logo_url: file_url });
    } catch (err) {
      alert('Error al subir el logo. Comprueba tu conexión e inténtalo de nuevo.');
    } finally {
      setLogoUploading(false);
      e.target.value = '';
    }
  };

  const updatePrinter = (field, value) => {
    setForm({ ...form, printer_config: { ...form.printer_config, [field]: value } });
  };

  const updateHorario = (field, value) => {
    setForm(prev => ({ ...prev, availability_config: { ...prev.availability_config, [field]: value } }));
  };

  const alternarDia = (dia) => {
    setForm(prev => {
      const actuales = prev.availability_config?.dias_laborables || [];
      const nuevos = actuales.includes(dia) ? actuales.filter(d => d !== dia) : [...actuales, dia].sort();
      return { ...prev, availability_config: { ...prev.availability_config, dias_laborables: nuevos } };
    });
  };

  const updateStorage = (field, value) => {
    setForm(prev => ({
      ...prev,
      storage_config: { provider: 'cloudinary', ...prev.storage_config, [field]: value },
    }));
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
          <TabsTrigger value="horario" className="flex-1 text-xs">Horario</TabsTrigger>
          <TabsTrigger value="fuente" className="flex-1 text-xs">Aspecto y letra</TabsTrigger>
          <TabsTrigger value="impresion" className="flex-1 text-xs">Impresión</TabsTrigger>
          <TabsTrigger value="documentos" className="flex-1 text-xs">Documentos</TabsTrigger>
          <TabsTrigger value="escaner" className="flex-1 text-xs">Escáner</TabsTrigger>
          <TabsTrigger value="usuarios" className="flex-1 text-xs">Usuarios</TabsTrigger>
          <TabsTrigger value="red" className="flex-1 text-xs">Red / Acceso</TabsTrigger>
          <TabsTrigger value="ia" className="flex-1 text-xs">IA Cálculos</TabsTrigger>
          <TabsTrigger value="caracteres" className="flex-1 text-xs">Caracteres</TabsTrigger>
          <TabsTrigger value="licencia" className="flex-1 text-xs">Licencia</TabsTrigger>
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
                {/* Escribe el NIF o el nombre y que rellene lo que falte. Nunca
                    pisa nada sin que lo marques tú. */}
                <div className="md:col-span-2">
                  <CompletarDatosEmpresa
                    actuales={form}
                    onAplicar={(nuevos) => setForm(f => ({ ...f, ...nuevos }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Teléfono</label>
                  <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="600 000 000" className="mt-1" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Dirección</label>
                  <Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Calle, número, piso" className="mt-1" />
                </div>
                {/* Los tres campos son buscadores Y campos a la vez: escribes,
                    eliges de la lista y se rellenan los tres. Antes solo eran
                    buscadores y, al elegir, el cuadro se quedaba en blanco.
                    El setForm va en su forma de función para que elegir en dos
                    cuadros seguidos no borre lo del primero. */}
                <div>
                  <label className="text-sm font-medium text-gray-700">Ciudad / Población</label>
                  <div className="mt-1">
                    <PostalCodeSearch
                      type="city"
                      data-prueba="empresa-ciudad"
                      value={form.city || ''}
                      onChange={(v) => setForm(f => ({ ...f, city: v }))}
                      onSelect={(r) => setForm(f => ({ ...f, postal_code: r.postal_code, city: r.city, province: r.province }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Provincia</label>
                  <div className="mt-1">
                    <PostalCodeSearch
                      type="province"
                      data-prueba="empresa-provincia"
                      value={form.province || ''}
                      onChange={(v) => setForm(f => ({ ...f, province: v }))}
                      onSelect={(r) => setForm(f => ({ ...f, postal_code: r.postal_code, city: r.city, province: r.province }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Código Postal</label>
                  <div className="mt-1">
                    <PostalCodeSearch
                      type="postal_code"
                      data-prueba="empresa-cp"
                      value={form.postal_code || ''}
                      onChange={(v) => setForm(f => ({ ...f, postal_code: v }))}
                      onSelect={(r) => setForm(f => ({ ...f, postal_code: r.postal_code, city: r.city, province: r.province }))}
                    />
                  </div>
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
                  <NumberField className="mt-1" decimals={false} placeholder="587" value={form.email_config?.smtp_port || 587} onChange={v => setForm({...form, email_config: {...form.email_config, smtp_port: v}})} />
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

        <TabsContent value="horario">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="w-5 h-5" />Horario de trabajo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
                Con este horario la pantalla <strong>Disponibilidad</strong> calcula qué días y
                qué horas quedan libres, descontando las citas y las órdenes SAT ya programadas.
                Así, cuando un cliente llame, se ve de un vistazo qué hueco ofrecerle.
              </p>

              <div>
                <label className="text-sm font-medium">Días laborables</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {DIAS_SEMANA.map(d => {
                    const activo = (form.availability_config?.dias_laborables || []).includes(d.valor);
                    return (
                      <button
                        key={d.valor}
                        type="button"
                        onClick={() => alternarDia(d.valor)}
                        className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                          activo
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white border-slate-300 text-slate-600'
                        }`}
                      >
                        {d.nombre}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-sm font-medium">Entrada</label>
                  <Input
                    type="time"
                    className="mt-1"
                    value={form.availability_config?.hora_inicio || '09:00'}
                    onChange={e => updateHorario('hora_inicio', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Salida</label>
                  <Input
                    type="time"
                    className="mt-1"
                    value={form.availability_config?.hora_fin || '18:00'}
                    onChange={e => updateHorario('hora_fin', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Inicio comida</label>
                  <Input
                    type="time"
                    className="mt-1"
                    value={form.availability_config?.descanso_inicio || ''}
                    onChange={e => updateHorario('descanso_inicio', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Fin comida</label>
                  <Input
                    type="time"
                    className="mt-1"
                    value={form.availability_config?.descanso_fin || ''}
                    onChange={e => updateHorario('descanso_fin', e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500 -mt-2">
                Deja la comida en blanco si no quieres pausa al mediodía.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Duración de cada visita (minutos)</label>
                  <Input
                    type="number"
                    min="15"
                    step="15"
                    className="mt-1"
                    value={form.availability_config?.duracion_cita ?? 60}
                    onChange={e => updateHorario('duracion_cita', Number(e.target.value) || 60)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Días que se muestran por adelantado</label>
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    className="mt-1"
                    value={form.availability_config?.dias_vista ?? 14}
                    onChange={e => updateHorario('dias_vista', Number(e.target.value) || 14)}
                  />
                </div>
              </div>

              {!form.email && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                  No tienes correo de empresa en la pestaña «Datos empresa». Sin él no se puede
                  enviar el aviso automático con los datos del cliente al reservar una cita.
                </p>
              )}

              <Button onClick={handleSave} className={`w-full ${saved ? 'bg-green-600' : 'bg-blue-600'}`}>
                <Save className="w-4 h-4 mr-2" /> {saved ? '¡Guardado!' : 'Guardar horario'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fuente">
          <div className="space-y-4">
            {/* El aspecto va junto al tipo de letra: las dos cosas son cómo se
                ve el programa, y se buscan en el mismo sitio. */}
            <Card>
              <CardContent className="pt-6">
                <ElegirTema />
              </CardContent>
            </Card>
            <TipoDeFuentePanel />
          </div>
        </TabsContent>

        <TabsContent value="impresion">
          <Card className="mb-4">
            <CardContent className="pt-6">
              <ElegirImpresora />
            </CardContent>
          </Card>
          <Card className="mb-4">
            <CardContent className="pt-6">
              <VerificacionDocumentos form={form} setForm={setForm} onGuardar={handleSave} />
            </CardContent>
          </Card>
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
                    <NumberField decimals={false} value={form.printer_config?.margin_top || 15} onChange={v => updatePrinter('margin_top', v)} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Margen inferior (mm)</label>
                    <NumberField decimals={false} value={form.printer_config?.margin_bottom || 15} onChange={v => updatePrinter('margin_bottom', v)} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Margen izquierdo (mm)</label>
                    <NumberField decimals={false} value={form.printer_config?.margin_left || 15} onChange={v => updatePrinter('margin_left', v)} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Margen derecho (mm)</label>
                    <NumberField decimals={false} value={form.printer_config?.margin_right || 15} onChange={v => updatePrinter('margin_right', v)} className="mt-1" />
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

              {/* Colocación de los elementos */}
              <div className="space-y-3" data-prueba="umbrales-rite">
                <p className="text-sm font-semibold text-gray-700 border-b pb-1">⚙️ Mínimos de eficiencia del RITE</p>
                <p className="text-xs text-gray-500">
                  Con estos valores el programa marca si un equipo cumple o no en los cálculos y
                  en los documentos. Vienen puestos EER 3,0 y SCOP 3,5. Si el RITE cambia o tu
                  instalación exige otros, cámbialos aquí: el documento lo firmas tú.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs font-medium text-gray-700">
                    EER mínimo (frío)
                    <Input
                      type="number" step="0.1" min="0"
                      className="mt-1"
                      value={rite.eer}
                      onChange={(e) => setRite(guardarUmbralesRite({ ...rite, eer: e.target.value }))}
                      aria-label="EER mínimo del RITE"
                    />
                  </label>
                  <label className="text-xs font-medium text-gray-700">
                    SCOP mínimo (calor)
                    <Input
                      type="number" step="0.1" min="0"
                      className="mt-1"
                      value={rite.scop}
                      onChange={(e) => setRite(guardarUmbralesRite({ ...rite, scop: e.target.value }))}
                      aria-label="SCOP mínimo del RITE"
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-400" data-prueba="resumen-rite">
                  Ahora mismo: EER ≥ {rite.eer} · SCOP ≥ {rite.scop}
                  {sonLosDePartida(rite) ? ' (los de partida)' : ' (cambiados por ti)'}
                </p>
              </div>

              <div className="space-y-3" data-prueba="diseno-documento">
                <p className="text-sm font-semibold text-gray-700 border-b pb-1">📐 Dónde va cada cosa</p>
                <p className="text-xs text-gray-500">
                  Mueve el logo, los datos y los textos. Vale para todos los documentos:
                  presupuestos, facturas, partes e informes.
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Posición del logo</label>
                    <Select value={normalizarDiseno(form.printer_config).logo_pos}
                      onValueChange={v => updatePrinter('logo_pos', v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {POSICIONES_LOGO.map(o => (
                          <SelectItem key={o.id} value={o.id}>{o.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-[10px] text-gray-400">
                      {(POSICIONES_LOGO.find(o => o.id === normalizarDiseno(form.printer_config).logo_pos) || {}).nota}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Aspecto de la cabecera</label>
                    <Select value={normalizarDiseno(form.printer_config).cabecera_estilo}
                      onValueChange={v => updatePrinter('cabecera_estilo', v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ESTILOS_CABECERA.map(o => (
                          <SelectItem key={o.id} value={o.id}>{o.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-[10px] text-gray-400">
                      {(ESTILOS_CABECERA.find(o => o.id === normalizarDiseno(form.printer_config).cabecera_estilo) || {}).nota}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Datos de la empresa</label>
                    <Select value={normalizarDiseno(form.printer_config).datos_empresa_align}
                      onValueChange={v => updatePrinter('datos_empresa_align', v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ALINEACIONES.map(o => <SelectItem key={o.id} value={o.id}>{o.nombre}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Datos del cliente</label>
                    <Select value={normalizarDiseno(form.printer_config).cliente_pos}
                      onValueChange={v => updatePrinter('cliente_pos', v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {POSICIONES_CLIENTE.map(o => <SelectItem key={o.id} value={o.id}>{o.nombre}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Título del documento</label>
                    <Select value={normalizarDiseno(form.printer_config).titulo_align}
                      onValueChange={v => updatePrinter('titulo_align', v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ALINEACIONES.map(o => <SelectItem key={o.id} value={o.id}>{o.nombre}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Pie de página</label>
                    <Select value={normalizarDiseno(form.printer_config).pie_align}
                      onValueChange={v => updatePrinter('pie_align', v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ALINEACIONES.map(o => <SelectItem key={o.id} value={o.id}>{o.nombre}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Espacio entre bloques</label>
                    <Select value={normalizarDiseno(form.printer_config).espaciado}
                      onValueChange={v => updatePrinter('espaciado', v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ESPACIADOS.map(o => <SelectItem key={o.id} value={o.id}>{o.nombre}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-[10px] text-gray-400">
                      {(ESPACIADOS.find(o => o.id === normalizarDiseno(form.printer_config).espaciado) || {}).nota}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm font-medium">Color principal</label>
                      <input type="color" aria-label="Color principal de los documentos"
                        value={normalizarDiseno(form.printer_config).color_cabecera}
                        onChange={e => updatePrinter('color_cabecera', e.target.value)}
                        className="mt-1 h-9 w-full cursor-pointer rounded border" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Color de acento</label>
                      <input type="color" aria-label="Color de acento de los documentos"
                        value={normalizarDiseno(form.printer_config).color_acento}
                        onChange={e => updatePrinter('color_acento', e.target.value)}
                        className="mt-1 h-9 w-full cursor-pointer rounded border" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-gray-50 p-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={normalizarDiseno(form.printer_config).linea_bajo_titulo}
                      onChange={e => updatePrinter('linea_bajo_titulo', e.target.checked)} />
                    Raya debajo del título
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={normalizarDiseno(form.printer_config).mostrar_pie}
                      onChange={e => updatePrinter('mostrar_pie', e.target.checked)} />
                    Mostrar pie de página
                  </label>
                  <Button type="button" variant="outline" size="sm" className="ml-auto"
                    disabled={esDisenoPorDefecto(form.printer_config)}
                    onClick={() => Object.entries(DISENO_POR_DEFECTO).forEach(([k, v]) => updatePrinter(k, v))}>
                    Dejarlo como estaba
                  </Button>
                </div>

                <p className="text-[11px] text-gray-500" data-prueba="resumen-diseno">
                  {resumenDiseno(form.printer_config)}
                </p>
              </div>

              {/* Logo */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700 border-b pb-1">🖼️ Logo en documentos</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Ancho logo (mm)</label>
                    <NumberField decimals={false} value={form.printer_config?.logo_width_mm || 35} onChange={v => updatePrinter('logo_width_mm', v)} className="mt-1" />
                    <p className="text-[10px] text-gray-400 mt-1">Máx. recomendado: 35mm</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Alto logo (mm)</label>
                    <NumberField decimals={false} value={form.printer_config?.logo_height_mm || 20} onChange={v => updatePrinter('logo_height_mm', v)} className="mt-1" />
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
          {/* Almacén externo de fotos y documentos */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />Almacén de fotos y documentos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 space-y-1">
                <p className="font-medium">¿Para qué sirve?</p>
                <p>
                  Sin esto, las fotos y documentos se guardan dentro de la propia ficha,
                  comprimidos y con límite de tamaño, porque las subidas de Base44 gastan
                  crédito de la cuenta. Con un almacén externo se suben en calidad completa,
                  las fichas quedan ligeras y no se gasta crédito.
                </p>
                <p className="font-medium pt-1">Cómo configurarlo (una sola vez, gratis):</p>
                <ol className="list-decimal ml-4 space-y-0.5">
                  <li>Crea una cuenta gratuita en cloudinary.com</li>
                  <li>En el panel verás el <strong>Cloud name</strong>: cópialo abajo</li>
                  <li>Ve a Settings → Upload → Upload presets → Add upload preset</li>
                  <li>Pon <strong>Signing Mode: Unsigned</strong> y guarda</li>
                  <li>Copia el nombre del preset abajo y activa la casilla</li>
                </ol>
                <p className="pt-1">
                  El preset debe ser <strong>sin firmar (unsigned)</strong>: es el modo que
                  permite subir desde el móvil sin meter contraseñas dentro del programa.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Cloud name</label>
                  <Input
                    className="mt-1"
                    placeholder="ej: dxxxxxxxx"
                    value={form.storage_config?.cloud_name || ''}
                    onChange={e => updateStorage('cloud_name', e.target.value.trim())}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Upload preset (sin firmar)</label>
                  <Input
                    className="mt-1"
                    placeholder="ej: gestion_pro_total"
                    value={form.storage_config?.upload_preset || ''}
                    onChange={e => updateStorage('upload_preset', e.target.value.trim())}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!form.storage_config?.enabled}
                  onChange={e => updateStorage('enabled', e.target.checked)}
                />
                Usar este almacén para fotos y documentos
              </label>

              {form.storage_config?.enabled && (!form.storage_config?.cloud_name || !form.storage_config?.upload_preset) && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                  Faltan datos: hasta que rellenes los dos campos se seguirán guardando dentro de la ficha.
                </p>
              )}

              <Button onClick={handleSave} className={`w-full ${saved ? 'bg-green-600' : 'bg-blue-600'}`}>
                <Save className="w-4 h-4 mr-2" /> {saved ? '¡Guardado!' : 'Guardar configuración'}
              </Button>
            </CardContent>
          </Card>
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

        {/* ─── CARACTERES VÁLIDOS ─────────────────────────────────────────── */}
        <TabsContent value="caracteres">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Type className="w-5 h-5 text-blue-600" />Caracteres válidos en nombres de producto</CardTitle>
            </CardHeader>
            <CardContent>
              <ValidCharsConfig />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── ELIMINAR CUENTA ────────────────────────────────────────────── */}
        <TabsContent value="licencia">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-blue-600" />Licencia</CardTitle>
            </CardHeader>
            <CardContent>
              <LicenseSection />
            </CardContent>
          </Card>
        </TabsContent>

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
              <InterruptorIA />
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
      alert('Error al eliminar la cuenta. Contacta con soporte: kairigarcia.gestionprototal@gmail.com');
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