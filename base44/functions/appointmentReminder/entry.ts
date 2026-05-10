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

      // Recordatorio al técnico / empresa por email
      if (companySettings?.email) {
        try {
          const emailBody = `
            <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;background:#f8fafc;border-radius:12px">
              <div style="background:#1e3a5f;color:white;border-radius:8px;padding:16px 20px;margin-bottom:20px">
                <h2 style="margin:0;font-size:18px">📅 Cita programada para mañana</h2>
              </div>
              <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
                <tr><td style="padding:10px 16px;border-bottom:1px solid #eee;color:#555;font-size:13px;width:120px">👤 Cliente</td><td style="padding:10px 16px;border-bottom:1px solid #eee;font-weight:600">${apt.contact_name || '-'}</td></tr>
                <tr><td style="padding:10px 16px;border-bottom:1px solid #eee;color:#555;font-size:13px">📌 Servicio</td><td style="padding:10px 16px;border-bottom:1px solid #eee;font-weight:600">${apt.title || '-'}</td></tr>
                <tr><td style="padding:10px 16px;border-bottom:1px solid #eee;color:#555;font-size:13px">🕐 Hora</td><td style="padding:10px 16px;border-bottom:1px solid #eee;font-size:22px;font-weight:800;color:#1e3a5f">${apt.time_start || 'Sin hora definida'}</td></tr>
                <tr><td style="padding:10px 16px;border-bottom:1px solid #eee;color:#555;font-size:13px">📍 Dirección</td><td style="padding:10px 16px;border-bottom:1px solid #eee">${apt.address || '-'}</td></tr>
                <tr><td style="padding:10px 16px;border-bottom:1px solid #eee;color:#555;font-size:13px">🔧 Tipo</td><td style="padding:10px 16px;border-bottom:1px solid #eee">${apt.type || '-'}</td></tr>
                <tr><td style="padding:10px 16px;color:#555;font-size:13px">📝 Notas</td><td style="padding:10px 16px">${apt.notes || apt.description || '-'}</td></tr>
              </table>
              ${apt.address ? `<div style="margin-top:16px;text-align:center"><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(apt.address)}" style="background:#0ea5e9;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">📍 Ver en Google Maps</a></div>` : ''}
              <p style="color:#aaa;font-size:11px;text-align:center;margin-top:20px">${companySettings.company_name || ''} · Recordatorio automático</p>
            </div>`;

          await base44.asServiceRole.integrations.Core.SendEmail({
            to: companySettings.email,
            subject: `⏰ Cita mañana ${format(new Date(tomorrowStr), 'dd/MM')} ${apt.time_start || ''} — ${apt.contact_name || apt.title}`,
            body: emailBody,
          });
          console.log(`Email de recordatorio enviado a ${companySettings.email} para cita: ${apt.title}`);
        } catch (err) {
          console.error('Error enviando email al técnico:', err);
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