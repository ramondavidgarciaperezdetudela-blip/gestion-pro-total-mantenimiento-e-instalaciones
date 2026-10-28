import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Plus, Ruler, FileDown, Trash2, Edit } from 'lucide-react';

// Pestaña de planos frigoríficos vinculados a un cliente.
// Carga los RefrigerationPlan del contacto y permite crear uno nuevo (abre
// el diseñador con el cliente ya preseleccionado) o editar uno existente.
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
        <div key={p.id} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2.5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#00D4FF,#7C3AED)' }}>
            <Ruler className="w-4 h-4 text-black" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{p.name || 'Sin nombre'}</p>
            <p className="text-[11px] text-muted-foreground">
              {(p.elements || []).length} equipos · {(p.walls || []).length} paredes · {(p.connections || []).length} conexiones
              {p.status ? ` · ${p.status}` : ''}
            </p>
          </div>
          <Link to={createPageUrl(`PlanoFrigorifico?plano=${p.id}`)}>
            <button className="p-1.5 rounded-md hover:bg-muted" title="Editar"><Edit className="w-3.5 h-3.5" /></button>
          </Link>
          <button onClick={() => borrar(p.id)} className="p-1.5 rounded-md text-destructive hover:bg-destructive/10" title="Borrar"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      ))}
    </div>
  );
}