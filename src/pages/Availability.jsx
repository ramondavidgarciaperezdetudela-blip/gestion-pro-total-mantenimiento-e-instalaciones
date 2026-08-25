import React, { useState, useEffect, useMemo } from 'react';
import BuscadorCliente from '@/components/BuscadorCliente';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CalendarCheck, Clock, RefreshCw, CheckCircle2, AlertCircle, Phone, User, Info, Ban,
  MessageCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  disponibilidadProximosDias, HORARIO_POR_DEFECTO,
  TIPOS_TRABAJO, tipoTrabajo, cabeTrabajo,
} from '@/lib/availability';
import { abrirWhatsApp, enlaceWhatsApp, mensajeConfirmacionCita } from '@/lib/whatsapp';

/**
 * Disponibilidad — qué días y horas quedan libres.
 *
 * Pensada para usarla con el cliente al teléfono: se elige el tipo de trabajo,
 * se ve de un vistazo en qué horas cabe entero, se pulsa una y queda la cita
 * creada con los datos del cliente. Al reservar se avisa por correo.
 *
 * Lo importante: cada trabajo ocupa lo suyo. Un montaje se lleva la mañana y
 * una revisión son dos horas, así que la pantalla no ofrece una hora suelta,
 * ofrece las horas donde CABE el trabajo entero descontando lo ya apuntado.
 *
 * Los huecos se calculan descontando las citas de la agenda Y las órdenes SAT
 * ya programadas, para que no se ofrezca una hora en la que ya hay trabajo.
 */

const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function fechaBonita(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  const fecha = new Date(a, m - 1, d);
  const dia = fecha.getDay() === 0 ? 7 : fecha.getDay();
  return { diaNombre: DIAS[dia], diaMes: `${d}/${m}` };
}

