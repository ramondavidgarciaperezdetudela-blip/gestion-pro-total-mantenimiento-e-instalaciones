import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { CarrilReparto, BandejaSinAsignar, Panel, Estado } from '@/componentes/tema';
import { tecnicosDelReparto, trabajosDelReparto, cambiosAlAsignar, HORA_INICIO, HORA_FIN } from '@/lib/repartoDia';

/**
 * Reparto del día: cada técnico es un carril y cada aviso del SAT un módulo
 * con la anchura de su duración. Arrastrar un aviso a otro carril lo asigna.
 */
export default function RepartoDia() {
  const hoy = format(new Date(), 'yyyy-MM-dd');
  const [dia, setDia] = useState(hoy);
  const [avisos, setAvisos] = useState([]);
  const [empresaTecnicos, setEmpresaTecnicos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [seleccionado, setSeleccionado] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [lista, empresa] = await Promise.all([
        base44.entities.SATOrder.list('-date', 500),
        base44.entities.CompanySettings.list(),
      ]);
      setAvisos(Array.isArray(lista) ? lista : (lista?.items ?? []));
      const e = Array.isArray(empresa) ? empresa : (empresa?.items ?? []);
      setEmpresaTecnicos(e[0]?.technicians || []);
    } catch (err) {
      toast.error('No se pudieron leer los avisos: ' + (err?.message || 'error'));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Los del día elegido, más los pendientes sin fecha (para poder repartirlos).
  const delDia = useMemo(() => avisos.filter((a) => a.status !== 'cancelada'
    && (a.scheduled_date === dia || (!a.scheduled_date && a.status === 'pendiente' && !a.technician))), [avisos, dia]);

  const tecnicos = useMemo(() => tecnicosDelReparto(empresaTecnicos, delDia), [empresaTecnicos, delDia]);
  const trabajos = useMemo(() => trabajosDelReparto(delDia, tecnicos), [delDia, tecnicos]);
  const elegido = trabajos.find((t) => t.id === seleccionado);
  const aviso = avisos.find((a) => a.id === seleccionado);

  const asignar = async (id, tecnicoId) => {
    const a = avisos.find((x) => x.id === id);
    if (!a) return;
    const tec = tecnicos.find((t) => t.id === tecnicoId) || null;
    const cambios = cambiosAlAsignar(a, tec, dia);
    const antes = avisos;
    setAvisos((lista) => lista.map((x) => (x.id === id ? { ...x, ...cambios } : x)));
    try {
      await base44.entities.SATOrder.update(id, cambios);
      toast.success(tec ? `Asignado a ${tec.nombre}` : 'Vuelve a «Por asignar»');
    } catch (err) {
      setAvisos(antes);
      toast.error('No se pudo asignar: ' + (err?.message || 'error'));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Panel titulo="Reparto del día" variante="fuerte" tapa>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 16 }}>
          <label className="gpt-campo">
            Día
            <input type="date" value={dia} onChange={(e) => { setDia(e.target.value || hoy); setSeleccionado(null); }} />
          </label>
          <button type="button" className="gpt-boton" onClick={() => setDia(hoy)} disabled={dia === hoy}>Hoy</button>
          <button type="button" className="gpt-boton" onClick={cargar} disabled={cargando}>{cargando ? 'Leyendo…' : 'Actualizar'}</button>
          <span className="gpt-secundario gpt-num" style={{ fontSize: 14 }}>
            {trabajos.filter((t) => t.tecnicoId).length} asignados · {trabajos.filter((t) => !t.tecnicoId).length} por asignar
          </span>
        </div>
      </Panel>

      {tecnicos.length === 0 ? (
        <Panel variante="fuerte">
          <p style={{ margin: 0 }}>
            Todavía no hay técnicos. Añádelos en <Link to="/CompanyConfig">Configuración, pestaña Técnicos</Link> y aparecerán aquí un carril por cada uno.
          </p>
        </Panel>
      ) : (
        <CarrilReparto
          tecnicos={tecnicos}
          trabajos={trabajos}
          horaInicio={HORA_INICIO}
          horaFin={HORA_FIN}
          ahora={dia === hoy ? format(new Date(), 'HH:mm') : undefined}
          seleccionado={seleccionado}
          onSeleccionar={(t) => setSeleccionado(t.id === seleccionado ? null : t.id)}
          onAsignar={asignar}
        />
      )}

      <BandejaSinAsignar trabajos={trabajos} onSeleccionar={(t) => setSeleccionado(t.id)} />

      {elegido && aviso && (
        <Panel titulo={`${elegido.designacion} · ${aviso.order_number || 'Aviso'}`} variante="placa" tapa>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 8 }}>
            <Estado tipo={elegido.estado} />
            <span className="gpt-num">{elegido.inicio} a {elegido.fin}</span>
            <span>{aviso.technician ? 'Técnico: ' + aviso.technician : 'Sin técnico'}</span>
          </div>
          <p style={{ margin: '0 0 12px' }}>{elegido.titulo}</p>
          <Link to="/SAT" className="gpt-boton gpt-boton--primario">Abrir el servicio técnico</Link>
        </Panel>
      )}
    </div>
  );
}
