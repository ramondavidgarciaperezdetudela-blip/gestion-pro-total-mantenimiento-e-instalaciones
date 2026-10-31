// Deja que las pruebas de Node entiendan el alias «@/» de Vite y los imports sin extensión.
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const SRC = path.resolve('src');
export async function resolve(specifier, context, next) {
  let s = specifier;
  if (s.startsWith('@/')) s = pathToFileURL(path.join(SRC, s.slice(2))).href;
  const probar = (u) => {
    if (!u.startsWith('file:')) return u;
    const f = new URL(u).pathname;
    for (const ext of ['', '.js', '.jsx', '.mjs']) { if (fs.existsSync(f + ext) && fs.statSync(f + ext).isFile()) return pathToFileURL(f + ext).href; }
    return u;
  };
  if (s.startsWith('file:')) return next(probar(s), context);
  if ((s.startsWith('./') || s.startsWith('../')) && context.parentURL?.startsWith('file:')) {
    return next(probar(new URL(s, context.parentURL).href), context);
  }
  return next(s, context);
}
