import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Download, X, Loader2, Clock, Star, Globe, Smile } from 'lucide-react';
import { toast } from 'sonner';

// ─── Emojis comunes embebidos (sin internet) ──────────────────────────────────
const COMMON = {
  'Caras': ['😀','😁','😂','🤣','😃','😄','😅','😆','😊','😋','😎','😍','🥰','😘','🤩','😐','😑','😶','🙄','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😇','🥳','🤠','🤡','🤓','😈','👿'],
  'Gestos': ['👍','👎','👏','🙌','👐','🤲','🤝','🙏','✌️','🤞','🤟','🤘','🤙','👌','🤌','🤏','👈','👉','👆','🖕','👇','☝️','✋','🤚','🖐','🖖','👋','🤙','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🧠','🦷','🦴','👀','👁','👅','👄','💋'],
  'Trabajo': ['💼','📁','📂','📋','📊','📈','📉','📌','📍','📎','✂️','🖊','🖋','✒️','📝','🖥','💻','📱','☎️','📞','📟','📠','⌨️','🖨','🖱','🖲','💾','💿','📀','📺','📷','📸','📹','🎥','📞','☎️'],
  'Herramientas': ['🔧','🔨','⚒️','🛠️','⛏️','🪛','🔩','🪤','🔑','🗝️','🔒','🔓','💡','🔦','🕯️','🪔','🧲','⚙️','🔬','🔭','🧰','📡','🔌','🔋','🪫','💣','🧨','🪝','🧲','🔮','🪄'],
  'Transporte': ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🚚','🚛','🚜','🏍️','🛵','🚲','🛴','🛺','🚁','🛻','⛽','🛞','🚦','🚥','🗺️','🛣️','🛤️','⛵','🚤','🛥️','🛳️','⛴️','🚢','✈️','🛩️','🚀','🛸','🚁','🚂','🚃','🚄','🚅','🚆','🚇','🚈','🚉','🚊','🚝','🚞'],
  'Edificios': ['🏠','🏡','🏢','🏣','🏤','🏥','🏦','🏧','🏨','🏩','🏪','🏫','🏬','🏭','🏯','🏰','🗼','🗽','⛩️','🗿','🏗️','🧱','🪨','🪵','🛖','⛺','🏕️','🏖️','🏜️','🏔️','⛰️','🗻','🌋'],
  'Naturaleza': ['☀️','🌤️','⛅','☁️','🌧️','⛈️','❄️','🌬️','🌊','💧','🔥','🌿','🍃','🌱','🌲','🌳','🌴','🌵','🌾','🍀','🍁','🍂','🌺','🌸','🌼','🌻','🌹','🥀','🪷','🌷','🐾','🌡️'],
  'Alimentación': ['🍎','🍊','🍋','🍇','🍓','🫐','🍒','🍑','🥭','🍍','🥝','🍅','🥑','🫑','🥦','🧅','🥕','🌽','🍞','🧀','🥚','🍳','🥘','🍝','🍜','🍲','🥗','🥪','🌮','🍔','🍟','🍕','🌭','🥨'],
  'Símbolos': ['✅','❌','⚠️','🚫','❗','❓','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🔶','🔷','▶️','◀️','⬆️','⬇️','↩️','↪️','🔄','♻️','✨','💫','⭐','🌟','🎯','🏆','🥇','💯','🔥','⚡','💥','🎉','🎊','🎈'],
  'Flechas': ['→','←','↑','↓','↗','↘','↙','↖','⇒','⇐','⇑','⇓','⟹','⟸','➡','⬅','⬆','⬇','↔','↕','⤴','⤵','↩','↪','🔀','🔁','🔃','🔄','⏭','⏮','⏩','⏪','🔼','🔽'],
  'Matemáticas': ['➕','➖','✖️','➗','🟰','%','∞','≈','≠','≤','≥','∑','∏','√','∫','∂','∇','∆','π','Ω','α','β','γ','δ','ε','θ','λ','μ','σ','φ','ψ','±','×','÷','=','≡','∈','∉','⊂','⊃'],
  'Monedas': ['💶','💷','💴','💵','💸','💰','💳','🏦','💹','📈','📉','🪙','💎','€','£','¥','$','₿','₹','₽','฿','₩','₪','₫','₭','₮','₦','₴'],
  'Corazones': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💗','💓','💞','💕','💟','❣️','💔','❤️‍🔥','💘','💝','💖','💗','💓','💞'],
  'Estrellas': ['⭐','🌟','💫','✨','🌠','⭐','🌙','☀️','🌞','🌛','🌜','🌚','🌕','🌖','🌗','🌘','🌑','🌒','🌓','🌔','🌙','🌟','💥','🔆','🔅'],
  'Clima/HVAC': ['🌡️','❄️','🌬️','💨','🔥','♨️','🌊','💧','🌩️','⚡','🏭','♻️','⚙️','🔧','🛠️','📡','🌡','🌤️','⛅','☁️','🌧️','⛈️','🌪️','🌈'],
  'Electricidad': ['⚡','🔌','🔋','💡','🔦','🕯️','🪫','🔆','🔅','📡','🛰️','📻','📺','🖥️','💻','📱','⌨️','🖱️','🖨️','📠','☎️','📞','🔊','🔇','🔕'],
  'Frigorías': ['❄️','🌡️','💧','🌊','♨️','🌬️','💨','🔩','⚙️','🛠️','🔧','🏭','📊','📉','📈','🌡','🌀','⛄','🏔️','🗻','🌨️','☃️','⛸️'],
  'Animales': ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🦋','🐛','🐢','🐍','🦎'],
};

