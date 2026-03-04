import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { addDays, differenceInDays, format } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
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
      if (!machine.maintenance_days || !machine.last_maintenance_date) continue;

      // Calcular próxima fecha de mantenimiento
      const lastDate = new Date(machine.last_maintenance_date);
      const nextDate = addDays(lastDate, machine.maintenance_days);
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
              priority: machine.maintenance_days <= 30 ? 'alta' : machine.maintenance_days <= 90 ? 'media' : 'baja',
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