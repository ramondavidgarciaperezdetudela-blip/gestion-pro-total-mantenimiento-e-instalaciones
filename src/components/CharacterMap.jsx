import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Copy, Check, X } from 'lucide-react';
import { toast } from 'sonner';

// ─── Todos los bloques Unicode presentes en Windows (Character Map completo) ──
const BLOCKS = [
  // ── Básico y Latin ─────────────────────────────────────────────────────────
  { name: 'ASCII Imprimible',        from: 0x0020, to: 0x007E },
  { name: 'Latin-1 Supplement',      from: 0x00A0, to: 0x00FF },
  { name: 'Latin Extendido-A',       from: 0x0100, to: 0x017F },
  { name: 'Latin Extendido-B',       from: 0x0180, to: 0x024F },
  { name: 'IPA Extensions',          from: 0x0250, to: 0x02AF },
  { name: 'Spacing Modifier Letters',from: 0x02B0, to: 0x02FF },
  { name: 'Diacritical Marks',       from: 0x0300, to: 0x036F },
  { name: 'Latin Extended Additional',from:0x1E00, to: 0x1EFF },
  // ── Griego y Cirílico ──────────────────────────────────────────────────────
  { name: 'Griego y Copto',          from: 0x0370, to: 0x03FF },
  { name: 'Cirílico',                from: 0x0400, to: 0x04FF },
  { name: 'Cirílico Suplementario',  from: 0x0500, to: 0x052F },
  { name: 'Griego Extendido',        from: 0x1F00, to: 0x1FFF },
  // ── Escrituras del mundo ────────────────────────────────────────────────────
  { name: 'Armenio',                 from: 0x0530, to: 0x058F },
  { name: 'Hebreo',                  from: 0x0590, to: 0x05FF },
  { name: 'Árabe',                   from: 0x0600, to: 0x06FF },
  { name: 'Árabe Presentación-A',    from: 0xFB50, to: 0xFDFF },
  { name: 'Árabe Presentación-B',    from: 0xFE70, to: 0xFEFF },
  { name: 'Siríaco',                 from: 0x0700, to: 0x074F },
  { name: 'Thaana',                  from: 0x0780, to: 0x07BF },
  { name: 'Devanagari',              from: 0x0900, to: 0x097F },
  { name: 'Bengalí',                 from: 0x0980, to: 0x09FF },
  { name: 'Gurmukhi',                from: 0x0A00, to: 0x0A7F },
  { name: 'Gujarati',                from: 0x0A80, to: 0x0AFF },
  { name: 'Oriya',                   from: 0x0B00, to: 0x0B7F },
  { name: 'Tamil',                   from: 0x0B80, to: 0x0BFF },
  { name: 'Telugu',                  from: 0x0C00, to: 0x0C7F },
  { name: 'Kannada',                 from: 0x0C80, to: 0x0CFF },
  { name: 'Malayalam',               from: 0x0D00, to: 0x0D7F },
  { name: 'Cingalés',                from: 0x0D80, to: 0x0DFF },
  { name: 'Thai',                    from: 0x0E00, to: 0x0E7F },
  { name: 'Lao',                     from: 0x0E80, to: 0x0EFF },
  { name: 'Tibetano',                from: 0x0F00, to: 0x0FFF },
  { name: 'Birmano (Myanmar)',        from: 0x1000, to: 0x109F },
  { name: 'Georgiano',               from: 0x10A0, to: 0x10FF },
  { name: 'Hangul Jamo',             from: 0x1100, to: 0x11FF },
  { name: 'Etíope',                  from: 0x1200, to: 0x137F },
  { name: 'Cherokee',                from: 0x13A0, to: 0x13FF },
  { name: 'Silabario Unificado Indígena Canadiense', from: 0x1400, to: 0x167F },
  { name: 'Ogham',                   from: 0x1680, to: 0x169F },
  { name: 'Rúnico',                  from: 0x16A0, to: 0x16FF },
  { name: 'Tagalo',                  from: 0x1700, to: 0x171F },
  { name: 'Jemer',                   from: 0x1780, to: 0x17FF },
  { name: 'Mongol',                  from: 0x1800, to: 0x18AF },
  // ── Hiragana, Katakana, CJK ────────────────────────────────────────────────
  { name: 'Hiragana',                from: 0x3040, to: 0x309F },
  { name: 'Katakana',                from: 0x30A0, to: 0x30FF },
  { name: 'Bopomofo',                from: 0x3100, to: 0x312F },
  { name: 'Hangul Compatibilidad Jamo',from:0x3130, to: 0x318F },
  { name: 'Kanbun',                  from: 0x3190, to: 0x319F },
  { name: 'Bopomofo Extendido',      from: 0x31A0, to: 0x31BF },
  { name: 'CJK Radicales Suplemento',from: 0x2E80, to: 0x2EFF },
  { name: 'Kangxi Radicales',        from: 0x2F00, to: 0x2FDF },
  { name: 'CJK Símbolos y Puntuación',from:0x3000, to: 0x303F },
  { name: 'CJK Unified Ideographs (1)',from:0x4E00,to: 0x4FFF },
  { name: 'CJK Unified Ideographs (2)',from:0x5000,to: 0x51FF },
  { name: 'CJK Unified Ideographs (3)',from:0x5200,to: 0x54FF },
  { name: 'Hangul Sílabas (inicio)',  from: 0xAC00, to: 0xACFF },
  { name: 'CJK Compatibilidad Ideografías',from:0xF900,to:0xFAFF },
  { name: 'CJK Formas de Compatibilidad', from:0xFE30,to:0xFE4F },
  { name: 'Katakana Extensión Fonética', from:0x31F0,to:0x31FF },
  // ── Símbolos, flechas, matemáticas ────────────────────────────────────────
  { name: 'Puntuación General',       from: 0x2000, to: 0x206F },
  { name: 'Superíndices y Subíndices',from: 0x2070, to: 0x209F },
  { name: 'Símbolos Monetarios',      from: 0x20A0, to: 0x20CF },
  { name: 'Marcas Diacríticas Combinadas',from:0x20D0,to:0x20FF },
  { name: 'Numerales Griegos/Coptos', from: 0x2100, to: 0x214F },
  { name: 'Números Parecidos a Letras',from:0x2150, to: 0x218F },
  { name: 'Flechas',                  from: 0x2190, to: 0x21FF },
  { name: 'Operadores Matemáticos',   from: 0x2200, to: 0x22FF },
  { name: 'Técnicos Misceláneos',     from: 0x2300, to: 0x23FF },
  { name: 'Caracteres Control de Imágenes',from:0x2400,to:0x243F },
  { name: 'Alfanumérico Delimitado',  from: 0x2440, to: 0x245F },
  { name: 'Alfanumérico Delimitado 2',from: 0x2460, to: 0x24FF },
  { name: 'Box Drawing',              from: 0x2500, to: 0x257F },
  { name: 'Block Elements',           from: 0x2580, to: 0x259F },
  { name: 'Formas Geométricas',       from: 0x25A0, to: 0x25FF },
  { name: 'Símbolos Misceláneos',     from: 0x2600, to: 0x26FF },
  { name: 'Dingbats',                 from: 0x2700, to: 0x27BF },
  { name: 'Flechas Suplementarias-A', from: 0x27F0, to: 0x27FF },
  { name: 'Braille',                  from: 0x2800, to: 0x28FF },
  { name: 'Flechas Suplementarias-B', from: 0x2900, to: 0x297F },
  { name: 'Operadores Matemáticos Misc.',from:0x2980,to:0x29FF },
  { name: 'Operadores Sup. A',        from: 0x2A00, to: 0x2AFF },
  { name: 'Operadores Sup. B',        from: 0x2B00, to: 0x2BFF },
  { name: 'Alfabetos Matemáticos',    from: 0x1D400,to:0x1D7FF },
  // ── Emojis y símbolos modernos ─────────────────────────────────────────────
  { name: 'Emojis Emoticones',        from: 0x1F600, to: 0x1F64F },
  { name: 'Emojis Varios',            from: 0x1F300, to: 0x1F5FF },
  { name: 'Emojis Transporte/Mapas',  from: 0x1F680, to: 0x1F6FF },
  { name: 'Emojis Suplementarios',    from: 0x1F900, to: 0x1F9FF },
  { name: 'Emojis Símbolos Ext-A',    from: 0x1FA00, to: 0x1FA6F },
  { name: 'Emojis Símbolos Ext-B',    from: 0x1FA70, to: 0x1FAFF },
  { name: 'Símbolos y Pictogramas',   from: 0x1F700, to: 0x1F77F },
  { name: 'Misceláneos Simbólicos',   from: 0x2600, to: 0x26FF },
  // ── Especiales Windows ─────────────────────────────────────────────────────
  { name: 'Área Uso Privado (PUA)',   from: 0xE000, to: 0xE0FF },
  { name: 'Formas de Presentación-A', from: 0xFB00, to: 0xFB4F },
  { name: 'Variaciones de Selección', from: 0xFE00, to: 0xFE0F },
  { name: 'Formas Pequeñas',          from: 0xFE50, to: 0xFE6F },
  { name: 'Formas de Anchura Completa',from:0xFF00, to: 0xFFEF },
  { name: 'Especiales',               from: 0xFFF0, to: 0xFFFF },
  // ── Windows-1252 / CP1252 caracteres especiales ────────────────────────────
  { name: 'Fracciones y Especiales Latinos', from:0x00B0, to: 0x00BF },
  { name: 'Letras con Diacríticos (Comunes)', chars: [
    0x00C0,0x00C1,0x00C2,0x00C3,0x00C4,0x00C5,0x00C6,0x00C7,0x00C8,0x00C9,
    0x00CA,0x00CB,0x00CC,0x00CD,0x00CE,0x00CF,0x00D0,0x00D1,0x00D2,0x00D3,
    0x00D4,0x00D5,0x00D6,0x00D8,0x00D9,0x00DA,0x00DB,0x00DC,0x00DD,0x00DE,
    0x00DF,0x00E0,0x00E1,0x00E2,0x00E3,0x00E4,0x00E5,0x00E6,0x00E7,0x00E8,
    0x00E9,0x00EA,0x00EB,0x00EC,0x00ED,0x00EE,0x00EF,0x00F0,0x00F1,0x00F2,
    0x00F3,0x00F4,0x00F5,0x00F6,0x00F8,0x00F9,0x00FA,0x00FB,0x00FC,0x00FD,
    0x00FE,0x00FF
  ]},
  { name: 'Windows-1252 Exclusivos', chars: [
    0x20AC,0x201A,0x0192,0x201E,0x2026,0x2020,0x2021,0x02C6,0x2030,0x0160,
    0x2039,0x0152,0x017D,0x2018,0x2019,0x201C,0x201D,0x2022,0x2013,0x2014,
    0x02DC,0x2122,0x0161,0x203A,0x0153,0x017E,0x0178
  ]},
];

