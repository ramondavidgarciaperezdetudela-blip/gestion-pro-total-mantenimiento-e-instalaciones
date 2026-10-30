// Prueba del re-enlace de registros con su cliente al restaurar una copia.
import { mapaIds, reenlazarFilas } from '../src/lib/vinculos.js';
let fallos = 0;
const ok = (c, t) => { if (!c) { fallos++; console.log('  ✗ ' + t); } else console.log('  ✓ ' + t); };

const claveCliente = (r) => (r.name ? String(r.name).trim().toLowerCase() : null);
const copia = [{ id: 'v1', name: 'Ana López' }, { id: 'v2', name: 'Bar Sol' }];
const actuales = [{ id: 'n1', name: 'Ana López' }, { id: 'n2', name: 'Bar Sol' }];
const mapa = mapaIds(copia, actuales, claveCliente);
const idMap = new Map(mapa);
ok(idMap.get('v1') === 'n1' && idMap.get('v2') === 'n2', 'mapa de identificadores viejos a nuevos');

const facturas = [
  { id: 'f1', contact_id: 'v1', contact_name: 'Ana López' },
  { id: 'f2', contact_id: 'roto', contact_name: 'Bar Sol' },
  { id: 'f3', contact_id: 'roto', contact_name: 'Nadie Conocido' },
];
const r = reenlazarFilas(facturas, idMap, actuales);
ok(r.filas[0].contact_id === 'n1', 'vinculo por identificador');
ok(r.filas[1].contact_id === 'n2', 'vinculo por nombre cuando el identificador está roto');
ok(r.filas[2].contact_id !== 'n1' && r.filas[2].contact_id !== 'n2', 'cliente desconocido no se vincula a otro');
ok(r.porId === 1 && r.porNombre === 1 && r.sinVincular === 1, 'contadores correctos');
console.log(fallos ? `\n${fallos} FALLOS` : '\nTODO OK');
process.exit(fallos ? 1 : 0);
