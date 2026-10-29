import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { esc } from '../../shared/seguridadPublica.ts';

/**
 * notifyChangeOpinionRequest
 * Avisa al administrador de que un cliente quiere reconsiderar su presupuesto
 * y genera el enlace (con token de un solo uso) para que vuelva a decidir.
 *
 * Solo se atiende a un usuario con la sesión iniciada, y los datos del
 * presupuesto (cliente, número, importe) se leen del documento guardado: del
 * cuerpo de la petición únicamente se acepta el id del documento.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { doc_id } = body;

    if (!doc_id) {
      return Response.json({ error: 'doc_id requerido' }, { status: 400 });
    }

    const docs = await base44.asServiceRole.entities.Invoice.filter({ id: doc_id });
    const doc = docs?.[0];
    if (!doc) {
      return Response.json({ error: 'Documento no encontrado' }, { status: 404 });
    }

    // Datos siempre del documento, nunca de lo que llega en la petición.
    const doc_number = String(doc.doc_number || '');
    const contact_name = String(doc.contact_name || '');
    const doc_type = String(doc.doc_type || 'presupuesto');
    const total = Number(doc.total || 0);
    const contact_id = String(doc.contact_id || '');
    const previous_decision = doc.status === 'cancelado' ? 'rechazado' : 'aceptado';

    let contactPhone = '';
    let contactEmail = '';
    if (contact_id) {
      const contactos = await base44.asServiceRole.entities.Contact.filter({ id: contact_id });
      const contacto = contactos?.[0];
      contactPhone = String(contacto?.phone || contacto?.phone2 || '');
      contactEmail = String(contacto?.email || '');
    }

    // Token único de este cambio de opinión (queda guardado en la solicitud).
    const changeOpinionToken = `co_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    try {
      await base44.asServiceRole.entities.ChangeOpinionRequest.create({
        doc_id,
        doc_number,
        doc_type,
        contact_name,
        contact_id,
        contact_phone: contactPhone,
        total,
        previous_decision,
        request_datetime: new Date().toLocaleString('es-ES'),
        status: 'pendiente',
        change_opinion_token: changeOpinionToken,
      });
    } catch (createError) {
      console.error('Error creando registro:', createError);
    }

    // Registrar en el documento que se solicitó cambio de opinión.
    try {
      const changeOpinionLog = Array.isArray(doc.change_opinion_requests) ? doc.change_opinion_requests : [];
      changeOpinionLog.push({
        token: changeOpinionToken,
        requested_at: new Date().toLocaleString('es-ES'),
        previous_decision,
        status: 'pendiente',
      });
      await base44.asServiceRole.entities.Invoice.update(doc_id, { change_opinion_requests: changeOpinionLog });
    } catch (updateError) {
      console.error('Error registrando cambio de opinión en documento:', updateError);
    }

    const companies = await base44.asServiceRole.entities.CompanySettings.list();
    const company = companies?.[0];

    // Sin correo de la empresa no hay a quién avisar. Se dice por qué, en vez
    // de contestar "ok" y dejar al usuario esperando un aviso que nunca llega.
    if (!company?.email) {
      return Response.json({
        ok: false,
        motivo: 'sin_email_empresa',
        aviso: 'No se ha enviado el aviso porque la empresa no tiene correo configurado. '
          + 'Ponlo en Configuración → Datos de la empresa.',
      });
    }

    /*
     * Los enlaces salen de la dirección pública configurada.
     *
     * Antes iban escritos a mano («https://app.base44.io»), que no es la
     * dirección de este programa: al cliente le llegaba un enlace que no abría
     * en ninguna parte. Se pone en Configuración → Impresión → Verificación de
     * documentos.
     */
    const base = String(company?.public_app_url || '').trim().replace(/\/$/, '');
    if (!base) {
      return Response.json({
        ok: false,
        motivo: 'sin_direccion_publica',
        aviso: 'No se ha enviado el aviso porque falta la dirección pública del programa. '
          + 'Ponla en Configuración → Impresión → Verificación de documentos: sin ella el '
          + 'enlace que recibiría el cliente no se podría abrir.',
      });
    }

    const presupuestoUrlEmail = `${base}/presupuesto-publico?id=${doc_id}&method=email&token=${changeOpinionToken}`;
    const presupuestoUrlWhatsapp = `${base}/presupuesto-publico?id=${doc_id}&method=whatsapp&token=${changeOpinionToken}`;

    const nombreSeguro = esc(contact_name);
    const numeroSeguro = esc(doc_number);
    const empresaSeguro = esc(company?.company_name || '');
    const importe = total.toFixed(2);

    const emailBodyAdmin = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:#f59e0b;color:white;padding:16px 20px;border-radius:8px 8px 0 0">
        <h2 style="margin:0;font-size:20px">📋 Cambio de opinión solicitado</h2>
      </div>
      <div style="border:1px solid #fcd34d;border-top:none;padding:20px;border-radius:0 0 8px 8px;background:#fff">
        <p style="color:#555;font-size:14px;margin:0;margin-bottom:12px"><strong>${nombreSeguro}</strong> ha solicitado cambiar su decisión sobre el presupuesto:</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden">
          <tr><td style="padding:10px 12px;color:#666;border-bottom:1px solid #e5e7eb"><strong>Presupuesto:</strong></td><td style="padding:10px 12px;font-weight:bold;color:#1e3a5f">Nº ${numeroSeguro}</td></tr>
          <tr><td style="padding:10px 12px;color:#666;border-bottom:1px solid #e5e7eb"><strong>Cliente:</strong></td><td style="padding:10px 12px">${nombreSeguro}</td></tr>
          <tr><td style="padding:10px 12px;color:#666;border-bottom:1px solid #e5e7eb"><strong>Importe:</strong></td><td style="padding:10px 12px;font-weight:bold;color:#16a34a">${importe} €</td></tr>
          <tr><td style="padding:10px 12px;color:#666"><strong>Decisión anterior:</strong></td><td style="padding:10px 12px;font-weight:bold;color:${previous_decision === 'aceptado' ? '#16a34a' : '#dc2626'}">${previous_decision === 'aceptado' ? '✅ Aceptado' : '❌ Rechazado'}</td></tr>
        </table>
        <div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:12px;margin:16px 0;border-radius:4px">
          <p style="margin:0;color:#92400e;font-size:13px"><strong>ℹ️</strong> El cliente puede aceptar o rechazar el presupuesto nuevamente. Envía el enlace para que actualice su decisión.</p>
        </div>
        <p style="margin:16px 0 0 0"><a href="${presupuestoUrlEmail}" style="display:inline-block;padding:12px 24px;background:#0ea5e9;color:white;text-decoration:none;border-radius:6px;font-weight:bold;font-size:14px">📄 Enviar enlace al cliente</a></p>
        <hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb"/>
        <p style="font-size:12px;color:#999">${empresaSeguro} · ${esc(company?.email || '')} · ${esc(company?.phone || '')}</p>
      </div>
    </div>`.trim();

    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: company.email,
        subject: `⚠️ Solicitud de cambio de opinión - ${contact_name} (${doc_number})`,
        body: emailBodyAdmin,
        from_name: company?.company_name || 'Sistema',
      });
    } catch (_err) {
      console.log('Error enviando email al admin:', _err);
    }

    // Enlace de WhatsApp listo para mandar al cliente.
    const clientPhone = contactPhone.replace(/\D/g, '');
    if (clientPhone) {
      const clientPhoneLink = clientPhone.startsWith('34') ? clientPhone : `34${clientPhone}`;
      const waMsg = `Hola ${contact_name} 👋\n\nVimos que deseas *reconsiderar* tu decisión sobre el presupuesto.\n\n📋 *${doc_number} • ${importe} €*\n\nTe reenviamos el enlace para que puedas *aceptarlo o rechazarlo* nuevamente:\n\n${presupuestoUrlWhatsapp}\n\n✅ *Aceptar* o ❌ *Rechazar* — tú decides\n\nQuedamos a tu disposición.\n\n— ${company?.company_name || ''}`;
      const waLink = `https://wa.me/${clientPhoneLink}?text=${encodeURIComponent(waMsg)}`;

      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: company.email,
          subject: `📱 Enlace para cliente - Cambio de opinión (${contact_name})`,
          body: `<div style="font-family:Arial,sans-serif;max-width:600px"><div style="background:#25d366;color:white;padding:16px"><h3 style="margin:0">📱 Enviar por WhatsApp</h3></div><div style="border:1px solid #c6e9c9;border-top:none;padding:20px;background:#fff"><p style="color:#555">Enlace para enviar al cliente por WhatsApp:</p><p><a href="${waLink}" style="display:inline-block;padding:12px 20px;background:#25d366;color:white;text-decoration:none;border-radius:6px;font-weight:bold">📱 Abrir WhatsApp</a></p></div></div>`,
        });
      } catch (_err) {
        console.log('Error enviando enlace WhatsApp:', _err);
      }
    }

    // Copia del enlace al cliente, si tenemos su correo.
    if (contactEmail) {
      const clientEmailBody = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:#1e3a5f;color:white;padding:16px 20px;border-radius:8px 8px 0 0">
    <h2 style="margin:0;font-size:18px">${empresaSeguro || 'Presupuesto'}</h2>
    <p style="margin:4px 0 0 0;font-size:13px;opacity:0.9">Oportunidad de reconsideración</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:20px;border-radius:0 0 8px 8px;background:#fff">
    <p style="color:#555;font-size:14px;margin:0 0 16px 0">Hola <strong>${nombreSeguro}</strong>,</p>
    <p style="color:#555;font-size:14px;margin:0 0 16px 0">Nos alegra que solicites reconsiderar tu decisión sobre nuestro presupuesto. Te reenviamos el enlace para que puedas <strong>aceptarlo o rechazarlo nuevamente</strong>:</p>
    <div style="background:#f9fafb;border-left:4px solid #0ea5e9;padding:16px;margin:16px 0;border-radius:6px">
      <p style="margin:0 0 8px 0;color:#1e3a5f;font-weight:bold">📋 Detalles del presupuesto</p>
      <table style="width:100%;font-size:13px">
        <tr><td style="padding:4px 0;color:#666">Número:</td><td style="padding:4px 0;font-weight:bold">Nº ${numeroSeguro}</td></tr>
        <tr><td style="padding:4px 0;color:#666">Importe:</td><td style="padding:4px 0;font-weight:bold;color:#16a34a">${importe} €</td></tr>
      </table>
    </div>
    <div style="margin:20px 0;text-align:center;padding:16px;background:#f0f9ff;border-radius:6px">
      <p style="color:#555;font-size:13px;margin:0 0 12px 0"><strong>¿Aceptas o rechazas el presupuesto?</strong></p>
      <p style="margin:0"><a href="${presupuestoUrlEmail}" style="display:inline-block;padding:14px 28px;background:#0ea5e9;color:white;text-decoration:none;border-radius:6px;font-weight:bold;font-size:14px">✅ Abrir y decidir</a></p>
      <p style="color:#666;font-size:11px;margin:12px 0 0 0">Te llevará a una página segura para confirmar tu decisión</p>
    </div>
    <p style="color:#777;font-size:12px;margin:16px 0 0 0">Si tienes cualquier pregunta o necesitas ayuda, no dudes en contactarnos directamente al <strong>${esc(company?.phone || company?.email || '')}</strong>.</p>
    <hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb"/>
    <p style="font-size:11px;color:#999;margin:0">${empresaSeguro} · ${esc(company?.email || '')} · ${esc(company?.phone || '')}</p>
  </div>
</div>`.trim();

      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: contactEmail,
          subject: `📋 Presupuesto Nº${doc_number} - Enlace para reconsideración`,
          body: clientEmailBody,
          from_name: company?.company_name || 'Sistema',
        });
      } catch (_err) {
        console.log('Error enviando email al cliente:', _err);
      }
    }

    return Response.json({ ok: true, token: changeOpinionToken });
  } catch (error) {
    console.error('Error en notifyChangeOpinionRequest:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});