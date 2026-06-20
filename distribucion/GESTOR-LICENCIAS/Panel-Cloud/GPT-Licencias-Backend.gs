// ══════════════════════════════════════════════════════════════════════════
// GESTIÓN PRO TOTAL — BACKEND DE LICENCIAS EN LA NUBE (Google Apps Script)
// Vinculado al correo del programa. Guarda TODAS las claves, su estado,
// crea una CARPETA por cliente en tu Google Drive, detecta CLAVES COMPARTIDAS
// (misma clave en varios equipos) y permite REVOCARLAS.
//
// CÓMO INSTALARLO (una vez): copia TODO este archivo en https://script.google.com
// (con el correo del programa) → Implementar → Aplicación web → Acceso: cualquiera.
// Copia la URL que termina en /exec. Pégala en el panel (⚙️ Config → URL Apps Script)
// y, para activar el bloqueo en la app, pásame esa URL.
// ══════════════════════════════════════════════════════════════════════════

const CFG = {
  EMAIL_ADMIN: 'kairigarcia.gestionprototal@gmail.com', // ← tu correo (avisos)
  PASS_ADMIN:  'NiMiXaGa271110',                         // ← contraseña del panel
  HOJA:        'GPT-Licencias',                          // hoja de cálculo
  CARPETA_RAIZ:'Gestion Pro Total - Licencias',          // carpeta raíz en tu Drive
  MAX_EQUIPOS: 1,                                        // equipos permitidos por clave
};

// ── Utilidades de almacenamiento (Google Sheets) ──────────────────────────
function _ss(){
  const id=PropertiesService.getScriptProperties().getProperty('SSID');
  if(id){ try{ return SpreadsheetApp.openById(id); }catch(e){} }
  const ss=SpreadsheetApp.create(CFG.HOJA);
  PropertiesService.getScriptProperties().setProperty('SSID', ss.getId());
  const sh=ss.getActiveSheet(); sh.setName('licencias');
  sh.appendRow(['key','cliente','email','plan','estado','equipos','emitida','expira','ultimo_uso','notas']);
  return ss;
}
function _hoja(){ const ss=_ss(); return ss.getSheetByName('licencias')||ss.insertSheet('licencias'); }
function _buscarFila(key){
  const sh=_hoja(); const data=sh.getDataRange().getValues();
  for(let i=1;i<data.length;i++){ if(String(data[i][0])===String(key)) return {row:i+1, data:data[i]}; }
  return null;
}

