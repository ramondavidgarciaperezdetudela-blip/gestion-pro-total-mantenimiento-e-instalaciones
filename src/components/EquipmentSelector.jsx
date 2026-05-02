import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, AlertTriangle, XCircle, RefreshCw, Info, ChevronDown, ChevronUp, Zap } from 'lucide-react';

// ─── Catálogo ampliado multi-marca ────────────────────────────────────────────
// NORMATIVA 2026:
//   RITE 2026: EER mínimo ≥ 3.0, SCOP ≥ 3.5, clase eficiencia ≥ A+
//   F-GAS 2024/573 (aplicación 2025-2026): GWP ≤ 750 para equipos nuevos ≤ 12kW
//                                            GWP ≤ 2500 para equipos > 12kW hasta 2030
// Los gases PROHIBIDOS (GWP > 2500 en nuevas instalaciones ≤ 12kW desde 2025):
//   R-410A (GWP 2088) — AÚN permitido > 12kW pero NO recomendado
//   R-404A (GWP 3922) — PROHIBIDO en nuevas instalaciones
//   R-407C (GWP 1774) — PROHIBIDO en ≤ 12kW desde 2025

const GWP = {
  'R-32':   675,   // ✅ RITE+FGAS OK
  'R-290':  3,     // ✅ RITE+FGAS OK (propano)
  'R-449A': 1397,  // ⚠️ GWP entre 750-2500: OK > 12kW, ⚠️ ≤ 12kW
  'R-452A': 2141,  // ⚠️ GWP entre 750-2500: OK > 12kW
  'R-448A': 1387,  // ⚠️ GWP entre 750-2500: OK > 12kW
  'R-454B': 466,   // ✅ RITE+FGAS OK (nuevo A2L)
  'R-454C': 148,   // ✅ RITE+FGAS OK (nuevo A2L refrigeración)
  'R-410A': 2088,  // ⚠️ Solo > 12kW. NO recomendado nuevas inst. ≤ 12kW
  'R-404A': 3922,  // ❌ PROHIBIDO nuevas instalaciones
  'R-407C': 1774,  // ⚠️ No recomendado ≤ 12kW
  'R-134a': 1430,  // ⚠️ Fase reducción
};

// Función para evaluar cumplimiento normativo
function evaluateCompliance(eq) {
  const gwp = GWP[eq.gas] || 999;
  const issues = [];
  const ok = [];

  // F-GAS 2024/573
  if (gwp <= 750) {
    ok.push('F-GAS 2026 ✓ (GWP ' + gwp + ')');
  } else if (gwp <= 2500 && eq.power_kw > 12) {
    ok.push('F-GAS 2026 ✓ > 12kW (GWP ' + gwp + ')');
  } else if (gwp > 2500) {
    issues.push('F-GAS ❌ PROHIBIDO nuevas inst. (GWP ' + gwp + ')');
  } else if (gwp > 750 && eq.power_kw <= 12) {
    issues.push('F-GAS ⚠️ GWP ' + gwp + ' > 750 en equipo ≤ 12kW');
  }

  // RITE 2026
  if (eq.eer && eq.eer >= 3.0) ok.push(`RITE 2026 ✓ (EER ${eq.eer})`);
  else if (eq.eer && eq.eer < 3.0) issues.push(`RITE ⚠️ EER ${eq.eer} < 3.0 mínimo`);
  if (eq.scop && eq.scop >= 3.5) ok.push(`SCOP ${eq.scop} ✓`);

  if (eq.rite_compliant === false) issues.push('No declara RITE 2026');
  if (eq.rite_compliant === true && !ok.find(s => s.includes('RITE'))) ok.push('RITE 2026 ✓');

  const status = issues.length === 0 ? 'ok' : issues.some(i => i.includes('❌')) ? 'error' : 'warning';
  return { status, ok, issues, gwp };
}

