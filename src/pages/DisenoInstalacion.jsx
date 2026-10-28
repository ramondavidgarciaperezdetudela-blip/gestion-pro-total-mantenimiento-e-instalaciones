import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  PenLine, Trash2, Move, Ruler, Type, Zap, Snowflake, Save, Printer, FileDown,
  Sparkles, Search, Grid3x3, Loader2, AlertTriangle, Package, Link2, FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import NavBar from '@/components/NavBar';
import BuscadorCliente from '@/components/BuscadorCliente';
import LienzoInstalacion from '@/components/LienzoInstalacion';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { porFamilias, elemento, buscar as buscarEnCatalogo, valoresPorDefecto } from '@/lib/instalacionCatalogo';
import {
  sugerirDiametros, sugerirSeccion, presupuestoAproximado,
  TIPOS_CONEXION_ELECTRICA, BUSES_COMUNICACION, DIAMETROS,
} from '@/lib/instalacionCalculos';
import { imprimirPantalla } from '@/lib/printHelper';
import { esIAApagada } from '@/lib/modoSinIA';
import { uploadImage } from '@/lib/uploadImage';
import { useParametrosUrl } from '@/lib/parametrosUrl';

/**
 * DisenoInstalacion — dibujar la instalación, calcularla y presupuestarla.
 *
 * Lo que resuelve, y que antes había que hacer en tres sitios distintos:
 * dibujar el local tal y como es (con sus pilares y sus entrantes, no un
 * rectángulo), colocar las máquinas y la aparamenta, tirar las tuberías y las
 * líneas eléctricas sabiendo qué diámetro y qué sección piden, y sacar de ahí
 * una cifra aproximada para hablar con el cliente.
 *
 * El plano se guarda en la ficha del cliente, así que al volver a la obra está
 * donde tiene que estar.
 */

const HERRAMIENTAS = [
  { id: 'pared', nombre: 'Pared', icono: PenLine, ayuda: 'Pulsa tramo a tramo. Doble clic o Escape para terminar.' },
  { id: 'equipo', nombre: 'Equipo', icono: Package, ayuda: 'Elige antes un elemento del catálogo y pulsa en el plano.' },
  { id: 'tuberia', nombre: 'Tubería', icono: Snowflake, ayuda: 'Pulsa un equipo y luego el otro: se une y se cierra sola. Para llevarla por donde quieras, pulsa los codos por el camino.' },
  { id: 'electrico', nombre: 'Eléctrico', icono: Zap, ayuda: 'Igual que la tubería, pero línea eléctrica: de cuadro a equipo, o entre equipos.' },
  { id: 'cota', nombre: 'Cota', icono: Ruler, ayuda: 'Dos puntos y te escribe la distancia.' },
  { id: 'texto', nombre: 'Nota', icono: Type, ayuda: 'Una aclaración escrita sobre el plano.' },
  { id: 'mover', nombre: 'Mover', icono: Move, ayuda: 'Arrastra los equipos a su sitio.' },
  { id: 'borrar', nombre: 'Borrar', icono: Trash2, ayuda: 'Pulsa encima de lo que sobre.' },
];

const PLANO_VACIO = {
  paredes: [], elementos: [], tuberias: [], lineasElectricas: [], cotas: [], textos: [],
};

const CLAVE_BORRADOR = 'gpt:plano-instalacion:borrador';

