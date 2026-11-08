import React from 'react';
import { Input } from '@/components/ui/input';

// Cuadro para escribir precios y porcentajes: texto libre (coma o punto, "12,", "0.5"…),
// sin transformar nada mientras se escribe. Quien lo usa recibe el texto tal cual y lo
// convierte con parsePrecio al guardar.
export default function CampoPrecio({ value, onChange, className, ...props }) {
  return (
    <Input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      onFocus={(e) => e.target.select()}
      className={className}
      {...props}
    />
  );
}