// ─── CATÁLOGO CLIMA (splits, cassette, conductos) ─────────────────────────────
export const CLIMATE_CATALOG = [
  // DAIKIN
  { brand: 'Daikin', model: 'FTXM25R / RXM25R', power_kw: 2.5, type: 'Split 1x1 pared', gas: 'R-32', max_pipe_m: 20, max_height_m: 10, eer: 4.07, scop: 4.0, class: 'A+++', rite_compliant: true },
  { brand: 'Daikin', model: 'FTXM35R / RXM35R', power_kw: 3.5, type: 'Split 1x1 pared', gas: 'R-32', max_pipe_m: 25, max_height_m: 12, eer: 3.94, scop: 4.0, class: 'A+++', rite_compliant: true },
  { brand: 'Daikin', model: 'FTXM50R / RXM50R', power_kw: 5.0, type: 'Split 1x1 pared', gas: 'R-32', max_pipe_m: 30, max_height_m: 15, eer: 3.72, scop: 4.0, class: 'A+++', rite_compliant: true },
  { brand: 'Daikin', model: 'FTXM71R / RXM71R', power_kw: 7.1, type: 'Split 1x1 pared', gas: 'R-32', max_pipe_m: 30, max_height_m: 15, eer: 3.5, scop: 3.8, class: 'A++', rite_compliant: true },
  { brand: 'Daikin', model: 'FHQ71B / RZQG71L9V1B', power_kw: 7.1, type: 'Cassette 4 vías', gas: 'R-32', max_pipe_m: 50, max_height_m: 20, eer: 3.4, scop: 3.6, class: 'A++', rite_compliant: true },
  { brand: 'Daikin', model: 'FHQ100B / RZQG100L9V1B', power_kw: 10.0, type: 'Cassette 4 vías', gas: 'R-32', max_pipe_m: 50, max_height_m: 20, eer: 3.2, scop: 3.5, class: 'A+', rite_compliant: true },
  { brand: 'Daikin', model: 'FDXM60F9 / RZAG60A', power_kw: 6.0, type: 'Conductos', gas: 'R-32', max_pipe_m: 40, max_height_m: 20, eer: 3.3, scop: 3.6, class: 'A++', rite_compliant: true },
  // MITSUBISHI
  { brand: 'Mitsubishi Electric', model: 'MSZ-AP25VG / MUZ-AP25VG', power_kw: 2.5, type: 'Split 1x1 pared', gas: 'R-32', max_pipe_m: 20, max_height_m: 10, eer: 4.1, scop: 4.2, class: 'A+++', rite_compliant: true },
  { brand: 'Mitsubishi Electric', model: 'MSZ-AP35VG / MUZ-AP35VG', power_kw: 3.5, type: 'Split 1x1 pared', gas: 'R-32', max_pipe_m: 25, max_height_m: 12, eer: 4.0, scop: 4.1, class: 'A+++', rite_compliant: true },
  { brand: 'Mitsubishi Electric', model: 'MSZ-AP50VG / MUZ-AP50VG', power_kw: 5.0, type: 'Split 1x1 pared', gas: 'R-32', max_pipe_m: 30, max_height_m: 15, eer: 3.8, scop: 4.0, class: 'A+++', rite_compliant: true },
  { brand: 'Mitsubishi Electric', model: 'PKA-M71KAL / PUZ-M71VKA', power_kw: 7.1, type: 'Cassette 4 vías', gas: 'R-32', max_pipe_m: 50, max_height_m: 20, eer: 3.5, scop: 3.7, class: 'A++', rite_compliant: true },
  { brand: 'Mitsubishi Electric', model: 'PEAD-M100JA / PUHZ-P100YKA', power_kw: 10.0, type: 'Conductos', gas: 'R-32', max_pipe_m: 50, max_height_m: 25, eer: 3.2, scop: 3.5, class: 'A+', rite_compliant: true },
  // FUJITSU
  { brand: 'Fujitsu', model: 'ASYG09KETA / AOYG09KETA', power_kw: 2.5, type: 'Split 1x1 pared', gas: 'R-32', max_pipe_m: 20, max_height_m: 10, eer: 4.2, scop: 4.2, class: 'A+++', rite_compliant: true },
  { brand: 'Fujitsu', model: 'ASYG12KETA / AOYG12KETA', power_kw: 3.5, type: 'Split 1x1 pared', gas: 'R-32', max_pipe_m: 25, max_height_m: 12, eer: 4.1, scop: 4.1, class: 'A+++', rite_compliant: true },
  { brand: 'Fujitsu', model: 'ASYG18KETA / AOYG18KETA', power_kw: 5.0, type: 'Split 1x1 pared', gas: 'R-32', max_pipe_m: 30, max_height_m: 15, eer: 3.9, scop: 4.0, class: 'A+++', rite_compliant: true },
  { brand: 'Fujitsu', model: 'ARYA24KHTAP / AOYR24KHTAP', power_kw: 7.1, type: 'Split 1x1 pared', gas: 'R-32', max_pipe_m: 30, max_height_m: 20, eer: 3.6, scop: 3.8, class: 'A++', rite_compliant: true },
  { brand: 'Fujitsu', model: 'AUG36LRLA / AOG36LRLA', power_kw: 10.0, type: 'Cassette 4 vías', gas: 'R-32', max_pipe_m: 50, max_height_m: 20, eer: 3.3, scop: 3.5, class: 'A+', rite_compliant: true },
  // SAMSUNG
  { brand: 'Samsung', model: 'AR09TXHQASINEU', power_kw: 2.5, type: 'Split 1x1 pared', gas: 'R-32', max_pipe_m: 20, max_height_m: 12, eer: 4.1, scop: 4.2, class: 'A+++', rite_compliant: true },
  { brand: 'Samsung', model: 'AR12TXHQASINEU', power_kw: 3.5, type: 'Split 1x1 pared', gas: 'R-32', max_pipe_m: 25, max_height_m: 12, eer: 4.0, scop: 4.1, class: 'A+++', rite_compliant: true },
  { brand: 'Samsung', model: 'AR18TXHQASINEU', power_kw: 5.0, type: 'Split 1x1 pared', gas: 'R-32', max_pipe_m: 30, max_height_m: 15, eer: 3.8, scop: 4.0, class: 'A+++', rite_compliant: true },
  { brand: 'Samsung', model: 'AC071RNNDKG/EU', power_kw: 7.1, type: 'Cassette 4 vías', gas: 'R-32', max_pipe_m: 50, max_height_m: 20, eer: 3.5, scop: 3.7, class: 'A++', rite_compliant: true },
  // LG
  { brand: 'LG', model: 'S09EQ / S09EQ NSJ', power_kw: 2.5, type: 'Split 1x1 pared', gas: 'R-32', max_pipe_m: 20, max_height_m: 10, eer: 4.0, scop: 4.0, class: 'A+++', rite_compliant: true },
  { brand: 'LG', model: 'S12EQ / S12EQ NSJ', power_kw: 3.5, type: 'Split 1x1 pared', gas: 'R-32', max_pipe_m: 25, max_height_m: 12, eer: 3.9, scop: 4.0, class: 'A+++', rite_compliant: true },
  { brand: 'LG', model: 'S18ET / S18ET NSJ', power_kw: 5.0, type: 'Split 1x1 pared', gas: 'R-32', max_pipe_m: 30, max_height_m: 15, eer: 3.7, scop: 3.9, class: 'A++', rite_compliant: true },
  { brand: 'LG', model: 'UV30F N20 / UU30WR U30', power_kw: 8.0, type: 'Cassette 4 vías', gas: 'R-32', max_pipe_m: 50, max_height_m: 20, eer: 3.4, scop: 3.6, class: 'A++', rite_compliant: true },
  // PANASONIC
  { brand: 'Panasonic', model: 'CS-Z25ZKEW / CU-Z25ZKE', power_kw: 2.5, type: 'Split 1x1 pared', gas: 'R-32', max_pipe_m: 20, max_height_m: 10, eer: 4.1, scop: 4.2, class: 'A+++', rite_compliant: true },
  { brand: 'Panasonic', model: 'CS-Z35ZKEW / CU-Z35ZKE', power_kw: 3.5, type: 'Split 1x1 pared', gas: 'R-32', max_pipe_m: 25, max_height_m: 12, eer: 4.0, scop: 4.1, class: 'A+++', rite_compliant: true },
  { brand: 'Panasonic', model: 'CS-Z50ZKEW / CU-Z50ZKE', power_kw: 5.0, type: 'Split 1x1 pared', gas: 'R-32', max_pipe_m: 30, max_height_m: 15, eer: 3.8, scop: 4.0, class: 'A+++', rite_compliant: true },
  { brand: 'Panasonic', model: 'CS-MZ71WKE / CU-MZ71WKE', power_kw: 7.1, type: 'Split 1x1 pared', gas: 'R-32', max_pipe_m: 30, max_height_m: 20, eer: 3.5, scop: 3.8, class: 'A++', rite_compliant: true },
  // HITACHI
  { brand: 'Hitachi', model: 'RAK-35REF / RAC-35WEF', power_kw: 3.5, type: 'Split 1x1 pared', gas: 'R-32', max_pipe_m: 25, max_height_m: 15, eer: 3.9, scop: 4.0, class: 'A+++', rite_compliant: true },
  { brand: 'Hitachi', model: 'RAK-50REF / RAC-50WEF', power_kw: 5.0, type: 'Split 1x1 pared', gas: 'R-32', max_pipe_m: 30, max_height_m: 15, eer: 3.7, scop: 3.9, class: 'A++', rite_compliant: true },
  { brand: 'Hitachi', model: 'RPC-4.0FN1E / RAS-4HVNPE', power_kw: 4.0, type: 'Cassette 4 vías', gas: 'R-32', max_pipe_m: 50, max_height_m: 20, eer: 3.5, scop: 3.8, class: 'A++', rite_compliant: true },
  // INTARCON
  { brand: 'Intarcon', model: 'UNIDAD-7K INVERTER', power_kw: 7.0, type: 'Cassette', gas: 'R-32', max_pipe_m: 30, max_height_m: 15, eer: 3.4, scop: 3.6, class: 'A+', rite_compliant: true },
  { brand: 'Intarcon', model: 'UNIDAD-10K INVERTER', power_kw: 10.0, type: 'Cassette', gas: 'R-32', max_pipe_m: 30, max_height_m: 15, eer: 3.2, scop: 3.5, class: 'A+', rite_compliant: true },
  { brand: 'Intarcon', model: 'UNIDAD-15K INVERTER', power_kw: 15.0, type: 'Conductos', gas: 'R-32', max_pipe_m: 40, max_height_m: 20, eer: 3.1, scop: 3.4, class: 'A+', rite_compliant: true },
];

