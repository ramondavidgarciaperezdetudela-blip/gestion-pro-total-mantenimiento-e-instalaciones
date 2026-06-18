// ══════════════════════════════════════════════════════════════════
// GESTIÓN PRO TOTAL — Receptor de Alertas y Solicitudes
// Google Apps Script — copia este código completo en script.google.com
// ══════════════════════════════════════════════════════════════════
// 
// PARA QUÉ SIRVE:
//   • Recibe solicitudes de licencia del programa instalado
//   • Recibe alertas cuando un cliente intenta compartir su clave
//   • Guarda todo en una hoja de Google Sheets automáticamente
//   • Envía email al administrador cuando hay una alerta
//
// CONFIGURACIÓN: cambia solo las 3 líneas de CONFIG
// ══════════════════════════════════════════════════════════════════

const CONFIG = {
  EMAIL_ADMIN: 'kairigarcia.gestionprototal@gmail.com',  // ← tu email
  NOMBRE_HOJA: 'GPT-Alertas',                            // nombre de la hoja
  PASS_ADMIN:  'NiMiXaGa271110',                         // para el panel
};

// ── Punto de entrada web ──────────────────────────────────────────
function doGet(e) {
  // Página de confirmación de que el script funciona
  return HtmlService.createHtmlOutput(`
    <html><head><meta charset="UTF-8">
    <style>body{font-family:Arial,sans-serif;background:#0a0e1a;color:#f1f5f9;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
    .box{background:#111827;border:1px solid #2a3a55;border-radius:16px;padding:40px;text-align:center;max-width:420px}
    .ok{color:#10b981;font-size:48px;margin-bottom:12px}.t{font-size:20px;font-weight:800;margin-bottom:6px}.s{color:#64748b;font-size:13px}</style></head>
    <body><div class="box">
      <div class="ok">✅</div>
      <div class="t">Script activo</div>
      <div class="s">Gestión Pro Total — Receptor de alertas funcionando correctamente</div>
    </div></body></html>
  `).setTitle('GPT — Script activo');
}

// ── Recibir datos del programa ────────────────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || '{}');
    const tipo = data.tipo || 'DESCONOCIDO';
    
    // Guardar en hoja de cálculo
    const fila = guardarEnHoja(tipo, data);
    
    // Si es alerta de compartición → enviar email inmediato
    if (tipo === 'ALERTA_COMPARTICION') {
      enviarAlertaEmail(data);
    }
    
    // Si es solicitud de licencia → guardar y notificar
    if (tipo === 'SOLICITUD_LICENCIA') {
      notificarSolicitud(data);
    }
    
    return ok({ guardado: true, fila });
    
  } catch(err) {
    return ok({ error: err.message });
  }
}

// ── Guardar en Google Sheets ──────────────────────────────────────
function guardarEnHoja(tipo, data) {
  const ss    = getOrCreateSheet();
  const sheet = ss.getSheetByName(CONFIG.NOMBRE_HOJA) 
                || crearHoja(ss);
  
  const fila = [
    new Date().toLocaleString('es-ES'),  // Fecha y hora
    tipo,                                 // Tipo de evento
    data.nombre || data.key || '—',       // Cliente / clave
    data.email  || '—',                   // Email
    data.plan   || '—',                   // Plan
    data.devNuevo || data.deviceId || '—',// Device ID
    data.devOrigen || '—',                // Device origen
    data.accion || '—',                   // Acción detectada
    JSON.stringify(data).slice(0, 200),   // Datos completos
  ];
  
  sheet.appendRow(fila);
  return sheet.getLastRow();
}

function crearHoja(ss) {
  const sheet = ss.insertSheet(CONFIG.NOMBRE_HOJA);
  const cabeceras = ['Fecha','Tipo','Cliente/Clave','Email','Plan',
                     'Device Nuevo','Device Origen','Acción','Datos'];
  sheet.appendRow(cabeceras);
  sheet.getRange(1,1,1,cabeceras.length)
       .setBackground('#1e3a5f')
       .setFontColor('#ffffff')
       .setFontWeight('bold');
  sheet.setFrozenRows(1);
  
  // Formato condicional: rojo para alertas
  const rule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextContains('ALERTA_COMPARTICION')
    .setBackground('#fecaca')
    .setRanges([sheet.getRange('A:I')])
    .build();
  sheet.setConditionalFormatRules([rule]);
  
  return sheet;
}

