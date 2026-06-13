import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Upload, Loader2, Thermometer, FileImage, FileText, Zap,
  Package, Trash2, Download, ChevronDown, ChevronRight,
  AlertCircle, Wind, LayoutGrid, User, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import NavBar from '@/components/NavBar';

const REFRIGERANTES = [
  { key: 'R-32',   label: 'R-32 (Estandar actual)',   gwp: 675  },
  { key: 'R-410A', label: 'R-410A (Legado)',           gwp: 2088 },
  { key: 'R-290',  label: 'R-290 Propano (Ecologico)', gwp: 3    },
  { key: 'R-134a', label: 'R-134a',                    gwp: 1430 },
];

// ─── Canvas del plano con maquinas ─────────────────────────────────────────
function PlanCanvas({ rooms, imageUrl }) {
  const canvasRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !rooms?.length) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    // Grid de fondo
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

    const cols = Math.ceil(Math.sqrt(rooms.length + 1));
    const rows = Math.ceil((rooms.length + 1) / cols);
    const cw = (W - 60) / cols;
    const ch = (H - 60) / rows;

    // Dibujar cada habitacion
    rooms.forEach((room, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = 30 + col * cw;
      const y = 30 + row * ch;
      const rw = cw - 10;
      const rh = ch - 10;

      // Fondo habitacion
      const grad = ctx.createLinearGradient(x, y, x + rw, y + rh);
      grad.addColorStop(0, 'rgba(30,41,59,0.95)');
      grad.addColorStop(1, 'rgba(15,23,42,0.95)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, rw, rh);

      // Borde segun tipo
      const borderColors = { split: '#ef4444', consola: '#3b82f6', cassette: '#8b5cf6', conductos: '#f59e0b' };
      ctx.strokeStyle = borderColors[room.machine_type] || '#475569';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, rw, rh);

      // Nombre estancia
      ctx.fillStyle = '#e2e8f0';
      const fontSize = Math.max(9, Math.min(13, rw / 8));
      ctx.font = `bold ${fontSize}px 'Courier New', monospace`;
      ctx.textAlign = 'center';
      const nameLines = room.name.length > 14 ? [room.name.substring(0,14), room.name.substring(14)] : [room.name];
      nameLines.forEach((line, li) => ctx.fillText(line, x + rw/2, y + 16 + li * 14));

      ctx.fillStyle = '#94a3b8';
      ctx.font = `${Math.max(8,fontSize-2)}px 'Courier New', monospace`;
      ctx.fillText(room.area_m2 + 'm²', x + rw/2, y + rh - 28);

      // Icono de la maquina
      const mx = x + rw/2, my = y + rh/2 + 4;
      const tipo = room.machine_type;

      if (tipo === 'split' || tipo === 'mural') {
        // Split mural - rectángulo rojo
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(mx - 22, my - 7, 44, 14);
        ctx.fillStyle = '#fef2f2';
        ctx.font = 'bold 7px monospace';
        ctx.fillText('SPLIT', mx, my + 3);
        // Tuberias
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3,2]);
        ctx.beginPath(); ctx.moveTo(mx - 22, my); ctx.lineTo(mx - 40, my + 10); ctx.stroke();
        ctx.setLineDash([]);
      } else if (tipo === 'consola' || tipo === 'suelo') {
        // Consola suelo - rectangulo azul
        ctx.fillStyle = '#1d4ed8';
        ctx.fillRect(mx - 18, my, 36, 16);
        ctx.fillStyle = '#eff6ff';
        ctx.font = 'bold 7px monospace';
        ctx.fillText('CONSOLA', mx, my + 11);
      } else if (tipo === 'cassette') {
        // Cassette - circulo morado
        ctx.beginPath(); ctx.arc(mx, my, 16, 0, Math.PI * 2);
        ctx.fillStyle = '#7c3aed'; ctx.fill();
        ctx.fillStyle = '#f5f3ff';
        ctx.font = 'bold 7px monospace';
        ctx.fillText('CASS', mx, my + 3);
        // Flechas de aire
        for (let a = 0; a < 4; a++) {
          const ang = a * Math.PI/2;
          ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(mx + Math.cos(ang)*16, my + Math.sin(ang)*16);
          ctx.lineTo(mx + Math.cos(ang)*24, my + Math.sin(ang)*24);
          ctx.stroke();
        }
      } else if (tipo === 'conductos') {
        // Conductos - bocas cuadradas
        ctx.fillStyle = '#b45309';
        ctx.fillRect(mx - 10, my - 10, 20, 20);
        ctx.fillStyle = '#fef3c7';
        ctx.font = 'bold 7px monospace';
        ctx.fillText('COND', mx, my + 3);
        // Lineas de conducto
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.setLineDash([4,2]);
        ctx.beginPath(); ctx.moveTo(mx, my - 10); ctx.lineTo(mx, y + 5); ctx.stroke();
        ctx.setLineDash([]);
      }

      // Potencia
      ctx.fillStyle = '#22d3ee';
      ctx.font = `bold ${Math.max(9,fontSize-1)}px 'Courier New', monospace`;
      ctx.fillText(room.power_kw + ' kW', x + rw/2, y + rh - 14);
    });

    // Condensadora exterior - esquina inferior derecha
    const ox = W - 80, oy = H - 55;
    ctx.fillStyle = '#92400e';
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2;
    ctx.fillRect(ox, oy, 72, 48);
    ctx.strokeRect(ox, oy, 72, 48);
    // Fan
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(ox + 36, oy + 24, 16, 0, Math.PI * 2); ctx.stroke();
    for (let a = 0; a < 6; a++) {
      const ang = a * Math.PI/3;
      ctx.beginPath();
      ctx.moveTo(ox+36 + Math.cos(ang)*6, oy+24 + Math.sin(ang)*6);
      ctx.lineTo(ox+36 + Math.cos(ang)*15, oy+24 + Math.sin(ang)*15);
      ctx.stroke();
    }
    ctx.fillStyle = '#fef3c7'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
    ctx.fillText('COND.EXT', ox + 36, oy + 44);

    // Leyenda
    const leyenda = [
      { color: '#dc2626', label: 'Split mural' },
      { color: '#1d4ed8', label: 'Consola' },
      { color: '#7c3aed', label: 'Cassette' },
      { color: '#b45309', label: 'Conductos' },
    ];
    ctx.textAlign = 'left';
    leyenda.forEach((l, i) => {
      ctx.fillStyle = l.color;
      ctx.fillRect(8, 8 + i * 16, 10, 10);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '8px monospace';
      ctx.fillText(l.label, 22, 17 + i * 16);
    });
  }, [rooms]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={820}
        height={520}
        className="w-full rounded-xl border border-slate-700"
        style={{ background: '#0f172a' }}
      />
      {tooltip && (
        <div className="absolute top-2 right-2 bg-slate-800 border border-slate-600 rounded-lg p-2 text-xs text-slate-300 pointer-events-none">
          {tooltip}
        </div>
      )}
    </div>
  );
}

