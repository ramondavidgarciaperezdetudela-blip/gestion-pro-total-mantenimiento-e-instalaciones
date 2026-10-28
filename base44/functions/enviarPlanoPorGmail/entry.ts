import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Envía un PDF (plano frigorífico) a un cliente usando la cuenta de Gmail del
// constructor (conector compartido "gmail", scope gmail.send).
//
// Recibe: { to, subject, body, pdf_base64, filename, contact_id }
// Devuelve: { ok: true, messageId } o { error } con estado HTTP.

function b64url(b64) {
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function encodeSubject(subject) {
  // RFC 2047 para sujetos con acentos / UTF-8.
  const b64 = btoa(unescape(encodeURIComponent(subject || 'Plano frigorífico')));
  return `=?UTF-8?B?${b64}?=`;
}

function chunkBase64(b64, size = 76) {
  const out = [];
  for (let i = 0; i < b64.length; i += size) out.push(b64.slice(i, i + size));
  return out.join('\r\n');
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { to, subject, body, pdf_base64, filename, contact_id } = await req.json().catch(() => ({}));
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return Response.json({ error: 'Falta un destinatario válido' }, { status: 400 });
    }
    if (!pdf_base64) return Response.json({ error: 'Falta el PDF' }, { status: 400 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    const safeName = (filename || 'plano_frigorifico').replace(/[^\w.\-]+/g, '_');
    const subj = subject || 'Plano frigorífico';
    const textBody = body || 'Adjunto el plano frigorífico de la instalación. Un saludo.';

    const boundary = 'gpt_plano_' + Math.random().toString(36).slice(2);

    const mime = [
      `From: me`,
      `To: ${to}`,
      `Subject: ${encodeSubject(subj)}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: 8bit`,
      ``,
      textBody,
      ``,
      `--${boundary}`,
      `Content-Type: application/pdf; name="${safeName}.pdf"`,
      `Content-Disposition: attachment; filename="${safeName}.pdf"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      chunkBase64(pdf_base64),
      ``,
      `--${boundary}--`,
      ``,
    ].join('\r\n');

    const raw = b64url(btoa(mime));

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errTxt = await res.text().catch(() => '');
      return Response.json({ error: `Gmail rechazó el envío (${res.status})`, detalle: errTxt }, { status: 502 });
    }

    const data = await res.json().catch(() => ({}));
    return Response.json({ ok: true, messageId: data.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}