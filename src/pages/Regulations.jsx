import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Shield, ExternalLink, Search, BookOpen } from 'lucide-react';

const REGULATIONS = [
  {
    category: 'F-Gas / Refrigeración',
    color: 'bg-blue-100 text-blue-700',
    items: [
      { name: 'Reglamento F-Gas UE 517/2014', description: 'Gases fluorados de efecto invernadero', url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32014R0517', boe: 'https://www.boe.es/buscar/doc.php?id=DOUE-L-2014-81006' },
      { name: 'RD 115/2017 - F-Gas España', description: 'Reglamento nacional gases fluorados', url: 'https://www.boe.es/eli/es/rd/2017/02/17/115', boe: 'https://www.boe.es/eli/es/rd/2017/02/17/115' },
      { name: 'Comprobación de fugas - IDAE', description: 'Guía comprobación fugas gases fluorados', url: 'https://www.idae.es/uploads/documentos/documentos_Gu%C3%ADa_fugas_gases_fluorados_2edicion_tcm30-178434.pdf', boe: null },
      { name: 'Reglamento Frigorías - RD 138/2011', description: 'Seguridad instalaciones frigoríficas', url: 'https://www.boe.es/eli/es/rd/2011/02/04/138', boe: 'https://www.boe.es/eli/es/rd/2011/02/04/138' },
    ]
  },
  {
    category: 'RITE - Instalaciones Térmicas',
    color: 'bg-orange-100 text-orange-700',
    items: [
      { name: 'RITE - RD 1027/2007', description: 'Reglamento de Instalaciones Térmicas en Edificios', url: 'https://www.boe.es/eli/es/rd/2007/07/20/1027/con', boe: 'https://www.boe.es/eli/es/rd/2007/07/20/1027/con' },
      { name: 'Modificación RITE - RD 1826/2009', description: 'Actualización del RITE', url: 'https://www.boe.es/eli/es/rd/2009/12/04/1826', boe: 'https://www.boe.es/eli/es/rd/2009/12/04/1826' },
      { name: 'RITE Instrucciones Técnicas (IT)', description: 'Instrucciones técnicas del RITE', url: 'https://energia.gob.es/desarrollo/EficienciaEnergetica/RITE/Paginas/InstalacionesTermicas.aspx', boe: null },
    ]
  },
  {
    category: 'Electricidad - REBT',
    color: 'bg-yellow-100 text-yellow-700',
    items: [
      { name: 'REBT - RD 842/2002', description: 'Reglamento Electrotécnico Baja Tensión completo', url: 'https://www.boe.es/eli/es/rd/2002/08/02/842/con', boe: 'https://www.boe.es/eli/es/rd/2002/08/02/842/con' },
      { name: 'ITC-BT (Instrucciones Técnicas)', description: 'Todas las ITC-BT del REBT', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099', boe: null },
      { name: 'Normas UNE Electricidad', description: 'Catálogo normas UNE eléctricas', url: 'https://www.une.org/encuentra-tu-norma/busca-tu-norma/?c=S&A=electricidad', boe: null },
    ]
  },
  {
    category: 'Eficiencia Energética',
    color: 'bg-green-100 text-green-700',
    items: [
      { name: 'CTE DB-HE Ahorro Energía', description: 'Código Técnico Edificación - Ahorro de energía', url: 'https://www.codigotecnico.org/pdf/Documentos/HE/DBHE.pdf', boe: 'https://www.boe.es/eli/es/rd/2019/12/05/732' },
      { name: 'RD 235/2013 Certificación Energética', description: 'Certificación energética de edificios', url: 'https://www.boe.es/eli/es/rd/2013/04/05/235', boe: 'https://www.boe.es/eli/es/rd/2013/04/05/235' },
      { name: 'RD 244/2019 Autoconsumo Solar', description: 'Autoconsumo de energía eléctrica', url: 'https://www.boe.es/eli/es/rd/2019/04/05/244', boe: 'https://www.boe.es/eli/es/rd/2019/04/05/244' },
      { name: 'Directiva 2018/844 Eficiencia Energética', description: 'Eficiencia energética en edificios UE', url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32018L0844', boe: null },
    ]
  },
  {
    category: 'Seguridad',
    color: 'bg-red-100 text-red-700',
    items: [
      { name: 'CTE DB-SI Seguridad Incendios', description: 'Código Técnico - Seguridad en caso de incendio', url: 'https://www.codigotecnico.org/pdf/Documentos/SI/DBSI.pdf', boe: 'https://www.boe.es/eli/es/rd/2006/03/17/314/con' },
      { name: 'RIPCI - RD 513/2017', description: 'Reglamento Instalaciones Protección Contra Incendios', url: 'https://www.boe.es/eli/es/rd/2017/05/22/513', boe: 'https://www.boe.es/eli/es/rd/2017/05/22/513' },
      { name: 'Mantenimiento PCI - Normas', description: 'Mantenimiento instalaciones contraincendios', url: 'https://www.boe.es/eli/es/rd/2017/05/22/513', boe: null },
      { name: 'RD 513/2017 Protección Incendios', description: 'Reglamento PCI completo', url: 'https://www.boe.es/eli/es/rd/2017/05/22/513', boe: 'https://www.boe.es/eli/es/rd/2017/05/22/513' },
    ]
  },
  {
    category: 'Solar Fotovoltaica',
    color: 'bg-amber-100 text-amber-700',
    items: [
      { name: 'RD 244/2019 Autoconsumo', description: 'Autoconsumo fotovoltaico', url: 'https://www.boe.es/eli/es/rd/2019/04/05/244', boe: 'https://www.boe.es/eli/es/rd/2019/04/05/244' },
      { name: 'REBT - Instalaciones Fotovoltaicas ITC-BT-40', description: 'Instalaciones generadoras de baja tensión', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099', boe: null },
      { name: 'IEC 62446 - Documentación sistemas FV', description: 'Norma documentación instalaciones solares', url: 'https://www.une.org/encuentra-tu-norma/busca-tu-norma/?c=N&v=62446', boe: null },
    ]
  },
  {
    category: 'Regla de Refrigerantes Danfoss',
    color: 'bg-purple-100 text-purple-700',
    items: [
      { name: 'Regla de refrigerantes Danfoss', description: 'Tabla presiones y temperaturas gases refrigerantes', url: 'https://www.danfoss.com/es-es/service-and-support/downloads/dcs/refrigerants/', boe: null },
      { name: 'Danfoss Coolselector®', description: 'Herramienta selección componentes refrigeración', url: 'https://www.danfoss.com/es-es/service-and-support/apps-and-tools/coolselector2/', boe: null },
      { name: 'Presiones saturación R-32', description: 'Tabla presiones gas R-32', url: 'https://www.danfoss.com/es-es/products/dcs/refrigerants/', boe: null },
      { name: 'Presiones saturación R-410A', description: 'Tabla presiones gas R-410A', url: 'https://www.danfoss.com/es-es/products/dcs/refrigerants/', boe: null },
    ]
  },
];

export default function Regulations() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = ['all', ...REGULATIONS.map(r => r.category)];

  const filtered = REGULATIONS.filter(cat =>
    activeCategory === 'all' || cat.category === activeCategory
  ).map(cat => ({
    ...cat,
    items: cat.items.filter(item =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(cat => cat.items.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6 text-indigo-600" />Normativas
        </h1>
        <Badge variant="outline" className="text-xs">Acceso directo a BOE/EUR-Lex</Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Buscar normativa..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${activeCategory === cat ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
            {cat === 'all' ? 'Todas' : cat}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.map((cat, ci) => (
          <Card key={ci}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Badge className={cat.color}>{cat.category}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {cat.items.map((item, ii) => (
                  <div key={ii} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                    </div>
                    <div className="flex gap-2 ml-4 flex-shrink-0">
                      <a href={item.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors">
                        <ExternalLink className="w-3 h-3" /> Acceder
                      </a>
                      {item.boe && (
                        <a href={item.boe} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors">
                          BOE
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}