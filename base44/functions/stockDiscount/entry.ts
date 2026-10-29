import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Descuenta materiales del stock al completar un parte SAT o factura.
 * Recibe: { materials: [{material, quantity}], source: 'sat'|'invoice', source_id, source_number }
 * Devuelve: { discounted: [], not_found: [], low_stock_alerts: [] }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 });

    const body = await req.json();
    const { materials = [], source = 'sat', source_id, source_number } = body;

    if (!materials.length) return Response.json({ discounted: [], not_found: [], low_stock_alerts: [] });

    // Cargar todo el stock
    const allStock = await base44.asServiceRole.entities.StockItem.list('name', 500);

    const discounted = [];
    const not_found = [];
    const low_stock_alerts = [];

    for (const mat of materials) {
      const matName = (mat.material || '').toLowerCase().trim();
      if (!matName) continue;

      // Solo se descuenta una cantidad real: un número entero positivo y
      // razonable. Una cantidad negativa sumaría stock y una enorme vaciaría
      // el almacén y dispararía el aviso al administrador.
      const cantidad = Number(mat.quantity);
      if (!Number.isInteger(cantidad) || cantidad <= 0 || cantidad > 1000) {
        not_found.push({ material: mat.material, quantity: mat.quantity, motivo: 'cantidad_no_valida' });
        continue;
      }

      // Buscar por nombre (coincidencia parcial)
      const stockItem = allStock.find(s =>
        s.name.toLowerCase().includes(matName) ||
        matName.includes(s.name.toLowerCase()) ||
        (s.reference && s.reference.toLowerCase() === matName)
      );

      if (!stockItem) {
        not_found.push({ material: mat.material, quantity: mat.quantity });
        continue;
      }

      const newQty = Math.max(0, (stockItem.quantity || 0) - cantidad);
      await base44.asServiceRole.entities.StockItem.update(stockItem.id, { quantity: newQty });

      discounted.push({ name: stockItem.name, was: stockItem.quantity, now: newQty });

      // Verificar stock mínimo
      if (stockItem.min_stock > 0 && newQty <= stockItem.min_stock) {
        low_stock_alerts.push({
          name: stockItem.name,
          quantity: newQty,
          min_stock: stockItem.min_stock,
          supplier: stockItem.supplier_name || '',
          reference: stockItem.reference || '',
        });
      }
    }

    // Si hay alertas de stock bajo, enviar email al admin
    if (low_stock_alerts.length > 0) {
      const company = await base44.asServiceRole.entities.CompanySettings.list();
      const email = company[0]?.email;
      if (email) {
        const alertLines = low_stock_alerts.map(a =>
          `<tr>
            <td style="padding:6px 10px;border:1px solid #fcd34d">${a.name}</td>
            <td style="padding:6px 10px;border:1px solid #fcd34d;text-align:center;color:#dc2626;font-weight:bold">${a.quantity} uds</td>
            <td style="padding:6px 10px;border:1px solid #fcd34d;text-align:center">${a.min_stock} uds</td>
            <td style="padding:6px 10px;border:1px solid #fcd34d">${a.supplier || '—'}</td>
            <td style="padding:6px 10px;border:1px solid #fcd34d;font-family:monospace">${a.reference || '—'}</td>
          </tr>`
        ).join('');

        const htmlBody = `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <div style="background:#f59e0b;color:white;padding:16px 24px;border-radius:8px 8px 0 0">
              <h2 style="margin:0">⚠️ Alerta de stock mínimo</h2>
              <p style="margin:4px 0 0;opacity:0.9">Parte: ${source === 'sat' ? 'SAT' : 'Factura'} #${source_number || source_id}</p>
            </div>
            <div style="padding:20px;border:1px solid #fde68a;border-top:none;border-radius:0 0 8px 8px">
              <p>Tras completar el parte, los siguientes artículos han bajado del stock mínimo y necesitan reposición:</p>
              <table style="width:100%;border-collapse:collapse;margin-top:12px">
                <thead>
                  <tr style="background:#fef3c7">
                    <th style="padding:8px 10px;border:1px solid #fcd34d;text-align:left">Artículo</th>
                    <th style="padding:8px 10px;border:1px solid #fcd34d">Stock actual</th>
                    <th style="padding:8px 10px;border:1px solid #fcd34d">Mínimo</th>
                    <th style="padding:8px 10px;border:1px solid #fcd34d;text-align:left">Proveedor</th>
                    <th style="padding:8px 10px;border:1px solid #fcd34d;text-align:left">Referencia</th>
                  </tr>
                </thead>
                <tbody>${alertLines}</tbody>
              </table>
              <p style="margin-top:16px;color:#6b7280;font-size:13px">Este aviso fue generado automáticamente por el sistema de gestión SAT.</p>
            </div>
          </div>
        `;

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          subject: `⚠️ Stock mínimo: ${low_stock_alerts.length} artículo(s) necesitan reposición`,
          body: htmlBody,
        });
      }
    }

    return Response.json({ discounted, not_found, low_stock_alerts });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});