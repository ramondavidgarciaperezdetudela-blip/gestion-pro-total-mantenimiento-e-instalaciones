import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarCheck, Clock, RefreshCw, CheckCircle2, AlertCircle, Phone, User } from 'lucide-react';
import { toast } from 'sonner';
import { disponibilidadProximosDias, HORARIO_POR_DEFECTO } from '@/lib/availability';

/**
 * Disponibilidad — qué días y horas quedan libres.
 *
 * Pensada para usarla con el cliente al teléfono: se ve de un vistazo qué
 * huecos hay, se pulsa uno y queda la cita creada con los datos del cliente.
 * Al reservar se envía un aviso al correo de la empresa con todos esos datos.
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

  // Reserva
  const [hueco, setHueco] = useState(null); // { fecha, inicio, fin }
  const [form, setForm] = useState({ contact_id: '', contact_name: '', phone: '', title: '', notes: '' });
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState('');

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
    () => disponibilidadProximosDias(horario, citas, ordenes),
    [horario, citas, ordenes]
  );

  const totalLibres = dias.reduce((s, d) => s + d.libres, 0);

  const abrirReserva = (fecha, h) => {
    setHueco({ fecha, inicio: h.inicio, fin: h.fin });
    setForm({ contact_id: '', contact_name: '', phone: '', title: '', notes: '' });
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

  const reservar = async () => {
    if (!form.contact_name.trim()) { setAviso('Pon al menos el nombre del cliente.'); return; }
    setGuardando(true);
    setAviso('');
    try {
      const cita = {
        title: form.title.trim() || 'Cita concertada por teléfono',
        description: form.notes || '',
        contact_id: form.contact_id || '',
        contact_name: form.contact_name.trim(),
        date: hueco.fecha,
        time_start: hueco.inicio,
        time_end: hueco.fin,
        type: 'otro',
        status: 'pendiente',
        priority: 'media',
        notes: form.phone ? `Teléfono: ${form.phone}\n${form.notes || ''}`.trim() : (form.notes || ''),
      };
      const creada = await base44.entities.Appointment.create(cita);
      setCitas(prev => [creada, ...prev]);

      // El aviso va DESPUÉS de guardar y no bloquea: si el correo falla, la
      // cita ya está registrada y se avisa de que hay que apuntarla a mano.
      let avisoOk = true;
      try {
        await base44.functions.invoke('avisoNuevaCita', {
          fecha: hueco.fecha,
          hora_inicio: hueco.inicio,
          hora_fin: hueco.fin,
          contact_name: cita.contact_name,
          phone: form.phone || '',
          title: cita.title,
          notes: form.notes || '',
        });
      } catch (e) {
        console.error('[Disponibilidad] No se pudo enviar el aviso:', e);
        avisoOk = false;
      }

      const cuando = `${fechaBonita(hueco.fecha).diaMes} a las ${hueco.inicio}`;
      setHueco(null);
      setAviso('');
      if (avisoOk) {
        toast.success(`Cita reservada el ${cuando} para ${cita.contact_name}`);
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
            {cargando ? 'Calculando huecos…' : `${totalLibres} huecos libres en los próximos ${dias.length} días`}
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

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
        Horario: {horario.hora_inicio}–{horario.hora_fin}
        {horario.descanso_inicio ? ` (pausa ${horario.descanso_inicio}–${horario.descanso_fin})` : ''},
        citas de {horario.duracion_cita} min.
        Se descuentan las citas de la agenda y las órdenes SAT ya programadas.
        Puedes cambiarlo en Configuración → Horario.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {dias.filter(d => d.laborable).map(dia => {
          const { diaNombre, diaMes } = fechaBonita(dia.fecha);
          return (
            <Card key={dia.fecha} className={dia.libres === 0 ? 'opacity-60' : ''}>
              <CardContent className="p-3">
                <div className="flex items-baseline justify-between mb-2">
                  <p className="font-semibold text-slate-800">{diaNombre} <span className="text-slate-400 font-normal">{diaMes}</span></p>
                  <span className={`text-xs font-medium ${dia.libres > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                    {dia.libres > 0 ? `${dia.libres} libres` : 'completo'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {dia.huecos.map(h => (
                    h.libre ? (
                      <button
                        key={h.inicio}
                        onClick={() => abrirReserva(dia.fecha, h)}
                        className="text-xs px-2 py-1 rounded border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 font-medium"
                        title="Pulsa para reservar este hueco"
                      >
                        {h.inicio}
                      </button>
                    ) : (
                      <span
                        key={h.inicio}
                        className="text-xs px-2 py-1 rounded border border-slate-200 bg-slate-100 text-slate-400 line-through"
                        title={h.motivo || 'Ocupado'}
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

      {/* Reservar hueco */}
      <Dialog open={!!hueco} onOpenChange={(o) => !o && setHueco(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Reservar {hueco && fechaBonita(hueco.fecha).diaNombre} {hueco?.fecha.split('-').reverse().slice(0, 2).join('/')} · {hueco?.inicio}–{hueco?.fin}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Cliente ya registrado</label>
              <Select value={form.contact_id} onValueChange={elegirContacto}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Buscar cliente…" /></SelectTrigger>
                <SelectContent>
                  {contactos.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {`${c.name || ''} ${c.surname || ''}`.trim()}{c.phone ? ` · ${c.phone}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <Input className="mt-1" value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Teléfono" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600">Motivo</label>
              <Input className="mt-1" value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Avería aire acondicionado, revisión…" />
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

            <Button onClick={reservar} disabled={guardando} className="w-full bg-blue-600 hover:bg-blue-700 gap-2">
              {guardando
                ? <><RefreshCw className="w-4 h-4 animate-spin" />Reservando…</>
                : <><CheckCircle2 className="w-4 h-4" />Reservar y avisarme</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
