import React, { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceArea } from 'recharts';
import { Droplets, Ruler, Printer, Save, Info, CheckCircle2, Loader2, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberField } from '@/components/ui/number-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BuscadorCliente, { nombreCompleto } from '@/components/BuscadorCliente';
import EsquemaSVG from '@/components/EsquemaSVG';
import { Campo, Panel, Kpi, Dato, Aviso, Interruptor } from '@/components/PiezasCalculo';
import { asArray } from '@/lib/asArray';
import { useParametrosUrl } from '@/lib/parametrosUrl';
import { uploadFile } from '@/lib/uploadImage';
import { printDocument } from '@/lib/printHelper';
import { generarPdfBlobDesdeHtml } from '@/lib/compartirDocumentoWhatsApp';
import { buscarRefrigerante, ESTADOS } from '@/lib/refrigerantes';
import {
  APLICACIONES,
  DIAMETROS_MM,
  LONGITUD,
  SUPUESTOS_CAPILAR,
  avisosResultado,
  caudalParaLongitud,
  cartaCapacidades,
  crearContexto,
  diametroExterior,
  diametroSugerido,
  listaGases,
  longitudParaCaudal,
  sensibilidadLongitud,
  tablaDiametros,
  valorarLongitud,
} from '@/lib/capilar';
import { UNIDADES_POTENCIA, aWatios, deWatios, textoPotencia } from '@/lib/potencia';
import { esquemaCapilarCotas, esquemaCircuito, fmt, graficoPerfilSVG } from '@/lib/esquemasFrigorificos';
import { htmlInformeCapilar, referenciaInforme } from '@/lib/informeCapilar';

const GASES = listaGases();
const COLOR_VALORACION = {
  optimo: 'text-emerald-700 dark:text-emerald-400',
  justo: 'text-amber-700 dark:text-amber-400',
  corto: 'text-amber-700 dark:text-amber-400',
  largo: 'text-amber-700 dark:text-amber-400',
  muylargo: 'text-red-700 dark:text-red-400',
  imposible: 'text-red-700 dark:text-red-400',
};
const COLOR_BARRA = { optimo: '#16a34a', justo: '#d97706', corto: '#d97706', largo: '#d97706', muylargo: '#dc2626', imposible: '#dc2626' };
const LONGITUDES_CARTA = [1, 1.5, 2, 2.5, 3, 4, 5];
const DIAMETROS_CARTA = [0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.4];
const ESTILO_CAMPO = 'tabular bg-background text-foreground';

/* ───────────────────────────── Pantalla ───────────────────────────── */

