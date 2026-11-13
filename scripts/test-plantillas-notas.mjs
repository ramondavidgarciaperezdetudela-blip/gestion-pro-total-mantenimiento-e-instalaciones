import assert from 'node:assert/strict';
import { elegirPlantillas, textoPlantilla, huecosSinRellenar, urlBusquedaModelo, motivoIA, PLANTILLAS } from '../src/lib/plantillasNotas.js';
assert.equal(elegirPlantillas('avisar de que cerramos en agosto por vacaciones')[0].id, 'vacaciones');
assert.equal(elegirPlantillas('subida de precios por el IPC')[0].id, 'precios');
assert.equal(elegirPlantillas('revisión de los filtros del aire')[0].id, 'mantenimiento');
assert.equal(elegirPlantillas('zzz qqq')[0].id, 'general');           // nunca devuelve vacío
assert.equal(elegirPlantillas('')[0].id, 'general');
assert.ok(elegirPlantillas('vacaciones precios', 2).length === 2);
assert.ok(textoPlantilla(PLANTILLAS[0], { company_name: 'Frío SL' }).includes('Frío SL'));
assert.ok(!textoPlantilla(PLANTILLAS[3], null).includes('{empresa}'));
assert.ok(huecosSinRellenar(textoPlantilla(PLANTILLAS[0], {})).length >= 3);
assert.equal(huecosSinRellenar('Todo listo, gracias.').length, 0);
for (const p of PLANTILLAS) assert.ok(p.cuerpo.length > 80 && p.titulo, p.id);
assert.ok(urlBusquedaModelo('cierre agosto').startsWith('https://www.google.com/search?q='));
assert.match(motivoIA(new Error('Failed to fetch'), 'ollama'), /Ollama/);
assert.match(motivoIA(new Error('401 invalid api key'), 'anthropic'), /clave/);
console.log('plantillas-notas OK');
