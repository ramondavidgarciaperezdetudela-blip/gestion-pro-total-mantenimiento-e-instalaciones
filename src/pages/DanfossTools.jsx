import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import NavBar from '@/components/NavBar';

const TOOLS = [
  { id:'ref-slider', icon:'🌡️', label:'Regla de Refrigerantes',         url:'https://reftools.danfoss.com/spa/tools/ref-slider',      desc:'Propiedades termodinámicas de gases refrigerantes. Presión, temperatura, entalpía.' },
  { id:'low-gwp',    icon:'🌱', label:'Bajo GWP',                        url:'https://reftools.danfoss.com/spa/tools/low-gwp',          desc:'Selección de refrigerantes de bajo potencial de calentamiento global según F-Gas.' },
  { id:'txv',        icon:'🎛️', label:'Ajuste de Supercalentamiento',    url:'https://reftools.danfoss.com/spa/tools/txv',              desc:'Configuración óptima de la válvula de expansión termostática (TXV/TEV).' },
  { id:'txv-sel',    icon:'🔍', label:'Selección TXV',                   url:'https://reftools.danfoss.com/spa/tools/txv-selection',    desc:'Seleccione la válvula termostática Danfoss correcta para su instalación.' },
  { id:'exv-sel',    icon:'⚡', label:'Selección Válvula Electrónica',   url:'https://reftools.danfoss.com/spa/tools/exv-selection',    desc:'Selección de válvula de expansión electrónica Danfoss ETS/CCM.' },
  { id:'fd-sel',     icon:'💧', label:'Selección Filtros Deshidratadores',url:'https://reftools.danfoss.com/spa/tools/fd-selection',    desc:'Selección del filtro deshidratador adecuado según gas y sistema.' },
  { id:'sv-sel',     icon:'🚦', label:'Selección Válvulas Solenoide',    url:'https://reftools.danfoss.com/spa/tools/sv-selection',    desc:'Selección de electroválvulas Danfoss EVR para su sistema frigorífico.' },
  { id:'product',    icon:'📦', label:'Buscador de Productos Danfoss',   url:'https://reftools.danfoss.com/spa/product-finder',        desc:'Catálogo completo de productos Danfoss para climatización y refrigeración.' },
];

function openURL(url) {
  const a = document.createElement('a');
  a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

export default function DanfossTools() {
  const [active, setActive] = useState('ref-slider');
  const tool = TOOLS.find(t => t.id === active);

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar title="Herramientas Danfoss RefTools" />
      <div className="max-w-lg mx-auto px-3 py-3 space-y-4">

        {/* Aviso importante */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
          <p className="font-bold mb-0.5">ℹ️ Herramientas online de Danfoss</p>
          <p>Estas herramientas se abren en el navegador del dispositivo. Requieren conexión a internet.</p>
        </div>

        {/* Selector de herramienta */}
        <div className="bg-white rounded-2xl shadow p-3">
          <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Selecciona herramienta</p>
          <div className="grid grid-cols-4 gap-2">
            {TOOLS.map(t => (
              <button key={t.id}
                onClick={() => setActive(t.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all text-center ${
                  active === t.id
                    ? 'border-red-500 bg-red-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}>
                <span className="text-2xl">{t.icon}</span>
                <span className="text-xs text-slate-600 leading-tight">{t.label.split(' ').slice(0,2).join(' ')}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Detalle de la herramienta seleccionada */}
        {tool && (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            {/* Cabecera roja Danfoss */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-4 py-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{tool.icon}</span>
                <div>
                  <p className="text-white font-bold text-base leading-tight">{tool.label}</p>
                  <p className="text-red-200 text-xs mt-0.5">Danfoss RefTools</p>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-slate-600">{tool.desc}</p>
              <div className="bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-500 break-all font-mono">
                {tool.url}
              </div>
              <button
                onClick={() => openURL(tool.url)}
                className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 text-base shadow-lg transition-all">
                <ExternalLink className="w-5 h-5" />
                Abrir en el navegador
              </button>
              <p className="text-center text-xs text-slate-400">
                Se abrirá en Chrome/navegador del dispositivo
              </p>
            </div>
          </div>
        )}

        {/* Lista rápida de todas */}
        <div className="bg-white rounded-2xl shadow divide-y divide-slate-100">
          <p className="px-4 pt-3 pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Todas las herramientas</p>
          {TOOLS.map(t => (
            <button key={t.id}
              onClick={() => { setActive(t.id); openURL(t.url); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left">
              <span className="text-xl w-7 text-center">{t.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{t.label}</p>
                <p className="text-xs text-slate-400 truncate">{t.desc.slice(0,60)}…</p>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-300 flex-shrink-0" />
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
