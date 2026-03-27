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
      const updateData = { status: 'cancelado' };
      if (signature) updateData.signature_client = signature;

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

      // Notificar por email al admin
      try {
        const companies = await base44.asServiceRole.entities.CompanySettings.list();
        const company = companies?.[0];
        if (company?.email) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: company.email,
            subject: `❌ Presupuesto rechazado y firmado - ${doc.contact_name}`,
            body: `
<h2>Presupuesto rechazado</h2>
<p><strong>Cliente:</strong> ${doc.contact_name}</p>
<p><strong>Documento:</strong> ${doc.doc_type?.toUpperCase()} Nº${doc.doc_number || ''}</p>
<p><strong>Importe:</strong> ${(doc.total || 0).toFixed(2)} €</p>
<p><strong>Fecha y hora de firma:</strong> ${signDatetime}</p>
<br/>
<p>El cliente ha firmado digitalmente el rechazo del presupuesto.</p>
${signature ? `<img src="${signature}" alt="Firma cliente" style="max-width:300px;border:1px solid #ddd;border-radius:8px;margin-top:12px"/>` : ''}
            `.trim()
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

      // Actualizar factura con firma y estado enviado/aceptado
      await base44.asServiceRole.entities.Invoice.update(doc_id, {
        status: 'enviado',
        signature_client: signature,
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

      // Notificar por email al admin si hay empresa configurada
      try {
        const companies = await base44.asServiceRole.entities.CompanySettings.list();
        const company = companies?.[0];
        if (company?.email) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: company.email,
            subject: `✅ Presupuesto aceptado y firmado - ${doc.contact_name}`,
            body: `
<h2>Presupuesto aceptado</h2>
<p><strong>Cliente:</strong> ${doc.contact_name}</p>
<p><strong>Documento:</strong> ${doc.doc_type?.toUpperCase()} Nº${doc.doc_number || ''}</p>
<p><strong>Importe:</strong> ${(doc.total || 0).toFixed(2)} €</p>
<p><strong>Fecha y hora de firma:</strong> ${signDatetime}</p>
<br/>
<p>El cliente ha firmado digitalmente el presupuesto. El documento ha sido archivado en su ficha de cliente.</p>
<img src="${signature}" alt="Firma cliente" style="max-width:300px;border:1px solid #ddd;border-radius:8px;margin-top:12px"/>
            `.trim()
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