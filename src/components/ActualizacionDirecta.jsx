import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Newspaper, Euro, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { procesarPorLotes, iniciarTarea, cederHilo } from '@/lib/descargas';
import { imagenDeWikimedia, descargarTarifa, cambiosDePrecio, normativaDelDia } from '@/lib/fuentesDirectas';

const CLAVE_NORMATIVA = 'gpt_normativa_directa';

export function leerNormativaDirecta() {
  try { return JSON.parse(localStorage.getItem(CLAVE_NORMATIVA) || '[]'); } catch { return []; }
}

// Actualizaciones que se bajan DIRECTAMENTE de internet, sin IA ni créditos.
export default function ActualizacionDirecta() {
  const [ocupado, setOcupado] = useState(false);
  const [normativa, setNormativa] = useState(leerNormativaDirecta);

  const envolver = (fn) => async () => {
    if (ocupado) return;
    setOcupado(true);
    try { await fn(); } catch (e) { toast.error(e?.message || 'No se ha podido completar la descarga'); }
    finally { setOcupado(false); }
  };

  const bajarNormativa = envolver(async () => {
    const tarea = iniciarTarea('Normativa del BOE (últimos 7 días)', { total: 7 });
    const todas = [...leerNormativaDirecta()];
    let nuevas = 0, fallos = 0;
    for (let i = 0; i < 7 && !tarea.cancelada; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      try {
        for (const n of await normativaDelDia(d)) {
          if (!todas.some((x) => x.id === n.id)) { todas.unshift({ ...n, fecha: d.toISOString().slice(0, 10) }); nuevas++; }
        }
      } catch { fallos++; }
      tarea.progreso(i + 1, 7, `Día ${i + 1} de 7`);
      await cederHilo();
    }
    const guardar = todas.slice(0, 100);
    try { localStorage.setItem(CLAVE_NORMATIVA, JSON.stringify(guardar)); } catch { /* sin espacio: se muestra igualmente */ }
    setNormativa(guardar);
    if (fallos === 7) tarea.fallar('No se pudo conectar con el BOE'); else tarea.terminar(`${nuevas} novedades`);
    toast[fallos === 7 ? 'error' : 'success'](fallos === 7 ? 'No se pudo conectar con el BOE (¿sin internet?)' : `${nuevas} disposiciones nuevas sobre frío, climatización o instalaciones`);
  });

  const bajarTarifas = envolver(async () => {
    const proveedores = (await base44.entities.Supplier.list('-created_date', 500)).filter((p) => /^https?:\/\//i.test(p.api_url || ''));
    if (!proveedores.length) { toast.info('Ningún proveedor tiene un enlace a su tarifa (campo «enlace API/tarifa» de la ficha del proveedor).'); return; }
    let cambiados = 0;
    await procesarPorLotes(proveedores, async (prov) => {
      const tarifa = await descargarTarifa(prov.api_url);
      const guardados = await base44.entities.SupplierPrice.filter({ supplier_id: prov.id });
      const cambios = cambiosDePrecio(guardados, tarifa);
      for (const c of cambios) { await base44.entities.SupplierPrice.update(c.id, { cost_price: c.despues }); await cederHilo(); }
      cambiados += cambios.length;
    }, { titulo: 'Tarifas de proveedores', concurrencia: 1, mensaje: (p) => p.name });
    toast.success(`${cambiados} precios actualizados`);
  });

  const bajarImagenes = envolver(async () => {
    const sin = (await base44.entities.SupplierPrice.list('-created_date', 1000)).filter((p) => !p.image_url).slice(0, 60);
    if (!sin.length) { toast.info('Todos los artículos ya tienen imagen'); return; }
    let puestas = 0;
    await procesarPorLotes(sin, async (p) => {
      const url = await imagenDeWikimedia(`${p.brand || ''} ${p.product_name || p.product_code || ''}`);
      if (url) { await base44.entities.SupplierPrice.update(p.id, { image_url: url }); puestas++; }
    }, { titulo: 'Imágenes de artículos', concurrencia: 3, mensaje: (p) => p.product_name || p.product_code });
    toast.success(`${puestas} imágenes añadidas de ${sin.length} revisadas`);
  });

  return (
    <div className="bg-white rounded-xl shadow p-4 space-y-3" data-testid="actualizacion-directa">
      <div>
        <p className="font-semibold text-slate-800">🌐 Descarga directa de internet (sin IA)</p>
        <p className="text-xs text-slate-500 mt-0.5">
          Se baja de las webs oficiales sin gastar créditos. Puedes seguir trabajando: el porcentaje aparece abajo a la izquierda en cualquier pantalla y desaparece al terminar.
        </p>
      </div>
      <div className="grid sm:grid-cols-3 gap-2">
        <Button variant="outline" disabled={ocupado} onClick={bajarNormativa}><Newspaper className="w-4 h-4 mr-2" />Normativa (BOE)</Button>
        <Button variant="outline" disabled={ocupado} onClick={bajarTarifas}><Euro className="w-4 h-4 mr-2" />Tarifas de proveedores</Button>
        <Button variant="outline" disabled={ocupado} onClick={bajarImagenes}><ImageIcon className="w-4 h-4 mr-2" />Imágenes que faltan</Button>
      </div>
      <p className="text-[11px] text-slate-400">
        Tarifas: solo de proveedores que publican su lista (CSV o JSON) en el enlace de su ficha. Los fabricantes sin lista pública no se pueden descargar automáticamente.
      </p>
      {normativa.length > 0 && (
        <ul className="text-sm divide-y border rounded-lg max-h-56 overflow-auto">
          {normativa.slice(0, 20).map((n) => (
            <li key={n.id} className="p-2">
              <a href={n.url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">{n.titulo}</a>
              <span className="text-xs text-slate-400 ml-2">{n.fecha}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
