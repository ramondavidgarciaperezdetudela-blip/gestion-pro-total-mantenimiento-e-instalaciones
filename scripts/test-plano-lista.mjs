import { reescalarPlano, escalaEnPapel, textoEscala, listaDelPlano, hojaMateriales, materialesCSV } from '../src/lib/planoLista.js';
import { longitudConexion } from '../src/lib/planoCalculo.js';
let total = 0, fallos = 0;
const ok = (c, t, d = '') => { total++; if (!c) { fallos++; console.log('  ✗ ' + t + (d ? ' — ' + d : '')); } };
const cerca = (a, b, e = 0.001) => Math.abs(a - b) < e;

// Una cámara 4×3 m a 50 px/m, un condensador fuera, una puerta, una tubería con un codo.
const walls = [
  { id: 'w1', room_id: 'r1', camara: true, tipo: 'negativa', suelo: true, espesor_mm: 100, alto_m: 2.5, room_x: 100, room_y: 100, room_w_m: 4, room_h_m: 3, x1: 100, y1: 100, x2: 300, y2: 100 },
  { id: 'w2', room_id: 'r1', camara: true, tipo: 'negativa', suelo: true, espesor_mm: 100, alto_m: 2.5, room_x: 100, room_y: 100, room_w_m: 4, room_h_m: 3, x1: 300, y1: 100, x2: 300, y2: 250 },
  { id: 'w3', room_id: 'r1', camara: true, tipo: 'negativa', suelo: true, espesor_mm: 100, alto_m: 2.5, room_x: 100, room_y: 100, room_w_m: 4, room_h_m: 3, x1: 300, y1: 250, x2: 100, y2: 250 },
  { id: 'w4', room_id: 'r1', camara: true, tipo: 'negativa', suelo: true, espesor_mm: 100, alto_m: 2.5, room_x: 100, room_y: 100, room_w_m: 4, room_h_m: 3, x1: 100, y1: 250, x2: 100, y2: 100 },
  { id: 'w5', material: 'ladrillo', espesor_mm: 110, alto_m: 2.6, x1: 400, y1: 100, x2: 500, y2: 100 },
];
const elements = [
  { id: 'e1', type: 'condensador', cat: 'refrigeracion', x: 400, y: 300, w_m: 1.2, h_m: 0.8, datos: { marca: 'Zanotti', referencia: 'GMS150' } },
  { id: 'e2', type: 'evaporador_camara', cat: 'refrigeracion', x: 200, y: 150, w_m: 1, h_m: 0.5, datos: {} },
  { id: 'e3', type: 'camara_puerta', cat: 'estructura', x: 200, y: 250, w_m: 1, h_m: 0.15, rot: 0, datos: { ancho_cm: 100 } },
  { id: 'e4', type: 'cota', x: 100, y: 50, datos: { x2: 300, y2: 50 } },
];
const connections = [
  { id: 'c1', type: 'refrigerante', from_id: 'e1', to_id: 'e2', path: [{ x: 400, y: 150 }], gas_diameter: '5/8"', liquid_diameter: '3/8"' },
  { id: 'c2', type: 'refrigerante', from_id: 'e1', to_id: 'e2', path: [], gas_diameter: '', liquid_diameter: '' },
  { id: 'c3', type: 'electrica', from_id: 'e1', to_id: 'e2', path: [], section_mm2: 4, power_w: 2000 },
];

console.log('1. Cambio de escala: el dibujo mantiene sus medidas reales');
const antes = longitudConexion(connections[0], elements, 50);
const r = reescalarPlano({ walls, elements, connections }, 50, 100);
const despues = longitudConexion(r.connections[0], r.elements, 100);
ok(cerca(antes, despues), 'la tubería mide lo mismo en metros', `${antes} vs ${despues}`);
ok(cerca(Math.hypot(r.walls[0].x2 - r.walls[0].x1, r.walls[0].y2 - r.walls[0].y1) / 100, 4), 'la pared de 4 m sigue midiendo 4 m');
ok(r.walls[0].room_x === 200 && r.elements[0].x === 800 && r.connections[0].path[0].x === 800, 'coordenadas ×2');
ok(r.walls[0].room_w_m === 4 && r.elements[0].w_m === 1.2, 'las medidas en metros no se tocan');
ok(r.elements[3].datos.x2 === 600, 'la cota también se reescala');
const igual = reescalarPlano({ walls, elements, connections }, 50, 50);
ok(igual.walls === walls, 'misma escala: no hace nada');
ok(reescalarPlano({ walls, elements, connections }, 0, 50).walls === walls, 'escala inválida: no hace nada');
ok(walls[0].x2 === 300 && elements[0].x === 400, 'no modifica el original');
const ida = reescalarPlano(r, 100, 50);
ok(cerca(ida.walls[0].x2, 300) && cerca(ida.elements[0].x, 400), 'ida y vuelta: queda igual');

console.log('2. Escala bajo el plano');
const t = textoEscala({ walls, elements, connections, scale: 50, zoom: 1.5, gridMeters: 0.5 });
ok(/50 px por metro/.test(t.dibujo) && /0,5 m/.test(t.dibujo) && /150 %/.test(t.dibujo), 'texto de dibujo', t.dibujo);
ok(t.a3 !== null && t.a4 >= t.a3, 'A4 necesita escala igual o menor que A3', `${t.a3} ${t.a4}`);
ok(escalaEnPapel({ walls: [], elements: [], connections: [], scale: 50 }) === null, 'sin dibujo no hay escala');
const gr = escalaEnPapel({ walls: [{ x1: 0, y1: 0, x2: 5000, y2: 0 }], elements: [], connections: [], scale: 50 }, 'a3');
ok(gr > t.a3, 'un plano más grande exige escala mayor', `${gr} vs ${t.a3}`);