export default function Availability() {
  const [citas, setCitas] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [contactos, setContactos] = useState([]);
  const [empresa, setEmpresa] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Trabajo elegido: manda sobre cuántas horas se reservan.
  const [tipoId, setTipoId] = useState('revision');
  const [horas, setHoras] = useState(tipoTrabajo('revision').horas);

  // Reserva
  const [hueco, setHueco] = useState(null); // { fecha, inicio }
  const [form, setForm] = useState({ contact_id: '', contact_name: '', phone: '', title: '', notes: '' });
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState('');
  // Cita recién reservada: se guarda para ofrecer mandarle la confirmación
  // por WhatsApp sin tener que ir a buscarla a la agenda.
  const [recienReservada, setRecienReservada] = useState(null);

  const trabajo = tipoTrabajo(tipoId);
  const minutos = Math.max(15, Math.round((Number(horas) || 1) * 60));

  const cargar = async () => {
    setCargando(true);
    setError('');
    // allSettled: que un fallo en una entidad no deje la pantalla en blanco.
    const r = await Promise.allSettled([
      base44.entities.Appointment.list('-date', 300),
      // Por fecha programada, no por fecha de alta: interesa lo que viene, y una
      // orden creada hace meses puede estar programada para la semana que viene.
      base44.entities.SATOrder.list('-scheduled_date', 300),
      base44.entities.Contact.list('name', 300),
      base44.entities.CompanySettings.list(),
    ]);
    setCitas(r[0].status === 'fulfilled' ? r[0].value : []);
    setOrdenes(r[1].status === 'fulfilled' ? r[1].value : []);
    setContactos(r[2].status === 'fulfilled' ? r[2].value : []);
    setEmpresa(r[3].status === 'fulfilled' ? (r[3].value?.[0] || null) : null);
    if (r[0].status === 'rejected') setError('No se pudieron cargar las citas. Los huecos mostrados pueden no ser exactos.');
    setCargando(false);
  };

  useEffect(() => { cargar(); }, []);

  const horario = empresa?.availability_config || HORARIO_POR_DEFECTO;

  const dias = useMemo(
    () => disponibilidadProximosDias(horario, citas, ordenes, new Date(), minutos),
    [horario, citas, ordenes, minutos]
  );

  const totalCaben = dias.reduce((s, d) => s + (d.caben || 0), 0);

  const elegirTipo = (id) => {
    setTipoId(id);
    setHoras(tipoTrabajo(id).horas); // se propone su duración; se puede cambiar
  };

  const abrirReserva = (fecha, h) => {
    setHueco({ fecha, inicio: h.inicio });
    setForm({
      contact_id: '', contact_name: '', phone: '',
      title: trabajo.bloquea ? trabajo.nombre : '',
      notes: '',
    });
    setAviso('');
  };

  const elegirContacto = (id) => {
    const c = contactos.find(x => x.id === id);
    setForm(prev => ({
      ...prev,
      contact_id: id,
      contact_name: c ? `${c.name || ''} ${c.surname || ''}`.trim() : prev.contact_name,
      phone: c?.phone || prev.phone,
    }));
  };

  // Comprobación en vivo de la reserva que se está a punto de hacer.
  const revision = hueco
    ? cabeTrabajo(hueco.fecha, hueco.inicio, minutos, horario, citas, ordenes)
    : null;

  const reservar = async () => {
    // Los bloqueos son horas propias: no hace falta cliente.
    if (!trabajo.bloquea && !form.contact_name.trim()) {
      setAviso('Pon al menos el nombre del cliente.');
      return;
    }
    if (revision && !revision.cabe) {
      setAviso(revision.motivo || 'A esa hora ya hay trabajo apuntado.');
      return;
    }
    setGuardando(true);
    setAviso('');
    try {
      const esBloqueo = !!trabajo.bloquea;
      const cita = {
        title: form.title.trim() || (esBloqueo ? trabajo.nombre : `${trabajo.nombre} · ${form.contact_name.trim()}`),
        description: form.notes || '',
        contact_id: form.contact_id || '',
        contact_name: esBloqueo ? trabajo.nombre : form.contact_name.trim(),
        date: hueco.fecha,
        time_start: hueco.inicio,
        time_end: revision.fin,
        type: trabajo.tipoAgenda || 'otro',
        status: 'pendiente',
        priority: tipoId === 'urgencia' ? 'urgente' : 'media',
        notes: [
          `Trabajo: ${trabajo.nombre} (${horas} h)`,
          form.phone ? `Teléfono: ${form.phone}` : '',
          form.notes || '',
        ].filter(Boolean).join('\n'),
      };
      const creada = await base44.entities.Appointment.create(cita);
      setCitas(prev => [creada, ...prev]);

      const cuando = `${fechaBonita(hueco.fecha).diaMes} de ${hueco.inicio} a ${revision.fin}`;

      // Un bloqueo propio no necesita que llegue aviso de "cliente nuevo".
      let avisoOk = true;
      if (!esBloqueo) {
        try {
          await base44.functions.invoke('avisoNuevaCita', {
            fecha: hueco.fecha,
            hora_inicio: hueco.inicio,
            hora_fin: revision.fin,
            contact_name: cita.contact_name,
            phone: form.phone || '',
            title: `${trabajo.nombre} (${horas} h)`,
            notes: form.notes || '',
          });
        } catch (e) {
          console.error('[Disponibilidad] No se pudo enviar el aviso:', e);
          avisoOk = false;
        }
      }

      setHueco(null);
      setAviso('');
      // Solo tiene sentido ofrecer WhatsApp si hay a quién escribir.
      if (!esBloqueo && form.phone.trim()) {
        setRecienReservada({
          cliente: cita.contact_name,
          telefono: form.phone.trim(),
          fecha: hueco.fecha,
          horaInicio: hueco.inicio,
          horaFin: revision.fin,
          trabajo: `${trabajo.nombre} (${horas} h)`,
        });
      }
      if (esBloqueo) {
        toast.success(`Horas bloqueadas el ${cuando}`);
      } else if (avisoOk) {
        toast.success(`Reservado el ${cuando} para ${cita.contact_name}`);
      } else {
        // La cita SÍ está guardada: se dice, para que no se vuelva a reservar.
        toast.warning('Cita guardada, pero el aviso por correo no salió');
        setError(`Cita guardada para el ${cuando}, pero NO se pudo enviar el aviso por correo. Está en la agenda, compruébalo.`);
      }
    } catch (err) {
      console.error('[Disponibilidad] Error al crear la cita:', err);
      setAviso('No se pudo guardar la cita. Inténtalo de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-blue-600" />
            Disponibilidad
          </h1>
          <p className="text-sm text-slate-500">
            {cargando
              ? 'Calculando huecos…'
              : `${totalCaben} horas donde cabe un ${trabajo.nombre.toLowerCase()} de ${horas} h`}
          </p>
        </div>
        <Button variant="outline" onClick={cargar} disabled={cargando} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Qué trabajo es: manda sobre las horas que se reservan */}
      <Card>
        <CardContent className="p-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-600">Tipo de trabajo</label>
              <Select value={tipoId} onValueChange={elegirTipo}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_TRABAJO.filter(t => !t.bloquea).map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.nombre} · {t.horas} h</SelectItem>
                  ))}
                  {TIPOS_TRABAJO.filter(t => t.bloquea).map(t => (
                    <SelectItem key={t.id} value={t.id}>🚫 {t.nombre} · {t.horas} h</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Horas que ocupa</label>
              <Input
                type="number" min="0.5" step="0.5" className="mt-1"
                value={horas}
                onChange={e => setHoras(Number(e.target.value) || 1)}
              />
            </div>
          </div>

          {Number(horas) < trabajo.minimo && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              Para un <strong>{trabajo.nombre.toLowerCase()}</strong> normalmente no bajes
              de <strong>{trabajo.minimo} h</strong>. Puedes dejarlo así si sabes que este
              va más rápido.
            </p>
          )}

          {trabajo.bloquea && (
            <p className="text-xs text-slate-700 bg-slate-100 border border-slate-200 rounded p-2 flex items-start gap-2">
              <Ban className="w-4 h-4 flex-shrink-0 mt-0.5 text-slate-500" />
              <span>
                Esto no es un cliente: aparta esas horas de la agenda para que no se
                ofrezcan a nadie. No hace falta poner nombre ni sale aviso por correo.
              </span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Aviso de que todo esto es orientativo */}
      <div className="flex items-start gap-2 text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p>
            <strong>Los horarios son orientativos.</strong> Cada trabajo es distinto y
            puede alargarse o acabar antes de lo previsto: las horas que se ven aquí son
            una previsión para poder dar una cita por teléfono, no un compromiso exacto.
          </p>
          <p>
            <strong>La hora de comer también es orientativa.</strong> Hay días que no se
            para y se termina antes, así que un trabajo puede pasar por encima de ella
            sin problema: si lo hace, se avisa al reservar, pero no impide reservar.
          </p>
          <p className="text-blue-700">
            Horario de referencia: {horario.hora_inicio}–{horario.hora_fin}
            {horario.descanso_inicio ? ` (comida ${horario.descanso_inicio}–${horario.descanso_fin})` : ''}.
            Se puede cambiar en Configuración → Horario.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {dias.filter(d => d.laborable).map(dia => {
          const { diaNombre, diaMes } = fechaBonita(dia.fecha);
          const caben = dia.caben ?? dia.libres;
          return (
            <Card key={dia.fecha} className={caben === 0 ? 'opacity-60' : ''}>
              <CardContent className="p-3">
                <div className="flex items-baseline justify-between mb-2">
                  <p className="font-semibold text-slate-800">
                    {diaNombre} <span className="text-slate-400 font-normal">{diaMes}</span>
                  </p>
                  <span className={`text-xs font-medium ${caben > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                    {caben > 0 ? `${caben} para empezar` : 'no cabe'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {dia.huecos.map(h => (
                    h.cabeTrabajo ? (
                      <button
                        key={h.inicio}
                        onClick={() => abrirReserva(dia.fecha, h)}
                        className={`text-xs px-2 py-1 rounded border font-medium ${
                          h.cruzaDescanso || h.terminaTarde
                            ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                            : 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
                        }`}
                        title={
                          `${h.inicio}–${h.finTrabajo}` +
                          (h.cruzaDescanso ? ' · pasa por la hora de comer' : '') +
                          (h.terminaTarde ? ' · termina después de la hora de salida' : '')
                        }
                      >
                        {h.inicio}
                      </button>
                    ) : (
                      <span
                        key={h.inicio}
                        className="text-xs px-2 py-1 rounded border border-slate-200 bg-slate-100 text-slate-400 line-through"
                        title={h.motivo || 'No cabe el trabajo entero'}
                      >
                        {h.inicio}
                      </span>
                    )
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!cargando && dias.every(d => !d.laborable) && (
        <p className="text-center text-slate-400 py-8">
          No hay días laborables configurados. Revísalo en Configuración → Horario.
        </p>
      )}

      {/* Tras reservar: mandarle la confirmación al cliente */}
      <Dialog open={!!recienReservada} onOpenChange={(o) => !o && setRecienReservada(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Cita guardada
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              ¿Le mandas la confirmación a <strong>{recienReservada?.cliente}</strong> por
              WhatsApp? Se le pide que conteste <strong>SÍ</strong> o <strong>NO</strong>,
              y así sabes si mantienes el hueco o lo vuelves a ofrecer.
            </p>
            <div className="text-xs bg-slate-50 border rounded p-2 whitespace-pre-wrap text-slate-600 max-h-44 overflow-y-auto">
              {recienReservada && mensajeConfirmacionCita({
                cliente: recienReservada.cliente,
                empresa: empresa?.company_name,
                fecha: recienReservada.fecha,
                horaInicio: recienReservada.horaInicio,
                horaFin: recienReservada.horaFin,
                trabajo: recienReservada.trabajo,
              })}
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 gap-2 bg-[#25D366] hover:bg-[#1da851] text-white"
                onClick={() => {
                  const ok = abrirWhatsApp(recienReservada.telefono, mensajeConfirmacionCita({
                    cliente: recienReservada.cliente,
                    empresa: empresa?.company_name,
                    fecha: recienReservada.fecha,
                    horaInicio: recienReservada.horaInicio,
                    horaFin: recienReservada.horaFin,
                    trabajo: recienReservada.trabajo,
                  }));
                  if (!ok) toast.error('Ese teléfono no vale para WhatsApp');
                  else setRecienReservada(null);
                }}
              >
                <MessageCircle className="w-4 h-4" />Enviar por WhatsApp
              </Button>
              <Button variant="outline" onClick={() => setRecienReservada(null)}>Ahora no</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reservar */}
      <Dialog open={!!hueco} onOpenChange={(o) => !o && setHueco(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Clock className="w-5 h-5 text-blue-600" />
              {hueco && `${fechaBonita(hueco.fecha).diaNombre} ${fechaBonita(hueco.fecha).diaMes}`}
              {' · '}{hueco?.inicio}–{revision?.fin}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-xs bg-slate-50 border rounded p-2">
              <strong>{trabajo.nombre}</strong> · {horas} h
            </p>

            {revision?.cruzaDescanso && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
                Este trabajo pasa por encima de la hora de comer. Se puede reservar
                igual: la comida es orientativa.
              </p>
            )}
            {revision?.terminaTarde && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
                Termina a las {revision.fin}, después de la hora de salida habitual.
              </p>
            )}
            {revision && !revision.cabe && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
                {revision.motivo}
              </p>
            )}

            {!trabajo.bloquea && (
              <>
                <div>
                  <label className="text-xs font-medium text-slate-600">Cliente ya registrado</label>
                  <BuscadorCliente
                contacts={contactos}
                value={form.contact_id}
                onValueChange={elegirContacto}
                placeholder="Buscar cliente…"
              />
                  <p className="text-[11px] text-slate-400 mt-1">O escribe los datos abajo si es un cliente nuevo.</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-slate-600 flex items-center gap-1"><User className="w-3 h-3" />Nombre</label>
                    <Input className="mt-1" value={form.contact_name}
                      onChange={e => setForm({ ...form, contact_name: e.target.value })} placeholder="Nombre del cliente" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 flex items-center gap-1"><Phone className="w-3 h-3" />Teléfono</label>
                    <div className="flex gap-1 mt-1">
                      <Input value={form.phone}
                        onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Teléfono" />
                      {/* Escribir ANTES de reservar, por si hay que consultarle la hora */}
                      <button
                        type="button"
                        title="Escribir por WhatsApp"
                        disabled={!enlaceWhatsApp(form.phone)}
                        onClick={() => abrirWhatsApp(form.phone, mensajeConfirmacionCita({
                          cliente: form.contact_name,
                          empresa: empresa?.company_name,
                          fecha: hueco?.fecha,
                          horaInicio: hueco?.inicio,
                          horaFin: revision?.fin,
                          trabajo: `${trabajo.nombre} (${horas} h)`,
                        }))}
                        className="px-2.5 rounded-md bg-[#25D366] text-white disabled:bg-slate-200 disabled:text-slate-400"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-medium text-slate-600">
                {trabajo.bloquea ? 'Motivo' : 'Detalle del trabajo'}
              </label>
              <Input className="mt-1" value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder={trabajo.bloquea ? 'Clase, examen, asunto propio…' : 'Marca y modelo, planta, lo que sea…'} />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600">Notas</label>
              <Textarea className="mt-1" rows={2} value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Dirección, detalles del aviso…" />
            </div>

            {aviso && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{aviso}</p>
            )}

            <Button onClick={reservar} disabled={guardando || (revision && !revision.cabe)}
              className="w-full bg-blue-600 hover:bg-blue-700 gap-2">
              {guardando
                ? <><RefreshCw className="w-4 h-4 animate-spin" />Guardando…</>
                : trabajo.bloquea
                  ? <><Ban className="w-4 h-4" />Bloquear estas horas</>
                  : <><CheckCircle2 className="w-4 h-4" />Reservar y avisarme</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
