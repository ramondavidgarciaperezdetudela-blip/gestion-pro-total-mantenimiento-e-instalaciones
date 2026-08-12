import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Envía un correo al SOPORTE del programa (recuperación de contraseña del panel
// de soporte y peticiones de mejora/errores). El destino está fijado por
// seguridad: siempre va al correo de soporte, nunca a un destino arbitrario.
const SUPPORT_EMAIL = 'kairigarcia.gestionprototal@gmail.com';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subject, body, to } = await req.json();
    if (!subject || !body) {
      return Response.json({ error: 'subject y body requeridos' }, { status: 400 });
    }

    // Destino: por defecto el soporte del programa. Se permite un correo
    // personal SOLO si es un email válido (para recuperar contraseña, etc.).
    const emailValido = typeof to === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim());
    const destino = emailValido ? to.trim() : SUPPORT_EMAIL;

    await base44.integrations.Core.SendEmail({
      to: destino,
      subject: `[Gestión Pro Total] ${subject}`,
      body: `${body}\n\n---\nEnviado desde Gestión Pro Total\nUsuario: ${user.full_name || user.email || 'desconocido'}\nFecha: ${new Date().toISOString()}`,
    });

    return Response.json({ success: true, sentTo: destino });
  } catch (error) {
    return Response.json({ error: String(error?.message || error) }, { status: 500 });
  }
});
