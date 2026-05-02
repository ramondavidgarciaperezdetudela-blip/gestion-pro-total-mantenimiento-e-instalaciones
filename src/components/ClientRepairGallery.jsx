import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, ZoomIn, X, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const TYPE_LABELS = {
  reparacion: { label: 'Reparación', color: 'bg-orange-100 text-orange-700' },
  mantenimiento: { label: 'Mantenimiento', color: 'bg-cyan-100 text-cyan-700' },
  instalacion: { label: 'Instalación', color: 'bg-blue-100 text-blue-700' },
  foto_equipo: { label: 'Equipo', color: 'bg-amber-100 text-amber-700' },
};

function LightboxModal({ photos, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  const photo = photos[idx];

  const prev = () => setIdx(i => Math.max(0, i - 1));
  const next = () => setIdx(i => Math.min(photos.length - 1, i + 1));

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button className="absolute top-4 right-4 text-white hover:text-gray-300 z-10" onClick={onClose}>
        <X className="w-6 h-6" />
      </button>
      <button
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 z-10 disabled:opacity-30"
        onClick={e => { e.stopPropagation(); prev(); }}
        disabled={idx === 0}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 z-10 disabled:opacity-30"
        onClick={e => { e.stopPropagation(); next(); }}
        disabled={idx === photos.length - 1}
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      <div className="max-w-4xl max-h-[90vh] flex flex-col items-center gap-3 px-16" onClick={e => e.stopPropagation()}>
        <img src={photo.url} alt={photo.label} className="max-h-[75vh] max-w-full object-contain rounded-lg" />
        <div className="text-center text-white">
          <p className="font-semibold text-sm">{photo.label}</p>
          {photo.date && <p className="text-gray-400 text-xs">{photo.date} {photo.subLabel && `— ${photo.subLabel}`}</p>}
          <p className="text-gray-500 text-xs mt-1">{idx + 1} / {photos.length}</p>
        </div>
      </div>
    </div>
  );
}

export default function ClientRepairGallery({ contactId }) {
  const [allPhotos, setAllPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [lightbox, setLightbox] = useState(null); // { index }

  useEffect(() => {
    const load = async () => {
      const [satOrders, maintenance, equipPhotos] = await Promise.all([
        base44.entities.SATOrder.filter({ contact_id: contactId }),
        base44.entities.MaintenanceSheet.filter({ contact_id: contactId }),
        base44.entities.ClientDocument.filter({ contact_id: contactId, doc_type: 'foto_equipo' }),
      ]);

      const photos = [];

      satOrders.forEach(sat => {
        (sat.photos_before || []).forEach(url => photos.push({
          url, date: sat.date, label: `SAT #${sat.order_number || 'S/N'} — Antes`, subLabel: sat.type,
          type: 'reparacion', sortDate: sat.date || '0000-00-00'
        }));
        (sat.photos_after || []).forEach(url => photos.push({
          url, date: sat.date, label: `SAT #${sat.order_number || 'S/N'} — Después`, subLabel: sat.type,
          type: 'reparacion', sortDate: sat.date || '0000-00-00'
        }));
      });

      maintenance.forEach(m => {
        (m.photos_before || []).forEach(url => photos.push({
          url, date: m.date, label: `Mant. #${m.sheet_number || 'S/N'} — Antes`, subLabel: m.type,
          type: 'mantenimiento', sortDate: m.date || '0000-00-00'
        }));
        (m.photos_after || []).forEach(url => photos.push({
          url, date: m.date, label: `Mant. #${m.sheet_number || 'S/N'} — Después`, subLabel: m.type,
          type: 'mantenimiento', sortDate: m.date || '0000-00-00'
        }));
        (m.photos_evaporator_plate || []).forEach(url => photos.push({
          url, date: m.date, label: `Mant. #${m.sheet_number || 'S/N'} — Evaporador`, subLabel: m.type,
          type: 'mantenimiento', sortDate: m.date || '0000-00-00'
        }));
      });

      equipPhotos.forEach(ep => photos.push({
        url: ep.file_url, date: ep.date, label: ep.title, subLabel: 'Equipo instalado',
        type: 'foto_equipo', sortDate: ep.date || '0000-00-00'
      }));

      // Sort by date descending
      photos.sort((a, b) => b.sortDate.localeCompare(a.sortDate));
      setAllPhotos(photos);
      setLoading(false);
    };
    load();
  }, [contactId]);

  const types = ['all', ...new Set(allPhotos.map(p => p.type))];
  const filtered = filter === 'all' ? allPhotos : allPhotos.filter(p => p.type === filter);

  if (loading) return <p className="text-center text-gray-400 py-8 text-sm">Cargando galería...</p>;

  return (
    <div className="space-y-3 mt-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-gray-500">{filtered.length} fotos</p>
        <div className="flex gap-1 flex-wrap">
          {types.map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`text-[10px] font-semibold px-2 py-1 rounded-full border transition-colors ${filter === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            >
              {t === 'all' ? 'Todas' : TYPE_LABELS[t]?.label || t}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <Camera className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sin fotos de reparaciones</p>
          <p className="text-xs">Las fotos de órdenes SAT, mantenimiento y equipos aparecen aquí</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {filtered.map((photo, i) => (
            <div
              key={i}
              className="group relative aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setLightbox({ index: i })}
            >
              <img src={photo.url} alt={photo.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <p className="text-white text-[9px] font-semibold truncate leading-tight">{photo.label}</p>
                {photo.date && (
                  <p className="text-gray-300 text-[8px]">
                    {(() => { try { return format(new Date(photo.date), 'dd/MM/yy', { locale: es }); } catch { return photo.date; } })()}
                  </p>
                )}
              </div>
              {TYPE_LABELS[photo.type] && (
                <div className="absolute top-1.5 right-1.5">
                  <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${TYPE_LABELS[photo.type].color}`}>
                    {TYPE_LABELS[photo.type].label}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {lightbox && (
        <LightboxModal
          photos={filtered}
          startIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}