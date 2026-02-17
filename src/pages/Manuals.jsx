import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BookOpen, ExternalLink, Search, Download } from 'lucide-react';

const MANUALS = [
  // Aire acondicionado / Clima
  {
    category: 'Daikin', color: 'bg-blue-100 text-blue-700',
    items: [
      { name: 'Daikin - Manual instalación splits', model: 'Series FTXC/FTXF', url: 'https://www.daikin.es/content/dam/document-library/installer-reference-guide/split/FTXC-FTXF_installer_guide_ES.pdf', type: 'Instalación' },
      { name: 'Daikin - Manual usuario splits', model: 'Series FTXC/FTXF', url: 'https://www.daikin.es/content/dam/document-library/owner-s-manual/split/FTXC-FTXF_user_guide_ES.pdf', type: 'Usuario' },
      { name: 'Daikin Altherma - Manual instalación', model: 'Bomba calor', url: 'https://www.daikin.es/content/dam/document-library/installer-reference-guide/heat-pumps/', type: 'Instalación' },
    ]
  },
  {
    category: 'Mitsubishi Electric', color: 'bg-red-100 text-red-700',
    items: [
      { name: 'Mitsubishi - Manual instalación MSZ-HR', model: 'MSZ-HR Series', url: 'https://www.mitsubishielectric.es/instaladores/documentacion/', type: 'Instalación' },
      { name: 'Mitsubishi - Manual usuario MSZ-HR', model: 'MSZ-HR Series', url: 'https://www.mitsubishielectric.es/hogar/documentacion/', type: 'Usuario' },
    ]
  },
  {
    category: 'Fujitsu', color: 'bg-cyan-100 text-cyan-700',
    items: [
      { name: 'Fujitsu - Documentación técnica splits', model: 'ASY-G Series', url: 'https://www.fujitsu-general.com/es/support/manual/', type: 'Instalación' },
      { name: 'Fujitsu - Manual usuario', model: 'ASY-G Series', url: 'https://www.fujitsu-general.com/es/support/manual/', type: 'Usuario' },
    ]
  },
  {
    category: 'Samsung', color: 'bg-indigo-100 text-indigo-700',
    items: [
      { name: 'Samsung - Manuales aire acondicionado', model: 'Wind-Free Series', url: 'https://www.samsung.com/es/support/model/AR09TXHQBWKNEU/', type: 'Usuario' },
    ]
  },
  // Refrigeración Industrial
  {
    category: 'Intarcon (Refrigeración)', color: 'bg-orange-100 text-orange-700',
    items: [
      { name: 'Intarcon - Catálogo unidades condensadoras', model: 'Línea ECO', url: 'https://www.intarcon.com/documentacion/', type: 'Catálogo' },
      { name: 'Intarcon - Manual instalación', model: 'Evaporadores', url: 'https://www.intarcon.com/documentacion/', type: 'Instalación' },
    ]
  },
  {
    category: 'Zanotti', color: 'bg-purple-100 text-purple-700',
    items: [
      { name: 'Zanotti - Documentación técnica', model: 'Grupos de frío', url: 'https://www.zanotti.com/es/downloads/', type: 'Instalación' },
    ]
  },
  {
    category: 'Danfoss', color: 'bg-green-100 text-green-700',
    items: [
      { name: 'Danfoss - Válvulas de expansión termostáticas', model: 'TUA/TUB Series', url: 'https://store.danfoss.com/es-ES/Refrigeración-y-Climatización/', type: 'Instalación' },
      { name: 'Danfoss - Compresores herméticos', model: 'SC/BD Series', url: 'https://store.danfoss.com/es-ES/Refrigeración-y-Climatización/', type: 'Instalación' },
      { name: 'Danfoss - Regla de refrigerantes (app)', model: 'Coolselector2', url: 'https://www.danfoss.com/es-es/service-and-support/apps-and-tools/coolselector2/', type: 'Herramienta' },
    ]
  },
  // Solar / Fotovoltaica
  {
    category: 'Solar / Fotovoltaica', color: 'bg-amber-100 text-amber-700',
    items: [
      { name: 'SMA - Manual instalación inversores', model: 'Sunny Boy Series', url: 'https://www.sma.de/es/productos/downloads.html', type: 'Instalación' },
      { name: 'Fronius - Manual instalación inversor', model: 'Primo/Symo', url: 'https://www.fronius.com/es-es/spain/solar-energy/products', type: 'Instalación' },
      { name: 'Victron Energy - Manuales', model: 'Inversores/Cargadores', url: 'https://www.victronenergy.com/support-and-tools/manuals', type: 'Instalación' },
      { name: 'Eficiencia energética placas solares - IDAE', model: 'Guía técnica', url: 'https://www.idae.es/tecnologias/energias-renovables/uso-electrico/solar-fotovoltaica', type: 'Guía' },
    ]
  },
  // Electricidad
  {
    category: 'Electricidad / REBT', color: 'bg-yellow-100 text-yellow-700',
    items: [
      { name: 'REBT Completo - RD 842/2002', model: 'Todas las ITC-BT', url: 'https://www.boe.es/eli/es/rd/2002/08/02/842/con', type: 'Normativa' },
      { name: 'Schneider - Guía instalaciones eléctricas', model: 'Guía práctica', url: 'https://www.se.com/es/es/download/document/SCHNEIDER_GUIA_INST_ELECTRICAS/', type: 'Guía' },
      { name: 'ABB - Manuales cuadros eléctricos', model: 'Gamma Building', url: 'https://library.e.abb.com/public/', type: 'Instalación' },
    ]
  },
  // Telecomunicaciones
  {
    category: 'Telecomunicaciones vivienda', color: 'bg-slate-100 text-slate-700',
    items: [
      { name: 'ICT - Infraestructura Común Telecomunicaciones', model: 'RD 346/2011', url: 'https://www.boe.es/eli/es/rd/2011/03/11/346', type: 'Normativa' },
      { name: 'Guía instalación ICT - MINETUR', model: 'Antenas / fibra', url: 'https://avancedigital.mineco.gob.es/telecomunicaciones/ict/Paginas/ict.aspx', type: 'Guía' },
    ]
  },
];

export default function Manuals() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = ['all', ...MANUALS.map(m => m.category)];

  const filtered = MANUALS.filter(cat =>
    activeCategory === 'all' || cat.category === activeCategory
  ).map(cat => ({
    ...cat,
    items: cat.items.filter(item =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.model.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(cat => cat.items.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-teal-600" />Manuales Técnicos
        </h1>
        <Badge variant="outline" className="text-xs">Acceso directo PDF online</Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Buscar manual, marca, modelo..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${activeCategory === cat ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300'}`}>
            {cat === 'all' ? 'Todos' : cat}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.map((cat, ci) => (
          <Card key={ci}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm"><Badge className={cat.color}>{cat.category}</Badge></CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {cat.items.map((item, ii) => (
                  <div key={ii} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-500">{item.model}</p>
                        <Badge variant="outline" className="text-[10px]">{item.type}</Badge>
                      </div>
                    </div>
                    <a href={item.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs bg-teal-600 text-white px-3 py-1.5 rounded-lg hover:bg-teal-700 transition-colors ml-4 flex-shrink-0">
                      <Download className="w-3 h-3" /> Abrir PDF
                    </a>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-gray-400 text-center pb-4">Los manuales son accedidos directamente desde los servidores de cada fabricante. Se actualizan automáticamente.</p>
    </div>
  );
}