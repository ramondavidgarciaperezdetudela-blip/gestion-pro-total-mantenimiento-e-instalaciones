// Pruebas del cálculo de cámara: node pruebas/calculo.test.mjs
import assert from 'node:assert/strict';
import { calcularCarga, entalpiaAire, valorarEquipo, evaporadorPara, recomendada, UNIDADES_CONDENSADORAS, COMPACTOS } from '../src/componentes/tema/calculoCamara.js';

const r = calcularCarga({});
assert.equal(Math.round(r.volumen * 10) / 10, 31.2);
assert.equal(Math.round(r.superficie * 10) / 10, 60.4);
assert.equal(r.partidas.find((p) => p.id === 'transmision').kwh, 12.18);
assert.equal(r.partidas.find((p) => p.id === 'producto').kwh, 7.6);
assert.ok(Math.abs(entalpiaAire(32, 60) - 78.3) < 0.5, 'entalpía exterior');
assert.ok(r.potenciaKw > 2.1 && r.potenciaKw < 2.3, 'potencia ' + r.potenciaKw);
assert.equal(Math.round((r.subtotal + r.margen) * 100) / 100, r.total);

assert.equal(valorarEquipo(2.0, 2.2).valoracion, 'No cubre');
assert.equal(valorarEquipo(2.4, 2.2).valoracion, 'Recomendada');
assert.equal(valorarEquipo(3.0, 2.2).valoracion, 'Válida, sobrada');
assert.equal(valorarEquipo(3.8, 2.2).valoracion, 'Sobredimensionada');

assert.equal(recomendada(UNIDADES_CONDENSADORAS, r.potenciaKw).modelo, 'UC-24');
assert.equal(recomendada(COMPACTOS, r.potenciaKw).modelo, 'CMP-26');
assert.equal(evaporadorPara({ kw: 2.4 }).modelo, 'EV-25');
assert.equal(evaporadorPara({ kw: 3.0 }).modelo, 'EV-32');

const grande = calcularCarga({ largo: 8, ancho: 6, alto: 3, entradaKg: 1500, almacenadoKg: 6000 });
assert.ok(grande.potenciaKw > r.potenciaKw * 2, 'una cámara mayor pide más potencia');

console.log('Cálculo de cámara: todas las pruebas correctas. Potencia de ejemplo', r.potenciaKw, 'kW');
