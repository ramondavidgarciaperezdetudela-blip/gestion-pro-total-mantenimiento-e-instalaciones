// Prueba del envío SMTP contra un servidor falso local.
import net from 'node:net';
import { enviarCorreo, componerMensaje } from '../servidor-datos/correo.mjs';
let fallos = 0; const ok = (c, t, d = '') => { if (!c) { fallos++; console.log('  ✗ ' + t + (d ? ' — ' + d : '')); } else console.log('  ✓ ' + t); };
const visto = [];
const srv = net.createServer((s) => {
  let datos = false, buf = '';
  s.write('220 falso ESMTP\r\n');
  s.on('data', (d) => {
    buf += d.toString();
    let i;
    while ((i = buf.indexOf('\r\n')) >= 0 || (datos && buf.includes('\r\n.\r\n'))) {
      if (datos) { const f = buf.indexOf('\r\n.\r\n'); if (f < 0) break; visto.push('MENSAJE:' + buf.slice(0, f)); buf = buf.slice(f + 5); datos = false; s.write('250 ok\r\n'); continue; }
      const l = buf.slice(0, i); buf = buf.slice(i + 2); visto.push(l);
      if (/^EHLO/.test(l)) s.write('250-falso\r\n250 AUTH LOGIN\r\n');
      else if (l === 'AUTH LOGIN') s.write('334 VXNlcm5hbWU6\r\n');
      else if (/^[A-Za-z0-9+/=]+$/.test(l) && !/^(DATA|QUIT)$/.test(l)) s.write(visto.filter((x) => /^[A-Za-z0-9+/=]{6,}$/.test(x)).length === 1 ? '334 UGFzc3dvcmQ6\r\n' : '235 ok\r\n');
      else if (/^MAIL FROM/.test(l) || /^RCPT TO/.test(l)) s.write('250 ok\r\n');
      else if (l === 'DATA') { datos = true; s.write('354 sigue\r\n'); }
      else if (l === 'QUIT') { s.write('221 adiós\r\n'); s.end(); }
    }
  });
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const port = srv.address().port;
try {
  const r = await enviarCorreo({ host: '127.0.0.1', port, user: 'yo@x.es', pass: 'clave', ssl: false, nombre: 'Gestión Pro Total', para: 'cliente@x.es', asunto: 'Presupuesto — niño', texto: 'Hola.\n.punto al inicio\nAdiós ñ' });
  ok(r.ok === true, 'el correo se envía');
  const msg = visto.find((x) => x.startsWith('MENSAJE:')) || '';
  ok(visto.includes('MAIL FROM:<yo@x.es>') && visto.includes('RCPT TO:<cliente@x.es>'), 'remitente y destinatario');
  ok(/Subject: =\?UTF-8\?B\?/.test(msg), 'asunto con acentos codificado');
  const cuerpo = Buffer.from(msg.split('\r\n\r\n')[1].replace(/\r\n/g, ''), 'base64').toString('utf8');
  ok(cuerpo === 'Hola.\n.punto al inicio\nAdiós ñ', 'cuerpo íntegro (UTF-8)');
  let err = ''; try { await enviarCorreo({ host: '127.0.0.1', port, user: 'yo@x.es', pass: 'x', ssl: false, para: 'mal' }); } catch (e) { err = e.message; }
  ok(/destinatario/.test(err), 'rechaza destinatario no válido');
  let err2 = ''; try { await enviarCorreo({ host: '127.0.0.1', port: 1, user: 'yo@x.es', pass: 'x', ssl: false, para: 'a@b.es' }); } catch (e) { err2 = e.message; }
  ok(/No se pudo conectar/.test(err2), 'error claro si el servidor no responde', err2);
  ok(componerMensaje({ de: 'a@b.es', para: 'c@d.es', asunto: 'x\r\nBcc: z@z.es', texto: 'h' }).split('\r\n').every((l) => !/^Bcc:/i.test(l)), 'el asunto no puede inyectar cabeceras');
} finally { srv.close(); }
console.log(fallos ? `\n${fallos} FALLOS` : '\nTODO OK'); process.exit(fallos ? 1 : 0);
