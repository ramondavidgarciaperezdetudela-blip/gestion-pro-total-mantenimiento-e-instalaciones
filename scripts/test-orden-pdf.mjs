import { construirPdfOrdenes } from '../src/lib/ordenPreventivoPdf.js';
import { construirOrden } from '../src/lib/ordenPreventivo.js';
const mk = (n) => construirOrden({ maquina: { name: 'Split ' + n, machine_type: 'camara_frigorifica', refrigerant_type: 'R-404A', refrigerant_charge_kg: 20 }, contacto: { name: 'Ana', surname: 'Ruiz' }, fecha: '2026-11-10', tecnico: 'Luis' });
const doc = construirPdfOrdenes([mk(1), mk(2), mk(3)], { company_name: 'Mi empresa' });
const n = doc.getNumberOfPages(); const bytes = doc.output('arraybuffer').byteLength;
const ok = n === 3 && bytes > 3000; console.log(ok ? `  ✓ 3 órdenes → ${n} páginas, ${bytes} bytes\n\nTODO OK` : `  ✗ páginas=${n} bytes=${bytes}\n\n1 FALLOS`); process.exit(ok ? 0 : 1);
