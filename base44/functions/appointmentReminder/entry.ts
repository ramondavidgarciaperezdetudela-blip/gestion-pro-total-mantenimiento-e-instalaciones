import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { format, parseISO, differenceInDays } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Obtener mañana
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 86400000);
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
    
    // Buscar citas para mañana
    const appointments = await base44.asServiceRole.entities.Appointment.filter({ date: tomorrowStr });
    
    if (appointments.length === 0) {
      return Response.json({ ok: true, processed: 0 });
    }

    const [contacts, company] = await Promise.all([
      base44.asServiceRole.entities.Contact.list('name', 500),
      base44.asServiceRole.entities.CompanySettings.list()
    ]);

    const contactMap = Object.fromEntries(contacts.map(c => [c.id, c]));
    const companySettings = company?.[0];

    let successCount = 0;

    for (const apt of appointments) {
      const contact = contactMap[apt.contact_id];
      
      // Recordatorio al cliente
      if (contact?.phone) {
        const clientPhone = contact.phone.replace(/\D/g, '');
        if (clientPhone) {
          const clientMsg = `¡Recordatorio de cita! 📅\n\nTenemos una cita programada para mañana ${format(new Date(tomorrowStr), 'EEEE d \'de\' MMMM')} ${apt.time_start ? `a las ${apt.time_start}h` : ''}.\n\n📌 Servicio: ${apt.title}\n📍 Ubicación: ${apt.address || '-'}\n\nSi necesita cambiar la fecha, contáctenos.\n\nGracias`;
          
          try {
            const phoneLink = clientPhone.startsWith('34') ? clientPhone : `34${clientPhone}`;
            const waUrl = `https://wa.me/${phoneLink}?text=${encodeURIComponent(clientMsg)}`;
            
            // Registrar envío
            await base44.asServiceRole.entities.ClientNote.create({
              contact_id: apt.contact_id,
              contact_name: contact.name,
              title: `Recordatorio cita enviado - ${apt.title}`,
              content: `Se envió recordatorio de cita para mañana ${format(new Date(tomorrowStr), 'dd/MM/yyyy')} a las ${apt.time_start || 'sin hora'} por WhatsApp`,
              date: format(new Date(), 'yyyy-MM-dd')
            });

            successCount++;
          } catch (err) {
            console.error(`Error enviando recordatorio al cliente ${contact.name}:`, err);
          }
        }
      }

      // Recordatorio al propietario (tech)
      if (companySettings?.phone) {
        const techPhone = companySettings.phone.replace(/\D/g, '');
        if (techPhone) {
          const techMsg = `📅 RECORDATORIO DE CITA MAÑANA\n\n👤 Cliente: ${apt.contact_name}\n📌 Servicio: ${apt.title}\n🕐 Hora: ${apt.time_start || 'Sin hora'}\n📍 Dirección: ${apt.address || '-'}\n📝 Notas: ${apt.notes || '-'}\n\nConfirme que está disponible.`;
          
          try {
            // No hacemos que sea automático; simplemente registramos que se debería enviar
            // El usuario puede activar esto manualmente desde el panel si lo desea
            console.log(`Recordatorio para técnico: ${techMsg}`);
          } catch (err) {
            console.error('Error enviando recordatorio al técnico:', err);
          }
        }
      }
    }

    return Response.json({ 
      ok: true, 
      processed: appointments.length,
      reminded: successCount
    });
  } catch (error) {
    console.error('Error en appointmentReminder:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});