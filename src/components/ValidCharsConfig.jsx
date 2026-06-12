import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';

const STORAGE_KEY = 'supplier_valid_chars';

// Grupos de caracteres predefinidos (siempre válidos por defecto)
const DEFAULT_GROUPS = [
  {
    id: 'greek',
    label: 'Letras griegas',
    description: 'Usadas en valores técnicos (α, β, Ω, μ, Δ, π...)',
    chars: ['α','β','γ','δ','ε','ζ','η','θ','ι','κ','λ','μ','ν','ξ','ο','π','ρ','σ','τ','υ','φ','χ','ψ','ω',
            'Α','Β','Γ','Δ','Ε','Ζ','Η','Θ','Ι','Κ','Λ','Μ','Ν','Ξ','Ο','Π','Ρ','Σ','Τ','Υ','Φ','Χ','Ψ','Ω'],
  },
  {
    id: 'units',
    label: 'Símbolos de unidades',
    description: 'Unidades técnicas (°C, ℃, ², ³, ½, ¼, ¾...)',
    chars: ['°','℃','℉','²','³','¹','½','¼','¾','⅓','⅔','µ','Ω','℧','∞','≈','≠','≤','≥','±','×','÷'],
  },
  {
    id: 'accented',
    label: 'Acentuadas y eñe',
    description: 'Caracteres españoles y europeos (á, é, ñ, ü...)',
    chars: ['á','é','í','ó','ú','ü','ñ','ç','Á','É','Í','Ó','Ú','Ü','Ñ','Ç','à','è','ì','ò','ù','â','ê','î','ô','û','ä','ë','ï','ö'],
  },
  {
    id: 'punctuation',
    label: 'Puntuación técnica',
    description: 'Guiones, barras, puntos, etc. usados en referencias',
    chars: ['-','_','/','.','(',')','[',']','+','#','@','&','%','*','!','?',':',';','\'','"','~','|','\\','^','`','<','>'],
  },
];

export function loadValidChars() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (stored) return stored;
  } catch {}
  // Por defecto: todos los grupos activos + ningún extra
  return {
    activeGroups: DEFAULT_GROUPS.map(g => g.id),
    extraChars: [],
  };
}

export function saveValidChars(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

// Devuelve true si el carácter está en la lista blanca de válidos
export function isValidProductChar(char, config = null) {
  const cfg = config || loadValidChars();
  const allValid = [
    ...DEFAULT_GROUPS.filter(g => cfg.activeGroups.includes(g.id)).flatMap(g => g.chars),
    ...(cfg.extraChars || []),
  ];
  return allValid.includes(char);
}

export default function ValidCharsConfig() {
  const [config, setConfig] = useState(loadValidChars);
  const [newChar, setNewChar] = useState('');

  const persist = (updated) => {
    setConfig(updated);
    saveValidChars(updated);
    toast.success('Configuración guardada');
  };

  const toggleGroup = (groupId) => {
    const active = config.activeGroups.includes(groupId)
      ? config.activeGroups.filter(id => id !== groupId)
      : [...config.activeGroups, groupId];
    persist({ ...config, activeGroups: active });
  };

  const addExtra = () => {
    const chars = [...new Set(newChar.split('').filter(c => c.trim()))];
    const toAdd = chars.filter(c => !config.extraChars.includes(c));
    if (!toAdd.length) { setNewChar(''); return; }
    persist({ ...config, extraChars: [...config.extraChars, ...toAdd] });
    setNewChar('');
  };

  const removeExtra = (char) => {
    persist({ ...config, extraChars: config.extraChars.filter(c => c !== char) });
  };

  // Activos totales
  const allActiveChars = [
    ...DEFAULT_GROUPS.filter(g => config.activeGroups.includes(g.id)).flatMap(g => g.chars),
    ...(config.extraChars || []),
  ];

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
        <p className="font-semibold text-blue-800 mb-1">🔤 Caracteres válidos en nombres de producto</p>
        <p>
          Activa los grupos de caracteres que tus proveedores usan en sus nombres de producto.
          Los caracteres marcados como válidos <strong>no</strong> se marcarán como error en la detección de nombres problemáticos.
          También puedes añadir caracteres individuales que no estén en ningún grupo.
        </p>
      </div>

      {/* Grupos predefinidos */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-700">Grupos predefinidos</p>
        {DEFAULT_GROUPS.map(group => {
          const active = config.activeGroups.includes(group.id);
          return (
            <div
              key={group.id}
              className={`border rounded-xl p-3 cursor-pointer transition-all ${active ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
              onClick={() => toggleGroup(group.id)}
            >
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 mt-0.5 ${active ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                  {active && <span className="text-white text-[10px] font-bold">✓</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-800">{group.label}</p>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${active ? 'bg-blue-200 text-blue-800' : 'bg-gray-100 text-gray-500'}`}>
                      {active ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5">{group.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {group.chars.slice(0, 24).map((c, i) => (
                      <span key={i} className={`inline-block font-mono text-xs px-1 py-0.5 rounded border ${active ? 'bg-white border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                        {c}
                      </span>
                    ))}
                    {group.chars.length > 24 && (
                      <span className="text-[10px] text-gray-400 self-center">+{group.chars.length - 24} más</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Caracteres personalizados */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Caracteres personalizados</p>
        <div className="flex gap-2 mb-2">
          <Input
            value={newChar}
            onChange={e => setNewChar(e.target.value)}
            placeholder='Escribe uno o más caracteres: ™ © ® £ ¥ §...'
            className="h-9 text-sm flex-1 font-mono"
            onKeyDown={e => e.key === 'Enter' && addExtra()}
          />
          <Button size="sm" className="h-9 gap-1 bg-slate-700 hover:bg-slate-800" onClick={addExtra} disabled={!newChar.trim()}>
            <Plus className="w-3.5 h-3.5" /> Añadir
          </Button>
        </div>
        {config.extraChars.length === 0
          ? <p className="text-[10px] text-gray-400 italic">Sin caracteres personalizados</p>
          : (
            <div className="flex flex-wrap gap-1.5">
              {config.extraChars.map((c, i) => (
                <span key={i} className="inline-flex items-center gap-1 bg-purple-50 border border-purple-200 rounded px-2 py-1 font-mono text-sm text-purple-800">
                  {c}
                  <button onClick={() => removeExtra(c)} className="text-purple-400 hover:text-purple-700 ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )
        }
      </div>

      {/* Resumen */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
        <p className="text-xs font-semibold text-gray-600 mb-1">
          Total de caracteres especiales permitidos: <span className="text-blue-700 font-bold">{allActiveChars.length}</span>
        </p>
        <p className="text-[10px] text-gray-400">
          Estos caracteres se aceptan como válidos en nombres de producto y no generarán alertas de error.
          La configuración se guarda localmente en este navegador.
        </p>
      </div>
    </div>
  );
}