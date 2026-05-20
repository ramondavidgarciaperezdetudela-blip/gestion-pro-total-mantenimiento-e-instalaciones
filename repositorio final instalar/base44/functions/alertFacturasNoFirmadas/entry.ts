import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Obtener todas las facturas y recibos enviados hace 2-3 días sin firma
    const facturas = await base44.asServiceRole.entities.Invoice.filter({ status: 'enviado' });
    const documentosSinFirma = (facturas || []).filter(f => ['factura', 'recibo'].includes(f.doc_type));

    if (!documentosSinFirma || documentosSinFirma.length === 0) {
      return Response.json({ ok: true, processed: 0 });
    }

    const now = new Date();
    const diasSinFirma = [];

    // Verificar documentos sin firma que fueron enviados hace 2-3 días
    for (const factura of documentosSinFirma) {
      if (factura.signature_client) continue; // Ya tiene firma

      const enviadaDate = new Date(factura.created_date);
      const diasTranscurridos = Math.floor((now - enviadaDate) / (1000 * 60 * 60 * 24));

      // Si pasaron 2 o 3 días sin firma
      if (diasTranscurridos >= 2 && diasTranscurridos <= 3) {
        diasSinFirma.push({
          ...factura,
          diasSinFirma: diasTranscurridos,
          enviadaEn: enviadaDate.toLocaleString('es-ES')
        });
      }
    }

    // Enviar alertas por correo
    if (diasSinFirma.length > 0) {
      const companies = await base44.asServiceRole.entities.CompanySettings.list();
      const company = companies?.[0];

      if (company?.email) {
        const facturasHtml = diasSinFirma.map(f => `
          <tr style="border-bottom:1px solid #e5e7eb">
            <td style="padding:12px;color:#555">Factura Nº${f.doc_number}</td>
            <td style="padding:12px;color:#555">${f.contact_name}</td>
            <td style="padding:12px;text-align:right">${(f.total || 0).toFixed(2)} €</td>
            <td style="padding:12px;color:#d97706"><strong>${f.diasSinFirma} día(s) sin firmar</strong></td>
            <td style="padding:12px;font-size:12px;color:#999">${f.enviadaEn}</td>
          </tr>
        `).join('');

        const emailBody = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <div style="background:#f59e0b;color:white;padding:16px 20px;border-radius:8px 8px 0 0">
            <h2 style="margin:0;font-size:20px">⏰ Documentos pendientes de firma del cliente</h2>
          </div>
          <div style="border:1px solid #fcd34d;border-top:none;padding:20px;border-radius:0 0 8px 8px;background:#fff">
            <p style="color:#555;font-size:14px;margin:0 0 16px 0">
              Los siguientes documentos (facturas/recibos) no han sido firmados por el cliente después de 2-3 días de envío:
            </p>
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <thead>
                <tr style="background:#f3f4f6">
                  <th style="padding:12px;text-align:left;color:#666;font-weight:600">Documento</th>
                  <th style="padding:12px;text-align:left;color:#666;font-weight:600">Cliente</th>
                  <th style="padding:12px;text-align:right;color:#666;font-weight:600">Importe</th>
                  <th style="padding:12px;text-align:left;color:#666;font-weight:600">Estado</th>
                  <th style="padding:12px;text-align:left;color:#666;font-weight:600">Fecha envío</th>
                </tr>
              </thead>
              <tbody>
                ${facturasHtml}
              </tbody>
            </table>
            <p style="color:#666;font-size:12px;margin:16px 0 0 0;padding-top:12px;border-top:1px solid #e5e7eb">
              Considera contactar al cliente para asegurar la recepción de la factura.
            </p>
          </div>
        </div>`;

        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: company.email,
            subject: `⏰ Alerta: ${diasSinFirma.length} documento(s) sin firma del cliente (${diasSinFirma.map(d => d.doc_type).join('/')})`,
            body: emailBody
          });
        } catch (_err) {
          console.log('Email de alerta no enviado');
        }
      }
    }

    return Response.json({ ok: true, processed: diasSinFirma.length });
  } catch (error) {
    console.error('Error en alertFacturasNoFirmadas:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});