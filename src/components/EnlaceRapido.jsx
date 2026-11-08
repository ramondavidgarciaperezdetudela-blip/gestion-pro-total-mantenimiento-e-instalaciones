import React from 'react';
import { Link } from 'react-router-dom';
import { precargarPagina } from '@/lib/precarga';

// Link que adelanta la descarga de la pantalla en cuanto el ratón (o el dedo) se acerca,
// para que al hacer clic ya esté lista.
const EnlaceRapido = React.forwardRef(function EnlaceRapido({ to, onMouseEnter, onFocus, onTouchStart, ...resto }, ref) {
  const adelantar = () => precargarPagina(typeof to === 'string' ? to : to?.pathname);
  return <Link ref={ref} to={to} {...resto}
    onMouseEnter={(e) => { adelantar(); onMouseEnter?.(e); }}
    onFocus={(e) => { adelantar(); onFocus?.(e); }}
    onTouchStart={(e) => { adelantar(); onTouchStart?.(e); }} />;
});
export default EnlaceRapido;
