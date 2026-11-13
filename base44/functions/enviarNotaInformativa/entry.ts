import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { esc } from '../../shared/seguridadPublica.ts';

// Manda por correo los envíos que se le indiquen (solo usuarios con sesión).
// body: { envios: [{ id, to, subject, texto, enlace }] }
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Hace falta iniciar sesión' }, { status: 401 });
    const { envios } = await req.json();
    if (!Array.isArray(envios) || envios.length === 0 || envios.length > 300) {
      return Response.json({ error: 'Lista de envíos no válida' }, { status: 400 });
    }
    const resultados = [];
    for (const e of envios) {
      const to = String(e?.to || '').trim();
      const enlace = String(e?.enlace || '');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to) || !/^https?:\/\//.test(enlace)) {
        resultados.push({ id: e?.id, ok: false, motivo: 'correo o enlace no válido' });
        continue;
      }
      try {
        await base44.integrations.Core.SendEmail({
          to,
          subject: String(e.subject || 'Nota informativa').slice(0, 200),
          body: `<div style="font-family:Arial,sans-serif;max-width:560px">`
            + String(e.texto || '').split(/\n{2,}/).map((p: string) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('')
            + `<p><a href="${esc(enlace)}" style="background:#1e3a5f;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">Leer y firmar la nota</a></p></div>`,
        });
        resultados.push({ id: e.id, ok: true });
      } catch (err) {
        resultados.push({ id: e?.id, ok: false, motivo: (err as Error).message });
      }
    }
    return Response.json({ resultados });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
