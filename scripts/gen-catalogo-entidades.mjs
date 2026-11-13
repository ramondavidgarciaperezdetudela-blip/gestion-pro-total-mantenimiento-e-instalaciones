// Genera src/lib/iaModulos/catalogoEntidades.json a partir de base44/entities/*.jsonc.
// El catálogo le dice a la IA qué entidades y campos existen (y cuáles son sensibles y
// quedan fuera del alcance de los módulos). Se vuelve a generar con: npm run gen:catalogo
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'base44/entities';
const SENSIBLE = /(password|passwd|token|secret|api_?key|clave_?api|iban|card_?number|pin_?code)/i;
const FUERA = new Set(['User', 'CompanySettings', 'ModuloIA', 'SkillIA', 'ConectorIA', 'PeticionCambioIA', 'DatoModulo', 'NotaEnvio']); // = ENTIDADES_PROHIBIDAS
const quitaComentarios = (t) => t.replace(/("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (m, s) => s || '');

const salida = {};
for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith('.jsonc')).sort()) {
  let def;
  try { def = JSON.parse(quitaComentarios(fs.readFileSync(path.join(DIR, f), 'utf8'))); } catch { continue; }
  if (!def?.name || FUERA.has(def.name)) continue;
  const campos = {};
  for (const [k, v] of Object.entries(def.properties || {})) {
    if (SENSIBLE.test(k)) continue; // los campos sensibles ni se enseñan a la IA ni salen por el puente
    if (Object.keys(campos).length >= 45) continue;
    campos[k] = Array.isArray(v?.enum) ? 'enum:' + v.enum.slice(0, 12).join('|') : (v?.type || 'string');
  }
  salida[def.name] = { campos };
}
fs.writeFileSync('src/lib/iaModulos/catalogoEntidades.json', JSON.stringify(salida));
console.log('catálogo:', Object.keys(salida).length, 'entidades');
