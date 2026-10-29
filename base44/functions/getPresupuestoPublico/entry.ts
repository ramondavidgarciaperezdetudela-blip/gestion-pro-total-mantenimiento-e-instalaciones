import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { presupuestoPublico, empresaPublica } from '../../shared/seguridadPublica.ts';

// Abre un presupuesto desde el enlace que el cliente recibe por email o
// WhatsApp. Es público (el cliente no tiene cuenta), así que la respuesta se
// limita a los campos que salen impresos en el documento: ni la cuenta
// bancaria de la empresa ni su configuración interna salen de aquí.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { doc_id } = body;

    if (!doc_id) {
      return Response.json({ error: 'doc_id requerido' }, { status: 400 });
    }

    const docs = await base44.asServiceRole.entities.Invoice.filter({ id: doc_id });
    const doc = docs?.[0];

    if (!doc) {
      return Response.json({ error: 'Documento no encontrado' }, { status: 404 });
    }

    const companies = await base44.asServiceRole.entities.CompanySettings.list();

    return Response.json({
      doc: presupuestoPublico(doc),
      company: empresaPublica(companies?.[0]),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});