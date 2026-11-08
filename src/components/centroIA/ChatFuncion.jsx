import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Send, Loader2, Sparkles, FlaskConical, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import catalogo from '@/lib/iaModulos/catalogoEntidades.json';
import { construirSistema, recortarHistorial } from '@/lib/iaModulos/promptIA';
import { extraerRespuesta, validarModulo, validarSkill, validarPeticion } from '@/lib/iaModulos/modulo';
import { conversar, iaLista } from '@/lib/iaModulos/iaCentro';
import { describePermiso } from '@/lib/iaModulos/permisos';
import { crear, editar, avisarCambios } from '@/lib/iaModulos/datos';
import SandboxModulo from './SandboxModulo';
import PermisosDialog from './PermisosDialog';

const EJEMPLOS = [
  'Un listado de clientes con su teléfono y un botón para llamar',
  'Una pantalla que me diga qué contratos caducan este mes',
  'Una calculadora de precio por metro de tubería de cobre con mi margen',
  'Quiero que las facturas lleven un campo nuevo «referencia de obra» (cambio en el programa)'
];

function Propuesta({ p, onGuardar, guardado, conectores }) {
  const [probar, setProbar] = useState(false);
  const [registro, setRegistro] = useState([]);
  if (p.error) return <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{p.error}</div>;
  if (p.tipo === 'modulo') {
    return (
      <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm" data-prueba="propuesta-modulo">
        <div className="font-semibold">Módulo: {p.modulo.nombre}</div>
        <div className="text-slate-600">{p.modulo.descripcion}</div>
        <ul className="mt-2 list-disc pl-5 text-xs text-slate-700">
          {p.modulo.permisos.length ? p.modulo.permisos.map((x) => <li key={x}>{describePermiso(x)}</li>) : <li>No pide acceso a datos.</li>}
        </ul>
        {p.avisos?.map((a) => <div key={a} className="mt-1 text-xs text-amber-700">{a}</div>)}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setProbar((v) => !v)} data-prueba="probar-modulo"><FlaskConical className="mr-1 h-4 w-4" />{probar ? 'Ocultar prueba' : 'Probar antes de guardar'}</Button>
          <Button size="sm" disabled={guardado} onClick={onGuardar} data-prueba="guardar-modulo">{guardado ? <><Check className="mr-1 h-4 w-4" />Guardado</> : 'Guardar y activar'}</Button>
        </div>
        {probar && (
          <div className="mt-3">
            <div className="mb-1 text-xs text-slate-600">Modo prueba: lee tus datos reales, pero no escribe ni envía nada de verdad.</div>
            <SandboxModulo modulo={p.modulo} concedidos={p.modulo.permisos} conectores={conectores} modoPrueba onRegistro={(t) => setRegistro((r) => [...r, t])} />
            {registro.length > 0 && <div className="mt-1 text-xs text-slate-600">{registro.slice(-5).map((r, i) => <div key={i}>{r}</div>)}</div>}
          </div>
        )}
      </div>
    );
  }
  if (p.tipo === 'skill') {
    return (
      <div className="mt-2 rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm" data-prueba="propuesta-skill">
        <div className="font-semibold">Skill: {p.skill.nombre}</div>
        <div className="text-slate-600">{p.skill.descripcion}</div>
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-white p-2 text-xs">{p.skill.instrucciones}</pre>
        <Button size="sm" className="mt-3" disabled={guardado} onClick={onGuardar} data-prueba="guardar-skill">{guardado ? 'Guardada' : 'Guardar skill'}</Button>
      </div>
    );
  }
  return (
    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm" data-prueba="propuesta-peticion">
      <div className="font-semibold">Petición de cambio en el programa: {p.peticion.titulo}</div>
      <div className="mt-1 whitespace-pre-wrap text-slate-700">{p.peticion.detalle}</div>
      <div className="mt-2 text-xs text-slate-600">Esto exige cambiar el código del programa. Se guarda en «Peticiones» para que Claude Code o un programador la implemente.</div>
      <Button size="sm" className="mt-3" disabled={guardado} onClick={onGuardar} data-prueba="guardar-peticion">{guardado ? 'Guardada' : 'Guardar petición'}</Button>
    </div>
  );
}

