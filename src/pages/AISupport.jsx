/* global __APP_VERSION__ */
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Bot, Send, KeyRound, Loader2, LifeBuoy } from 'lucide-react';

const PWD_KEY = 'gpt_support_pwd';
const DEFAULT_PWD = 'NiMiXaGa271110';
const SUPPORT_EMAIL = 'kairigarcia.gestionprototal@gmail.com';

function getStoredPwd() {
  try { return localStorage.getItem(PWD_KEY) || DEFAULT_PWD; } catch { return DEFAULT_PWD; }
}

export default function AISupport() {
  const [unlocked, setUnlocked] = useState(false);
  const [pwdInput, setPwdInput] = useState('');
  const [pwdErr, setPwdErr] = useState('');
  const [recovering, setRecovering] = useState(false);
  const [recoverMsg, setRecoverMsg] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [changeMode, setChangeMode] = useState(false);
  const [newPwdLogin, setNewPwdLogin] = useState('');

  const [tipo, setTipo] = useState('error');
  const [texto, setTexto] = useState('');
  const [iaResp, setIaResp] = useState('');
  const [asking, setAsking] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentMsg, setSentMsg] = useState('');

  const [newPwd, setNewPwd] = useState('');
  const [pwdChanged, setPwdChanged] = useState('');

  const version = (typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '');

  const doLogin = () => {
    if (pwdInput === getStoredPwd()) { setUnlocked(true); setPwdErr(''); }
    else setPwdErr('Contraseña incorrecta');
  };

  const recuperar = async () => {
    setRecovering(true); setRecoverMsg('');
    const destinos = [SUPPORT_EMAIL];
    if (personalEmail.trim()) destinos.push(personalEmail.trim());
    try {
      for (const to of destinos) {
        await base44.functions.invoke('soporteEmail', {
          subject: 'Recuperación de contraseña del panel de soporte',
          body: `Se ha solicitado recuperar la contraseña del Asistente de Soporte.\n\nContraseña actual: ${getStoredPwd()}`,
          to,
        });
      }
      setRecoverMsg(`✅ Contraseña enviada a: ${destinos.join(' y ')}. Revisa el correo.`);
    } catch {
      setRecoverMsg('⚠ No se pudo enviar el correo. Inténtalo de nuevo con conexión a internet.');
    }
    setRecovering(false);
  };

  // Cambiar la contraseña SIN necesitar la anterior (útil si otro usuario descarga
  // el programa y no la conoce). Opcionalmente la envía a su correo personal.
  const cambiarSinAnterior = async () => {
    if (newPwdLogin.trim().length < 4) { setRecoverMsg('La nueva contraseña debe tener al menos 4 caracteres'); return; }
    try { localStorage.setItem(PWD_KEY, newPwdLogin.trim()); } catch { /* ignore */ }
    const nueva = newPwdLogin.trim();
    let extra = '';
    if (personalEmail.trim()) {
      try {
        await base44.functions.invoke('soporteEmail', {
          subject: 'Tu nueva contraseña del panel de soporte',
          body: `Has cambiado la contraseña del Asistente de Soporte.\n\nNueva contraseña: ${nueva}`,
          to: personalEmail.trim(),
        });
        extra = ` y enviada a ${personalEmail.trim()}`;
      } catch { extra = ' (no se pudo enviar por correo)'; }
    }
    setRecoverMsg(`✅ Contraseña cambiada${extra}. Ya puedes entrar con la nueva.`);
    setChangeMode(false); setNewPwdLogin(''); setPwdInput('');
  };

  const preguntarIA = async () => {
    if (!texto.trim()) return;
    setAsking(true); setIaResp('');
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Eres el asistente técnico de "Gestión Pro Total", un programa de gestión para SAT de climatización, refrigeración, electricidad y solar. El usuario reporta lo siguiente (tipo: ${tipo}):\n\n"${texto}"\n\nSi es un ERROR, explica de forma clara y sencilla posibles causas y cómo solucionarlo o evitarlo (pasos concretos, sin tecnicismos). Si es una nueva función/apartado/documento, resume qué se necesitaría y da una guía práctica de uso mientras tanto. Responde en español, breve y útil.`,
        response_json_schema: { type: 'object', properties: { respuesta: { type: 'string' } } },
      });
      setIaResp(res?.respuesta || 'No he podido generar una respuesta. Intenta reformular tu consulta.');
    } catch {
      setIaResp('⚠ No se pudo consultar a la IA (¿sin conexión?). Puedes enviar tu petición a soporte igualmente.');
    }
    setAsking(false);
  };

  const enviarSoporte = async () => {
    if (!texto.trim()) return;
    setSending(true); setSentMsg('');
    try {
      const pagina = (typeof window !== 'undefined' && window.location?.hash) || '';
      await base44.functions.invoke('soporteEmail', {
        subject: `${tipo === 'error' ? 'ERROR' : 'PETICIÓN'} — ${texto.slice(0, 60)}`,
        body: `Tipo: ${tipo}\nVersión: ${version}\nPágina: ${pagina}\n\nDescripción:\n${texto}\n\n${iaResp ? `Diagnóstico IA:\n${iaResp}` : ''}`,
      });
      setSentMsg('✅ Enviado a soporte. Se aplicará/revisará en la próxima actualización. Gracias.');
      setTexto(''); setIaResp('');
    } catch {
      setSentMsg('⚠ No se pudo enviar. Revisa la conexión e inténtalo de nuevo.');
    }
    setSending(false);
  };

  const cambiarPwd = () => {
    if (newPwd.trim().length < 4) { setPwdChanged('La contraseña debe tener al menos 4 caracteres'); return; }
    try { localStorage.setItem(PWD_KEY, newPwd.trim()); setPwdChanged('✅ Contraseña actualizada'); setNewPwd(''); }
    catch { setPwdChanged('⚠ No se pudo guardar'); }
  };

  // ── Pantalla de contraseña ──────────────────────────────────────────────
  if (!unlocked) {
    return (
      <div className="max-w-md mx-auto py-10 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-blue-600" />Asistente de Soporte IA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-500">Zona protegida. Introduce la contraseña para acceder.</p>
            <Input
              type="password" placeholder="Contraseña" value={pwdInput}
              onChange={(e) => setPwdInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doLogin()}
            />
            {pwdErr && <p className="text-sm text-red-600">{pwdErr}</p>}
            <Button className="w-full" onClick={doLogin}><KeyRound className="w-4 h-4 mr-2" />Entrar</Button>

            <div className="pt-1">
              <Input type="email" placeholder="Tu correo personal (opcional)" value={personalEmail}
                onChange={(e) => setPersonalEmail(e.target.value)} />
              <p className="text-[10px] text-gray-400 mt-1">Se usa para enviarte la contraseña (además del correo de soporte).</p>
            </div>

            <Button variant="outline" className="w-full" onClick={recuperar} disabled={recovering}>
              {recovering ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LifeBuoy className="w-4 h-4 mr-2" />}
              Recuperar contraseña (enviar por correo)
            </Button>

            {!changeMode ? (
              <button onClick={() => { setChangeMode(true); setRecoverMsg(''); }} className="w-full text-xs text-blue-600 underline">
                Cambiar contraseña (sin necesitar la anterior)
              </button>
            ) : (
              <div className="border rounded-lg p-3 space-y-2 bg-slate-50">
                <p className="text-xs font-semibold text-gray-700">Nueva contraseña</p>
                <Input type="text" placeholder="Nueva contraseña" value={newPwdLogin} onChange={(e) => setNewPwdLogin(e.target.value)} />
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={cambiarSinAnterior}>Guardar</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setChangeMode(false); setNewPwdLogin(''); }}>Cancelar</Button>
                </div>
                <p className="text-[10px] text-gray-400">Si pones tu correo personal arriba, te la enviaremos también.</p>
              </div>
            )}
            {recoverMsg && <p className="text-xs text-gray-600">{recoverMsg}</p>}
            <p className="text-[11px] text-gray-400 text-center">Soporte: {SUPPORT_EMAIL}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Panel desbloqueado ──────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-4">
      <div className="flex items-center gap-2">
        <Bot className="w-6 h-6 text-blue-600" />
        <h1 className="text-xl font-bold">Asistente de Soporte IA</h1>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
        <p className="font-semibold mb-1">¿Cómo funciona?</p>
        <p>Cuéntame un <b>error</b> o pídeme una <b>nueva función, apartado o documento</b>. La IA te ayuda a
        resolverlo o a usarlo, y con <b>“Enviar a soporte”</b> tu petición llega al correo del programa para
        implementarla en la <b>siguiente actualización</b> (la app instalada no puede reescribir su propio
        código sola; los cambios llegan por actualización, que se instala sin perder datos).</p>
      </div>

      <Card>
        <CardContent className="space-y-3 pt-4">
          <div className="flex gap-2 flex-wrap">
            {[['error','🐞 Error'],['funcion','✨ Nueva función'],['apartado','🗂️ Nuevo apartado'],['documento','📄 Documento'],['otro','💬 Otro']].map(([k,l]) => (
              <button key={k} onClick={() => setTipo(k)}
                className={`text-xs px-3 py-1.5 rounded-full border ${tipo===k ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}>{l}</button>
            ))}
          </div>
          <Textarea
            placeholder="Describe el error o lo que quieres añadir/cambiar (cuanto más detalle, mejor)…"
            value={texto} onChange={(e) => setTexto(e.target.value)} rows={5}
          />
          <div className="flex gap-2 flex-wrap">
            <Button onClick={preguntarIA} disabled={asking || !texto.trim()} variant="outline" className="gap-2">
              {asking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}Preguntar a la IA
            </Button>
            <Button onClick={enviarSoporte} disabled={sending || !texto.trim()} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}Enviar a soporte
            </Button>
          </div>
          {iaResp && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm whitespace-pre-wrap">{iaResp}</div>
          )}
          {sentMsg && <p className="text-sm text-gray-700">{sentMsg}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><KeyRound className="w-4 h-4" />Cambiar contraseña de acceso</CardTitle></CardHeader>
        <CardContent className="flex gap-2 items-center">
          <Input type="text" placeholder="Nueva contraseña" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} className="max-w-xs" />
          <Button variant="outline" onClick={cambiarPwd}>Guardar</Button>
          {pwdChanged && <span className="text-xs text-gray-600">{pwdChanged}</span>}
        </CardContent>
      </Card>
    </div>
  );
}
