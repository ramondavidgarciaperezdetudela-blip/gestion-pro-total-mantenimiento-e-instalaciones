import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Plus, Printer, Download, Trash2, Edit, QrCode, Layers } from 'lucide-react';
import QRCodeLib from 'qrcode';
import { printDocument } from '@/lib/printHelper';
import {
  CAMPOS_TARJETA, CAMPO_ESCALA_MAX, CAMPO_ESCALA_MIN, ESCALA_MAX, ESCALA_MIN,
  FUENTE_TARJETA_POR_DEFECTO, ajustesDeCampo, conCampoCambiado, conCampoPorDefecto,
  cssDeCampo, cssTarjeta, escalaCampoValida, escalaValida, estiloDeCampo,
  estiloTarjeta, fuentePorId, gruposDeFuentes, medida, pesoTarjeta,
} from '@/lib/tipoDeFuente';

const EMPTY = {
  name: '', role: '', phone: '', email: '', website: '',
  address: '', nif: '', company_name_override: '',
  color_scheme: 'dark_blue', layout: 'horizontal',
  show_qr: true, show_logo: true, show_address: false, show_nif: false,
  use_company_email: false, use_company_phone: false,
  custom_fields: [], // [{ label, value }] campos a medida que también van al QR/vCard
  // Letra de la tarjeta (cada una la suya).
  card_font: FUENTE_TARJETA_POR_DEFECTO.fuente,
  card_font_scale: FUENTE_TARJETA_POR_DEFECTO.escala,
  card_font_bold: false,
  card_font_italic: false,
};

const SCHEMES = {
  dark_blue: { bg: '#1e3a5f', text: '#ffffff', accent: '#0ea5e9', sub: '#93c5fd' },
  sky:       { bg: '#0ea5e9', text: '#ffffff', accent: '#ffffff', sub: '#e0f2fe' },
  green:     { bg: '#166534', text: '#ffffff', accent: '#4ade80', sub: '#bbf7d0' },
  dark:      { bg: '#1e1e2e', text: '#ffffff', accent: '#a78bfa', sub: '#c4b5fd' },
  white:     { bg: '#ffffff', text: '#1e3a5f', accent: '#1e3a5f', sub: '#64748b' },
  orange:    { bg: '#c2410c', text: '#ffffff', accent: '#fb923c', sub: '#fed7aa' },
  red:       { bg: '#991b1b', text: '#ffffff', accent: '#f87171', sub: '#fecaca' },
  teal:      { bg: '#0f766e', text: '#ffffff', accent: '#2dd4bf', sub: '#99f6e4' },
};

// QR generado LOCALMENTE (no depende de webs externas → nunca queda en blanco y
// se regenera solo cuando cambian los datos de la tarjeta).
function QRCode({ value, size = 60 }) {
  const [dataUrl, setDataUrl] = useState('');
  useEffect(() => {
    let cancel = false;
    if (!value) { setDataUrl(''); return; }
    QRCodeLib.toDataURL(value, { width: size * 3, margin: 1, errorCorrectionLevel: 'M' })
      .then((d) => { if (!cancel) setDataUrl(d); })
      .catch(() => { if (!cancel) setDataUrl(''); });
    return () => { cancel = true; };
  }, [value, size]);
  if (!dataUrl) return null;
  return <img src={dataUrl} alt="QR vCard" width={size} height={size} style={{ display: 'block', borderRadius: 4, background: 'white', padding: 2 }} />;
}

function buildVCardString(card, company) {
  const companyName = card.company_name_override || company?.company_name || '';
  const phone = card.use_company_phone ? company?.phone : card.phone;
  const email = card.use_company_email ? company?.email : card.email;
  const web = card.website || company?.website || '';
  const addr = card.show_address ? (card.address || company?.address || '') : '';
  const nif = card.show_nif ? (card.nif || company?.nif || '') : '';
  const extra = (card.custom_fields || [])
    .filter(f => f && (f.label || f.value))
    .map(f => `${f.label ? f.label + ': ' : ''}${f.value || ''}`.trim())
    .filter(Boolean);
  const noteParts = [...extra];
  if (nif) noteParts.unshift(`NIF: ${nif}`);
  const note = noteParts.length ? `\nNOTE:${noteParts.join(' | ')}` : '';
  return `BEGIN:VCARD\nVERSION:3.0\nFN:${card.name || ''}\nORG:${companyName}\nTITLE:${card.role || ''}\nTEL:${phone || ''}\nEMAIL:${email || ''}\nURL:${web}\nADR:;;${addr};${company?.city || ''};;${company?.postal_code || ''};${company?.country || 'España'}${note}\nEND:VCARD`;
}

