import React, { useState, useRef } from 'react';
import { validateLicenseKey, storeLicense, registrarActivacion, getDeviceId } from '../lib/licenseManager';

const ADMIN_EMAIL = 'kairigarcia.gestionprototal@gmail.com';
const ADMIN_WA    = '+34612345678'; // ← cambiar al número real

const S = {
  wrap: { position:'fixed',inset:0,background:'radial-gradient(ellipse at 20% 50%,#1e3a5f44,transparent 60%),radial-gradient(ellipse at 80% 20%,#06b6d422,transparent 50%),#0a0e1a',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Segoe UI',Arial,sans-serif",padding:16,minHeight:'100vh',overflowY:'auto' },
  box:  { background:'#111827',border:'1px solid #2a3a55',borderRadius:20,width:'100%',boxShadow:'0 25px 60px #00000088' },
  tab:  (act) => ({ flex:1,padding:'11px 0',fontWeight:700,fontSize:13,cursor:'pointer',border:'none',borderBottom:`2px solid ${act?'#3b82f6':'transparent'}`,background:'transparent',color:act?'#f1f5f9':'#64748b',transition:'all .2s' }),
  inp:  (err) => ({ width:'100%',boxSizing:'border-box',background:'#0a0e1a',border:`1.5px solid ${err?'#ef4444':'#2a3a55'}`,borderRadius:10,padding:'11px 14px',color:'#f1f5f9',fontSize:14,outline:'none',transition:'border .2s',fontFamily:'inherit',marginTop:4 }),
  lbl:  { fontSize:11,color:'#64748b',fontWeight:700,textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginTop:12 },
  btn:  (clr,dis) => ({ width:'100%',padding:13,background:clr,color:'#fff',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:dis?'not-allowed':'pointer',opacity:dis?.75:1,transition:'all .2s',display:'flex',alignItems:'center',justifyContent:'center',gap:8 }),
  msg:  (ok) => ({ background:ok?'#10b98122':'#ef444422',border:`1px solid ${ok?'#10b981':'#ef4444'}`,borderRadius:8,padding:'10px 14px',color:ok?'#10b981':'#fca5a5',fontSize:13,marginTop:12,lineHeight:1.5 }),
};

export default function LicenseActivation({ onActivated }) {
  const [tab,     setTab]     = useState('solicitar'); // solicitar | activar
  const [estado,  setEstado]  = useState('idle');
  const [msg,     setMsg]     = useState('');
  const [info,    setInfo]    = useState(null);
  const [key,     setKey]     = useState('');
  // Formulario solicitud
  const [nombre,  setNombre]  = useState('');
  const [email,   setEmail]   = useState('');
  const [empresa, setEmpresa] = useState('');
  const [tel,     setTel]     = useState('');
  const [plan,    setPlan]    = useState('anual');
  const [metodo,  setMetodo]  = useState('bizum');
  const [obs,     setObs]     = useState('');
  const [ficheroPrev, setFicheroPrev] = useState(null);
  const [fich,    setFich]    = useState(null); // {name, b64, type}
  const [enviado, setEnviado] = useState(false);
  const fileRef = useRef();

  const PLANES = {
    demo:        { nom:'Demo 7 días',     pre:'GRATIS',     dur:'7 días' },
    mensual:     { nom:'Mensual',         pre:'19 €',       dur:'1 mes' },
    trimestral:  { nom:'Trimestral',      pre:'49 €',       dur:'3 meses' },
    semestral:   { nom:'Semestral',       pre:'89 €',       dur:'6 meses' },
    anual:       { nom:'Anual',           pre:'149 €',      dur:'12 meses' },
    perpetuo:    { nom:'Perpetuo',        pre:'599 €',      dur:'Sin caducidad' },
    estudiantes: { nom:'Estudiantes',     pre:'GRATIS',     dur:'1 año · con matrícula' },
    empresa:     { nom:'Empresa (Packs)', pre:'Desde 49 €', dur:'A medida' },
  };

  // ── Formatear clave ─────────────────────────────────────────────────────
  const formatKey = v => {
    const c = v.toUpperCase().replace(/[^A-Z0-9]/g,'');
    const tpl=[3,6,2,6,4,4]; const parts=[]; let pos=0;
    for(const l of tpl){ if(pos>=c.length)break; parts.push(c.slice(pos,pos+l)); pos+=l; }
    return parts.join('-');
  };

  // ── ACTIVAR ─────────────────────────────────────────────────────────────
  const activar = async () => {
    if(!key.trim()){ setMsg('Introduce tu clave de licencia.'); setEstado('error'); return; }
    setEstado('loading');
    try{
      const r = await validateLicenseKey(key.trim());
      if(r.valid){
        storeLicense(r); registrarActivacion(r);
        setInfo(r); setEstado('ok');
        setMsg('¡Licencia '+(r.plan||'')+' activada correctamente!');
        setTimeout(()=>onActivated(),1600);
      } else {
        setEstado('error'); setMsg(r.reason||'Clave no válida.');
      }
    }catch(e){ setEstado('error'); setMsg('Error: '+e.message); }
  };

  // ── Fichero comprobante ──────────────────────────────────────────────────
  const handleFile = e => {
    const f = e.target.files?.[0]; if(!f)return;
    if(f.size>10*1024*1024){ alert('Fichero demasiado grande (máx 10 MB)'); return; }
    const reader=new FileReader();
    reader.onload=ev=>{ setFich({name:f.name,b64:ev.target.result,type:f.type}); setFicheroPrev(f.type.startsWith('image/')?ev.target.result:null); };
    reader.readAsDataURL(f);
  };

  // ── ENVIAR SOLICITUD ────────────────────────────────────────────────────
  const genReqId = () => 'GPT-REQ-'+Date.now().toString(36).toUpperCase();

  const enviarSolicitud = () => {
    if(!nombre.trim()){ setMsg('Introduce tu nombre.'); setEstado('error'); return; }
    if(!email.trim()||!/^[^@]+@[^@]+\.[^@]+$/.test(email)){ setMsg('Email no válido.'); setEstado('error'); return; }
    if(plan==='estudiantes'&&!fich){ setMsg('Adjunta tu justificante de matrícula actual.'); setEstado('error'); return; }
    if(plan!=='demo'&&plan!=='estudiantes'&&!fich){ setMsg('Adjunta el comprobante de pago.'); setEstado('error'); return; }
    setEstado('idle'); setMsg('');

    const reqId = genReqId();
    const pl    = PLANES[plan];
    const devId = getDeviceId();
    const ts    = new Date().toLocaleString('es-ES');

    // Guardar solicitud pendiente en localStorage para que el panel la lea
    try{
      const key_sol = 'gpt_solicitudes_v1';
      const sols = JSON.parse(localStorage.getItem(key_sol)||'[]');
      sols.unshift({ id:reqId, nombre:nombre.trim(), email:email.trim(),
        empresa:empresa.trim(), telefono:tel.trim(), plan, metodo,
        obs:obs.trim(), estado:'pendiente', fecha:new Date().toISOString(),
        deviceId:devId, keyAsignada:null });
      localStorage.setItem(key_sol, JSON.stringify(sols));
    }catch(e){}

    const cuerpo =
      'SOLICITUD DE LICENCIA — GESTIÓN PRO TOTAL\n' +
      '==========================================\n' +
      'ID: '+reqId+'\n' +
      'Nombre:   '+nombre+'\n' +
      'Email:    '+email+'\n' +
      'Empresa:  '+(empresa||'—')+'\n' +
      'Teléfono: '+(tel||'—')+'\n' +
      'Plan:     '+pl.nom+' — '+pl.pre+'\n' +
      'Pago:     '+metodo+'\n' +
      (obs?'Notas:    '+obs+'\n':'')+
      'Fecha:    '+ts+'\n' +
      'DeviceID: '+devId+'\n' +
      '==========================================\n' +
      'Por favor envíame la clave de licencia al email: '+email;

    if(metodo==='whatsapp'){
      // Abrir WhatsApp Web con el mensaje
      window.open('https://wa.me/'+ADMIN_WA.replace(/\D/g,'')+'?text='+encodeURIComponent(cuerpo));
    } else {
      // Email
      const sub = encodeURIComponent('Solicitud licencia GPT — '+pl.nom+' — '+nombre);
      window.open('mailto:'+ADMIN_EMAIL+'?subject='+sub+'&body='+encodeURIComponent(cuerpo));
    }

    // Si hay comprobante, ofrecer descarga
    if(fich){
      setTimeout(()=>{
        const a=document.createElement('a');
        a.href=fich.b64; a.download='comprobante-'+nombre.replace(/\s+/g,'-')+'.'+
          (fich.type.includes('pdf')?'pdf':'jpg');
        a.click();
      },600);
    }

    setEnviado(true);
  };

  // ── RENDER ───────────────────────────────────────────────────────────────
  if(enviado){
    return (
      <div style={S.wrap}>
        <div style={{...S.box,maxWidth:440,padding:'44px 36px',textAlign:'center'}}>
          <img src="/logo-gestion-pro-total.png" alt="" style={{width:160,borderRadius:14,marginBottom:20}} onError={e=>e.target.style.display='none'} />
          <div style={{fontSize:52,marginBottom:12}}>✅</div>
          <h2 style={{color:'#f1f5f9',fontSize:20,fontWeight:800,marginBottom:8}}>Solicitud enviada</h2>
          <p style={{color:'#64748b',fontSize:13,lineHeight:1.7,marginBottom:20}}>
            Recibirás tu clave de licencia en <strong style={{color:'#f1f5f9'}}>menos de 48 horas</strong> en el email <strong style={{color:'#3b82f6'}}>{email}</strong>.<br/><br/>
            Cuando la tengas, vuelve aquí y pulsa <strong style={{color:'#f1f5f9'}}>"Ya tengo mi clave"</strong>.
          </p>
          <button onClick={()=>{setEnviado(false);setTab('activar');}} style={S.btn('linear-gradient(135deg,#3b82f6,#06b6d4)',false)}>
            🔑 Ya tengo mi clave — Activar
          </button>
          <button onClick={()=>{setEnviado(false);setTab('solicitar');}} style={{...S.btn('transparent',false),color:'#64748b',marginTop:8,fontSize:12}}>
            ← Enviar otra solicitud
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={S.wrap}>
      <div style={{...S.box,maxWidth:520}}>

        {/* Cabecera */}
        <div style={{padding:'28px 28px 0',textAlign:'center'}}>
          <img src="/logo-gestion-pro-total.png" alt="GPT" style={{width:160,borderRadius:14,marginBottom:14,boxShadow:'0 8px 24px #00000066'}} onError={e=>e.target.style.display='none'} />
          <h1 style={{color:'#f1f5f9',fontSize:20,fontWeight:800,margin:'0 0 4px'}}>Gestión Pro Total</h1>
          <p style={{color:'#64748b',fontSize:12,margin:'0 0 20px'}}>Software de Gestión para Empresas Técnicas</p>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',borderBottom:'1px solid #2a3a55',margin:'0 28px'}}>
          <button style={S.tab(tab==='solicitar')} onClick={()=>{setTab('solicitar');setMsg('');setEstado('idle');}}>📋 Solicitar licencia</button>
          <button style={S.tab(tab==='activar')}   onClick={()=>{setTab('activar');setMsg('');setEstado('idle');}}>🔑 Activar clave</button>
        </div>

        <div style={{padding:'20px 28px 28px'}}>

          {/* ── TAB SOLICITAR ─────────────────────────────────────────── */}
          {tab==='solicitar'&&(<>
            <p style={{fontSize:12,color:'#64748b',marginBottom:14,lineHeight:1.6}}>
              Rellena el formulario, adjunta el comprobante de pago y envíanos la solicitud.<br/>
              Te responderemos con la clave de activación en menos de 48 horas.
            </p>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div>
                <span style={S.lbl}>Nombre *</span>
                <input style={S.inp(!nombre&&estado==='error')} value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Tu nombre" />
              </div>
              <div>
                <span style={S.lbl}>Email *</span>
                <input style={S.inp(!email&&estado==='error')} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@email.com" />
              </div>
              <div>
                <span style={S.lbl}>Empresa</span>
                <input style={S.inp(false)} value={empresa} onChange={e=>setEmpresa(e.target.value)} placeholder="Empresa (opcional)" />
              </div>
              <div>
                <span style={S.lbl}>Teléfono</span>
                <input style={S.inp(false)} value={tel} onChange={e=>setTel(e.target.value)} placeholder="+34 6XX XXX XXX" />
              </div>
            </div>

            {/* Plan */}
            <span style={S.lbl}>Plan de licencia</span>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginTop:4}}>
              {Object.entries(PLANES).map(([p,pl])=>(
                <div key={p} onClick={()=>setPlan(p)} style={{border:`2px solid ${plan===p?'#3b82f6':'#2a3a55'}`,background:plan===p?'#1e3a5f55':'#0a0e1a',borderRadius:8,padding:'8px 4px',cursor:'pointer',textAlign:'center',transition:'all .2s'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#f1f5f9'}}>{pl.nom}</div>
                  <div style={{fontSize:12,fontWeight:900,color:'#3b82f6',marginTop:2}}>{pl.pre}</div>
                  <div style={{fontSize:10,color:'#64748b'}}>{pl.dur}</div>
                </div>
              ))}
            </div>

            {/* Método de envío */}
            <span style={S.lbl}>Enviar solicitud por</span>
            <div style={{display:'flex',gap:8,marginTop:4}}>
              {[['bizum','💳 Bizum'],['transferencia','🏦 Transferencia'],['whatsapp','💬 WhatsApp'],['email','📧 Email']].map(([m,l])=>(
                <button key={m} onClick={()=>setMetodo(m)} style={{flex:1,padding:'8px 4px',border:`2px solid ${metodo===m?'#3b82f6':'#2a3a55'}`,background:metodo===m?'#1e3a5f55':'#0a0e1a',color:metodo===m?'#f1f5f9':'#64748b',borderRadius:8,cursor:'pointer',fontSize:11,fontWeight:700,transition:'all .2s'}}>
                  {l}
                </button>
              ))}
            </div>

            {/* Comprobante de pago */}
            {plan!=='demo'&&(
              <>
                <span style={S.lbl}>{plan==='estudiantes'?'Justificante de matrícula actual *':'Comprobante de pago *'}</span>
                {!fich?(
                  <div onClick={()=>fileRef.current?.click()} style={{border:`2px dashed ${!fich&&estado==='error'?'#ef4444':'#2a3a55'}`,borderRadius:8,padding:'16px',textAlign:'center',cursor:'pointer',marginTop:4,transition:'border .2s'}}
                    onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files?.[0];if(f){const evt={target:{files:[f]}};handleFile(evt);}}}>
                    <div style={{fontSize:24,marginBottom:4}}>📄</div>
                    <p style={{fontSize:12,color:'#64748b'}}>Haz clic o arrastra el fichero<br/><span style={{fontSize:11}}>JPG, PNG, PDF — máx 10 MB</span></p>
                  </div>
                ):(
                  <div style={{display:'flex',alignItems:'center',gap:10,background:'#0a0e1a',border:'1px solid #2a3a55',borderRadius:8,padding:'10px 12px',marginTop:4}}>
                    {ficheroPrev&&<img src={ficheroPrev} style={{width:50,height:40,objectFit:'cover',borderRadius:6}} alt=""/>}
                    <div style={{flex:1,fontSize:12}}><div style={{color:'#f1f5f9',fontWeight:700}}>{fich.name}</div><div style={{color:'#64748b',fontSize:11}}>{(fich.b64.length/1.37/1024).toFixed(0)} KB</div></div>
                    <button onClick={()=>{setFich(null);setFicheroPrev(null);fileRef.current.value='';}} style={{background:'#ef4444',color:'#fff',border:'none',borderRadius:6,padding:'5px 10px',cursor:'pointer',fontSize:12}}>✕</button>
                  </div>
                )}
                <input type="file" ref={fileRef} accept="image/*,.pdf" style={{display:'none'}} onChange={handleFile}/>
              </>
            )}

            {/* Observaciones */}
            <span style={S.lbl}>Observaciones</span>
            <textarea style={{...S.inp(false),minHeight:56,resize:'vertical'}} value={obs} onChange={e=>setObs(e.target.value)} placeholder="Indica cualquier detalle adicional..." />

            {msg&&<div style={S.msg(false)}>{msg}</div>}

            <button onClick={enviarSolicitud} style={{...S.btn('linear-gradient(135deg,#3b82f6,#06b6d4)',false),marginTop:16}}>
              {metodo==='whatsapp'?'💬 Enviar por WhatsApp':'📧 Enviar solicitud por email'}
            </button>

            <button onClick={()=>{setTab('activar');setMsg('');setEstado('idle');}} style={{...S.btn('transparent',false),color:'#64748b',marginTop:8,fontSize:12,border:'1px solid #2a3a55'}}>
              Ya tengo mi clave → Activar directamente
            </button>
          </>)}

          {/* ── TAB ACTIVAR ───────────────────────────────────────────── */}
          {tab==='activar'&&(<>
            <p style={{fontSize:13,color:'#64748b',marginBottom:16,lineHeight:1.6}}>
              Introduce la clave de licencia que te hemos enviado por email o WhatsApp.
            </p>

            <input
              type="text" value={key}
              onChange={e=>{setKey(formatKey(e.target.value));setEstado('idle');setMsg('');}}
              onKeyDown={e=>{if(e.key==='Enter')activar();}}
              placeholder="GPT-YYYYMM-TT-XXXXXX-XXXX-CCCC"
              maxLength={28} autoFocus
              style={{...S.inp(estado==='error'),fontFamily:'monospace',fontSize:16,letterSpacing:'.1em',textAlign:'center'}}
            />

            {msg&&<div style={S.msg(estado==='ok')}>{msg}</div>}

            {estado==='ok'&&info&&(
              <div style={{background:'#065f4622',border:'1px solid #10b981',borderRadius:8,padding:'10px 14px',marginTop:12,fontSize:12,color:'#6ee7b7'}}>
                <div><strong>Plan:</strong> {info.plan}</div>
                {info.expira
                  ? <div><strong>Válida hasta:</strong> {new Date(info.expira).toLocaleDateString('es-ES')}</div>
                  : <div><strong>Licencia permanente</strong> ♾️</div>}
              </div>
            )}

            <button onClick={activar} disabled={estado==='loading'||estado==='ok'}
              style={{...S.btn(estado==='ok'?'linear-gradient(135deg,#10b981,#059669)':'linear-gradient(135deg,#3b82f6,#06b6d4)',estado==='loading'||estado==='ok'),marginTop:16}}>
              {estado==='loading'?'⏳ Validando...':estado==='ok'?'✅ Activada — Entrando...':'🔑 Activar licencia'}
            </button>

            <button onClick={()=>{setTab('solicitar');setMsg('');setEstado('idle');}} style={{...S.btn('transparent',false),color:'#64748b',marginTop:8,fontSize:12,border:'1px solid #2a3a55'}}>
              ← No tengo clave — Solicitar licencia
            </button>
          </>)}

        </div>
      </div>
    </div>
  );
}
