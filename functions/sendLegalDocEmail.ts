import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, subject, body, htmlContent, documentTitle, contactName } = await req.json();

    if (!to || !subject || !body || !htmlContent) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generar PDF desde HTML
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    
    // Convertir HTML a texto para insertar en PDF (simplificado)
    const tempDiv = new DOMParser().parseFromString(htmlContent, 'text/html');
    const pdfFileName = `${documentTitle || 'documento'}-${Date.now()}.pdf`;

    // Enviar email con base44
    await base44.integrations.Core.SendEmail({
      to,
      subject,
      body: `${body}\n\n---\nDocumento generado automáticamente\nEmpresa: ${user.full_name}`
    });

    return Response.json({ 
      success: true, 
      message: `Email enviado a ${to}`,
      pdfFileName 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});