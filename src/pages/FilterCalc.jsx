import React, { useEffect, useMemo, useState } from 'react';
import { Filter, Printer, Save, Info, CheckCircle2, Loader2, Activity, Ruler, Gauge } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberField } from '@/components/ui/number-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import BuscadorCliente, { nombreCompleto } from '@/components/BuscadorCliente';
import EsquemaSVG from '@/components/EsquemaSVG';
import { Campo, Panel, Kpi, Dato, Aviso, Interruptor } from '@/components/PiezasCalculo';
import { asArray } from '@/lib/asArray';
import { useParametrosUrl } from '@/lib/parametrosUrl';
import { uploadFile } from '@/lib/uploadImage';
import { printDocument } from '@/lib/printHelper';
import { generarPdfBlobDesdeHtml } from '@/lib/compartirDocumentoWhatsApp';
import { buscarRefrigerante, ESTADOS } from '@/lib/refrigerantes';
import { APLICACIONES, listaGases } from '@/lib/capilar';
import { UNIDADES_POTENCIA, aWatios, textoPotencia } from '@/lib/potencia';
import { esquemaCircuito, fmt } from '@/lib/esquemasFrigorificos';
import { TUBOS_COBRE } from '@/lib/tubosCobre';
import {
  CASOS_FILTRO, MONTAJE_FILTRO, REFERENCIA_CATALOGO, DP_OBJETIVO, VELOCIDAD_LIQUIDO, UMBRAL_MARGEN,
  avisosFiltro, calcularFiltro, tablaTubos, tuboSugerido,
} from '@/lib/filtro';
import { htmlInformeFiltro, referenciaInformeFiltro } from '@/lib/informeFiltro';

const GASES = listaGases();
const ESTILO_CAMPO = 'tabular bg-background text-foreground';
const COLOR_VEL = {
  optima: 'text-emerald-700 dark:text-emerald-400',
  alta: 'text-amber-700 dark:text-amber-400',
  muyalta: 'text-red-700 dark:text-red-400',
  sin: 'text-muted-foreground',
};

