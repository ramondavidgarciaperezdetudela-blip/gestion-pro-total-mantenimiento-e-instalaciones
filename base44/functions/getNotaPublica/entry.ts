import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { notaPublica, empresaPublica, mismaClave } from '../../shared/seguridadPublica.ts';

// Abre una nota informativa desde el enlace personal del cliente. Hace falta el
// identificador Y la clave secreta del enlace: sin las dos no se enseña nada.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { envio_id, token } = await req.json();
    if (!envio_id || !token) return Response.json({ error: 'Enlace no válido' }, { status: 400 });
    const encontrados = await base44.asServiceRole.entities.NotaEnvio.filter({ id: envio_id });
    const envio = encontrados?.[0];
    if (!envio || !mismaClave(envio.token, token)) {
      return Response.json({ error: 'Enlace no válido' }, { status: 404 });
    }
    const companies = await base44.asServiceRole.entities.CompanySettings.list();
    return Response.json({ envio: notaPublica(envio), company: empresaPublica(companies?.[0]) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
