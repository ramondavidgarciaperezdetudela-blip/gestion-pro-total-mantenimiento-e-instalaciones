import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { doc_id, doc_number, contact_name, total } = body;

    if (!doc_id) {
      return Response.json({ error: 'doc_id requerido' }, { status: 400 });
    }

    // Obtener configuración de la empresa
    const companies = await base44.asServiceRole.entities.CompanySettings.list();
    const company = companies?.[0];

    if (!company?.email) {
      return Response.json({ ok: true });
    }

    // Enviar email al admin
    const emailBody = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:#f59e0b;color:white;padding:16px 20px;border-radius:8px 8px 0 0">
        <h2 style="margin:0;font-size:20px">⚠️ Solicitud de cambio de opinión</h2>
      </div>
      <div style="border:1px solid #fcd34d;border-top:none;padding:20px;border-radius:0 0 8px 8px;background:#fff">
        <p style="color:#555;font-size:14px;margin:0">El cliente ha solicitado cambiar su decisión sobre el siguiente presupuesto:</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">
          <tr style="background:#f9fafb"><td style="padding:8px;color:#666"><strong>Cliente:</strong></td><td style="padding:8px">${contact_name}</td></tr>
          <tr><td style="padding:8px;color:#666"><strong>Documento:</strong></td><td style="padding:8px;font-weight:bold">Nº ${doc_number || ''}</td></tr>
          <tr style="background:#f9fafb"><td style="padding:8px;color:#666"><strong>Importe:</strong></td><td style="padding:8px;font-weight:bold">${(total || 0).toFixed(2)} €</td></tr>
        </table>
        <p style="color:#555;font-size:13px;margin:12px 0">El cliente puede acceder nuevamente al presupuesto para cambiar su decisión o puedes contactarle directamente para coordinar.</p>
        <hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb"/>
        <p style="font-size:12px;color:#999">${company?.company_name || ''} · ${company?.email || ''} · ${company?.phone || ''}</p>
      </div>
    </div>`.trim();

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: company.email,
      subject: `⚠️ Solicitud de cambio de opinión - ${contact_name} (${doc_number})`,
      body: emailBody
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});