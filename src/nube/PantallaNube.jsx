import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { HardDrive, Cloud, Server, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { leerConfig, guardarConfig, borrarConfig, escucharConfig, leerSesion } from './config';
import { iniciarSesion, registrarse, hayQueEntrar } from './autenticacion';
import { vaciarCache } from './entidad';

const estado = () => JSON.stringify([leerConfig(), !!leerSesion()?.token]);
const useEstado = () => useSyncExternalStore((f) => {
  const a = escucharConfig(f);
  const b = (e) => { if (e.key && e.key.startsWith('gpt_')) f(); };
  window.addEventListener('storage', b);
  const t = setInterval(f, 800);
  return () => { a(); window.removeEventListener('storage', b); clearInterval(t); };
}, estado);

const Campo = ({ etiqueta, ...p }) => (
  <label className="block text-sm">
    <span className="text-muted-foreground">{etiqueta}</span>
    <input {...p} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring" />
  </label>
);

const Caja = ({ children, titulo, sub }) => (
  <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center p-4">
    <div className="w-full max-w-xl rounded-2xl border bg-card p-6 shadow-lg">
      <h1 className="text-2xl font-bold">{titulo}</h1>
      {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      <div className="mt-5">{children}</div>
    </div>
  </div>
);

async function probar(modo, url, clave) {
  if (modo === 'servidor') {
    const r = await fetch(`${url}/api/estado`).catch(() => null);
    if (!r?.ok) throw new Error('No se alcanza el servidor. Revisa la dirección y que esté arrancado.');
    return r.json();
  }
  const r = await fetch(`${url}/rest/v1/registros?select=id&limit=1`, { headers: { apikey: clave, Authorization: `Bearer ${clave}` } }).catch(() => null);
  if (!r) throw new Error('No se alcanza Supabase. Revisa la dirección del proyecto.');
  if (r.status === 404) throw new Error('Falta crear la tabla «registros»: ejecuta supabase/esquema.sql en el editor SQL de Supabase.');
  if (r.status === 401 && !(await r.text()).includes('JWT')) return { ok: true };
  if (r.status === 401) throw new Error('La clave «anon» no es válida.');
  return { ok: true };
}

function Elegir() {
  const [modo, setModo] = useState(null);
  const [url, setUrl] = useState(typeof window !== 'undefined' && /^https?:/.test(window.location.origin) && !/localhost|capacitor/.test(window.location.hostname) ? window.location.origin : '');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const seguir = async () => {
    setError('');
    if (modo === 'local') { guardarConfig({ modo }); vaciarCache(); return; }
    setCargando(true);
    try {
      await probar(modo, url.trim().replace(/\/+$/, ''), clave.trim());
      guardarConfig({ modo, url, clave });
      vaciarCache();
    } catch (e) { setError(e.message); } finally { setCargando(false); }
  };

  if (!modo) {
    const op = [
      ['local', HardDrive, 'Solo en este dispositivo', 'Sin cuentas ni servidor. Los datos se quedan en este ordenador, móvil o tablet. Lo más sencillo.'],
      ['supabase', Cloud, 'Supabase (nube)', 'Tus datos en tu propio proyecto de Supabase, compartidos entre ordenador, móvil y tablet.'],
      ['servidor', Server, 'Servidor propio', 'Un pequeño servidor que instalas tú (incluido) y al que se conectan todos tus aparatos.'],
    ];
    return (
      <Caja titulo="Gestión Pro Total" sub="¿Dónde quieres guardar los datos? Podrás cambiarlo después y pasar tus datos con la copia de seguridad.">
        <div className="space-y-3">
          {op.map(([id, Icono, t, d]) => (
            <button key={id} onClick={() => setModo(id)} data-prueba={`modo-${id}`} className="flex w-full items-start gap-3 rounded-xl border p-4 text-left transition hover:border-primary hover:bg-accent">
              <Icono className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
              <span><span className="block font-semibold">{t}</span><span className="text-sm text-muted-foreground">{d}</span></span>
            </button>
          ))}
        </div>
      </Caja>
    );
  }
  return (
    <Caja titulo={modo === 'local' ? 'Solo en este dispositivo' : modo === 'supabase' ? 'Conectar con Supabase' : 'Conectar con tu servidor'}>
      {modo === 'local' && <p className="text-sm text-muted-foreground">Los datos se guardan en este aparato. Haz copias de seguridad con regularidad desde «Copia de seguridad».</p>}
      {modo === 'servidor' && <div className="space-y-3"><Campo etiqueta="Dirección del servidor (por ejemplo http://192.168.1.20:8787)" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://…" data-prueba="url" /></div>}
      {modo === 'supabase' && (
        <div className="space-y-3">
          <Campo etiqueta="URL del proyecto (https://xxxx.supabase.co)" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…supabase.co" data-prueba="url" />
          <Campo etiqueta="Clave pública «anon»" value={clave} onChange={(e) => setClave(e.target.value)} data-prueba="clave" />
          <p className="text-xs text-muted-foreground">Antes, ejecuta el archivo <b>supabase/esquema.sql</b> en el editor SQL de tu proyecto.</p>
        </div>
      )}
      {error && <p className="mt-3 rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
      <div className="mt-5 flex justify-between">
        <button onClick={() => { setModo(null); setError(''); }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Atrás</button>
        <button onClick={seguir} disabled={cargando} data-prueba="seguir" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-60">
          {cargando && <Loader2 className="h-4 w-4 animate-spin" />}{modo === 'local' ? 'Empezar' : 'Probar y guardar'}
        </button>
      </div>
    </Caja>
  );
}

function Entrar() {
  const [nuevo, setNuevo] = useState(false);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const enviar = async (ev) => {
    ev.preventDefault();
    setError(''); setCargando(true);
    try {
      if (nuevo) await registrarse(email.trim(), pass, nombre.trim()); else await iniciarSesion(email.trim(), pass);
      vaciarCache();
    } catch (e) { setError(e.message); } finally { setCargando(false); }
  };
  return (
    <Caja titulo={nuevo ? 'Crear cuenta' : 'Entrar'} sub={nuevo ? 'El servidor ya trae su cuenta de administrador; las demás las crea ella.' : 'Administrador de serie: kairigardia.gestionprototal@gmail.com (la clave inicial está en ADMIN-CLAVE.txt, en la carpeta de datos del servidor).'}>
      <form onSubmit={enviar} className="space-y-3">
        {nuevo && <Campo etiqueta="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />}
        <Campo etiqueta="Correo" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" data-prueba="email" />
        <Campo etiqueta="Contraseña (mínimo 8 caracteres)" type="password" required minLength={8} value={pass} onChange={(e) => setPass(e.target.value)} autoComplete={nuevo ? 'new-password' : 'current-password'} data-prueba="pass" />
        {error && <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
        <button disabled={cargando} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-60" data-prueba="entrar">
          {cargando && <Loader2 className="h-4 w-4 animate-spin" />}<ShieldCheck className="h-4 w-4" />{nuevo ? 'Crear cuenta' : 'Entrar'}
        </button>
      </form>
      <div className="mt-4 flex justify-between text-sm">
        <button onClick={() => setNuevo(!nuevo)} className="text-primary hover:underline">{nuevo ? 'Ya tengo cuenta' : 'Crear una cuenta'}</button>
        <button onClick={() => { borrarConfig(); window.location.reload(); }} className="text-muted-foreground hover:underline">Cambiar dónde se guardan los datos</button>
      </div>
    </Caja>
  );
}

/** Rodea a la app: pide elegir almacén la primera vez y entrar si hace falta. */
export default function PantallaNube({ children }) {
  useEstado();
  const [, forzar] = useState(0);
  useEffect(() => escucharConfig(() => forzar((n) => n + 1)), []);
  if (!leerConfig()) return <Elegir />;
  if (hayQueEntrar()) return <Entrar />;
  return children;
}