// Rangos Unicode para descarga dinámica
const UNICODE_RANGES = [
  { name: 'Smileys (1F600-1F64F)', start: 0x1F600, end: 0x1F64F },
  { name: 'Naturaleza (1F300-1F3FF)', start: 0x1F300, end: 0x1F3FF },
  { name: 'Objetos (1F4A0-1F4FF)', start: 0x1F4A0, end: 0x1F4FF },
  { name: 'Símbolos (1F500-1F5FF)', start: 0x1F500, end: 0x1F5FF },
  { name: 'Transporte (1F680-1F6FF)', start: 0x1F680, end: 0x1F6FF },
  { name: 'Extras (1F900-1F9FF)', start: 0x1F900, end: 0x1F9FF },
  { name: 'Ext-A (1FA00-1FA6F)', start: 0x1FA00, end: 0x1FA6F },
  { name: 'Ext-B (1FA70-1FAFF)', start: 0x1FA70, end: 0x1FAFF },
  { name: 'Dingbats (2700-27BF)', start: 0x2700, end: 0x27BF },
  { name: 'Misceláneos (2600-26FF)', start: 0x2600, end: 0x26FF },
];

// Fuentes de símbolos Windows
const SYMBOL_FONTS = ['Wingdings', 'Wingdings 2', 'Wingdings 3', 'Webdings', 'Symbol', 'Segoe UI Symbol', 'Segoe UI Emoji'];

