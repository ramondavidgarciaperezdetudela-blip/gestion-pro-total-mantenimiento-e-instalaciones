import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

/**
 * Selector de técnico reutilizable.
 * Carga la lista de técnicos desde CompanySettings y muestra un Select.
 * Si no hay técnicos configurados, muestra un Input de texto libre.
 * Props:
 *   value: string (nombre del técnico seleccionado)
 *   onChange: (name: string) => void
 *   placeholder?: string
 */
export default function TechnicianSelect({ value, onChange, placeholder = 'Seleccionar técnico' }) {
  const [technicians, setTechnicians] = useState(null); // null = cargando

  useEffect(() => {
    base44.entities.CompanySettings.list().then(settings => {
      const techs = settings[0]?.technicians || [];
      setTechnicians(techs.filter(t => (typeof t === 'object' ? t.name : t)));
    });
  }, []);

  if (technicians === null) {
    return <Input placeholder={placeholder} value={value || ''} onChange={e => onChange(e.target.value)} />;
  }

  if (technicians.length === 0) {
    return <Input placeholder={placeholder} value={value || ''} onChange={e => onChange(e.target.value)} />;
  }

  const techNames = technicians.map(t => typeof t === 'object' ? t.name : t);
  const isCustom = value && !techNames.includes(value);
  const selectValue = isCustom ? '__otro__' : (value || '');

  return (
    <div className="space-y-1">
      <Select
        value={selectValue}
        onValueChange={v => {
          if (v === '__otro__') onChange('');
          else onChange(v);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {techNames.map((name, i) => (
            <SelectItem key={i} value={name}>{name}</SelectItem>
          ))}
          <SelectItem value="__otro__">Otro (escribir manualmente)</SelectItem>
        </SelectContent>
      </Select>
      {(selectValue === '__otro__' || isCustom) && (
        <Input
          placeholder="Nombre del técnico"
          value={isCustom ? value : ''}
          onChange={e => onChange(e.target.value)}
          autoFocus
        />
      )}
    </div>
  );
}