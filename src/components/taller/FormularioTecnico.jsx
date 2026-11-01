import React from 'react';
import { UserRound, BadgeCheck, StickyNote } from 'lucide-react';
import FotoFicha from '@/components/FotoFicha';
import { Tarjeta, Campo, Entrada, Selector, AreaTexto } from './Ficha';

export const CATEGORIAS_TECNICO = ['Oficial de 1ª', 'Oficial de 2ª', 'Ayudante', 'Jefe de equipo', 'Responsable técnico'];
export const CATEGORIAS_FGAS = [{ value: 'I', label: 'Categoría I' }, { value: 'II', label: 'Categoría II' }, { value: 'III', label: 'Categoría III' }, { value: 'IV', label: 'Categoría IV' }];
export const TECNICO_VACIO = { name: '', dni: '', phone: '', email: '', category: '', hourly_cost: '', color: '#06b6d4', in_staff: true, fgas_carnet: '', fgas_category: '', fgas_expiry: '', rite_certificate: '', rite_expiry: '', prl_date: '', medical_date: '', notes: '', photo_url: '' };

/** Ficha de técnico: datos personales, habilitaciones y caducidades, notas y foto. */
export default function FormularioTecnico({ value, onChange }) {
  const v = { ...TECNICO_VACIO, ...value };
  const set = (k) => (e) => onChange({ ...v, [k]: e?.target ? e.target.value : e });
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2" data-testid="formulario-tecnico">
      <div className="space-y-3">
        <Tarjeta icono={UserRound} titulo="Datos personales">
          <FotoFicha value={v.photo_url} onChange={(u) => onChange({ ...v, photo_url: u })} etiqueta="Foto del técnico" icono={UserRound} tamano="h-20 w-20" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_9rem]">
            <Campo etiqueta="Nombre y apellidos" obligatorio><Entrada value={v.name} onChange={set('name')} data-prueba="tec-nombre" /></Campo>
            <Campo etiqueta="DNI / NIE"><Entrada value={v.dni} onChange={set('dni')} /></Campo>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Campo etiqueta="Teléfono"><Entrada value={v.phone} onChange={set('phone')} inputMode="tel" /></Campo>
            <Campo etiqueta="Correo"><Entrada type="email" value={v.email} onChange={set('email')} /></Campo>
            <Campo etiqueta="Categoría"><Selector opciones={CATEGORIAS_TECNICO} value={v.category} onChange={set('category')} /></Campo>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Campo etiqueta="Coste hora (€)" ayuda="Si se deja vacío se usa el de la empresa"><Entrada inputMode="decimal" value={v.hourly_cost} onChange={set('hourly_cost')} /></Campo>
            <Campo etiqueta="Color en el calendario"><div className="flex items-center gap-2"><input type="color" value={v.color || '#06b6d4'} onChange={set('color')} className="h-9 w-12 rounded border" /><span className="font-mono text-xs text-muted-foreground">{v.color}</span></div></Campo>
            <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={v.in_staff !== false} onChange={(e) => onChange({ ...v, in_staff: e.target.checked })} />En plantilla</label>
          </div>
        </Tarjeta>
        <Tarjeta icono={StickyNote} titulo="Notas"><AreaTexto value={v.notes} onChange={set('notes')} /></Tarjeta>
      </div>
      <Tarjeta icono={BadgeCheck} titulo="Habilitaciones y caducidades">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Campo etiqueta="Nº certificado F-Gas"><Entrada value={v.fgas_carnet} onChange={set('fgas_carnet')} /></Campo>
          <Campo etiqueta="Categoría F-Gas"><Selector opciones={CATEGORIAS_FGAS} value={v.fgas_category} onChange={set('fgas_category')} /></Campo>
          <Campo etiqueta="Caducidad F-Gas"><Entrada type="date" value={v.fgas_expiry} onChange={set('fgas_expiry')} /></Campo>
          <Campo etiqueta="Nº carné RITE"><Entrada value={v.rite_certificate} onChange={set('rite_certificate')} /></Campo>
          <Campo etiqueta="Caducidad carné RITE"><Entrada type="date" value={v.rite_expiry} onChange={set('rite_expiry')} /></Campo>
          <Campo etiqueta="Formación PRL / altura"><Entrada type="date" value={v.prl_date} onChange={set('prl_date')} /></Campo>
          <Campo etiqueta="Reconocimiento médico"><Entrada type="date" value={v.medical_date} onChange={set('medical_date')} /></Campo>
        </div>
      </Tarjeta>
    </div>
  );
}
