// Pruebas del motor técnico HVAC CMMS (src/lib/hvacCmms.js).
import {
  situacionFGas, calcularCargaTermica, calcularCiclo, diagnosticar, validarMediciones,
  planPreventivo, alertasCartera, sumarMeses, kwABtuh, aBarAbsoluto, capacidadSensibleAire,
} from '../src/lib/hvacCmms.js';
import { presionSaturacion, ATM, PSI_POR_BAR } from '../src/lib/saturacion.js';

let total = 0, fallos = 0;
const ok = (c, t, d = '') => { total++; if (!c) { fallos++; console.log('  ✗ ' + t + (d ? ' — ' + d : '')); } };
const cerca = (a, b, tol) => a != null && b != null && Math.abs(a - b) <= tol;

console.log('1. Gases fluorados (Reglamento UE 2024/573)');
let f = situacionFGas({ gas: 'R-410A', cargaKg: 2 });
ok(cerca(f.tco2e, 4.18, 0.01) && !f.aplica, 'R-410A 2 kg: 4,18 t CO₂e, sin control', JSON.stringify(f));
f = situacionFGas({ gas: 'R-410A', cargaKg: 3 });
ok(f.meses === 12, 'R-410A 3 kg (6,26 t): cada 12 meses', String(f.meses));
f = situacionFGas({ gas: 'R-410A', cargaKg: 3, conDetector: true });
ok(f.meses === 24, 'Con detección: cada 24 meses', String(f.meses));
f = situacionFGas({ gas: 'R-410A', cargaKg: 4, hermetico: true });
ok(!f.aplica, 'Hermético < 10 t CO₂e: exento', JSON.stringify(f));
f = situacionFGas({ gas: 'R-404A', cargaKg: 130 });
ok(f.meses === 3 && f.deteccionObligatoria, 'R-404A 130 kg (> 500 t): cada 3 meses y detección obligatoria', JSON.stringify(f));
f = situacionFGas({ gas: 'R-1234yf', cargaKg: 15 });
ok(f.meses === 6 && f.tco2e === 0, 'R-1234yf 15 kg: anexo II, cada 6 meses', JSON.stringify(f));
f = situacionFGas({ gas: 'R-454B', cargaKg: 33 });
ok(cerca(f.kgHfo, 10.26, 0.01) && f.meses === 6, 'R-454B 33 kg: 10,3 kg HFO → manda el anexo II (6 meses)', JSON.stringify(f));
f = situacionFGas({ gas: 'R-290', cargaKg: 0.3 });
ok(!f.aplica && /no es un gas fluorado/.test(f.motivo), 'R-290: fuera del reglamento');
f = situacionFGas({ gas: 'R-410A', cargaKg: '' });
ok(!f.aplica && f.tco2e === null, 'Carga vacía no se toma como cero');

console.log('2. Cálculo de carga térmica');
let c = calcularCargaTermica({ areaM2: 40, cargaSensibleW: 3600, cargaLatenteW: 900, factorSeguridad: 0.1 });
ok(cerca(c.requerido.totalKw, 4.95, 0.01), 'Total = (3,6 + 0,9) · 1,1 = 4,95 kW', String(c.requerido.totalKw));
ok(cerca(c.requerido.shr, 0.8, 0.01), 'SHR 0,80');
ok(cerca(c.requerido.totalBtuh, 16890, 5), '4,95 kW ≈ 16 890 Btu/h', String(c.requerido.totalBtuh));
ok(cerca(kwABtuh(3.517), 12000, 2), '1 TR = 12 000 Btu/h');
c = calcularCargaTermica({ areaM2: 40, cargaSensibleW: 3600, cargaLatenteW: 900, equipo: { capacidadTotalKw: 3.5 } });
ok(c.verificacion.veredicto === 'insuficiente' && !c.verificacion.cubreDemanda, 'Equipo de 3,5 kW: insuficiente');
c = calcularCargaTermica({ areaM2: 40, cargaSensibleW: 3600, cargaLatenteW: 900, equipo: { capacidadTotalKw: 5.3, capacidadSensibleKw: 4.2 } });
ok(c.verificacion.cubreDemanda && c.verificacion.veredicto === 'adecuado', 'Equipo de 5,3 kW (4,2 sensible): adecuado', JSON.stringify(c.verificacion));
c = calcularCargaTermica({ areaM2: 40, cargaSensibleW: 3600, equipo: { capacidadTotalKw: 9 } });
ok(c.verificacion.veredicto === 'sobredimensionado', 'Equipo de 9 kW: sobredimensionado');
c = calcularCargaTermica({ areaM2: 50, densidadSensibleWm2: 100, densidadLatenteWm2: 20, factorSeguridad: 0 });
ok(cerca(c.requerido.totalKw, 6, 0.001), 'Por densidades: 50 m² × 120 W/m² = 6 kW');
ok(!calcularCargaTermica({ areaM2: 30 }).ok, 'Sin carga sensible no calcula');
ok(cerca(capacidadSensibleAire(1800, 10), 6.04, 0.02), 'Q aire: 1800 m³/h y 10 K ≈ 6,0 kW');

console.log('3. Conversión de presiones');
ok(cerca(aBarAbsoluto(10, 'bar'), 11.013, 0.001), '10 bar manométricos → 11,01 abs');
ok(cerca(aBarAbsoluto(145.04, 'psi'), 11.013, 0.01), '145 psig → 11,01 bar abs');
ok(cerca(aBarAbsoluto(5, 'bar', 'absoluta'), 5, 1e-9), 'Absoluta se respeta');

