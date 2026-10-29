import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { esc, firmaValida } from '../../shared/seguridadPublica.ts';

/**
 * enviarCopiaFirmada
 * Envía por correo la copia del documento recién firmado.
 *
 * Dos formas de llamarla:
 *
 *  - Con `doc_id` (la usa la página pública del presupuesto, donde firma el
 *    cliente sin cuenta): TODO se saca del documento guardado —nombre,
 *    número, fecha de firma, firma y destinatario—. Del cuerpo de la petición
 *    no se usa nada, así que no se puede falsificar ni inyectar contenido.
 *
 *  - Sin `doc_id` (la usa la firma de documentos legales, con sesión): los
 *    datos vienen del cuerpo, pero se exige sesión iniciada, la firma tiene
 *    que ser una imagen válida y todo el texto se escapa antes de meterlo en
 *    el correo.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { doc_id } = body;

    const companies = await base44.asServiceRole.entities.CompanySettings.list();
    const company = companies?.[0] || {};

    let contactEmail = null;
    let contactName = '';
    let docTitle = '';
    let docType = '';
    let signDatetime = '';
    let signature = '';
    let signerRole = 'cliente';

    if (doc_id) {
      // ── Datos tomados del documento, nunca del cuerpo de la petición ──
      const docs = await base44.asServiceRole.entities.Invoice.filter({ id: doc_id });
      const doc = docs?.[0];
      if (!doc) {
        return Response.json({ error: 'Documento no encontrado' }, { status: 404 });
      }

      docTitle = `${doc.doc_type || 'Documento'} Nº${doc.doc_number || ''}`.trim();
      docType = doc.doc_type || '';
      contactName = doc.contact_name || '';
      signDatetime = doc.sign_datetime || '';
      signerRole = 'cliente';

      const firma = String(doc.signature_client || '');
      if (firma.startsWith('data:image/')) signature = firmaValida(firma);
      else if (/^https:\/\//i.test(firma)) signature = firma;

      if (doc.contact_id) {
        const contacts = await base44.asServiceRole.entities.Contact.filter({ id: doc.contact_id });
        contactEmail = contacts?.[0]?.email || null;
      }
    } else {
      // ── Documentos legales: hace falta sesión iniciada ──
      const user = await base44.auth.me().catch(() => null);
      if (!user) {
        return Response.json({ error: 'No autorizado' }, { status: 401 });
      }

      contactName = String(body.contact_name || '');
      docTitle = String(body.doc_title || '');
      docType = String(body.doc_type || '');
      signDatetime = String(body.sign_datetime || '');
      signerRole = body.signer_role === 'tecnico' ? 'tecnico' : 'cliente';

      signature = firmaValida(body.signature_url);

      // El destinatario tiene que ser un contacto real de la base de datos: no
      // se manda a cualquier dirección que llegue en la petición.
      const solicitado = String(body.contact_email || '').trim().toLowerCase();
      if (solicitado) {
        const contactos = await base44.asServiceRole.entities.Contact.filter({ email: solicitado });
        contactEmail = contactos?.length ? solicitado : null;
      }
    }

    const roleLabel = signerRole === 'tecnico' ? 'Técnico' : 'Cliente';
    const colorHeader = signerRole === 'tecnico' ? '#1e3a5f' : '#16a34a';
    const icon = signerRole === 'tecnico' ? '🔧' : '✍️';

    const nombreSeguro = esc(contactName);
    const tituloSeguro = esc(docTitle);
    const tipoSeguro = esc(docType);
    const fechaSegura = esc(signDatetime);
    const empresaSegura = esc(company.company_name || '');

    const emailBody = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:${colorHeader};color:white;padding:16px 20px;border-radius:8px 8px 0 0">
    <h2 style="margin:0;font-size:18px">${empresaSegura}</h2>
    <p style="margin:4px 0 0;font-size:13px;opacity:0.85">${icon} Copia de documento firmado</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:20px;border-radius:0 0 8px 8px;background:#fff">
    <p style="color:#555;font-size:14px">Estimado/a <strong>${nombreSeguro}</strong>,</p>
    <p style="color:#555;font-size:14px">Le enviamos una copia de su firma registrada en el siguiente documento:</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">
      <tr style="background:#f9fafb"><td style="padding:8px;color:#666;width:40%"><strong>Documento:</strong></td><td style="padding:8px">${tituloSeguro}</td></tr>
      ${tipoSeguro ? `<tr><td style="padding:8px;color:#666"><strong>Tipo:</strong></td><td style="padding:8px;text-transform:capitalize">${tipoSeguro}</td></tr>` : ''}
      <tr style="background:#f9fafb"><td style="padding:8px;color:#666"><strong>Firmado por:</strong></td><td style="padding:8px">${roleLabel} — ${nombreSeguro}</td></tr>
      <tr><td style="padding:8px;color:#666"><strong>🕐 Fecha y hora:</strong></td><td style="padding:8px;font-weight:bold;color:${colorHeader}">${fechaSegura}</td></tr>
    </table>
    ${signature ? `
    <div style="margin-top:12px">
      <p style="font-size:13px;color:#666;margin-bottom:6px"><strong>Su firma digital registrada:</strong></p>
      <img src="${esc(signature)}" alt="Firma" style="max-width:280px;border:1px solid #e5e7eb;border-radius:6px;background:#fff;padding:6px"/>
      <p style="font-size:11px;color:#aaa;margin-top:4px">Esta firma tiene validez como conformidad digital. Fecha: ${fechaSegura}</p>
    </div>` : ''}
    <p style="color:#777;font-size:12px;margin-top:20px">Guarde este email como justificante. Si no reconoce esta firma, contacte con nosotros inmediatamente.</p>
    <hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb"/>
    <p style="font-size:12px;color:#999">${empresaSegura} · ${esc(company.phone || '')} · ${esc(company.email || '')}</p>
  </div>
</div>`.trim();

    const adminEmailBody = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:${colorHeader};color:white;padding:16px 20px;border-radius:8px 8px 0 0">
    <h2 style="margin:0;font-size:18px">${icon} Documento firmado directamente</h2>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:20px;border-radius:0 0 8px 8px;background:#fff">
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 16px">
      <tr><td style="padding:8px;color:#666;width:40%"><strong>${roleLabel}:</strong></td><td style="padding:8px">${nombreSeguro}</td></tr>
      <tr style="background:#f9fafb"><td style="padding:8px;color:#666"><strong>Documento:</strong></td><td style="padding:8px">${tituloSeguro}</td></tr>
      <tr><td style="padding:8px;color:#666"><strong>🕐 Fecha y hora firma:</strong></td><td style="padding:8px;font-weight:bold;color:${colorHeader}">${fechaSegura}</td></tr>
    </table>
    ${signature ? `<div><p style="font-size:13px;color:#666;margin-bottom:6px"><strong>Firma registrada:</strong></p><img src="${esc(signature)}" alt="Firma" style="max-width:280px;border:1px solid #e5e7eb;border-radius:6px;background:#fff;padding:4px"/></div>` : ''}
    <hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb"/>
    <p style="font-size:12px;color:#999">${empresaSegura}</p>
  </div>
</div>`.trim();

    const results = [];

    // Email al cliente (si es un contacto real)
    if (contactEmail) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: contactEmail,
        subject: `📋 Copia firmada: ${docTitle || 'Documento'} — ${signDatetime || ''}`,
        body: emailBody,
      });
      results.push('cliente');
    }

    // Email al admin
    if (company.email) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: company.email,
        subject: `${icon} Firma directa: ${docTitle || 'Documento'} — ${contactName || ''} (${signDatetime || ''})`,
        body: adminEmailBody,
      });
      results.push('admin');
    }

    return Response.json({ ok: true, sent_to: results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});