// ── Carpeta por cliente en Google Drive ───────────────────────────────────
function _carpetaRaiz(){
  const it=DriveApp.getFoldersByName(CFG.CARPETA_RAIZ);
  return it.hasNext()? it.next() : DriveApp.createFolder(CFG.CARPETA_RAIZ);
}
function _carpetaCliente(nombre){
  const raiz=_carpetaRaiz(); const n=(nombre||'Sin nombre').replace(/[\\/:*?"<>|]/g,'-');
  const it=raiz.getFoldersByName(n);
  return it.hasNext()? it.next() : raiz.createFolder(n);
}
function _guardarClaveEnDrive(cliente, key, info){
  const car=_carpetaCliente(cliente);
  const fn='CLAVE-'+(key.slice(0,12))+'.txt';
  const cont='Cliente: '+cliente+'\nClave: '+key+'\nPlan: '+(info.plan||'')+
             '\nEstado: '+(info.estado||'')+'\nEquipos: '+(info.equipos||'')+
             '\nEmitida: '+(info.emitida||'')+'\nExpira: '+(info.expira||'')+'\n';
  const ex=car.getFilesByName(fn);
  if(ex.hasNext()) ex.next().setContent(cont); else car.createFile(fn, cont);
}

// ── Punto de entrada ──────────────────────────────────────────────────────
function doPost(e){
  let r;
  try{
    const d=JSON.parse((e&&e.postData&&e.postData.contents)||'{}');
    const accion=d.accion||d.tipo||'';
    if(accion==='registrar')      r=registrarLicencia(d);   // el panel registra una clave emitida
    else if(accion==='validar')   r=validarYRegistrarUso(d);// la app valida y reporta su equipo
    else if(accion==='revocar')   r=revocar(d);             // el panel revoca
    else if(accion==='listar')    r=listar(d);              // el panel pide todas las claves
    else if(accion==='SOLICITUD_LICENCIA') r=guardarSolicitud(d);
    else r={ok:false,error:'accion desconocida'};
  }catch(err){ r={ok:false,error:String(err)}; }
  return ContentService.createTextOutput(JSON.stringify(r)).setMimeType(ContentService.MimeType.JSON);
}

// Registrar una clave emitida (la llama el panel al generar la licencia)
function registrarLicencia(d){
  const sh=_hoja(); const f=_buscarFila(d.key);
  const fila=[d.key, d.cliente||'', d.email||'', d.plan||'', d.estado||'activa', '', d.emitida||new Date().toISOString(), d.expira||'', '', d.notas||''];
  if(f){ sh.getRange(f.row,1,1,fila.length).setValues([fila]); }
  else { sh.appendRow(fila); }
  _guardarClaveEnDrive(d.cliente||'Sin nombre', d.key, {plan:d.plan,estado:d.estado||'activa',emitida:d.emitida,expira:d.expira,equipos:''});
  return {ok:true};
}

// La APP llama aquí al abrir: valida + registra su equipo + detecta compartición
function validarYRegistrarUso(d){
  const key=d.key||d.license||''; const dev=d.deviceId||'';
  const sh=_hoja(); const f=_buscarFila(key);
  if(!f) return {ok:true, valid:false, reason:'NO_REGISTRADA'};
  const fila=f.data;
  let estado=fila[4]||'activa';
  let equipos=String(fila[5]||'').split(',').map(s=>s.trim()).filter(Boolean);
  if(estado==='revocada'||estado==='inactiva') return {ok:true, valid:false, reason:'REVOCADA'};
  // ¿equipo nuevo?
  if(dev && equipos.indexOf(dev)<0){
    equipos.push(dev);
    if(equipos.length>CFG.MAX_EQUIPOS){
      // CLAVE COMPARTIDA → marcar y avisar
      estado='compartida';
      sh.getRange(f.row,5).setValue('compartida');
      sh.getRange(f.row,6).setValue(equipos.join(','));
      sh.getRange(f.row,9).setValue(new Date().toISOString());
      _avisoComparticion(fila[1], fila[2], key, equipos);
      _guardarClaveEnDrive(fila[1]||'Sin nombre', key, {plan:fila[3],estado:'compartida',emitida:fila[6],expira:fila[7],equipos:equipos.join(' | ')});
      return {ok:true, valid:false, reason:'COMPARTIDA'}; // bloquea el equipo duplicado
    }
    sh.getRange(f.row,6).setValue(equipos.join(','));
  }
  sh.getRange(f.row,9).setValue(new Date().toISOString());
  // caducidad
  if(fila[7] && new Date(fila[7]) < new Date()) return {ok:true, valid:false, reason:'CADUCADA'};
  return {ok:true, valid:true, reason:'OK', plan:fila[3]};
}

function revocar(d){
  if(d.pass!==CFG.PASS_ADMIN) return {ok:false,error:'no autorizado'};
  const sh=_hoja(); const f=_buscarFila(d.key); if(!f) return {ok:false,error:'no encontrada'};
  sh.getRange(f.row,5).setValue('revocada');
  _guardarClaveEnDrive(f.data[1]||'Sin nombre', d.key, {plan:f.data[3],estado:'revocada',emitida:f.data[6],expira:f.data[7],equipos:f.data[5]});
  return {ok:true};
}

function listar(d){
  if(d.pass!==CFG.PASS_ADMIN) return {ok:false,error:'no autorizado'};
  const sh=_hoja(); const data=sh.getDataRange().getValues(); const out=[];
  for(let i=1;i<data.length;i++){
    out.push({key:data[i][0],cliente:data[i][1],email:data[i][2],plan:data[i][3],estado:data[i][4],equipos:String(data[i][5]||'').split(',').filter(Boolean),emitida:data[i][6],expira:data[i][7],ultimo_uso:data[i][8]});
  }
  return {ok:true, licencias:out};
}

function guardarSolicitud(d){
  // Guarda el comprobante en la carpeta del cliente (Drive) y avisa por email
  let adj='';
  try{
    if(d.comprobante && d.comprobante.b64){
      const car=_carpetaCliente(d.nombre||d.email||'Solicitudes');
      const m=String(d.comprobante.b64).match(/^data:([^;]+);base64,(.*)$/);
      if(m){
        const blob=Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], 'COMPROBANTE-'+(d.comprobante.name||'pago'));
        car.createFile(blob); adj='\n\n📎 Comprobante guardado en la carpeta del cliente en tu Drive.';
      }
    }
  }catch(e){ adj='\n\n(No se pudo guardar el comprobante: '+e+')'; }
  MailApp.sendEmail(CFG.EMAIL_ADMIN, '📬 Solicitud de licencia — '+(d.nombre||'?'),
    'Cliente: '+(d.nombre||'')+'\nEmail: '+(d.email||'')+'\nTeléfono: '+(d.telefono||'')+
    '\nPlan: '+(d.plan||'')+'\nEquipo: '+(d.deviceId||'')+'\nNotas: '+(d.obs||'')+
    '\nConsentimiento RGPD: '+(d.consentimiento?'SÍ':'no')+
    (/(estudiant|escuela)/i.test(d.plan||'')?'\n\n⚠️ ESTUDIANTES: verifica la MATRÍCULA antes de emitir.':'')+adj);
  return {ok:true};
}

function _avisoComparticion(cliente,email,key,equipos){
  try{ MailApp.sendEmail(CFG.EMAIL_ADMIN, '🚨 CLAVE COMPARTIDA detectada — '+(cliente||'?'),
    'La clave de '+(cliente||'')+' ('+(email||'')+') se ha usado en VARIOS equipos:\n\n'+
    equipos.join('\n')+'\n\nClave: '+key+'\n\nEl equipo duplicado ha quedado BLOQUEADO y la clave marcada como COMPARTIDA. '+
    'Revísala en el panel para revocarla definitivamente si procede.'); }catch(e){}
}

// Página de comprobación (abrir la URL en el navegador)
function doGet(){
  return HtmlService.createHtmlOutput('<h2>✅ Backend de licencias activo</h2><p>Gestión Pro Total</p>');
}
