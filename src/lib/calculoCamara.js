// Lógica de cálculo de cámara frigorífica, compartida entre la pantalla de
// cálculo (ColdRoomCalc) y el esquema interactivo (EsquemaInteractivoCamara).
// Vive fuera de la página para que el esquema reactivo pueda recalcular en
// tiempo real sin duplicar las fórmulas.

import { COLD_ROOM_CATALOG } from '@/components/EquipmentSelector';

export const REF_PRESSURES = {
  'R-404A': { '-35°C': 0.93, '-25°C': 1.67, '-15°C': 2.82, '-10°C': 3.64, '0°C': 5.72, '5°C': 7.0 },
  'R-448A': { '-35°C': 0.76, '-25°C': 1.42, '-15°C': 2.46, '-10°C': 3.2,  '0°C': 5.1,  '5°C': 6.3 },
  'R-449A': { '-35°C': 0.8,  '-25°C': 1.5,  '-15°C': 2.6,  '-10°C': 3.3,  '0°C': 5.2,  '5°C': 6.4 },
  'R-452A': { '-35°C': 0.85, '-25°C': 1.55, '-15°C': 2.65, '-10°C': 3.4,  '0°C': 5.3,  '5°C': 6.5 },
  'R-134a': { '-35°C': 0.66, '-25°C': 1.16, '-15°C': 1.94, '-10°C': 2.43, '0°C': 3.72, '5°C': 4.46 },
  'R-290':  { '-35°C': 1.03, '-25°C': 1.83, '-15°C': 3.07, '-10°C': 3.93, '0°C': 6.07, '5°C': 7.4 },
};

export const EXTRA_REF_G_PER_M = { 'R-404A': 22, 'R-448A': 18, 'R-449A': 18, 'R-452A': 19, 'R-134a': 14, 'R-290': 11 };

const COLD_CATALOG = COLD_ROOM_CATALOG;

export function calcBreakdown(f) {
  const insul = { '60mm': 0.35, '80mm': 0.27, '100mm': 0.22, '120mm': 0.18 }[f.panel_thickness] || 0.27;
  const surf = 2 * (f.length * f.width + f.length * f.height + f.width * f.height);
  const deltaT = Math.abs((f.exterior_temp || 25) - (f.cold_room_temp || 2));
  const transmissionLoad = surf * insul * deltaT;
  const productLoad = (f.product_kg || 100) * 3.5 * Math.abs(f.exterior_temp - f.cold_room_temp) / 24;
  const vol = f.length * f.width * f.height;
  const ventLoad = vol * 0.5 * 1.2 * 1.005 * deltaT * 0.28;
  return { transmissionLoad, productLoad, ventLoad };
}

