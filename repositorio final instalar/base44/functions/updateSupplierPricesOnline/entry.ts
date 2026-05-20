import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { supplierId, supplierName, websiteUrl, sampleProducts, margin } = await req.json();

    if (!supplierId || !supplierName) {
      return Response.json({ error: 'supplierId y supplierName son requeridos' }, { status: 400 });
    }

    // Construir prompt con muestra de productos para que la IA busque precios actualizados
    const sampleText = (sampleProducts || [])
      .slice(0, 30)
      .map(p => `- ${p.product_code ? `[${p.product_code}] ` : ''}${p.product_name}`)
      .join('\n');

    const prompt = `Eres un asistente especializado en obtener precios actuales de proveedores de material eléctrico, climatización y refrigeración.

Proveedor: ${supplierName}
${websiteUrl ? `Web del proveedor: ${websiteUrl}` : ''}

Busca en internet los precios actuales de venta al distribuidor (precio de coste/tarifa) de los siguientes productos de este proveedor. Para cada uno devuelve el precio numérico sin IVA (precio neto) si puedes encontrarlo. Si no encuentras precio de un producto específico, devuelve null para ese producto.

PRODUCTOS A ACTUALIZAR:
${sampleText}

Devuelve un array JSON con objetos: { product_code, product_name, new_price, found, source_url }
- found: true si encontraste el precio, false si no
- new_price: precio numérico sin IVA, o null
- source_url: URL donde encontraste el precio`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          products: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                product_code:  { type: 'string' },
                product_name:  { type: 'string' },
                new_price:     { type: 'number' },
                found:         { type: 'boolean' },
                source_url:    { type: 'string' },
              }
            }
          }
        }
      }
    });

    const products = result?.products || [];
    let updatedCount = 0;
    const marginNum = parseFloat(margin) || 30;

    // Actualizar en BD los que tienen precio encontrado
    for (const p of products) {
      if (!p.found || !p.new_price || p.new_price <= 0) continue;

      // Buscar por código o nombre
      let existing = null;
      if (p.product_code) {
        const found = await base44.asServiceRole.entities.SupplierPrice.filter({
          supplier_id: supplierId,
          product_code: p.product_code,
        });
        existing = found[0] || null;
      }
      if (!existing && p.product_name) {
        const found = await base44.asServiceRole.entities.SupplierPrice.filter({
          supplier_id: supplierId,
          product_name: p.product_name,
        });
        existing = found[0] || null;
      }

      if (existing) {
        const salePrice = Math.round(p.new_price * (1 + marginNum / 100) * 100) / 100;
        await base44.asServiceRole.entities.SupplierPrice.update(existing.id, {
          cost_price: p.new_price,
          sale_price: salePrice,
          margin: marginNum,
        });
        updatedCount++;
      }
    }

    return Response.json({
      success: true,
      total_searched: products.length,
      found: products.filter(p => p.found).length,
      updated: updatedCount,
      products,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});