console.log('4. Recalentamiento y subenfriamiento');
// R-410A: evaporación a 5 °C, condensación a 45 °C.
const pEv = presionSaturacion('R-410A', 5) - ATM;
const pCo = presionSaturacion('R-410A', 45, 'burbuja') - ATM;
const sano = {
  gas: 'R-410A', expansion: 'valvula', presionSuccion: pEv, presionDescarga: pCo,
  tLineaAspiracion: 11, tLineaLiquido: 39, tAireEvapEntrada: 26, tAireEvapSalida: 15,
  tAireCondEntrada: 33, tAireCondSalida: 42,
};
let k = calcularCiclo(sano);
ok(cerca(k.recalentamiento, 6, 0.2), 'SH = 11 − 5 = 6 K', String(k.recalentamiento));
ok(cerca(k.subenfriamiento, 6, 0.2), 'SC = 45 − 39 = 6 K', String(k.subenfriamiento));
ok(cerca(k.dtEvaporador, 11, 0.01) && cerca(k.dtCondensador, 9, 0.01), 'ΔT de aire en baterías');
// Lo mismo en psi da lo mismo.
k = calcularCiclo({ ...sano, unidadPresion: 'psi', presionSuccion: pEv * PSI_POR_BAR, presionDescarga: pCo * PSI_POR_BAR });
ok(cerca(k.recalentamiento, 6, 0.2), 'En psi, mismo recalentamiento');
// Mezcla zeótropa: rocío para SH, burbuja para SC.
const pE7 = presionSaturacion('R-407C', 2, 'rocio') - ATM;
const pC7 = presionSaturacion('R-407C', 40, 'burbuja') - ATM;
k = calcularCiclo({ ...sano, gas: 'R-407C', presionSuccion: pE7, presionDescarga: pC7, tLineaAspiracion: 8, tLineaLiquido: 35 });
ok(cerca(k.recalentamiento, 6, 0.2) && cerca(k.subenfriamiento, 5, 0.2), 'R-407C: SH con rocío y SC con burbuja', JSON.stringify(k));

console.log('5. Diagnóstico');
ok(validarMediciones({ gas: 'R-410A' }).length >= 8, 'Formulario vacío: exige todas las mediciones');
let d = diagnosticar(sano);
ok(d.ok && d.veredicto === 'FUNCIONAMIENTO_CORRECTO', 'Equipo sano', JSON.stringify(d.estados));
// Falta de carga: evapora a −3 °C, SH 18 K, SC 1 K, poco salto de aire.
d = diagnosticar({ ...sano, presionSuccion: presionSaturacion('R-410A', -3) - ATM, tLineaAspiracion: 15,
  presionDescarga: presionSaturacion('R-410A', 40, 'burbuja') - ATM, tLineaLiquido: 39, tAireEvapSalida: 20 });
ok(d.veredicto === 'FALTA_CARGA', 'Falta de carga detectada', d.veredicto + ' ' + JSON.stringify(d.estados));
// Exceso de carga: SH 2 K, SC 14 K, condensa a 55 °C con 33 °C fuera.
d = diagnosticar({ ...sano, presionSuccion: presionSaturacion('R-410A', 9) - ATM, tLineaAspiracion: 11,
  presionDescarga: presionSaturacion('R-410A', 55, 'burbuja') - ATM, tLineaLiquido: 41 });
ok(d.veredicto === 'EXCESO_CARGA', 'Exceso de carga detectado', d.veredicto + ' ' + JSON.stringify(d.estados));
// Descarga menor que succión: error de latiguillos.
d = diagnosticar({ ...sano, presionSuccion: presionSaturacion('R-410A', 5) - ATM, tLineaAspiracion: 11,
  presionDescarga: presionSaturacion('R-410A', 55, 'burbuja') - ATM, tLineaLiquido: 41 });
ok(d.veredicto === 'NO_CONDENSABLES', 'No condensables: alta y SC alto con SH normal', d.veredicto);
ok(!diagnosticar({ ...sano, presionDescarga: 1 }).ok, 'Latiguillos cambiados: no diagnostica');
d = diagnosticar(sano, { presionNominalBaja: pEv * 1.4, presionNominalAlta: pCo });
ok(d.avisos.some((a) => /nominales/.test(a)), 'Compara con presiones nominales de la ficha');

console.log('6. Plan preventivo y alertas');
ok(sumarMeses('2026-01-31', 1) === '2026-02-28', 'Suma de meses recorta a fin de mes');
const hoy = new Date(2026, 9, 31);
const activo = { id: 'a1', name: 'Split oficina', refrigerant_type: 'R-410A', refrigerant_charge_kg: 3.5,
  installation_date: '2024-05-10', last_leak_check_date: '2025-10-15', maintenance_interval_months: 6, last_maintenance_date: '2026-06-01' };
const p = planPreventivo(activo, hoy);
const fugas = p.tareas.find((t) => t.codigo === 'CONTROL_FUGAS');
ok(fugas && fugas.proxima === '2026-10-15' && fugas.estado === 'vencida', 'Control de fugas vencido el 15/10/2026', JSON.stringify(fugas));
const prev = p.tareas.find((t) => t.codigo === 'PREVENTIVO_GENERAL');
ok(prev.proxima === '2026-12-01' && prev.estado === 'en_plazo', 'Preventivo general en plazo', JSON.stringify(prev));
const al = alertasCartera([activo, { id: 'b', name: 'Split casa', refrigerant_type: 'R-32', refrigerant_charge_kg: 1, last_maintenance_date: '2026-10-01', maintenance_interval_months: 12 }], hoy);
ok(al.length === 1 && al[0].codigo === 'CONTROL_FUGAS', 'Solo alerta lo vencido o próximo', JSON.stringify(al));

console.log(`\n${total - fallos}/${total} pruebas correctas`);
process.exit(fallos ? 1 : 0);
