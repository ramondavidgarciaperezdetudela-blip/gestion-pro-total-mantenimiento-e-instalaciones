import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { CuadroGeneral } from '@/componentes/tema';
import { format } from 'date-fns';

/**
 * Cuadro general: todas las áreas del programa con sus apartados y el estado
 * de hoy. Los números salen de los avisos (SAT) abiertos; si no se pueden
 * leer, el cuadro se enseña igual, sin números.
 */
export default function CuadroGeneralHome() {
  const [estados, setEstados] = useState({});

  useEffect(() => {
    let vivo = true;
    base44.entities.SATOrder.list('-date', 300)
      .then((lista) => {
        if (!vivo) return;
        const arr = Array.isArray(lista) ? lista : (lista?.items ?? []);
        const abiertas = arr.filter((o) => o.status === 'pendiente' || o.status === 'en_curso');
        const hoy = format(new Date(), 'yyyy-MM-dd');
        const deHoy = abiertas.filter((o) => o.scheduled_date === hoy).length;
        const urgentes = abiertas.filter((o) => o.priority === 'urgente' || o.type === 'urgencia').length;
        const nuevo = {};
        if (deHoy) nuevo.RepartoDia = { texto: `${deHoy} hoy` };
        if (abiertas.length) nuevo.SAT = urgentes
          ? { tipo: 'urgente', texto: `${urgentes} urgente${urgentes > 1 ? 's' : ''}` }
          : { texto: `${abiertas.length} abierto${abiertas.length > 1 ? 's' : ''}` };
        setEstados(nuevo);
      })
      .catch(() => { /* sin avisos: se enseña el cuadro sin números */ });
    return () => { vivo = false; };
  }, []);

  return <CuadroGeneral estados={estados} Enlace={Link} />;
}