// ─── CATÁLOGO CÁMARAS FRIGORÍFICAS ────────────────────────────────────────────
export const COLD_ROOM_CATALOG = [
  // INTARCON
  { brand: 'Intarcon', model: 'CHCU 1.5 NN R-449A', power_kw: 1.5, gas: 'R-449A', temp_range: '0/+10°C', max_pipe_m: 15, max_height_m: 5, type: 'Monobloc', rite_compliant: true },
  { brand: 'Intarcon', model: 'CHCU 3.0 NN R-449A', power_kw: 3.0, gas: 'R-449A', temp_range: '-5/+10°C', max_pipe_m: 20, max_height_m: 8, type: 'Split', rite_compliant: true },
  { brand: 'Intarcon', model: 'CHCU 5.0 NN R-449A', power_kw: 5.0, gas: 'R-449A', temp_range: '-10/+5°C', max_pipe_m: 25, max_height_m: 10, type: 'Split', rite_compliant: true },
  { brand: 'Intarcon', model: 'CHCU 8.0 NN R-449A', power_kw: 8.0, gas: 'R-449A', temp_range: '-15/0°C', max_pipe_m: 30, max_height_m: 12, type: 'Split', rite_compliant: true },
  { brand: 'Intarcon', model: 'CHCU 12.0 NN R-448A', power_kw: 12.0, gas: 'R-448A', temp_range: '-25/-5°C', max_pipe_m: 35, max_height_m: 12, type: 'Split', rite_compliant: true },
  { brand: 'Intarcon', model: 'CUBUS 3.0 R-454C', power_kw: 3.0, gas: 'R-454C', temp_range: '0/+10°C', max_pipe_m: 15, max_height_m: 5, type: 'Monobloc', rite_compliant: true },
  { brand: 'Intarcon', model: 'CUBUS 5.0 R-454C', power_kw: 5.0, gas: 'R-454C', temp_range: '-5/+5°C', max_pipe_m: 20, max_height_m: 8, type: 'Split', rite_compliant: true },
  // ZANOTTI
  { brand: 'Zanotti', model: 'SAP 106 R-452A', power_kw: 3.0, gas: 'R-452A', temp_range: '0/+10°C', max_pipe_m: 20, max_height_m: 8, type: 'Split', rite_compliant: true },
  { brand: 'Zanotti', model: 'SAP 212 R-452A', power_kw: 6.0, gas: 'R-452A', temp_range: '-10/+5°C', max_pipe_m: 25, max_height_m: 10, type: 'Split', rite_compliant: true },
  { brand: 'Zanotti', model: 'SAP 320 R-452A', power_kw: 10.0, gas: 'R-452A', temp_range: '-15/0°C', max_pipe_m: 30, max_height_m: 12, type: 'Split', rite_compliant: true },
  { brand: 'Zanotti', model: 'UME 112Z R-449A', power_kw: 4.0, gas: 'R-449A', temp_range: '-5/+10°C', max_pipe_m: 25, max_height_m: 10, type: 'Monobloc', rite_compliant: true },
  { brand: 'Zanotti', model: 'UME 215Z R-449A', power_kw: 7.5, gas: 'R-449A', temp_range: '-15/0°C', max_pipe_m: 30, max_height_m: 12, type: 'Monobloc', rite_compliant: true },
  // EMBRACO / SECOP
  { brand: 'Embraco', model: 'NTZ2131GK R-290', power_kw: 1.5, gas: 'R-290', temp_range: '-15/0°C', max_pipe_m: 10, max_height_m: 4, type: 'Hermético', rite_compliant: true },
  { brand: 'Embraco', model: 'VEMY3.5K R-290', power_kw: 3.5, gas: 'R-290', temp_range: '-5/+10°C', max_pipe_m: 15, max_height_m: 5, type: 'Hermético', rite_compliant: true },
  // RIVACOLD
  { brand: 'Rivacold', model: 'HCMN 2012Z R-449A', power_kw: 2.0, gas: 'R-449A', temp_range: '0/+10°C', max_pipe_m: 15, max_height_m: 5, type: 'Split', rite_compliant: true },
  { brand: 'Rivacold', model: 'HCMN 4012Z R-449A', power_kw: 4.0, gas: 'R-449A', temp_range: '-5/+5°C', max_pipe_m: 20, max_height_m: 8, type: 'Split', rite_compliant: true },
  { brand: 'Rivacold', model: 'HCMN 6012Z R-449A', power_kw: 6.0, gas: 'R-449A', temp_range: '-10/0°C', max_pipe_m: 25, max_height_m: 10, type: 'Split', rite_compliant: true },
  { brand: 'Rivacold', model: 'HCMN 10012Z R-449A', power_kw: 10.0, gas: 'R-449A', temp_range: '-20/-5°C', max_pipe_m: 30, max_height_m: 12, type: 'Split', rite_compliant: true },
  // PROFROID / Lennox
  { brand: 'Lennox', model: 'LCHG-010 R-454C', power_kw: 4.5, gas: 'R-454C', temp_range: '-5/+10°C', max_pipe_m: 20, max_height_m: 8, type: 'Split', rite_compliant: true },
  { brand: 'Lennox', model: 'LCHG-020 R-454C', power_kw: 9.0, gas: 'R-454C', temp_range: '-15/0°C', max_pipe_m: 30, max_height_m: 12, type: 'Split', rite_compliant: true },
  // POLAIR / Eurocold
  { brand: 'Polair', model: 'SM050S R-290', power_kw: 1.8, gas: 'R-290', temp_range: '0/+10°C', max_pipe_m: 10, max_height_m: 4, type: 'Monobloc', rite_compliant: true },
  { brand: 'Polair', model: 'SM105S R-290', power_kw: 3.2, gas: 'R-290', temp_range: '-5/+5°C', max_pipe_m: 15, max_height_m: 5, type: 'Monobloc', rite_compliant: true },
];

