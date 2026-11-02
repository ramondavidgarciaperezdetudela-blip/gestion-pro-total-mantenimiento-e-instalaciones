// Comprueba que todas las piezas del PDF/impresión universal están conectadas.
import fs from 'node:fs';
let fallos = 0;
const ok = (c, m) => { if (!c) { fallos++; console.error('FALLA:', m); } else console.log('ok:', m); };
const leer = (f) => fs.readFileSync(f, 'utf8');
const main = leer('electron/main.cjs'), pre = leer('electron/preload.cjs'), ph = leer('src/lib/printHelper.js'), lay = leer('src/Layout.jsx');
ok(/ipcMain\.handle\('gpt-guardar-pdf'/.test(main) && /printToPDF/.test(main), 'escritorio guarda PDF');
ok(/guardarPdf:.*gpt-guardar-pdf/.test(pre), 'preload expone guardarPdf');
ok(/export async function exportarPdf/.test(ph) && /export function pantallaAPdf/.test(ph), 'printHelper exporta PDF');
ok(/BotonesImprimirPantalla/.test(lay) && /contenidoRef/.test(lay), 'Layout muestra los botones en todas las pantallas');
ok(leer('src/components/BotonesImprimirPantalla.jsx').includes("'p'"), 'Ctrl+P recogido');
process.exit(fallos ? 1 : 0);
