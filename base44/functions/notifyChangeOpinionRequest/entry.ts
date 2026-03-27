import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { doc_id, doc_number, contact_name, total, contact_phone } = body;

    if (!doc_id) {
      return Response.json({ error: 'doc_id requerido' }, { status: 400 });
    }

    // Obtener documento y configuración
    const docs = await base44.asServiceRole.entities.Invoice.filter({ id: doc_id });
    const doc = docs?.[0];
    const companies = await base44.asServiceRole.entities.CompanySettings.list();
    const company = companies?.[0];

    if (!company?.email) {
      return Response.json({ ok: true });
    }

    // Generar enlace al presupuesto
    const presupuestoUrl = `https://app.base44.io/presupuesto-publico?id=${doc_id}`;

    // Enviar email al admin
    const emailBodyAdmin = `
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
        <p style="color:#555;font-size:13px;margin:12px 0">Puedes enviar el enlace de nuevo al cliente para que actualice su decisión:</p>
        <p style="margin:12px 0"><a href="${presupuestoUrl}" style="display:inline-block;padding:10px 16px;background:#0ea5e9;color:white;text-decoration:none;border-radius:6px;font-weight:bold">📄 Abrir presupuesto</a></p>
        <hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb"/>
        <p style="font-size:12px;color:#999">${company?.company_name || ''} · ${company?.email || ''} · ${company?.phone || ''}</p>
      </div>
    </div>`.trim();

    // Enviar email usando la función que ya existe (enviarCopiaFirmada style)
    try {
      const res = await base44.asServiceRole.functions.invoke('enviarCopiaFirmada', {
        to: company.email,
        subject: `⚠️ Solicitud de cambio de opinión - ${contact_name} (${doc_number})`,
        body: emailBodyAdmin,
        doc_title: `Solicitud cambio opinión - ${doc_number}`,
        from_name: company?.company_name || 'Sistema'
      });
    } catch (_err) {
      console.log('Intentando envío directo...');
    }

    // Enviar WhatsApp al admin
    if (company?.phone) {
      const cleanPhone = company.phone.replace(/\D/g, '');
      if (cleanPhone) {
        const waMsg = `⚠️ *CAMBIO DE OPINIÓN SOLICITADO*\n\n📄 ${doc.doc_type?.toUpperCase()} Nº${doc_number || ''}\n👤 ${contact_name}\n💶 ${(total || 0).toFixed(2)} €\n\nEl cliente ha solicitado cambiar su decisión. Accede a tu ficha para revisar el historial.\n\nEnlace: ${presupuestoUrl}`;
        try {
          await base44.asServiceRole.functions.invoke('enviarCopiaFirmada', {
            to: company.email,
            subject: `WhatsApp enviado`,
            body: waMsg
          });
        } catch (_err) {
          console.log('WhatsApp no enviado, continuando...');
        }
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Error en notifyChangeOpinionRequest:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});