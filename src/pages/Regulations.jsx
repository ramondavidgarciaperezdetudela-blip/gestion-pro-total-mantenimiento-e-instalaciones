import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, ExternalLink, Search } from 'lucide-react';

const regulations = [
  { category: 'F-Gas y Gases Fluorados', items: [
    { name: 'Reglamento (UE) 2024/573 F-Gas', url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX%3A32024R0573', description: 'Reglamento sobre gases fluorados de efecto invernadero' },
    { name: 'RD 115/2017 Gases Fluorados', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2017-2066', description: 'Real Decreto regulación gases fluorados' },
    { name: 'Comprobación fugas gases refrigerantes', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2017-2066', description: 'Normativa de comprobación periódica de fugas' },
  ]},
  { category: 'RITE - Instalaciones Térmicas', items: [
    { name: 'RITE - RD 1027/2007', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2007-15820', description: 'Reglamento de Instalaciones Térmicas en los Edificios' },
    { name: 'Modificación RITE 2021', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2021-10944', description: 'Última actualización del RITE' },
  ]},
  { category: 'REBT - Electricidad', items: [
    { name: 'REBT - RD 842/2002', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099', description: 'Reglamento Electrotécnico de Baja Tensión completo' },
    { name: 'ITC-BT Instrucciones Técnicas', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099', description: 'Instrucciones técnicas complementarias' },
  ]},
  { category: 'Seguridad y Contraincendios', items: [
    { name: 'CTE DB SI Seguridad Incendios', url: 'https://www.codigotecnico.org/DocumentosCTE/SeguridadEnCasoDeIncendio.html', description: 'Código Técnico de Edificación - Seguridad Incendios' },
    { name: 'RIPCI - RD 513/2017', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2017-6606', description: 'Reglamento de instalaciones de protección contra incendios' },
  ]},
  { category: 'Eficiencia Energética', items: [
    { name: 'CTE DB HE Ahorro Energía', url: 'https://www.codigotecnico.org/DocumentosCTE/AhorroDeEnergia.html', description: 'Documento básico de ahorro de energía' },
    { name: 'RD 390/2021 Certificación Energética', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2021-8945', description: 'Certificación de eficiencia energética de edificios' },
    { name: 'RD 244/2019 Autoconsumo', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2019-5089', description: 'Regulación autoconsumo energía eléctrica' },
  ]},
  { category: 'Refrigeración Industrial', items: [
    { name: 'Reglamento Seguridad Instalaciones Frigoríficas', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2011-1641', description: 'RD 138/2011 Seguridad instalaciones frigoríficas' },
    { name: 'Regla de refrigerantes Danfoss', url: 'https://www.danfoss.com/es-es/', description: 'Herramienta cálculo refrigerantes Danfoss' },
  ]},
  { category: 'Telecomunicaciones', items: [
    { name: 'ICT - RD 346/2011', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2011-5834', description: 'Infraestructuras comunes telecomunicaciones' },
  ]},
  { category: 'Placas Solares', items: [
    { name: 'CTE DB HE5 Generación mínima', url: 'https://www.codigotecnico.org/DocumentosCTE/AhorroDeEnergia.html', description: 'Contribución fotovoltaica mínima' },
    { name: 'Pliego Condiciones Técnicas IDAE', url: 'https://www.idae.es/', description: 'Pliego condiciones técnicas instalaciones solares' },
  ]},
];

export default function Regulations() {
  const [search, setSearch] = useState('');

  const filtered = regulations.map(cat => ({
    ...cat,
    items: cat.items.filter(i => `${i.name} ${i.description}`.toLowerCase().includes(search.toLowerCase()))
  })).filter(cat => cat.items.length > 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="w-6 h-6 text-indigo-500" />Normativas</h1>
      <p className="text-sm text-gray-500">Accede a la normativa vigente actualizada. Los enlaces dirigen al BOE y fuentes oficiales.</p>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Buscar normativa..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filtered.map(cat => (
        <Card key={cat.category}>
          <CardContent className="p-4">
            <h2 className="font-bold text-sm text-indigo-700 mb-3 uppercase tracking-wide">{cat.category}</h2>
            <div className="space-y-2">
              {cat.items.map(item => (
                <a key={item.name} href={item.url} target="_blank" rel="noopener noreferrer"
                   className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-indigo-50 transition-colors group">
                  <div>
                    <p className="font-medium text-sm group-hover:text-indigo-700">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.description}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 flex-shrink-0" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}