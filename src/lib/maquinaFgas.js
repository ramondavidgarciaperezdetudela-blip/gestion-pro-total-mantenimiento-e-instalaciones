/**
 * maquinaFgas.js — Datos de la ficha de una máquina y su control de fugas.
 *
 * Con el gas y la carga se calcula al momento: toneladas de CO₂ equivalente,
 * kilos de HFO (Anexo II del Reglamento (UE) 2024/573) y cada cuánto hay que
 * hacer el control de fugas. Valores ORIENTATIVOS: el GWP es el de referencia
 * de refrigerantes.js; comprueba los anexos del reglamento para un caso oficial.
 */
import { buscarRefrigerante } from './refrigerantes.js';

export const TIPOS_MAQUINA = [
  { value: 'aire_acondicionado', label: 'Aire acondicionado' },
  { value: 'bomba_calor', label: 'Bomba de calor' },
  { value: 'camara_frigorifica', label: 'Cámara frigorífica' },
  { value: 'ventilacion', label: 'Ventilación/Climatización' },
  { value: 'caldera', label: 'Caldera' },
  { value: 'aerotermia', label: 'Aerotermia' },
  { value: 'solar_fotovoltaico', label: 'Solar fotovoltaico' },
  { value: 'solar_termico', label: 'Solar térmico' },
  { value: 'electrico_cuadro', label: 'Cuadro eléctrico' },
  { value: 'grupo_frio', label: 'Grupo de frío industrial' },
  { value: 'otro', label: 'Otro' },
];
export const ESTADOS_MAQUINA = [
  { value: 'operativo', label: 'Operativo' },
  { value: 'en_reparacion', label: 'En reparación' },
  { value: 'fuera_servicio', label: 'Fuera de servicio' },
  { value: 'baja', label: 'Baja' },
];
export const ACEITES = ['POE', 'PVE', 'PAG', 'Mineral', 'Alquilbenceno'];
export const EXPANSIONES = ['Válvula termostática', 'Válvula electrónica', 'Tubo capilar', 'Orificio fijo', 'Otra'];
export const COMPRESORES = ['Hermético', 'Semihermético', 'Scroll', 'Pistón abierto', 'Tornillo', 'Rotativo inverter'];

export const MAQUINA_VACIA = {
  contact_id: '', contact_name: '', name: '', machine_type: 'aire_acondicionado', brand: '', model: '', serial_number: '',
  location: '', installation_date: '', status: 'operativo',
  refrigerant_type: '', refrigerant_charge_kg: '', gwp: '', last_leak_check: '', hermetic: false, leak_detection: false, residential: false,
  oil_type: '', oil_charge_l: '', expansion_type: 'Válvula termostática', compressor_type: '',
  nominal_low_bar: '', nominal_high_bar: '', ps_bar: '',
  power_kw: '', sensible_kw: '', heating_kw: '', setpoint_cold_c: '', setpoint_heat_c: '', humidity_pct: '',
  maintenance_interval_months: 6, last_maintenance_date: '', next_maintenance_date: '', warranty_expiry: '',
  notes: '', photo_url: '', maintenance_log: [],
};

/** Parte de HFO (Anexo II) que lleva cada gas, en fracción de masa. Mezclas: según su composición. */
const FRACCION_HFO = {
  'R-1234yf': 1, 'R-1234ze(E)': 1, 'R-1233zd(E)': 1, 'R-1336mzz(Z)': 1,
  'R-454B': 0.311, 'R-454C': 0.785, 'R-455A': 0.755, 'R-513A': 0.44, 'R-449A': 0.253,
  'R-448A': 0.27, 'R-452A': 0.30, 'R-450A': 0.58, 'R-444B': 0.485,
};

const num = (v) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

/**
 * @param {object} m ficha: refrigerant_type, refrigerant_charge_kg, gwp, hermetic, leak_detection, last_leak_check
 * @returns {{tCO2:number|null, kgHFO:number|null, gwp:number|null, control:{estado:'sin-datos'|'no'|'si', meses:number|null, texto:string, proximo:string|null}}}
 */
export function calcularFgas(m = {}) {
  const gas = buscarRefrigerante(m.refrigerant_type);
  const kg = num(m.refrigerant_charge_kg);
  const gwp = num(m.gwp) ?? gas?.gwp ?? null;
  const tCO2 = gwp && kg && kg > 0 ? Math.round((gwp * kg) / 10) / 100 : null;
  const frac = gas ? FRACCION_HFO[gas.id] : undefined;
  const kgHFO = kg && kg > 0 && frac ? Math.round(kg * frac * 1000) / 1000 : (kg && kg > 0 && gas ? 0 : null);

  let control;
  if (tCO2 === null) control = { estado: 'sin-datos', meses: null, texto: 'Falta la carga de refrigerante en kg.', proximo: null };
  else {
    const exento = tCO2 < 5 || (m.hermetic && tCO2 < 10);
    if (exento) control = { estado: 'no', meses: null, texto: m.hermetic && tCO2 >= 5 ? 'no obligatorio (hermético, menos de 10 t CO₂e)' : 'no obligatorio (menos de 5 t CO₂e)', proximo: null };
    else {
      const base = tCO2 < 50 ? 12 : tCO2 < 500 ? 6 : 3;
      const meses = m.leak_detection ? base * 2 : base;
      let proximo = null;
      if (m.last_leak_check && /^\d{4}-\d{2}-\d{2}$/.test(m.last_leak_check)) {
        const d = new Date(`${m.last_leak_check}T12:00:00`);
        d.setMonth(d.getMonth() + meses);
        proximo = d.toISOString().slice(0, 10);
      }
      control = { estado: 'si', meses, texto: `cada ${meses} meses${m.leak_detection ? ' (con detector de fugas)' : ''}`, proximo };
    }
  }
  return { tCO2, kgHFO, gwp, control };
}

/** Próximo preventivo = último + cada N meses (YYYY-MM-DD), o null si falta algo. */
export function proximoPreventivo(ultimo, meses) {
  const n = num(meses);
  if (!ultimo || !n || n <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(ultimo)) return null;
  const d = new Date(`${ultimo}T12:00:00`);
  d.setMonth(d.getMonth() + Math.round(n));
  return d.toISOString().slice(0, 10);
}
