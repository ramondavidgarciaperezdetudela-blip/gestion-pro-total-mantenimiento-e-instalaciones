/**
 * LicenseGate — control de licencia con pantalla de inicio (activar + suscribir).
 * Las rutas públicas y el modo sin configurar pasan siempre.
 */
import { useEffect, useState, useCallback } from 'react';
import {
  loadLicense, saveLicense, clearLicense, getDeviceId,
  validateLicenseLocal, validateLicenseCloud, describeReason,
} from '@/lib/licenseManager';
import { licenseConfig as cfg } from '@/lib/license.config';
import { plans, paymentConfig as pay } from '@/lib/plans.config';

function isPublicPath() {
  const p = (window.location.pathname || '').toLowerCase();
  return cfg.publicPaths.some((pp) => p.startsWith(pp.toLowerCase())) || p.includes('publico');
}

async function validateCurrent() {
  const key = loadLicense();
  if (!key) return { valid: false, reason: 'SIN_LICENCIA' };
  if (cfg.mode === 'cloud') return validateLicenseCloud(key, cfg.cloudEndpoint, { deviceId: getDeviceId() });
  return validateLicenseLocal(key, null, { deviceId: getDeviceId() });
}

function StartScreen({ reason, onActivated }) {
  const [tab, setTab] = useState('suscribir'); // 'suscribir' | 'clave'
  const deviceId = getDeviceId();

  /* --- pestaña: activar clave --- */
  const [key, setKey] = useState('');
  const [msg, setMsg] = useState(reason && reason !== 'SIN_LICENCIA' ? describeReason(reason) : '');
  const [busy, setBusy] = useState(false);
  const activar = async () => {
    setBusy(true); setMsg('');
    saveLicense(key.trim());
    const res = await validateCurrent();
    setBusy(false);
    if (res.valid) onActivated();
    else { clearLicense(); setMsg(describeReason(res.reason)); }
  };

  /* --- pestaña: suscribir --- */
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [sel, setSel] = useState(plans.find((p) => p.destacado)?.id || plans[0].id);
  const plan = plans.find((p) => p.id === sel) || plans[0];

  const datosTexto = () =>
    `SOLICITUD / SUSCRIPCIÓN - Gestión Pro Total\n` +
    `Plan: ${plan.nombre} (${plan.precio} ${plan.periodo})\n` +
    `Equipo: ${deviceId}\n` +
    `Cliente: ${nombre}\n` +
    `Email: ${email}`;

  const enviarSolicitud = () => {
    if (!nombre || !email) { alert('Pon tu nombre y email para enviarte la clave.'); return; }
    const subject = `Suscripción ${plan.nombre} - ${deviceId}`;
    window.location.href =
      `mailto:${pay.contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(datosTexto())}`;
  };
  const copiarDatos = async () => {
    try { await navigator.clipboard.writeText(datosTexto()); alert('Datos copiados. Pégalos en un email o WhatsApp.'); }
    catch { alert(datosTexto()); }
  };
  const pagarTarjeta = () => {
    if (!plan.stripeUrl) { alert('Este plan aún no tiene pago con tarjeta configurado. Usa Bizum/transferencia o solicita por email.'); return; }
    window.open(plan.stripeUrl, '_blank', 'noopener');
  };
  const whatsappLink = pay.whatsapp
    ? `https://wa.me/${pay.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(datosTexto())}`
    : '';

  return (
    <div className="fixed inset-0 overflow-auto bg-slate-900 p-4 flex items-start sm:items-center justify-center">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl my-6">
        {/* Cabecera */}
        <div className="bg-blue-700 text-white rounded-t-2xl px-6 py-5">
          <h1 className="text-xl font-bold">Gestión Pro Total</h1>
          <p className="text-blue-100 text-sm">Activa tu licencia o suscríbete para empezar.</p>
        </div>

        {/* Pestañas */}
        <div className="flex border-b">
          <button
            onClick={() => setTab('suscribir')}
            className={`flex-1 py-3 text-sm font-semibold ${tab === 'suscribir' ? 'text-blue-700 border-b-2 border-blue-700' : 'text-slate-500'}`}
          >Suscribirme</button>
          <button
            onClick={() => setTab('clave')}
            className={`flex-1 py-3 text-sm font-semibold ${tab === 'clave' ? 'text-blue-700 border-b-2 border-blue-700' : 'text-slate-500'}`}
          >Ya tengo mi clave</button>
        </div>

        <div className="p-6">
          {/* Identificador de equipo (común) */}
          <div className="mb-5">
            <span className="text-xs font-semibold text-slate-600">Tu identificador de equipo</span>
            <div className="mt-1 bg-slate-900 text-sky-300 rounded-lg py-2 text-center font-mono tracking-wider">{deviceId}</div>
            <p className="text-xs text-slate-400 mt-1">Tu licencia funcionará en este equipo. Envíanos este código.</p>
          </div>

          {tab === 'suscribir' ? (
            <>
              {/* Datos */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Nombre / Empresa</label>
                  <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-sm" placeholder="Mantenimientos García S.L." />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-sm" placeholder="tucorreo@empresa.com" />
                </div>
              </div>

              {/* Planes */}
              <label className="block text-xs font-semibold text-slate-600 mt-5 mb-2">Elige tu plan</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {plans.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSel(p.id)}
                    className={`text-left border rounded-xl p-3 transition ${sel === p.id ? 'border-blue-600 ring-2 ring-blue-200 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    {p.destacado && <span className="inline-block text-[10px] font-bold text-white bg-blue-600 rounded px-1.5 py-0.5 mb-1">POPULAR</span>}
                    <div className="font-semibold text-sm text-slate-800">{p.nombre}</div>
                    <div className="text-blue-700 font-bold text-sm">{p.precio} <span className="text-slate-400 font-normal text-xs">{p.periodo}</span></div>
                    {p.nota && <div className="text-[11px] text-slate-500 mt-1 leading-tight">{p.nota}</div>}
                  </button>
                ))}
              </div>

              {/* Pago */}
              <div className="mt-5 rounded-xl bg-slate-50 border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-700 mb-2">Pagar plan <span className="text-blue-700">{plan.nombre}</span> · {plan.precio} {plan.periodo}</p>

                {plan.id === 'demo' ? (
                  <p className="text-sm text-slate-600">La demo es gratis: envíanos tus datos y te mandamos una clave de prueba de 14 días.</p>
                ) : (
                  <div className="space-y-3">
                    {/* Tarjeta (Stripe) */}
                    <button onClick={pagarTarjeta} className="w-full bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:opacity-95">
                      💳 Pagar con tarjeta {plan.stripeUrl ? '' : '(configurar)'}
                    </button>
                    {/* Bizum / Transferencia */}
                    <div className="text-sm text-slate-700 bg-white border border-slate-200 rounded-lg p-3">
                      <p className="font-semibold mb-1">Bizum / Transferencia</p>
                      <p>Bizum: <b>{pay.bizumPhone || '(añade tu número en plans.config.js)'}</b></p>
                      <p>IBAN: <b>{pay.iban || '(añade tu IBAN en plans.config.js)'}</b></p>
                      <p className="text-xs text-slate-500 mt-1">Concepto: {deviceId} · {plan.nombre}. Tras pagar, envíanos tus datos abajo.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Enviar datos / solicitar clave */}
              <button onClick={enviarSolicitud} className="w-full mt-4 bg-green-600 text-white font-semibold py-3 rounded-lg hover:opacity-95">
                {plan.id === 'demo' ? 'Solicitar demo gratis' : 'He pagado · enviar mis datos para recibir la clave'}
              </button>
              <div className="flex gap-2 mt-2">
                <button onClick={copiarDatos} className="flex-1 bg-slate-200 text-slate-700 font-medium py-2 rounded-lg hover:bg-slate-300 text-sm">Copiar datos</button>
                {whatsappLink && (
                  <a href={whatsappLink} target="_blank" rel="noopener" className="flex-1 text-center bg-emerald-500 text-white font-medium py-2 rounded-lg hover:opacity-95 text-sm">WhatsApp</a>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-3 text-center">
                Tras el pago te enviamos tu clave. Pégala en la pestaña <b>“Ya tengo mi clave”</b>.
              </p>
            </>
          ) : (
            <>
              <label className="block text-xs font-semibold text-slate-600">Clave de licencia</label>
              <textarea rows={4} value={key} onChange={(e) => setKey(e.target.value)} placeholder="Pega aquí la clave que te enviamos" className="w-full mt-1 border border-slate-300 rounded-lg p-2 font-mono text-xs" />
              {msg && <p className="text-red-600 text-sm mt-2">{msg}</p>}
              <button onClick={activar} disabled={busy || !key.trim()} className="w-full mt-4 bg-green-600 disabled:opacity-50 text-white font-semibold py-3 rounded-lg hover:opacity-95">
                {busy ? 'Comprobando…' : 'Activar'}
              </button>
              <p className="text-xs text-slate-400 mt-3 text-center">¿Aún no tienes clave? Ve a la pestaña <b>“Suscribirme”</b>.</p>
            </>
          )}

          <p className="text-xs text-slate-400 mt-5 text-center">Soporte: {pay.contactEmail}</p>
        </div>
      </div>
    </div>
  );
}

export default function LicenseGate({ children }) {
  const [state, setState] = useState({ checking: true, valid: false, reason: '' });

  const run = useCallback(async () => {
    if (isPublicPath() || !cfg.enabled || cfg.ownerBypass) {
      return setState({ checking: false, valid: true });
    }
    if (cfg.mode === 'cloud' && !cfg.cloudEndpoint) {
      return setState({ checking: false, valid: true });
    }
    const res = await validateCurrent();
    setState({ checking: false, valid: res.valid, reason: res.reason });
  }, []);

  useEffect(() => { run(); }, [run]);

  if (state.checking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }
  if (state.valid) return children;
  return <StartScreen reason={state.reason} onActivated={() => window.location.reload()} />;
}
