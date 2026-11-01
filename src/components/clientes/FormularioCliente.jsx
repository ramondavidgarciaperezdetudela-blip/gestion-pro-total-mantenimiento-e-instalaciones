import React, { useRef, useState } from 'react';
import { Building2, Phone, MapPin, Wallet, FileSignature, StickyNote, Camera, Download, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NumberField } from '@/components/ui/number-field';
import PostalCodeSearch from '@/components/PostalCodeSearch';
import CompletarDatosEmpresa from '@/components/CompletarDatosEmpresa';
import { fetchCompanyLogo } from '@/components/LogoFetcher';
import { uploadImage } from '@/lib/uploadImage';
import ZonaClimatica from '@/components/clientes/ZonaClimatica';
import {
  TIPOS_CLIENTE, RELACIONES, CATEGORIAS, FORMAS_PAGO, PERIODOS_CONTRATO, tipoDeCliente, ibanValido, formatearIban,
} from '@/lib/cliente';

/**
 * Formulario de cliente en tarjetas (Datos generales · Contacto · Dirección ·
 * Zona climática · Facturación · Contrato de mantenimiento · Notas). Lo usan
 * «Nuevo cliente» y «Editar» de la ficha, así los clientes antiguos pasan a
 * este formato solos: los campos que no tenían salen vacíos.
 *
 * `value` es el cliente; `onChange(patch)` recibe solo lo que cambia.
 */
const PERFILES_PAGO = [
  ['buen_pagador', 'Buen pagador'], ['pagador_normal', 'Pagador normal'], ['regateador', 'Regateador'], ['mal_pagador', 'Mal pagador'], ['moroso', 'Moroso'],
];

function Tarjeta({ icono: Icono, titulo, children, className = '', ...rest }) {
  return (
    <section className={`rounded-lg border bg-card ${className}`} {...rest}>
      <header className="flex items-center gap-2 border-b px-3 py-2"><Icono className="h-4 w-4 text-muted-foreground" /><h3 className="text-sm font-semibold">{titulo}</h3></header>
      <div className="space-y-2 p-3">{children}</div>
    </section>
  );
}
function Campo({ etiqueta, obligatorio, children, ayuda, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{etiqueta}{obligatorio && <span className="ml-0.5 text-destructive">*</span>}</span>
      {children}
      {ayuda && <span className="mt-0.5 block text-[11px] text-muted-foreground">{ayuda}</span>}
    </label>
  );
}

