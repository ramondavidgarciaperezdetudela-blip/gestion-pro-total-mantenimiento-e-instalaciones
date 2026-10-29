import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { addDays, differenceInDays, format } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    /*
     * Esta función la lanza el recordatorio diario, que no entra con la sesión
     * de ningún usuario: pedir `auth.me()` la dejaba contestando «no
     * autorizado» y no se generaba ningún mantenimiento. Como no tiene
     * pantalla, el candado de una vez al día es lo que impide que alguien la
     * dispare en bucle y llene la agenda de citas.
     */
    const hoy = new Date().toISOString().slice(0, 10);
    const yaEjecutada = await base44.asServiceRole.entities.ChangeLog
      .filter({ entity_type: 'Sistema_MantenimientosPreventivos', date: hoy })
      .catch(() => []);
    if ((yaEjecutada || []).length > 0) {
      return Response.json({ success: true, skipped: true, motivo: 'ya_ejecutada_hoy' });
    }

    // Obtener máquinas y citas
    const machines = await base44.asServiceRole.entities.ClientMachine?.list?.('-created_date', 500) || [];
    const appointments = await base44.asServiceRole.entities.Appointment?.list?.('-date', 500) || [];
    const contacts = await base44.asServiceRole.entities.Contact.list('-created_date', 500);
    const company = await base44.asServiceRole.entities.CompanySettings.list();

    let created = 0;
    let notificationsSent = 0;
    const today = new Date();

    for (const machine of machines) {
      // La ficha del equipo guarda la frecuencia en MESES y la próxima fecha.
      // Antes solo se miraban unos campos que no existen en la ficha, así que
      // el bucle se saltaba todos los equipos y nunca generaba nada.
      const frecuenciaDias = Number(machine.maintenance_days || 0)
        || Number(machine.maintenance_interval_months || 0) * 30;
      const proximaProgramada = machine.next_maintenance_date || '';
      const ultimaRevision = machine.last_maintenance_date || '';
      if (!proximaProgramada && (!ultimaRevision || !frecuenciaDias)) continue;

      // Calcular próxima fecha de mantenimiento
      const nextDate = proximaProgramada
        ? new Date(proximaProgramada)
        : addDays(new Date(ultimaRevision), frecuenciaDias);
      if (isNaN(nextDate.getTime())) continue;
      const daysUntil = differenceInDays(nextDate, today);

      // Generar orden si está vencido o dentro de 7 días
      if (daysUntil <= 7 && daysUntil >= -30) { // No más de 30 días vencido
        // Verificar si ya existe una cita para esta fecha
        const existingAppointment = appointments.find(a =>
          a.contact_id === machine.contact_id &&
          a.title?.includes(machine.name) &&
          a.date === format(nextDate, 'yyyy-MM-dd')
        );

        if (!existingAppointment) {
          const contact = contacts.find(c => c.id === machine.contact_id);

          // Crear cita/orden de trabajo
          try {
            const appointment = await base44.asServiceRole.entities.Appointment.create({
              title: `Mantenimiento preventivo - ${machine.name}`,
              description: `Mantenimiento preventivo programado para ${machine.brand || ''} ${machine.model || ''}`,
              contact_id: machine.contact_id,
              contact_name: contact ? `${contact.name} ${contact.surname || ''}` : 'Cliente',
              date: format(nextDate, 'yyyy-MM-dd'),
              time_start: '09:00',
              type: 'mantenimiento',
              status: 'confirmada',
              priority: frecuenciaDias && frecuenciaDias <= 30 ? 'alta' : frecuenciaDias && frecuenciaDias <= 90 ? 'media' : 'baja',
              address: contact?.address || '',
            });

            created++;

            // Enviar notificación al cliente
            if (contact?.email) {
              try {
                await base44.asServiceRole.integrations.Core.SendEmail({
                  to: contact.email,
                  subject: `📅 Mantenimiento preventivo programado - ${machine.name}`,
                  body: `Hola ${contact.name},

Hemos programado el mantenimiento preventivo de tu equipo.

📋 Equipo: ${machine.name}
🔧 Tipo: ${machine.brand || 'Equipo'} ${machine.model || ''}
📅 Fecha sugerida: ${format(nextDate, 'dd/MM/yyyy')}
⏰ Hora: 09:00

${machine.technician_assigned ? `👨‍🔧 Técnico asignado: ${machine.technician_assigned}` : '👨‍🔧 Nos pondremos en contacto para confirmar el técnico.'}

Por favor, confirma si esta fecha te va bien. Si necesitas cambiarla, no dudes en contactarnos.

Saludos,
${company?.[0]?.company_name || 'Tu empresa'}`,
                });
                notificationsSent++;
              } catch (emailError) {
                console.log('Email notification failed (non-critical):', emailError.message);
              }
            }
          } catch (createError) {
            console.log('Failed to create appointment:', createError.message);
          }
        }
      }
    }

    // Ejecución del día apuntada (candado), solo al terminar el trabajo.
    await base44.asServiceRole.entities.ChangeLog.create({
      entity_type: 'Sistema_MantenimientosPreventivos',
      action: 'editar',
      changes_summary: `Mantenimientos preventivos: ${created} cita(s) creadas`,
      date: hoy,
      datetime: new Date().toLocaleString('es-ES'),
    }).catch(() => {});

    return Response.json({
      success: true,
      message: `Generated ${created} maintenance orders and sent ${notificationsSent} notifications`,
      created,
      notificationsSent,
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});