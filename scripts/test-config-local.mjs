import { recogerConfigLocal, aplicarConfigLocal, esAjuste } from '../src/lib/configLocal.js';
let fallos = 0; const ok = (c, t) => { if (!c) { fallos++; console.log('  ✗ ' + t); } else console.log('  ✓ ' + t); };
const falso = (o) => { const m = new Map(Object.entries(o)); return { get length() { return m.size; }, key: (i) => [...m.keys()][i], getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), _m: m }; };
const a = falso({ gpt_tema: 'oscuro', gpt_tipo_de_fuente: 'serif', gpt_proveedor_ia: '{"proveedor":"openrouter","openrouter_clave":"sk-x"}', 'gpt:sat:telefonos': '[]',
  plano_proveedor_elegido: 'p1', backupConfig: '{"auto":true}', gpt_ultimo_error: '{}', gpt_license_v1: 'LIC', base44_access_token: 'T', offline_cache_Contact: '[]', doc_draft: 'x', gpt_support_pwd: 'p', supabase_auth_token: 'Z' });
const c = recogerConfigLocal(a);
ok(c.gpt_tema === 'oscuro' && c.gpt_tipo_de_fuente === 'serif' && c.gpt_proveedor_ia.includes('openrouter'), 'recoge aspecto, letra e IA');
ok(c.plano_proveedor_elegido === 'p1' && c.backupConfig && c['gpt:sat:telefonos'], 'recoge proveedor del plano, copias y teléfonos');
ok(!('gpt_license_v1' in c) && !('base44_access_token' in c) && !('supabase_auth_token' in c) && !('gpt_support_pwd' in c), 'no recoge licencia, sesiones ni contraseñas');
ok(!('offline_cache_Contact' in c) && !('doc_draft' in c) && !('gpt_ultimo_error' in c), 'no recoge cachés ni estado pasajero');
const b = falso({});
ok(aplicarConfigLocal({ ...c, gpt_license_v1: 'ROBADA', base44_access_token: 'X' }, b) === Object.keys(c).length, 'restaura solo los ajustes');
ok(b.getItem('gpt_tema') === 'oscuro' && b.getItem('gpt_license_v1') === null && b.getItem('base44_access_token') === null, 'una copia no puede colar licencia ni sesión');
ok(aplicarConfigLocal(null, b) === 0 && esAjuste('gpt_tema') && !esAjuste('otra_cosa'), 'entradas raras no rompen');
console.log(fallos ? `\n${fallos} FALLOS` : '\nTODO OK'); process.exit(fallos ? 1 : 0);
