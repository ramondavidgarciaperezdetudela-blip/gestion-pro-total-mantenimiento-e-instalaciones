import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Verificación PÚBLICA de un documento (sin login). Devuelve solo datos de
// comprobación (no confidenciales). Si la verificación no está activada o ha
// caducado, lo indica. Al editar el documento, estos datos se actualizan solos
// (es el mismo registro en base44).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { doc_id } = await req.json();
    if (!doc_id) return Response.json({ error: 'doc_id requerido' }, { status: 400 });

    const docs = await base44.asServiceRole.entities.Invoice.filter({ id: doc_id });
    const doc = docs?.[0];
    if (!doc) {
      return Response.json({ found: false, valido: false, motivo: 'no_encontrado' });
    }

    const companies = await base44.asServiceRole.entities.CompanySettings.list();
    const company = companies?.[0] || null;

    const now = Date.now();
    const habilitada = doc.verify_enabled !== false; // por defecto activa
    const caducado = doc.verify_expires ? now > new Date(doc.verify_expires).getTime() : false;

    return Response.json({
      found: true,
      valido: habilitada && !caducado,
      caducado,
      habilitada,
      verify_expires: doc.verify_expires || null,
      documento: {
        tipo: doc.doc_type || 'documento',
        numero: doc.doc_number || '',
        fecha: doc.date || '',
        total: doc.total || 0,
        cliente: doc.contact_name || '',
        estado: doc.status || '',
        firmado: !!doc.signature_client,
        firma_fecha: doc.sign_datetime || null,
        actualizado: doc.updated_date || doc.created_date || null,
      },
      empresa: company ? { nombre: company.company_name || '', nif: company.nif || '', logo: company.logo_url || '' } : null,
    });
  } catch (error) {
    return Response.json({ error: String(error?.message || error) }, { status: 500 });
  }
});
