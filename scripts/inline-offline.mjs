// Inlina el JS y CSS del build offline dentro de index.html -> un solo fichero
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'dist-offline';
let html = readFileSync(join(dir, 'index.html'), 'utf8');

html = html.replace(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g, (m, src) => {
  const file = src.replace(/^\.?\//, '');
  try { return `<script type="module">\n${readFileSync(join(dir, file), 'utf8')}\n</script>`; }
  catch { return m; }
});
html = html.replace(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (m, href) => {
  const file = href.replace(/^\.?\//, '');
  try { return `<style>\n${readFileSync(join(dir, file), 'utf8')}\n</style>`; }
  catch { return m; }
});
html = html.replace(/<link\b[^>]*rel="modulepreload"[^>]*>/g, '');

writeFileSync(join(dir, 'Gestion-Pro-Total.html'), html);
console.log(`OK: dist-offline/Gestion-Pro-Total.html (${Math.round(Buffer.byteLength(html)/1024)} KB)`);