export function buildResult(form, breakdown) {
  const { transmissionLoad, productLoad, ventLoad } = breakdown;
  const totalLoad = Math.round((transmissionLoad + productLoad + ventLoad) * 1.25);

  const suitableCold = COLD_CATALOG.filter(e => e.power_kw * 1000 >= totalLoad * 0.9);
  const equip = suitableCold[0] || COLD_CATALOG[COLD_CATALOG.length - 1];
  const alternatives = suitableCold.slice(0, 3).length > 0 ? suitableCold.slice(0, 3) : COLD_CATALOG.slice(-3);
  const actualDist = parseFloat(form.pipe_distance) || 8;
  const maxDist = equip.max_pipe_m;
  const extraGrams = actualDist > maxDist ? Math.round((actualDist - maxDist) * (EXTRA_REF_G_PER_M[form.refrigerant_type] || 18)) : 0;

  const coldTemp = parseFloat(form.cold_room_temp);
  const evapTemp = coldTemp - 8;
  const evapKey = String(evapTemp <= -35 ? '-35°C' : evapTemp <= -25 ? '-25°C' : evapTemp <= -15 ? '-15°C' : evapTemp <= -10 ? '-10°C' : evapTemp <= 0 ? '0°C' : '5°C');
  const pr = REF_PRESSURES[form.refrigerant_type] || REF_PRESSURES['R-449A'];
  const evapPressure = pr[evapKey] || '—';
  const condPressure = (parseFloat(Object.values(pr).slice(-1)[0]) * (form.exterior_temp > 35 ? 1.15 : 1)).toFixed(2);

  const panelArea = 2 * (form.length * form.width + form.length * form.height + form.width * form.height);
  const refCharge = (equip.power_kw * 0.35 + actualDist * (EXTRA_REF_G_PER_M[form.refrigerant_type] || 18) / 1000).toFixed(2);

  const loadKW = totalLoad / 1000;
  let vetModel, vetOrificio, vetPrecio;
  if (loadKW <= 1.5) { vetModel = 'Danfoss T2 / TS2'; vetOrificio = '#00 (0.8mm)'; vetPrecio = 45; }
  else if (loadKW <= 3) { vetModel = 'Danfoss T2 / TS2'; vetOrificio = '#1 (1.1mm)'; vetPrecio = 52; }
  else if (loadKW <= 6) { vetModel = 'Danfoss TUB/T2'; vetOrificio = '#2 (1.4mm)'; vetPrecio = 68; }
  else if (loadKW <= 12) { vetModel = 'Danfoss TUA/TUAE'; vetOrificio = '#3 (1.8mm)'; vetPrecio = 85; }
  else { vetModel = 'Danfoss TUAE / TCAE'; vetOrificio = '#4 (2.2mm)'; vetPrecio = 120; }

  const liquidDiam = loadKW <= 5 ? '3/8"' : loadKW <= 15 ? '1/2"' : '5/8"';
  const gasDiam = loadKW <= 3 ? '1/2"' : loadKW <= 8 ? '5/8"' : loadKW <= 15 ? '7/8"' : '1-1/8"';
  const insulThick = (form.cold_room_temp || 0) < 0 ? '32mm' : '19mm';

  const cuadroPrecio = loadKW <= 5 ? 320 : loadKW <= 15 ? 480 : 680;
  const cuadroDesc = loadKW <= 5 ? 'Cuadro control monofásico básico' : loadKW <= 15 ? 'Cuadro control trifásico con termostato digital' : 'Cuadro control trifásico industrial con alarmas';

  const materials = [
    { material: `Panel frigorífico ${form.panel_thickness}`, quantity: panelArea.toFixed(1), unit: 'm²', precio_ud: 45 },
    { material: `Evaporador cámara`, quantity: 1, unit: 'unidad', precio_ud: null },
    { material: `Unidad condensadora ${equip.brand} ${equip.model} ${equip.power_kw}kW`, quantity: 1, unit: 'unidad', precio_ud: null },
    { material: `Tubería líquido ${liquidDiam} Cu`, quantity: actualDist, unit: 'm', precio_ud: 6.5 },
    { material: `Tubería gas ${gasDiam} Cu`, quantity: actualDist, unit: 'm', precio_ud: 9 },
    { material: `Aislamiento tubería Armaflex ${insulThick}`, quantity: actualDist * 2, unit: 'm', precio_ud: 3.8 },
    { material: `${form.refrigerant_type} gas refrigerante`, quantity: refCharge, unit: 'kg', precio_ud: form.refrigerant_type === 'R-290' ? 18 : 28 },
    { material: `Válvula expansión termostática ${vetModel}`, quantity: 1, unit: 'unidad', precio_ud: vetPrecio, nota: `Orificio ${vetOrificio}` },
    { material: `Filtro deshidratador ${
      form.condensadora_tipo === 'bancada'
        ? (loadKW <= 3 ? 'Danfoss DML 083 (bancada, 3/8" – 10mm)' : loadKW <= 8 ? 'Danfoss DML 164 (bancada, 1/2" – 12mm)' : 'Danfoss DML 305 (bancada, 5/8" – 16mm)')
        : (loadKW <= 5 ? 'DML 083 (split, 3/8")' : 'DML 164 (split, 1/2")')
    }`, quantity: 1, unit: 'unidad', precio_ud: form.condensadora_tipo === 'bancada' ? (loadKW <= 3 ? 22 : loadKW <= 8 ? 28 : 38) : 18,
      nota: form.condensadora_tipo === 'bancada' ? `Bancada: filtro bidireccional bidirec. con tamiz molecular 48bar` : null },
    { material: `Visor de líquido con indicador humedad`, quantity: 1, unit: 'unidad', precio_ud: 14 },
    { material: `Presostato combinado alta/baja presión`, quantity: 1, unit: 'unidad', precio_ud: 42 },
    { material: cuadroDesc, quantity: 1, unit: 'unidad', precio_ud: cuadroPrecio },
    { material: `Cableado eléctrico 4×2,5mm² manguera`, quantity: actualDist + 5, unit: 'm', precio_ud: 2.8 },
    { material: `Marco puerta frigorífica isotérmica`, quantity: 1, unit: 'unidad', precio_ud: null },
    { material: `Desagüe bandeja evaporador con cable calefactor`, quantity: 1, unit: 'unidad', precio_ud: 35 },
    { material: `Soporte/consola metálica condensadora`, quantity: 1, unit: 'unidad', precio_ud: 45 },
    { material: `Racores y latiguillos frigoríficos`, quantity: 1, unit: 'juego', precio_ud: 28 },
    { material: `Espuma aislante montaje (Armaflex adhesivo)`, quantity: 2, unit: 'ud', precio_ud: 12 },
  ];
  const totalMateriales = materials.reduce((s, m) => s + (m.precio_ud ? m.precio_ud * parseFloat(m.quantity) : 0), 0);

  const panelScore = { '60mm': 60, '80mm': 75, '100mm': 88, '120mm': 100 }[form.panel_thickness] || 75;
  const pipingScore = Math.max(0, 100 - Math.max(0, actualDist - maxDist) * 5);
  const tempScore = Math.max(0, 100 - Math.abs(form.exterior_temp - 25) * 2);
  const loadScore = Math.min(100, Math.round((1 - totalLoad / 20000) * 100));
  const equipScore = Math.min(100, Math.round((equip.power_kw * 1000 / totalLoad) * 50));

  return {
    loadW: totalLoad, equip, alternatives, extraGrams, evapPressure, condPressure, refCharge,
    panelArea: panelArea.toFixed(1), materials, maxDist, actualDist, pr,
    totalMateriales, vetOrificio,
    efficiencyScores: {
      insulation: Math.max(0, Math.min(100, panelScore)),
      piping: Math.max(0, Math.min(100, pipingScore)),
      temp: Math.max(0, Math.min(100, tempScore)),
      load: Math.max(0, Math.min(100, loadScore)),
      equipment: Math.max(0, Math.min(100, equipScore)),
    }
  };
}