// Función para obtener los caracteres de un bloque
function getChars(block) {
  if (block.chars) return block.chars;
  const chars = [];
  for (let cp = block.from; cp <= Math.min(block.to, block.from + 512); cp++) {
    try {
      const s = String.fromCodePoint(cp);
      chars.push(cp);
    } catch {}
  }
  return chars;
}

// Buscar bloque por nombre
const ALL_BLOCK_NAMES = [...new Set(BLOCKS.map(b => b.name))];

export default function CharacterMap({ onInsert, onClose }) {
  const [selectedBlock, setSelectedBlock] = useState('ASCII Imprimible');
  const [search, setSearch] = useState('');
  const [copied, setCopied]  = useState(null);
  const [hovered, setHovered]  = useState(null);
  const [recent, setRecent]  = useState([]);
  const [fontPreview, setFontPreview] = useState('inherit');

  // Filtrar caracteres por búsqueda
  const chars = useMemo(() => {
    if (search.trim()) {
      // Buscar por nombre unicode o por el carácter
      const results = [];
      for (const block of BLOCKS) {
        for (const cp of getChars(block)) {
          try {
            const s = String.fromCodePoint(cp);
            if (s.includes(search) || cp.toString(16).padStart(4,'0').includes(search.toLowerCase())) {
              results.push(cp);
              if (results.length >= 200) break;
            }
          } catch {}
        }
        if (results.length >= 200) break;
      }
      return results;
    }
    const block = BLOCKS.find(b => b.name === selectedBlock);
    return block ? getChars(block) : [];
  }, [selectedBlock, search]);

  const copy = (cp) => {
    const s = String.fromCodePoint(cp);
    navigator.clipboard.writeText(s).catch(() => {});
    setCopied(cp);
    setRecent(prev => [cp, ...prev.filter(c => c !== cp)].slice(0, 24));
    if (onInsert) onInsert(s);
    toast.success(`Copiado: ${s} (U+${cp.toString(16).padStart(4,'0').toUpperCase()})`, { duration: 1500 });
    setTimeout(() => setCopied(null), 1000);
  };

  const cpInfo = (cp) => {
    try {
      const s = String.fromCodePoint(cp);
      return {
        char: s,
        hex: 'U+' + cp.toString(16).padStart(4, '0').toUpperCase(),
        dec: cp,
        html: '&#' + cp + ';',
      };
    } catch { return null; }
  };

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 0 }}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-slate-50 flex-shrink-0">
        <div>
          <h2 className="font-bold text-slate-800 text-sm">Mapa de Caracteres Windows — {chars.length} caracteres</h2>
          <p className="text-[10px] text-slate-500">{BLOCKS.length} bloques Unicode · Clic para copiar e insertar</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={fontPreview} onChange={e=>setFontPreview(e.target.value)}
            className="h-7 text-xs border border-slate-200 rounded px-1.5">
            <option value="inherit">Fuente por defecto</option>
            {['Segoe UI Symbol','Arial Unicode MS','Lucida Sans Unicode','Courier New',
              'Times New Roman','Wingdings','Wingdings 2','Wingdings 3','Webdings'].map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          {onClose && (
            <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded text-slate-500">
              <X className="w-4 h-4"/>
            </button>
          )}
        </div>
      </div>

      {/* Búsqueda + Bloque */}
      <div className="flex gap-2 p-2 border-b flex-shrink-0 bg-white">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"/>
          <Input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Buscar carácter o código hex (ej: 00F1 para ñ)..."
            className="pl-7 h-8 text-xs"/>
        </div>
        {!search && (
          <select value={selectedBlock} onChange={e=>{setSelectedBlock(e.target.value);setSearch('');}}
            className="h-8 text-xs border border-slate-200 rounded px-2 max-w-[240px]">
            {BLOCKS.map(b => (
              <option key={b.name} value={b.name}>{b.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Recientes */}
      {recent.length > 0 && (
        <div className="flex items-center gap-1 px-3 py-1.5 border-b bg-amber-50 flex-shrink-0 flex-wrap">
          <span className="text-[10px] text-amber-600 font-bold mr-1">Recientes:</span>
          {recent.map(cp => {
            try {
              const s = String.fromCodePoint(cp);
              return (
                <button key={cp} onClick={()=>copy(cp)}
                  title={`U+\${cp.toString(16).padStart(4,'0').toUpperCase()}`}
                  className="w-7 h-7 flex items-center justify-center bg-white border border-amber-200 rounded hover:bg-amber-100 text-sm transition-colors"
                  style={{ fontFamily: fontPreview }}>
                  {s}
                </button>
              );
            } catch { return null; }
          })}
        </div>
      )}

      {/* Grid de caracteres */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(32px, 1fr))' }}>
          {chars.map(cp => {
            let char = '?';
            try { char = String.fromCodePoint(cp); } catch {}
            const isCopied = copied === cp;
            const isHovered = hovered === cp;
            return (
              <button
                key={cp}
                onClick={() => copy(cp)}
                onMouseEnter={() => setHovered(cp)}
                onMouseLeave={() => setHovered(null)}
                title={`U+\${cp.toString(16).padStart(4,'0').toUpperCase()} — Dec: \${cp} — HTML: &#\${cp};`}
                className={`w-8 h-8 flex items-center justify-center rounded border text-sm transition-all select-none \${
                  isCopied ? 'bg-green-500 text-white border-green-600' :
                  isHovered ? 'bg-blue-50 border-blue-400 scale-125 z-10 shadow-lg' :
                  'bg-white border-slate-200 hover:border-blue-300 text-slate-800'
                }`}
                style={{ fontFamily: fontPreview, position: 'relative', zIndex: isHovered ? 10 : 1 }}
              >
                {isCopied ? <Check className="w-3 h-3"/> : char}
              </button>
            );
          })}
        </div>
        {chars.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-sm">
            No se encontraron caracteres para "{search}"
          </div>
        )}
      </div>

      {/* Info del hover */}
      {hovered && (() => {
        const info = cpInfo(hovered);
        return info ? (
          <div className="flex items-center gap-4 px-3 py-2 border-t bg-slate-50 text-xs text-slate-600 flex-shrink-0">
            <span className="text-2xl" style={{ fontFamily: fontPreview }}>{info.char}</span>
            <span className="font-mono font-bold text-blue-600">{info.hex}</span>
            <span>Dec: {info.dec}</span>
            <span>HTML: <code className="bg-slate-200 px-1 rounded">{info.html}</code></span>
          </div>
        ) : null;
      })()}
    </div>
  );
}