const ALL_BRANDS_CLIMA = ['Todos', ...new Set(CLIMATE_CATALOG.map(e => e.brand))];
const ALL_BRANDS_COLD = ['Todos', ...new Set(COLD_ROOM_CATALOG.map(e => e.brand))];

// ─── Badge de cumplimiento ─────────────────────────────────────────────────────
function ComplianceBadge({ equipment }) {
  const comp = evaluateCompliance(equipment);
  const cfg = {
    ok:      { icon: CheckCircle, cls: 'bg-green-100 text-green-700 border-green-200', label: 'RITE+FGAS ✓' },
    warning: { icon: AlertTriangle, cls: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Verificar' },
    error:   { icon: XCircle, cls: 'bg-red-100 text-red-700 border-red-200', label: 'No conforme' },
  }[comp.status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${cfg.cls}`}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

// ─── Panel de normativa ────────────────────────────────────────────────────────
function NormativePanel({ onClose }) {
  const [updating, setUpdating] = useState(false);
  const [normInfo, setNormInfo] = useState(null);

  const fetchNormative = async () => {
    setUpdating(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Eres un experto técnico en refrigeración y climatización en España.
      Dame un resumen ACTUALIZADO y CONCISO (máx 300 palabras) de las normativas VIGENTES EN 2026 para instaladores:
      1. RITE 2026 (Real Decreto de Instalaciones Térmicas): requisitos de eficiencia energética, EER mínimo, SCOP mínimo, clase energética mínima
      2. Reglamento F-GAS 2024/573 (UE): restricciones GWP desde 2025-2026-2030, gases prohibidos en nuevas instalaciones
      3. Qué gases están PERMITIDOS y cuáles están PROHIBIDOS o en fase-out en nuevas instalaciones ≤ 12kW y > 12kW
      4. Certificaciones obligatorias para el instalador (F-GAS Categoría I/II, RITE)
      Formato: secciones breves con emojis, datos concretos (GWP, fechas, valores EER/SCOP).`,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
    });
    setNormInfo(res);
    setUpdating(false);
  };

  useEffect(() => { fetchNormative(); }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b bg-blue-50 rounded-t-xl">
          <div>
            <h3 className="font-bold text-blue-800">Normativa RITE + F-GAS 2026</h3>
            <p className="text-xs text-blue-600">Actualización automática desde fuentes oficiales</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={fetchNormative} disabled={updating} className="gap-1 text-xs">
              <RefreshCw className={`w-3 h-3 ${updating ? 'animate-spin' : ''}`} /> Actualizar
            </Button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg font-bold">×</button>
          </div>
        </div>
        <div className="overflow-y-auto p-4 flex-1">
          {updating && !normInfo && (
            <div className="flex items-center gap-2 text-blue-600 text-sm">
              <RefreshCw className="w-4 h-4 animate-spin" /> Consultando normativa actualizada...
            </div>
          )}
          {normInfo && (
            <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{typeof normInfo === 'string' ? normInfo : JSON.stringify(normInfo)}</div>
          )}
        </div>
        <div className="p-3 border-t bg-gray-50 rounded-b-xl text-xs text-gray-400 text-center">
          Información orientativa — verificar siempre con fuentes oficiales BOE/IDAE
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────
export default function EquipmentSelector({ mode = 'clima', loadKW, onSelect }) {
  const catalog = mode === 'clima' ? CLIMATE_CATALOG : COLD_ROOM_CATALOG;
  const allBrands = mode === 'clima' ? ALL_BRANDS_CLIMA : ALL_BRANDS_COLD;

  const [brandFilter, setBrandFilter] = useState('Todos');
  const [showAll, setShowAll] = useState(false);
  const [showNorm, setShowNorm] = useState(false);
  const [selected, setSelected] = useState(null);

  // Filtrar equipos compatibles con la carga calculada
  const minKW = loadKW ? loadKW * 0.85 : 0;
  const maxKW = loadKW ? loadKW * 2.5 : 999;

  const compatible = catalog.filter(e => {
    const brandOk = brandFilter === 'Todos' || e.brand === brandFilter;
    const powerOk = e.power_kw >= minKW && e.power_kw <= maxKW;
    return brandOk && powerOk;
  }).sort((a, b) => {
    // Primero los que cumplen normativa, luego por potencia
    const ca = evaluateCompliance(a);
    const cb = evaluateCompliance(b);
    if (ca.status !== cb.status) {
      return ca.status === 'ok' ? -1 : cb.status === 'ok' ? 1 : 0;
    }
    return a.power_kw - b.power_kw;
  });

  const visible = showAll ? compatible : compatible.slice(0, 4);

  const handleSelect = (eq) => {
    setSelected(eq.model);
    onSelect && onSelect(eq);
  };

  return (
    <div className="space-y-3">
      {/* Cabecera con filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue placeholder="Todos los fabricantes" />
          </SelectTrigger>
          <SelectContent>
            {allBrands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
        {loadKW && (
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            Carga: <strong>{loadKW.toFixed(1)} kW</strong> — mostrando equipos compatibles
          </span>
        )}
        <button
          onClick={() => setShowNorm(true)}
          className="ml-auto flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded border border-blue-200 transition-colors"
        >
          <Info className="w-3 h-3" /> Normativa 2026
        </button>
      </div>

      {/* Conteo */}
      {loadKW && (
        <p className="text-xs text-gray-500">{compatible.length} equipo{compatible.length !== 1 ? 's' : ''} compatible{compatible.length !== 1 ? 's' : ''} encontrado{compatible.length !== 1 ? 's' : ''}</p>
      )}

      {/* Lista de equipos */}
      {compatible.length === 0 ? (
        <div className="text-center py-6 text-gray-400 text-sm">
          No hay equipos de <strong>{brandFilter}</strong> para esta potencia.<br/>
          Prueba con "Todos" los fabricantes.
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((eq, idx) => {
            const comp = evaluateCompliance(eq);
            const isSelected = selected === eq.model;
            const isFirst = idx === 0 && !selected;
            return (
              <div
                key={`${eq.brand}-${eq.model}`}
                onClick={() => handleSelect(eq)}
                className={`rounded-lg border p-3 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : isFirst && loadKW
                    ? 'border-green-400 bg-green-50 hover:shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {(isFirst && loadKW && !selected) && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-600 text-white">⭐ Mejor opción</span>
                      )}
                      {isSelected && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-600 text-white">✓ Seleccionado</span>
                      )}
                      <span className="text-sm font-bold text-gray-900">{eq.brand}</span>
                      <span className="text-xs text-gray-500 truncate">{eq.model}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <ComplianceBadge equipment={eq} />
                      {eq.class && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold">
                          Clase {eq.class}
                        </span>
                      )}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border">{eq.type}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200 font-mono">{eq.gas}</span>
                      {eq.temp_range && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">{eq.temp_range}</span>
                      )}
                    </div>
                    {comp.issues.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {comp.issues.map((issue, i) => (
                          <span key={i} className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">{issue}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-gray-800">{eq.power_kw} kW</p>
                    {eq.eer && <p className="text-[10px] text-gray-400">EER {eq.eer}</p>}
                    {eq.scop && <p className="text-[10px] text-gray-400">SCOP {eq.scop}</p>}
                    <p className="text-[10px] text-gray-400">≤{eq.max_pipe_m}m</p>
                  </div>
                </div>
              </div>
            );
          })}

          {compatible.length > 4 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full text-xs text-blue-600 hover:text-blue-800 py-2 flex items-center justify-center gap-1 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
            >
              {showAll ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showAll ? 'Ver menos' : `Ver ${compatible.length - 4} más`}
            </button>
          )}
        </div>
      )}

      {showNorm && <NormativePanel onClose={() => setShowNorm(false)} />}
    </div>
  );
}