import { useState } from 'react';
import { ExternalLink, ShoppingCart, UserPlus, Phone, Globe, Package } from 'lucide-react';
import NavBar from '@/components/NavBar';

const PROVEEDORES = [
  {
    id: 'carburos',
    nombre: 'Carburos Metálicos',
    pais: '🇪🇸 España',
    logo: '🔵',
    descripcion: 'Filial de Air Products en España. Distribuidor oficial de gases refrigerantes industriales y técnicos para profesionales del frío.',
    url_registro: 'https://www.carburos.com/es-es/industrial/registro-cliente.html',
    url_tienda: 'https://www.carburos.com/tienda',
    url_web: 'https://www.carburos.com',
    telefono: '900 810 142',
    gases: ['R-32','R-410A','R-404A','R-448A','R-449A','R-134a','R-513A','R-744 CO2','R-290','Nitrógeno'],
    tipo: 'Distribuidor industrial nacional',
    nota: 'Requiere certificado F-Gas para comprar gases HFC/HFO',
    color: 'from-blue-600 to-blue-800',
    acciones: [
      { label: 'Registrarse como cliente', icon: UserPlus, url: 'https://www.carburos.com/es-es/industrial/registro-cliente.html', primary: true },
      { label: 'Tienda online', icon: ShoppingCart, url: 'https://www.carburos.com/tienda', primary: false },
    ]
  },
  {
    id: 'grit',
    nombre: 'Gases GRIT',
    pais: '🇪🇸 España',
    logo: '🟢',
    descripcion: 'Proveedor especializado en gases refrigerantes para instaladores y empresas de climatización y refrigeración. Distribución directa a profesionales.',
    url_registro: 'https://www.gasesgrit.com/registro',
    url_tienda: 'https://www.gasesgrit.com',
    url_web: 'https://www.gasesgrit.com',
    telefono: '',
    gases: ['R-32','R-410A','R-404A','R-448A','R-449A','R-134a','R-290','R-600a','Mezclas HFO'],
    tipo: 'Distribuidor especializado profesionales',
    nota: 'Especializado en gases para instaladores de climatización y refrigeración',
    color: 'from-green-600 to-green-800',
    acciones: [
      { label: 'Registrarse para comprar', icon: UserPlus, url: 'https://www.gasesgrit.com/registro', primary: true },
      { label: 'Ver catálogo', icon: Package, url: 'https://www.gasesgrit.com', primary: false },
    ]
  },
  {
    id: 'linde',
    nombre: 'Linde Gas',
    pais: '🌍 Internacional',
    logo: '🔴',
    descripcion: 'Multinacional líder en gases industriales. Gama completa de gases refrigerantes, criogénicos e industriales para instaladores profesionales.',
    url_registro: 'https://www.linde-gas.es/es/forms/contact_us/index.html',
    url_tienda: 'https://www.linde-gas.es',
    url_web: 'https://www.linde-gas.es',
    telefono: '900 627 624',
    gases: ['R-32','R-410A','R-404A','R-448A','R-449A','R-134a','R-744 CO2','R-290','Nitrógeno','Hidrógeno'],
    tipo: 'Distribuidor industrial multinacional',
    nota: 'Envío a domicilio o recogida en punto de distribución local',
    color: 'from-red-600 to-red-800',
    acciones: [
      { label: 'Contactar comercial', icon: UserPlus, url: 'https://www.linde-gas.es/es/forms/contact_us/index.html', primary: true },
      { label: 'Web principal', icon: Globe, url: 'https://www.linde-gas.es', primary: false },
    ]
  },
  {
    id: 'nippon',
    nombre: 'Nippon Gases',
    pais: '🇪🇸 España',
    logo: '🟠',
    descripcion: 'Antes SOL España y posteriormente Nippon Gases. Distribuidor de gases industriales, refrigerantes y especiales. Amplia red de distribución en España.',
    url_registro: 'https://www.nippontgs.com/es-es/contacto',
    url_tienda: 'https://www.nippontgs.com/es-es',
    url_web: 'https://www.nippontgs.com/es-es',
    telefono: '900 500 556',
    gases: ['R-32','R-410A','R-404A','R-448A','R-449A','R-134a','R-744 CO2','R-290','R-600a','Nitrógeno','Argón'],
    tipo: 'Distribuidor industrial nacional',
    nota: 'Red de distribución en toda España',
    color: 'from-orange-500 to-orange-700',
    acciones: [
      { label: 'Contactar delegación', icon: UserPlus, url: 'https://www.nippontgs.com/es-es/contacto', primary: true },
      { label: 'Web principal', icon: Globe, url: 'https://www.nippontgs.com/es-es', primary: false },
    ]
  },
  {
    id: 'airliquide',
    nombre: 'Air Liquide',
    pais: '🌍 Internacional',
    logo: '🩵',
    descripcion: 'Grupo multinacional francés líder mundial en gases para industria, salud y medio ambiente. Amplia gama de refrigerantes y gases técnicos.',
    url_registro: 'https://www.airliquide.com/spain/contactanos',
    url_tienda: 'https://www.airliquide.com/spain',
    url_web: 'https://www.airliquide.com/spain',
    telefono: '900 101 090',
    gases: ['R-32','R-410A','R-404A','R-448A','R-449A','R-134a','R-744 CO2','R-290','Nitrógeno','Helio'],
    tipo: 'Multinacional líder mundial',
    nota: 'Requiere cuenta de empresa para tarifas profesionales',
    color: 'from-sky-500 to-sky-700',
    acciones: [
      { label: 'Contactar comercial', icon: UserPlus, url: 'https://www.airliquide.com/spain/contactanos', primary: true },
      { label: 'Web España', icon: Globe, url: 'https://www.airliquide.com/spain', primary: false },
    ]
  },
  {
    id: 'praxair',
    nombre: 'Praxair / Linde Refrigerantes',
    pais: '🌍 Internacional',
    logo: '🔷',
    descripcion: 'División de gases refrigerantes de Linde. Especializada en gases bajos en GWP para el calendario de reducción del Reglamento (UE) 2024/573 (2024-2030).',
    url_registro: 'https://www.linde-gas.es/es/forms/contact_us/index.html',
    url_web: 'https://www.linde-gas.es/es/products_and_supply/refrigerants/index.html',
    telefono: '900 627 624',
    gases: ['R-32','R-448A','R-449A','R-452A','R-513A','R-1234yf','R-1234ze','R-744 CO2','R-290','R-600a'],
    tipo: 'División industrial multinacional',
    nota: 'Especializado en gases alternativos bajos en GWP para cumplir nueva normativa F-Gas',
    color: 'from-indigo-500 to-indigo-700',
    acciones: [
      { label: 'Ver catálogo refrigerantes', icon: Package, url: 'https://www.linde-gas.es/es/products_and_supply/refrigerants/index.html', primary: true },
      { label: 'Contactar comercial', icon: UserPlus, url: 'https://www.linde-gas.es/es/forms/contact_us/index.html', primary: false },
    ]
  },
  {
    id: 'sumiref',
    nombre: 'Climalife / Dehon',
    pais: '🌍 Internacional',
    logo: '🟣',
    descripcion: 'Grupo Dehon, especialista europeo en gases fluorados y lubricantes para refrigeración. Distribuidor oficial de gases HFO y mezclas.',
    url_registro: 'https://www.climalife.dehon.com/es/contacte-con-nosotros',
    url_web: 'https://www.climalife.dehon.com/es',
    telefono: '',
    gases: ['R-32','R-410A','R-448A','R-449A','R-452A','R-513A','R-1234yf','R-744 CO2','Aceites PAO','Aceites POE'],
    tipo: 'Especialista gases fluorados y lubricantes',
    nota: 'También distribuye aceites lubricantes para compresor: POE, PAO, PAG',
    color: 'from-purple-600 to-purple-800',
    acciones: [
      { label: 'Ver gases y lubricantes', icon: Package, url: 'https://www.climalife.dehon.com/es', primary: true },
      { label: 'Contactar', icon: UserPlus, url: 'https://www.climalife.dehon.com/es/contacte-con-nosotros', primary: false },
    ]
  },
  {
    id: 'messer',
    nombre: 'Messer Ibérica',
    pais: '🇪🇸 España',
    logo: '🟡',
    descripcion: 'Filial de Messer Group en España. Distribuidor de gases industriales y refrigerantes con presencia en toda la península ibérica.',
    url_registro: 'https://www.messer.es/es/contacto',
    url_tienda: 'https://www.messer.es',
    url_web: 'https://www.messer.es',
    telefono: '93 490 21 00',
    gases: ['R-32','R-410A','R-404A','R-134a','R-744 CO2','R-290','Nitrógeno','Argón'],
    tipo: 'Distribuidor industrial nacional',
    nota: 'Especialmente presente en Cataluña y zona mediterránea',
    color: 'from-yellow-500 to-yellow-700',
    acciones: [
      { label: 'Solicitar información', icon: UserPlus, url: 'https://www.messer.es/es/contacto', primary: true },
      { label: 'Web principal', icon: Globe, url: 'https://www.messer.es', primary: false },
    ]
  },
];

