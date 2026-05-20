import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { order_id, action } = await req.json();

    if (!order_id) {
      return Response.json({ error: 'order_id is required' }, { status: 400 });
    }

    // Obtener la orden SAT
    const orders = await base44.asServiceRole.entities.SATOrder.filter({ id: order_id });
    const order = orders[0];

    if (!order) {
      return Response.json({ error: 'Orden SAT no encontrada' }, { status: 404 });
    }

    const company = (await base44.asServiceRole.entities.CompanySettings.list())[0];
    const contact = order.contact_id ? (await base44.asServiceRole.entities.Contact.filter({ id: order.contact_id }))[0] : null;

    if (!contact?.email) {
      return Response.json({ error: 'Cliente sin email registrado' }, { status: 400 });
    }

    // Generar HTML con historial de firmas
    const signatureHistoryHTML = order.signature_history?.map((item, idx) => {
      const actionText = item.action === 'aceptar' ? 'ACEPTADA' : 'RECHAZADA';
      const icon = item.action === 'aceptar' ? '✅' : '❌';
      return `
        <div style="border-bottom: 1px solid #e0e0e0; padding: 12px 0; margin: 8px 0;">
          <p style="font-weight: bold; color: ${item.action === 'aceptar' ? '#16a34a' : '#dc2626'};margin: 0;">
            ${icon} ${actionText}
          </p>
          <p style="font-size: 12px; color: #666; margin: 4px 0;">📅 ${item.datetime}</p>
          <p style="font-size: 12px; color: #999; margin: 4px 0;">
            ${item.method === 'email' ? '📧 Email' : item.method === 'whatsapp' ? '📱 WhatsApp' : '🌐 Web'}
          </p>
          ${item.signature_url ? `<img src="${item.signature_url}" style="max-width: 150px; margin-top: 8px; border: 1px solid #ddd; border-radius: 4px;" />` : ''}
        </div>
      `;
    }).join('') || '';

    const emailHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e3a5f 0%, #0ea5e9 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; }
            .header p { margin: 4px 0 0 0; opacity: 0.9; }
            .section { background: #f9fafb; padding: 15px; border-radius: 6px; margin-bottom: 15px; border-left: 4px solid #0ea5e9; }
            .section h3 { margin: 0 0 10px 0; color: #1e3a5f; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            table th { background: #f3f4f6; padding: 10px; text-align: left; font-weight: bold; font-size: 12px; }
            table td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
            .total { font-size: 18px; font-weight: bold; color: #1e3a5f; }
            .signature-history { background: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb; }
            .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${company?.company_name || 'Copia de Orden SAT'}</h1>
              <p>Orden SAT Nº ${order.order_number || '-'}</p>
            </div>

            <div class="section">
              <h3>CLIENTE</h3>
              <p style="margin: 0;"><strong>${order.contact_name}</strong></p>
              ${order.contact_id ? '<p style="margin: 4px 0; font-size: 12px; color: #666;">Fecha: ' + order.date + '</p>' : ''}
            </div>

            <div class="section">
              <h3>RESUMEN DEL TRABAJO</h3>
              ${order.description ? `<p style="margin: 0; font-size: 13px;">${order.description.replace(/\n/g, '<br>')}</p>` : '<p style="margin: 0; font-size: 13px;">Sin descripción</p>'}
            </div>

            ${order.materials_used?.length > 0 ? `
              <div class="section">
                <h3>MATERIALES UTILIZADOS</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Material</th>
                      <th style="text-align: center;">Cant.</th>
                      <th style="text-align: right;">€/ud</th>
                      <th style="text-align: right;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${order.materials_used.map(m => `
                      <tr>
                        <td>${m.material}</td>
                        <td style="text-align: center;">${m.quantity}</td>
                        <td style="text-align: right;">${(m.unit_price || 0).toFixed(2)}</td>
                        <td style="text-align: right;">${((m.quantity || 0) * (m.unit_price || 0)).toFixed(2)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}

            <div class="section">
              <h3>IMPORTE</h3>
              <p style="margin: 0; font-size: 14px;">
                Mano de obra: <strong>${(order.labor_hours || 0)}h × ${(order.labor_rate || 0).toFixed(2)} €/h = ${((order.labor_hours || 0) * (order.labor_rate || 0)).toFixed(2)} €</strong>
              </p>
              <p style="margin: 8px 0 0 0; font-size: 16px;">
                <strong>TOTAL: <span class="total">${(order.total || 0).toFixed(2)} €</span></strong>
              </p>
            </div>

            ${signatureHistoryHTML ? `
              <div class="signature-history">
                <h3 style="margin-top: 0;">📋 Historial de decisiones</h3>
                ${signatureHistoryHTML}
              </div>
            ` : ''}

            <div class="footer">
              <p>Documento seguro · Copia de Orden SAT</p>
              <p>${company?.company_name || 'Mi Empresa'} ${company?.nif ? '· NIF ' + company.nif : ''}</p>
              ${company?.email ? '<p>' + company.email + '</p>' : ''}
            </div>
          </div>
        </body>
      </html>
    `;

    // Enviar email
    await base44.integrations.Core.SendEmail({
      to: contact.email,
      subject: `Copia de Orden SAT Nº ${order.order_number} - ${company?.company_name || 'Su empresa'}`,
      body: emailHTML
    });

    return Response.json({ success: true, message: 'Copia enviada al cliente' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});