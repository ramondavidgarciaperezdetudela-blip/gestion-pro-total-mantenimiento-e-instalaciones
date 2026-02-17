import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BookOpen, ExternalLink, Search } from 'lucide-react';

const manualCategories = [
  { category: 'Aire Acondicionado', brands: [
    { brand: 'Daikin', url: 'https://www.daikin.es/es_es/soporte/documentacion.html', description: 'Manuales de instalación y usuario' },
    { brand: 'Mitsubishi Electric', url: 'https://www.mitsubishielectric.es/aire-acondicionado/soporte/documentacion', description: 'Documentación técnica completa' },
    { brand: 'Fujitsu', url: 'https://www.fujitsu-general.com/es/support/downloads/', description: 'Manuales y documentación técnica' },
    { brand: 'Samsung', url: 'https://www.samsung.com/es/support/', description: 'Soporte y manuales' },
    { brand: 'LG', url: 'https://www.lg.com/es/soporte/', description: 'Centro de soporte técnico' },
    { brand: 'Panasonic', url: 'https://www.aircon.panasonic.eu/ES_es/support/', description: 'Soporte profesional' },
    { brand: 'Toshiba', url: 'https://www.toshibaclima.com/soporte/', description: 'Documentación técnica' },
    { brand: 'Hisense', url: 'https://www.hisense-hitachi.com/es/soporte', description: 'Manuales y guías' },
  ]},
  { category: 'Refrigeración Industrial', brands: [
    { brand: 'Salvador Escoda', url: 'https://www.salvadorescoda.com/', description: 'Catálogos y manuales técnicos' },
    { brand: 'Intarcon', url: 'https://www.intarcon.com/documentacion/', description: 'Documentación equipos frigoríficos' },
    { brand: 'Zanotti', url: 'https://www.zanotti.com/es/documentacion/', description: 'Manuales equipos refrigeración' },
    { brand: 'Danfoss', url: 'https://www.danfoss.com/es-es/service-and-support/', description: 'Documentación y herramientas técnicas' },
    { brand: 'Bitzer', url: 'https://www.bitzer.de/es/es/', description: 'Compresores - documentación' },
    { brand: 'Copeland (Emerson)', url: 'https://climate.emerson.com/es-es', description: 'Manuales compresores' },
  ]},
  { category: 'Electricidad / REBT', brands: [
    { brand: 'REBT Completo', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099', description: 'Reglamento Electrotécnico Baja Tensión (ITC-BT 01 a 51)' },
    { brand: 'Schneider Electric', url: 'https://www.se.com/es/es/download/', description: 'Manuales protecciones y cuadros' },
    { brand: 'ABB', url: 'https://new.abb.com/low-voltage/es/soporte', description: 'Documentación aparamenta' },
    { brand: 'Legrand', url: 'https://www.legrand.es/documentacion', description: 'Catálogos y manuales' },
    { brand: 'Siemens', url: 'https://www.siemens.com/es/es/soporte.html', description: 'Documentación técnica' },
  ]},
  { category: 'Energía Solar', brands: [
    { brand: 'Huawei Solar', url: 'https://solar.huawei.com/es/download', description: 'Inversores - manuales' },
    { brand: 'SMA', url: 'https://www.sma.de/es/servicio/descargas', description: 'Manuales inversores SMA' },
    { brand: 'Fronius', url: 'https://www.fronius.com/es-es/spain/energia-solar/descargas', description: 'Documentación inversores' },
    { brand: 'Canadian Solar', url: 'https://www.canadiansolar.com/support/', description: 'Fichas técnicas paneles' },
    { brand: 'JA Solar', url: 'https://www.jasolar.com/html/en/downloads/', description: 'Documentación paneles' },
    { brand: 'Pylontech', url: 'https://www.pylontech.com.cn/en/support/downloads', description: 'Manuales baterías' },
    { brand: 'BYD', url: 'https://www.bydbatterybox.com/downloads', description: 'Documentación baterías' },
  ]},
  { category: 'Eficiencia Energética', brands: [
    { brand: 'Guía IDAE', url: 'https://www.idae.es/publicaciones', description: 'Publicaciones eficiencia energética' },
    { brand: 'Certificación Energética', url: 'https://energia.gob.es/desarrollo/EficienciaEnergetica/CertificacionEnergetica/', description: 'Procedimiento certificación' },
  ]},
  { category: 'Telecomunicaciones / ICT', brands: [
    { brand: 'Normativa ICT', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2011-5834', description: 'Infraestructuras comunes telecomunicaciones' },
    { brand: 'Televés', url: 'https://www.televes.com/es/soporte', description: 'Equipos telecomunicaciones' },
  ]},
];

export default function Manuals() {
  const [search, setSearch] = useState('');

  const filtered = manualCategories.map(cat => ({
    ...cat,
    brands: cat.brands.filter(b => `${b.brand} ${b.description}`.toLowerCase().includes(search.toLowerCase()))
  })).filter(cat => cat.brands.length > 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="w-6 h-6 text-teal-500" />Manuales Técnicos</h1>
      <p className="text-sm text-gray-500">Acceso directo a manuales de instalación y usuario de las principales marcas.</p>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Buscar marca o manual..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filtered.map(cat => (
        <Card key={cat.category}>
          <CardContent className="p-4">
            <h2 className="font-bold text-sm text-teal-700 mb-3 uppercase tracking-wide">{cat.category}</h2>
            <div className="space-y-2">
              {cat.brands.map(brand => (
                <a key={brand.brand} href={brand.url} target="_blank" rel="noopener noreferrer"
                   className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-teal-50 transition-colors group">
                  <div>
                    <p className="font-medium text-sm group-hover:text-teal-700">{brand.brand}</p>
                    <p className="text-xs text-gray-500">{brand.description}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-teal-500 flex-shrink-0" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}