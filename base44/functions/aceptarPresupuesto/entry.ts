import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

async function sendWhatsApp(phone, message) {
  if (!phone) return;
  const cleanPhone = phone.replace(/\D/g, '');
  if (!cleanPhone) return;
  // Usar la API de WhatsApp web con un enlace de texto (no requiere integración)
  // Esto genera un mensaje preformateado que se abre en WhatsApp del cliente
  // Para envío automático real se necesitaría Twilio/WhatsApp Business API
  // Por ahora guardamos el mensaje para mostrarlo
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { doc_id, action, signature } = body;

    if (!doc_id || !action) {
      return Response.json({ error: 'Parámetros requeridos: doc_id, action' }, { status: 400 });
    }

    // Get document
    const docs = await base44.asServiceRole.entities.Invoice.filter({ id: doc_id });
    const doc = docs?.[0];

    if (!doc) {
      return Response.json({ error: 'Documento no encontrado' }, { status: 404 });
    }

    const now = new Date().toISOString();
    // Formato legible para España: DD/MM/YYYY HH:MM:SS
    const nowDate = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const signDatetime = `${pad(nowDate.getDate())}/${pad(nowDate.getMonth()+1)}/${nowDate.getFullYear()} ${pad(nowDate.getHours())}:${pad(nowDate.getMinutes())}:${pad(nowDate.getSeconds())}`;
    const signDateOnly = now.split('T')[0];

    // Buscar teléfono del contacto para WhatsApp
    let contactPhone = null;
    if (doc.contact_id) {
      const contacts = await base44.asServiceRole.entities.Contact.filter({ id: doc.contact_id });
      contactPhone = contacts?.[0]?.phone || contacts?.[0]?.phone2 || null;
    }

    if (action === 'rechazar') {
      const updateData = { status: 'cancelado', sign_datetime: signDatetime };
      if (signature) {
        try {
          const base64Data = signature.replace(/^data:image\/\w+;base64,/, '');
          const binaryStr = atob(base64Data);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
          const blob = new Blob([bytes], { type: 'image/jpeg' });
          const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file: blob });
          updateData.signature_client = uploadResult.file_url;
        } catch (_) {
          updateData.signature_client = signature;
        }
      }

      await base44.asServiceRole.entities.Invoice.update(doc_id, updateData);

      // Archivar en ClientDocument como rechazado
      if (doc.contact_id) {
        await base44.asServiceRole.entities.ClientDocument.create({
          contact_id: doc.contact_id,
          contact_name: doc.contact_name,
          title: `RECHAZADO Y FIRMADO - ${doc.doc_type?.toUpperCase()} Nº${doc.doc_number || ''} - ${doc.contact_name}`,
          doc_type: 'presupuesto',
          description: `Presupuesto rechazado y firmado digitalmente por el cliente el ${signDatetime}. Total: ${doc.total?.toFixed(2)} €`,
          date: signDateOnly,
        });
      }

      try {
        const companies = await base44.asServiceRole.entities.CompanySettings.list();
        const company = companies?.[0];

        // Buscar email del contacto
        let contactEmail = null;
        if (doc.contact_id) {
          const contacts = await base44.asServiceRole.entities.Contact.filter({ id: doc.contact_id });
          contactEmail = contacts?.[0]?.email || null;
        }

        const emailBodyRechazoAdmin = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:#ef4444;color:white;padding:16px 20px;border-radius:8px 8px 0 0">
    <h2 style="margin:0;font-size:20px">❌ Presupuesto RECHAZADO y firmado</h2>
  </div>
  <div style="border:1px solid #fca5a5;border-top:none;padding:20px;border-radius:0 0 8px 8px;background:#fff">
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:8px 0;color:#666;width:40%"><strong>Cliente:</strong></td><td style="padding:8px 0">${doc.contact_name}</td></tr>
      <tr style="background:#fef2f2"><td style="padding:8px 0;color:#666"><strong>Documento:</strong></td><td style="padding:8px 0">${doc.doc_type?.toUpperCase()} Nº${doc.doc_number || ''}</td></tr>
      <tr><td style="padding:8px 0;color:#666"><strong>Importe:</strong></td><td style="padding:8px 0;font-weight:bold;color:#1e3a5f">${(doc.total || 0).toFixed(2)} €</td></tr>
      <tr style="background:#fef2f2"><td style="padding:8px 0;color:#666"><strong>🕐 Fecha y hora firma:</strong></td><td style="padding:8px 0;font-weight:bold;color:#dc2626">${signDatetime}</td></tr>
    </table>
    <p style="margin-top:16px;color:#555;font-size:13px">El cliente ha firmado digitalmente el rechazo del presupuesto.</p>
    ${signature ? `<div style="margin-top:16px"><p style="font-size:13px;color:#666;margin-bottom:6px"><strong>Firma digital del cliente:</strong></p><img src="${signature}" alt="Firma" style="max-width:280px;border:1px solid #fca5a5;border-radius:6px;background:#fff;padding:4px"/></div>` : ''}
    <hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb"/>
    <p style="font-size:12px;color:#999">${company?.company_name || ''} · ${company?.email || ''} · ${company?.phone || ''}</p>
  </div>
</div>`.trim();

        const emailBodyRechazoCliente = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:#1e3a5f;color:white;padding:16px 20px;border-radius:8px 8px 0 0">
    <h2 style="margin:0;font-size:18px">${company?.company_name || ''}</h2>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:20px;border-radius:0 0 8px 8px;background:#fff">
    <h3 style="color:#dc2626">❌ Confirmación de rechazo del presupuesto</h3>
    <p style="color:#555;font-size:14px">Estimado/a <strong>${doc.contact_name}</strong>,</p>
    <p style="color:#555;font-size:14px">Le confirmamos que hemos registrado su <strong>rechazo firmado</strong> del siguiente presupuesto:</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">
      <tr style="background:#f9fafb"><td style="padding:8px;color:#666"><strong>Documento:</strong></td><td style="padding:8px">${doc.doc_type?.toUpperCase()} Nº${doc.doc_number || ''}</td></tr>
      <tr><td style="padding:8px;color:#666"><strong>Importe:</strong></td><td style="padding:8px;font-weight:bold">${(doc.total || 0).toFixed(2)} €</td></tr>
      <tr style="background:#f9fafb"><td style="padding:8px;color:#666"><strong>🕐 Firmado el:</strong></td><td style="padding:8px;font-weight:bold;color:#dc2626">${signDatetime}</td></tr>
    </table>
    ${signature ? `<div style="margin-top:12px"><p style="font-size:13px;color:#666;margin-bottom:6px"><strong>Su firma digital registrada:</strong></p><img src="${signature}" alt="Firma" style="max-width:250px;border:1px solid #e5e7eb;border-radius:6px;background:#fff;padding:4px"/></div>` : ''}
    <p style="color:#555;font-size:13px;margin-top:16px">Si ha cambiado de opinión o desea más información, no dude en contactarnos.</p>
    <hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb"/>
    <p style="font-size:12px;color:#999">${company?.company_name || ''} · ${company?.phone || ''} · ${company?.email || ''}</p>
  </div>
</div>`.trim();

        // Email al admin
        if (company?.email) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: company.email,
            subject: `❌ Presupuesto rechazado y firmado - ${doc.contact_name} (${signDatetime})`,
            body: emailBodyRechazoAdmin
          });
        }
        // Email al cliente
        if (contactEmail) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: contactEmail,
            subject: `Confirmación de rechazo - ${doc.doc_type?.toUpperCase()} Nº${doc.doc_number || ''} - ${company?.company_name || ''}`,
            body: emailBodyRechazoCliente
          });
        }

        // Generar enlace WhatsApp para el cliente con resumen del rechazo
        const waMsg = `❌ *PRESUPUESTO RECHAZADO*\n\n📄 ${doc.doc_type?.toUpperCase()} Nº${doc.doc_number || ''}\n👤 ${doc.contact_name}\n💶 ${(doc.total || 0).toFixed(2)} €\n🕐 Firmado el: ${signDatetime}\n\nHemos recibido su firma de rechazo. Si desea revisarlo o tiene alguna consulta, contáctenos.\n\n— ${company?.company_name || ''}`;
        const waUrl = await sendWhatsApp(contactPhone, waMsg);
        return Response.json({ ok: true, action: 'rechazado', whatsapp_url: waUrl, sign_datetime: signDatetime });
      } catch (_emailErr) {
        // No fallar si el email no se envía
      }

      return Response.json({ ok: true, action: 'rechazado', sign_datetime: signDatetime });
    }

    if (action === 'aceptar') {
      if (!signature) {
        return Response.json({ error: 'Se requiere firma para aceptar' }, { status: 400 });
      }

      // Subir firma como archivo para evitar el límite de tamaño de entidad
      let signatureUrl = signature;
      try {
        const base64Data = signature.replace(/^data:image\/\w+;base64,/, '');
        const binaryStr = atob(base64Data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'image/jpeg' });
        const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file: blob });
        signatureUrl = uploadResult.file_url;
      } catch (_uploadErr) {
        // Si falla el upload, seguimos con el base64 (puede fallar en entidad si es grande)
      }

      // Actualizar factura con firma y estado enviado/aceptado
      await base44.asServiceRole.entities.Invoice.update(doc_id, {
        status: 'enviado',
        signature_client: signatureUrl,
        sign_datetime: signDatetime,
      });

      // Archivar en ClientDocument como aceptado y firmado
      if (doc.contact_id) {
        await base44.asServiceRole.entities.ClientDocument.create({
          contact_id: doc.contact_id,
          contact_name: doc.contact_name,
          title: `ACEPTADO Y FIRMADO - ${doc.doc_type?.toUpperCase()} Nº${doc.doc_number || ''} - ${doc.contact_name}`,
          doc_type: 'presupuesto',
          description: `Presupuesto aceptado y firmado digitalmente por el cliente el ${signDatetime}. Total: ${(doc.total || 0).toFixed(2)} €`,
          date: signDateOnly,
        });
      }

      try {
        const companies = await base44.asServiceRole.entities.CompanySettings.list();
        const company = companies?.[0];

        // Buscar email del contacto
        let contactEmail = null;
        if (doc.contact_id) {
          const contacts = await base44.asServiceRole.entities.Contact.filter({ id: doc.contact_id });
          contactEmail = contacts?.[0]?.email || null;
        }

        const emailBodyAceptadoAdmin = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:#16a34a;color:white;padding:16px 20px;border-radius:8px 8px 0 0">
    <h2 style="margin:0;font-size:20px">✅ Presupuesto ACEPTADO y firmado</h2>
  </div>
  <div style="border:1px solid #86efac;border-top:none;padding:20px;border-radius:0 0 8px 8px;background:#fff">
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:8px 0;color:#666;width:40%"><strong>Cliente:</strong></td><td style="padding:8px 0">${doc.contact_name}</td></tr>
      <tr style="background:#f0fdf4"><td style="padding:8px 0;color:#666"><strong>Documento:</strong></td><td style="padding:8px 0">${doc.doc_type?.toUpperCase()} Nº${doc.doc_number || ''}</td></tr>
      <tr><td style="padding:8px 0;color:#666"><strong>Importe:</strong></td><td style="padding:8px 0;font-weight:bold;color:#1e3a5f">${(doc.total || 0).toFixed(2)} €</td></tr>
      <tr style="background:#f0fdf4"><td style="padding:8px 0;color:#666"><strong>🕐 Fecha y hora firma:</strong></td><td style="padding:8px 0;font-weight:bold;color:#16a34a">${signDatetime}</td></tr>
    </table>
    <p style="margin-top:16px;color:#555;font-size:13px">El cliente ha firmado digitalmente el presupuesto. El documento ha sido archivado en su ficha de cliente.</p>
    <div style="margin-top:16px"><p style="font-size:13px;color:#666;margin-bottom:6px"><strong>Firma digital del cliente:</strong></p><img src="${signature}" alt="Firma" style="max-width:280px;border:1px solid #86efac;border-radius:6px;background:#fff;padding:4px"/></div>
    <hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb"/>
    <p style="font-size:12px;color:#999">${company?.company_name || ''} · ${company?.email || ''} · ${company?.phone || ''}</p>
  </div>
</div>`.trim();

        const emailBodyAceptadoCliente = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:#1e3a5f;color:white;padding:16px 20px;border-radius:8px 8px 0 0">
    <h2 style="margin:0;font-size:18px">${company?.company_name || ''}</h2>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:20px;border-radius:0 0 8px 8px;background:#fff">
    <h3 style="color:#16a34a">✅ Confirmación de aceptación del presupuesto</h3>
    <p style="color:#555;font-size:14px">Estimado/a <strong>${doc.contact_name}</strong>,</p>
    <p style="color:#555;font-size:14px">Le confirmamos que hemos registrado su <strong>aceptación firmada</strong> del siguiente presupuesto:</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">
      <tr style="background:#f9fafb"><td style="padding:8px;color:#666"><strong>Documento:</strong></td><td style="padding:8px">${doc.doc_type?.toUpperCase()} Nº${doc.doc_number || ''}</td></tr>
      <tr><td style="padding:8px;color:#666"><strong>Importe:</strong></td><td style="padding:8px;font-weight:bold">${(doc.total || 0).toFixed(2)} €</td></tr>
      <tr style="background:#f9fafb"><td style="padding:8px;color:#666"><strong>🕐 Firmado el:</strong></td><td style="padding:8px;font-weight:bold;color:#16a34a">${signDatetime}</td></tr>
    </table>
    <div style="margin-top:12px"><p style="font-size:13px;color:#666;margin-bottom:6px"><strong>Su firma digital registrada:</strong></p><img src="${signature}" alt="Firma" style="max-width:250px;border:1px solid #e5e7eb;border-radius:6px;background:#fff;padding:4px"/></div>
    <p style="color:#555;font-size:13px;margin-top:16px">Nos pondremos en contacto con usted en breve para coordinar los trabajos. ¡Gracias por confiar en nosotros!</p>
    <hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb"/>
    <p style="font-size:12px;color:#999">${company?.company_name || ''} · ${company?.phone || ''} · ${company?.email || ''}</p>
  </div>
</div>`.trim();

        // Email al admin
        if (company?.email) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: company.email,
            subject: `✅ Presupuesto aceptado y firmado - ${doc.contact_name} (${signDatetime})`,
            body: emailBodyAceptadoAdmin
          });
        }
        // Email al cliente
        if (contactEmail) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: contactEmail,
            subject: `Confirmación de aceptación - ${doc.doc_type?.toUpperCase()} Nº${doc.doc_number || ''} - ${company?.company_name || ''}`,
            body: emailBodyAceptadoCliente
          });
        }

        // Generar enlace WhatsApp para el cliente con resumen de aceptación
        const waMsg = `✅ *PRESUPUESTO ACEPTADO*\n\n📄 ${doc.doc_type?.toUpperCase()} Nº${doc.doc_number || ''}\n👤 ${doc.contact_name}\n💶 ${(doc.total || 0).toFixed(2)} €\n🕐 Firmado el: ${signDatetime}\n\nHemos recibido su firma de aceptación. Nos pondremos en contacto con usted en breve para coordinar los trabajos.\n\nGracias por confiar en nosotros.\n\n— ${company?.company_name || ''}`;
        const waUrl = await sendWhatsApp(contactPhone, waMsg);
        return Response.json({ ok: true, action: 'aceptado', whatsapp_url: waUrl, sign_datetime: signDatetime });
      } catch (_emailErr) {
        // No fallar si el email no se envía
      }

      return Response.json({ ok: true, action: 'aceptado', sign_datetime: signDatetime });
    }

    return Response.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});