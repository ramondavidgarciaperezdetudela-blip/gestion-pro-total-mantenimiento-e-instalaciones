import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { ordenPublica, empresaPublica } from '../../shared/seguridadPublica.ts';

// Abre un parte de SAT desde el enlace público del cliente. Igual que en el
// presupuesto, solo se devuelven los campos que el cliente ve en el parte y
// los datos de contacto públicos de la empresa.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { order_id } = body;

    if (!order_id) {
      return Response.json({ error: 'ID de orden requerido' }, { status: 400 });
    }

    const orders = await base44.asServiceRole.entities.SATOrder.filter({ id: order_id });
    const order = orders?.[0];

    if (!order) {
      return Response.json({ error: 'Orden SAT no encontrada' }, { status: 404 });
    }

    const companies = await base44.asServiceRole.entities.CompanySettings.list();

    return Response.json({
      ok: true,
      order: ordenPublica(order),
      company: empresaPublica(companies?.[0]),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});