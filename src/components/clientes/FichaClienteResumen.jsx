import React from 'react';
import { Building2, Phone, Mail, MapPin, Wallet, FileSignature, Navigation } from 'lucide-react';
import ZonaClimatica from '@/components/clientes/ZonaClimatica';
import { FORMAS_PAGO, PERIODOS_CONTRATO, RELACIONES, CATEGORIAS, formatearIban, nombreDeCliente, tipoDeCliente } from '@/lib/cliente';

/**
 * Ficha de solo lectura con el mismo orden de tarjetas que el formulario.
 * Los clientes antiguos la ven completa: lo que no tienen sale con «—» y la
 * zona climática se calcula sola con su provincia o código postal.
 */
const Dato = ({ etiqueta, children }) => (
  <div className="min-w-0">
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{etiqueta}</div>
    <div className="truncate text-sm">{children || <span className="text-muted-foreground">—</span>}</div>
  </div>
);
const Tarjeta = ({ icono: Icono, titulo, children, ...rest }) => (
  <section className="rounded-lg border bg-card" {...rest}>
    <header className="flex items-center gap-2 border-b px-3 py-1.5"><Icono className="h-4 w-4 text-muted-foreground" /><h3 className="text-sm font-semibold">{titulo}</h3></header>
    <div className="grid grid-cols-2 gap-x-3 gap-y-2 p-3">{children}</div>
  </section>
);
const etiqueta = (lista, valor) => lista.find((x) => x.value === valor)?.label || valor;

export default function FichaClienteResumen({ contacto: c, onGPS }) {
  const tipo = tipoDeCliente(c);
  const direccion = [c.address, [c.postal_code, c.city].filter(Boolean).join(' '), c.province].filter(Boolean).join(', ');
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2" data-testid="ficha-resumen">
      <div className="space-y-3">
        <Tarjeta icono={Building2} titulo="Datos generales">
          <Dato etiqueta={tipo === 'empresa' ? 'Razón social' : 'Nombre'}>{tipo === 'empresa' ? c.company_name : nombreDeCliente(c)}</Dato>
          <Dato etiqueta="Tipo">{tipo === 'empresa' ? 'Empresa' : 'Particular'}</Dato>
          {tipo === 'empresa' && <Dato etiqueta="Nombre comercial">{c.commercial_name}</Dato>}
          <Dato etiqueta="NIF / CIF">{c.nif}</Dato>
          <Dato etiqueta="Relación">{etiqueta(RELACIONES, c.type)}</Dato>
          <Dato etiqueta="Categoría">{etiqueta(CATEGORIAS, c.category)}</Dato>
        </Tarjeta>
        <Tarjeta icono={MapPin} titulo="Dirección">
          <div className="col-span-2"><Dato etiqueta="Dirección">{direccion}</Dato></div>
          <Dato etiqueta="Altitud">{c.altitude_m !== undefined && c.altitude_m !== null && c.altitude_m !== '' ? `${c.altitude_m} m` : ''}</Dato>
          <Dato etiqueta="País">{c.country}</Dato>
          {c.address && onGPS && (
            <button type="button" onClick={onGPS} className="col-span-2 inline-flex items-center gap-2 text-left text-sm text-orange-600"><Navigation className="h-4 w-4" />Cómo llegar</button>
          )}
        </Tarjeta>
        <Tarjeta icono={Wallet} titulo="Facturación">
          <Dato etiqueta="Forma de pago">{etiqueta(FORMAS_PAGO, c.payment_method)}</Dato>
          <Dato etiqueta="Correo de facturación">{c.billing_email}</Dato>
          <div className="col-span-2"><Dato etiqueta="IBAN"><span className="font-mono">{formatearIban(c.iban)}</span></Dato></div>
        </Tarjeta>
      </div>
      <div className="space-y-3">
        <Tarjeta icono={Phone} titulo="Contacto">
          {tipo === 'empresa' && <Dato etiqueta="Persona de contacto">{c.name && c.name !== c.company_name ? [c.name, c.surname].filter(Boolean).join(' ') : ''}</Dato>}
          {tipo === 'empresa' && <Dato etiqueta="Cargo">{c.contact_role}</Dato>}
          <Dato etiqueta="Teléfono">{c.phone && <a href={`tel:${c.phone}`} className="text-blue-600">{c.phone}</a>}</Dato>
          <Dato etiqueta="Móvil">{c.phone2 && <a href={`tel:${c.phone2}`} className="text-blue-600">{c.phone2}</a>}</Dato>
          <div className="col-span-2"><Dato etiqueta="Correo electrónico">{c.email && <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 text-blue-600"><Mail className="h-3 w-3" />{c.email}</a>}</Dato></div>
          <div className="col-span-2"><Dato etiqueta="Horario de acceso">{c.access_hours}</Dato></div>
        </Tarjeta>
        <ZonaClimatica contacto={c} compacto />
        <Tarjeta icono={FileSignature} titulo="Contrato de mantenimiento">
          <Dato etiqueta="Contrato">{c.has_maintenance_contract ? 'Sí' : 'No'}</Dato>
          {c.has_maintenance_contract && <Dato etiqueta="Periodicidad">{etiqueta(PERIODOS_CONTRATO, String(c.contract_period_months))}</Dato>}
          {c.has_maintenance_contract && c.contract_start_date && <Dato etiqueta="Inicio">{c.contract_start_date.split('-').reverse().join('/')}</Dato>}
        </Tarjeta>
        {c.notes && (
          <section className="rounded-lg border bg-card p-3 text-sm"><div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Notas</div><p className="whitespace-pre-wrap">{c.notes}</p></section>
        )}
        {c.internal_observations && (
          <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs"><strong>Obs. internas:</strong> {c.internal_observations}</div>
        )}
      </div>
    </div>
  );
}