function CardPreview({ card, company, size = 'normal', onCabe }) {
  const s = SCHEMES[card.color_scheme] || SCHEMES.dark_blue;
  const companyName = card.company_name_override || company?.company_name || 'Mi Empresa S.L.';
  const phone = card.use_company_phone ? company?.phone : card.phone;
  const email = card.use_company_email ? company?.email : card.email;
  const web = card.website || company?.website || '';
  const vcard = buildVCardString(card, company);

  const isSmall = size === 'small';
  // La letra elegida para ESTA tarjeta. `t()` aplica la escala a cada tamaño,
  // para que subir o bajar el tamaño mueva la tarjeta entera a la vez y no
  // solo el nombre.
  const letra = estiloTarjeta(card);
  const escala = escalaValida(card.card_font_scale);
  const t = (px) => `${medida(px, escala)}px`;
  // Una tarjeta se imprime a 85×54 mm: lo que no quepa se corta, y un nombre
  // cortado en una tarjeta de visita no se arregla luego. Así que se mide de
  // verdad después de pintar y se avisa.
  const refTarjeta = React.useRef(null);
  React.useLayoutEffect(() => {
    if (!onCabe) return undefined;
    const mirar = () => {
      const el = refTarjeta.current;
      if (!el) return;
      // OJO: no vale medir la tarjeta entera. Los círculos de adorno salen a
      // propósito por fuera del borde (y se recortan), así que la tarjeta
      // siempre parece desbordada aunque el texto quepa de sobra. Se miden
      // SOLO los bloques de contenido.
      const caja = el.getBoundingClientRect();
      const bloques = el.querySelectorAll('[data-contenido]');
      let cabe = true;
      for (const b of bloques) {
        const r = b.getBoundingClientRect();
        if (r.bottom > caja.bottom + 1 || r.right > caja.right + 1
          || r.top < caja.top - 1 || r.left < caja.left - 1) {
          cabe = false;
          break;
        }
      }
      onCabe(cabe);
    };
    mirar();
    // Al cambiar de letra el navegador repinta después: se vuelve a mirar.
    const obs = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(mirar) : null;
    if (obs && refTarjeta.current) obs.observe(refTarjeta.current);
    const t2 = setTimeout(mirar, 250);
    return () => { obs?.disconnect(); clearTimeout(t2); };
  });

  const cardStyle = {
    width: '100%',
    aspectRatio: '85/54',
    background: s.bg,
    color: s.text,
    borderRadius: 8,
    padding: isSmall ? '8px 10px' : '14px 16px',
    ...letra,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    boxSizing: 'border-box',
    position: 'relative',
    overflow: 'hidden',
  };

  return (
    <div style={cardStyle} ref={refTarjeta}>
      {/* Decorative circles */}
      <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: s.accent, opacity: 0.15 }} />
      <div style={{ position: 'absolute', bottom: -15, left: 30, width: 50, height: 50, borderRadius: '50%', background: s.accent, opacity: 0.1 }} />

      {/* Top: logo + company */}
      <div data-contenido="cabecera" style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {card.show_logo && (
            // El tamaño debe coincidir con el de la plantilla de impresión
            // (58 px), o la vista previa engañaría sobre cómo saldrá impresa.
            company?.logo_url
              ? <img src={company.logo_url} alt="logo" style={{ height: isSmall ? 34 : 58, width: isSmall ? 34 : 58, objectFit: 'contain', background: 'white', borderRadius: 5, padding: '3px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', flexShrink: 0 }} />
              : <div style={{ width: isSmall ? 34 : 58, height: isSmall ? 34 : 58, background: s.accent, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: pesoTarjeta(card, { fuerte: true }), fontSize: medida(isSmall ? 16 : 26, escala), color: s.bg, flexShrink: 0 }}>
                  {companyName[0] || 'E'}
                </div>
          )}
          <span style={{ ...estiloDeCampo(card, 'empresa', s.accent, { pequeno: isSmall }), letterSpacing: '0.5px', textTransform: 'uppercase', lineHeight: 1.2, minWidth: 0, overflowWrap: 'anywhere' }}>
            {companyName}
          </span>
        </div>
        {card.show_qr && !isSmall && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <QRCode value={vcard} size={56} />
            <span style={{ fontSize: t(6), color: s.sub, textAlign: 'center', lineHeight: 1 }}>Guardar contacto</span>
          </div>
        )}
      </div>

      {/* Middle: name + role + nif */}
      <div data-contenido="nombre">
        <p style={{ ...estiloDeCampo(card, 'nombre', s.text, { pequeno: isSmall }), marginBottom: 2, lineHeight: 1.15, overflowWrap: 'anywhere' }}>{card.name || 'Nombre Apellidos'}</p>
        <p style={{ ...estiloDeCampo(card, 'cargo', s.sub, { pequeno: isSmall }), textTransform: 'uppercase', letterSpacing: '0.8px', lineHeight: 1.2, overflowWrap: 'anywhere' }}>{card.role || 'Cargo / Puesto'}</p>
        {card.show_nif && card.nif && <p style={{ ...estiloDeCampo(card, 'nif', s.sub, { pequeno: isSmall }), marginTop: 1 }}>NIF: {card.nif}</p>}
      </div>

      {/* Bottom: contact */}
      <div data-contenido="contacto" style={{ ...estiloDeCampo(card, 'contacto', s.sub, { pequeno: isSmall }), display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, overflowWrap: 'anywhere' }}>
        {phone && <span>📞 {phone}</span>}
        {email && <span>✉️ {email}</span>}
        {web && <span>🌐 {web}</span>}
        {card.show_address && (card.address || company?.address) && (
          <span>📍 {card.address || company?.address}{company?.city ? `, ${company.city}` : ''}</span>
        )}
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
  // ¿Cabe todo el texto en la tarjeta con la letra elegida?
  const [cabe, setCabe] = useState(true);
  const [campoAbierto, setCampoAbierto] = useState(null);

  useEffect(() => {
    base44.entities.CompanySettings.list().then(r => setCompany(r[0] || null));
    const stored = localStorage.getItem('business_cards_v2');
    if (stored) setCards(JSON.parse(stored));
  }, []);

  const saveCards = (list) => {
    setCards(list);
    localStorage.setItem('business_cards_v2', JSON.stringify(list));
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
    saveCards(cards.filter((_, idx) => idx !== i));
  };

  const downloadVCard = (card) => {
    const vcard = buildVCardString(card, company);
    const blob = new Blob([vcard], { type: 'text/vcard' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${card.name.replace(/\s+/g, '_')}.vcf`;
    a.click();
  };

  const handlePrintMultiple = async (card, copies = 10) => {
    const s = SCHEMES[card.color_scheme] || SCHEMES.dark_blue;
    // La misma letra que en la vista previa: si aquí se pusiera otra, lo que
    // se ve en pantalla no sería lo que sale de la impresora.
    const L = cssTarjeta(card);
    const m = (px) => `${medida(px, L.escala)}px`;
    const companyName = card.company_name_override || company?.company_name || 'Mi Empresa S.L.';
    const phone = card.use_company_phone ? company?.phone : card.phone;
    const email = card.use_company_email ? company?.email : card.email;
    const web = card.website || company?.website || '';
    const vcard = buildVCardString(card, company);
    const qrUrl = card.show_qr ? await QRCodeLib.toDataURL(vcard, { width: 240, margin: 1 }).catch(() => '') : '';
    const logoHtml = card.show_logo && company?.logo_url
      ? `<img src="${company.logo_url}" style="height:58px;width:58px;object-fit:contain;background:white;border-radius:5px;padding:3px;box-shadow:0 1px 3px rgba(0,0,0,0.2);flex-shrink:0;" />`
      : `<div style="width:58px;height:58px;background:${s.accent};border-radius:5px;display:flex;align-items:center;justify-content:center;font-weight:${L.fuerte};font-size:${m(26)};color:${s.bg};line-height:1;flex-shrink:0;">${companyName[0] || 'E'}</div>`;

    const cardHtml = `
      <div class="card">
        <div class="c1"></div><div class="c2"></div>
        <div class="stripe"></div>
        <div class="top">
          <div class="top-left">${logoHtml}<span class="co">${companyName}</span></div>
          ${card.show_qr ? `<div style="display:flex;flex-direction:column;align-items:center;gap:2px"><img src="${qrUrl}" width="60" height="60" style="border-radius:4px;background:white;padding:3px;box-shadow:0 1px 4px rgba(0,0,0,0.2);" /><span style="font-size:${m(6)};color:${s.sub};text-align:center">Guardar contacto</span></div>` : ''}
        </div>
        <div class="mid">
          <p class="name">${card.name}</p>
          <p class="role">${card.role || ''}</p>
          ${card.show_nif && card.nif ? `<p style="font-size:${m(8)};color:${s.sub};margin-top:2px">NIF: ${card.nif}</p>` : ''}
        </div>
        <div class="contact">
          ${phone ? `<span>📞 ${phone}</span>` : ''}
          ${email ? `<span>✉️ ${email}</span>` : ''}
          ${web ? `<span>🌐 ${web}</span>` : ''}
          ${card.show_address && (card.address || company?.address) ? `<span>📍 ${card.address || company?.address}${company?.city ? ', ' + company.city : ''}</span>` : ''}
        </div>
      </div>`;

    const allCards = Array(copies).fill(cardHtml).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page { size: A4 portrait; margin: 5mm; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; font-family: ${L.familia}; font-style: ${L.estilo}; font-weight: ${L.normal}; background: #ffffff; }
      /* 2 columnas x 5 filas = 10 tarjetas que caben COMPLETAS en un A4:
         altura total = 5*53 + 4*3 = 277mm < 287mm imprimibles (margen 5mm). */
      .page {
        display: grid;
        grid-template-columns: 85mm 85mm;
        grid-template-rows: repeat(5, 53mm);
        gap: 3mm;
        width: 173mm;
        margin: 0 auto;
        page-break-inside: avoid;
      }
      .card {
        width: 85mm; height: 53mm;
        break-inside: avoid; page-break-inside: avoid;
        background: ${s.bg} !important; 
        color: ${s.text} !important; 
        padding: 10px 12px; 
        display: flex; flex-direction: column; justify-content: space-between; 
        position: relative; overflow: hidden; 
        border-radius: 6px;
        border: 1px solid rgba(255,255,255,0.1);
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      .stripe {
        position: absolute; top: 0; left: 0; right: 0; height: 3px;
        background: ${s.accent}; opacity: 0.9;
      }
      .c1 { position: absolute; top: -25px; right: -25px; width: 90px; height: 90px; border-radius: 50%; background: ${s.accent}; opacity: 0.18; }
      .c2 { position: absolute; bottom: -18px; left: 20px; width: 60px; height: 60px; border-radius: 50%; background: ${s.accent}; opacity: 0.12; }
      .top { display: flex; align-items: flex-start; justify-content: space-between; gap: 6px; }
      .top-left { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; }
      .co { ${cssDeCampo(card, 'empresa', s.accent)} letter-spacing: 0.6px; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .mid { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 2px 0; }
      .name { ${cssDeCampo(card, 'nombre', s.text)} margin: 0 0 3px 0; line-height: 1.2; }
      .role { ${cssDeCampo(card, 'cargo', s.sub)} text-transform: uppercase; letter-spacing: 1px; margin: 0; }
      .contact { ${cssDeCampo(card, 'contacto', s.sub)} display: flex; flex-direction: column; gap: 2px; }
      .contact span { display: block; }
    </style></head><body>
    <div class="page">${allCards}</div>
    </body></html>`;
    printDocument(html, `Tarjetas de visita - ${card.name}`);
  };

  const handlePrint = async (card) => {
    const s = SCHEMES[card.color_scheme] || SCHEMES.dark_blue;
    const L = cssTarjeta(card);
    const m = (px) => `${medida(px, L.escala)}px`;
    const companyName = card.company_name_override || company?.company_name || 'Mi Empresa S.L.';
    const phone = card.use_company_phone ? company?.phone : card.phone;
    const email = card.use_company_email ? company?.email : card.email;
    const web = card.website || company?.website || '';
    const vcard = buildVCardString(card, company);
    const qrUrl = card.show_qr ? await QRCodeLib.toDataURL(vcard, { width: 200, margin: 1 }).catch(() => '') : '';
    const logoHtml = card.show_logo && company?.logo_url
      ? `<img src="${company.logo_url}" style="height:58px;width:58px;object-fit:contain;background:white;border-radius:5px;padding:3px;box-shadow:0 1px 3px rgba(0,0,0,0.2);flex-shrink:0;" />`
      : `<div style="width:58px;height:58px;background:${s.accent};border-radius:5px;display:flex;align-items:center;justify-content:center;font-weight:${L.fuerte};font-size:${m(26)};color:${s.bg};flex-shrink:0;">${companyName[0] || 'E'}</div>`;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page { size: 85mm 54mm; margin: 0; }
      body { margin: 0; padding: 0; font-family: ${L.familia}; font-style: ${L.estilo}; font-weight: ${L.normal}; }
      .card { width: 85mm; height: 54mm; background: ${s.bg}; color: ${s.text}; padding: 10px 12px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden; }
      .c1 { position: absolute; top: -20px; right: -20px; width: 80px; height: 80px; border-radius: 50%; background: ${s.accent}; opacity: 0.15; }
      .c2 { position: absolute; bottom: -15px; left: 30px; width: 50px; height: 50px; border-radius: 50%; background: ${s.accent}; opacity: 0.1; }
      .top { display: flex; align-items: center; justify-content: space-between; }
      .top-left { display: flex; align-items: center; gap: 6px; }
      .co { ${cssDeCampo(card, 'empresa', s.accent)} letter-spacing: 0.5px; text-transform: uppercase; }
      .name { ${cssDeCampo(card, 'nombre', s.text)} margin-bottom: 2px; }
      .role { ${cssDeCampo(card, 'cargo', s.sub)} text-transform: uppercase; letter-spacing: 0.8px; }
      .contact { ${cssDeCampo(card, 'contacto', s.sub)} display: flex; flex-direction: column; gap: 2px; }
    </style></head><body>
    <div class="card">
      <div class="c1"></div><div class="c2"></div>
      <div class="top">
        <div class="top-left">${logoHtml}<span class="co">${companyName}</span></div>
        ${card.show_qr ? `<div style="display:flex;flex-direction:column;align-items:center;gap:2px"><img src="${qrUrl}" width="58" height="58" style="border-radius:4px;background:white;padding:3px;box-shadow:0 1px 4px rgba(0,0,0,0.2);" /><span style="font-size:${m(6)};color:${s.sub}">Guardar contacto</span></div>` : ''}
      </div>
      <div>
        <p class="name">${card.name}</p>
        <p class="role">${card.role || ''}</p>
        ${card.show_nif && card.nif ? `<p style="font-size:${m(7)};color:${s.sub};margin-top:1px">NIF: ${card.nif}</p>` : ''}
      </div>
      <div class="contact">
        ${phone ? `<span>📞 ${phone}</span>` : ''}
        ${email ? `<span>✉️ ${email}</span>` : ''}
        ${web ? `<span>🌐 ${web}</span>` : ''}
        ${card.show_address && (card.address || company?.address) ? `<span>📍 ${card.address || company?.address}${company?.city ? ', ' + company.city : ''}</span>` : ''}
      </div>
    </div>
    </body></html>`;
    printDocument(html, `Tarjeta - ${card.name}`);
  };

  const F = (key, label, placeholder, type = 'text') => (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <Input className="mt-1" type={type} placeholder={placeholder} value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })} />
    </div>
  );

  const Toggle = (key, label) => (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-gray-700">{label}</span>
      <Switch checked={!!form[key]} onCheckedChange={v => setForm({ ...form, [key]: v })} />
    </div>
  );

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
            <div className="flex gap-1 flex-wrap">
              <Button size="sm" variant="outline" className="flex-1 text-xs gap-1 min-w-0" onClick={() => { setEditing(i); setForm({ ...card }); setDialog(true); }}>
                <Edit className="w-3 h-3" /> Editar
              </Button>
              <Button size="sm" variant="outline" className="flex-1 text-xs gap-1 min-w-0" onClick={() => handlePrint(card)}>
                <Printer className="w-3 h-3" /> 1 tarjeta
              </Button>
              <Button size="sm" variant="outline" className="flex-1 text-xs gap-1 min-w-0 text-blue-700" onClick={() => handlePrintMultiple(card, 10)}>
                <Layers className="w-3 h-3" /> Hoja A4 (10)
              </Button>
              <Button size="sm" variant="outline" className="flex-1 text-xs gap-1 min-w-0" onClick={() => downloadVCard(card)}>
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
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing !== null ? 'Editar tarjeta' : 'Nueva tarjeta de visita'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Live preview */}
            <div className="max-w-xs mx-auto">
              <CardPreview card={form} company={company} onCabe={setCabe} />
            </div>
            {/* El aviso va aquí, pegado a la tarjeta y NO dentro de una
                pestaña: si estás escribiendo el nombre en "Datos personales"
                también tienes que enterarte de que ya no cabe. */}
            {!cabe && (
              <div role="alert" className="mx-auto max-w-md rounded-md border border-amber-300 bg-amber-50 p-2 text-center text-xs text-amber-800">
                <strong>No cabe todo.</strong> Con esta letra el texto se sale de la tarjeta
                y al imprimirla saldría cortado. Baja el tamaño en <em>Diseño</em>, acorta el
                cargo o quita algún dato.
              </div>
            )}

            <Tabs defaultValue="datos">
              <TabsList className="w-full">
                <TabsTrigger value="datos" className="flex-1">Datos personales</TabsTrigger>
                <TabsTrigger value="empresa" className="flex-1">Empresa</TabsTrigger>
                <TabsTrigger value="diseno" className="flex-1">Diseño</TabsTrigger>
              </TabsList>

              <TabsContent value="datos" className="space-y-3 pt-3">
                {F('name', 'Nombre completo *', 'Juan García López')}
                {F('role', 'Cargo / Puesto', 'Técnico Especialista')}
                {F('nif', 'NIF / DNI personal', '00000000A')}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500">Teléfono propio</label>
                    <Input className="mt-1" placeholder="600 000 000" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500">Email propio</label>
                      <Input className="mt-1" placeholder="juan@empresa.com" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} />
                    </div>
                  </div>
                </div>
                {F('address', 'Dirección personal (si difiere)', 'Calle Mayor 1, Madrid')}
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium text-gray-700">Usar datos de empresa en la tarjeta:</p>
                  {Toggle('use_company_phone', `Usar teléfono empresa (${company?.phone || 'no configurado'})`)}
                  {Toggle('use_company_email', `Usar email empresa (${company?.email || 'no configurado'})`)}
                </div>
              </TabsContent>

              <TabsContent value="empresa" className="space-y-3 pt-3">
                <div>
                  <label className="text-xs text-gray-500">Nombre empresa en tarjeta (deja vacío para usar el de configuración)</label>
                  <Input className="mt-1" placeholder={company?.company_name || 'Mi Empresa S.L.'} value={form.company_name_override || ''} onChange={e => setForm({ ...form, company_name_override: e.target.value })} />
                </div>
                {F('website', 'Web (deja vacío para usar la de empresa)', 'www.miempresa.com')}
              </TabsContent>

              <TabsContent value="diseno" className="space-y-3 pt-3">
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
                      <SelectItem value="red">Rojo Intenso</SelectItem>
                      <SelectItem value="teal">Verde Azulado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Letra de la tarjeta */}
                <div className="bg-gray-50 rounded-lg p-3 space-y-3">
                  <p className="text-xs font-medium text-gray-700">Letra de la tarjeta</p>
                  <div>
                    <label className="text-xs text-gray-500">Tipo de letra</label>
                    <Select value={form.card_font || 'arial'} onValueChange={v => setForm({ ...form, card_font: v })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {gruposDeFuentes().map(({ grupo, fuentes }) => (
                          <SelectGroup key={grupo}>
                            <SelectLabel>{grupo}</SelectLabel>
                            {fuentes.map(f => (
                              <SelectItem key={f.id} value={f.id}>
                                <span style={{ fontFamily: f.familia }}>{f.nombre}</span>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-gray-400 mt-1">{fuentePorId(form.card_font).nota}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">
                      Tamaño del texto — {escalaValida(form.card_font_scale)}%
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-gray-400">A</span>
                      <input
                        type="range"
                        min={ESCALA_MIN}
                        max={ESCALA_MAX}
                        step={5}
                        aria-label="Tamaño del texto de la tarjeta"
                        value={escalaValida(form.card_font_scale)}
                        onChange={e => setForm({ ...form, card_font_scale: escalaValida(e.target.value) })}
                        className="flex-1 accent-blue-600"
                      />
                      <span className="text-base text-gray-400">A</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Mueve la tarjeta entera a la vez, no solo el nombre. Lo que ves es lo que se imprime.
                    </p>
                  </div>

                  {Toggle('card_font_bold', 'Negrita')}
                  {Toggle('card_font_italic', 'Cursiva')}
                </div>

                {/* Cada campo por su cuenta. Lo que no se toca hereda lo de
                    arriba, para no tener que configurar cinco cosas cuando
                    solo quieres cambiar el nombre. */}
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium text-gray-700">Ajustar cada campo por separado</p>
                  <p className="text-[10px] text-gray-400">
                    Lo que dejes sin tocar sigue lo de arriba. Pulsa un campo para desplegarlo.
                  </p>
                  {CAMPOS_TARJETA.map((campo) => {
                    const a = ajustesDeCampo(form, campo.id, '#334155');
                    const abierto = campoAbierto === campo.id;
                    return (
                      <div key={campo.id} className="rounded-md border bg-white">
                        <button
                          type="button"
                          onClick={() => setCampoAbierto(abierto ? null : campo.id)}
                          className="flex w-full items-center justify-between px-2 py-1.5 text-left"
                          data-prueba={`campo-${campo.id}`}
                        >
                          <span className="text-xs font-medium text-gray-700">{campo.nombre}</span>
                          <span className="text-[10px] text-gray-400">
                            {a.aMedida ? <b className="text-blue-600">a medida</b> : 'igual que la tarjeta'}
                            {abierto ? ' ▴' : ' ▾'}
                          </span>
                        </button>

                        {abierto && (
                          <div className="space-y-2 border-t px-2 py-2">
                            <div>
                              <label className="text-[10px] text-gray-500">Tipo de letra</label>
                              <Select
                                value={a.fuente}
                                onValueChange={(v2) => setForm(conCampoCambiado(form, campo.id, { fuente: v2 }))}
                              >
                                <SelectTrigger className="mt-0.5 h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {gruposDeFuentes().map(({ grupo, fuentes }) => (
                                    <SelectGroup key={grupo}>
                                      <SelectLabel>{grupo}</SelectLabel>
                                      {fuentes.map((f) => (
                                        <SelectItem key={f.id} value={f.id}>
                                          <span style={{ fontFamily: f.familia }}>{f.nombre}</span>
                                        </SelectItem>
                                      ))}
                                    </SelectGroup>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <label className="text-[10px] text-gray-500">
                                Tamaño de este campo — {a.escalaCampo}%
                              </label>
                              <input
                                type="range"
                                min={CAMPO_ESCALA_MIN}
                                max={CAMPO_ESCALA_MAX}
                                step={5}
                                aria-label={`Tamaño de ${campo.nombre}`}
                                value={a.escalaCampo}
                                onChange={(e) => setForm(conCampoCambiado(form, campo.id, { escala: escalaCampoValida(e.target.value) }))}
                                className="mt-0.5 w-full accent-blue-600"
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <label className="text-[10px] text-gray-500">Color</label>
                              <input
                                type="color"
                                aria-label={`Color de ${campo.nombre}`}
                                value={a.color}
                                onChange={(e) => setForm(conCampoCambiado(form, campo.id, { color: e.target.value }))}
                                className="h-7 w-12 cursor-pointer rounded border"
                              />
                              <span className="text-[10px] text-gray-400">{a.color}</span>
                            </div>

                            <div className="flex gap-3">
                              <label className="flex items-center gap-1.5 text-[11px] text-gray-700">
                                <input type="checkbox" checked={a.negrita}
                                  aria-label={`Negrita en ${campo.nombre}`}
                                  onChange={(e) => setForm(conCampoCambiado(form, campo.id, { negrita: e.target.checked }))} />
                                Negrita
                              </label>
                              <label className="flex items-center gap-1.5 text-[11px] text-gray-700">
                                <input type="checkbox" checked={a.cursiva}
                                  aria-label={`Cursiva en ${campo.nombre}`}
                                  onChange={(e) => setForm(conCampoCambiado(form, campo.id, { cursiva: e.target.checked }))} />
                                Cursiva
                              </label>
                            </div>

                            {a.aMedida && (
                              <Button type="button" size="sm" variant="outline" className="h-7 w-full text-[10px]"
                                onClick={() => setForm(conCampoPorDefecto(form, campo.id))}>
                                Dejar este campo como el resto
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium text-gray-700">Elementos a mostrar:</p>
                  {Toggle('show_logo', 'Mostrar logo empresa')}
                  {Toggle('show_qr', 'Código QR (vCard contacto)')}
                  {Toggle('show_address', 'Dirección')}
                  {Toggle('show_nif', 'NIF personal')}
                </div>
                {/* Campos personalizados a medida (van también al QR/vCard) */}
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-700">Campos personalizados (a tu gusto)</p>
                    <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1"
                      onClick={() => setForm({ ...form, custom_fields: [...(form.custom_fields || []), { label: '', value: '' }] })}>
                      <Plus className="w-3 h-3" />Añadir campo
                    </Button>
                  </div>
                  <p className="text-[10px] text-gray-400">Ej: WhatsApp, Web, Instagram, Horario… Se añaden a la tarjeta y al QR, y el QR se actualiza solo.</p>
                  {(form.custom_fields || []).map((f, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input className="flex-1 h-8 text-xs" placeholder="Etiqueta (ej: WhatsApp)" value={f.label}
                        onChange={e => setForm({ ...form, custom_fields: form.custom_fields.map((x, j) => j === idx ? { ...x, label: e.target.value } : x) })} />
                      <Input className="flex-1 h-8 text-xs" placeholder="Valor" value={f.value}
                        onChange={e => setForm({ ...form, custom_fields: form.custom_fields.map((x, j) => j === idx ? { ...x, value: e.target.value } : x) })} />
                      <button type="button" className="text-red-400 hover:text-red-600 text-lg leading-none px-1"
                        onClick={() => setForm({ ...form, custom_fields: form.custom_fields.filter((_, j) => j !== idx) })}>×</button>
                    </div>
                  ))}
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-700 flex items-start gap-2">
                  <QrCode className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>El <strong>código QR</strong> codifica los datos de contacto en formato vCard (incluidos tus campos personalizados) — al escanearlo con cualquier móvil se guarda el contacto directamente. Se genera en el propio programa, así que <strong>nunca queda en blanco</strong> y se actualiza al cambiar los datos.</p>
                </div>
              </TabsContent>
            </Tabs>

            <Button onClick={handleSave} disabled={!form.name} className="w-full bg-blue-600">
              {editing !== null ? 'Actualizar tarjeta' : 'Crear tarjeta'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}