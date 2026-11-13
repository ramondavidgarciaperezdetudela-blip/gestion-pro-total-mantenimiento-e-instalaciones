import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { esc, firmaValida, empresaPublica, mismaClave } from '../../shared/seguridadPublica.ts';

// El cliente firma que ha leído la nota. Se guarda la firma y la fecha en el
// envío y se avisa a la empresa por correo. El archivo en la ficha del cliente
// lo hace el programa con la cuenta del usuario al abrir Notas informativas.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { envio_id, token, signature } = await req.json();
    if (!envio_id || !token) return Response.json({ error: 'Enlace no válido' }, { status: 400 });
    const firma = firmaValida(signature);
    if (!firma) return Response.json({ error: 'La firma recibida no es válida' }, { status: 400 });

    const encontrados = await base44.asServiceRole.entities.NotaEnvio.filter({ id: envio_id });
    const envio = encontrados?.[0];
    if (!envio || !mismaClave(envio.token, token)) {
      return Response.json({ error: 'Enlace no válido' }, { status: 404 });
    }
    if (envio.status === 'firmada') {
      return Response.json({ error: 'Esta nota ya está firmada', ya_firmada: true, signed_at: envio.signed_at }, { status: 409 });
    }

    const signedAt = new Date().toISOString();
    await base44.asServiceRole.entities.NotaEnvio.update(envio.id, {
      status: 'firmada', signature: firma, signed_at: signedAt, signature_via: 'enlace',
    });

    try {
      const companies = await base44.asServiceRole.entities.CompanySettings.list();
      const company = empresaPublica(companies?.[0]);
      if (company?.email) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: company.email,
          subject: `✅ Nota informativa firmada — ${envio.contact_name}`,
          body: `<div style="font-family:Arial,sans-serif;max-width:560px"><h2 style="color:#1e3a5f">Nota informativa firmada</h2>`
            + `<p><strong>${esc(envio.contact_name)}</strong> ha leído y firmado «${esc(envio.nota_title)}».</p>`
            + `<p style="color:#555">Firmada el ${esc(new Date(signedAt).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }))}.</p>`
            + `<img src="${firma}" alt="Firma" style="max-width:240px;border:1px solid #e5e7eb;background:#fff;padding:4px"/>`
            + `<p style="font-size:12px;color:#999">Se archivará en la ficha del cliente al abrir Notas informativas.</p></div>`,
        });
      }
    } catch (_) { /* el aviso no puede tumbar la firma */ }

    return Response.json({ ok: true, signed_at: signedAt });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
