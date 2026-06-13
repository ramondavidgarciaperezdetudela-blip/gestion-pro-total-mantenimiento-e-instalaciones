import React, { useState, useEffect } from 'react';
import { registrarIntentoComparticion, desactivarEnEsteDispositivo, clearLicense, getDeviceId } from '../lib/licenseManager';

const LIMITE_REVOCACION = 2; // Al 2.º intento se revocan ambas

export default function SharingWarning({ sharingInfo, onContinue, onDesactivar }) {
  const [contador,  setContador]  = useState(90);
  const [accion,    setAccion]    = useState(null); // null | 'desactivar' | 'revocar'
  const intentos = sharingInfo.intentos || 1;

  // Countdown de 90 segundos — si no actúa se revoca
  useEffect(() => {
    const t = setInterval(() => {
      setContador(c => {
        if (c <= 1) {
          clearInterval(t);
          // Tiempo agotado → revocar automáticamente
          handleRevocar();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Registrar el intento al mostrar el aviso
  useEffect(() => {
    registrarIntentoComparticion({ ...sharingInfo, accion: 'aviso_mostrado' });
  }, []);

  const handleDesactivarAqui = () => {
    registrarIntentoComparticion({ ...sharingInfo, accion: 'desactivado_este_dispositivo' });
    desactivarEnEsteDispositivo();
    setAccion('desactivar');
    onDesactivar();
  };

  const handleRevocar = () => {
    if (accion) return;
    registrarIntentoComparticion({ ...sharingInfo, accion: 'revocacion_automatica' });
    clearLicense(); // Revocar local
    setAccion('revocar');
  };

  if (accion === 'desactivar') return (
    <div style={wrapS}>
      <div style={boxS}>
        <div style={{fontSize:52,marginBottom:12}}>✅</div>
        <h2 style={{color:'#f1f5f9',fontSize:18,fontWeight:800,marginBottom:8}}>Dispositivo desactivado</h2>
        <p style={{color:'#94a3b8',fontSize:13,lineHeight:1.7,marginBottom:20}}>
          Has desactivado la licencia en este dispositivo.<br/>
          Ahora solo funciona en el dispositivo original.<br/><br/>
          Si necesitas cambiar de dispositivo definitivamente, contacta con el soporte.
        </p>
        <div style={{background:'#1e293b',borderRadius:10,padding:'12px 16px',fontSize:12,color:'#64748b',fontFamily:'monospace'}}>
          {getDeviceId()}
        </div>
      </div>
    </div>
  );

  if (accion === 'revocar' || contador === 0) return (
    <div style={wrapS}>
      <div style={boxS}>
        <div style={{fontSize:52,marginBottom:12}}>🚫</div>
        <h2 style={{color:'#ef4444',fontSize:18,fontWeight:800,marginBottom:8}}>Licencias revocadas</h2>
        <p style={{color:'#94a3b8',fontSize:13,lineHeight:1.7,marginBottom:16}}>
          Se ha detectado el uso de la misma clave en <strong style={{color:'#f1f5f9'}}>2 dispositivos distintos</strong>.
          Ambas licencias han sido revocadas.<br/><br/>
          Para recuperar el acceso deberás <strong style={{color:'#fca5a5'}}>contratar una nueva licencia</strong>.
          No es posible reclamar el importe de la licencia anterior.
        </p>
        <div style={{background:'#7f1d1d33',border:'1px solid #ef4444',borderRadius:8,padding:12,fontSize:12,color:'#fca5a5',marginBottom:16,lineHeight:1.6}}>
          ⚠️ Este intento de compartición ha sido registrado y notificado al administrador.
        </div>
        <a href="mailto:kairigarcia.gestionprototal@gmail.com?subject=Solicitud nueva licencia tras revocación"
           style={{display:'block',background:'linear-gradient(135deg,#3b82f6,#06b6d4)',color:'#fff',padding:'12px',borderRadius:10,textDecoration:'none',fontWeight:700,fontSize:14,textAlign:'center'}}>
          Solicitar nueva licencia
        </a>
      </div>
    </div>
  );

  const esUltimooportunidad = intentos >= LIMITE_REVOCACION;

  return (
    <div style={wrapS}>
      <div style={boxS}>
        {/* Header */}
        <div style={{background:'#7f1d1d',borderRadius:'14px 14px 0 0',padding:'20px 24px',textAlign:'center',margin:'-32px -32px 20px',borderBottom:'1px solid #ef444433'}}>
          <div style={{fontSize:42,marginBottom:6}}>⚠️</div>
          <h1 style={{color:'#fca5a5',fontSize:17,fontWeight:800,margin:0}}>Uso de licencia detectado en otro dispositivo</h1>
        </div>

        {/* Mensaje principal */}
        <div style={{background:'#0f172a',border:'1px solid #ef444455',borderRadius:10,padding:'14px 16px',marginBottom:16,lineHeight:1.7,fontSize:13}}>
          <div style={{color:'#fca5a5',fontWeight:700,marginBottom:6}}>Tu clave de licencia ya está activa en otro dispositivo.</div>
          <div style={{color:'#94a3b8'}}>
            {esUltimooportunidad
              ? <>⛔ Este es tu <strong style={{color:'#fca5a5'}}>último aviso</strong>. Si se vuelve a detectar uso compartido, <strong style={{color:'#ef4444'}}>la licencia quedará revocada automáticamente</strong> sin opción a reclamación.</>
              : <>Si no desactivas la licencia en el otro dispositivo en <strong style={{color:'#f1f5f9'}}>{contador} segundos</strong>, <strong style={{color:'#ef4444'}}>AMBAS licencias quedarán revocadas</strong> y tendrás que contratar una nueva suscripción sin derecho a reclamación.</>
            }
          </div>
        </div>

        {/* Aviso de intentos */}
        {intentos > 1 && (
          <div style={{background:'#431407',border:'1px solid #ea580c',borderRadius:8,padding:'10px 14px',marginBottom:14,fontSize:12,color:'#fdba74'}}>
            🔔 Intento de compartición número <strong>{intentos}</strong>.
            {esUltimooportunidad
              ? ' El siguiente intento revocará la licencia automáticamente.'
              : ' Próxima detección → revocación inmediata.'}
          </div>
        )}

        {/* Countdown */}
        {!esUltimooportunidad && (
          <div style={{textAlign:'center',marginBottom:16}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'#1e293b',borderRadius:8,padding:'8px 16px'}}>
              <div style={{width:32,height:32,background:`conic-gradient(#ef4444 ${(contador/90)*100}%,#2a3a55 0)`,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <div style={{width:22,height:22,background:'#111827',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#ef4444'}}>
                  {contador}
                </div>
              </div>
              <span style={{fontSize:12,color:'#64748b'}}>segundos para revocación automática</span>
            </div>
          </div>
        )}

        {/* Botones de acción */}
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <button onClick={handleDesactivarAqui} style={{padding:'12px',background:'linear-gradient(135deg,#3b82f6,#06b6d4)',color:'#fff',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer'}}>
            ✅ Soy el titular — Desactivar en este dispositivo
          </button>
          <button onClick={onContinue} style={{padding:'12px',background:'#10b981',color:'#fff',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer'}}>
            🖥️ Continuar en este dispositivo (desactivar el otro)
          </button>
        </div>

        <p style={{fontSize:11,color:'#374151',textAlign:'center',marginTop:12,lineHeight:1.6}}>
          Este intento ha sido registrado y notificado al administrador.<br/>
          Soporte: kairigarcia.gestionprototal@gmail.com
        </p>
      </div>
    </div>
  );
}

const wrapS = {position:'fixed',inset:0,background:'radial-gradient(ellipse at center,#7f1d1d33,#0a0e1a 70%)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Segoe UI',Arial,sans-serif",padding:16,zIndex:9999};
const boxS  = {background:'#111827',border:'1px solid #ef444444',borderRadius:16,padding:'32px',width:'100%',maxWidth:460,boxShadow:'0 25px 60px #00000099'};
