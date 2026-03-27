import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { doc_id, doc_number, contact_name, total, contact_phone, doc_type = 'presupuesto', contact_id = '', previous_decision = '' } = body;

    if (!doc_id) {
      return Response.json({ error: 'doc_id requerido' }, { status: 400 });
    }

    // Generar token único para este cambio de opinión
    const changeOpinionToken = `co_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
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
        status: 'pendiente',
        change_opinion_token: changeOpinionToken
      });
    } catch (createError) {
      console.error('Error creando registro:', createError);
    }
    
    // Registrar en el documento que se solicitó cambio de opinión
    try {
      if (doc) {
        const changeOpinionLog = doc.change_opinion_requests || [];
        changeOpinionLog.push({
          token: changeOpinionToken,
          requested_at: new Date().toLocaleString('es-ES'),
          previous_decision: previous_decision,
          status: 'pendiente'
        });
        await base44.asServiceRole.entities.Invoice.update(doc_id, {
          change_opinion_requests: changeOpinionLog
        });
      }
    } catch (updateError) {
      console.error('Error registrando cambio de opinión en documento:', updateError);
    }

    // Obtener documento y configuración
    const docs = await base44.asServiceRole.entities.Invoice.filter({ id: doc_id });
    const doc = docs?.[0];
    const companies = await base44.asServiceRole.entities.CompanySettings.list();
    const company = companies?.[0];

    if (!company?.email) {
      return Response.json({ ok: true });
    }

    // Generar enlaces únicos para este cambio de opinión con token
    const presupuestoUrlEmail = `https://app.base44.io/presupuesto-publico?id=${doc_id}&method=email&token=${changeOpinionToken}`;
    const presupuestoUrlWhatsapp = `https://app.base44.io/presupuesto-publico?id=${doc_id}&method=whatsapp&token=${changeOpinionToken}`;

    // Enviar email al admin
    const emailBodyAdmin = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:#f59e0b;color:white;padding:16px 20px;border-radius:8px 8px 0 0">
        <h2 style="margin:0;font-size:20px">📋 Cambio de opinión solicitado</h2>
      </div>
      <div style="border:1px solid #fcd34d;border-top:none;padding:20px;border-radius:0 0 8px 8px;background:#fff">
        <p style="color:#555;font-size:14px;margin:0;margin-bottom:12px"><strong>${contact_name}</strong> ha solicitado cambiar su decisión sobre el presupuesto:</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden">
          <tr><td style="padding:10px 12px;color:#666;border-bottom:1px solid #e5e7eb"><strong>Presupuesto:</strong></td><td style="padding:10px 12px;font-weight:bold;color:#1e3a5f">Nº ${doc_number || ''}</td></tr>
          <tr><td style="padding:10px 12px;color:#666;border-bottom:1px solid #e5e7eb"><strong>Cliente:</strong></td><td style="padding:10px 12px">${contact_name}</td></tr>
          <tr><td style="padding:10px 12px;color:#666;border-bottom:1px solid #e5e7eb"><strong>Importe:</strong></td><td style="padding:10px 12px;font-weight:bold;color:#16a34a">${(total || 0).toFixed(2)} €</td></tr>
          <tr><td style="padding:10px 12px;color:#666"><strong>Decisión anterior:</strong></td><td style="padding:10px 12px;font-weight:bold;color:#${previous_decision === 'aceptado' ? '16a34a' : 'dc2626'}">${previous_decision === 'aceptado' ? '✅ Aceptado' : '❌ Rechazado'}</td></tr>
        </table>
        <div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:12px;margin:16px 0;border-radius:4px">
          <p style="margin:0;color:#92400e;font-size:13px"><strong>ℹ️</strong> El cliente puede aceptar o rechazar el presupuesto nuevamente. Envía el enlace para que actualice su decisión.</p>
        </div>
        <p style="margin:16px 0 0 0"><a href="${presupuestoUrlEmail}" style="display:inline-block;padding:12px 24px;background:#0ea5e9;color:white;text-decoration:none;border-radius:6px;font-weight:bold;font-size:14px">📄 Enviar enlace al cliente</a></p>
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
  <div style="background:#1e3a5f;color:white;padding:16px 20px;border-radius:8px 8px 0 0">
    <h2 style="margin:0;font-size:18px">${company?.company_name || 'Presupuesto'}</h2>
    <p style="margin:4px 0 0 0;font-size:13px;opacity:0.9">Oportunidad de reconsideración</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:20px;border-radius:0 0 8px 8px;background:#fff">
    <p style="color:#555;font-size:14px;margin:0 0 16px 0">Hola <strong>${contact_name}</strong>,</p>
    <p style="color:#555;font-size:14px;margin:0 0 16px 0">Nos alegra que solicites reconsiderar tu decisión sobre nuestro presupuesto. Te reenviamos el enlace para que puedas <strong>aceptarlo o rechazarlo nuevamente</strong>:</p>
    
    <div style="background:#f9fafb;border-left:4px solid #0ea5e9;padding:16px;margin:16px 0;border-radius:6px">
      <p style="margin:0 0 8px 0;color:#1e3a5f;font-weight:bold">📋 Detalles del presupuesto</p>
      <table style="width:100%;font-size:13px">
        <tr><td style="padding:4px 0;color:#666">Número:</td><td style="padding:4px 0;font-weight:bold">Nº ${doc_number || ''}</td></tr>
        <tr><td style="padding:4px 0;color:#666">Importe:</td><td style="padding:4px 0;font-weight:bold;color:#16a34a">${(total || 0).toFixed(2)} €</td></tr>
      </table>
    </div>
    
    <div style="margin:20px 0;text-align:center;padding:16px;background:#f0f9ff;border-radius:6px">
      <p style="color:#555;font-size:13px;margin:0 0 12px 0"><strong>¿Aceptas o rechazas el presupuesto?</strong></p>
      <p style="margin:0"><a href="${presupuestoUrlEmail}" style="display:inline-block;padding:14px 28px;background:#0ea5e9;color:white;text-decoration:none;border-radius:6px;font-weight:bold;font-size:14px">✅ Abrir y decidir</a></p>
      <p style="color:#666;font-size:11px;margin:12px 0 0 0">Te llevará a una página segura para confirmar tu decisión</p>
    </div>
    
    <p style="color:#777;font-size:12px;margin:16px 0 0 0">Si tienes cualquier pregunta o necesitas ayuda, no dudes en contactarnos directamente al <strong>${company?.phone || company?.email || ''}</strong>.</p>
    <hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb"/>
    <p style="font-size:11px;color:#999;margin:0">${company?.company_name || ''} · ${company?.email || ''} · ${company?.phone || ''}</p>
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
        const waMsg = `Hola ${contact_name} 👋\n\nVimos que deseas *reconsiderar* tu decisión sobre el presupuesto.\n\n📋 *${doc_number} • ${(total || 0).toFixed(2)} €*\n\nTe reenviamos el enlace para que puedas *aceptarlo o rechazarlo* nuevamente:\n\n${presupuestoUrlWhatsapp}\n\n✅ *Aceptar* o ❌ *Rechazar* — tú decides\n\nQuedamos a tu disposición.\n\n— ${company?.company_name || ''}`;
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