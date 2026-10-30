import React from 'react';
import { CAT_COLOR } from '@/lib/planoFrigorificoCatalogo';

// Colores de las conexiones, igual que en el lienzo (PlanoCanvas).
const CONN_COLORS = { refrigerante: '#00A0E9', electrica: '#F5821F', conducto: '#10b981' };

// Leyenda compacta del plano: colores de cada familia de equipos y tipos de
// conexión. Va en el panel lateral del editor a pantalla completa para que
// se entienda el dibujo sin abrir el PDF.
export default function LeyendaPlano() {
  const familias = [
    { id: 'refrigeracion', label: 'Refrigeración' },
    { id: 'clima', label: 'Climatización' },
    { id: 'ventilacion', label: 'Ventilación' },
    { id: 'electrico', label: 'Eléctrico' },
    { id: 'seguridad', label: 'Seguridad' },
    { id: 'estructura', label: 'Estructura' },
  ];
  const conexiones = [
    { id: 'refrigerante', label: 'Tubería refrigerante', estilo: '8 5' },
    { id: 'electrica', label: 'Eléctrica', estilo: '2 4' },
    { id: 'conducto', label: 'Conducto', estilo: 'sólido' },
  ];
  return (
    <div className="rounded-lg border border-border p-2">
      <div className="tech-label mb-1.5">Leyenda</div>
      <div className="flex flex-col gap-0.5">
        {familias.map((f) => (
          <div key={f.id} className="flex items-center gap-1.5 text-[10px]">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: CAT_COLOR[f.id] }} />
            <span className="text-muted-foreground">{f.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 pt-1.5 border-t border-border flex flex-col gap-0.5">
        {conexiones.map((c) => (
          <div key={c.id} className="flex items-center gap-1.5 text-[10px]">
            <svg width="20" height="6" className="flex-shrink-0">
              <line x1="0" y1="3" x2="20" y2="3" stroke={CONN_COLORS[c.id]} strokeWidth="2.5"
                strokeDasharray={c.estilo === 'sólido' ? undefined : c.estilo} />
            </svg>
            <span className="text-muted-foreground">{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}