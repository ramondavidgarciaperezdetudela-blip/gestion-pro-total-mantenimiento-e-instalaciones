import { createContext, useContext, useMemo } from 'react';

// Dibujos técnicos de fondo, uno por tipo de pantalla.
// Los ficheros están en public/fondos/ y se pueden sustituir por fotos reales.
// El programa de escritorio y el del móvil cargan desde ficheros, así que las
// rutas de los dibujos no pueden empezar por «/»: cuelgan de la base de Vite.
const BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || '/';
const f = (nombre) => BASE + 'fondos/' + nombre;

export const FONDOS = {
  menu: null, // en el menú principal se usa el logotipo de la empresa
  reparto: f('furgoneta.svg'),
  equipo: f('caldera.svg'),
  tecnico: f('caldera.svg'),
  cliente: f('local.svg'),
  clientes: f('edificios.svg'),
  medidas: f('manometros.svg'),
  fotos: f('camara-fotos.svg'),
  calculo: f('camara-frigorifica.svg')
};

const VALORES_POR_DEFECTO = {
  logoUrl: '',
  nombreEmpresa: '',
  mostrarLogoFondo: true,
  opacidadLogo: 0.09,
  mostrarDibujoFondo: true,
  opacidadDibujo: 0.12,
  fondosPersonalizados: {} // { reparto: 'https://.../foto.jpg', ... }
};

const ContextoTema = createContext(VALORES_POR_DEFECTO);

// Envolver la app con <ProveedorTema empresa={datosDeLaEmpresa}>.
// "empresa" puede venir de la entidad Empresa de Base44 o del almacenamiento elegido.
export function ProveedorTema({ empresa, children }) {
  const valor = useMemo(() => ({ ...VALORES_POR_DEFECTO, ...(empresa || {}) }), [empresa]);
  return <ContextoTema.Provider value={valor}>{children}</ContextoTema.Provider>;
}

export function useTema() {
  return useContext(ContextoTema);
}
