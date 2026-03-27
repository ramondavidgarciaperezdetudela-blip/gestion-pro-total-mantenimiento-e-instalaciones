import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { doc_id, doc_number, contact_name, total, contact_phone, doc_type = 'presupuesto', contact_id = '', previous_decision = '' } = body;

    if (!doc_id) {
      return Response.json({ error: 'doc_id requerido' }, { status: 400 });
    }

    // Crear registro de solicitud de cambio de opinión
    try {
      const now = new Date();
      const requestDateTime = now.toLocaleString('es-ES');
      await base44.asServiceRole.entities.ChangeOpinionRequest.create({
        doc_id,
        doc_number,
        doc_type,
        contact_name,
        contact_id,
        contact_phone,
        total,
        previous_decision,
        request_datetime: requestDateTime,
        status: 'pendiente'
      });
    } catch (createError) {
      console.error('Error creando registro:', createError);
    }

    // Obtener documento y configuración
    const docs = await base44.asServiceRole.entities.Invoice.filter({ id: doc_id });
    const doc = docs?.[0];
    const companies = await base44.asServiceRole.entities.CompanySettings.list();
    const company = companies?.[0];

    if (!company?.email) {
      return Response.json({ ok: true });
    }

    // Generar enlaces al presupuesto con método de acceso (indicando que es cambio de opinión)
    const presupuestoUrlEmail = `https://app.base44.io/presupuesto-publico?id=${doc_id}&method=email&change_opinion=1`;
    const presupuestoUrlWhatsapp = `https://app.base44.io/presupuesto-publico?id=${doc_id}&method=whatsapp&change_opinion=1`;

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
        <p style="margin:12px 0"><a href="${presupuestoUrlEmail}" style="display:inline-block;padding:10px 16px;background:#0ea5e9;color:white;text-decoration:none;border-radius:6px;font-weight:bold">📄 Abrir presupuesto</a></p>
        <hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb"/>
        <p style="font-size:12px;color:#999">${company?.company_name || ''} · ${company?.email || ''} · ${company?.phone || ''}</p>
      </div>
    </div>`.trim();

    // Enviar email al admin
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: company.email,
        subject: `⚠️ Solicitud de cambio de opinión - ${contact_name} (${doc_number})`,
        body: emailBodyAdmin,
        from_name: company?.company_name || 'Sistema'
      });
    } catch (_err) {
      console.log('Error enviando email al admin:', _err);
    }

    // Generar enlace de WhatsApp para contactar al cliente
    const clientPhone = contact_phone?.replace(/\D/g, '') || '';
    if (company?.phone && clientPhone) {
      const adminPhone = company.phone.replace(/\D/g, '');
      const clientPhoneLink = clientPhone.startsWith('34') ? clientPhone : `34${clientPhone}`;
      
      // Mensaje pre-formateado para el admin con enlace de WhatsApp al cliente
      const waLinkToClient = `https://wa.me/${clientPhoneLink}?text=${encodeURIComponent(`Hola ${contact_name},\n\nVi que solicitaste cambiar tu decisión sobre el presupuesto Nº${doc_number} por ${(total || 0).toFixed(2)} €.\n\nTe reenvío el enlace para que puedas aceptarlo o rechazarlo de nuevo:\n\n${presupuestoUrlWhatsapp}\n\nQuedamos a tu disposición.`)}`;
      
      const adminWaMsg = `⚠️ *CAMBIO DE OPINIÓN SOLICITADO*\n\n📄 ${doc.doc_type?.toUpperCase()} Nº${doc_number || ''}\n👤 ${contact_name}\n💶 ${(total || 0).toFixed(2)} €\n\n${contact_phone ? `📱 ${contact_phone}\n` : ''}\nEl cliente ha solicitado cambiar su decisión.\n\n🔗 Contactar al cliente:\n${waLinkToClient}`;
      
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: company.email,
          subject: `📱 WhatsApp - Cambio de opinión solicitado (${contact_name} - ${doc_number})`,
          body: `<div style="font-family:Arial,sans-serif;max-width:600px"><div style="background:#f5a623;color:white;padding:16px;border-radius:8px 8px 0 0"><h2 style="margin:0">⚠️ Solicitud de cambio de opinión</h2></div><div style="border:1px solid #fcd34d;border-top:none;padding:20px;background:#fff"><p>${contact_name} ha solicitado cambiar su decisión.</p><p style="margin:12px 0"><strong>${doc.doc_type?.toUpperCase()} Nº${doc_number}</strong> | ${(total || 0).toFixed(2)} €</p><p style="margin:12px 0"><a href="${waLinkToClient}" style="display:inline-block;padding:12px 20px;background:#25d366;color:white;text-decoration:none;border-radius:6px;font-weight:bold;font-size:14px">📱 Enviar por WhatsApp</a></p></div></div>`
        });
      } catch (_err) {
        console.log('Email de notificación no enviado, continuando...');
      }
    }

    // Enviar enlace de cambio de opinión al cliente (si tiene email o teléfono)
    if (contact_phone || doc?.contact_email) {
      const clientPhoneSanitized = contact_phone?.replace(/\D/g, '') || '';
      const clientPhoneLink = clientPhoneSanitized && !clientPhoneSanitized.startsWith('34') ? `34${clientPhoneSanitized}` : clientPhoneSanitized;
      
      // Email al cliente con enlace
      if (doc?.contact_email) {
        const clientEmailBody = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:#0ea5e9;color:white;padding:16px 20px;border-radius:8px 8px 0 0">
    <h2 style="margin:0;font-size:20px">📝 Reconsideración de presupuesto</h2>
  </div>
  <div style="border:1px solid #bfdbfe;border-top:none;padding:20px;border-radius:0 0 8px 8px;background:#fff">
    <p style="color:#555;font-size:14px">Hola <strong>${contact_name}</strong>,</p>
    <p style="color:#555;font-size:14px">Recibimos tu solicitud para reconsiderar tu decisión sobre el presupuesto. Te reenviamos el enlace para que puedas aceptarlo o rechazarlo:</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">
      <tr style="background:#f0f9ff"><td style="padding:8px;color:#666"><strong>Presupuesto:</strong></td><td style="padding:8px">Nº ${doc_number || ''}</td></tr>
      <tr><td style="padding:8px;color:#666"><strong>Importe:</strong></td><td style="padding:8px;font-weight:bold">${(total || 0).toFixed(2)} €</td></tr>
    </table>
    <div style="margin:20px 0">
      <p style="color:#555;font-size:13px;margin:0 0 12px">Haz clic en el botón para aceptar o rechazar:</p>
      <a href="${presupuestoUrlEmail}" style="display:inline-block;padding:12px 24px;background:#0ea5e9;color:white;text-decoration:none;border-radius:6px;font-weight:bold;font-size:14px">📄 Revisar presupuesto</a>
    </div>
    <p style="color:#777;font-size:12px;margin-top:20px">Si prefieres, también puedes contactarnos directamente para resolver cualquier duda.</p>
    <hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb"/>
    <p style="font-size:12px;color:#999">${company?.company_name || ''} · ${company?.email || ''} · ${company?.phone || ''}</p>
  </div>
</div>`.trim();
        
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: doc.contact_email,
            subject: `📋 Presupuesto Nº${doc_number} - Enlace para reconsideración`,
            body: clientEmailBody,
            from_name: company?.company_name || 'Sistema'
          });
        } catch (_err) {
          console.log('Error enviando email al cliente:', _err);
        }
      }

      // Link de WhatsApp al cliente
      if (clientPhoneLink) {
        const waMsg = `Hola ${contact_name},\n\nRecibimos que deseas reconsiderar el presupuesto Nº${doc_number} por ${(total || 0).toFixed(2)} €.\n\nAquí está el enlace para que puedas aceptarlo o rechazarlo:\n\n${presupuestoUrlWhatsapp}\n\nQuedamos a tu disposición.`;
        const waLink = `https://wa.me/${clientPhoneLink}?text=${encodeURIComponent(waMsg)}`;
        
        // Enviar al admin el enlace de WhatsApp para contactar
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: company.email,
            subject: `📱 Enlace para cliente - Cambio de opinión (${contact_name})`,
            body: `<div style="font-family:Arial,sans-serif;max-width:600px"><div style="background:#25d366;color:white;padding:16px"><h3 style="margin:0">📱 Enviar por WhatsApp</h3></div><div style="border:1px solid #c6e9c9;border-top:none;padding:20px;background:#fff"><p style="color:#555">Enlace para enviar al cliente por WhatsApp:</p><p><a href="${waLink}" style="display:inline-block;padding:12px 20px;background:#25d366;color:white;text-decoration:none;border-radius:6px;font-weight:bold">📱 Abrir WhatsApp</a></p></div></div>`
          });
        } catch (_err) {
          console.log('Error enviando enlace WhatsApp:', _err);
        }
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Error en notifyChangeOpinionRequest:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});