// ── Email de alerta ───────────────────────────────────────────────
function enviarAlertaEmail(data) {
  const asunto = '🚨 ALERTA: Intento de compartición de licencia — ' + (data.key||data.cliente||'?');
  const cuerpo = `
⚠️ ALERTA DE COMPARTICIÓN DE LICENCIA
======================================

Clave:          ${data.key || '—'}
Acción:         ${data.accion || '—'}
Device nuevo:   ${data.devNuevo || data.deviceId || '—'}
Device origen:  ${data.devOrigen || '—'}
Fecha:          ${new Date().toLocaleString('es-ES')}

======================================
Gestión Pro Total — Sistema de Alertas
`;
  
  GmailApp.sendEmail(CONFIG.EMAIL_ADMIN, asunto, cuerpo);
}

// ── Email de notificación de solicitud ────────────────────────────
function notificarSolicitud(data) {
  const asunto = '📬 Nueva solicitud de licencia — ' + (data.nombre||'?') + ' — ' + (data.plan||'?');
  const cuerpo = `
Nueva solicitud de licencia recibida
=====================================

Nombre:   ${data.nombre || '—'}
Email:    ${data.email  || '—'}
Plan:     ${data.plan   || '—'}
Método:   ${data.metodo || '—'}
DeviceID: ${data.deviceId || '—'}
Fecha:    ${new Date().toLocaleString('es-ES')}

Observaciones: ${data.obs || 'Sin observaciones'}
${/estudiant|escuela/i.test(data.plan||'') ? '\n⚠️ PLAN ESTUDIANTES: verifica el JUSTIFICANTE DE MATRÍCULA ACTUAL antes de emitir. Licencia 1 año, renovable cada año con nueva matrícula.\n' : ''}${/demo/i.test(data.plan||'') ? '\nℹ️ DEMO: 7 días gratis. Al caducar, el cliente debe elegir un plan.\n' : ''}
=====================================
Abre el Panel de Licencias para procesarla.
`;
  
  GmailApp.sendEmail(CONFIG.EMAIL_ADMIN, asunto, cuerpo);
}

// ── Ver alertas recientes (GET con ?ver=alertas) ──────────────────
function doGet_extendido(e) {
  if (e.parameter.pass !== CONFIG.PASS_ADMIN)
    return HtmlService.createHtmlOutput('<h3>No autorizado</h3>');
  
  const ss    = getOrCreateSheet();
  const sheet = ss.getSheetByName(CONFIG.NOMBRE_HOJA);
  if (!sheet) return HtmlService.createHtmlOutput('<h3>Sin datos</h3>');
  
  const data = sheet.getDataRange().getValues();
  const rows = data.slice(1).reverse().slice(0, 50)
    .map(r => `<tr><td>${r[0]}</td><td style="font-weight:700;color:${r[1].includes('ALERTA')?'red':'green'}">${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[7]}</td></tr>`)
    .join('');
  
  return HtmlService.createHtmlOutput(`
    <html><head><meta charset="UTF-8">
    <style>body{font-family:Arial;padding:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;font-size:12px}th{background:#1e3a5f;color:white}</style>
    </head><body>
    <h2>GPT — Últimas 50 alertas</h2>
    <table><tr><th>Fecha</th><th>Tipo</th><th>Cliente</th><th>Email</th><th>Acción</th></tr>${rows}</table>
    </body></html>
  `).setTitle('GPT — Alertas');
}

// ── Helpers ───────────────────────────────────────────────────────
function getOrCreateSheet() {
  // Usar la hoja de cálculo activa o crear una nueva
  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch(e) {
    const ss   = SpreadsheetApp.create('GPT-Licencias-Alertas');
    const file = DriveApp.getFileById(ss.getId());
    // Mover a la raíz de Drive para fácil acceso
    return ss;
  }
}

function ok(data) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, ...data }))
    .setMimeType(ContentService.MimeType.JSON);
}