export default function FormularioCliente({ value, onChange }) {
  const v = value || {};
  const tipo = tipoDeCliente(v);
  const set = (k) => (e) => onChange({ [k]: e?.target ? e.target.value : e });
  const fotoRef = useRef(null); const camaraRef = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const [buscandoLogo, setBuscandoLogo] = useState(false);
  const ibanMal = !ibanValido(v.iban);

  const subirFoto = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setSubiendo(true);
    try { onChange({ photo_url: await uploadImage(file) }); }
    catch { alert('Error al subir la foto. Comprueba tu conexión e inténtalo de nuevo.'); }
    finally { setSubiendo(false); e.target.value = ''; }
  };
  const buscarLogo = async () => {
    setBuscandoLogo(true);
    const url = await fetchCompanyLogo(v.website || null, v.company_name);
    if (url) onChange({ company_logo_url: url, photo_url: v.photo_url || url });
    else alert('No se encontró logo para esta empresa. Prueba a añadir su web o sube la imagen a mano.');
    setBuscandoLogo(false);
  };
  const rellenarDireccion = (r) => onChange({ postal_code: r.postal_code, city: r.city, province: r.province, climate_zone: '' });

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2" data-testid="formulario-cliente">
      {/* Columna izquierda */}
      <div className="space-y-3">
        <Tarjeta icono={Building2} titulo="Datos generales" data-testid="tarjeta-datos">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed bg-muted">
              {v.photo_url ? <img src={v.photo_url} alt="" className="h-full w-full object-cover" /> : <User className="h-6 w-6 text-muted-foreground" />}
            </div>
            <div className="flex flex-wrap gap-1">
              <button type="button" onClick={() => fotoRef.current?.click()} disabled={subiendo} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-accent"><Camera className="h-3 w-3" />{subiendo ? 'Subiendo…' : 'Foto'}</button>
              <button type="button" onClick={() => camaraRef.current?.click()} disabled={subiendo} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-accent"><Camera className="h-3 w-3" />Cámara</button>
              <input ref={fotoRef} type="file" accept="image/*" className="hidden" onChange={subirFoto} />
              <input ref={camaraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={subirFoto} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_9rem]">
            {tipo === 'empresa' ? (
              <Campo etiqueta="Razón social" obligatorio><Input data-prueba="cliente-razon-social" value={v.company_name || ''} onChange={set('company_name')} /></Campo>
            ) : (
              <Campo etiqueta="Nombre" obligatorio><Input data-prueba="cliente-nombre" value={v.name || ''} onChange={set('name')} /></Campo>
            )}
            <Campo etiqueta="Tipo">
              <Select value={tipo} onValueChange={(x) => onChange({ client_kind: x })}>
                <SelectTrigger data-testid="cliente-tipo"><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS_CLIENTE.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </Campo>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {tipo === 'empresa'
              ? <Campo etiqueta="Nombre comercial"><Input value={v.commercial_name || ''} onChange={set('commercial_name')} /></Campo>
              : <Campo etiqueta="Apellidos"><Input value={v.surname || ''} onChange={set('surname')} /></Campo>}
            <Campo etiqueta="NIF / CIF"><Input value={v.nif || ''} onChange={set('nif')} /></Campo>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Campo etiqueta="Relación">
              <Select value={v.type || 'cliente'} onValueChange={(x) => onChange({ type: x })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RELACIONES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </Campo>
            <Campo etiqueta="Categoría">
              <Select value={v.category || 'residencial'} onValueChange={(x) => onChange({ category: x })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIAS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </Campo>
          </div>
          {tipo === 'empresa' && (
            <>
              <CompletarDatosEmpresa actuales={v} onAplicar={(nuevos) => onChange(nuevos)} campos={['company_name', 'nif', 'address', 'postal_code', 'city', 'province', 'phone', 'email', 'website']} />
              <div className="flex gap-2">
                <Input placeholder="Web de la empresa" value={v.website || ''} onChange={set('website')} className="flex-1" />
                <button type="button" onClick={buscarLogo} disabled={buscandoLogo || (!v.company_name && !v.website)} className="inline-flex items-center gap-1 whitespace-nowrap rounded border px-2 text-xs hover:bg-accent disabled:opacity-50"><Download className="h-3 w-3" />{buscandoLogo ? 'Buscando…' : 'Logo'}</button>
              </div>
              {v.company_logo_url && (
                <div className="flex items-center gap-2 rounded border bg-muted/40 p-2">
                  <img src={v.company_logo_url} alt="Logo" className="h-10 w-auto max-w-24 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                  <button type="button" onClick={() => onChange({ company_logo_url: '' })} className="ml-auto text-xs text-destructive">✕ Quitar</button>
                </div>
              )}
            </>
          )}
        </Tarjeta>

        <Tarjeta icono={MapPin} titulo="Dirección" data-testid="tarjeta-direccion">
          <Campo etiqueta="Dirección"><Input value={v.address || ''} onChange={set('address')} /></Campo>
          <p className="text-[11px] text-muted-foreground">Escribe la población, la provincia o el código postal y elige de la lista: se rellenan los tres.</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Campo etiqueta="Código postal"><PostalCodeSearch type="postal_code" data-prueba="cliente-cp" placeholder="" value={v.postal_code || ''} onChange={(x) => onChange({ postal_code: x, climate_zone: '' })} onSelect={rellenarDireccion} /></Campo>
            <Campo etiqueta="Población"><PostalCodeSearch type="city" data-prueba="cliente-ciudad" placeholder="" value={v.city || ''} onChange={(x) => onChange({ city: x })} onSelect={rellenarDireccion} /></Campo>
            <Campo etiqueta="Provincia"><PostalCodeSearch type="province" data-prueba="cliente-provincia" placeholder="" value={v.province || ''} onChange={(x) => onChange({ province: x, climate_zone: '' })} onSelect={rellenarDireccion} /></Campo>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Campo etiqueta="Altitud (m)" ayuda="Del emplazamiento; influye en la zona climática."><Input inputMode="decimal" data-prueba="cliente-altitud" value={v.altitude_m ?? ''} onChange={set('altitude_m')} /></Campo>
            <Campo etiqueta="País" className="sm:col-span-2"><Input value={v.country || ''} onChange={set('country')} /></Campo>
          </div>
        </Tarjeta>

        <Tarjeta icono={Wallet} titulo="Facturación" data-testid="tarjeta-facturacion">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Campo etiqueta="Forma de pago">
              <Select value={v.payment_method || '_'} onValueChange={(x) => onChange({ payment_method: x === '_' ? '' : x })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent><SelectItem value="_">—</SelectItem>{FORMAS_PAGO.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </Campo>
            <Campo etiqueta="Correo de facturación"><Input type="email" value={v.billing_email || ''} onChange={set('billing_email')} /></Campo>
          </div>
          <Campo etiqueta="IBAN" >
            <Input data-prueba="cliente-iban" className="font-mono" placeholder="ES00 0000 0000 0000 0000 0000" value={formatearIban(v.iban)} onChange={(e) => onChange({ iban: e.target.value })} aria-invalid={ibanMal} />
            {ibanMal && <span className="mt-0.5 block text-[11px] text-destructive" role="alert">El IBAN no parece válido: revisa los dígitos.</span>}
          </Campo>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Campo etiqueta="Perfil de pago">
              <Select value={v.payment_profile || 'pagador_normal'} onValueChange={(x) => onChange({ payment_profile: x })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PERFILES_PAGO.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </Campo>
            <Campo etiqueta="Importe pendiente (€)"><NumberField value={v.pending_amount} onChange={(x) => onChange({ pending_amount: x })} /></Campo>
          </div>
        </Tarjeta>
      </div>

      {/* Columna derecha */}
      <div className="space-y-3">
        <Tarjeta icono={Phone} titulo="Contacto" data-testid="tarjeta-contacto">
          {tipo === 'empresa' && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Campo etiqueta="Persona de contacto"><Input data-prueba="cliente-persona" value={v.name === v.company_name ? '' : (v.name || '')} onChange={set('name')} /></Campo>
              <Campo etiqueta="Apellidos"><Input value={v.surname || ''} onChange={set('surname')} /></Campo>
              <Campo etiqueta="Cargo"><Input placeholder="Jefe de mantenimiento" value={v.contact_role || ''} onChange={set('contact_role')} /></Campo>
            </div>
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Campo etiqueta="Teléfono"><Input type="tel" data-prueba="cliente-telefono" value={v.phone || ''} onChange={set('phone')} /></Campo>
            <Campo etiqueta="Móvil"><Input type="tel" value={v.phone2 || ''} onChange={set('phone2')} /></Campo>
            <Campo etiqueta="Correo electrónico"><Input type="email" data-prueba="cliente-email" value={v.email || ''} onChange={set('email')} /></Campo>
          </div>
          <Campo etiqueta="Horario de acceso"><Input placeholder="L–V de 8:00 a 15:00, preguntar en recepción" value={v.access_hours || ''} onChange={set('access_hours')} /></Campo>
        </Tarjeta>

        <ZonaClimatica contacto={v} onCambiar={onChange} />

        <Tarjeta icono={FileSignature} titulo="Contrato de mantenimiento" data-testid="tarjeta-contrato">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" data-testid="cliente-contrato" checked={!!v.has_maintenance_contract} onChange={(e) => onChange({ has_maintenance_contract: e.target.checked })} />
            Tiene contrato de mantenimiento
          </label>
          {v.has_maintenance_contract && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Campo etiqueta="Periodicidad">
                <Select value={String(v.contract_period_months || '12')} onValueChange={(x) => onChange({ contract_period_months: x })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PERIODOS_CONTRATO.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </Campo>
              <Campo etiqueta="Inicio del contrato"><Input type="date" value={v.contract_start_date || ''} onChange={set('contract_start_date')} /></Campo>
            </div>
          )}
        </Tarjeta>

        <Tarjeta icono={StickyNote} titulo="Notas" data-testid="tarjeta-notas">
          <Textarea rows={3} placeholder="Llaves, aparcamiento, avisar antes de ir, particularidades…" value={v.notes || ''} onChange={set('notes')} />
          <Campo etiqueta="Observaciones internas (no aparecen en documentos)"><Textarea rows={2} value={v.internal_observations || ''} onChange={set('internal_observations')} /></Campo>
        </Tarjeta>
      </div>
    </div>
  );
}
