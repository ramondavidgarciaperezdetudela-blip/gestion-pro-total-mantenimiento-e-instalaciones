import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Plus, Ruler, Edit, Trash2, Zap, FileDown, Eye } from 'lucide-react';
import { exportarEsquemaElectrico } from '@/lib/planoEsquemaElectrico';

// Pestaña de planos frigoríficos vinculados a un cliente.
// Carga los RefrigerationPlan del contacto y permite crear uno nuevo (abre
// el diseñador con el cliente ya preseleccionado), editar uno existente y,
// desde aquí mismo, generar el esquema eléctrico normalizado del plano sin
// tener que abrir el editor. Así el historial de esquemas y planos técnicos
// se consulta desde la ficha del propio cliente.
export default function ClientPlanosTab({ contactId, contactName }) {
  const [planos, setPlanos] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await base44.entities.RefrigerationPlan.filter({ contact_id: contactId }, { sort: '-created_date', limit: 100 });
      setPlanos(res?.items || []);
    } catch { setPlanos([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [contactId]);

  const borrar = async (id) => {
    if (!confirm('¿Borrar este plano? No se puede deshacer.')) return;
    try { await base44.entities.RefrigerationPlan.delete(id); cargar(); }
    catch { alert('No se pudo borrar'); }
  };

  const esquema = async (p) => {
    try {
      // Si el plano no tiene elementos/connections guardados en el registro
      // (puede venir con arrays vacíos), los usamos tal cual.
      exportarEsquemaElectrico(p, p.elements || [], p.connections || [], {});
      toast.success('Esquema eléctrico generado');
    } catch (e) {
      toast.error('No se pudo generar el esquema', { description: String(e?.message || e) });
    }
  };

  if (loading) return <p className="text-center text-gray-400 py-6 text-sm">Cargando planos…</p>;

  return (
    <div className="space-y-2 mt-2">
      <Link to={createPageUrl(`PlanoFrigorifico?contact=${contactId}`)}>
        <button className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-white" style={{ background: 'linear-gradient(135deg,#00D4FF,#7C3AED)' }}>
          <Plus className="w-4 h-4" /> Nuevo plano frigorífico
        </button>
      </Link>

      {planos.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-4">Este cliente todavía no tiene planos frigoríficos.</p>
      )}

      {planos.map((p) => (
        <div key={p.id} className="rounded-lg border border-border bg-card p-2.5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#00D4FF,#7C3AED)' }}>
              <Ruler className="w-4 h-4 text-black" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{p.name || 'Sin nombre'}</p>
              <p className="text-[11px] text-muted-foreground">
                {(p.elements || []).length} equipos · {(p.walls || []).length} paredes · {(p.connections || []).length} conexiones
                {p.status ? ` · ${p.status}` : ''}
                {p.description ? ` · ${p.description.slice(0, 60)}` : ''}
              </p>
            </div>
            <Link to={createPageUrl(`PlanoFrigorifico?plano=${p.id}`)}>
              <button className="p-1.5 rounded-md hover:bg-muted" title="Editar"><Edit className="w-3.5 h-3.5" /></button>
            </Link>
          </div>
          <div className="flex gap-1 mt-2 flex-wrap">
            <Link to={createPageUrl(`PlanoFrigorifico?plano=${p.id}`)}>
              <button className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-50 text-blue-700 hover:bg-blue-100">
                <Eye className="w-3 h-3" /> Abrir plano
              </button>
            </Link>
            <button onClick={() => esquema(p)} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-amber-50 text-amber-700 hover:bg-amber-100"
              title="Esquema eléctrico normalizado (IEC)">
              <Zap className="w-3 h-3" /> Esquema eléctrico
            </button>
            <button onClick={() => borrar(p.id)} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-50 text-red-700 hover:bg-red-100 ml-auto">
              <Trash2 className="w-3 h-3" /> Borrar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}