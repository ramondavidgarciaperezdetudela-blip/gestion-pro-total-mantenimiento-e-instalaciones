import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * enviarCopiaFirmada
 * Envía un email de copia firmada al cliente (y al admin) cuando se firma cualquier documento directamente.
 * Payload:
 *   - contact_email: email del cliente (puede ser null)
 *   - contact_name: nombre del cliente
 *   - doc_title: título del documento ("SAT Nº123", "Presupuesto Nº5", "Hoja Mantenimiento", etc.)
 *   - doc_type: tipo de documento
 *   - sign_datetime: "DD/MM/YYYY HH:MM:SS"
 *   - signature_url: base64 PNG de la firma
 *   - signer_role: "cliente" | "tecnico"
 *   - extra_info: texto adicional (opcional)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { contact_email, contact_name, doc_title, doc_type, sign_datetime, signature_url, signer_role, extra_info } = body;

    const companies = await base44.asServiceRole.entities.CompanySettings.list();
    const company = companies?.[0] || {};

    const roleLabel = signer_role === 'tecnico' ? 'Técnico' : 'Cliente';
    const colorHeader = signer_role === 'tecnico' ? '#1e3a5f' : '#16a34a';
    const icon = signer_role === 'tecnico' ? '🔧' : '✍️';

    const emailBody = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:${colorHeader};color:white;padding:16px 20px;border-radius:8px 8px 0 0">
    <h2 style="margin:0;font-size:18px">${company.company_name || ''}</h2>
    <p style="margin:4px 0 0;font-size:13px;opacity:0.85">${icon} Copia de documento firmado</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:20px;border-radius:0 0 8px 8px;background:#fff">
    <p style="color:#555;font-size:14px">Estimado/a <strong>${contact_name || ''}</strong>,</p>
    <p style="color:#555;font-size:14px">Le enviamos una copia de su firma registrada en el siguiente documento:</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">
      <tr style="background:#f9fafb"><td style="padding:8px;color:#666;width:40%"><strong>Documento:</strong></td><td style="padding:8px">${doc_title || ''}</td></tr>
      ${doc_type ? `<tr><td style="padding:8px;color:#666"><strong>Tipo:</strong></td><td style="padding:8px;text-transform:capitalize">${doc_type}</td></tr>` : ''}
      <tr style="background:#f9fafb"><td style="padding:8px;color:#666"><strong>Firmado por:</strong></td><td style="padding:8px">${roleLabel} — ${contact_name || ''}</td></tr>
      <tr><td style="padding:8px;color:#666"><strong>🕐 Fecha y hora:</strong></td><td style="padding:8px;font-weight:bold;color:${colorHeader}">${sign_datetime || ''}</td></tr>
      ${extra_info ? `<tr style="background:#f9fafb"><td style="padding:8px;color:#666"><strong>Info adicional:</strong></td><td style="padding:8px;font-size:13px">${extra_info}</td></tr>` : ''}
    </table>
    ${signature_url ? `
    <div style="margin-top:12px">
      <p style="font-size:13px;color:#666;margin-bottom:6px"><strong>Su firma digital registrada:</strong></p>
      <img src="${signature_url}" alt="Firma" style="max-width:280px;border:1px solid #e5e7eb;border-radius:6px;background:#fff;padding:6px"/>
      <p style="font-size:11px;color:#aaa;margin-top:4px">Esta firma tiene validez como conformidad digital. Fecha: ${sign_datetime || ''}</p>
    </div>` : ''}
    <p style="color:#777;font-size:12px;margin-top:20px">Guarde este email como justificante. Si no reconoce esta firma, contacte con nosotros inmediatamente.</p>
    <hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb"/>
    <p style="font-size:12px;color:#999">${company.company_name || ''} · ${company.phone || ''} · ${company.email || ''}</p>
  </div>
</div>`.trim();

    const adminEmailBody = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:${colorHeader};color:white;padding:16px 20px;border-radius:8px 8px 0 0">
    <h2 style="margin:0;font-size:18px">${icon} Documento firmado directamente</h2>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:20px;border-radius:0 0 8px 8px;background:#fff">
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 16px">
      <tr><td style="padding:8px;color:#666;width:40%"><strong>${roleLabel}:</strong></td><td style="padding:8px">${contact_name || ''}</td></tr>
      <tr style="background:#f9fafb"><td style="padding:8px;color:#666"><strong>Documento:</strong></td><td style="padding:8px">${doc_title || ''}</td></tr>
      <tr><td style="padding:8px;color:#666"><strong>🕐 Fecha y hora firma:</strong></td><td style="padding:8px;font-weight:bold;color:${colorHeader}">${sign_datetime || ''}</td></tr>
    </table>
    ${signature_url ? `<div><p style="font-size:13px;color:#666;margin-bottom:6px"><strong>Firma registrada:</strong></p><img src="${signature_url}" alt="Firma" style="max-width:280px;border:1px solid #e5e7eb;border-radius:6px;background:#fff;padding:4px"/></div>` : ''}
    <hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb"/>
    <p style="font-size:12px;color:#999">${company.company_name || ''}</p>
  </div>
</div>`.trim();

    const results = [];

    // Email al cliente (si tiene email)
    if (contact_email) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: contact_email,
        subject: `📋 Copia firmada: ${doc_title || 'Documento'} — ${sign_datetime || ''}`,
        body: emailBody
      });
      results.push('cliente');
    }

    // Email al admin
    if (company.email) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: company.email,
        subject: `${icon} Firma directa: ${doc_title || 'Documento'} — ${contact_name || ''} (${sign_datetime || ''})`,
        body: adminEmailBody
      });
      results.push('admin');
    }

    return Response.json({ ok: true, sent_to: results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});