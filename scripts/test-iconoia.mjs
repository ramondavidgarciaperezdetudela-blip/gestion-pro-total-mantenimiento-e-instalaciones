// El filtro de SVG de la IA: solo pasa dibujo limpio.
const svgLimpio = (await import('node:fs')).readFileSync('src/lib/iconoPlanoIA.js','utf8');
const src = svgLimpio.match(/export function svgLimpio[\s\S]*?\n}\n/)[0].replace('export ','');
const f = new Function(`${src}; return svgLimpio;`)();
let fallos = 0; const ok=(c,t)=>{ if(!c){fallos++;console.log('  ✗ '+t);} else console.log('  ✓ '+t); };
ok(f('Aquí: ```<svg viewBox="0 0 10 10"><rect width="5" height="5"/></svg>```').includes('xmlns='), 'extrae el svg y añade xmlns');
ok(f('<svg><script>alert(1)</script></svg>')==='', 'rechaza scripts');
ok(f('<svg onload="x()"></svg>')==='', 'rechaza eventos');
ok(f('<svg><image xlink:href="https://x.com/a.png"/></svg>')==='', 'rechaza imágenes externas');
ok(f('sin dibujo')==='', 'texto sin svg → vacío');
console.log(fallos?`\n${fallos} FALLOS`:'\nTODO OK'); process.exit(fallos?1:0);
