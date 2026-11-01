/**
 * psicrometria.js — aire húmedo y carga latente.
 * Fórmulas estándar (ASHRAE / Magnus). Valores ORIENTATIVOS para pre-dimensionar;
 * un proyecto firmado debe contrastarse con el cálculo del proyectista.
 */
const R_AIRE = 287.05, R_VAPOR = 461.5, H_FG = 2501; // J/kg·K, J/kg·K, kJ/kg
const CP_AIRE = 1.006, CP_VAPOR = 1.86;               // kJ/kg·K
const num = (v) => { const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v; return Number.isFinite(n) ? n : null; };

/** Presión atmosférica (Pa) a una altitud (m) en atmósfera estándar. */
export const presionAltitud = (h = 0) => 101325 * Math.pow(1 - 2.25577e-5 * (num(h) ?? 0), 5.25588);
/** Presión de saturación del vapor (Pa) a T (°C). */
export const presionSaturacion = (t) => 610.94 * Math.exp((17.625 * t) / (t + 243.04));

/** Estado del aire a partir de T (°C), HR (%) y altitud (m). */
export function estadoAire({ t, hr, altitud = 0 }) {
  const T = num(t), H = num(hr);
  if (T === null || H === null || H < 0 || H > 100) return null;
  const P = presionAltitud(altitud);
  const Pw = (H / 100) * presionSaturacion(T);
  if (Pw >= P) return null;
  const W = (0.62198 * Pw) / (P - Pw);                // kg agua / kg aire seco
  const TK = T + 273.15;
  const rhoSeco = (P - Pw) / (R_AIRE * TK);
  const rho = rhoSeco + Pw / (R_VAPOR * TK);          // kg/m³ aire húmedo
  const x = Math.log(Pw / 610.94);
  return { t: T, hr: H, P, Pw, W, rho, rhoSeco, h: CP_AIRE * T + W * (H_FG + CP_VAPOR * T), tRocio: H > 0 ? (243.04 * x) / (17.625 - x) : null };
}

/**
 * Carga del aire de ventilación + ocupantes + fuentes de humedad.
 * @param {{interior:{t,hr}, exterior:{t,hr}, altitud:number, caudalM3h:number, personas?:number, latentePersonaW?:number, humedadKgH?:number}} p
 * @returns {{int:object, ext:object, kgAireSecoS:number, ventSensibleKW:number, ventLatenteKW:number, personasLatenteKW:number, fuentesKW:number, latenteKW:number, sensibleKW:number, totalKW:number, fcs:number|null, deshumidificarKgH:number}|null}
 */
export function cargaLatente(p) {
  const int = estadoAire({ ...p.interior, altitud: p.altitud });
  const ext = estadoAire({ ...p.exterior, altitud: p.altitud });
  const q = num(p.caudalM3h);
  if (!int || !ext || q === null || q < 0) return null;
  const m = (q / 3600) * ext.rhoSeco; // kg aire seco / s (se mide el caudal en el aire exterior)
  const ventSensibleKW = m * (CP_AIRE + CP_VAPOR * ext.W) * (ext.t - int.t);
  const ventLatenteKW = m * (ext.W - int.W) * H_FG;
  const personasLatenteKW = ((num(p.personas) ?? 0) * (num(p.latentePersonaW) ?? 55)) / 1000;
  const fuentesKW = ((num(p.humedadKgH) ?? 0) * H_FG) / 3600;
  const latenteKW = Math.max(0, ventLatenteKW) + personasLatenteKW + fuentesKW;
  const sensibleKW = Math.max(0, ventSensibleKW);
  const totalKW = latenteKW + sensibleKW;
  return {
    int, ext, kgAireSecoS: m,
    ventSensibleKW, ventLatenteKW, personasLatenteKW, fuentesKW,
    latenteKW, sensibleKW, totalKW,
    fcs: totalKW > 0 ? sensibleKW / totalKW : null,
    deshumidificarKgH: (latenteKW * 3600) / H_FG,
  };
}