export default function FilterCalc() {
  const urlParams = useParametrosUrl();
  const urlContactId = urlParams.get('contact_id');

  const [aplicId, setAplicId] = useState('camara-mt');
  const [gas, setGas] = useState('R-404A');
  const [Te, setTe] = useState(-10);
  const [Tc, setTc] = useState(40);
  const [subenf, setSubenf] = useState(3);
  const [recal, setRecal] = useState(6);
  const [potencia, setPotencia] = useState(2);
  const [unidad, setUnidad] = useState('kW');
  const [casoId, setCasoId] = useState('nueva');

  // línea de líquido
  const [tuboOd, setTuboOd] = useState('1/2"');
  const [idPropio, setIdPropio] = useState('');
  const [desnivel, setDesnivel] = useState('');
  const [dpOtros, setDpOtros] = useState('');

  // filtro del catálogo
  const [filtroModelo, setFiltroModelo] = useState('');
  const [capCat, setCapCat] = useState('');
  const [unidadCat, setUnidadCat] = useState('kW');
  const [dpCat, setDpCat] = useState(REFERENCIA_CATALOGO.dp);
  const [teRef, setTeRef] = useState(REFERENCIA_CATALOGO.TeRef);
  const [tliqRef, setTliqRef] = useState(REFERENCIA_CATALOGO.TliqRef);
  const [dpObjetivo, setDpObjetivo] = useState(DP_OBJETIVO);

  // esquema
  const [expansion, setExpansion] = useState('vet');
  const [conVisor, setConVisor] = useState(true);
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

  // Al cambiar de gas, las temperaturas se acomodan a su rango
  useEffect(() => {
    const g = GASES.find((x) => x.id === gas);
    if (!g) return;
    setTe((v) => Math.min(Math.max(v, g.TeMin), g.TcMax - 1));
    setTc((v) => Math.min(Math.max(v, g.TeMin + 1), g.TcMax));
  }, [gas]);

  const editar = (setter) => (v) => { setter(v); setAplicId('personalizada'); };

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
  const potenciaW = aWatios(potencia, unidad);
  const tuboElegido = TUBOS_COBRE.find((t) => t.od === tuboOd) || TUBOS_COBRE[2];
  const idMm = idPropio > 0 ? idPropio : tuboElegido.id;
  const capCatW = capCat > 0 ? aWatios(capCat, unidadCat) : 0;
  const catalogo = capCatW > 0 ? { Q: capCatW, dp: dpCat > 0 ? dpCat : REFERENCIA_CATALOGO.dp, TeRef: teRef, TliqRef: tliqRef } : null;

  const r = useMemo(
    () => calcularFiltro({
      gas, Te, Tc, subenf, recal, potenciaW, idMm,
      catalogo: catalogo || { dp: dpCat > 0 ? dpCat : REFERENCIA_CATALOGO.dp, TeRef: teRef, TliqRef: tliqRef },
      desnivel: Number(desnivel) || 0,
      dpOtros: Number(dpOtros) || 0,
      dpObjetivo,
    }),
    [gas, Te, Tc, subenf, recal, potenciaW, idMm, capCatW, dpCat, teRef, tliqRef, desnivel, dpOtros, dpObjetivo],
  );

  const tubos = useMemo(() => (r.ok ? tablaTubos(r.ctx, r.mdot, TUBOS_COBRE) : []), [r]);
  const sugerido = useMemo(() => tuboSugerido(tubos), [tubos]);
  const avisos = useMemo(() => (r.ok ? avisosFiltro(r) : []), [r]);
  const hayPotencia = potenciaW > 0;
  const caso = CASOS_FILTRO.find((c) => c.id === casoId);

  /* ── Esquema ── */
  const svgCircuito = useMemo(() => {
    if (!r.ok) return '';
    return esquemaCircuito({
      expansion,
      filtro: true,
      visor: conVisor,
      solenoide: conSolenoide,
      resaltar: 'filtro',
      titulo: 'Circuito frigorífico con filtro deshidratador',
      etiquetas: {
        gas,
        Pc: `${fmt(r.ctx.Pc, 2)} bar`,
        Tc: `${fmt(r.ctx.Tc, 1)} °C`,
        Pe: `${fmt(r.ctx.Pe, 2)} bar`,
        Te: `${fmt(r.ctx.Te, 1)} °C`,
        filtro: r.capacidadMinimaW ? `≥ ${textoPotencia(r.capacidadMinimaW)} (catálogo)` : '',
        caudal: `${textoPotencia(potenciaW)} · ${fmt(r.mdot * 1000, 2)} g/s · línea de líquido ${tuboElegido.od}`,
      },
    });
  }, [r, expansion, conVisor, conSolenoide, gas, potenciaW, tuboElegido]);

  /* ── Informe ── */
  const aplicacionNombre = aplicId === 'personalizada' ? 'Personalizada' : APLICACIONES.find((a) => a.id === aplicId)?.nombre;

  const construirInforme = () => {
    const fecha = new Date();
    const referencia = referenciaInformeFiltro(fecha);
    const cliente = contacto
      ? {
          nombre: nombreCompleto(contacto),
          nif: contacto.nif,
          direccion: [contacto.address, contacto.postal_code, contacto.city].filter(Boolean).join(', '),
          telefono: contacto.phone || contacto.mobile,
          email: contacto.email,
        }
      : null;
    const html = htmlInformeFiltro({
      referencia, fecha, empresa, cliente, equipo,
      resultado: r, gasNombre: gas, aplicacionNombre, potenciaW,
      tubos, tuboSugerido: sugerido, idMm,
      catalogo, filtroModelo, desnivel: Number(desnivel) || 0,
      casoId, svgCircuito,
    });
    return { html, referencia, fecha };
  };

  const puedeInformar = !!(r.ok && hayPotencia);

  const imprimir = async () => {
    if (!puedeInformar) return;
    const { html, referencia } = construirInforme();
    await printDocument(html, `Filtro deshidratador ${referencia}`);
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
        console.error('[FilterCalc] No se pudo generar el PDF, se guarda en HTML:', e);
      }
      let url = null;
      if (fichero) {
        try {
          url = await uploadFile(fichero);
        } catch (e) {
          console.error('[FilterCalc] No se pudo guardar el PDF, se prueba con HTML:', e);
        }
      }
      if (!url) {
        formato = 'HTML';
        url = await uploadFile(new File([html], `${referencia}.html`, { type: 'text/html' }));
      }
      await base44.entities.ClientDocument.create({
        contact_id: contacto.id,
        contact_name: nombreCompleto(contacto),
        title: `Filtro deshidratador — ${gas} — ${textoPotencia(potenciaW)}${filtroModelo ? ` — ${filtroModelo}` : ''}`,
        doc_type: 'calculo_termico',
        file_url: url,
        description: JSON.stringify({
          tipo: 'filtro',
          referencia,
          gas,
          Te,
          Tc,
          subenfriamiento: subenf,
          recalentamiento: recal,
          potenciaW: Math.round(potenciaW),
          caudal_g_s: Number((r.mdot * 1000).toFixed(3)),
          capacidadMinimaW: r.capacidadMinimaW ? Math.round(r.capacidadMinimaW) : null,
          filtro: filtroModelo || null,
          tubo: tuboElegido.od,
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

  const estadoGas = fichaGas ? ESTADOS[fichaGas.estado] : null;
  const hayFiltro = r.ok && r.dpFiltro != null;

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-3 sm:p-5" data-prueba="filtro-calc">
      <header className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-600 text-white">
          <Filter className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-tight text-foreground">Filtro deshidratador</h1>
          <p className="text-sm text-muted-foreground">
            Qué capacidad debe tener el filtro según la potencia frigorífica y el gas, velocidad en la línea de líquido, caída de presión con el filtro de tu catálogo y riesgo de vapor antes de la válvula.
          </p>
        </div>
      </header>

      {/* ───────── Condiciones ───────── */}
      <Panel titulo="Condiciones de trabajo" icono={Activity}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo etiqueta="Aplicación (rellena las temperaturas)">
            <Select value={aplicId} onValueChange={elegirAplicacion}>
              <SelectTrigger className="bg-background text-foreground" data-prueba="filtro-aplicacion"><SelectValue placeholder="Personalizada" /></SelectTrigger>
              <SelectContent>
                {APLICACIONES.map((a) => <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>)}
                <SelectItem value="personalizada">Personalizada</SelectItem>
              </SelectContent>
            </Select>
          </Campo>
          <Campo etiqueta="Refrigerante" ayuda={infoGas?.mezcla ? `Mezcla (en masa): ${infoGas.composicion}` : 'Sustancia pura'}>
            <Select value={gas} onValueChange={setGas}>
              <SelectTrigger className="bg-background text-foreground" data-prueba="filtro-gas"><SelectValue /></SelectTrigger>
              <SelectContent>
                {GASES.map((g) => <SelectItem key={g.id} value={g.id}>{g.id}{g.mezcla ? ' · mezcla' : ''}</SelectItem>)}
              </SelectContent>
            </Select>
          </Campo>
        </div>

        {(fichaGas || infoGas) && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
            {infoGas?.clase && <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-foreground">Seguridad {infoGas.clase}</span>}
            {fichaGas?.aceite && <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-foreground">Aceite {fichaGas.aceite}</span>}
            {fichaGas?.gwp != null && <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-foreground">GWP {fichaGas.gwp}</span>}
            {estadoGas && <span className={`rounded border px-1.5 py-0.5 ${estadoGas.color}`}>{estadoGas.etiqueta}</span>}
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Campo etiqueta="T. evaporación (°C)" ayuda={`Rocío. Desde ${infoGas.TeMin} °C`}>
            <NumberField value={Te} onChange={editar(setTe)} className={ESTILO_CAMPO} aria-label="Temperatura de evaporación en grados" data-prueba="filtro-te" />
          </Campo>
          <Campo etiqueta="T. condensación (°C)" ayuda={`Rocío. Hasta ${infoGas.TcMax} °C`}>
            <NumberField value={Tc} onChange={editar(setTc)} className={ESTILO_CAMPO} aria-label="Temperatura de condensación en grados" data-prueba="filtro-tc" />
          </Campo>
          <Campo etiqueta="Subenfriamiento (K)" ayuda="Típico 3 a 10 K">
            <NumberField value={subenf} onChange={editar(setSubenf)} className={ESTILO_CAMPO} aria-label="Subenfriamiento en kelvin" data-prueba="filtro-subenf" />
          </Campo>
          <Campo etiqueta="Recalentamiento (K)" ayuda="El útil, en el evaporador">
            <NumberField value={recal} onChange={editar(setRecal)} className={ESTILO_CAMPO} aria-label="Recalentamiento en kelvin" data-prueba="filtro-recal" />
          </Campo>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Campo etiqueta="Potencia frigorífica">
            <NumberField value={potencia} onChange={setPotencia} className={ESTILO_CAMPO} aria-label="Potencia frigorífica" data-prueba="filtro-potencia" />
          </Campo>
          <Campo etiqueta="Unidad">
            <Select value={unidad} onValueChange={setUnidad}>
              <SelectTrigger className="bg-background text-foreground" data-prueba="filtro-unidad"><SelectValue /></SelectTrigger>
              <SelectContent>{UNIDADES_POTENCIA.map((u) => <SelectItem key={u.id} value={u.id}>{u.etiqueta}</SelectItem>)}</SelectContent>
            </Select>
          </Campo>
          <div className="col-span-2">
            <Campo etiqueta="Caso" ayuda="Decide el tipo de filtro y dónde va">
              <Select value={casoId} onValueChange={setCasoId}>
                <SelectTrigger className="bg-background text-foreground" data-prueba="filtro-caso"><SelectValue /></SelectTrigger>
                <SelectContent>{CASOS_FILTRO.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </Campo>
          </div>
        </div>
        {caso && <p className="mt-2 text-xs text-muted-foreground" data-prueba="filtro-caso-texto">{caso.texto}</p>}
      </Panel>

      {!r.ok && <Aviso nivel="error">{r.error}</Aviso>}

      {r.ok && (
        <section className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6" data-prueba="filtro-kpis" aria-label="Resultado">
          <Kpi etiqueta="Caudal de refrigerante" valor={fmt(r.mdot * 1000, 2)} unidad="g/s" sub={`${fmt(r.mdot * 3600, 1)} kg/h`} />
          <Kpi etiqueta="Caudal de líquido" valor={fmt(r.caudalLmin, 2)} unidad="L/min" sub={`ρ ${fmt(r.rho, 0)} kg/m³`} />
          <Kpi etiqueta="Velocidad en la línea" valor={fmt(r.velocidad, 2)} unidad="m/s" sub={`tubo ${tuboElegido.od}${idPropio > 0 ? ' (Ø propio)' : ''} · ${r.valoracionVelocidad.texto.toLowerCase()}`} />
          <Kpi etiqueta="Margen de subenfriamiento" valor={fmt(r.margenBar, 2)} unidad="bar" sub={`${fmt(subenf, 1)} K antes de formar vapor`} />
          <Kpi etiqueta="Efecto frigorífico" valor={fmt(r.qEfecto, 1)} unidad="kJ/kg" sub={`líquido a ${fmt(r.ctx.Tin, 1)} °C`} />
          <div className="rounded-lg border-2 border-amber-500/60 bg-amber-50 p-2.5 dark:bg-amber-950/30" data-prueba="filtro-capacidad-minima">
            <p className="tech-label text-amber-800 dark:text-amber-300">Capacidad de catálogo mínima</p>
            <p className="tabular text-lg font-bold leading-tight text-foreground">
              {r.capacidadMinimaW ? textoPotencia(r.capacidadMinimaW, r.capacidadMinimaW < 10000 ? 0 : 1) : '—'}
            </p>
            <p className="text-[11px] text-muted-foreground">para ≤ {fmt(dpObjetivo, 3)} bar</p>
          </div>
        </section>
      )}

      {r.ok && r.capacidadMinimaW > 0 && (
        <Aviso nivel="info">
          <b>Cómo usar la capacidad mínima:</b> mira en el catálogo del fabricante, para {gas}, un filtro cuya capacidad (la que da el catálogo, a {fmt(catalogo?.dp ?? dpCat, 3)} bar con evaporación a {fmt(teRef, 0)} °C y líquido a {fmt(tliqRef, 0)} °C)
          sea igual o mayor que {textoPotencia(r.capacidadMinimaW)}. Después escribe abajo su capacidad para comprobar la caída de presión real. No se incluyen capacidades de marcas: salen de TU catálogo.
        </Aviso>
      )}

      {/* ───────── Línea de líquido ───────── */}
      {r.ok && (
        <Panel titulo="Línea de líquido: velocidad según el tubo" icono={Ruler}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Campo etiqueta="Tubo de la línea de líquido">
              <Select value={tuboOd} onValueChange={(v) => { setTuboOd(v); setIdPropio(''); }}>
                <SelectTrigger className="bg-background text-foreground" data-prueba="filtro-tubo"><SelectValue /></SelectTrigger>
                <SelectContent>{TUBOS_COBRE.map((t) => <SelectItem key={t.od} value={t.od}>{t.od} (Ø int. {fmt(t.id, 2)} mm)</SelectItem>)}</SelectContent>
              </Select>
            </Campo>
            <Campo etiqueta="Ø interior propio (mm)" ayuda="Si mides el tubo">
              <NumberField value={idPropio} onChange={setIdPropio} className={ESTILO_CAMPO} aria-label="Diámetro interior propio en milímetros" data-prueba="filtro-id-propio" />
            </Campo>
            <Campo etiqueta="Subida de la línea (m)" ayuda="Líquido que sube hasta la válvula">
              <NumberField value={desnivel} onChange={setDesnivel} className={ESTILO_CAMPO} aria-label="Desnivel de subida en metros" data-prueba="filtro-desnivel" />
            </Campo>
            <Campo etiqueta="Otras pérdidas (bar)" ayuda="Visor, electroválvula, tubo…">
              <NumberField value={dpOtros} onChange={setDpOtros} className={ESTILO_CAMPO} aria-label="Otras pérdidas de presión en bar" data-prueba="filtro-dp-otros" />
            </Campo>
          </div>

          <div className="mt-3 overflow-x-auto rounded-lg border border-border">
            <table className="w-full max-w-none whitespace-nowrap text-sm" data-prueba="filtro-tabla-tubos">
              <thead>
                <tr className="border-b border-border bg-muted text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2">Tubo</th><th className="px-2 py-2 text-right">Ø int. (mm)</th><th className="px-2 py-2 text-right">Velocidad (m/s)</th><th className="px-2 py-2">Valoración</th><th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {tubos.map((t) => (
                  <tr key={t.od} className={`border-b border-border last:border-0 ${t.od === tuboOd && !(idPropio > 0) ? 'bg-primary/10' : ''}`} data-prueba={`fila-tubo-${t.od}`}>
                    <td className="px-2 py-1.5 font-semibold text-foreground">{t.od}{sugerido && t.od === sugerido.od ? ' ★' : ''}</td>
                    <td className="tabular px-2 py-1.5 text-right text-foreground">{fmt(t.id, 2)}</td>
                    <td className="tabular px-2 py-1.5 text-right font-semibold text-foreground">{fmt(t.v, 2)}</td>
                    <td className={`px-2 py-1.5 font-medium ${COLOR_VEL[t.valoracion.clave]}`}>{t.valoracion.texto}</td>
                    <td className="px-2 py-1.5 text-right">
                      <Button size="sm" variant={t.od === tuboOd && !(idPropio > 0) ? 'default' : 'ghost'} onClick={() => { setTuboOd(t.od); setIdPropio(''); }} aria-label={`Elegir el tubo ${t.od}`}>
                        {t.od === tuboOd && !(idPropio > 0) ? 'Elegido' : 'Elegir'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            ★ Tubo más pequeño con velocidad adecuada (hasta {fmt(VELOCIDAD_LIQUIDO.optima, 1)} m/s; hasta {fmt(VELOCIDAD_LIQUIDO.maxima, 1)} m/s es alta). El Ø interior es el típico: con un tubo de pared distinta, escribe el tuyo.
            El filtro no debe tener una conexión menor que el tubo de la línea.
          </p>
        </Panel>
      )}

      {/* ───────── Filtro del catálogo ───────── */}
      {r.ok && (
        <Panel titulo="Comprobar un filtro de tu catálogo" icono={Gauge}>
          <p className="mb-3 text-xs text-muted-foreground">
            Escribe lo que dice el catálogo del filtro que piensas montar. Las capacidades suelen darse a {fmt(REFERENCIA_CATALOGO.dp, 2)} bar de caída de presión, con evaporación a {fmt(REFERENCIA_CATALOGO.TeRef, 0)} °C y líquido a {fmt(REFERENCIA_CATALOGO.TliqRef, 0)} °C: si el tuyo usa otras, cámbialas aquí.
          </p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="col-span-2">
              <Campo etiqueta="Modelo del filtro (opcional)">
                <Input value={filtroModelo} onChange={(e) => setFiltroModelo(e.target.value)} placeholder="Ej.: marca y referencia" className="bg-background text-foreground" aria-label="Modelo del filtro" data-prueba="filtro-modelo" />
              </Campo>
            </div>
            <Campo etiqueta="Capacidad de catálogo" ayuda={`Para ${gas}`}>
              <NumberField value={capCat} onChange={setCapCat} className={ESTILO_CAMPO} aria-label="Capacidad de catálogo del filtro" data-prueba="filtro-cap-cat" />
            </Campo>
            <Campo etiqueta="Unidad">
              <Select value={unidadCat} onValueChange={setUnidadCat}>
                <SelectTrigger className="bg-background text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent>{UNIDADES_POTENCIA.map((u) => <SelectItem key={u.id} value={u.id}>{u.etiqueta}</SelectItem>)}</SelectContent>
              </Select>
            </Campo>
            <Campo etiqueta="Caída de presión del catálogo (bar)">
              <NumberField value={dpCat} onChange={setDpCat} className={ESTILO_CAMPO} aria-label="Caída de presión del catálogo en bar" data-prueba="filtro-dp-cat" />
            </Campo>
            <Campo etiqueta="Evaporación del catálogo (°C)">
              <NumberField value={teRef} onChange={setTeRef} className={ESTILO_CAMPO} aria-label="Temperatura de evaporación del catálogo" data-prueba="filtro-te-ref" />
            </Campo>
            <Campo etiqueta="Líquido del catálogo (°C)">
              <NumberField value={tliqRef} onChange={setTliqRef} className={ESTILO_CAMPO} aria-label="Temperatura del líquido del catálogo" data-prueba="filtro-tliq-ref" />
            </Campo>
            <Campo etiqueta="Caída máxima admitida (bar)" ayuda="Filtro nuevo">
              <NumberField value={dpObjetivo} onChange={setDpObjetivo} className={ESTILO_CAMPO} aria-label="Caída de presión máxima admitida en bar" data-prueba="filtro-dp-objetivo" />
            </Campo>
          </div>

          {hayFiltro ? (
            <div className="mt-4 space-y-3" data-prueba="filtro-comprobacion">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <Kpi etiqueta="Carga del filtro" valor={fmt(r.cargaFiltro * 100, 0)} unidad="%" sub="de su caudal nominal" />
                <Kpi etiqueta="Caída del filtro nuevo" valor={fmt(r.dpFiltro, 3)} unidad="bar" sub={r.dpFiltroOk ? 'dentro del objetivo' : 'por encima del objetivo'} />
                <Kpi etiqueta="Pérdida total de la línea" valor={fmt(r.dpTotal, 3)} unidad="bar" sub={`subida ${fmt(r.dpEstatica, 3)} · otras ${fmt(r.dpOtros, 3)}`} />
                <Kpi etiqueta="Margen consumido" valor={fmt(r.usoMargen * 100, 0)} unidad="%" sub={r.hayVapor ? 'hay vapor antes de la válvula' : `aviso desde el ${fmt(UMBRAL_MARGEN.aviso * 100, 0)} %`} />
              </div>
              <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                <Dato etiqueta="Presión al final de la línea" valor={`${fmt(r.pFinal, 2)} bar`} />
                <Dato etiqueta="Vapor antes de la válvula" valor={r.hayVapor ? 'Sí: el líquido hierve' : 'No'} />
              </div>
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">Escribe la capacidad de catálogo del filtro para ver su caída de presión con este caudal.</p>
          )}
        </Panel>
      )}

      {r.ok && avisos.length > 0 && (
        <div className="space-y-2" data-prueba="filtro-avisos">
          {avisos.map((a, i) => <Aviso key={i} nivel={a.nivel}>{a.texto}</Aviso>)}
        </div>
      )}

      {/* ───────── Esquema ───────── */}
      {r.ok && (
        <Panel titulo="Esquema del circuito" icono={Filter}>
          <div className="mb-3 flex flex-wrap gap-x-5 gap-y-2">
            <Interruptor activo={expansion === 'vet'} onChange={(v) => setExpansion(v ? 'vet' : 'capilar')} prueba="esquema-vet">Válvula de expansión (si no, capilar)</Interruptor>
            <Interruptor activo={conVisor} onChange={setConVisor} prueba="esquema-visor">Visor de líquido</Interruptor>
            <Interruptor activo={conSolenoide} onChange={setConSolenoide} prueba="esquema-solenoide">Electroválvula de líquido</Interruptor>
          </div>
          <EsquemaSVG svg={svgCircuito} titulo="Esquema del circuito frigorífico con el filtro deshidratador señalado" />
          <ul className="mt-3 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
            {MONTAJE_FILTRO.map((m) => <li key={m}>{m}</li>)}
          </ul>
        </Panel>
      )}

      {/* ───────── Cliente, informe y guardado ───────── */}
      <Panel titulo="Informe y ficha del cliente" icono={Save}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo etiqueta="Cliente (escribe el nombre, NIF o teléfono)">
            <BuscadorCliente contacts={contactos} value={contactId} onValueChange={(id) => { setContactId(id); setGuardado(null); }} />
          </Campo>
          <Campo etiqueta="Equipo o instalación">
            <Input value={equipo.descripcion} onChange={(e) => setEquipo({ ...equipo, descripcion: e.target.value })} placeholder="Ej.: cámara de conservación 20 m³" className="bg-background text-foreground" aria-label="Descripción del equipo" />
          </Campo>
          <Campo etiqueta="Ubicación">
            <Input value={equipo.ubicacion} onChange={(e) => setEquipo({ ...equipo, ubicacion: e.target.value })} placeholder="Ej.: trastienda" className="bg-background text-foreground" aria-label="Ubicación del equipo" />
          </Campo>
          <Campo etiqueta="Notas para el informe">
            <Input value={equipo.notas} onChange={(e) => setEquipo({ ...equipo, notas: e.target.value })} placeholder="Ej.: motivo del cambio…" className="bg-background text-foreground" aria-label="Notas del informe" />
          </Campo>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button onClick={imprimir} disabled={!puedeInformar} data-prueba="filtro-imprimir">
            <Printer className="mr-1.5 h-4 w-4" /> Imprimir / guardar PDF
          </Button>
          <Button variant="outline" onClick={guardarEnFicha} disabled={!puedeInformar || !contacto || guardando} data-prueba="filtro-guardar">
            {guardando ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            Guardar en la ficha del cliente
          </Button>
          {!contacto && <span className="text-xs text-muted-foreground">Elige un cliente para poder guardarlo en su ficha.</span>}
        </div>

        {guardado && (
          <div className="mt-3" data-prueba="filtro-guardado">
            <Aviso nivel={guardado.ok ? 'info' : 'error'}>
              {guardado.ok && <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />}
              {guardado.texto}
            </Aviso>
          </div>
        )}
      </Panel>

      <section className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        <p className="mb-1 flex items-center gap-1.5 font-semibold text-foreground"><Info className="h-3.5 w-3.5" /> Cómo se calcula y hasta dónde llega</p>
        <ul className="list-disc space-y-0.5 pl-5">
          <li>El caudal es la potencia dividida por el efecto frigorífico, con las propiedades del gas (CoolProp): vapor a la salida del evaporador menos líquido subenfriado a la entrada de la válvula.</li>
          <li>La caída de presión del filtro se escala desde la capacidad de TU catálogo: crece con el cuadrado del caudal y baja con la densidad del líquido.</li>
          <li>El subenfriamiento es un margen de presión: si las pérdidas de la línea lo agotan, llega vapor a la válvula.</li>
          <li>La capacidad de agua del filtro, el tipo de núcleo y la compatibilidad con el gas y el aceite se miran en el catálogo del fabricante: aquí no se calculan.</li>
        </ul>
      </section>
    </div>
  );
}
