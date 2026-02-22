import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreditCard, Plus, Printer, Download, Trash2, Edit } from 'lucide-react';

const EMPTY = {
  name: '', role: '', phone: '', email: '', website: '',
  color_scheme: 'dark_blue', layout: 'horizontal'
};

const SCHEMES = {
  dark_blue: { bg: '#1e3a5f', text: '#ffffff', accent: '#0ea5e9', sub: '#93c5fd' },
  sky:       { bg: '#0ea5e9', text: '#ffffff', accent: '#ffffff', sub: '#e0f2fe' },
  green:     { bg: '#166534', text: '#ffffff', accent: '#4ade80', sub: '#bbf7d0' },
  dark:      { bg: '#1e1e2e', text: '#ffffff', accent: '#a78bfa', sub: '#c4b5fd' },
  white:     { bg: '#ffffff', text: '#1e3a5f', accent: '#1e3a5f', sub: '#64748b' },
  orange:    { bg: '#c2410c', text: '#ffffff', accent: '#fb923c', sub: '#fed7aa' },
};

function CardPreview({ card, company, printMode }) {
  const s = SCHEMES[card.color_scheme] || SCHEMES.dark_blue;
  const style = {
    width: printMode ? '85mm' : '100%',
    height: printMode ? '54mm' : undefined,
    minHeight: printMode ? undefined : '120px',
    background: s.bg,
    color: s.text,
    borderRadius: '8px',
    padding: '14px 16px',
    fontFamily: 'Arial, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    boxSizing: 'border-box',
    position: 'relative',
    overflow: 'hidden',
  };
  return (
    <div style={style}>
      {/* Decorative circle */}
      <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: s.accent, opacity: 0.15 }} />
      <div style={{ position: 'absolute', bottom: -15, right: 20, width: 50, height: 50, borderRadius: '50%', background: s.accent, opacity: 0.1 }} />

      {/* Top: logo + company */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {company?.logo_url ? (
          <img src={company.logo_url} alt="logo" style={{ height: 28, objectFit: 'contain', background: 'white', borderRadius: 4, padding: '1px 3px' }} />
        ) : (
          <div style={{ width: 28, height: 28, background: s.accent, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 14, color: s.bg }}>
            {company?.company_name?.[0] || 'E'}
          </div>
        )}
        <span style={{ fontSize: '10px', fontWeight: 'bold', color: s.accent, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          {company?.company_name || 'Mi Empresa S.L.'}
        </span>
      </div>

      {/* Middle: name + role */}
      <div>
        <p style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: 2, color: s.text }}>{card.name || 'Nombre Apellidos'}</p>
        <p style={{ fontSize: '10px', color: s.sub, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{card.role || 'Cargo / Puesto'}</p>
      </div>

      {/* Bottom: contact */}
      <div style={{ fontSize: '9px', color: s.sub, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {card.phone && <span>📞 {card.phone}</span>}
        {card.email && <span>✉️ {card.email}</span>}
        {(card.website || company?.website) && <span>🌐 {card.website || company?.website}</span>}
        {(card.address_custom || company?.address) && !printMode && null}
      </div>
    </div>
  );
}

export default function BusinessCards() {
  const [cards, setCards] = useState([]);
  const [company, setCompany] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [dialog, setDialog] = useState(false);
  const [printCard, setPrintCard] = useState(null);
  const printRef = useRef(null);

  useEffect(() => {
    Promise.all([
      base44.entities.CompanySettings.list().then(r => r[0] || null),
    ]).then(([comp]) => {
      setCompany(comp);
    });
    loadCards();
  }, []);

  const loadCards = () => {
    // We store cards in localStorage for simplicity (no entity needed for small list)
    const stored = localStorage.getItem('business_cards');
    if (stored) setCards(JSON.parse(stored));
  };

  const saveCards = (list) => {
    setCards(list);
    localStorage.setItem('business_cards', JSON.stringify(list));
  };

  const handleSave = () => {
    if (!form.name) return;
    if (editing !== null) {
      const updated = [...cards];
      updated[editing] = form;
      saveCards(updated);
    } else {
      saveCards([...cards, { ...form, id: Date.now() }]);
    }
    setDialog(false);
    setEditing(null);
    setForm(EMPTY);
  };

  const handleDelete = (i) => {
    if (!confirm('¿Eliminar tarjeta?')) return;
    const updated = cards.filter((_, idx) => idx !== i);
    saveCards(updated);
  };

  const handlePrint = (card) => {
    const s = SCHEMES[card.color_scheme] || SCHEMES.dark_blue;
    const logoHtml = company?.logo_url
      ? `<img src="${company.logo_url}" style="height:28px;object-fit:contain;background:white;border-radius:4px;padding:1px 3px;" />`
      : `<div style="width:28px;height:28px;background:${s.accent};border-radius:4px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;color:${s.bg}">${company?.company_name?.[0] || 'E'}</div>`;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page { size: 85mm 54mm; margin: 0; }
      body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
      .card { width: 85mm; height: 54mm; background: ${s.bg}; color: ${s.text}; padding: 14px 16px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden; }
      .circle1 { position: absolute; top: -20px; right: -20px; width: 80px; height: 80px; border-radius: 50%; background: ${s.accent}; opacity: 0.15; }
      .circle2 { position: absolute; bottom: -15px; right: 20px; width: 50px; height: 50px; border-radius: 50%; background: ${s.accent}; opacity: 0.1; }
      .top { display: flex; align-items: center; gap: 8px; }
      .company-name { font-size: 10px; font-weight: bold; color: ${s.accent}; letter-spacing: 0.5px; text-transform: uppercase; }
      .name { font-size: 15px; font-weight: bold; color: ${s.text}; margin-bottom: 2px; }
      .role { font-size: 10px; color: ${s.sub}; text-transform: uppercase; letter-spacing: 0.8px; }
      .contact { font-size: 9px; color: ${s.sub}; display: flex; flex-direction: column; gap: 2px; }
    </style></head><body>
    <div class="card">
      <div class="circle1"></div><div class="circle2"></div>
      <div class="top">${logoHtml}<span class="company-name">${company?.company_name || 'Mi Empresa S.L.'}</span></div>
      <div><p class="name">${card.name}</p><p class="role">${card.role || ''}</p></div>
      <div class="contact">
        ${card.phone ? `<span>📞 ${card.phone}</span>` : ''}
        ${card.email ? `<span>✉️ ${card.email}</span>` : ''}
        ${(card.website || company?.website) ? `<span>🌐 ${card.website || company?.website}</span>` : ''}
      </div>
    </div>
    <script>window.onload=()=>{window.print();}</script></body></html>`;

    const w = window.open('', '_blank', 'width=400,height=300');
    if (w) { w.document.write(html); w.document.close(); }
  };

  const downloadVCard = (card) => {
    const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${card.name}\nORG:${company?.company_name || ''}\nTITLE:${card.role || ''}\nTEL:${card.phone || ''}\nEMAIL:${card.email || ''}\nURL:${card.website || company?.website || ''}\nADR:;;${company?.address || ''};${company?.city || ''};;${company?.postal_code || ''};${company?.country || 'España'}\nEND:VCARD`;
    const blob = new Blob([vcard], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${card.name.replace(/\s+/g, '_')}.vcf`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-blue-600" /> Tarjetas de Visita
        </h1>
        <Button onClick={() => { setEditing(null); setForm(EMPTY); setDialog(true); }} className="bg-blue-600">
          <Plus className="w-4 h-4 mr-1" /> Nueva tarjeta
        </Button>
      </div>

      {!company?.company_name && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
          ⚠️ Configura los datos de tu empresa en <strong>Configuración → Empresa</strong> para que aparezcan en las tarjetas.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <div key={card.id || i} className="space-y-2">
            <CardPreview card={card} company={company} />
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="flex-1 text-xs gap-1" onClick={() => { setEditing(i); setForm({ ...card }); setDialog(true); }}>
                <Edit className="w-3 h-3" /> Editar
              </Button>
              <Button size="sm" variant="outline" className="flex-1 text-xs gap-1" onClick={() => handlePrint(card)}>
                <Printer className="w-3 h-3" /> Imprimir
              </Button>
              <Button size="sm" variant="outline" className="flex-1 text-xs gap-1" onClick={() => downloadVCard(card)}>
                <Download className="w-3 h-3" /> vCard
              </Button>
              <Button size="sm" variant="outline" className="text-red-400 hover:text-red-600 px-2" onClick={() => handleDelete(i)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
        {cards.length === 0 && (
          <div className="col-span-3 text-center py-16 text-gray-400">
            <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No hay tarjetas. Crea la primera.</p>
          </div>
        )}
      </div>

      <Dialog open={dialog} onOpenChange={o => { setDialog(o); if (!o) { setEditing(null); setForm(EMPTY); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing !== null ? 'Editar tarjeta' : 'Nueva tarjeta de visita'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {/* Live preview */}
            <div className="rounded-xl overflow-hidden shadow-md">
              <CardPreview card={form} company={company} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <label className="text-xs text-gray-500">Nombre completo *</label>
                <Input className="mt-1" placeholder="Juan García López" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500">Cargo / Puesto</label>
                <Input className="mt-1" placeholder="Técnico Especialista" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-500">Teléfono</label>
                <Input className="mt-1" placeholder="600 000 000" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-500">Email personal</label>
                <Input className="mt-1" placeholder="juan@empresa.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500">Web (deja vacío para usar la de empresa)</label>
                <Input className="mt-1" placeholder="www.miempresa.com" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-500">Combinación de colores</label>
                <Select value={form.color_scheme} onValueChange={v => setForm({ ...form, color_scheme: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark_blue">Azul Corporativo</SelectItem>
                    <SelectItem value="sky">Azul Cielo</SelectItem>
                    <SelectItem value="green">Verde Empresa</SelectItem>
                    <SelectItem value="dark">Oscuro Elegante</SelectItem>
                    <SelectItem value="white">Blanco Limpio</SelectItem>
                    <SelectItem value="orange">Naranja Dinámico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSave} disabled={!form.name} className="w-full bg-blue-600">
              {editing !== null ? 'Actualizar tarjeta' : 'Crear tarjeta'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}