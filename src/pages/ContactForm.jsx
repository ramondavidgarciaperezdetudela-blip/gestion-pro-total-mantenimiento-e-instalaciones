import React, { useState } from 'react';
import { Copy, CheckCircle2, MessageSquare } from 'lucide-react';
import NavBar from '@/components/NavBar';

const DEST_EMAIL = 'kairigarcia.gestionprototal@gmail.com';

export default function ContactForm() {
  const [copied, setCopied] = useState(false);

  const copyEmail = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(DEST_EMAIL).catch(fallback);
    } else { fallback(); }
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = DEST_EMAIL;
    ta.style.cssText = 'position:fixed;opacity:0;';
    document.body.appendChild(ta); ta.focus(); ta.select();
    try { document.execCommand('copy'); } catch(e) {}
    document.body.removeChild(ta);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar title="Contacto y Sugerencias" />
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Cabecera */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-90" />
          <h1 className="text-xl font-bold">Contacto y Sugerencias</h1>
          <p className="text-blue-200 text-sm mt-1">Gestión Pro Total</p>
        </div>

        {/* Email para contacto */}
        <div className="bg-white rounded-2xl shadow p-5 space-y-4">
          <p className="text-sm text-slate-600 text-center">
            Envía tu mensaje, sugerencia o reporte de error al siguiente correo:
          </p>

          {/* Email grande y visible */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-center">
            <p className="text-xs text-blue-500 font-medium uppercase tracking-wide mb-1">Correo electrónico</p>
            <p className="text-blue-800 font-bold text-base break-all select-all">{DEST_EMAIL}</p>
          </div>

          {/* Botón copiar */}
          <button onClick={copyEmail}
            className={`w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all ${
              copied
                ? 'bg-green-100 text-green-700 border-2 border-green-300'
                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow'
            }`}>
            {copied
              ? <><CheckCircle2 className="w-5 h-5" /> ¡Correo copiado!</>
              : <><Copy className="w-5 h-5" /> Copiar dirección de correo</>
            }
          </button>
        </div>

        {/* Instrucciones */}
        <div className="bg-white rounded-2xl shadow p-5 space-y-3">
          <p className="text-sm font-semibold text-slate-700">¿Cómo contactar?</p>
          <div className="space-y-2.5">
            {[
              { icon: '📧', app: 'Gmail / Outlook', desc: 'Abre tu app de correo, crea un nuevo mensaje y pega la dirección' },
              { icon: '💬', app: 'WhatsApp', desc: 'No disponible por este canal — usa el correo electrónico' },
              { icon: '📋', app: 'Copiar y pegar', desc: 'Pulsa "Copiar dirección" y pégala en la app que prefieras' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                <span className="text-2xl flex-shrink-0">{item.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-700">{item.app}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Qué incluir en el mensaje */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800 mb-2">💡 Qué incluir en tu mensaje</p>
          <ul className="text-xs text-amber-700 space-y-1">
            <li>• Descripción del problema o sugerencia</li>
            <li>• Qué pantalla o función estabas usando</li>
            <li>• Modelo de dispositivo (si es un error)</li>
          </ul>
        </div>

      </div>
    </div>
  );
}