export default function ChatFuncion({ skills, conectores, moduloEditando, onTerminarEdicion, onCambios }) {
  const [mensajes, setMensajes] = useState([]); // {rol:'user'|'assistant', texto, propuesta?, guardado?}
  const [texto, setTexto] = useState('');
  const [cargando, setCargando] = useState(false);
  const [confirmar, setConfirmar] = useState(null); // índice del mensaje a activar
  const fin = useRef(null);

  useEffect(() => { fin.current?.scrollIntoView?.({ block: 'end' }); }, [mensajes, cargando]);
  useEffect(() => { if (moduloEditando) setMensajes([]); }, [moduloEditando?.id]);

  const enviar = async (t = texto) => {
    const limpio = t.trim();
    if (!limpio || cargando) return;
    if (!iaLista()) { toast.error('Primero elige la IA en «Ajustes de IA».'); return; }
    const nuevos = [...mensajes, { rol: 'user', texto: limpio }];
    setMensajes(nuevos); setTexto(''); setCargando(true);
    try {
      const historial = recortarHistorial(nuevos.map((m) => ({ role: m.rol, content: m.raw || m.texto })));
      const sistema = construirSistema({ catalogo, skills, conectores: conectores.filter((c) => c.activo !== false), modulo: moduloEditando });
      const bruto = await conversar({ system: sistema, messages: historial });
      const r = extraerRespuesta(bruto);
      let propuesta = null;
      if (r.error) propuesta = { error: r.error };
      else if (r.tipo === 'modulo') { const v = validarModulo(r.datos); propuesta = v.ok ? { tipo: 'modulo', modulo: v.modulo, avisos: v.avisos } : { error: v.errores.join(' ') }; }
      else if (r.tipo === 'skill') { const v = validarSkill(r.datos); propuesta = v.ok ? { tipo: 'skill', skill: v.skill } : { error: v.errores.join(' ') }; }
      else if (r.tipo === 'peticion_cambio') { const v = validarPeticion(r.datos); propuesta = v.ok ? { tipo: 'peticion', peticion: v.peticion } : { error: v.errores.join(' ') }; }
      setMensajes((m) => [...m, { rol: 'assistant', texto: r.texto || (propuesta && !propuesta.error ? 'Esto es lo que te propongo:' : ''), raw: bruto, propuesta }]);
    } catch (e) {
      setMensajes((m) => [...m, { rol: 'assistant', texto: String(e.message || e), fallo: true }]);
    } finally { setCargando(false); }
  };

  const marcar = (i) => setMensajes((m) => m.map((x, j) => (j === i ? { ...x, guardado: true } : x)));

  const guardar = async (i) => {
    const msg = mensajes[i]; const p = msg.propuesta;
    try {
      if (p.tipo === 'skill') { await crear('SkillIA', { ...p.skill, activo: true }); toast.success('Skill guardada y activa'); marcar(i); onCambios?.(); }
      else if (p.tipo === 'peticion') { await crear('PeticionCambioIA', { ...p.peticion, estado: 'pendiente' }); toast.success('Petición guardada'); marcar(i); onCambios?.(); }
      else if (p.tipo === 'modulo') setConfirmar(i);
    } catch (e) { toast.error('No se pudo guardar: ' + (e.message || e)); }
  };

  const activarModulo = async () => {
    const i = confirmar; const p = mensajes[i].propuesta;
    const ultima = [...mensajes.slice(0, i)].reverse().find((x) => x.rol === 'user')?.texto || '';
    setConfirmar(null);
    try {
      const datos = { ...p.modulo, permisos_concedidos: p.modulo.permisos, activo: true };
      if (moduloEditando && moduloEditando.nombre === p.modulo.nombre) {
        await editar('ModuloIA', moduloEditando.id, { ...datos, version: (moduloEditando.version || 1) + 1 });
        toast.success('Módulo actualizado');
      } else {
        await crear('ModuloIA', { ...datos, origen: 'ia', version: 1, peticion_original: ultima.slice(0, 2000) });
        toast.success('Módulo guardado. Ya está en el menú «Mis módulos».');
      }
      marcar(i); avisarCambios(); onCambios?.();
    } catch (e) { toast.error('No se pudo guardar el módulo: ' + (e.message || e)); }
  };

  return (
    <div className="space-y-3">
      {moduloEditando && (
        <div className="flex items-center justify-between rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm">
          <span>Mejorando el módulo <b>{moduloEditando.nombre}</b>. Dile qué quieres cambiar.</span>
          <Button size="sm" variant="outline" onClick={onTerminarEdicion}>Dejar de editar</Button>
        </div>
      )}
      <div className="min-h-[260px] max-h-[60vh] space-y-3 overflow-auto rounded-lg border bg-white p-3" data-prueba="chat-mensajes">
        {!mensajes.length && (
          <div className="text-sm text-slate-600">
            <div className="mb-2 flex items-center gap-2 font-medium text-slate-800"><Sparkles className="h-4 w-4 text-violet-600" />Pídele a la IA la función que necesitas</div>
            <p className="mb-2">Describe lo que quieres con tus palabras. La IA crea una pantalla nueva dentro del programa (te la deja probar antes de guardarla) o, si hace falta cambiar el propio programa, guarda una petición para implementarla en el código.</p>
            <div className="flex flex-wrap gap-2">
              {EJEMPLOS.map((e) => <button key={e} type="button" className="rounded-full border px-3 py-1 text-xs hover:bg-slate-50" onClick={() => setTexto(e)}>{e}</button>)}
            </div>
          </div>
        )}
        {mensajes.map((m, i) => (
          <div key={i} className={m.rol === 'user' ? 'text-right' : ''}>
            <div className={`inline-block max-w-full rounded-lg px-3 py-2 text-left text-sm ${m.rol === 'user' ? 'bg-slate-800 text-white' : m.fallo ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-800'}`} style={{ whiteSpace: 'pre-wrap' }}>
              {m.texto}
            </div>
            {m.propuesta && <Propuesta p={m.propuesta} guardado={m.guardado} onGuardar={() => guardar(i)} conectores={conectores} />}
          </div>
        ))}
        {cargando && <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />La IA está trabajando… con un modelo local puede tardar varios minutos.</div>}
        <div ref={fin} />
      </div>
      <div className="flex gap-2">
        <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} placeholder="Ej.: quiero una pantalla con los avisos pendientes de cada técnico…" data-prueba="chat-entrada"
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); enviar(); } }} />
        <Button onClick={() => enviar()} disabled={cargando || !texto.trim()} data-prueba="chat-enviar" className="self-end"><Send className="mr-1 h-4 w-4" />Enviar</Button>
      </div>
      <PermisosDialog abierto={confirmar !== null} modulo={confirmar !== null ? mensajes[confirmar]?.propuesta?.modulo : null}
        permisos={confirmar !== null ? mensajes[confirmar]?.propuesta?.modulo?.permisos || [] : []}
        onCancelar={() => setConfirmar(null)} onAceptar={activarModulo} />
    </div>
  );
}
