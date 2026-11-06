import { tipoDeEquipo, potenciaDe, conexionesDeTexto, analizarEquipo, planDeMaterial, buscarMaterial, diametroDeMm, recordarConexiones } from '../src/lib/tuberiaEquipos.js';
let total = 0, fallos = 0;
const ok = (c, t, d = '') => { total++; if (!c) { fallos++; console.log('  ✗ ' + t + (d ? ' — ' + d : '')); } };
const c = (s) => { const r = conexionesDeTexto(s); return r ? `${r.liquido.pulg}|${r.aspiracion.pulg}` : null; };

console.log('1. ¿Es equipo?');
ok(tipoDeEquipo('Split inverter 12000 BTU Daikin') === 'clima', 'split = clima');
ok(tipoDeEquipo('Unidad condensadora ZANOTTI GMS 2 HP') === 'industrial', 'condensadora Zanotti = industrial');
ok(tipoDeEquipo('INTARCON IMS 4 CV R-449A') === 'industrial', 'marca + potencia = industrial');
ok(tipoDeEquipo('Evaporador cámara 3,5 kW') === 'industrial', 'evaporador');
ok(tipoDeEquipo('Cassette 4 vías 18000 BTU') === 'clima', 'cassette');
ok(tipoDeEquipo('Tubo cobre 3/8" para split') === null, 'tubo no es equipo');
ok(tipoDeEquipo('Kit de instalación split 3 m') === null, 'kit instalación no es equipo');
ok(tipoDeEquipo('Válvula Danfoss 3/8"') === null, 'válvula Danfoss no es equipo');
ok(tipoDeEquipo('Mano de obra instalación') === null, 'mano de obra no');
ok(tipoDeEquipo('Soporte de pared para unidad exterior') === null, 'soporte no');
ok(tipoDeEquipo('Split mural con kit wifi 9000 BTU') === 'clima', 'split con «kit» al final sigue siendo equipo');

console.log('2. Potencia');
ok(potenciaDe('Split 12.000 BTU').btu === 12000, '12.000 BTU');
ok(Math.abs(potenciaDe('Split 12000 btu').kw - 3.52) < 0.01, 'BTU → kW');
ok(potenciaDe('Unidad 2,5 CV').hp === 2.5, 'CV con coma');
ok(potenciaDe('Evaporador 3,5 kW').kw === 3.5, 'kW');
ok(Math.abs(potenciaDe('Split 3000 frigorías').kw - 3.49) < 0.01, 'frigorías');
ok(potenciaDe('Split 18000').btu === 18000, 'Split 18000 suelto');

console.log('3. Conexiones escritas');
ok(c('Unidad ... conexiones 1/4" - 3/8"') === '1/4"|3/8"', 'par con guion');
ok(c('Líquido 3/8" Aspiración 5/8"') === '3/8"|5/8"', 'etiquetado');
ok(c('Líquido 3/8 Gas 1 1/8') === '3/8"|1 1/8"', 'sin comillas y 1 1/8');
ok(c('Tuberías Ø 6,35/12,7 mm') === '1/4"|1/2"', 'métrico con Ø');
ok(c('Conexiones 10-16 mm') === '3/8"|5/8"', 'nominal europeo 10-16');
ok(c('Split inverter 12000 BTU blanco') === null, 'sin conexiones: null');
ok(c('Aspiración 5/8" Líquido 3/8"') === '3/8"|5/8"', 'orden invertido');
ok(diametroDeMm(9.52).pulg === '3/8"' && diametroDeMm(16).pulg === '5/8"' && diametroDeMm(30) === null, 'mm → pulgadas');

console.log('4. Análisis');
let a = analizarEquipo({ description: 'Split 12000 BTU conexiones 1/4" - 3/8"' });
ok(a.origen === 'descripcion' && a.tipo === 'clima', 'prefiere lo escrito');
a = analizarEquipo({ description: 'Split inverter 12000 BTU' });
ok(a.origen === 'potencia' && a.conexiones.liquido.pulg === '1/4"' && a.conexiones.aspiracion.pulg === '3/8"', '12000 BTU → 1/4 - 3/8');
a = analizarEquipo({ description: 'Split 24000 BTU' });
ok(a.conexiones.liquido.pulg === '3/8"' && a.conexiones.aspiracion.pulg === '5/8"', '24000 BTU → 3/8 - 5/8');
a = analizarEquipo({ description: 'Unidad condensadora Zanotti 3 HP' });
ok(a.tipo === 'industrial' && a.conexiones.liquido.pulg === '1/2"' && a.conexiones.aspiracion.pulg === '7/8"', '3 HP industrial');
a = analizarEquipo({ description: 'Unidad condensadora sin potencia' });
ok(a && a.conexiones === null && a.origen === null, 'sin dato: pide elegir');
a = analizarEquipo({ description: 'Multisplit 2x1 18000 BTU' });
ok(a.avisos.some((x) => /multisplit/i.test(x)), 'avisa del multisplit');
a = analizarEquipo({ description: 'Unidad condensadora baja temperatura congelación 4 HP' });
ok(a.avisos.some((x) => /baja temperatura/i.test(x)), 'avisa de baja temperatura');
ok(analizarEquipo({ description: 'Codo cobre 3/8' }) === null, 'accesorio: null');
recordarConexiones('XYZ-1', { pulg: '1/2"', mm: 12.7 }, { pulg: '7/8"', mm: 22.22 }); // sin localStorage en node: no debe romper
ok(true, 'recordar no rompe sin almacenamiento');

console.log('5. Material');
const l = diametroDeMm(9.52), s = diametroDeMm(15.88);
const plan = planDeMaterial({ liquido: l, aspiracion: s, metros: 6, codos: 3, uniones: 2, unidades: 2 });
ok(plan.find((p) => p.clave === 'tubo-liq').cantidad === 12, '6 m × 2 equipos');
ok(plan.find((p) => p.clave === 'codo-asp').cantidad === 6, 'codos × equipos');
ok(plan.filter((p) => p.marcado).length === 8 && !plan.find((p) => p.clave === 'soldadura').marcado, 'opcionales sin marcar');
const base = [
  { description: 'Tubo cobre frigorífico 3/8 rollo', unit_price: 6.2, reference: 'T38' },
  { description: 'Tubo cobre frigorífico 5/8', unit_price: 11, reference: 'T58' },
  { description: 'Codo cobre 90º 5/8', unit_price: 1.4 },
  { description: 'Aislamiento tubo 13/8', unit_price: 9 },
];
ok(buscarMaterial(base, plan.find((p) => p.clave === 'tubo-liq').busca)?.reference === 'T38', 'encuentra tubo 3/8');
ok(buscarMaterial(base, plan.find((p) => p.clave === 'tubo-asp').busca)?.reference === 'T58', 'encuentra tubo 5/8');
ok(buscarMaterial(base, plan.find((p) => p.clave === 'codo-asp').busca)?.unit_price === 1.4, 'encuentra codo 5/8');
ok(buscarMaterial(base, plan.find((p) => p.clave === 'aisl-liq').busca) === null, '«13/8» no se confunde con 3/8');
ok(buscarMaterial(base, plan.find((p) => p.clave === 'codo-liq').busca) === null, 'sin artículo: null');

console.log(`${total - fallos}/${total} correctas`);
process.exit(fallos ? 1 : 0);
