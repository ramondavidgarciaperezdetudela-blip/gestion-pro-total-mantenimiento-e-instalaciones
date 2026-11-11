// Comprueba que printHelper imprime con marco oculto y sin ventanas nuevas.
import fs from 'node:fs';
const s = fs.readFileSync(new URL('../src/lib/printHelper.js', import.meta.url), 'utf8');
const ok = (c, m) => { if (!c) { console.error('FALLO:', m); process.exit(1); } };
ok(/function imprimirEnMarco/.test(s), 'falta imprimirEnMarco');
ok(/await imprimirEnMarco\(html\)/.test(s), 'navegador debe usar el marco primero');
ok(s.indexOf('imprimirEnMarco(html)) return true') < s.indexOf('imprimirEnVentana(html)) return true'), 'ventana solo de respaldo');
const m = fs.readFileSync(new URL('../electron/main.cjs', import.meta.url), 'utf8');
ok(/gpt-imprimir-\$\{Date\.now\(\)\}/.test(m) && /loadFile\(fichero\)/.test(m), 'Electron debe usar fichero temporal');
console.log('imprimir: OK');
