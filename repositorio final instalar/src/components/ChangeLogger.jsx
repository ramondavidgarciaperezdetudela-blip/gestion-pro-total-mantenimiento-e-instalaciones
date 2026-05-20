// Utility to log changes to the ChangeLog entity
import { base44 } from '@/api/base44Client';

export async function logChange({ entityType, entityId, entityLabel, action, contactId, contactName, changesSummary }) {
  try {
    const now = new Date();
    let userEmail = '';
    try {
      const me = await base44.auth.me();
      userEmail = me?.email || '';
    } catch {}
    await base44.entities.ChangeLog.create({
      entity_type: entityType,
      entity_id: entityId || '',
      entity_label: entityLabel || '',
      action,
      contact_id: contactId || '',
      contact_name: contactName || '',
      user_email: userEmail,
      changes_summary: changesSummary || '',
      date: now.toISOString().slice(0, 10),
      datetime: now.toLocaleString('es-ES'),
    });
  } catch (e) {
    // Silent fail - logging shouldn't break the app
    console.warn('ChangeLogger error:', e);
  }
}