export default function CapillaryCalc() {
  const urlParams = useParametrosUrl();
  const urlContactId = urlParams.get('contact_id');

  const [modo, setModo] = useState('diseno'); // 'diseno' | 'comprobar' | 'carta'
  const [aplicId, setAplicId] = useState('congelador');
  const [gas, setGas] = useState('R-134a');
  const [Te, setTe] = useState(-25);
  const [Tc, setTc] = useState(50);
  const [subenf, setSubenf] = useState(5);
  const [recal, setRecal] = useState(5);
  const [potencia, setPotencia] = useState(150);
  const [unidad, setUnidad] = useState('W');
  const [dmmElegido, setDmmElegido] = useState(null);
  const [dPersonal, setDPersonal] = useState(0);
  const [dExistente, setDExistente] = useState(0.8);
  const [lExistente, setLExistente] = useState(2);

  // esquema
  const [conFiltro, setConFiltro] = useState(true);
  const [conVisor, setConVisor] = useState(false);
  const [conSolenoide, setConSolenoide] = useState(false);

  // cliente y equipo
  const [contactos, setContactos] = useState([]);
  const [empresa, setEmpresa] = useState(null);
  const [contactId, setContactId] = useState('');
  const [equipo, setEquipo] = useState({ descripcion: '', ubicacion: '', notas: '' });
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(null);

  const infoGas = GASES.find((g) => g.id === gas) || GASES[0];
  const fichaGas = useMemo(() => buscarRefrigerante(gas), [gas]);

  /* ── Datos de apoyo: clientes y empresa ── */
  useEffect(() => {
    let vivo = true;
    base44.entities.Contact.list('name', 500)
      .then((l) => { if (vivo) setContactos(asArray(l)); })
      .catch(() => { if (vivo) setContactos([]); });
    base44.entities.CompanySettings.list()
      .then((l) => { if (vivo) setEmpresa(asArray(l)[0] || null); })
      .catch(() => { if (vivo) setEmpresa(null); });
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    if (urlContactId) setContactId(urlContactId);
  }, [urlContactId]);

  const contacto = useMemo(() => contactos.find((c) => c.id === contactId) || null, [contactos, contactId]);

  /* ── Al cambiar de gas, las temperaturas se acomodan a su rango ── */
  useEffect(() => {
    const g = GASES.find((x) => x.id === gas);
    if (!g) return;
    setTe((v) => Math.min(Math.max(v, g.TeMin), g.TcMax - 1));
    setTc((v) => Math.min(Math.max(v, g.TeMin + 1), g.TcMax));
  }, [gas]);

  const editar = (setter) => (v) => {
    setter(v);
    setAplicId('personalizada');
  };

  const elegirAplicacion = (id) => {
    setAplicId(id);
    const a = APLICACIONES.find((x) => x.id === id);
    if (!a) return;
    const g = GASES.find((x) => x.id === gas) || GASES[0];
    setTe(Math.min(Math.max(a.Te, g.TeMin), g.TcMax - 1));
    setTc(Math.min(Math.max(a.Tc, g.TeMin + 1), g.TcMax));
    setSubenf(a.subenf);
    setRecal(a.recal);
  };

  /* ── Cálculo ── */
  const ctx = useMemo(() => crearContexto({ gas, Te, Tc, subenf, recal }), [gas, Te, Tc, subenf, recal]);
  const potenciaW = aWatios(potencia, unidad);
  const mdot = ctx.ok && potenciaW > 0 ? potenciaW / (ctx.q0 * 1000) : 0;

  const diametros = useMemo(() => {
    const base = [...DIAMETROS_MM];
    if (dPersonal >= 0.3 && dPersonal <= 6 && !base.some((d) => Math.abs(d - dPersonal) < 1e-9)) base.push(dPersonal);
    return base.sort((a, b) => a - b);
  }, [dPersonal]);

  const tabla = useMemo(() => (ctx.ok && mdot > 0 ? tablaDiametros(ctx, mdot, diametros) : []), [ctx, mdot, diametros]);
  const dSugerido = useMemo(() => diametroSugerido(tabla), [tabla]);
  const dmm = useMemo(() => {
    if (dmmElegido != null && tabla.some((r) => r.dmm === dmmElegido && !r.imposible)) return dmmElegido;
    if (dSugerido) return dSugerido;
    return tabla.find((r) => !r.imposible)?.dmm ?? null;
  }, [dmmElegido, dSugerido, tabla]);

  const selDiseno = useMemo(
    () => (ctx.ok && mdot > 0 && dmm ? longitudParaCaudal(ctx, dmm / 1000, mdot, { perfil: true }) : null),
    [ctx, mdot, dmm],
  );

  const comprobacionValida = dExistente >= 0.3 && dExistente <= 6 && lExistente >= 0.05 && lExistente <= 60;
  const selComprobar = useMemo(
    () => (ctx.ok && comprobacionValida ? caudalParaLongitud(ctx, dExistente / 1000, lExistente, { perfil: true }) : null),
    [ctx, comprobacionValida, dExistente, lExistente],
  );

  const sel = modo === 'comprobar' ? selComprobar : modo === 'diseno' ? selDiseno : null;
  const dmmSel = modo === 'comprobar' ? dExistente : dmm;
  const odmm = dmmSel ? diametroExterior(dmmSel) : 0;
  const valoracion = sel ? valorarLongitud(sel) : null;

  const sens = useMemo(
    () => (ctx.ok && sel && !sel.imposible && sel.L > 0.02 ? sensibilidadLongitud(ctx, sel.D, modo === 'comprobar' ? lExistente : sel.L, 0.1) : null),
    [ctx, sel, modo, lExistente],
  );

  const cartaLongitud = useMemo(() => {
    if (!(ctx.ok && selComprobar && modo === 'comprobar')) return null;
    return [0.8, 0.9, 1, 1.1, 1.2].map((f) => ({ f, L: lExistente * f, Q: f === 1 ? selComprobar.Q : caudalParaLongitud(ctx, dExistente / 1000, lExistente * f).Q }));
  }, [ctx, selComprobar, modo, lExistente, dExistente]);

  const carta = useMemo(() => (modo === 'carta' && ctx.ok ? cartaCapacidades(ctx, DIAMETROS_CARTA, LONGITUDES_CARTA) : null), [modo, ctx]);

  const avisos = useMemo(() => (ctx.ok ? [...ctx.avisos, ...(sel ? avisosResultado(ctx, sel) : [])] : []), [ctx, sel]);

  /* ── Esquemas ── */
  const etiquetasEsquema = ctx.ok && sel && !sel.imposible
    ? {
        gas,
        Pc: `${fmt(ctx.Pc, 2)} bar`,
        Tc: `${fmt(ctx.Tc, 1)} °C`,
        Pe: `${fmt(ctx.Pe, 2)} bar`,
        Te: `${fmt(ctx.Te, 1)} °C`,
        capilar: `Ø ${fmt(sel.D * 1000, 2)} mm × ${fmt(sel.L, 2)} m`,
        carga: `${textoPotencia(modo === 'comprobar' ? sel.Q : potenciaW)} · ${fmt(sel.mdot * 1000, 2)} g/s`,
      }
    : null;
  const svgCircuito = useMemo(
    () => (etiquetasEsquema ? esquemaCircuito({ expansion: 'capilar', filtro: conFiltro, visor: conVisor, solenoide: conSolenoide, resaltar: 'capilar', titulo: 'Circuito frigorífico con tubo capilar', etiquetas: etiquetasEsquema }) : ''),
    [JSON.stringify(etiquetasEsquema), conFiltro, conVisor, conSolenoide],
  );
  const svgCotas = useMemo(
    () => (ctx.ok && sel && !sel.imposible
      ? esquemaCapilarCotas({ L: sel.L, Lliq: sel.Lliq, L2f: sel.L2f, dInt: sel.D * 1000, dExt: odmm, Pc: ctx.Pc, Pflash: sel.Pflash, Psalida: sel.Psalida, Pe: ctx.Pe, Tin: ctx.Tin, TSalida: sel.TSalida, xSalida: sel.xSalida, estrangulado: sel.estrangulado, gas })
      : ''),
    [ctx, sel, odmm, gas],
  );
  const svgPerfil = useMemo(() => (sel && !sel.imposible && sel.perfil ? graficoPerfilSVG(sel.perfil, { Pe: ctx.Pe }) : ''), [sel, ctx]);

  const datosGrafico = useMemo(
    () => tabla.map((r) => ({ d: r.dmm, L: r.imposible ? 0 : r.L, Lg: r.imposible ? 0.1 : Math.min(Math.max(r.L, 0.1), 100), clave: r.valoracion.clave, elegido: r.dmm === dmm })),
    [tabla, dmm],
  );

  /* ── Informe, impresión y ficha del cliente ── */
  const aplicacionNombre = aplicId === 'personalizada' ? 'Personalizada' : APLICACIONES.find((a) => a.id === aplicId)?.nombre;

  const construirInforme = () => {
    const fecha = new Date();
    const referencia = referenciaInforme(fecha);
    const cliente = contacto
      ? {
          nombre: nombreCompleto(contacto),
          nif: contacto.nif,
          direccion: [contacto.address, contacto.postal_code, contacto.city].filter(Boolean).join(', '),
          telefono: contacto.phone || contacto.mobile,
          email: contacto.email,
        }
      : null;
    const html = htmlInformeCapilar({
      modo,
      referencia,
      fecha,
      empresa,
      cliente,
      equipo,
      ctx,
      gasNombre: gas,
      aplicacionNombre,
      potenciaW,
      potenciaValor: potencia,
      potenciaUnidad: unidad,
      sel,
      dmm: dmmSel,
      odmm,
      valoracion,
      tabla: modo === 'diseno' ? tabla : undefined,
      carta: modo === 'comprobar' ? cartaLongitud : undefined,
      L: modo === 'comprobar' ? lExistente : undefined,
      sens,
      filtro: conFiltro,
      visor: conVisor,
      solenoide: conSolenoide,
    });
    return { html, referencia, fecha };
  };

  const puedeInformar = !!(ctx.ok && sel && !sel.imposible && modo !== 'carta');

  const imprimir = async () => {
    if (!puedeInformar) return;
    const { html, referencia } = construirInforme();
    await printDocument(html, `Cálculo de tubo capilar ${referencia}`);
  };

  const guardarEnFicha = async () => {
    if (!puedeInformar || !contacto) return;
    setGuardando(true);
    setGuardado(null);
    try {
      const { html, referencia, fecha } = construirInforme();
      let fichero = null;
      let formato = 'PDF';
      try {
        const blob = await generarPdfBlobDesdeHtml(html);
        fichero = new File([blob], `${referencia}.pdf`, { type: 'application/pdf' });
      } catch (e) {
        console.error('[CapillaryCalc] No se pudo generar el PDF, se guarda en HTML:', e);
      }
      let url = null;
      if (fichero) {
        try {
          url = await uploadFile(fichero);
        } catch (e) {
          console.error('[CapillaryCalc] No se pudo guardar el PDF, se prueba con HTML:', e);
        }
      }
      if (!url) {
        formato = 'HTML';
        url = await uploadFile(new File([html], `${referencia}.html`, { type: 'text/html' }));
      }
      const titulo = `Cálculo de tubo capilar — ${gas} — Ø ${fmt(sel.D * 1000, 2)} mm × ${fmt(modo === 'comprobar' ? lExistente : sel.L, 2)} m`;
      await base44.entities.ClientDocument.create({
        contact_id: contacto.id,
        contact_name: nombreCompleto(contacto),
        title: titulo,
        doc_type: 'calculo_termico',
        file_url: url,
        description: JSON.stringify({
          tipo: 'capilar',
          modo,
          referencia,
          gas,
          Te,
          Tc,
          subenfriamiento: subenf,
          recalentamiento: recal,
          potenciaW: modo === 'comprobar' ? Math.round(sel.Q) : Math.round(potenciaW),
          diametroInterior_mm: dmmSel,
          longitud_m: Number((modo === 'comprobar' ? lExistente : sel.L).toFixed(3)),
          caudal_g_s: Number((sel.mdot * 1000).toFixed(4)),
          equipo,
        }),
        date: format(fecha, 'yyyy-MM-dd'),
        reference_id: referencia,
      });
      setGuardado({ ok: true, texto: `Guardado en la ficha de ${nombreCompleto(contacto)} (pestaña Cálculos), en ${formato}.` });
      toast.success('Informe guardado en la ficha del cliente');
    } catch (e) {
      const texto = e?.message ? `No se ha podido guardar: ${e.message}` : 'No se ha podido guardar. Comprueba la conexión e inténtalo de nuevo.';
      setGuardado({ ok: false, texto });
      toast.error(texto);
    } finally {
      setGuardando(false);
    }
  };

  /* ── Pintado ── */
  const hayPotencia = potenciaW > 0;
  const estadoGas = fichaGas ? ESTADOS[fichaGas.estado] : null;

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-3 sm:p-5" data-prueba="capilar-calc">
      <header className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-700 text-white">
          <Droplets className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-tight text-foreground">Cálculo de tubo capilar</h1>
          <p className="text-sm text-muted-foreground">
            Diámetro y longitud según el refrigerante, las temperaturas de trabajo y la potencia. Con informe completo, esquema con cotas y vínculo al cliente.
          </p>
        </div>
      </header>

      <Tabs value={modo} onValueChange={setModo}>
        <TabsList className="grid h-auto w-full grid-cols-3" data-prueba="capilar-pestanas">
          <TabsTrigger value="diseno" data-prueba="pestana-diseno">Dimensionar</TabsTrigger>
          <TabsTrigger value="comprobar" data-prueba="pestana-comprobar">Comprobar</TabsTrigger>
          <TabsTrigger value="carta" data-prueba="pestana-carta">Carta</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ───────── Condiciones ───────── */}
      <Panel titulo="Condiciones de trabajo" icono={Activity}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo etiqueta="Aplicación (rellena las temperaturas)">
            <Select value={aplicId} onValueChange={elegirAplicacion}>
              <SelectTrigger className="bg-background text-foreground" data-prueba="capilar-aplicacion"><SelectValue placeholder="Personalizada" /></SelectTrigger>
              <SelectContent>
                {APLICACIONES.map((a) => <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>)}
                <SelectItem value="personalizada">Personalizada</SelectItem>
              </SelectContent>
            </Select>
          </Campo>
          <Campo
            etiqueta="Refrigerante"
            ayuda={infoGas?.mezcla ? `Mezcla (en masa): ${infoGas.composicion}` : 'Sustancia pura'}
          >
            <Select value={gas} onValueChange={setGas}>
              <SelectTrigger className="bg-background text-foreground" data-prueba="capilar-gas"><SelectValue /></SelectTrigger>
              <SelectContent>
                {GASES.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.id}{g.mezcla ? ' · mezcla' : ''}{g.capilar === false ? ' · no habitual en capilar' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
        </div>

        {(fichaGas || infoGas) && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
            {infoGas?.clase && <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-foreground">Seguridad {infoGas.clase}</span>}
            {fichaGas?.aceite && <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-foreground">Aceite {fichaGas.aceite}</span>}
            {fichaGas?.gwp != null && <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-foreground">GWP {fichaGas.gwp}</span>}
            {infoGas?.mezcla && infoGas.glide0 > 0.5 && <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-foreground">Deslizamiento ≈ {fmt(infoGas.glide0, 1)} K</span>}
            {estadoGas && <span className={`rounded border px-1.5 py-0.5 ${estadoGas.color}`}>{estadoGas.etiqueta}</span>}
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Campo etiqueta="T. evaporación (°C)" ayuda={`Rocío. Desde ${infoGas.TeMin} °C`}>
            <NumberField value={Te} onChange={editar(setTe)} className={ESTILO_CAMPO} aria-label="Temperatura de evaporación en grados" data-prueba="capilar-te" />
          </Campo>
          <Campo etiqueta="T. condensación (°C)" ayuda={`Rocío. Hasta ${infoGas.TcMax} °C`}>
            <NumberField value={Tc} onChange={editar(setTc)} className={ESTILO_CAMPO} aria-label="Temperatura de condensación en grados" data-prueba="capilar-tc" />
          </Campo>
          <Campo etiqueta="Subenfriamiento (K)" ayuda="Típico 3 a 10 K">
            <NumberField value={subenf} onChange={editar(setSubenf)} className={ESTILO_CAMPO} aria-label="Subenfriamiento en kelvin" data-prueba="capilar-subenf" />
          </Campo>
          <Campo etiqueta="Recalentamiento (K)" ayuda="El útil, en el evaporador">
            <NumberField value={recal} onChange={editar(setRecal)} className={ESTILO_CAMPO} aria-label="Recalentamiento en kelvin" data-prueba="capilar-recal" />
          </Campo>
        </div>

        {modo === 'comprobar' ? (
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Campo etiqueta="Ø interior del capilar (mm)" ayuda="Entre 0,3 y 6 mm">
              <NumberField value={dExistente} onChange={setDExistente} className={ESTILO_CAMPO} aria-label="Diámetro interior en milímetros" data-prueba="capilar-d-existente" />
            </Campo>
            <Campo etiqueta="Longitud instalada (m)" ayuda="Entre 0,05 y 60 m">
              <NumberField value={lExistente} onChange={setLExistente} className={ESTILO_CAMPO} aria-label="Longitud del capilar en metros" data-prueba="capilar-l-existente" />
            </Campo>
            <Campo etiqueta="Potencia a cubrir (opcional)">
              <NumberField value={potencia} onChange={setPotencia} className={ESTILO_CAMPO} aria-label="Potencia frigorífica a cubrir" data-prueba="capilar-potencia" />
            </Campo>
            <Campo etiqueta="Unidad">
              <Select value={unidad} onValueChange={setUnidad}>
                <SelectTrigger className="bg-background text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent>{UNIDADES_POTENCIA.map((u) => <SelectItem key={u.id} value={u.id}>{u.etiqueta}</SelectItem>)}</SelectContent>
              </Select>
            </Campo>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Campo etiqueta={modo === 'carta' ? 'Potencia a resaltar (opcional)' : 'Potencia frigorífica'}>
              <NumberField value={potencia} onChange={setPotencia} className={ESTILO_CAMPO} aria-label="Potencia frigorífica" data-prueba="capilar-potencia" />
            </Campo>
            <Campo etiqueta="Unidad">
              <Select value={unidad} onValueChange={setUnidad}>
                <SelectTrigger className="bg-background text-foreground" data-prueba="capilar-unidad"><SelectValue /></SelectTrigger>
                <SelectContent>{UNIDADES_POTENCIA.map((u) => <SelectItem key={u.id} value={u.id}>{u.etiqueta}</SelectItem>)}</SelectContent>
              </Select>
            </Campo>
            {modo === 'diseno' && (
              <Campo etiqueta="Otro diámetro (mm)" ayuda="Si el suyo no está en la lista">
                <NumberField
                  value={dPersonal > 0 ? dPersonal : ''}
                  onChange={(v) => { setDPersonal(v); if (v >= 0.3 && v <= 6) setDmmElegido(v); }}
                  className={ESTILO_CAMPO}
                  aria-label="Otro diámetro interior en milímetros"
                  data-prueba="capilar-d-personal"
                />
              </Campo>
            )}
          </div>
        )}
      </Panel>

      {!ctx.ok && (
        <Aviso nivel="error">{ctx.error}</Aviso>
      )}

      {ctx.ok && (
        <section className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6" data-prueba="capilar-kpis" aria-label="Estado del ciclo">
          <Kpi etiqueta="Presión de evaporación" valor={fmt(ctx.Pe, 2)} unidad="bar" sub={`${fmt(ctx.Pe - 1.01325, 2)} bar relativos`} />
          <Kpi etiqueta="Presión de condensación" valor={fmt(ctx.Pc, 2)} unidad="bar" sub={`${fmt(ctx.Pc - 1.01325, 2)} bar relativos`} />
          <Kpi etiqueta="Líquido a la entrada" valor={fmt(ctx.Tin, 1)} unidad="°C" sub={`subenfriado ${fmt(ctx.subenf, 1)} K`} />
          <Kpi etiqueta="Efecto frigorífico" valor={fmt(ctx.q0, 1)} unidad="kJ/kg" sub="incluye recalentamiento" />
          <Kpi etiqueta="Caudal necesario" valor={modo === 'comprobar' ? (sel ? fmt(sel.mdot * 1000, 3) : '—') : hayPotencia ? fmt(mdot * 1000, 3) : '—'} unidad="g/s" sub={modo === 'comprobar' ? 'que pasa el capilar' : 'para la potencia pedida'} />
          <Kpi etiqueta="Vapor al evaporador" valor={fmt(ctx.xEv * 100, 0)} unidad="%" sub={`${fmt(ctx.TevEntrada, 1)} °C de entrada`} />
        </section>
      )}

      {/* ───────── Dimensionar ───────── */}
      {ctx.ok && modo === 'diseno' && !hayPotencia && (
        <Aviso nivel="info">Escribe la potencia frigorífica que debe dar el capilar para ver los diámetros y las longitudes.</Aviso>
      )}

      {ctx.ok && modo === 'diseno' && hayPotencia && (
        <Panel titulo="Diámetros y longitudes para esta potencia" icono={Ruler}>
          {dSugerido ? (
            <p className="mb-3 text-sm text-foreground" data-prueba="capilar-recomendado">
              Recomendado: <b>Ø {fmt(dSugerido, 2)} mm</b> con <b>{fmt(tabla.find((r) => r.dmm === dSugerido).L, 2)} m</b> de longitud
              <span className="text-muted-foreground"> (la más cercana a 2,5 m dentro de {fmt(LONGITUD.corta, 1)} a {fmt(LONGITUD.larga, 0)} m).</span>
            </p>
          ) : (
            <Aviso nivel="aviso">Ningún diámetro de la lista da una longitud práctica ({fmt(LONGITUD.corta, 1)} a {fmt(LONGITUD.larga, 0)} m) para esta potencia. Prueba con otro diámetro, con varios capilares en paralelo o con una válvula de expansión.</Aviso>
          )}

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full max-w-none whitespace-nowrap text-sm" data-prueba="capilar-tabla">
              <thead>
                <tr className="border-b border-border bg-muted text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2">Ø int.</th>
                  <th className="px-2 py-2">Ø ext.</th>
                  <th className="px-2 py-2 text-right">Longitud (m)</th>
                  <th className="hidden px-2 py-2 text-right sm:table-cell">Líquido (m)</th>
                  <th className="hidden px-2 py-2 text-right sm:table-cell">P salida (bar)</th>
                  <th className="hidden px-2 py-2 sm:table-cell">Valoración</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {tabla.map((r) => (
                  <tr
                    key={r.dmm}
                    onClick={() => { if (!r.imposible) setDmmElegido(r.dmm); }}
                    className={`border-b border-border last:border-0 ${r.imposible ? '' : 'cursor-pointer hover:bg-muted/60'} ${r.dmm === dmm ? 'bg-primary/10' : ''}`}
                    data-prueba={`fila-d-${r.dmm}`}
                  >
                    <td className="tabular px-2 py-1.5 font-semibold text-foreground">{fmt(r.dmm, 2)}{!DIAMETROS_MM.includes(r.dmm) ? ' *' : ''}</td>
                    <td className="tabular px-2 py-1.5 text-foreground">{fmt(r.odmm, 2)}</td>
                    <td className="tabular px-2 py-1.5 text-right">
                      <span className="font-semibold text-foreground">{r.imposible ? '—' : fmt(r.L, 2)}</span>
                      <span className={`block text-[10px] font-medium sm:hidden ${COLOR_VALORACION[r.valoracion.clave]}`}>{r.valoracion.texto}</span>
                    </td>
                    <td className="tabular hidden px-2 py-1.5 text-right text-foreground sm:table-cell">{r.imposible ? '—' : fmt(r.Lliq, 2)}</td>
                    <td className="tabular hidden px-2 py-1.5 text-right text-foreground sm:table-cell">{r.imposible ? '—' : fmt(r.Psalida, 2)}</td>
                    <td className={`hidden px-2 py-1.5 font-medium sm:table-cell ${COLOR_VALORACION[r.valoracion.clave]}`}>{r.valoracion.texto}</td>
                    <td className="px-2 py-1.5 text-right">
                      <Button size="sm" variant={r.dmm === dmm ? 'default' : 'ghost'} disabled={r.imposible} onClick={() => setDmmElegido(r.dmm)} aria-label={`Elegir el diámetro ${fmt(r.dmm, 2)} milímetros`}>
                        {r.dmm === dmm ? 'Elegido' : 'Elegir'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {tabla.some((r) => !DIAMETROS_MM.includes(r.dmm)) && <p className="mt-1 text-[11px] text-muted-foreground">* Diámetro personalizado.</p>}

          <div className="mt-4">
            <p className="tech-label mb-1">Longitud necesaria según el diámetro (escala logarítmica; banda verde = longitud práctica)</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={datosGrafico} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="d" tickFormatter={(v) => String(v).replace('.', ',')} fontSize={11} stroke="currentColor" className="text-muted-foreground" />
                <YAxis scale="log" domain={[0.1, 100]} allowDataOverflow ticks={[0.1, 0.5, 1, 2, 4, 10, 30, 100]} tickFormatter={(v) => String(v).replace('.', ',')} fontSize={11} width={36} stroke="currentColor" className="text-muted-foreground" />
                <ReferenceArea y1={LONGITUD.minima} y2={LONGITUD.maxima} fill="#16a34a" fillOpacity={0.12} />
                <Tooltip
                  cursor={{ fill: 'rgba(148,163,184,0.15)' }}
                  formatter={(v, n, p) => [p.payload.L > 0 ? `${fmt(p.payload.L, 2)} m` : 'no pasa el caudal', 'Longitud']}
                  labelFormatter={(l) => `Ø ${fmt(l, 2)} mm`}
                />
                <Bar dataKey="Lg" radius={[3, 3, 0, 0]}>
                  {datosGrafico.map((r) => (
                    <Cell key={r.d} fill={COLOR_BARRA[r.clave]} fillOpacity={r.elegido ? 1 : 0.45} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      )}

      {/* ───────── Comprobar ───────── */}
      {ctx.ok && modo === 'comprobar' && !comprobacionValida && (
        <Aviso nivel="aviso">Escribe un diámetro interior entre 0,3 y 6 mm y una longitud entre 0,05 y 60 m.</Aviso>
      )}

      {ctx.ok && modo === 'comprobar' && selComprobar && (
        <Panel titulo="Lo que pasa este capilar" icono={Ruler}>
          {selComprobar.imposible ? (
            <Aviso nivel="error">No sale caudal con este capilar en estas condiciones.</Aviso>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4" data-prueba="capilar-capacidad">
                <Kpi etiqueta="Capacidad" valor={fmt(deWatios(selComprobar.Q, unidad), unidad === 'W' ? 0 : 2)} unidad={unidad} sub={textoPotencia(selComprobar.Q)} />
                <Kpi etiqueta="En kcal/h" valor={fmt(deWatios(selComprobar.Q, 'kcal/h'), 0)} />
                <Kpi etiqueta="En BTU/h" valor={fmt(deWatios(selComprobar.Q, 'BTU/h'), 0)} />
                <Kpi etiqueta="Caudal másico" valor={fmt(selComprobar.mdot * 1000, 3)} unidad="g/s" sub={`${fmt(selComprobar.mdot * 3600, 2)} kg/h`} />
              </div>
              {hayPotencia && (() => {
                const dif = (selComprobar.Q / potenciaW - 1) * 100;
                return (
                  <div className="mt-3">
                    <Aviso nivel={dif >= -5 ? 'info' : 'aviso'}>
                      {dif >= 0
                        ? `El capilar cubre la potencia pedida (${fmt(potenciaW, 0)} W) con un ${fmt(dif, 0)} % de margen.`
                        : `El capilar se queda un ${fmt(-dif, 0)} % por debajo de la potencia pedida (${fmt(potenciaW, 0)} W).`}
                    </Aviso>
                  </div>
                );
              })()}
              {cartaLongitud && (
                <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                  <table className="w-full min-w-[360px] max-w-none whitespace-nowrap text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                        <th className="px-2 py-2">Longitud</th><th className="px-2 py-2">Respecto al instalado</th><th className="px-2 py-2 text-right">Capacidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cartaLongitud.map((c) => (
                        <tr key={c.f} className={`border-b border-border last:border-0 ${c.f === 1 ? 'bg-primary/10 font-semibold' : ''}`}>
                          <td className="tabular px-2 py-1.5 text-foreground">{fmt(c.L, 2)} m</td>
                          <td className="px-2 py-1.5 text-foreground">{c.f === 1 ? 'instalado' : `${c.f > 1 ? '+' : ''}${fmt((c.f - 1) * 100, 0)} %`}</td>
                          <td className="tabular px-2 py-1.5 text-right text-foreground">{fmt(deWatios(c.Q, unidad), unidad === 'W' ? 0 : 2)} {unidad}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </Panel>
      )}

      {/* ───────── Carta ───────── */}
      {ctx.ok && modo === 'carta' && carta && (
        <Panel titulo={`Capacidad del capilar en ${unidad} (${gas}, Te ${fmt(Te, 1)} °C, Tc ${fmt(Tc, 1)} °C)`} icono={Ruler}>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[620px] max-w-none whitespace-nowrap text-sm" data-prueba="capilar-carta">
              <thead>
                <tr className="border-b border-border bg-muted text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="sticky left-0 z-10 bg-muted px-2 py-2 text-left">Ø int. ↓ · L →</th>
                  {LONGITUDES_CARTA.map((L) => <th key={L} className="px-2 py-2 text-right">{fmt(L, L % 1 ? 1 : 0)} m</th>)}
                </tr>
              </thead>
              <tbody>
                {carta.map((fila) => (
                  <tr key={fila.dmm} className="border-b border-border last:border-0">
                    <td className="tabular sticky left-0 z-10 bg-card px-2 py-1.5 font-semibold text-foreground">{fmt(fila.dmm, 2)} <span className="text-[11px] font-normal text-muted-foreground">mm</span></td>
                    {fila.celdas.map((c) => {
                      const rel = hayPotencia ? c.Q / potenciaW : null;
                      const cerca = rel !== null && rel >= 0.95 && rel <= 1.1;
                      const aprox = rel !== null && !cerca && rel >= 0.8 && rel <= 1.25;
                      return (
                        <td
                          key={c.L}
                          className={`tabular px-2 py-1.5 text-right text-foreground ${cerca ? 'bg-emerald-200 font-bold dark:bg-emerald-900/60' : aprox ? 'bg-amber-100 dark:bg-amber-900/40' : ''}`}
                        >
                          {fmt(deWatios(c.Q, unidad), unidad === 'W' ? 0 : 2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {hayPotencia
              ? `Verde: capacidad entre el 95 % y el 110 % de la potencia indicada (${fmt(potencia, 2)} ${unidad}). Ámbar: entre el 80 % y el 125 %.`
              : 'Escribe una potencia para resaltar las combinaciones que más se le acercan.'}
          </p>
        </Panel>
      )}

      {/* ───────── Detalle y esquemas ───────── */}
      {ctx.ok && sel && !sel.imposible && modo !== 'carta' && (
        <>
          <Panel titulo={`Detalle del capilar elegido: Ø ${fmt(sel.D * 1000, 2)} mm × ${fmt(modo === 'comprobar' ? lExistente : sel.L, 2)} m`} icono={Ruler}>
            <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2" data-prueba="capilar-detalle">
              <Dato etiqueta="Ø interior / exterior orientativo" valor={`${fmt(sel.D * 1000, 2)} / ${fmt(odmm, 2)} mm`} />
              <Dato etiqueta="Espesor de pared orientativo" valor={`${fmt((odmm - sel.D * 1000) / 2, 2)} mm`} />
              <Dato etiqueta="Longitud total" valor={`${fmt(sel.L, 3)} m`} />
              <Dato etiqueta="Corte inicial para el banco (+20 %)" valor={`${fmt(sel.L * 1.2, 2)} m`} />
              <Dato etiqueta="Tramo de líquido" valor={`${fmt(sel.Lliq, 3)} m (${fmt(sel.ratioLiq * 100, 0)} %)`} />
              <Dato etiqueta="Tramo de mezcla líquido-vapor" valor={`${fmt(sel.L2f, 3)} m`} />
              <Dato etiqueta="Presión al empezar a vaporizar" valor={`${fmt(sel.Pflash, 2)} bar`} />
              <Dato etiqueta="Presión a la salida" valor={`${fmt(sel.Psalida, 2)} bar`} />
              <Dato etiqueta="Temperatura a la salida" valor={`${fmt(sel.TSalida, 1)} °C`} />
              <Dato etiqueta="Vapor a la salida (en masa)" valor={`${fmt(sel.xSalida * 100, 0)} %`} />
              <Dato etiqueta="Velocidad entrada / salida" valor={`${fmt(sel.velEntrada, 2)} / ${fmt(sel.velSalida, 1)} m/s`} />
              <Dato etiqueta="Reynolds en el líquido" valor={fmt(sel.ReLiq, 0)} />
              <Dato etiqueta="Flujo en la salida" valor={sel.estrangulado ? 'Estrangulado (crítico)' : 'Subcrítico'} />
              {valoracion && <Dato etiqueta="Valoración de la longitud" valor={<span className={COLOR_VALORACION[valoracion.clave]}>{valoracion.texto}</span>} />}
            </div>
            {sens && (
              <p className="mt-3 text-xs text-muted-foreground" data-prueba="capilar-sensibilidad">
                Sensibilidad: si el capilar real sale un 10 % más largo, el caudal cambia un {fmt(sens.masLargo, 1)} %; si sale un 10 % más corto, un +{fmt(sens.masCorto, 1)} %. Por eso se corta siempre en el banco, partiendo de una longitud mayor.
              </p>
            )}
          </Panel>

          <Panel titulo="Esquemas" icono={Ruler}>
            <div className="mb-3 flex flex-wrap gap-x-5 gap-y-2">
              <Interruptor activo={conFiltro} onChange={setConFiltro} prueba="esquema-filtro">Filtro deshidratador</Interruptor>
              <Interruptor activo={conVisor} onChange={setConVisor} prueba="esquema-visor">Visor de líquido</Interruptor>
              <Interruptor activo={conSolenoide} onChange={setConSolenoide} prueba="esquema-solenoide">Electroválvula de líquido</Interruptor>
            </div>
            <div className="space-y-3">
              <EsquemaSVG svg={svgCircuito} titulo="Esquema del circuito frigorífico con tubo capilar" />
              <EsquemaSVG svg={svgCotas} titulo="Tubo capilar con sus dimensiones" />
              <EsquemaSVG svg={svgPerfil} titulo="Presión y temperatura a lo largo del capilar" />
            </div>
          </Panel>
        </>
      )}

      {ctx.ok && sel?.imposible && modo !== 'carta' && (
        <Aviso nivel="error">{avisosResultado(ctx, sel)[0]?.texto}</Aviso>
      )}

      {ctx.ok && avisos.length > 0 && modo !== 'carta' && (
        <div className="space-y-2" data-prueba="capilar-avisos">
          {avisos.map((a, i) => <Aviso key={i} nivel={a.nivel}>{a.texto}</Aviso>)}
        </div>
      )}

      {/* ───────── Cliente, informe y guardado ───────── */}
      {modo !== 'carta' && (
        <Panel titulo="Informe y ficha del cliente" icono={Save}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo etiqueta="Cliente (escribe el nombre, NIF o teléfono)">
              <BuscadorCliente contacts={contactos} value={contactId} onValueChange={(id) => { setContactId(id); setGuardado(null); }} />
            </Campo>
            <Campo etiqueta="Equipo o instalación">
              <Input value={equipo.descripcion} onChange={(e) => setEquipo({ ...equipo, descripcion: e.target.value })} placeholder="Ej.: arcón congelador 300 L" className="bg-background text-foreground" aria-label="Descripción del equipo" />
            </Campo>
            <Campo etiqueta="Ubicación">
              <Input value={equipo.ubicacion} onChange={(e) => setEquipo({ ...equipo, ubicacion: e.target.value })} placeholder="Ej.: cocina, planta baja" className="bg-background text-foreground" aria-label="Ubicación del equipo" />
            </Campo>
            <Campo etiqueta="Notas para el informe">
              <Input value={equipo.notas} onChange={(e) => setEquipo({ ...equipo, notas: e.target.value })} placeholder="Ej.: compresor, motivo del cambio…" className="bg-background text-foreground" aria-label="Notas del informe" />
            </Campo>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button onClick={imprimir} disabled={!puedeInformar} data-prueba="capilar-imprimir">
              <Printer className="mr-1.5 h-4 w-4" /> Imprimir / guardar PDF
            </Button>
            <Button variant="outline" onClick={guardarEnFicha} disabled={!puedeInformar || !contacto || guardando} data-prueba="capilar-guardar">
              {guardando ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              Guardar en la ficha del cliente
            </Button>
            {!contacto && <span className="text-xs text-muted-foreground">Elige un cliente para poder guardarlo en su ficha.</span>}
          </div>

          {guardado && (
            <div className="mt-3" data-prueba="capilar-guardado">
              <Aviso nivel={guardado.ok ? 'info' : 'error'}>
                {guardado.ok && <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />}
                {guardado.texto}
              </Aviso>
            </div>
          )}
        </Panel>
      )}

      <section className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        <p className="mb-1 flex items-center gap-1.5 font-semibold text-foreground"><Info className="h-3.5 w-3.5" /> Cómo se calcula y hasta dónde llega</p>
        <ul className="list-disc space-y-0.5 pl-5">
          {SUPUESTOS_CAPILAR.map((s) => <li key={s}>{s}</li>)}
        </ul>
      </section>
    </div>
  );
}
