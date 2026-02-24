import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import { Search, Users, FileText, Wrench, ClipboardList, StickyNote, X, ArrowRight, Phone, Mail, Building2, ShoppingCart } from 'lucide-react';

const CATEGORIES = [
  { key: 'contacts', label: 'Contactos', icon: Users, color: 'text-emerald-600 bg-emerald-50' },
  { key: 'invoices', label: 'Documentos', icon: FileText, color: 'text-violet-600 bg-violet-50' },
  { key: 'sat', label: 'SAT', icon: Wrench, color: 'text-orange-600 bg-orange-50' },
  { key: 'maintenance', label: 'Mantenimiento', icon: ClipboardList, color: 'text-cyan-600 bg-cyan-50' },
  { key: 'notes', label: 'Notas', icon: StickyNote, color: 'text-lime-600 bg-lime-50' },
  { key: 'suppliers', label: 'Proveedores', icon: Building2, color: 'text-blue-600 bg-blue-50' },
  { key: 'supplierprices', label: 'Precios', icon: ShoppingCart, color: 'text-indigo-600 bg-indigo-50' },
];

export default function GlobalSearch({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ contacts: [], invoices: [], sat: [], maintenance: [], notes: [] });
  const [loading, setLoading] = useState(false);
  const [allData, setAllData] = useState(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Load all data once on first open
  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 50);
    if (allData) return;
    setLoading(true);
    Promise.all([
      base44.entities.Contact.list('-created_date', 500),
      base44.entities.Invoice.list('-date', 300),
      base44.entities.SATOrder.list('-date', 200),
      base44.entities.MaintenanceSheet.list('-date', 100),
      base44.entities.Note.list('-date', 100),
    ]).then(([contacts, invoices, sat, maintenance, notes]) => {
      setAllData({ contacts, invoices, sat, maintenance, notes });
      setLoading(false);
    });
  }, [open]);

  useEffect(() => {
    if (!query.trim() || !allData) {
      setResults({ contacts: [], invoices: [], sat: [], maintenance: [], notes: [] });
      return;
    }
    const q = query.toLowerCase();
    const match = (str) => str?.toLowerCase().includes(q);

    setResults({
      contacts: allData.contacts.filter(c =>
        match(c.name) || match(c.surname) || match(c.company_name) || match(c.phone) || match(c.email) || match(c.nif)
      ).slice(0, 5),
      invoices: allData.invoices.filter(d =>
        match(d.doc_number) || match(d.contact_name) || match(d.doc_type) || match(d.status)
      ).slice(0, 4),
      sat: allData.sat.filter(s =>
        match(s.contact_name) || match(s.order_number) || match(s.description) || match(s.type)
      ).slice(0, 4),
      maintenance: allData.maintenance.filter(m =>
        match(m.contact_name) || match(m.sheet_number) || match(m.equipment_brand) || match(m.equipment_model)
      ).slice(0, 3),
      notes: allData.notes.filter(n =>
        match(n.title) || match(n.content) || match(n.contact_name)
      ).slice(0, 3),
    });
  }, [query, allData]);

  const totalResults = Object.values(results).reduce((s, arr) => s + arr.length, 0);

  const go = (url) => {
    navigate(url);
    onClose();
    setQuery('');
  };

  if (!open) return null;

  const DOC_STATUS_COLOR = {
    borrador: 'text-gray-500', enviado: 'text-blue-600', pagado: 'text-green-600',
    vencido: 'text-red-600', cancelado: 'text-orange-600'
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-start justify-center pt-16 px-4" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar contactos, facturas, SAT, notas..."
            className="flex-1 text-sm outline-none bg-transparent placeholder-gray-400"
            onKeyDown={e => e.key === 'Escape' && onClose()}
          />
          {loading && <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {!query.trim() && (
            <div className="py-10 text-center text-gray-400 text-sm">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Escribe para buscar en toda la aplicación
            </div>
          )}

          {query.trim() && totalResults === 0 && !loading && (
            <div className="py-10 text-center text-gray-400 text-sm">Sin resultados para "<strong>{query}</strong>"</div>
          )}

          {/* Contactos */}
          {results.contacts.length > 0 && (
            <div className="p-2">
              <p className="text-[10px] font-semibold text-gray-400 uppercase px-2 mb-1">Contactos</p>
              {results.contacts.map(c => (
                <button key={c.id} onClick={() => go(createPageUrl(`ContactDetail?id=${c.id}`))}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50 text-left transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0 font-bold text-emerald-700 text-sm">
                    {c.photo_url ? <img src={c.photo_url} className="w-full h-full object-cover rounded-lg" /> : c.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{c.name} {c.surname}</p>
                    <p className="text-xs text-gray-500 truncate">{c.company_name || c.email || c.phone}</p>
                  </div>
                  {c.phone && <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-green-600"><Phone className="w-4 h-4" /></a>}
                  {c.email && <a href={`mailto:${c.email}`} onClick={e => e.stopPropagation()} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600"><Mail className="w-4 h-4" /></a>}
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          )}

          {/* Documentos */}
          {results.invoices.length > 0 && (
            <div className="p-2 border-t border-gray-50">
              <p className="text-[10px] font-semibold text-gray-400 uppercase px-2 mb-1">Documentos</p>
              {results.invoices.map(d => (
                <button key={d.id} onClick={() => go(createPageUrl(`Documents?edit=${d.id}`))}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-violet-50 text-left transition-colors group">
                  <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-900 capitalize">{d.doc_type} {d.doc_number}</span>
                    <span className="text-xs text-gray-400 ml-2">{d.contact_name}</span>
                  </div>
                  <span className={`text-xs font-medium ${DOC_STATUS_COLOR[d.status] || ''}`}>{d.status}</span>
                  {d.total != null && <span className="text-xs font-bold text-gray-700">{d.total?.toFixed(0)}€</span>}
                </button>
              ))}
            </div>
          )}

          {/* SAT */}
          {results.sat.length > 0 && (
            <div className="p-2 border-t border-gray-50">
              <p className="text-[10px] font-semibold text-gray-400 uppercase px-2 mb-1">Órdenes SAT</p>
              {results.sat.map(s => (
                <button key={s.id} onClick={() => go(createPageUrl(`SAT?view=${s.id}`))}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-orange-50 text-left transition-colors group">
                  <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <Wrench className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-900">SAT #{s.order_number}</span>
                    <span className="text-xs text-gray-400 ml-2">{s.contact_name}</span>
                    {s.description && <p className="text-xs text-gray-500 truncate">{s.description}</p>}
                  </div>
                  <span className="text-xs text-orange-600 font-medium">{s.status}</span>
                </button>
              ))}
            </div>
          )}

          {/* Mantenimiento */}
          {results.maintenance.length > 0 && (
            <div className="p-2 border-t border-gray-50">
              <p className="text-[10px] font-semibold text-gray-400 uppercase px-2 mb-1">Mantenimiento</p>
              {results.maintenance.map(m => (
                <button key={m.id} onClick={() => go(createPageUrl(`Maintenance?view=${m.id}`))}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-cyan-50 text-left transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-cyan-100 flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-4 h-4 text-cyan-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-900">#{m.sheet_number}</span>
                    <span className="text-xs text-gray-400 ml-2">{m.contact_name} — {m.equipment_brand} {m.equipment_model}</span>
                  </div>
                  <span className="text-xs text-gray-400">{m.date}</span>
                </button>
              ))}
            </div>
          )}

          {/* Notas */}
          {results.notes.length > 0 && (
            <div className="p-2 border-t border-gray-50">
              <p className="text-[10px] font-semibold text-gray-400 uppercase px-2 mb-1">Notas</p>
              {results.notes.map(n => (
                <button key={n.id} onClick={() => go(createPageUrl(`Notes`))}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-lime-50 text-left transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-lime-100 flex items-center justify-center flex-shrink-0">
                    <StickyNote className="w-4 h-4 text-lime-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{n.title}</p>
                    <p className="text-xs text-gray-500 truncate">{n.content}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-[10px] text-gray-400">ESC para cerrar</span>
          {totalResults > 0 && <span className="text-[10px] text-gray-400">{totalResults} resultado{totalResults !== 1 ? 's' : ''}</span>}
        </div>
      </div>
    </div>
  );
}