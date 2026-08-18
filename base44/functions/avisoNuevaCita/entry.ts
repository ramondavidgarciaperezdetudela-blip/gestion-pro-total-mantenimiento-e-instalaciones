import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Aviso al responsable cuando se reserva un hueco desde la pantalla de
// Disponibilidad (normalmente con el cliente al teléfono). Envía TODOS los
// datos recogidos para no tener que volver a preguntarlos ni buscarlos.
//
// El destino es el correo de la empresa configurado en Configuración >
// Empresa. No se acepta un destino arbitrario desde el cliente: así esta
// función no puede usarse para enviar correo a terceros.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      fecha, hora_inicio, hora_fin,
      contact_name, phone, title, notes,
    } = await req.json();

    if (!fecha || !hora_inicio || !contact_name) {
      return Response.json(
        { error: 'fecha, hora_inicio y contact_name son obligatorios' },
        { status: 400 },
      );
    }

    const empresas = await base44.asServiceRole.entities.CompanySettings.list();
    const destino = empresas?.[0]?.email;
    if (!destino) {
      // Sin correo configurado no hay a quién avisar. Se devuelve un aviso
      // claro en vez de fallar en silencio: la cita ya está guardada.
      return Response.json({
        success: false,
        motivo: 'sin_email_empresa',
        mensaje: 'No hay correo de empresa configurado en Configuración > Empresa.',
      });
    }

    // dd/mm/aaaa, que es como se lee aquí.
    const [a, m, d] = String(fecha).split('-');
    const fechaES = d && m && a ? `${d}/${m}/${a}` : fecha;

    const cuerpo = [
      'Se ha reservado una cita nueva desde Disponibilidad.',
      '',
      `FECHA:    ${fechaES}`,
      `HORA:     ${hora_inicio}${hora_fin ? ` - ${hora_fin}` : ''}`,
      '',
      `CLIENTE:  ${contact_name}`,
      phone ? `TELÉFONO: ${phone}` : null,
      title ? `MOTIVO:   ${title}` : null,
      notes ? `NOTAS:    ${notes}` : null,
      '',
      'La cita ya está creada en la agenda del programa.',
    ].filter(Boolean).join('\n');

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: destino,
      subject: `[Gestión Pro Total] Cita nueva ${fechaES} ${hora_inicio} · ${contact_name}`,
      body: `${cuerpo}\n\n---\nReservada por: ${user.full_name || user.email || 'desconocido'}`,
    });

    return Response.json({ success: true, sentTo: destino });
  } catch (error) {
    return Response.json({ error: String(error?.message || error) }, { status: 500 });
  }
});