// ─── Tarjeta de estancia ─────────────────────────────────────────────────────
function RoomCard({ room, idx }) {
  const [open, setOpen] = useState(idx < 2);

  const tipo_colors = {
    split: 'bg-red-100 text-red-700 border-red-200',
    mural: 'bg-red-100 text-red-700 border-red-200',
    consola: 'bg-blue-100 text-blue-700 border-blue-200',
    suelo: 'bg-blue-100 text-blue-700 border-blue-200',
    cassette: 'bg-purple-100 text-purple-700 border-purple-200',
    conductos: 'bg-amber-100 text-amber-700 border-amber-200',
  };

  return (
    <Card className="overflow-hidden border border-slate-200 hover:shadow-md transition-shadow">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-3 bg-white hover:bg-slate-50 transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {idx + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900">{room.name}</p>
          <p className="text-xs text-slate-500">
            {room.area_m2}m² &bull; {room.power_kw}kW &bull; {room.power_frigorias?.toLocaleString('es-ES')} frig/h
          </p>
        </div>
        <Badge className={`text-xs border ${tipo_colors[room.machine_type] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
          {room.machine_type}
        </Badge>
        {open ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
      </button>

      {open && (
        <CardContent className="pt-0 pb-4 border-t border-slate-100 bg-slate-50 space-y-4">
          {/* Maquinas propuestas */}
          {room.machines?.length > 0 && (
            <div className="pt-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Opciones de maquina</p>
              <div className="space-y-1.5">
                {(room.machines||[]).map((m, i) => (
                  <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg border text-sm ${i === 0 ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'}`}>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${i === 0 ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      {i === 0 ? '★' : i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900">{m.brand} {m.model}</p>
                      <p className="text-xs text-slate-500">{m.kw}kW &bull; Gas {m.gas} &bull; SEER {m.seer} &bull; {m.tipo}</p>
                    </div>
                    {m.precio != null && (
                      <span className="text-slate-800 font-bold text-sm flex-shrink-0">
                        {m.precio.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conductos */}
          {room.conductos?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                <Wind className="w-3 h-3" /> Dimensionado de conductos
              </p>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-amber-50 text-amber-800">
                      <th className="text-left px-3 py-2">Tramo</th>
                      <th className="text-right px-2 py-2">Caudal m3/h</th>
                      <th className="text-right px-2 py-2">Seccion mm</th>
                      <th className="text-right px-2 py-2">Vel. m/s</th>
                      <th className="text-right px-3 py-2">Perd. Pa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(room.conductos||[]).map((c, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="px-3 py-1.5 font-medium">{c.tramo || 'T' + (i+1)}</td>
                        <td className="px-2 py-1.5 text-right">{c.caudal_m3h}</td>
                        <td className="px-2 py-1.5 text-right">{c.seccion_mm || c.diametro_mm || '-'}</td>
                        <td className="px-2 py-1.5 text-right">{c.velocidad_ms ?? '-'}</td>
                        <td className="px-3 py-1.5 text-right">{c.perdida_pa ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Rejillas */}
          {room.rejillas?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Rejillas y bocas de aire</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {room.rejillas.map((r, i) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs">
                    <p className="font-semibold text-slate-800">{r.tipo} &mdash; {r.dimensiones}</p>
                    <p className="text-slate-500">{r.caudal_m3h} m3/h &bull; {r.ubicacion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Pagina principal ────────────────────────────────────────────────────────
export default function ACPlanAnalysis() {
  const fileRef = useRef(null);

  const [file, setFile]             = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [refrigerante, setRefrigerante] = useState('R-32');
  const [supplierId, setSupplierId] = useState('');
  const [contactId, setContactId]   = useState('');
  const [step, setStep]             = useState('idle');
  const [progress, setProgress]     = useState('');
  const [result, setResult]         = useState(null);
  const [error, setError]           = useState('');
  const [contacts, setContacts]     = useState([]);
  const [suppliers, setSuppliers]   = useState([]);
  const [supplierPrices, setSupplierPrices] = useState([]);

  useEffect(() => {
    base44.entities.Contact.list('name', 500).then(setContacts).catch(() => {});
    base44.entities.SupplierPrice.list('-created_date', 2000, 0).then(prices => {
      const map = {};
      prices.forEach(p => {
        if (p.supplier_id && !map[p.supplier_id])
          map[p.supplier_id] = { id: p.supplier_id, name: p.supplier_name || p.supplier_id };
      });
      setSuppliers(Object.values(map));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!supplierId) { setSupplierPrices([]); return; }
    base44.entities.SupplierPrice.filter({ supplier_id: supplierId })
      .then(setSupplierPrices).catch(() => setSupplierPrices([]));
  }, [supplierId]);

  const handleFile = (f) => {
    if (!f) return;
    setFile(f); setResult(null); setError('');
    if (f.type.startsWith('image/')) {
      setFilePreview(URL.createObjectURL(f));
    } else {
      setFilePreview(null);
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const analizar = async () => {
    if (!file) { toast.error('Sube un plano primero'); return; }
    setStep('uploading'); setError('');
    setProgress('Subiendo plano al servidor...');

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      setStep('analyzing');
      setProgress('La IA esta analizando las estancias del plano (30-60 segundos)...');

      const refData = REFRIGERANTES.find(r => r.key === refrigerante);
      const prompt = [
        'Eres un ingeniero experto en instalaciones de climatizacion. Analiza este plano arquitectonico y realiza el proyecto completo de climatizacion.',
        '',
        'REGLAS:',
        '1. Identifica TODAS las estancias habitables: salones, dormitorios, cocinas, despachos, comedores, pasillos grandes.',
        '2. EXCLUYE completamente: banos, aseos, garajes, terrazas, jardines, trasteros, escaleras.',
        '3. Para cada estancia calcula potencia: superficie x coeficiente segun uso (residencial 100 W/m2, oficina 120, comercial 150).',
        '4. Elige el tipo de maquina mas adecuado: split (dormitorios, salones pequenos), cassette (techos altos), consola/suelo (espacios amplios), conductos (espacios multiples conectados).',
        '5. Para conductos: dimensiona TODOS los tramos, caudales, secciones rectangulares o circulares, velocidades y perdidas de carga.',
        '6. Para conductos: especifica todas las rejillas de impulsion y retorno con dimensiones y caudales.',
        '7. Proporciona 3 modelos de maquina por estancia de marcas distintas: Daikin, Mitsubishi Electric, Fujitsu, Samsung, LG.',
        '8. Calcula la condensadora exterior total requerida y 2 alternativas.',
        '9. Genera la lista de materiales completa con cantidades y precios orientativos en euros.',
        '10. Refrigerante a usar: ' + refrigerante + ' (GWP: ' + refData?.gwp + '). Aplica este gas a todos los equipos.',
        '',
        'DEVUELVE UNICAMENTE JSON con esta estructura exacta (sin texto adicional):',
        '{',
        '  "total_power_kw": numero,',
        '  "total_frigorias": numero,',
        '  "outdoor_unit": { "brand": string, "model": string, "kw": numero, "gas": "' + refrigerante + '", "zones": numero, "precio": numero },',
        '  "outdoor_unit_alternatives": [{ "brand": string, "model": string, "kw": numero, "precio": numero }],',
        '  "rooms": [',
        '    {',
        '      "name": string,',
        '      "area_m2": numero,',
        '      "power_w": numero,',
        '      "power_kw": numero,',
        '      "power_frigorias": numero,',
        '      "machine_type": "split|consola|cassette|conductos",',
        '      "machines": [{ "brand": string, "model": string, "kw": numero, "gas": "' + refrigerante + '", "seer": numero, "tipo": string, "precio": numero }],',
        '      "conductos": [{ "tramo": string, "caudal_m3h": numero, "seccion_mm": numero, "velocidad_ms": numero, "perdida_pa": numero }],',
        '      "rejillas": [{ "tipo": "impulsion|retorno", "dimensiones": string, "caudal_m3h": numero, "ubicacion": string }]',
        '    }',
        '  ],',
        '  "materiales": [{ "descripcion": string, "unidad": string, "cantidad": numero, "precio_ud": numero, "total": numero, "categoria": "maquinaria|tuberia|conductos|electrico|accesorios" }],',
        '  "total_material": numero,',
        '  "notas_tecnicas": string',
        '}'
      ].join('\n');

      const analysisResult = await base44.integrations.Core.InvokeLLM({
        model: 'claude_sonnet_4_6',
        prompt,
        file_urls: [file_url],
        response_json_schema: {
          type: 'object',
          properties: {
            total_power_kw:            { type: 'number' },
            total_frigorias:           { type: 'number' },
            outdoor_unit:              { type: 'object' },
            outdoor_unit_alternatives: { type: 'array' },
            rooms:                     { type: 'array' },
            materiales:                { type: 'array' },
            total_material:            { type: 'number' },
            notas_tecnicas:            { type: 'string' },
          }
        }
      });

      if (!analysisResult?.rooms?.length) {
        setError('No se identificaron estancias en el plano. Sube una imagen mas clara o un PDF de mayor resolucion.');
        setStep('idle'); return;
      }

      // Enriquecer precios con tarifa del proveedor seleccionado
      let enriched = analysisResult;
      if (supplierId && supplierPrices.length > 0) {
        setProgress('Consultando precios del proveedor seleccionado...');
        const enrich = (mats) => mats?.map(m => {
          const q = m.descripcion?.toLowerCase() || '';
          const match = supplierPrices.find(p => {
            const pn = p.product_name?.toLowerCase() || '';
            return pn.split(' ').some(w => w.length > 3 && q.includes(w)) ||
                   q.split(' ').some(w => w.length > 3 && pn.includes(w));
          });
          const precio = match?.net_price ?? m.precio_ud;
          return { ...m, precio_ud: precio, total: precio * m.cantidad, proveedor_match: match?.product_name };
        });
        const mats = enrich(analysisResult.materiales);
        const total = mats?.reduce((s, m) => s + (m.total || 0), 0) || 0;
        enriched = { ...analysisResult, materiales: mats, total_material: total };
      }

      setResult(enriched);
      setStep('done');
      toast.success(enriched.rooms.length + ' estancias analizadas correctamente');

    } catch (err) {
      console.error('Error analisis plano:', err);
      setError('Error durante el analisis. Comprueba la conexion a internet y vuelve a intentarlo.');
      setStep('idle');
    }
  };

  const exportar = async () => {
    if (!result) return;
    const contact = contacts.find(c => c.id === contactId);
    const lines = [
      'PROYECTO DE CLIMATIZACION',
      '=========================',
      'Cliente: ' + (contact?.name || 'Sin especificar'),
      'Refrigerante: ' + refrigerante,
      'Potencia total: ' + result.total_power_kw + ' kW / ' + result.total_frigorias?.toLocaleString('es-ES') + ' frig/h',
      '',
      'CONDENSADORA EXTERIOR',
      '---------------------',
      result.outdoor_unit?.brand + ' ' + result.outdoor_unit?.model + ' ' + result.outdoor_unit?.kw + 'kW - ' + result.outdoor_unit?.precio?.toLocaleString('es-ES') + ' EUR',
      '',
      'ESTANCIAS (' + result.rooms?.length + ')',
      '---------',
      ...(result.rooms?.map(r => r.name + ': ' + r.area_m2 + 'm2 / ' + r.power_kw + 'kW / ' + r.machine_type + ' / ' + r.machines?.[0]?.brand + ' ' + r.machines?.[0]?.model) || []),
      '',
      'LISTA DE MATERIALES',
      '-------------------',
      ...(result.materiales?.map(m => m.descripcion + ' | ' + m.cantidad + ' ' + m.unidad + ' | ' + m.precio_ud + ' EUR/ud | TOTAL: ' + m.total?.toFixed(2) + ' EUR') || []),
      '',
      'TOTAL MATERIAL: ' + result.total_material?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }),
      '',
      'NOTAS TECNICAS',
      '--------------',
      result.notas_tecnicas || '',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'proyecto-climatizacion.txt'; a.click();
    toast.success('Informe exportado');
  };

  const stepLabel = {
    uploading: 'Subiendo plano al servidor...',
    analyzing: 'Analizando con IA (puede tardar hasta 60 segundos)...',
    idle: '',
    done: '',
  }[step] || progress;

  // Categorias de materiales
  const categorias = result?.materiales
    ? [...new Set(result.materiales.map(m => m.categoria).filter(Boolean))]
    : [];

  return (
    <div className="space-y-4 max-w-5xl">
      <NavBar title="Analisis de Plano con IA" />

      {/* Cabecera */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-900/20">
          <Thermometer className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Proyecto AA desde Plano</h1>
          <p className="text-slate-500 text-sm mt-0.5">Sube el plano y la IA calcula todo: maquinas, conductos, rejillas, materiales y precios</p>
        </div>
      </div>

      {step !== 'done' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ── Zona de subida ── */}
          <div className="lg:col-span-2">
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-red-400 hover:bg-red-50/30 rounded-2xl p-8 text-center cursor-pointer transition-all duration-200"
            >
              <input
                ref={fileRef} type="file" className="hidden"
                accept=".jpg,.jpeg,.png,.pdf,.dwg,.webp,.bmp,.tiff"
                onChange={e => handleFile(e.target.files[0])}
              />
              {file ? (
                <div className="space-y-3">
                  {filePreview ? (
                    <img src={filePreview} alt="Plano" className="max-h-56 mx-auto rounded-xl object-contain border border-slate-200 shadow" />
                  ) : (
                    <div className="w-16 h-16 mx-auto bg-red-50 rounded-2xl flex items-center justify-center">
                      <FileText className="w-9 h-9 text-red-500" />
                    </div>
                  )}
                  <p className="font-semibold text-slate-800">{file.name}</p>
                  <p className="text-sm text-slate-400">{(file.size/1024).toFixed(0)} KB</p>
                  <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); setFile(null); setFilePreview(null); }}>
                    Cambiar archivo
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center shadow-inner">
                    <Upload className="w-10 h-10 text-slate-400" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-700 text-lg">Arrastra el plano aqui</p>
                    <p className="text-slate-400 text-sm mt-1">o haz clic para seleccionar</p>
                  </div>
                  <div className="flex justify-center gap-2 flex-wrap">
                    {[
                      { icon: FileImage, label: 'JPG / PNG' },
                      { icon: FileText, label: 'PDF' },
                      { icon: LayoutGrid, label: 'DWG (como imagen)' },
                    ].map(({ icon: Icon, label }) => (
                      <Badge key={label} variant="outline" className="gap-1.5 text-xs px-3 py-1">
                        <Icon className="w-3 h-3" />{label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Configuracion ── */}
          <div className="space-y-3">
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-bold text-slate-700">Configuracion del proyecto</p>

                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Refrigerante</label>
                  <Select value={refrigerante} onValueChange={setRefrigerante}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REFRIGERANTES.map(r => (
                        <SelectItem key={r.key} value={r.key}>
                          <span className="font-medium">{r.label}</span>
                          <span className="text-xs text-slate-400 ml-1">GWP {r.gwp}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                    <User className="w-3 h-3" />Cliente (opcional)
                  </label>
                  <Select value={contactId} onValueChange={setContactId}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sin_asignar">Sin asignar</SelectItem>
                      {(contacts||[]).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                    <Package className="w-3 h-3" />Proveedor para precios
                  </label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Precio orientativo IA" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="precio_ia">Precio orientativo IA</SelectItem>
                      {(suppliers||[]).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 space-y-1">
              <p className="font-semibold flex items-center gap-1"><AlertCircle className="w-3 h-3" />Nota sobre DWG</p>
              <p>Exporta el plano desde AutoCAD como imagen JPG/PNG o PDF antes de subirlo. Los DWG nativos no son compatibles directamente.</p>
            </div>

            <Button
              onClick={analizar}
              disabled={!file || (step !== 'idle')}
              className="w-full h-12 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold gap-2 shadow-lg shadow-red-900/20"
            >
              {step !== 'idle'
                ? <><Loader2 className="w-4 h-4 animate-spin" />Analizando...</>
                : <><Zap className="w-4 h-4" />Analizar con IA</>
              }
            </Button>
          </div>

          {/* Progreso y error abarcan todo el ancho */}
          {step !== 'idle' && step !== 'done' && (
            <div className="lg:col-span-3">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-800">{stepLabel}</p>
                  <p className="text-xs text-blue-500 mt-0.5">La IA esta leyendo el plano y calculando el proyecto completo de climatizacion.</p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="lg:col-span-3">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-800">Error en el analisis</p>
                  <p className="text-sm text-red-600 mt-0.5">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ══ RESULTADOS ════════════════════════════════════════════════════════ */
        <div className="space-y-4">

          {/* KPIs resumen */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: 'Potencia total',
                value: result.total_power_kw + ' kW',
                sub: result.total_frigorias?.toLocaleString('es-ES') + ' frig/h',
                cls: 'bg-red-50 border-red-200 text-red-700'
              },
              {
                label: 'Estancias',
                value: result.rooms?.length,
                sub: 'climatizadas',
                cls: 'bg-blue-50 border-blue-200 text-blue-700'
              },
              {
                label: 'Condensadora',
                value: result.outdoor_unit?.kw + ' kW',
                sub: result.outdoor_unit?.brand + ' ' + result.outdoor_unit?.model,
                cls: 'bg-orange-50 border-orange-200 text-orange-700'
              },
              {
                label: 'Total material',
                value: result.total_material?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }),
                sub: supplierId ? 'seg. tarifa proveedor' : 'precio orientativo',
                cls: 'bg-green-50 border-green-200 text-green-700'
              },
            ].map(({ label, value, sub, cls }) => (
              <div key={label} className={'border rounded-2xl p-3 text-center ' + cls}>
                <p className="text-[11px] font-medium opacity-60">{label}</p>
                <p className="text-xl font-bold leading-tight mt-0.5">{value}</p>
                <p className="text-[11px] opacity-50 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          {/* Plano */}
          <Card className="bg-slate-900 border-slate-800 overflow-hidden">
            <CardHeader className="py-3 border-b border-slate-800">
              <CardTitle className="text-slate-100 text-sm flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-cyan-400" />
                Distribucion de equipos en planta
                <Badge className="ml-auto bg-slate-700 text-slate-300 text-xs">
                  {result.rooms?.length} zonas
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <PlanCanvas rooms={result.rooms} />
            </CardContent>
          </Card>

          {/* Condensadora exterior */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wind className="w-4 h-4 text-orange-500" />Unidades exteriores propuestas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              {/* Principal */}
              <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                <Badge className="bg-orange-600 text-white text-xs flex-shrink-0">Principal</Badge>
                <div className="flex-1">
                  <p className="font-bold text-slate-900">{result.outdoor_unit?.brand} {result.outdoor_unit?.model}</p>
                  <p className="text-xs text-slate-500">{result.outdoor_unit?.kw}kW &bull; {result.outdoor_unit?.zones} zonas &bull; Gas {refrigerante}</p>
                </div>
                {result.outdoor_unit?.precio != null && (
                  <span className="font-bold text-slate-800">
                    {result.outdoor_unit.precio.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                  </span>
                )}
              </div>
              {/* Alternativas */}
              {result.outdoor_unit_alternatives?.map((u, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <Badge variant="outline" className="text-xs flex-shrink-0">Alt. {i+1}</Badge>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">{u.brand} {u.model}</p>
                    <p className="text-xs text-slate-500">{u.kw}kW &bull; Gas {refrigerante}</p>
                  </div>
                  {u.precio != null && (
                    <span className="font-semibold text-slate-700">
                      {u.precio.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                    </span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Estancias */}
          <div>
            <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Thermometer className="w-5 h-5 text-red-500" />
              Proyecto por estancias ({result.rooms?.length})
            </h2>
            <div className="space-y-2">
              {result.rooms?.map((room, i) => (
                <RoomCard key={i} room={room} idx={i} />
              ))}
            </div>
          </div>

          {/* Lista de materiales */}
          {result.materiales?.length > 0 && (
            <Card className="overflow-hidden">
              <CardHeader className="py-3 bg-slate-900">
                <CardTitle className="text-slate-100 text-sm flex items-center gap-2">
                  <Package className="w-4 h-4 text-green-400" />
                  Lista de materiales completa
                  <Badge className="ml-auto bg-slate-700 text-slate-300 text-xs">{result.materiales.length} partidas</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {categorias.map(cat => (
                  <div key={cat}>
                    <div className="px-4 py-2 bg-slate-100 text-xs font-bold text-slate-600 uppercase tracking-widest border-y border-slate-200">
                      {cat}
                    </div>
                    <table className="w-full text-sm">
                      <colgroup>
                        <col style={{width:'45%'}} />
                        <col style={{width:'10%'}} />
                        <col style={{width:'8%'}} />
                        <col style={{width:'14%'}} />
                        <col style={{width:'16%'}} />
                      </colgroup>
                      <thead>
                        <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                          <th className="text-left px-4 py-2">Descripcion</th>
                          <th className="text-right px-2 py-2">Cant.</th>
                          <th className="text-right px-2 py-2">Ud.</th>
                          <th className="text-right px-2 py-2">Precio/ud</th>
                          <th className="text-right px-4 py-2">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {result.materiales.filter(m => m.categoria === cat).map((m, i) => (
                          <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                            <td className="px-4 py-2.5">
                              {m.descripcion}
                              {m.proveedor_match && (
                                <span className="ml-1.5 text-[10px] text-green-600 font-semibold bg-green-50 px-1 py-0.5 rounded">
                                  tarifa
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-2.5 text-right font-medium">{m.cantidad}</td>
                            <td className="px-2 py-2.5 text-right text-slate-400">{m.unidad}</td>
                            <td className="px-2 py-2.5 text-right">
                              {m.precio_ud?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                              {m.total?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
                <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-t-2 border-green-500">
                  <span className="font-black text-slate-100 text-base tracking-wide">TOTAL MATERIAL</span>
                  <span className="text-2xl font-black text-green-400">
                    {result.total_material?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notas tecnicas */}
          {result.notas_tecnicas && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm font-bold text-amber-800 mb-1 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />Notas tecnicas del proyecto
              </p>
              <p className="text-sm text-amber-700 leading-relaxed">{result.notas_tecnicas}</p>
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-2 flex-wrap">
            <Button onClick={exportar} className="gap-2 bg-slate-800 hover:bg-slate-900 text-white">
              <Download className="w-4 h-4" />Exportar informe
            </Button>
            <Button
              variant="outline"
              onClick={() => { setResult(null); setStep('idle'); setFile(null); setFilePreview(null); }}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />Nuevo analisis
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
