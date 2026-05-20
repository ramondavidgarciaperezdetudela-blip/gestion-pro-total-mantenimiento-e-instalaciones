import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { doc_id } = body;

    if (!doc_id) {
      return Response.json({ error: 'doc_id requerido' }, { status: 400 });
    }

    // Fetch doc and company without auth (public)
    const docs = await base44.asServiceRole.entities.Invoice.filter({ id: doc_id });
    const doc = docs?.[0];

    if (!doc) {
      return Response.json({ error: 'Documento no encontrado' }, { status: 404 });
    }

    const companies = await base44.asServiceRole.entities.CompanySettings.list();
    const company = companies?.[0] || null;

    return Response.json({ doc, company });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});