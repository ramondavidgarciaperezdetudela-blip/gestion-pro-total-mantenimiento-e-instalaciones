// Envío de correo por SMTP, sin dependencias. Admite TLS directo (465) y
// STARTTLS (587), con usuario y clave (AUTH LOGIN / PLAIN).
import net from 'node:net';
import tls from 'node:tls';
import crypto from 'node:crypto';

const b64 = (t) => Buffer.from(String(t), 'utf8').toString('base64');
const cabecera = (t) => (/^[\x20-\x7e]*$/.test(t) ? t : `=?UTF-8?B?${b64(t)}?=`);
const limpia = (t) => String(t ?? '').replace(/[\r\n]+/g, ' ').trim();

export function componerMensaje({ de, nombre, para, asunto, texto, html }) {
  const id = `${crypto.randomBytes(8).toString('hex')}@gestion-pro-total`;
  const trozos = (s) => b64(s).replace(/(.{76})/g, '$1\r\n');
  const cab = [
    `From: ${nombre ? `${cabecera(limpia(nombre))} <${de}>` : de}`,
    `To: ${para}`,
    `Subject: ${cabecera(limpia(asunto))}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${id}>`,
    'MIME-Version: 1.0',
  ];
  let cuerpo;
  if (html) {
    const f = `=_${crypto.randomBytes(8).toString('hex')}`;
    cab.push(`Content-Type: multipart/alternative; boundary="${f}"`);
    cuerpo = `--${f}\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${trozos(texto || '')}\r\n`
      + `--${f}\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${trozos(html)}\r\n--${f}--`;
  } else {
    cab.push('Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64');
    cuerpo = trozos(texto || '');
  }
  return `${cab.join('\r\n')}\r\n\r\n${cuerpo}`;
}

export function enviarCorreo({ host, port, user, pass, ssl = true, de, nombre, para, asunto, texto, html, timeout = 20000 }) {
  return new Promise((resolve, reject) => {
    if (!host) return reject(new Error('Falta el servidor SMTP (Configuración → Email).'));
    if (!/^\S+@\S+\.\S+$/.test(String(para || ''))) return reject(new Error('El correo del destinatario no es válido.'));
    port = Number(port) || (ssl ? 465 : 25);
    de = de || user;
    if (!/^\S+@\S+\.\S+$/.test(String(de || ''))) return reject(new Error('Falta el correo remitente (usuario SMTP).'));
    let socket; let buf = ''; let espera = null; let fin = false;
    const cerrar = (err, ok) => {
      if (fin) return; fin = true; clearTimeout(reloj);
      try { socket.destroy(); } catch { /* ya cerrado */ }
      err ? reject(err) : resolve(ok);
    };
    const reloj = setTimeout(() => cerrar(new Error('El servidor de correo no responde (tiempo agotado).')), timeout);
    const alDato = (d) => {
      buf += d.toString('utf8');
      const lineas = buf.split('\r\n');
      // una respuesta termina en una línea «NNN texto» (sin guion tras el código)
      for (let i = 0; i < lineas.length - 1; i++) {
        if (/^\d{3} /.test(lineas[i]) || /^\d{3}$/.test(lineas[i])) {
          const resp = lineas.slice(0, i + 1).join('\r\n');
          buf = lineas.slice(i + 1).join('\r\n');
          if (espera) { const e = espera; espera = null; e({ codigo: Number(resp.slice(0, 3)), texto: resp }); }
          return;
        }
      }
    };
    const leer = () => new Promise((r) => { espera = r; });
    const cmd = async (linea, buenos) => {
      if (linea !== null) socket.write(`${linea}\r\n`);
      const r = await leer();
      if (!buenos.includes(r.codigo)) throw new Error(`El servidor de correo respondió: ${r.texto.split('\r\n').pop().slice(0, 200)}`);
      return r;
    };
    const conectado = async () => {
      try {
        await cmd(null, [220]);
        let ehlo = await cmd('EHLO gestion-pro-total', [250]);
        if (!ssl || port === 465) { /* ya cifrado o sin cifrar a propósito */ }
        else if (/STARTTLS/i.test(ehlo.texto)) {
          await cmd('STARTTLS', [220]);
          socket.removeAllListeners('data');
          socket = tls.connect({ socket, servername: host }, async () => {
            socket.on('data', alDato);
            try { ehlo = await cmd('EHLO gestion-pro-total', [250]); await seguir(ehlo); } catch (e) { cerrar(e); }
          });
          socket.on('error', (e) => cerrar(e));
          return;
        }
        await seguir(ehlo);
      } catch (e) { cerrar(e); }
    };
    const seguir = async () => {
      if (user) {
        await cmd('AUTH LOGIN', [334]);
        await cmd(b64(user), [334]);
        await cmd(b64(pass || ''), [235]);
      }
      await cmd(`MAIL FROM:<${de}>`, [250]);
      await cmd(`RCPT TO:<${para}>`, [250, 251]);
      await cmd('DATA', [354]);
      const msg = componerMensaje({ de, nombre, para, asunto, texto, html }).replace(/\r\n\./g, '\r\n..');
      await cmd(`${msg}\r\n.`, [250]);
      try { socket.write('QUIT\r\n'); } catch { /* da igual */ }
      cerrar(null, { ok: true });
    };
    const opciones = { host, port };
    if (ssl && port === 465) socket = tls.connect({ ...opciones, servername: host }, conectado);
    else socket = net.connect(opciones, conectado);
    socket.on('data', alDato);
    socket.on('error', (e) => cerrar(new Error(`No se pudo conectar con ${host}:${port} (${e.code || e.message}).`)));
  });
}
