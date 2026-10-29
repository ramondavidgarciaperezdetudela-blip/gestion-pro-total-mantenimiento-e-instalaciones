import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import {
  CheckCircle, FolderOpen, Clock, ArrowRight, AlertCircle, TrendingUp, ChevronRight,
} from 'lucide-react';
import { format, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

// Panel de control inicial: un vistazo al estado del negocio nada más abrir la
// app. Resume lo que más importa a finales de mes:
//  - Presupuestos aceptados (lo que va a entrar).
//  - Proyectos en marcha (lo que se está ejecutando).
//  - Pagos pendientes del mes (lo que falta por cobrar).
// Reutiliza la caché de facturas del Home (getHomeData) y solo trae los
// proyectos, que no estaban cargados, para no repetir peticiones.

const euro = (n) => (n || 0).toLocaleString('es-ES', { maximumFractionDigits: 0 }) + ' €';

export default function PanelControlNegocio() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
        const [{ getHomeData }, projPage] = await Promise.all([
          import('@/lib/homeDataCache'),
          base44.entities.Project.filter({ status: 'en_curso' }, { limit: 200 })
            .catch(() => ({ items: [] })),
        ]);
        const { invoices } = await getHomeData(false);
        if (cancelado) return;

        const proyectos = projPage?.items || [];

        // Presupuestos aceptados: firmados por el cliente y no cancelados.
        const presupuestos = (invoices || []).filter(
          (d) => d.doc_type === 'presupuesto' && d.signature_client && d.status !== 'cancelado'
        );
        const presTotal = presupuestos.reduce((s, d) => s + (d.total || 0), 0);

        // Pagos pendientes del mes: facturas enviadas o vencidas con fecha del mes en curso.
        const pendientesMes = (invoices || []).filter(
          (d) => d.doc_type === 'factura' && ['enviado', 'vencido'].includes(d.status) && (d.date || '') >= monthStart
        );
        const pendTotal = pendientesMes.reduce((s, d) => s + (d.total || 0), 0);
        const vencidasMes = pendientesMes.filter((d) => d.status === 'vencido').length;

        // Proyectos en marcha: presupuesto total y progreso medio.
        const proyectTotal = proyectos.reduce((s, p) => s + (p.budget || 0), 0);
        const progreso = proyectos.length
          ? Math.round(proyectos.reduce((s, p) => s + (p.progress || 0), 0) / proyectos.length)
          : 0;

        setData({
          presupuestos: { count: presupuestos.length, total: presTotal, items: presupuestos.slice(0, 4) },
          proyectos: { count: proyectos.length, total: proyectTotal, progreso, items: proyectos.slice(0, 4) },
          pagos: { count: pendientesMes.length, total: pendTotal, vencidas: vencidasMes, items: pendientesMes.slice(0, 4) },
          mes: format(new Date(), 'MMMM', { locale: es }),
        });
      } catch {
        if (!cancelado) setData(null);
      }
    })();
    return () => { cancelado = true; };
  }, []);

  if (!data) return null;

  return (
    <div className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg,#0a0a14,#12121e)', border: '1px solid #00D4FF33' }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold flex items-center gap-2" style={{ color: '#e8eaf0' }}>
          <TrendingUp className="w-4 h-4" style={{ color: '#00D4FF' }} />
          Cómo va el negocio · <span className="capitalize" style={{ color: '#00D4FF99' }}>{data.mes}</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Presupuestos aceptados */}
        <Columna
          titulo="Presupuestos aceptados"
          sub={`${data.presupuestos.count} listos para facturar`}
          valor={euro(data.presupuestos.total)}
          icon={CheckCircle}
          color="#10B981"
          link="Documents?type=presupuesto"
          vacio="Sin presupuestos aceptados este mes"
          items={data.presupuestos.items.map((d) => ({
            id: d.id,
            principal: `Nº${d.doc_number}`,
            secundario: d.contact_name,
            valor: euro(d.total),
          }))}
        />

        {/* Proyectos en marcha */}
        <Columna
          titulo="Proyectos en marcha"
          sub={data.proyectos.count ? `Progreso medio ${data.proyectos.progreso}%` : 'Sin proyectos activos'}
          valor={euro(data.proyectos.total)}
          icon={FolderOpen}
          color="#00D4FF"
          link="Projects"
          vacio="No hay proyectos en curso"
          items={data.proyectos.items.map((p) => ({
            id: p.id,
            principal: p.name,
            secundario: p.contact_name,
            valor: p.progress != null ? `${p.progress}%` : null,
            progreso: p.progress || 0,
          }))}
        />

        {/* Pagos pendientes del mes */}
        <Columna
          titulo="Pagos pendientes del mes"
          sub={data.pagos.vencidas ? `${data.pagos.vencidas} vencidas` : `${data.pagos.count} por cobrar`}
          valor={euro(data.pagos.total)}
          icon={Clock}
          color={data.pagos.vencidas ? '#EF4444' : '#F59E0B'}
          link="Documents?type=factura"
          vacio="No hay pagos pendientes este mes"
          items={data.pagos.items.map((d) => ({
            id: d.id,
            principal: `Nº${d.doc_number}`,
            secundario: d.contact_name,
            valor: euro(d.total),
            alerta: d.status === 'vencido',
          }))}
        />
      </div>
    </div>
  );
}

function Columna({ titulo, sub, valor, icon: Icon, color, link, vacio, items }) {
  return (
    <div className="rounded-lg p-3 flex flex-col" style={{ background: '#ffffff06', border: `1px solid ${color}22` }}>
      <div className="flex items-center gap-2 mb-1">
        <div className="p-1.5 rounded-lg flex-shrink-0" style={{ background: color + '1a' }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold leading-tight" style={{ color: '#e8eaf0' }}>{titulo}</p>
          <p className="text-[10px] leading-tight" style={{ color: '#8890a8' }}>{sub}</p>
        </div>
      </div>
      <p className="text-2xl font-extrabold mb-2" style={{ color }}>{valor}</p>

      <div className="flex-1 min-h-0 space-y-1.5">
        {items.length === 0 ? (
          <p className="text-[11px] py-2 text-center" style={{ color: '#5a6178' }}>{vacio}</p>
        ) : items.map((it) => (
          <Link key={it.id} to={createPageUrl(link)} className="flex items-center gap-2 p-1.5 rounded-md transition-colors"
            style={{ background: it.alerta ? '#EF444410' : 'transparent', border: it.alerta ? '1px solid #EF444422' : '1px solid transparent' }}>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold truncate" style={{ color: '#e8eaf0' }}>{it.principal}</p>
              <p className="text-[10px] truncate" style={{ color: '#8890a8' }}>{it.secundario || '—'}</p>
              {it.progreso != null && (
                <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: '#1e1e30' }}>
                  <div className="h-1 rounded-full" style={{ width: `${Math.min(100, it.progreso)}%`, background: '#00D4FF' }} />
                </div>
              )}
            </div>
            {it.valor && (
              <span className="text-[11px] font-bold flex items-center gap-1 flex-shrink-0" style={{ color: it.alerta ? '#EF4444' : '#e8eaf0' }}>
                {it.alerta && <AlertCircle className="w-3 h-3" />}{it.valor}
              </span>
            )}
            <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: '#2a2a40' }} />
          </Link>
        ))}
      </div>

      <Link to={createPageUrl(link)} className="mt-2 flex items-center justify-center gap-1 text-[11px] font-semibold pt-1.5 border-t" style={{ color, borderColor: color + '22' }}>
        Ver detalle <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}