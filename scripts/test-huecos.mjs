import {
  encajarEnPared, huecosDePared, anchoHueco, anguloPared, colocarEnPared, anchoDePared, paredCercana, posicionEnPared, esHueco, estaEnPared,
} from '../src/lib/planoHuecos.js';

let fallos = 0, n = 0;
const ok = (c, t, d = '') => { n++; if (!c) { fallos++; console.log('  ✗ ' + t + (d ? ' — ' + d : '')); } };
const cerca = (a, b, e = 0.01) => Math.abs(a - b) <= e;

// Cámara de 4 × 3 m a 50 px/m con esquina en (100,100)
const S = 50;
const cam = { camara: true, espesor_mm: 100, room_id: 'r1', room_x: 100, room_y: 100, room_w_m: 4, room_h_m: 3 };
const walls = [
  { ...cam, id: 'N', x1: 100, y1: 100, x2: 300, y2: 100 },
  { ...cam, id: 'E', x1: 300, y1: 100, x2: 300, y2: 250 },
  { ...cam, id: 'S', x1: 300, y1: 250, x2: 100, y2: 250 },   // dibujada de derecha a izquierda
  { ...cam, id: 'O', x1: 100, y1: 250, x2: 100, y2: 100 },
];
const puerta = { id: 'p', type: 'puerta', x: 190, y: 112, w_m: 1, h_m: 0.15, datos: { ancho_cm: 90 } };

ok(esHueco(puerta) && !esHueco({ type: 'evaporador' }), 'reconoce puertas y ventanas');
ok(cerca(anchoHueco(puerta), 0.9), 'el ancho sale del «Ancho (cm)» de la ficha');
ok(cerca(anchoHueco({ type: 'puerta', w_m: 1.2 }), 1.2), 'sin ficha, el del icono');

const p1 = encajarEnPared(puerta, walls, S, { orientar: true });
ok(p1 && p1.y === 100, 'se pega a la pared norte', JSON.stringify(p1));
ok(p1.rot === 0 && cerca(p1.w_m, 0.9), 'gira como la pared y toma su ancho');
ok(p1.h_m === 0.1, 'toma el espesor del panel');
ok(p1.pared_id === 'N', 'recuerda su pared');
ok(p1.flip_y === true, 'en la pared norte la hoja abre hacia dentro (abajo en pantalla)', String(p1.flip_y));

const p2 = encajarEnPared({ ...puerta, x: 102, y: 180 }, walls, S);
ok(p2.pared_id === 'O' && p2.x === 100, 'pared oeste: x clavada a la pared');
ok(p2.rot === 90 || p2.rot === -90, 'pared vertical: giro 90°', String(p2.rot));
ok(p2.y >= 100 + 0.45 * S - 0.01 && p2.y <= 250 - 0.45 * S + 0.01, 'sin salirse por los extremos');

const p3 = encajarEnPared({ ...puerta, x: 297, y: 104 }, walls, S);
ok(p3.pared_id === 'N' || p3.pared_id === 'E', 'esquina: elige una pared');
ok(p3.x <= 300 - 0.45 * S + 0.01 || p3.pared_id === 'E', 'en la esquina no se sale de la pared');

const p4 = encajarEnPared({ ...puerta, x: 200, y: 180 }, walls, S);
ok(p4 === null, 'lejos de toda pared no se encaja');

const pS = encajarEnPared({ ...puerta, x: 200, y: 248 }, walls, S);
ok(pS.pared_id === 'S' && cerca(pS.rot, 0), 'pared dibujada al revés: el símbolo no sale boca abajo', JSON.stringify(pS));

const ancha = encajarEnPared({ ...puerta, datos: { ancho_cm: 900 } }, walls, S);
ok(ancha.w_m <= 4, 'si no cabe, se estrecha');

ok(anguloPared(1, 0) === 0 && anguloPared(-1, 0) === 0 && anguloPared(0, 1) === 90 && anguloPared(0, -1) === 90, 'ángulos normalizados');

// Huecos de una pared
const colocada = { ...puerta, ...p1 };
const ventana = { id: 'v', type: 'ventana', x: 250, y: 100, rot: 0, w_m: 1, datos: { ancho_cm: 100 }, pared_id: 'N' };
const hs = huecosDePared(walls[0], [colocada, ventana, { id: 'x', type: 'evaporador', x: 150, y: 100 }], S, walls);
ok(hs.length === 2, 'dos huecos en la pared norte', String(hs.length));
ok(cerca(hs[0].t1 - hs[0].t0, 0.9) && hs[0].z0 === 0 && hs[0].z1 > 1.9, 'puerta: 0,9 m de ancho, desde el suelo');
ok(hs[1].z0 === 0.9, 'ventana: antepecho a 0,9 m');
ok(huecosDePared(walls[2], [colocada], S, walls).length === 0, 'una puerta de otra pared no corta ésta');

// Mover y ajustar
const mov = colocarEnPared(colocada, walls[0], 0.1, S);
ok(mov.x >= 100 + 0.45 * S - 0.01, 'colocarEnPared no se sale por el principio', String(mov.x));
const todo = anchoDePared(colocada, walls[0], S);
ok(cerca(todo.w_m, 3.9) && todo.x === 200, 'ajustar al ancho de la pared (4 m − márgenes) y centrar', JSON.stringify(todo));
ok(cerca(posicionEnPared({ x: 200, y: 100 }, walls[0], S), 2), 'posición desde el extremo');
ok(paredCercana(200, 300, walls, 20) === null, 'paredCercana respeta el límite');
ok(estaEnPared(colocada, walls, S) && !estaEnPared({ ...puerta, x: 200, y: 180, pared_id: undefined }, walls, S), 'asentada / suelta');

console.log(fallos ? `${n} comprobaciones, ${fallos} FALLOS` : `${n} comprobaciones, 0 fallos`);
process.exit(fallos ? 1 : 0);