export default function EmojiPicker({ onSelect, onClose }) {
  const [tab, setTab]           = useState('comunes');
  const [cat, setCat]           = useState(Object.keys(COMMON)[0]);
  const [search, setSearch]     = useState('');
  const [recent, setRecent]     = useState(() => {
    try { return JSON.parse(localStorage.getItem('gpt_emoji_recent') || '[]'); } catch { return []; }
  });
  const [symFont, setSymFont]   = useState('Wingdings');
  const [unicodeCat, setUnicodeCat] = useState(UNICODE_RANGES[0].name);
  const [loadingOnline, setLoadingOnline] = useState(false);
  const [onlineEmojis, setOnlineEmojis]   = useState([]);

  const pick = (emoji) => {
    const next = [emoji, ...recent.filter(e => e !== emoji)].slice(0, 32);
    setRecent(next);
    try { localStorage.setItem('gpt_emoji_recent', JSON.stringify(next)); } catch {}
    onSelect?.(emoji);
  };

  // Emojis del rango Unicode seleccionado (generados dinámicamente)
  const unicodeEmojis = React.useMemo(() => {
    const range = UNICODE_RANGES.find(r => r.name === unicodeCat);
    if (!range) return [];
    const emojis = [];
    for (let cp = range.start; cp <= range.end; cp++) {
      try { emojis.push(String.fromCodePoint(cp)); } catch {}
    }
    return emojis;
  }, [unicodeCat]);

  // Símbolos de Wingdings (caracteres 33-254 renderizados en la fuente)
  const wingdingChars = React.useMemo(() => {
    const chars = [];
    for (let c = 33; c <= 254; c++) chars.push(String.fromCharCode(c));
    return chars;
  }, []);

  // Búsqueda en todos los emojis comunes
  const searchResults = React.useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    const results = [];
    for (const [cat, emojis] of Object.entries(COMMON)) {
      if (cat.toLowerCase().includes(q)) {
        results.push(...emojis);
      } else {
        // Por ahora incluir todos los emojis de categorías que coincidan
        emojis.forEach(e => {
          if (results.length < 100) results.push(e);
        });
      }
    }
    return [...new Set(results)].slice(0, 100);
  }, [search]);

  // Descargar lista extendida de emojis de OpenMoji CDN
  const downloadOnline = async () => {
    setLoadingOnline(true);
    try {
      const r = await fetch('https://cdn.jsdelivr.net/npm/emojilib@latest/dist/emoji-en-US.json',
        { signal: AbortSignal.timeout(8000) });
      if (r.ok) {
        const data = await r.json();
        const emojis = Object.entries(data).slice(0, 500).map(([emoji]) => emoji);
        setOnlineEmojis(emojis);
        toast.success(`${emojis.length} emojis descargados`);
      } else throw new Error('No disponible');
    } catch {
      // Fallback: usar rangos Unicode ya incluidos
      const all = UNICODE_RANGES.flatMap(r => {
        const arr = [];
        for (let cp = r.start; cp <= Math.min(r.end, r.start + 80); cp++) {
          try { arr.push(String.fromCodePoint(cp)); } catch {}
        }
        return arr;
      });
      setOnlineEmojis(all);
      toast.info('Emojis cargados desde datos locales');
    } finally { setLoadingOnline(false); }
  };

  const TABS = [
    { id: 'recientes', label: '🕐 Recientes' },
    { id: 'comunes',   label: '⭐ Comunes' },
    { id: 'unicode',   label: '🔤 Unicode' },
    { id: 'simbolos',  label: '🔣 Wingdings' },
    { id: 'online',    label: '🌐 Internet' },
  ];

  const EmojiGrid = ({ emojis, font = undefined }) => (
    <div className="grid gap-0.5 p-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(32px, 1fr))' }}>
      {emojis.map((e, i) => (
        <button key={i} onClick={() => pick(e)}
          title={e}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-blue-50 hover:scale-125 transition-all text-lg select-none"
          style={font ? { fontFamily: font, fontSize: 18 } : { fontSize: 20 }}>
          {e}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
      style={{ width: 360, maxHeight: 480, minHeight: 380 }}>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-slate-50 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Smile className="w-4 h-4 text-slate-500"/>
          <span className="text-sm font-bold text-slate-700">Emojis y Símbolos</span>
        </div>
        {onClose && <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded text-slate-400"><X className="w-3.5 h-3.5"/></button>}
      </div>

      {/* Búsqueda */}
      <div className="px-2 pt-2 pb-1 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"/>
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar emoji o símbolo..."
            className="pl-7 h-7 text-xs"/>
        </div>
      </div>

      {/* Tabs */}
      {!search && (
        <div className="flex border-b flex-shrink-0 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 text-[11px] font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto">
        {/* Búsqueda */}
        {search && (
          <EmojiGrid emojis={searchResults.length > 0 ? searchResults : Object.values(COMMON).flat().slice(0, 80)}/>
        )}

        {/* Recientes */}
        {!search && tab === 'recientes' && (
          recent.length > 0
            ? <EmojiGrid emojis={recent}/>
            : <p className="text-center py-8 text-xs text-slate-400">No hay emojis recientes</p>
        )}

        {/* Comunes */}
        {!search && tab === 'comunes' && (
          <div className="flex h-full">
            {/* Categorías */}
            <div className="w-24 border-r overflow-y-auto flex-shrink-0 bg-slate-50">
              {Object.keys(COMMON).map(c => (
                <button key={c} onClick={() => setCat(c)}
                  className={`w-full text-left px-2 py-1.5 text-[10px] font-medium transition-colors leading-tight ${
                    cat === c ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-500' : 'text-slate-600 hover:bg-slate-100'
                  }`}>
                  {c}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto">
              <EmojiGrid emojis={COMMON[cat] || []}/>
            </div>
          </div>
        )}

        {/* Unicode */}
        {!search && tab === 'unicode' && (
          <div>
            <select value={unicodeCat} onChange={e => setUnicodeCat(e.target.value)}
              className="w-full border-b text-xs p-2 bg-white">
              {UNICODE_RANGES.map(r => <option key={r.name}>{r.name}</option>)}
            </select>
            <EmojiGrid emojis={unicodeEmojis}/>
          </div>
        )}

        {/* Wingdings / Symbol fonts */}
        {!search && tab === 'simbolos' && (
          <div>
            <div className="flex gap-1 p-2 border-b flex-wrap">
              {SYMBOL_FONTS.map(f => (
                <button key={f} onClick={() => setSymFont(f)}
                  className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                    symFont === f ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:border-slate-400'
                  }`}>
                  {f.replace('Wingdings ', 'WD').replace('Segoe UI ', 'Sg ')}
                </button>
              ))}
            </div>
            <EmojiGrid emojis={wingdingChars} font={symFont}/>
          </div>
        )}

        {/* Online */}
        {!search && tab === 'online' && (
          <div>
            {onlineEmojis.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Globe className="w-8 h-8 text-slate-300"/>
                <p className="text-sm text-slate-500 text-center px-4">
                  Descarga emojis adicionales desde internet
                </p>
                <Button size="sm" onClick={downloadOnline} disabled={loadingOnline}
                  className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                  {loadingOnline ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Download className="w-3.5 h-3.5"/>}
                  {loadingOnline ? 'Descargando...' : 'Descargar emojis'}
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-3 py-1.5 border-b bg-slate-50">
                  <span className="text-[11px] text-slate-500">{onlineEmojis.length} emojis descargados</span>
                  <button onClick={() => setOnlineEmojis([])} className="text-[10px] text-slate-400 hover:text-red-500">Limpiar</button>
                </div>
                <EmojiGrid emojis={onlineEmojis}/>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
