import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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
    const company = companies?.[0] || {};

    return Response.json({ ok: true, order, company });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});