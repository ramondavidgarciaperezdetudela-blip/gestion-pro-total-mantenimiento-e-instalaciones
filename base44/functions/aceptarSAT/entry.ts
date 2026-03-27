import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

async function sendWhatsApp(phone, message) {
  if (!phone) return;
  const cleanPhone = phone.replace(/\D/g, '');
  if (!cleanPhone) return;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

function generateSignatureHistoryHTML(order, company, signatureHistory) {
  let historyHTML = '';
  
  if (signatureHistory && signatureHistory.length > 0) {
    historyHTML = '<h3 style="color:#1e3a5f;margin-top:24px;margin-bottom:12px;border-top:1px solid #e5e7eb;padding-top:16px">📋 Historial de decisiones</h3>';
    historyHTML += '<div style="background:#f9fafb;padding:16px;border-radius:8px;border-left:4px;border-left-color:#0ea5e9">';
    
    signatureHistory.forEach((item, idx) => {
      const isAccepted = item.action === 'aceptar';
      const icon = isAccepted ? '✅' : '❌';
      const actionText = isAccepted ? 'ACEPTADA' : 'RECHAZADA';
      const color = isAccepted ? '#16a34a' : '#dc2626';
      
      historyHTML += `
        <div style="margin-bottom:16px;padding-bottom:12px;${idx < signatureHistory.length - 1 ? 'border-bottom:1px solid #e5e7eb' : ''}">
          <p style="color:${color};font-weight:bold;margin:0 0 4px 0">${icon} ${actionText}</p>
          <p style="color:#666;font-size:13px;margin:0 0 8px 0">📅 <strong>${item.datetime}</strong></p>
          ${item.signature_url ? `<div style="margin-top:8px"><img src="${item.signature_url}" alt="Firma" style="max-width:200px;border:1px solid #d1d5db;border-radius:4px;background:#fff;padding:2px"/></div>` : ''}
        </div>
      `;
    });
    
    historyHTML += '</div>';
  }
  
  return historyHTML;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { order_id, action, signature, method = 'web', change_opinion_token } = body;

    if (!order_id || !action) {
      return Response.json({ error: 'Parámetros requeridos: order_id, action' }, { status: 400 });
    }

    const orders = await base44.asServiceRole.entities.SATOrder.filter({ id: order_id });
    const order = orders?.[0];

    if (!order) {
      return Response.json({ error: 'Orden SAT no encontrada' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const nowDate = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const signDatetime = `${pad(nowDate.getDate())}/${pad(nowDate.getMonth()+1)}/${nowDate.getFullYear()} ${pad(nowDate.getHours())}:${pad(nowDate.getMinutes())}:${pad(nowDate.getSeconds())}`;
    const signDateOnly = now.split('T')[0];

    // Buscar teléfono del contacto para WhatsApp
    let contactPhone = null;
    if (order.contact_id) {
      const contacts = await base44.asServiceRole.entities.Contact.filter({ id: order.contact_id });
      contactPhone = contacts?.[0]?.phone || contacts?.[0]?.phone2 || null;
    }

    if (action === 'rechazar') {
      let signatureUrl = null;
      if (signature) {
        try {
          const base64Data = signature.replace(/^data:image\/\w+;base64,/, '');
          const binaryStr = atob(base64Data);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
          const blob = new Blob([bytes], { type: 'image/jpeg' });
          const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file: blob });
          signatureUrl = uploadResult.file_url;
        } catch (_) {
          signatureUrl = signature;
        }
      }

      const newHistoryEntry = {
        action: 'rechazar',
        signature_url: signatureUrl,
        datetime: signDatetime,
        method: method,
        change_opinion_token: change_opinion_token || undefined
      };

      let updatedHistory;
      if (change_opinion_token && order.signature_history && order.signature_history.length > 0) {
        updatedHistory = [...order.signature_history.slice(0, -1), newHistoryEntry];
      } else {
        updatedHistory = [...(order.signature_history || []), newHistoryEntry];
      }

      const updateData = { 
        status: 'cancelada', 
        sign_datetime_client: signDatetime,
        signature_client: signatureUrl,
        signature_history: updatedHistory
      };

      await base44.asServiceRole.entities.SATOrder.update(order_id, updateData);

      if (order.contact_id) {
        await base44.asServiceRole.entities.ClientDocument.create({
          contact_id: order.contact_id,
          contact_name: order.contact_name,
          title: `RECHAZADA Y FIRMADA - ORDEN SAT Nº${order.order_number || ''} - ${order.contact_name}`,
          doc_type: 'orden_sat',
          description: `Orden SAT rechazada y firmada digitalmente por el cliente el ${signDatetime}. Total: ${order.total?.toFixed(2) || '0.00'} €`,
          date: signDateOnly,
        });
      }

      try {
        const companies = await base44.asServiceRole.entities.CompanySettings.list();
        const company = companies?.[0];

        let contactEmail = null;
        if (order.contact_id) {
          const contacts = await base44.asServiceRole.entities.Contact.filter({ id: order.contact_id });
          contactEmail = contacts?.[0]?.email || null;
        }

        const historyHTML = generateSignatureHistoryHTML(order, company, updatedHistory);

        const emailBodyRechazoAdmin = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:#ef4444;color:white;padding:16px 20px;border-radius:8px 8px 0 0">
      <h2 style="margin:0;font-size:20px">❌ Orden SAT RECHAZADA y firmada</h2>
      </div>
      <div style="border:1px solid #fca5a5;border-top:none;padding:20px;border-radius:0 0 8px 8px;background:#fff">
      <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:8px 0;color:#666;width:40%"><strong>Cliente:</strong></td><td style="padding:8px 0">${order.contact_name}</td></tr>
      <tr style="background:#fef2f2"><td style="padding:8px 0;color:#666"><strong>Orden SAT:</strong></td><td style="padding:8px 0">Nº${order.order_number || ''}</td></tr>
      <tr><td style="padding:8px 0;color:#666"><strong>Tipo:</strong></td><td style="padding:8px 0">${order.type?.replace(/_/g, ' ')}</td></tr>
      <tr style="background:#fef2f2"><td style="padding:8px 0;color:#666"><strong>Importe:</strong></td><td style="padding:8px 0;font-weight:bold;color:#1e3a5f">${(order.total || 0).toFixed(2)} €</td></tr>
      <tr><td style="padding:8px 0;color:#666"><strong>🕐 Fecha y hora firma:</strong></td><td style="padding:8px 0;font-weight:bold;color:#dc2626">${signDatetime}</td></tr>
      </table>
      <p style="margin-top:16px;color:#555;font-size:13px">El cliente ha firmado digitalmente el rechazo de la orden SAT.</p>
      ${signature ? `<div style="margin-top:16px"><p style="font-size:13px;color:#666;margin-bottom:6px"><strong>Firma digital del cliente:</strong></p><img src="${signature}" alt="Firma" style="max-width:280px;border:1px solid #fca5a5;border-radius:6px;background:#fff;padding:4px"/></div>` : ''}
      ${historyHTML}
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
      <h3 style="color:#dc2626">❌ Confirmación de rechazo de la orden SAT</h3>
      <p style="color:#555;font-size:14px">Estimado/a <strong>${order.contact_name}</strong>,</p>
      <p style="color:#555;font-size:14px">Le confirmamos que hemos registrado su <strong>rechazo firmado</strong> de la siguiente orden SAT:</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">
      <tr style="background:#f9fafb"><td style="padding:8px;color:#666"><strong>Orden:</strong></td><td style="padding:8px">Nº${order.order_number || ''}</td></tr>
      <tr><td style="padding:8px;color:#666"><strong>Tipo:</strong></td><td style="padding:8px">${order.type?.replace(/_/g, ' ')}</td></tr>
      <tr style="background:#f9fafb"><td style="padding:8px;color:#666"><strong>Importe:</strong></td><td style="padding:8px;font-weight:bold">${(order.total || 0).toFixed(2)} €</td></tr>
      <tr><td style="padding:8px;color:#666"><strong>🕐 Firmado el:</strong></td><td style="padding:8px;font-weight:bold;color:#dc2626">${signDatetime}</td></tr>
      </table>
      ${signature ? `<div style="margin-top:12px"><p style="font-size:13px;color:#666;margin-bottom:6px"><strong>Su firma digital registrada:</strong></p><img src="${signature}" alt="Firma" style="max-width:250px;border:1px solid #e5e7eb;border-radius:6px;background:#fff;padding:4px"/></div>` : ''}
      ${historyHTML}
      <p style="color:#555;font-size:13px;margin-top:16px">Si desea más información o tiene alguna duda, no dude en contactarnos.</p>
      <hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb"/>
      <p style="font-size:12px;color:#999">${company?.company_name || ''} · ${company?.phone || ''} · ${company?.email || ''}</p>
      </div>
      </div>`.trim();

        if (company?.email) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: company.email,
            subject: `❌ Orden SAT rechazada y firmada - ${order.contact_name} (${signDatetime})`,
            body: emailBodyRechazoAdmin
          });
        }
        if (contactEmail) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: contactEmail,
            subject: `Confirmación de rechazo - Orden SAT Nº${order.order_number || ''} - ${company?.company_name || ''}`,
            body: emailBodyRechazoCliente
          });
        }

        const waMsg = `❌ *ORDEN SAT RECHAZADA*\n\n🔧 Orden Nº${order.order_number || ''}\n👤 ${order.contact_name}\n💶 ${(order.total || 0).toFixed(2)} €\n🕐 Firmado el: ${signDatetime}\n\nHemos recibido su firma de rechazo. Si desea revisarlo o tiene alguna consulta, contáctenos.\n\n— ${company?.company_name || ''}`;
        const waUrl = await sendWhatsApp(contactPhone, waMsg);
        return Response.json({ ok: true, action: 'rechazada', whatsapp_url: waUrl, sign_datetime: signDatetime });
      } catch (_emailErr) {
        // No fallar si el email no se envía
      }

      return Response.json({ ok: true, action: 'rechazada', sign_datetime: signDatetime });
    }

    if (action === 'aceptar') {
      if (!signature) {
        return Response.json({ error: 'Se requiere firma para aceptar' }, { status: 400 });
      }

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
        // Si falla el upload, seguimos con el base64
      }

      const newHistoryEntry = {
        action: 'aceptar',
        signature_url: signatureUrl,
        datetime: signDatetime,
        method: method,
        change_opinion_token: change_opinion_token || undefined
      };

      let updatedHistory;
      if (change_opinion_token && order.signature_history && order.signature_history.length > 0) {
        updatedHistory = [...order.signature_history.slice(0, -1), newHistoryEntry];
      } else {
        updatedHistory = [...(order.signature_history || []), newHistoryEntry];
      }

      await base44.asServiceRole.entities.SATOrder.update(order_id, {
        status: 'en_curso',
        signature_client: signatureUrl,
        sign_datetime_client: signDatetime,
        signature_history: updatedHistory
      });

      if (order.contact_id) {
        await base44.asServiceRole.entities.ClientDocument.create({
          contact_id: order.contact_id,
          contact_name: order.contact_name,
          title: `ACEPTADA Y FIRMADA - ORDEN SAT Nº${order.order_number || ''} - ${order.contact_name}`,
          doc_type: 'orden_sat',
          description: `Orden SAT aceptada y firmada digitalmente por el cliente el ${signDatetime}. Total: ${(order.total || 0).toFixed(2)} €`,
          date: signDateOnly,
        });
      }

      try {
        const companies = await base44.asServiceRole.entities.CompanySettings.list();
        const company = companies?.[0];

        let contactEmail = null;
        if (order.contact_id) {
          const contacts = await base44.asServiceRole.entities.Contact.filter({ id: order.contact_id });
          contactEmail = contacts?.[0]?.email || null;
        }

        const historyHTML = generateSignatureHistoryHTML(order, company, updatedHistory);

        const emailBodyAceptadoAdmin = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <div style="background:#16a34a;color:white;padding:16px 20px;border-radius:8px 8px 0 0">
        <h2 style="margin:0;font-size:20px">✅ Orden SAT ACEPTADA y firmada</h2>
        </div>
        <div style="border:1px solid #86efac;border-top:none;padding:20px;border-radius:0 0 8px 8px;background:#fff">
        <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:8px 0;color:#666;width:40%"><strong>Cliente:</strong></td><td style="padding:8px 0">${order.contact_name}</td></tr>
        <tr style="background:#f0fdf4"><td style="padding:8px 0;color:#666"><strong>Orden SAT:</strong></td><td style="padding:8px 0">Nº${order.order_number || ''}</td></tr>
        <tr><td style="padding:8px 0;color:#666"><strong>Tipo:</strong></td><td style="padding:8px 0">${order.type?.replace(/_/g, ' ')}</td></tr>
        <tr style="background:#f0fdf4"><td style="padding:8px 0;color:#666"><strong>Importe:</strong></td><td style="padding:8px 0;font-weight:bold;color:#1e3a5f">${(order.total || 0).toFixed(2)} €</td></tr>
        <tr><td style="padding:8px 0;color:#666"><strong>🕐 Fecha y hora firma:</strong></td><td style="padding:8px 0;font-weight:bold;color:#16a34a">${signDatetime}</td></tr>
        </table>
        <p style="margin-top:16px;color:#555;font-size:13px">El cliente ha firmado digitalmente la aceptación de la orden SAT. La orden ha sido archivada en su ficha de cliente.</p>
        <div style="margin-top:16px"><p style="font-size:13px;color:#666;margin-bottom:6px"><strong>Firma digital del cliente:</strong></p><img src="${signature}" alt="Firma" style="max-width:280px;border:1px solid #86efac;border-radius:6px;background:#fff;padding:4px"/></div>
        ${historyHTML}
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
        <h3 style="color:#16a34a">✅ Confirmación de aceptación de la orden SAT</h3>
        <p style="color:#555;font-size:14px">Estimado/a <strong>${order.contact_name}</strong>,</p>
        <p style="color:#555;font-size:14px">Le confirmamos que hemos registrado su <strong>aceptación firmada</strong> de la siguiente orden SAT:</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">
        <tr style="background:#f9fafb"><td style="padding:8px;color:#666"><strong>Orden:</strong></td><td style="padding:8px">Nº${order.order_number || ''}</td></tr>
        <tr><td style="padding:8px;color:#666"><strong>Tipo:</strong></td><td style="padding:8px">${order.type?.replace(/_/g, ' ')}</td></tr>
        <tr style="background:#f9fafb"><td style="padding:8px;color:#666"><strong>Importe:</strong></td><td style="padding:8px;font-weight:bold">${(order.total || 0).toFixed(2)} €</td></tr>
        <tr><td style="padding:8px;color:#666"><strong>🕐 Firmado el:</strong></td><td style="padding:8px;font-weight:bold;color:#16a34a">${signDatetime}</td></tr>
        </table>
        <div style="margin-top:12px"><p style="font-size:13px;color:#666;margin-bottom:6px"><strong>Su firma digital registrada:</strong></p><img src="${signature}" alt="Firma" style="max-width:250px;border:1px solid #e5e7eb;border-radius:6px;background:#fff;padding:4px"/></div>
        ${historyHTML}
        <p style="color:#555;font-size:13px;margin-top:16px">Nos pondremos en contacto con usted en breve para coordinar los trabajos. ¡Gracias por confiar en nosotros!</p>
        <hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb"/>
        <p style="font-size:12px;color:#999">${company?.company_name || ''} · ${company?.phone || ''} · ${company?.email || ''}</p>
        </div>
        </div>`.trim();

        if (company?.email) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: company.email,
            subject: `✅ Orden SAT aceptada y firmada - ${order.contact_name} (${signDatetime})`,
            body: emailBodyAceptadoAdmin
          });
        }
        if (contactEmail) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: contactEmail,
            subject: `Confirmación de aceptación - Orden SAT Nº${order.order_number || ''} - ${company?.company_name || ''}`,
            body: emailBodyAceptadoCliente
          });
        }

        const waMsg = `✅ *ORDEN SAT ACEPTADA*\n\n🔧 Orden Nº${order.order_number || ''}\n👤 ${order.contact_name}\n💶 ${(order.total || 0).toFixed(2)} €\n🕐 Firmado el: ${signDatetime}\n\nHemos recibido su firma de aceptación. Nos pondremos en contacto con usted en breve para coordinar los trabajos.\n\nGracias por confiar en nosotros.\n\n— ${company?.company_name || ''}`;
        const waUrl = await sendWhatsApp(contactPhone, waMsg);
        return Response.json({ ok: true, action: 'aceptada', whatsapp_url: waUrl, sign_datetime: signDatetime });
      } catch (_emailErr) {
        // No fallar si el email no se envía
      }

      return Response.json({ ok: true, action: 'aceptada', sign_datetime: signDatetime });
    }

    return Response.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});