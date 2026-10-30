import React, { useState } from 'react';
import { validateLicenseKey, storeLicense, getStoredLicense } from '../lib/licenseManager';

export default function LicenseRenewal({ onRenewed }) {
  const stored  = getStoredLicense();
  const [key,    setKey]    = useState('');
  const [estado, setEstado] = useState('idle');
  const [msg,    setMsg]    = useState('');

  const formatKey = (val) => {
    const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const tpl   = [3, 6, 2, 6, 4, 4];
    const parts = [];
    let pos = 0;
    for (const len of tpl) {
      if (pos >= clean.length) break;
      parts.push(clean.slice(pos, pos + len));
      pos += len;
    }
    return parts.join('-');
  };

  const renovar = async () => {
    if (!key.trim()) { setMsg('Introduce la nueva clave de licencia.'); setEstado('error'); return; }
    setEstado('loading');
    try {
      const result = await validateLicenseKey(key.trim());
      if (result.valid) {
        storeLicense(result);
        setEstado('ok');
        setMsg(`✅ ¡Licencia renovada! Plan ${result.tipo} activado.`);
        setTimeout(() => onRenewed(), 1600);
      } else {
        setEstado('error');
        setMsg(result.reason || 'Clave no válida.');
      }
    } catch (e) {
      setEstado('error');
      setMsg('Error al validar: ' + e.message);
    }
  };

  const expiraStr = stored?.expira
    ? new Date(stored.expira).toLocaleDateString('es-ES')
    : 'desconocida';

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'radial-gradient(ellipse at 20% 50%, #7c1d1d33, transparent 60%), #0a0e1a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Segoe UI, Arial, sans-serif', padding: 20
    }}>
      <div style={{
        background: '#111827', border: '1px solid #2a3a55',
        borderRadius: 20, padding: '44px 40px', width: '100%', maxWidth: 440,
        boxShadow: '0 25px 60px #00000088', textAlign: 'center'
      }}>
        <img
          src="/logo-gestion-pro-total.png"
          alt="Gestión Pro Total"
          style={{ width: 180, borderRadius: 14, marginBottom: 20, opacity: 0.85 }}
          onError={e => { e.target.style.display = 'none'; }}
        />

        <div style={{ background: '#7f1d1d22', border: '1px solid #ef4444', borderRadius: 10, padding: '12px 16px', marginBottom: 22 }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>⏰</div>
          <div style={{ color: '#fca5a5', fontSize: 14, fontWeight: 700 }}>Licencia expirada</div>
          <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>
            Tu licencia expiró el <strong style={{ color: '#ef4444' }}>{expiraStr}</strong>
          </div>
        </div>

        <h2 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 800, margin: '0 0 6px' }}>
          Renovar licencia
        </h2>
        <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 22px' }}>
          Introduce la nueva clave para continuar usando el programa
        </p>

        <input
          type="text"
          value={key}
          onChange={e => { setKey(formatKey(e.target.value)); setEstado('idle'); setMsg(''); }}
          onKeyDown={e => { if (e.key === 'Enter') renovar(); }}
          placeholder="GPT-YYYYMM-TT-XXXXXX-XXXX-CCCC"
          maxLength={28}
          autoFocus
          style={{
            width: '100%', boxSizing: 'border-box',
            background: '#0a0e1a', border: `1.5px solid ${estado === 'error' ? '#ef4444' : estado === 'ok' ? '#10b981' : '#2a3a55'}`,
            borderRadius: 10, padding: '13px 16px',
            color: '#f1f5f9', fontSize: 15, fontFamily: 'monospace',
            letterSpacing: '0.08em', outline: 'none', textAlign: 'center', marginBottom: 14
          }}
        />

        {msg && (
          <div style={{
            background: estado === 'ok' ? '#10b98122' : '#ef444422',
            border: `1px solid ${estado === 'ok' ? '#10b981' : '#ef4444'}`,
            borderRadius: 8, padding: '10px 14px',
            color: estado === 'ok' ? '#10b981' : '#fca5a5',
            fontSize: 13, marginBottom: 16
          }}>
            {msg}
          </div>
        )}

        <button
          onClick={renovar}
          disabled={estado === 'loading' || estado === 'ok'}
          style={{
            width: '100%', padding: 13,
            background: 'linear-gradient(135deg,#3b82f6,#06b6d4)',
            color: '#fff', border: 'none', borderRadius: 10,
            fontSize: 15, fontWeight: 700,
            cursor: estado === 'loading' ? 'wait' : 'pointer',
            opacity: estado === 'loading' || estado === 'ok' ? 0.8 : 1
          }}
        >
          {estado === 'loading' ? '⏳ Verificando...' : estado === 'ok' ? '✅ Renovada — Entrando...' : '🔑 Renovar licencia'}
        </button>

        <p style={{ color: '#374151', fontSize: 11, marginTop: 20 }}>
          <a href="mailto:kairigarcia.gestionprototal@gmail.com?subject=Solicitud renovacion"
             style={{ color: '#3b82f6', textDecoration: 'none' }}>
            Solicitar nueva clave →
          </a>
        </p>
      </div>
    </div>
  );
}