console.log('3. Lista del plano');
const lista = listaDelPlano({ walls, elements, connections, scale: 50 });
const por = Object.fromEntries(lista.map((g) => [g.grupo, g.items]));
ok(por['Cámaras y salas']?.length === 1 && por['Cámaras y salas'][0].id === 'w1', 'la cámara se selecciona por su primera pared');
ok(/negativa/.test(por['Cámaras y salas'][0].etiqueta) && /4 × 3 m/.test(por['Cámaras y salas'][0].detalle), 'etiqueta y medidas de la cámara');
ok(por['Puertas y ventanas']?.length === 1 && por['Puertas y ventanas'][0].id === 'e3' && /1 × 2 m/.test(por['Puertas y ventanas'][0].detalle), 'la puerta sale aparte, con sus medidas');
ok(por['Equipos']?.length === 2 && por['Equipos'].some((i) => /Zanotti GMS150/.test(i.detalle)), 'equipos con marca y referencia');
ok(por['Conexiones']?.length === 3, 'tres conexiones');
ok(por['Paredes']?.length === 1 && por['Paredes'][0].id === 'w5' && /2 m/.test(por['Paredes'][0].detalle), 'las paredes de la cámara no se repiten; la suelta sí');
ok(por['Cotas y dibujo']?.length === 1, 'cotas aparte');
ok(lista.flatMap((g) => g.items).every((i) => i.id), 'todo tiene id para seleccionar');
ok(listaDelPlano({}).length === 0, 'plano vacío: lista vacía');

console.log('4. Hoja de materiales');
const hoja = hojaMateriales({ walls, elements, connections, scale: 50 });
const sec = Object.fromEntries(hoja.map((s) => [s.id, s]));
ok(sec.tuberia && sec.tramos && sec.electrica && sec.paneles && sec.equipos && sec.paredes, 'salen todos los apartados');
const gas = sec.tuberia.filas.find((f) => f[0].startsWith('Aspiración'));
const liq = sec.tuberia.filas.find((f) => f[0] === 'Líquido');
ok(gas && gas[1] === '5/8"' && liq && liq[1] === '3/8"', 'tubería por diámetro');
ok(cerca(gas[3], redondea1(antes)) && gas[4] === 1 && gas[5] === Math.ceil(antes * 1.1), 'metros, codos y pedido con 10 %', JSON.stringify(gas));
ok(sec.tuberia.filas.some((f) => f[0] === 'Sin diámetro asignado'), 'avisa de tuberías sin diámetro');
ok(/sin diámetro/.test(sec.tuberia.nota), 'la nota lo recuerda');
const pan = sec.paneles.filas[0];
ok(pan[3] === 35 && pan[4] === 12 && pan[5] === 12 && pan[6] === 59, 'paneles: 14 m × 2,5 = 35 + techo 12 + suelo 12', JSON.stringify(pan));
ok(sec.lados.filas.length === 4 && sec.lados.filas[0][2] === 4, 'medida de cada pared');
const door = sec.equipos.filas.find((f) => /puerta/i.test(f[0]));
ok(door && door[1] === 1 && /1 × 2 m/.test(door[2]), 'puerta con su hueco');
ok(!sec.equipos.filas.some((f) => /cota/i.test(f[0])), 'las cotas no son material');
ok(sec.electrica.filas[0][0] === '4 mm²' && sec.electrica.filas[0][3] === 2000, 'eléctrica por sección');
// la hoja cambia con la escala si el dibujo NO se reescala (y no cambia si sí)
const hoja2 = hojaMateriales({ ...reescalarPlano({ walls, elements, connections }, 50, 100), scale: 100 });
ok(JSON.stringify(hoja2.find((s) => s.id === 'paneles').filas) === JSON.stringify(sec.paneles.filas), 'tras reescalar, los materiales salen iguales');
ok(hoja2.find((s) => s.id === 'tuberia').filas[0][3] === sec.tuberia.filas[0][3], 'y la tubería también');
ok(hojaMateriales({}).length === 0, 'plano vacío: sin hoja');

console.log('5. CSV');
const csv = materialesCSV(hoja, 'Plano de prueba');
ok(csv.startsWith('﻿') && csv.includes('Tubería frigorífica (cobre)') && /;/.test(csv), 'CSV con separador «;» y BOM');
ok(csv.includes('Líquido;3/8"'.replace('"', '""')) || csv.includes('"3/8"""'), 'comillas de pulgadas escapadas');

console.log('6. Desagüe de condensados');
const els6 = [{ id: 'a', type: 'split_pared', x: 0, y: 0 }, { id: 'b', type: 'bomba_condensados', x: 100, y: 0 }];
const h6 = hojaMateriales({ walls: [], elements: els6, scale: 50, connections: [{ id: 'd1', type: 'desague', from_id: 'a', to_id: 'b', path: [], drain_diameter: '16' }] });
const s6 = h6.find((x) => x.id === 'desague');
ok(s6 && s6.filas[0][0] === 'Tubo Ø16 mm' && cerca(s6.filas[0][2], 2), 'el desagüe sale en la hoja de materiales con sus metros', JSON.stringify(s6));

function redondea1(n) { return Math.round(n * 100) / 100; }
console.log(`${total - fallos}/${total} correctas`);
process.exit(fallos ? 1 : 0);
