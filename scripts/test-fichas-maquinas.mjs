import { fabricanteDe, modeloDe, identificarMaquina, buscarFicha, enlaceDeFicha, enlacesDeBusqueda, limpiarRespuestaIA, claveFicha, urlValida } from '../src/lib/fichasMaquinas.js';
import { diametroDePulgadas } from '../src/lib/tuberiaEquipos.js';
let total = 0, fallos = 0;
const ok = (c, t, d = '') => { total++; if (!c) { fallos++; console.log('  ✗ ' + t + (d ? ' — ' + d : '')); } };

console.log('1. Fabricante');
ok(fabricanteDe('Unidad condensadora ZANOTTI GMS150') === 'Zanotti', 'Zanotti');
ok(fabricanteDe('Split Mitsubishi Electric MSZ-AP25VG') === 'Mitsubishi Electric', 'Mitsubishi Electric');
ok(fabricanteDe('Cámara KIDE 4x3') === 'Kide', 'Kide');
ok(fabricanteDe('Aire acondicionado LG S12ET') === 'LG', 'LG como palabra suelta');
ok(fabricanteDe('Calidad global del equipo') === '', 'sin falsos positivos con «lg» dentro de palabras');
ok(fabricanteDe('Equipo sin marca 12000 BTU') === '', 'sin marca');

console.log('2. Modelo');
ok(modeloDe('Unidad condensadora ZANOTTI GMS150 R-449A 230V', 'Zanotti') === 'GMS150', 'GMS150 y no R-449A ni 230V');
ok(modeloDe('Split Daikin FTXM25R inverter 9000 BTU', 'Daikin') === 'FTXM25R', 'FTXM25R');
ok(modeloDe('Split inverter 12000 BTU blanco') === '', 'sin modelo claro');
ok(modeloDe('Intarcon IMS-0400 2 HP', 'Intarcon') === 'IMS-0400', 'con guion');
const id = identificarMaquina({ description: 'Unidad condensadora Zanotti GMS150', reference: 'ZG-150' });
ok(id.fabricante === 'Zanotti' && id.modelo === 'GMS150' && id.referencia === 'ZG-150', 'identifica todo');
ok(identificarMaquina({ description: 'Split blanco', reference: 'ABCD-12' }).modelo === 'ABCD-12', 'sin modelo en texto usa la referencia');

console.log('3. Encontrar la ficha guardada');
const fichas = [
  { id: 1, manufacturer: 'Zanotti', model: 'GMS150', reference: '', url: 'https://x.test/gms150.pdf', liquid_pipe: '3/8"', suction_pipe: '5/8"' },
  { id: 2, manufacturer: 'Zanotti', model: 'GMS150X', file_url: 'https://f.test/copia.pdf', url: 'https://x.test/otra.pdf' },
  { id: 3, manufacturer: 'Daikin', model: 'FTXM25R', reference: 'DK-25' },
];
ok(buscarFicha(fichas, { description: 'Unidad condensadora Zanotti GMS150 2HP' })?.id === 1, 'por modelo en la descripción');
ok(buscarFicha(fichas, { description: 'Unidad Zanotti GMS150X 3HP' })?.id === 2, 'gana el modelo más concreto');
ok(buscarFicha(fichas, { description: 'Split', reference: 'dk 25' })?.id === 3, 'por referencia con otro formato');
ok(buscarFicha(fichas, { description: 'Unidad Intarcon IMS-0400' }) === null, 'otra máquina: nada');
ok(buscarFicha(fichas, { description: 'Daikin GMS150 raro' })?.id !== 1, 'fabricante distinto descarta la coincidencia floja');
ok(enlaceDeFicha(fichas[1]) === 'https://f.test/copia.pdf', 'abre la copia guardada antes que internet');
ok(enlaceDeFicha(fichas[0]) === 'https://x.test/gms150.pdf', 'si no hay copia, el enlace');
ok(claveFicha('Zanotti', 'GMS-150') === claveFicha('ZANOTTI', 'gms150'), 'clave normalizada');

console.log('4. Búsqueda');
const en = enlacesDeBusqueda({ fabricante: 'Intarcon', modelo: 'IMS-0400' });
ok(en[0].url.startsWith('https://www.google.com/search?q=') && /Intarcon%20IMS-0400/.test(en[0].url), 'enlace de Google con fabricante y modelo');
ok(en.some((e) => /intarcon\.com/.test(e.url)), 'portal del fabricante cuando se conoce');
ok(enlacesDeBusqueda({}).length === 0, 'sin datos no hay enlaces');
ok(urlValida('https://a.es/x.pdf') && !urlValida('javascript:alert(1)') && !urlValida('ftp://x'), 'solo http(s)');

console.log('5. Respuesta de la IA');
let r = limpiarRespuestaIA({ fabricante: 'Zanotti', modelo: 'GMS150', url_ficha: 'https://z.test/f.pdf', conexion_liquido: '3/8"', conexion_aspiracion: '5/8"' }, diametroDePulgadas);
ok(r.url && r.liquido?.pulg === '3/8"' && r.aspiracion?.pulg === '5/8"', 'respuesta buena');
r = limpiarRespuestaIA({ url_ficha: 'javascript:alert(1)', conexion_liquido: 'no consta', conexion_aspiracion: 'desconocido' }, diametroDePulgadas);
ok(!r.url && !r.liquido && !r.aspiracion, 'enlace raro y datos vacíos se descartan');
r = limpiarRespuestaIA({ conexion_liquido: '5/8"', conexion_aspiracion: '3/8"' }, diametroDePulgadas);
ok(r.liquido && !r.aspiracion, 'aspiración menor que líquido: se descarta');
ok(limpiarRespuestaIA(null, diametroDePulgadas).url === '', 'null no rompe');

console.log(`${total - fallos}/${total} correctas`);
process.exit(fallos ? 1 : 0);
