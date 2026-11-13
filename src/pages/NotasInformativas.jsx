import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Sparkles, Loader2, Send, Trash2, Pencil, Mail, Globe, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { cargarTodo } from '@/lib/cargarTodo';
import { consultarIA, ajustesIA } from '@/lib/proveedorIA';
import { elegirPlantillas, textoPlantilla, huecosSinRellenar, urlBusquedaModelo, motivoIA } from '@/lib/plantillasNotas';
import { abrirEnlaceAvisando, enlaceWhatsApp } from '@/lib/abrirEnlace';
import { direccionPublica, AVISO_SIN_DIRECCION } from '@/lib/copiaFirmada';
import { printDocument } from '@/lib/printHelper';
import {
  crearEnvios, enlaceNota, mensajeNota, resumenEnvios, htmlNotaFirmada,
  peticionNotaIA, leerNotaIA, sincronizarFirmadas,
} from '@/lib/notasInformativas';
import FilaEnvio from '@/components/notas/FilaEnvio';
import FirmaNotaDialog from '@/components/notas/FirmaNotaDialog';

const nombreCliente = (c) => `${c.name || ''} ${c.surname || ''}`.trim() || c.company_name || c.full_name || 'Cliente';

export default function NotasInformativas() {
  const [notas, setNotas] = useState([]);
  const [envios, setEnvios] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [empresa, setEmpresa] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [sel, setSel] = useState(null);           // id de la nota abierta
  const [edicion, setEdicion] = useState(null);   // {id?, title, body}
  const [temaIA, setTemaIA] = useState('');
  const [pensando, setPensando] = useState(false);
  const [propuestas, setPropuestas] = useState([]);
  const [audiencia, setAudiencia] = useState('todos');
  const [elegidos, setElegidos] = useState(new Set());
  const [filtro, setFiltro] = useState('');
  const [firmando, setFirmando] = useState(null);
  const [enviandoCorreos, setEnviandoCorreos] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [n, e, c, cs] = await Promise.all([
        cargarTodo('NotaInformativa', '-created_date'), cargarTodo('NotaEnvio', '-created_date'),
        cargarTodo('Contact', 'name'), base44.entities.CompanySettings.list(),
      ]);
      setEmpresa(cs?.[0] || null);
      setClientes(c);
      const nuevas = await sincronizarFirmadas(base44, e);
      const porId = new Map(nuevas.map((x) => [x.id, x]));
      setEnvios(e.map((x) => porId.get(x.id) || x));
      setNotas(n);
      if (nuevas.length) toast.success(`${nuevas.length} nota${nuevas.length === 1 ? '' : 's'} firmada${nuevas.length === 1 ? '' : 's'} desde la última vez: ya están en la ficha de ${nuevas.length === 1 ? 'su cliente' : 'sus clientes'}.`, { duration: 9000 });
    } catch (err) { toast.error(`No se pudieron cargar las notas: ${err?.message || err}`); }
    finally { setCargando(false); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const nota = notas.find((n) => n.id === sel) || null;
  const enviosNota = useMemo(() => envios.filter((e) => e.nota_id === sel), [envios, sel]);
  const base = direccionPublica(empresa);

  const guardarNota = async () => {
    const t = (edicion?.title || '').trim(); const b = (edicion?.body || '').trim();
    if (!t || !b) { toast.error('Escribe el título y el texto de la nota.'); return; }
    const huecos = huecosSinRellenar(b);
    if (huecos.length && !confirm(`Quedan huecos por completar en el texto: ${huecos.slice(0, 4).join(', ')}${huecos.length > 4 ? '…' : ''}\n\n¿Guardar la nota así?`)) return;
    try {
      if (edicion.id) {
        await base44.entities.NotaInformativa.update(edicion.id, { title: t, body: b, made_with_ai: !!edicion.ia });
        if (enviosNota.some((e) => e.nota_id === edicion.id)) toast.info('Los envíos ya hechos conservan el texto que recibió cada cliente.');
      } else {
        const n = await base44.entities.NotaInformativa.create({ title: t, body: b, status: 'borrador', made_with_ai: !!edicion.ia });
        setSel(n.id);
      }
      setEdicion(null); setTemaIA(''); setPropuestas([]);
      await cargar();
    } catch (err) { toast.error(`No se pudo guardar: ${err?.message || err}`); }
  };

  // Siempre salen DOS opciones: un texto estándar de modelo (al instante, sin
  // IA ni internet) y la versión de la IA. Si la IA no responde, el estándar ya
  // está ahí y se explica por qué ha fallado.
  const redactarIA = async () => {
    if (!temaIA.trim()) { toast.error('Cuéntale de qué trata la nota (por ejemplo: cierre por vacaciones).'); return; }
    const estandar = elegirPlantillas(temaIA, 2).map((p) => ({ id: `std-${p.id}`, origen: 'estandar', titulo: p.titulo, cuerpo: textoPlantilla(p, empresa) }));
    setPropuestas([{ id: 'ia', origen: 'ia', cargando: true }, ...estandar]);
    setPensando(true);
    try {
      const r = leerNotaIA(await consultarIA(peticionNotaIA({ tema: temaIA, empresa })));
      if (!r.cuerpo) throw new Error('La IA no ha devuelto texto.');
      setPropuestas((ps) => ps.map((x) => (x.id === 'ia' ? { id: 'ia', origen: 'ia', titulo: r.titulo || temaIA.slice(0, 60), cuerpo: r.cuerpo } : x)));
    } catch (err) {
      const motivo = motivoIA(err, ajustesIA().proveedor);
      setPropuestas((ps) => ps.map((x) => (x.id === 'ia' ? { id: 'ia', origen: 'ia', error: motivo } : x)));
    } finally { setPensando(false); }
  };
  const usarPropuesta = (p) => {
    setEdicion((e) => ({ ...e, title: p.titulo, body: p.cuerpo, ia: p.origen === 'ia' }));
    setPropuestas([]);
    toast.success('Texto puesto en la nota: léelo y cámbiale lo que quieras.');
  };

  const borrarNota = async () => {
    if (!nota || !confirm(`¿Borrar la nota «${nota.title}»? Se quitan los envíos pendientes; los ya firmados se conservan en la ficha de cada cliente.`)) return;
    try {
      await Promise.all(enviosNota.filter((e) => e.status !== 'firmada').map((e) => base44.entities.NotaEnvio.delete(e.id)));
      await base44.entities.NotaInformativa.delete(nota.id);
      setSel(null); await cargar();
    } catch (err) { toast.error(`No se pudo borrar: ${err?.message || err}`); }
  };

  const destinatarios = audiencia === 'todos' ? clientes : clientes.filter((c) => elegidos.has(c.id));
  const nuevosEnvios = nota ? crearEnvios(nota, destinatarios, enviosNota) : [];
  const preparar = async () => {
    if (!nuevosEnvios.length) { toast.info('No hay clientes nuevos a los que preparar la nota.'); return; }
    try {
      await base44.entities.NotaEnvio.bulkCreate(nuevosEnvios);
      await base44.entities.NotaInformativa.update(nota.id, { audience: audiencia, status: 'enviada', sent_date: new Date().toISOString() });
      toast.success(`Preparada para ${nuevosEnvios.length} cliente${nuevosEnvios.length === 1 ? '' : 's'}. Ahora envíala desde la lista.`);
      setElegidos(new Set()); await cargar();
    } catch (err) { toast.error(`No se pudieron preparar los envíos: ${err?.message || err}`); }
  };

  const marcarEnviado = async (e, via) => {
    try { await base44.entities.NotaEnvio.update(e.id, { sent_via: via, sent_date: new Date().toISOString() }); await cargar(); } catch { /* se verá al recargar */ }
  };
  const datosEnvio = (e) => {
    const enlace = enlaceNota(base, e);
    if (!enlace) { toast.error(AVISO_SIN_DIRECCION); return null; }
    return { enlace, ...mensajeNota({ envio: e, empresa, enlace }) };
  };
  const porWhatsApp = (e) => { const d = datosEnvio(e); if (!d) return; abrirEnlaceAvisando(enlaceWhatsApp(e.contact_phone, d.cuerpo), (m) => toast.error(m, { duration: 12000 })); marcarEnviado(e, 'whatsapp'); };
  const porCorreo = (e) => { const d = datosEnvio(e); if (!d) return; abrirEnlaceAvisando(`mailto:${e.contact_email || ''}?subject=${encodeURIComponent(d.asunto)}&body=${encodeURIComponent(d.cuerpo)}`, (m) => toast.error(m, { duration: 12000 })); marcarEnviado(e, 'correo'); };
  const copiar = async (e) => { const d = datosEnvio(e); if (!d) return; try { await navigator.clipboard.writeText(d.enlace); toast.success('Enlace copiado.'); } catch { toast.info(d.enlace, { duration: 15000 }); } };
  const imprimir = (e) => printDocument(htmlNotaFirmada({ envio: e, empresa }), `Nota informativa - ${e.contact_name}`);

  const correosMasivos = async () => {
    const lista = enviosNota.filter((e) => e.status !== 'firmada' && /@/.test(e.contact_email || ''));
    if (!lista.length) { toast.info('No hay pendientes con correo.'); return; }
    if (!confirm(`¿Enviar la nota por correo a ${lista.length} cliente${lista.length === 1 ? '' : 's'}?`)) return;
    setEnviandoCorreos(true);
    try {
      const envs = lista.map((e) => { const d = datosEnvio(e); return d && { id: e.id, to: e.contact_email, subject: d.asunto, texto: d.texto, enlace: d.enlace }; }).filter(Boolean);
      if (!envs.length) return;
      const r = await base44.functions.invoke('enviarNotaInformativa', { envios: envs });
      const res = r?.data?.resultados || [];
      await Promise.all(res.filter((x) => x.ok).map((x) => base44.entities.NotaEnvio.update(x.id, { sent_via: 'correo', sent_date: new Date().toISOString() }).catch(() => {})));
      const ok = res.filter((x) => x.ok).length;
      toast[ok === res.length ? 'success' : 'warning'](`Correos enviados: ${ok} de ${res.length}.`);
      await cargar();
    } catch (err) { toast.error(`No se pudieron enviar los correos: ${err?.message || err}`, { duration: 10000 }); }
    finally { setEnviandoCorreos(false); }
  };

  const visibles = clientes.filter((c) => nombreCliente(c).toLowerCase().includes(filtro.toLowerCase()));
  const res = resumenEnvios(enviosNota);

  if (cargando) return <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-3 sm:p-5" data-testid="notas-informativas">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="flex-1 text-xl font-bold">Notas informativas a clientes</h1>
        <Button onClick={() => setEdicion({ title: '', body: '' })} className="gap-1" data-testid="nueva-nota"><Plus className="h-4 w-4" />Nueva nota</Button>
      </div>
      <p className="text-sm text-muted-foreground">Escribe la nota (o pídele a la IA un borrador), elige a quién va y mándala. Cuando el cliente la firma queda archivada en su ficha, con fecha, y se puede imprimir.</p>

      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        <div className="rounded-lg border bg-card" data-testid="lista-notas">
          {notas.length === 0 && <p className="p-4 text-sm text-muted-foreground">Aún no hay notas.</p>}
          {notas.map((n) => {
            const r = resumenEnvios(envios.filter((e) => e.nota_id === n.id));
            return (
              <button key={n.id} type="button" onClick={() => setSel(n.id)} data-nota={n.id}
                className={`block w-full border-b px-3 py-2 text-left last:border-0 hover:bg-accent ${sel === n.id ? 'bg-accent' : ''}`}>
                <span className="block truncate text-sm font-semibold">{n.title}</span>
                <span className="text-xs text-muted-foreground">{r.total ? `${r.firmadas}/${r.total} firmadas` : 'Borrador'}</span>
              </button>
            );
          })}
        </div>

        {!nota ? <p className="rounded-lg border p-6 text-sm text-muted-foreground">Elige una nota de la lista o crea una nueva.</p> : (
          <div className="space-y-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-start gap-2">
                <h2 className="flex-1 text-lg font-semibold">{nota.title}</h2>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => setEdicion({ id: nota.id, title: nota.title, body: nota.body })}><Pencil className="h-4 w-4" />Editar</Button>
                <Button size="sm" variant="outline" className="gap-1 text-red-700" onClick={borrarNota}><Trash2 className="h-4 w-4" />Borrar</Button>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{nota.body}</p>
            </div>

            <div className="rounded-lg border bg-card p-4 space-y-3">
              <h3 className="font-semibold">¿A quién se manda?</h3>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2"><input type="radio" checked={audiencia === 'todos'} onChange={() => setAudiencia('todos')} />A todos los clientes ({clientes.length})</label>
                <label className="flex items-center gap-2"><input type="radio" checked={audiencia === 'seleccionados'} onChange={() => setAudiencia('seleccionados')} />Solo a los que elija</label>
              </div>
              {audiencia === 'seleccionados' && (
                <div className="space-y-2">
                  <Input placeholder="Buscar cliente…" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
                  <div className="max-h-56 overflow-auto rounded border">
                    {visibles.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 border-b px-3 py-1.5 text-sm last:border-0">
                        <Checkbox checked={elegidos.has(c.id)} onCheckedChange={(v) => setElegidos((p) => { const s = new Set(p); if (v) s.add(c.id); else s.delete(c.id); return s; })} />
                        {nombreCliente(c)}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <Button onClick={preparar} disabled={!nuevosEnvios.length} className="gap-1" data-testid="preparar-envios"><Send className="h-4 w-4" />Preparar para {nuevosEnvios.length} cliente{nuevosEnvios.length === 1 ? '' : 's'}</Button>
            </div>

            {enviosNota.length > 0 && (
              <div className="rounded-lg border bg-card">
                <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
                  <p className="flex-1 text-sm font-semibold">{res.firmadas} firmadas · {res.pendientes} pendientes</p>
                  <Button size="sm" variant="outline" className="gap-1" disabled={enviandoCorreos || !res.pendientes} onClick={correosMasivos}>
                    {enviandoCorreos ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}Enviar por correo a los pendientes
                  </Button>
                </div>
                {enviosNota.map((e) => <FilaEnvio key={e.id} envio={e} onWhatsApp={porWhatsApp} onCorreo={porCorreo} onCopiar={copiar} onFirmar={setFirmando} onImprimir={imprimir} />)}
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={!!edicion} onOpenChange={(o) => { if (!o) setEdicion(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{edicion?.id ? 'Editar nota' : 'Nueva nota'}</DialogTitle></DialogHeader>
          {edicion && (
            <div className="space-y-3">
              <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
                <p className="text-sm font-medium">Pídele a la IA que la redacte</p>
                <Textarea rows={2} value={temaIA} onChange={(e) => setTemaIA(e.target.value)} placeholder="Ej.: avisar de que cerramos del 10 al 24 de agosto y de cómo pedir urgencias" />
                <Button size="sm" variant="outline" className="gap-1" disabled={pensando} onClick={redactarIA} data-testid="redactar-ia">
                  {pensando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Redactar (IA + modelo estándar)
                </Button>
                <Button size="sm" variant="ghost" className="ml-2 gap-1" onClick={() => abrirEnlaceAvisando(urlBusquedaModelo(temaIA), (m) => toast.error(m, { duration: 10000 }))} data-testid="buscar-internet">
                  <Globe className="h-4 w-4" />Ver modelos en internet
                </Button>
                {propuestas.length > 0 && (
                  <div className="space-y-2 pt-1" data-testid="propuestas">
                    {propuestas.map((p) => (
                      <div key={p.id} className="rounded-md border bg-background p-2 text-sm" data-propuesta={p.origen}>
                        <p className="mb-1 flex items-center gap-1 font-medium">
                          {p.origen === 'ia' ? <Sparkles className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                          {p.origen === 'ia' ? 'Versión de la IA' : `Modelo estándar: ${p.titulo}`}
                        </p>
                        {p.cargando && <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />La IA está redactando…</p>}
                        {p.error && <p className="text-amber-700">La IA no ha podido: {p.error} Usa el modelo estándar de abajo o configura la IA en Ajustes de IA.</p>}
                        {p.cuerpo && <>
                          <p className="line-clamp-4 whitespace-pre-wrap text-muted-foreground">{p.cuerpo}</p>
                          <Button size="sm" variant="outline" className="mt-1" onClick={() => usarPropuesta(p)} data-testid={`usar-${p.origen}`}>Usar este texto</Button>
                        </>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Input placeholder="Título de la nota" value={edicion.title} onChange={(e) => setEdicion({ ...edicion, title: e.target.value })} data-testid="nota-titulo" />
              <Textarea rows={10} placeholder="Texto de la nota (separa los párrafos con una línea en blanco)" value={edicion.body} onChange={(e) => setEdicion({ ...edicion, body: e.target.value })} data-testid="nota-texto" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEdicion(null)}>Cancelar</Button>
                <Button onClick={guardarNota} data-testid="guardar-nota">Guardar nota</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <FirmaNotaDialog envio={firmando} onCerrar={() => setFirmando(null)} onFirmada={cargar} />
    </div>
  );
}