function openURL(url) {
  if (!url) return;
  // location.href → Java intercepta y abre en browser externo → botón Atrás vuelve a la app
  window.location.href = url;
}

export default function GasSuppliers() {
  const [expanded, setExpanded] = useState('carburos');

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar title="Proveedores de Gas Refrigerante" />
      <div className="max-w-lg mx-auto px-3 py-4 space-y-3">

        {/* Info F-Gas */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
          <p className="font-bold mb-0.5">⚠️ Requisito F-Gas</p>
          <p className="text-xs text-amber-700">Para comprar gases HFC/HFO (R-32, R-410A, R-404A, etc.) debes acreditar tu certificado F-Gas al registrarte como profesional.</p>
        </div>

        {/* Proveedores */}
        {PROVEEDORES.map(prov => (
          <div key={prov.id} className="bg-white rounded-2xl shadow overflow-hidden">
            <button
              className={`w-full bg-gradient-to-r ${prov.color} p-4 flex items-center justify-between`}
              onClick={() => setExpanded(expanded === prov.id ? null : prov.id)}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{prov.logo}</span>
                <div className="text-left">
                  <p className="text-white font-bold text-base leading-none">{prov.nombre}</p>
                  <p className="text-white/70 text-xs mt-0.5">{prov.pais} · {prov.tipo}</p>
                </div>
              </div>
              <span className="text-white/80 text-lg">{expanded === prov.id ? '▲' : '▼'}</span>
            </button>

            {expanded === prov.id && (
              <div className="p-4 space-y-3">
                <p className="text-sm text-slate-600">{prov.descripcion}</p>
                {prov.nota && (
                  <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2 border border-amber-100">
                    ℹ️ {prov.nota}
                  </p>
                )}
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1.5">GASES DISPONIBLES</p>
                  <div className="flex flex-wrap gap-1">
                    {prov.gases.map(g => (
                      <span key={g} className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full text-xs font-medium">{g}</span>
                    ))}
                  </div>
                </div>
                {prov.telefono && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <button onClick={() => openURL(`tel:${prov.telefono.replace(/\s/g,'')}`)}
                      className="text-sm text-blue-600 font-medium underline">{prov.telefono}</button>
                  </div>
                )}
                <div className="space-y-2">
                  {prov.acciones.map((acc, i) => (
                    <button key={i} onClick={() => openURL(acc.url)}
                      className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
                        acc.primary
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}>
                      <acc.icon className="w-4 h-4" />
                      {acc.label}
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        <p className="text-center text-xs text-slate-400 pb-4">
          {PROVEEDORES.length} proveedores · Datos locales · Links abren en navegador
        </p>
      </div>
    </div>
  );
}
