/**
 * temaEmpresa.js — Ajustes del tema «Carril DIN» (logotipo y fondos).
 *
 * Se guardan en la entidad de la empresa (CompanySettings) para que viajen con
 * los datos, vayan a Base44, a Supabase o al servidor propio. Además se dejan
 * en el aparato: así el aspecto sale bien desde el primer momento y no
 * «parpadea» mientras se cargan los datos de la empresa.
 */
const CLAVE = 'gpt_tema_ajustes';
export const EVENTO_TEMA = 'gpt-tema-cambiado';

export const AJUSTES_POR_DEFECTO = {
  mostrarLogoFondo: true,
  opacidadLogo: 0.09,
  mostrarDibujoFondo: true,
  opacidadDibujo: 0.12,
};

const num = (v, def, min, max) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};
const bool = (v, def) => (typeof v === 'boolean' ? v : def);

/** Saca los ajustes del tema de un registro de empresa (nombres de la entidad). */
export function ajustesDeEmpresa(company, guardados = leerLocal()) {
  const c = company || {};
  const g = guardados || {};
  const d = AJUSTES_POR_DEFECTO;
  return {
    mostrarLogoFondo: bool(c.tema_mostrar_logo_fondo, bool(g.mostrarLogoFondo, d.mostrarLogoFondo)),
    opacidadLogo: num(c.tema_opacidad_logo ?? g.opacidadLogo, d.opacidadLogo, 0, 0.3),
    mostrarDibujoFondo: bool(c.tema_mostrar_dibujo_fondo, bool(g.mostrarDibujoFondo, d.mostrarDibujoFondo)),
    opacidadDibujo: num(c.tema_opacidad_dibujo ?? g.opacidadDibujo, d.opacidadDibujo, 0, 0.4),
  };
}

/** Lo que recibe ProveedorTema. */
export function empresaParaTema(company, guardados) {
  const c = company || {};
  return {
    ...ajustesDeEmpresa(c, guardados),
    logoUrl: c.logo_url || '',
    nombreEmpresa: c.company_name || '',
  };
}

/** Pasa los valores del panel de ajustes a campos de la entidad. */
export function camposDeEntidad(v) {
  return {
    logo_url: v.logoUrl || '',
    tema_mostrar_logo_fondo: !!v.mostrarLogoFondo,
    tema_opacidad_logo: num(v.opacidadLogo, AJUSTES_POR_DEFECTO.opacidadLogo, 0, 0.3),
    tema_mostrar_dibujo_fondo: !!v.mostrarDibujoFondo,
    tema_opacidad_dibujo: num(v.opacidadDibujo, AJUSTES_POR_DEFECTO.opacidadDibujo, 0, 0.4),
  };
}

export function leerLocal(almacen = globalThis.localStorage) {
  try { return JSON.parse(almacen.getItem(CLAVE) || 'null') || {}; } catch { return {}; }
}

export function guardarLocal(v, almacen = globalThis.localStorage) {
  try {
    almacen.setItem(CLAVE, JSON.stringify({
      mostrarLogoFondo: !!v.mostrarLogoFondo, opacidadLogo: v.opacidadLogo,
      mostrarDibujoFondo: !!v.mostrarDibujoFondo, opacidadDibujo: v.opacidadDibujo,
    }));
  } catch { /* sin sitio */ }
}

/** Avisa al resto del programa de que cambió el aspecto (sin recargar). */
export function avisarCambio(company, win = globalThis.window) {
  try { win.dispatchEvent(new CustomEvent(EVENTO_TEMA, { detail: company })); } catch { /* sin ventana */ }
}