export default function DisenoInstalacion() {
  const [plano, setPlano] = useState(PLANO_VACIO);
  const [herramienta, setHerramienta] = useState('pared');
  const [elementoElegido, setElementoElegido] = useState('unidad_condensadora');
  const [seleccionado, setSeleccionado] = useState(null);
  const [filtro, setFiltro] = useState('');
  const [verRejilla, setVerRejilla] = useState(true);
  const [ajustar, setAjustar] = useState(true);
  const [contactos, setContactos] = useState([]);
  const [cliente, setCliente] = useState('');
  const [titulo, setTitulo] = useState('Plano de instalación');
  const [guardando, setGuardando] = useState(false);
  const [tarifas, setTarifas] = useState([]);
  const [presupuestoIA, setPresupuestoIA] = useState('');
  const [pensando, setPensando] = useState(false);
  const [guardados, setGuardados] = useState([]);
  const [editando, setEditando] = useState('');     // id del plano abierto, si se reabrió uno
  const zonaImprimible = useRef(null);
  const { doc: docUrl, id: clienteUrl } = useParametrosUrl();

  /* ── Datos de apoyo ── */
  useEffect(() => {
    let vivo = true;
    base44.entities.Contact.list('name', 500).then((l) => vivo && setContactos(l || [])).catch(() => {});
    base44.entities.PriceItem.list().then((l) => vivo && setTarifas(l || [])).catch(() => {});
    return () => { vivo = false; };
  }, []);

  useEffect(() => { if (clienteUrl) setCliente(clienteUrl); }, [clienteUrl]);

  /* ── Planos ya guardados de este cliente, para poder reabrirlos ── */
  useEffect(() => {
    if (!cliente) { setGuardados([]); return; }
    let vivo = true;
    base44.entities.ClientDocument.filter({ contact_id: cliente, doc_type: 'plano_instalacion' })
      .then((l) => vivo && setGuardados(l || [])).catch(() => {});
    return () => { vivo = false; };
  }, [cliente]);

  /** Reabre un plano guardado: el dibujo entero viaja en la descripción. */
  const abrirGuardado = useCallback(async (doc) => {
    try {
      const d = JSON.parse(doc.description || '{}');
      if (!d?.plano) throw new Error('sin dibujo');
      setPlano({ ...PLANO_VACIO, ...d.plano });
      setTitulo(doc.title || 'Plano de instalación');
      setCliente(doc.contact_id || '');
      setEditando(doc.id);
      setSeleccionado(null);
      toast.success('Plano abierto. Al guardar se actualiza este mismo.');
    } catch {
      toast.error('Este documento no trae el dibujo: solo la imagen.');
    }
  }, []);

  useEffect(() => {
    if (!docUrl) return;
    base44.entities.ClientDocument.filter({ id: docUrl })
      .then((l) => { if (l?.[0]) abrirGuardado(l[0]); })
      .catch(() => toast.error('No se ha podido abrir ese plano.'));
  }, [docUrl, abrirGuardado]);

  /* ── Borrador: que no se pierda el trabajo al salir sin querer ── */
  useEffect(() => {
    try {
      const g = localStorage.getItem(CLAVE_BORRADOR);
      if (g) {
        const d = JSON.parse(g);
        if (d?.plano) { setPlano(d.plano); setTitulo(d.titulo || 'Plano de instalación'); setCliente(d.cliente || ''); }
      }
    } catch { /* sin almacenamiento */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(CLAVE_BORRADOR, JSON.stringify({ plano, titulo, cliente })); } catch { /* da igual */ }
  }, [plano, titulo, cliente]);

  /* ── Catálogo filtrado ── */
  const familias = useMemo(() => {
    if (!filtro.trim()) return porFamilias();
    const encontrados = new Set(buscarEnCatalogo(filtro).map((e) => e.id));
    return porFamilias()
      .map((f) => ({ ...f, elementos: f.elementos.filter((e) => encontrados.has(e.id)) }))
      .filter((f) => f.elementos.length > 0);
  }, [filtro]);

  /* ── Lo seleccionado, para el panel de la derecha ── */
  const sel = useMemo(() => {
    if (!seleccionado) return null;
    const { clase, id } = seleccionado;
    if (clase === 'elemento') return { clase, dato: (plano.elementos || []).find((e) => e.id === id) };
    if (clase === 'tuberia') return { clase, dato: (plano.tuberias || []).find((t) => t.id === id) };
    if (clase === 'electrico') return { clase, dato: (plano.lineasElectricas || []).find((l) => l.id === id) };
    return null;
  }, [seleccionado, plano]);

  const cambiarSeleccionado = (cambios) => {
    if (!sel?.dato) return;
    const lista = sel.clase === 'elemento' ? 'elementos' : sel.clase === 'tuberia' ? 'tuberias' : 'lineasElectricas';
    setPlano((p) => ({
      ...p,
      [lista]: p[lista].map((x) => (x.id === sel.dato.id ? { ...x, ...cambios } : x)),
    }));
  };

  /* ── Precio propio si lo hay ── */
  const precioDe = useCallback((idElemento) => {
    const def = elemento(idElemento);
    if (!def) return null;
    const t = tarifas.find((x) => `${x.name || ''} ${x.description || ''}`.toLowerCase().includes(def.nombre.toLowerCase()));
    return t?.unit_price ?? t?.price ?? null;
  }, [tarifas]);

  const presupuesto = useMemo(() => presupuestoAproximado(plano, precioDe), [plano, precioDe]);

  const cuantos = (plano.elementos?.length || 0) + (plano.tuberias?.length || 0) + (plano.lineasElectricas?.length || 0);

  /* ── Guardar en la ficha del cliente ── */
  const guardar = async () => {
    if (!cliente) { toast.error('Elige antes a qué cliente pertenece este plano.'); return; }
    setGuardando(true);
    try {
      // La imagen va a la nube como cualquier otra foto del programa (y si la
      // nube falla, uploadImage ya devuelve una copia comprimida). Así el
      // campo del documento no carga con medio megabyte de base64.
      let imagen = '';
      const lienzo = document.querySelector('[data-prueba="lienzo-instalacion"]');
      if (lienzo?.toBlob) {
        const blob = await new Promise((r) => lienzo.toBlob(r, 'image/png'));
        if (blob) {
          const fichero = new File([blob], `${(titulo || 'plano').replace(/[^\w-]+/g, '_')}.png`, { type: 'image/png' });
          imagen = await uploadImage(fichero).catch(() => '');
        }
      }
      const c = contactos.find((x) => x.id === cliente);
      const datos = {
        contact_id: cliente,
        contact_name: c?.company_name || c?.name || '',
        title: titulo || 'Plano de instalación',
        doc_type: 'plano_instalacion',
        file_url: imagen,
        // El plano entero va en la descripción: así se puede volver a abrir y
        // seguir editando, no solo mirar la foto.
        description: JSON.stringify({ plano, presupuesto: { total: presupuesto.total }, version: 1 }),
        date: new Date().toISOString().slice(0, 10),
      };
      if (editando) {
        await base44.entities.ClientDocument.update(editando, datos);
        toast.success('Plano actualizado en la ficha del cliente');
      } else {
        const creado = await base44.entities.ClientDocument.create(datos);
        if (creado?.id) setEditando(creado.id);
        toast.success('Plano guardado en la ficha del cliente');
      }
      base44.entities.ClientDocument.filter({ contact_id: cliente, doc_type: 'plano_instalacion' })
        .then((l) => setGuardados(l || [])).catch(() => {});
    } catch (err) {
      toast.error(`No se ha podido guardar: ${err?.message || 'revisa la conexión'}`);
    } finally {
      setGuardando(false);
    }
  };

  const imprimir = () => {
    if (!zonaImprimible.current) return;
    imprimirPantalla(zonaImprimible.current, { titulo: `${titulo} — ${new Date().toLocaleDateString('es-ES')}` });
  };

  /* ── Presupuesto con IA ── */
  const pedirPresupuestoIA = async () => {
    if (cuantos === 0) { toast.error('Dibuja algo primero: sin equipos no hay nada que presupuestar.'); return; }
    setPensando(true);
    setPresupuestoIA('');
    try {
      const inventario = (plano.elementos || []).reduce((m, e) => {
        const n = elemento(e.tipo)?.nombre || e.tipo;
        m[n] = (m[n] || 0) + 1;
        return m;
      }, {});
      const metrosTub = (plano.tuberias || []).reduce((n, t) => n + (t.longitudM || 0), 0);
      const metrosEle = (plano.lineasElectricas || []).reduce((n, l) => n + (l.longitudM || 0), 0);
      const r = await base44.integrations.Core.InvokeLLM({
        prompt: `Eres un instalador frigorista español haciendo un presupuesto. Esta es la instalación dibujada en plano:\n\n`
          + `EQUIPOS Y MATERIAL:\n${Object.entries(inventario).map(([k, v]) => `- ${v} × ${k}`).join('\n')}\n\n`
          + `TUBERÍA FRIGORÍFICA: ${metrosTub.toFixed(1)} m\n`
          + `LÍNEA ELÉCTRICA: ${metrosEle.toFixed(1)} m\n\n`
          + `Cálculo aproximado del programa: ${presupuesto.materiales} € de material + ${presupuesto.manoObra} € de mano de obra = ${presupuesto.total} €.\n\n`
          + `Dame un presupuesto por capítulos en español, con las partidas que falten (vacío, carga de gas, puesta en marcha, legalización si procede, `
          + `material auxiliar, desplazamientos) y una estimación de jornadas de trabajo. Señala lo que NO se puede saber del plano y haría falta `
          + `preguntar al cliente. Sé concreto y breve, en texto plano con títulos en mayúsculas.`,
      });
      setPresupuestoIA(typeof r === 'string' ? r : (r?.output || r?.text || JSON.stringify(r)));
    } catch (err) {
      // Si la IA está apagada a propósito (viene así para no gastar créditos),
      // hay que decir eso y no «no ha podido contestar», que deja pensando que
      // está roto.
      toast.error(esIAApagada(err)
        ? `${err.message} El presupuesto aproximado de la derecha no necesita IA.`
        : `La IA no ha podido contestar${err?.message ? `: ${err.message}` : ''}. El presupuesto aproximado de la derecha sigue estando.`);
    } finally {
      setPensando(false);
    }
  };

  const ayudaActual = HERRAMIENTAS.find((h) => h.id === herramienta)?.ayuda || '';

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar title="Diseño de instalaciones" />
      <div className="mx-auto max-w-[1500px] px-3 py-3">

        {/* Cabecera: cliente, título y acciones */}
        <div className="mb-3 rounded-xl bg-white p-3 shadow" data-prueba="cabecera-plano">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <div>
              <label className="text-xs text-slate-500">Cliente</label>
              <BuscadorCliente
                contacts={contactos} value={cliente}
                onValueChange={(v) => setCliente(v || '')}
                placeholder="¿De quién es esta instalación?"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Título del plano</label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} data-prueba="titulo-plano" />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={guardar} disabled={guardando} data-prueba="guardar-plano" className="gap-1">
                {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Guardar
              </Button>
              <Button variant="outline" onClick={imprimir} data-prueba="imprimir-plano" className="gap-1">
                <Printer className="h-4 w-4" />Imprimir
              </Button>
              <Button variant="outline" onClick={imprimir} className="gap-1"
                title="Se abre el diálogo de impresión: elige «Guardar como PDF» para quedarte el fichero.">
                <FileDown className="h-4 w-4" />PDF
              </Button>
            </div>
          </div>
          {guardados.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2 border-t pt-2" data-prueba="planos-guardados">
              <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                <FolderOpen className="h-3.5 w-3.5" />Planos de este cliente:
              </span>
              {guardados.map((d) => (
                <button key={d.id} type="button" onClick={() => abrirGuardado(d)}
                  className={`rounded-full border px-2 py-0.5 text-[11px] ${
                    editando === d.id ? 'border-sky-500 bg-sky-50 font-semibold text-sky-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  {d.title} <span className="text-slate-400">· {d.date || ''}</span>
                </button>
              ))}
              {editando && (
                <button type="button" data-prueba="plano-nuevo"
                  onClick={() => { setEditando(''); setPlano(PLANO_VACIO); setTitulo('Plano de instalación'); setSeleccionado(null); }}
                  className="rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-[11px] text-slate-500 hover:bg-slate-50">
                  + Empezar uno nuevo
                </button>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[260px_1fr_300px]">

          {/* ── Catálogo ── */}
          <div className="rounded-xl bg-white p-3 shadow" data-prueba="catalogo-plano">
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-8 text-sm" value={filtro} onChange={(e) => setFiltro(e.target.value)}
                placeholder="Buscar equipo…" data-prueba="buscar-catalogo" />
            </div>
            <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
              {familias.map((f) => (
                <div key={f.id}>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wide" style={{ color: f.color }}>
                    {f.icono} {f.nombre}
                  </p>
                  <div className="space-y-0.5">
                    {f.elementos.map((e) => (
                      <button
                        key={e.id} type="button"
                        data-prueba={`cat-${e.id}`}
                        onClick={() => { setElementoElegido(e.id); setHerramienta('equipo'); }}
                        className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs hover:bg-slate-100 ${
                          elementoElegido === e.id ? 'bg-sky-100 font-semibold text-sky-800' : 'text-slate-700'}`}
                      >
                        <span>{e.icono}</span><span className="truncate">{e.nombre}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {familias.length === 0 && <p className="text-xs text-slate-400">Nada que se llame así.</p>}
            </div>
          </div>

          {/* ── Lienzo ── */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1 rounded-xl bg-white p-2 shadow">
              {HERRAMIENTAS.map((h) => {
                const I = h.icono;
                return (
                  <button
                    key={h.id} type="button" data-prueba={`herr-${h.id}`}
                    onClick={() => setHerramienta(h.id)}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                      herramienta === h.id ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    <I className="h-3.5 w-3.5" />{h.nombre}
                  </button>
                );
              })}
              <span className="ml-auto flex items-center gap-2">
                <button type="button" onClick={() => setVerRejilla((v) => !v)}
                  className={`rounded p-1.5 ${verRejilla ? 'text-sky-600' : 'text-slate-400'}`} title="Rejilla">
                  <Grid3x3 className="h-4 w-4" />
                </button>
                <label className="flex items-center gap-1 text-[11px] text-slate-500">
                  <input type="checkbox" checked={ajustar} onChange={(e) => setAjustar(e.target.checked)} data-prueba="ajustar-rejilla" />
                  Ajustar
                </label>
              </span>
            </div>

            <p className="px-1 text-[11px] text-slate-500" data-prueba="ayuda-herramienta">{ayudaActual}</p>

            <div ref={zonaImprimible} className="rounded-xl bg-white p-2 shadow">
              <div className="mb-1 flex items-baseline justify-between px-1">
                <p className="text-sm font-bold text-slate-800">{titulo}</p>
                <p className="text-[11px] text-slate-500">
                  Escala: 1 cuadro = 0,5 m · {cuantos} elementos
                </p>
              </div>
              <LienzoInstalacion
                plano={plano} onCambio={setPlano}
                herramienta={herramienta} elementoElegido={elementoElegido}
                seleccionado={seleccionado} onSeleccionar={setSeleccionado}
                verRejilla={verRejilla} ajustarRejilla={ajustar}
              />
              {/* Esto no se ve en pantalla: es la hoja que acompaña al plano
                  cuando se imprime o se saca el PDF. Un plano sin la relación
                  de equipos, los diámetros y las secciones no sirve en obra. */}
              <HojaDeMateriales plano={plano} presupuesto={presupuesto} cliente={contactos.find((c) => c.id === cliente)} />
            </div>
          </div>

          {/* ── Panel derecho ── */}
          <div className="space-y-3">
            <PanelSeleccion sel={sel} onCambio={cambiarSeleccionado} plano={plano} />

            <div className="rounded-xl bg-white p-3 shadow" data-prueba="presupuesto-plano">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-800">
                💶 Presupuesto aproximado
              </p>
              {presupuesto.lineas.length === 0 ? (
                <p className="text-xs text-slate-400">Dibuja equipos y tuberías y aquí irá saliendo la cifra.</p>
              ) : (
                <>
                  <div className="max-h-44 space-y-1 overflow-y-auto">
                    {presupuesto.lineas.map((l, i) => (
                      <div key={i} className="flex justify-between gap-2 text-[11px]">
                        <span className="truncate text-slate-600">{l.unidades}{l.unidad ? ` ${l.unidad}` : '×'} {l.concepto}</span>
                        <span className="font-semibold text-slate-800">{l.total.toFixed(2)} €</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 space-y-0.5 border-t pt-2 text-xs">
                    <div className="flex justify-between"><span className="text-slate-500">Material</span><span>{presupuesto.materiales.toFixed(2)} €</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Mano de obra (35 %)</span><span>{presupuesto.manoObra.toFixed(2)} €</span></div>
                    <div className="flex justify-between text-sm font-bold"><span>Total</span><span>{presupuesto.total.toFixed(2)} €</span></div>
                  </div>
                  <p className="mt-2 flex gap-1 text-[10px] leading-snug text-amber-700">
                    <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" />{presupuesto.aviso}
                  </p>
                </>
              )}
              <Button size="sm" variant="outline" className="mt-2 w-full gap-1" onClick={pedirPresupuestoIA}
                disabled={pensando} data-prueba="presupuesto-ia">
                {pensando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Detallarlo con la IA
              </Button>
              {presupuestoIA && (
                <pre className="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap rounded bg-slate-50 p-2 text-[11px] text-slate-700"
                  data-prueba="presupuesto-ia-texto">{presupuestoIA}</pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Hoja que acompaña al plano en el papel ───────────────────────────── */

function HojaDeMateriales({ plano, presupuesto, cliente }) {
  const equipos = (plano.elementos || []).reduce((m, e) => {
    const def = elemento(e.tipo);
    const clave = def?.nombre || e.tipo;
    const f = m[clave] || { nombre: clave, n: 0, detalles: [] };
    f.n += 1;
    const d = Object.entries(e.datos || {}).filter(([, v]) => v !== '' && v != null)
      .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`).join(' · ');
    if (e.etiqueta || d) f.detalles.push([e.etiqueta, d].filter(Boolean).join(' — '));
    m[clave] = f;
    return m;
  }, {});

  const celda = 'border border-slate-300 px-2 py-1 text-left align-top';

  return (
    <div data-solo-impresion className="hidden mt-4 text-[11px] text-slate-800">
      <h2 className="mb-1 text-sm font-bold">Relación de equipos y materiales</h2>
      {cliente && <p className="mb-2">Cliente: <b>{cliente.company_name || cliente.name}</b></p>}

      <table className="mb-3 w-full border-collapse">
        <thead><tr className="bg-slate-100">
          <th className={celda}>Ud.</th><th className={celda}>Equipo</th><th className={celda}>Datos</th>
        </tr></thead>
        <tbody>
          {Object.values(equipos).map((f) => (
            <tr key={f.nombre}>
              <td className={celda}>{f.n}</td>
              <td className={celda}>{f.nombre}</td>
              <td className={celda}>{f.detalles.join(' | ')}</td>
            </tr>
          ))}
          {Object.keys(equipos).length === 0 && <tr><td className={celda} colSpan={3}>Sin equipos.</td></tr>}
        </tbody>
      </table>

      {(plano.tuberias || []).length > 0 && (
        <>
          <h2 className="mb-1 text-sm font-bold">Tuberías frigoríficas</h2>
          <table className="mb-3 w-full border-collapse">
            <thead><tr className="bg-slate-100">
              <th className={celda}>Tramo</th><th className={celda}>Longitud</th>
              <th className={celda}>Gas</th><th className={celda}>Líquido</th><th className={celda}>Desnivel</th>
            </tr></thead>
            <tbody>
              {(plano.tuberias || []).map((t, i) => (
                <tr key={t.id}>
                  <td className={celda}>T{i + 1}</td>
                  <td className={celda}>{t.longitudM} m</td>
                  <td className={celda}>{t.gas || '—'}</td>
                  <td className={celda}>{t.liquido || '—'}</td>
                  <td className={celda}>{t.desnivelM ? `${t.desnivelM} m` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {(plano.lineasElectricas || []).length > 0 && (
        <>
          <h2 className="mb-1 text-sm font-bold">Líneas eléctricas y de comunicación</h2>
          <table className="mb-3 w-full border-collapse">
            <thead><tr className="bg-slate-100">
              <th className={celda}>Línea</th><th className={celda}>Tipo</th><th className={celda}>Longitud</th>
              <th className={celda}>Sección / cable</th><th className={celda}>Bus</th>
            </tr></thead>
            <tbody>
              {(plano.lineasElectricas || []).map((l, i) => (
                <tr key={l.id}>
                  <td className={celda}>L{i + 1}</td>
                  <td className={celda}>{TIPOS_CONEXION_ELECTRICA.find((x) => x.id === l.tipo)?.nombre || l.tipo}</td>
                  <td className={celda}>{l.longitudM} m</td>
                  <td className={celda}>{l.seccion ? `${l.seccion} mm²` : (l.cable || '—')}</td>
                  <td className={celda}>{l.bus || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <p className="mt-2">
        <b>Presupuesto aproximado:</b> material {presupuesto.materiales.toFixed(2)} € +
        mano de obra {presupuesto.manoObra.toFixed(2)} € = <b>{presupuesto.total.toFixed(2)} €</b>
      </p>
      <p className="mt-1 text-[10px] text-slate-500">{presupuesto.aviso}</p>
      <p className="mt-1 text-[10px] text-slate-500">
        Diámetros y secciones orientativos: prevalecen la ficha técnica del fabricante y el REBT.
      </p>
    </div>
  );
}

/* ─── Panel de lo seleccionado ─────────────────────────────────────────── */

function PanelSeleccion({ sel, onCambio, plano }) {
  if (!sel?.dato) {
    return (
      <div className="rounded-xl bg-white p-3 shadow text-xs text-slate-400" data-prueba="panel-seleccion">
        Pulsa sobre un equipo, una tubería o una línea eléctrica para ver y rellenar sus datos.
      </div>
    );
  }

  if (sel.clase === 'elemento') return <PanelEquipo el={sel.dato} onCambio={onCambio} />;
  if (sel.clase === 'tuberia') return <PanelTuberia t={sel.dato} onCambio={onCambio} plano={plano} />;
  return <PanelElectrico l={sel.dato} onCambio={onCambio} plano={plano} />;
}

function PanelEquipo({ el, onCambio }) {
  const def = elemento(el.tipo);
  const datos = el.datos || {};
  const poner = (id, v) => onCambio({ datos: { ...datos, [id]: v } });
  useEffect(() => {
    // La primera vez, los valores por defecto del catálogo.
    if (Object.keys(datos).length === 0) {
      const d = valoresPorDefecto(el.tipo);
      if (Object.keys(d).length) onCambio({ datos: d });
    }
  }, [el.id]);

  return (
    <div className="rounded-xl bg-white p-3 shadow" data-prueba="panel-seleccion">
      <p className="mb-2 text-sm font-bold text-slate-800">{def?.icono} {def?.nombre}</p>
      <label className="text-[11px] text-slate-500">Etiqueta en el plano</label>
      <Input className="mb-2 h-8 text-xs" value={el.etiqueta || ''} data-prueba="etiqueta-equipo"
        onChange={(e) => onCambio({ etiqueta: e.target.value })} placeholder="UC-1, Cámara 2…" />
      {(def?.campos || []).map((c) => (
        <div key={c.id} className="mb-2">
          <label className="text-[11px] text-slate-500">{c.etiqueta}</label>
          {c.tipo === 'opcion' ? (
            <select className="h-8 w-full rounded-md border border-input px-2 text-xs"
              value={datos[c.id] || c.porDefecto || ''} onChange={(e) => poner(c.id, e.target.value)}>
              <option value="">—</option>
              {c.opciones.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <Input className="h-8 text-xs" inputMode={c.tipo === 'numero' ? 'decimal' : undefined}
              value={datos[c.id] ?? ''} onChange={(e) => poner(c.id, e.target.value)} />
          )}
          {c.ayuda && <p className="text-[10px] text-slate-400">{c.ayuda}</p>}
        </div>
      ))}
      {def?.nota && (
        <p className="mt-2 flex gap-1 rounded bg-amber-50 p-2 text-[10px] leading-snug text-amber-800">
          <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" />{def.nota}
        </p>
      )}
    </div>
  );
}

function PanelTuberia({ t, onCambio, plano }) {
  // La potencia sale del equipo al que está enganchada. Puede estar pegada a
  // dos (la condensadora y el evaporador): se coge el que tenga la potencia
  // puesta, porque es lo normal que solo se rellene en uno de los dos.
  const extremos = (plano.elementos || []).filter((e) => e.id === t.desde || e.id === t.hasta);
  const equipo = extremos.find((e) => Number(e.datos?.potencia_w) > 0) || extremos[0];
  const potenciaW = Number(t.potenciaW ?? equipo?.datos?.potencia_w) || 0;
  const sug = useMemo(
    () => sugerirDiametros({ potenciaW, longitudM: t.longitudM, desnivelM: Number(t.desnivelM) || 0 }),
    [potenciaW, t.longitudM, t.desnivelM],
  );

  return (
    <div className="rounded-xl bg-white p-3 shadow" data-prueba="panel-seleccion">
      <p className="mb-2 flex items-center gap-1 text-sm font-bold text-sky-800">
        <Snowflake className="h-4 w-4" />Tubería frigorífica
      </p>
      <p className="mb-2 text-[11px] text-slate-500">
        <Link2 className="mr-1 inline h-3 w-3" />{t.longitudM} m dibujados
        {equipo && <> · engancha con <b>{equipo.etiqueta || elemento(equipo.tipo)?.nombre}</b></>}
      </p>

      <label className="text-[11px] text-slate-500">Potencia que mueve (W)</label>
      <Input className="mb-2 h-8 text-xs" inputMode="decimal" data-prueba="potencia-tuberia"
        value={t.potenciaW ?? equipo?.datos?.potencia_w ?? ''}
        onChange={(e) => onCambio({ potenciaW: e.target.value })} placeholder="de la placa del equipo" />

      <label className="text-[11px] text-slate-500">Desnivel (m, negativo si baja)</label>
      <Input className="mb-2 h-8 text-xs" inputMode="decimal"
        value={t.desnivelM ?? ''} onChange={(e) => onCambio({ desnivelM: e.target.value })} />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] text-slate-500">Línea de gas</label>
          <select className="h-8 w-full rounded-md border border-input px-2 text-xs" data-prueba="gas-tuberia"
            value={t.gas || sug.gas?.pulgadas || ''} onChange={(e) => onCambio({ gas: e.target.value })}>
            <option value="">—</option>
            {DIAMETROS.map((d) => <option key={d.pulgadas} value={d.pulgadas}>{d.pulgadas} ({d.mm} mm)</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-slate-500">Línea de líquido</label>
          <select className="h-8 w-full rounded-md border border-input px-2 text-xs" data-prueba="liquido-tuberia"
            value={t.liquido || sug.liquido?.pulgadas || ''} onChange={(e) => onCambio({ liquido: e.target.value })}>
            <option value="">—</option>
            {DIAMETROS.map((d) => <option key={d.pulgadas} value={d.pulgadas}>{d.pulgadas} ({d.mm} mm)</option>)}
          </select>
        </div>
      </div>

      {sug.gas && (
        <div className="mt-2 rounded bg-sky-50 p-2 text-[11px] text-sky-900" data-prueba="sugerencia-tuberia">
          <p><b>Sugerencia:</b> gas {sug.gas.pulgadas} · líquido {sug.liquido.pulgadas}</p>
          {sug.cargaEstimadaG > 0 && <p>Carga en la línea de líquido: ≈ {sug.cargaEstimadaG} g</p>}
        </div>
      )}
      {!sug.gas && (
        <p className="mt-2 rounded bg-slate-50 p-2 text-[11px] text-slate-500" data-prueba="sugerencia-tuberia">
          Pon la potencia (aquí o en la ficha del equipo) y te digo los diámetros de gas y de líquido.
        </p>
      )}
      {sug.avisos.map((a, i) => (
        <p key={i} className="mt-1 flex gap-1 text-[10px] leading-snug text-amber-700">
          <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" />{a}
        </p>
      ))}
      <p className="mt-2 text-[10px] leading-snug text-slate-400">
        Diámetros orientativos: el bueno es el de la ficha técnica del equipo.
      </p>
    </div>
  );
}

function PanelElectrico({ l, onCambio, plano }) {
  const extremos = (plano.elementos || []).filter((e) => e.id === l.desde || e.id === l.hasta);
  const equipo = extremos.find((e) => Number(e.datos?.consumo_w) > 0)
    || extremos.find((e) => Number(e.datos?.potencia_w) > 0) || extremos[0];
  const potenciaW = Number(l.potenciaW ?? equipo?.datos?.consumo_w ?? equipo?.datos?.potencia_w) || 0;
  const tension = l.tension || equipo?.datos?.tension || '230 V monofásica';
  const sug = useMemo(
    () => sugerirSeccion({ potenciaW, tension, longitudM: l.longitudM }),
    [potenciaW, tension, l.longitudM],
  );
  const esComunicacion = l.tipo === 'comunicacion';

  return (
    <div className="rounded-xl bg-white p-3 shadow" data-prueba="panel-seleccion">
      <p className="mb-2 flex items-center gap-1 text-sm font-bold text-amber-700">
        <Zap className="h-4 w-4" />Línea eléctrica
      </p>
      <p className="mb-2 text-[11px] text-slate-500">{l.longitudM} m dibujados</p>

      <label className="text-[11px] text-slate-500">Tipo de conexión</label>
      <select className="mb-2 h-8 w-full rounded-md border border-input px-2 text-xs" data-prueba="tipo-electrico"
        value={l.tipo || 'potencia'} onChange={(e) => onCambio({ tipo: e.target.value })}>
        {TIPOS_CONEXION_ELECTRICA.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
      </select>

      {esComunicacion ? (
        <>
          <label className="text-[11px] text-slate-500">Bus / protocolo</label>
          <select className="mb-2 h-8 w-full rounded-md border border-input px-2 text-xs" data-prueba="bus-comunicacion"
            value={l.bus || ''} onChange={(e) => onCambio({ bus: e.target.value })}>
            <option value="">—</option>
            {BUSES_COMUNICACION.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <label className="text-[11px] text-slate-500">Cable</label>
          <Input className="h-8 text-xs" value={l.cable || ''} onChange={(e) => onCambio({ cable: e.target.value })}
            placeholder="p. ej. 2×0,75 apantallado" />
          <p className="mt-2 text-[10px] leading-snug text-slate-400">
            El bus de datos va separado de la fuerza para que no le entren interferencias.
          </p>
        </>
      ) : (
        <>
          <label className="text-[11px] text-slate-500">Potencia (W)</label>
          <Input className="mb-2 h-8 text-xs" inputMode="decimal" data-prueba="potencia-electrico"
            value={l.potenciaW ?? equipo?.datos?.consumo_w ?? ''} onChange={(e) => onCambio({ potenciaW: e.target.value })} />

          <label className="text-[11px] text-slate-500">Tensión</label>
          <select className="mb-2 h-8 w-full rounded-md border border-input px-2 text-xs" data-prueba="tension-electrico"
            value={tension} onChange={(e) => onCambio({ tension: e.target.value })}>
            {['230 V monofásica', '400 V trifásica', '24 V', '12 V'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          <label className="text-[11px] text-slate-500">Sección (mm²)</label>
          <Input className="h-8 text-xs" inputMode="decimal" data-prueba="seccion-electrico"
            value={l.seccion ?? sug.seccion?.mm2 ?? ''} onChange={(e) => onCambio({ seccion: e.target.value })} />

          {sug.seccion && (
            <div className="mt-2 rounded bg-amber-50 p-2 text-[11px] text-amber-900" data-prueba="sugerencia-electrico">
              <p><b>Sugerencia:</b> {sug.seccion.mm2} mm² · {sug.intensidadA} A {sug.trifasica ? '(trifásica)' : '(monofásica)'}</p>
            </div>
          )}
          {sug.avisos.map((a, i) => (
            <p key={i} className="mt-1 flex gap-1 text-[10px] leading-snug text-amber-700">
              <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" />{a}
            </p>
          ))}
        </>
      )}
    </div>
  );
}
