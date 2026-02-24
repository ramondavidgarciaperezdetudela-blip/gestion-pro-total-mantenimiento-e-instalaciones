import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BookOpen, ExternalLink, Search, Download, Sun, Battery, Zap, Copy, Printer, RefreshCw, Globe, ChevronDown, ChevronUp } from 'lucide-react';

// ─── SOLAR / ENERGÍAS ────────────────────────────────────────────────────────
const SOLAR_MANUALS = [
  {
    category: 'Paneles Solares / Fotovoltaica',
    color: 'bg-amber-100 text-amber-800',
    icon: '☀️',
    items: [
      { name: 'JA Solar - Manuales módulos fotovoltaicos', model: 'JAM Series', url: 'https://www.jasolar.com/html/en/service/download/', type: 'Instalación' },
      { name: 'Longi Solar - Datasheet y manuales', model: 'Hi-MO Series', url: 'https://www.longi.com/en/service/download/', type: 'Instalación' },
      { name: 'Canadian Solar - Manuales y fichas técnicas', model: 'HiKu Series', url: 'https://www.canadiansolar.com/downloads/', type: 'Técnico' },
      { name: 'Risen Energy - Fichas técnicas módulos', model: 'RSM Series', url: 'https://www.risenenergy.com/downloads/', type: 'Técnico' },
      { name: 'Sunpower - Manuales instalación', model: 'Maxeon Series', url: 'https://us.sunpower.com/resources/installation-manuals', type: 'Instalación' },
      { name: 'IDAE - Guía técnica solar fotovoltaica', model: 'Guía completa España', url: 'https://www.idae.es/tecnologias/energias-renovables/uso-electrico/solar-fotovoltaica', type: 'Guía' },
      { name: 'REE - Procedimientos de conexión FV a red', model: 'Operación de la red', url: 'https://www.ree.es/es/clientes/solicitudes-de-acceso-y-conexion', type: 'Normativa' },
    ]
  },
  {
    category: 'Inversores Solares',
    color: 'bg-orange-100 text-orange-800',
    icon: '⚡',
    items: [
      { name: 'SMA - Manual instalación Sunny Boy', model: 'SB 3.0 / 5.0 / 6.0', url: 'https://www.sma.de/en/products/download-center.html', type: 'Instalación' },
      { name: 'SMA - Manual Sunny Tripower', model: 'STP 15000TL / 20000TL', url: 'https://www.sma.de/en/products/download-center.html', type: 'Instalación' },
      { name: 'Fronius - Manual Primo (monofásico)', model: 'Primo 3.0 - 8.2', url: 'https://www.fronius.com/en/solar-energy/manuals', type: 'Instalación' },
      { name: 'Fronius - Manual Symo (trifásico)', model: 'Symo 3.0 - 17.5', url: 'https://www.fronius.com/en/solar-energy/manuals', type: 'Instalación' },
      { name: 'Huawei - Manual SUN2000 monofásico', model: 'SUN2000-2KTL a 6KTL', url: 'https://solar.huawei.com/es/download', type: 'Instalación' },
      { name: 'Huawei - Manual SUN2000 trifásico', model: 'SUN2000-8KTL a 100KTL', url: 'https://solar.huawei.com/es/download', type: 'Instalación' },
      { name: 'Growatt - Manual inversores fotovoltaicos', model: 'MIN / MID / MAX Series', url: 'https://www.ginverter.com/en/service/download', type: 'Instalación' },
      { name: 'Goodwe - Manual inversores GW', model: 'ES / EM / ET Series', url: 'https://www.goodwe.com/download-center', type: 'Instalación' },
      { name: 'Solax - Manual inversor X1/X3', model: 'X1-BOOST / X3-PRO', url: 'https://www.solaxpower.com/download/', type: 'Instalación' },
      { name: 'SolarEdge - Manual instalación inversor', model: 'SE2200H - SE10000H', url: 'https://www.solaredge.com/us/service/documentation', type: 'Instalación' },
    ]
  },
  {
    category: 'Inversores/Cargadores Híbridos y Aislada',
    color: 'bg-yellow-100 text-yellow-800',
    icon: '🔄',
    items: [
      { name: 'Victron Energy - MultiPlus-II', model: '48/3000 / 48/5000 / 48/10000', url: 'https://www.victronenergy.com/support-and-tools/manuals', type: 'Instalación' },
      { name: 'Victron Energy - Quattro', model: '48/5000 - 48/15000', url: 'https://www.victronenergy.com/support-and-tools/manuals', type: 'Instalación' },
      { name: 'Victron Energy - EasySolar-II', model: 'GX 24V/250-70 / 48V/250-70', url: 'https://www.victronenergy.com/support-and-tools/manuals', type: 'Instalación' },
      { name: 'Schneider Conext XW+ - Manual instalación', model: 'XW+ 5548 / 6848', url: 'https://solar.schneider-electric.com/document-download/', type: 'Instalación' },
      { name: 'Studer - Manual Xtender', model: 'XTH 3000-12 / XTH 6000-48', url: 'https://www.studer-innotec.com/en/downloads/', type: 'Instalación' },
      { name: 'Outback Power - Manual FLEXpower ONE', model: 'FXR2012A / FXR2524A', url: 'https://www.outbackpower.com/resources/documents', type: 'Instalación' },
      { name: 'Growatt - SPH (Híbrido)', model: 'SPH3000 - SPH10000TL3', url: 'https://www.ginverter.com/en/service/download', type: 'Instalación' },
      { name: 'SMA - Sunny Island (aislada)', model: 'SI 4.4M / 6.0H / 8.0H', url: 'https://www.sma.de/en/products/download-center.html', type: 'Instalación' },
    ]
  },
  {
    category: 'Baterías (LFP, LiPo, AGM, GEL)',
    color: 'bg-green-100 text-green-800',
    icon: '🔋',
    items: [
      { name: 'Pylontech - Manual US2000 / US3000', model: 'US2000C / US3000C / UP5000', url: 'https://en.pylontech.com.cn/download/', type: 'Instalación' },
      { name: 'Pylontech - Protocolo CAN/RS485 Victron', model: 'Protocolo comunicación', url: 'https://www.victronenergy.com/live/battery_compatibility:pylontech_phantom', type: 'Técnico' },
      { name: 'BYD Battery Box - Manual instalación', model: 'Premium LVS / LVL', url: 'https://www.bydbatterybox.com/downloads/', type: 'Instalación' },
      { name: 'Huawei LUNA - Manual batería', model: 'LUNA2000-5-S0 / 10-S0 / 15-S0', url: 'https://solar.huawei.com/es/download', type: 'Instalación' },
      { name: 'Freedom Won - Manual baterías LFP', model: 'eTower / Lite Home', url: 'https://www.freedomwon.co.za/downloads/', type: 'Instalación' },
      { name: 'Alpha ESS - Manual sistema de baterías', model: 'SMILE-B3 / T10', url: 'https://www.alpha-ess.com/downloads', type: 'Instalación' },
      { name: 'Rolls Battery - Manual baterías GEL/AGM', model: 'S6-EX-L / 6CS-17PS', url: 'https://www.rollsbattery.com/warranty/installation-manuals/', type: 'Instalación' },
      { name: 'BAE Secura - Manual baterías OPzS', model: 'OPzS Block 6V/12V', url: 'https://www.bae-berlin.de/en/downloads/', type: 'Instalación' },
      { name: 'Victron - Configuración baterías LiFePO4', model: 'Smart Battery 12.8V / 25.6V', url: 'https://www.victronenergy.com/support-and-tools/manuals', type: 'Técnico' },
      { name: 'RECC - Guía cálculo baterías para autoconsumo', model: 'Guía práctica española', url: 'https://www.recc.es/guias', type: 'Guía' },
    ]
  },
  {
    category: 'Generadores',
    color: 'bg-slate-100 text-slate-800',
    icon: '🏭',
    items: [
      { name: 'Honda - Manual generadores EU Series', model: 'EU22i / EU30is / EU70is', url: 'https://www.honda.es/generadores/descargas/', type: 'Usuario' },
      { name: 'Yamaha - Manual generadores EF Series', model: 'EF2200iS / EF6300iSDE', url: 'https://www.yamaha-motor.eu/es/support/manuals/', type: 'Usuario' },
      { name: 'Kohler - Manual generadores industriales', model: '20RESAL / 30RES', url: 'https://www.kohlerpower.es/soporte/manuales/', type: 'Instalación' },
      { name: 'Pramac - Manuales generadores diésel', model: 'P6000 / P9000 / S22D', url: 'https://www.pramac.com/es/soporte/descargas/', type: 'Instalación' },
      { name: 'Victron - Manual Autotransformer (conexión gen)', model: 'Autotransformer 100A', url: 'https://www.victronenergy.com/support-and-tools/manuals', type: 'Instalación' },
      { name: 'Generac - Manual generadores standby', model: '7kW / 11kW / 22kW Series', url: 'https://www.generac.com/support/product-support-lookup', type: 'Instalación' },
      { name: 'SMA - Conexión generador con Sunny Island', model: 'Aplicación nota técnica', url: 'https://www.sma.de/en/products/download-center.html', type: 'Técnico' },
    ]
  },
  {
    category: 'PPT / Controladores de Carga MPPT',
    color: 'bg-blue-100 text-blue-800',
    icon: '📡',
    items: [
      { name: 'Victron - Manual MPPT SmartSolar', model: '75/10 / 100/20 / 150/45 / 150/100', url: 'https://www.victronenergy.com/support-and-tools/manuals', type: 'Instalación' },
      { name: 'Victron - Manual BlueSolar MPPT', model: '75/50 / 100/50 / 150/70', url: 'https://www.victronenergy.com/support-and-tools/manuals', type: 'Instalación' },
      { name: 'Epever - Manual Tracer MPPT', model: 'Tracer 1206AN / 4210AN / 6420AN', url: 'https://www.epever.com/download/', type: 'Instalación' },
      { name: 'Renogy - Manual MPPT Rover', model: 'Rover 20A / 40A / 60A / 100A', url: 'https://www.renogy.com/resources/', type: 'Instalación' },
      { name: 'MorningStar - Manual ProStar MPPT', model: 'PS-MPPT-25M / PS-MPPT-40M', url: 'https://www.morningstarcorp.com/documentation/', type: 'Instalación' },
      { name: 'OutBack - Manual FlexMax MPPT', model: 'FM60 / FM80', url: 'https://www.outbackpower.com/resources/documents', type: 'Instalación' },
      { name: 'Steca - Manual controladores Tarom MPPT', model: 'Tarom 235 / 245 / 440 / 4545', url: 'https://www.steca.com/en/products/solar-charge-controllers/', type: 'Instalación' },
    ]
  },
  {
    category: 'Balanceadores y Gestión de Baterías (BMS)',
    color: 'bg-purple-100 text-purple-800',
    icon: '⚖️',
    items: [
      { name: 'Victron - Cerbo GX / GX Touch', model: 'Sistema de monitorización GX', url: 'https://www.victronenergy.com/support-and-tools/manuals', type: 'Instalación' },
      { name: 'Victron - Battery Balancer 12V', model: 'Balanceador para baterías serie', url: 'https://www.victronenergy.com/support-and-tools/manuals', type: 'Instalación' },
      { name: 'Daly BMS - Manual Smart BMS LFP', model: '8S / 16S / 20S LiFePO4', url: 'https://www.dalybms.com/download/', type: 'Técnico' },
      { name: 'JBD/Overkill BMS - Manual configuración', model: '4S / 8S / 16S', url: 'https://overkillsolar.com/jbd-bms-documentation/', type: 'Técnico' },
      { name: 'Batrium - Manual BMS modular Watchmon', model: 'Watchmon Core / Tank', url: 'https://www.batrium.com/pages/downloads', type: 'Instalación' },
      { name: 'SimpBMS - Manual BMS Tesla/modular', model: 'Para módulos Tesla Powerwall', url: 'https://www.simpbms.com/documentation/', type: 'Técnico' },
      { name: 'Growatt - Manual GBLI6532 BMS', model: 'HV/LV Batería con BMS integrado', url: 'https://www.ginverter.com/en/service/download', type: 'Técnico' },
      { name: 'Solar Edge Energy Bank - Manual', model: 'Batería 10kWh con BMS', url: 'https://www.solaredge.com/us/service/documentation', type: 'Instalación' },
    ]
  },
  {
    category: 'Monitorización Solar y Herramientas',
    color: 'bg-teal-100 text-teal-800',
    icon: '📊',
    items: [
      { name: 'PVgis - Herramienta online cálculo FV (UE)', model: 'Estimación producción solar', url: 'https://re.jrc.ec.europa.eu/pvg_tools/es/', type: 'Herramienta' },
      { name: 'Solargis - Mapa solar España', model: 'Irradiación solar y datos', url: 'https://solargis.com/maps-and-gis-data/download/spain', type: 'Herramienta' },
      { name: 'SolarCalc - IDAE dimensionado FV', model: 'Cálculo instalaciones aisladas', url: 'https://calculationsolar.com/', type: 'Herramienta' },
      { name: 'Victron VRM Portal - Monitorización', model: 'Guía inicio VRM', url: 'https://www.victronenergy.com/live/vrm_portal:start', type: 'Herramienta' },
      { name: 'Fronius Solar.web - Guía monitorización', model: 'Dashboard producción', url: 'https://www.solarweb.com/', type: 'Herramienta' },
      { name: 'Solax Cloud - Manual monitorización', model: 'App y portal web', url: 'https://www.solaxcloud.com/', type: 'Herramienta' },
      { name: 'RCT Power App - Manual', model: 'RCT Power Storage DC', url: 'https://www.rct-power.com/en/downloads.html', type: 'Técnico' },
    ]
  },
  {
    category: 'Normativa Solar España',
    color: 'bg-red-100 text-red-800',
    icon: '📋',
    items: [
      { name: 'RD 244/2019 - Autoconsumo eléctrico', model: 'BOE Autoconsumo España', url: 'https://www.boe.es/eli/es/rd/2019/04/05/244', type: 'Normativa' },
      { name: 'RD 413/2014 - Energía renovable', model: 'Régimen económico FV', url: 'https://www.boe.es/eli/es/rd/2014/06/06/413', type: 'Normativa' },
      { name: 'ITC-BT-40 - Instalaciones generadoras', model: 'REBT generación baja tensión', url: 'https://www.boe.es/eli/es/rd/2002/08/02/842/con', type: 'Normativa' },
      { name: 'UNE-HD 60364-7-712 - Sistemas FV', model: 'Norma instalaciones solares', url: 'https://www.une.org/encuentra-tu-norma/busca-tu-norma/norma/?c=N0047393', type: 'Normativa' },
      { name: 'RITE - Instalaciones Térmicas Edificios', model: 'Solar térmica', url: 'https://energia.gob.es/desarrollo/EficienciaEnergetica/RITE/Paginas/InstalacionesTermicas.aspx', type: 'Normativa' },
      { name: 'UNEF - Guía instalaciones FV residencial', model: 'Guía práctica instaladores', url: 'https://unef.es/publicaciones/', type: 'Guía' },
      { name: 'IDAE - Manual de energía solar fotovoltaica', model: 'Manual completo técnico', url: 'https://www.idae.es/publicaciones/manual-de-energia-solar-fotovoltaica', type: 'Guía' },
    ]
  },
];

// ─── OTROS MANUALES ───────────────────────────────────────────────────────────
const OTHER_MANUALS = [
  {
    category: 'Daikin', color: 'bg-blue-100 text-blue-700',
    items: [
      { name: 'Daikin - Manual instalación splits', model: 'Series FTXC/FTXF', url: 'https://www.daikin.es/content/dam/document-library/installer-reference-guide/split/FTXC-FTXF_installer_guide_ES.pdf', type: 'Instalación' },
      { name: 'Daikin - Manual usuario splits', model: 'Series FTXC/FTXF', url: 'https://www.daikin.es/content/dam/document-library/owner-s-manual/split/FTXC-FTXF_user_guide_ES.pdf', type: 'Usuario' },
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
    ]
  },
  {
    category: 'Samsung', color: 'bg-indigo-100 text-indigo-700',
    items: [
      { name: 'Samsung - Manuales aire acondicionado', model: 'Wind-Free Series', url: 'https://www.samsung.com/es/support/model/AR09TXHQBWKNEU/', type: 'Usuario' },
    ]
  },
  {
    category: 'Intarcon (Refrigeración)', color: 'bg-orange-100 text-orange-700',
    items: [
      { name: 'Intarcon - Catálogo unidades condensadoras', model: 'Línea ECO', url: 'https://www.intarcon.com/documentacion/', type: 'Catálogo' },
      { name: 'Intarcon - Manual instalación', model: 'Evaporadores', url: 'https://www.intarcon.com/documentacion/', type: 'Instalación' },
    ]
  },
  {
    category: 'Danfoss', color: 'bg-green-100 text-green-700',
    items: [
      { name: 'Danfoss - Válvulas de expansión termostáticas', model: 'TUA/TUB Series', url: 'https://store.danfoss.com/es-ES/', type: 'Instalación' },
      { name: 'Danfoss - Compresores herméticos', model: 'SC/BD Series', url: 'https://store.danfoss.com/es-ES/', type: 'Instalación' },
    ]
  },
  {
    category: 'Electricidad / REBT', color: 'bg-yellow-100 text-yellow-700',
    items: [
      { name: 'REBT Completo - RD 842/2002', model: 'Todas las ITC-BT', url: 'https://www.boe.es/eli/es/rd/2002/08/02/842/con', type: 'Normativa' },
      { name: 'Schneider - Guía instalaciones eléctricas', model: 'Guía práctica', url: 'https://www.se.com/es/es/download/document/SCHNEIDER_GUIA_INST_ELECTRICAS/', type: 'Guía' },
      { name: 'ABB - Manuales cuadros eléctricos', model: 'Gamma Building', url: 'https://library.e.abb.com/public/', type: 'Instalación' },
    ]
  },
  {
    category: 'Telecomunicaciones vivienda', color: 'bg-slate-100 text-slate-700',
    items: [
      { name: 'ICT - Infraestructura Común Telecomunicaciones', model: 'RD 346/2011', url: 'https://www.boe.es/eli/es/rd/2011/03/11/346', type: 'Normativa' },
    ]
  },
];

function ManualRow({ item }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(item.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const w = window.open(item.url, '_blank');
    if (w) setTimeout(() => w.print(), 1500);
  };

  return (
    <div className="p-3 hover:bg-gray-50 flex items-center justify-between gap-2 flex-wrap">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{item.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-gray-500">{item.model}</p>
          <Badge variant="outline" className="text-[10px]">{item.type}</Badge>
        </div>
      </div>
      <div className="flex gap-1 flex-shrink-0 flex-wrap">
        <button onClick={handleCopy} title="Copiar enlace"
          className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1.5 rounded-lg transition-colors">
          <Copy className="w-3 h-3" />{copied ? '✓' : 'Copiar'}
        </button>
        <button onClick={handlePrint} title="Imprimir PDF"
          className="flex items-center gap-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1.5 rounded-lg transition-colors">
          <Printer className="w-3 h-3" />Imprimir
        </button>
        <a href={item.url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs bg-teal-600 text-white px-2 py-1.5 rounded-lg hover:bg-teal-700 transition-colors">
          <ExternalLink className="w-3 h-3" />Abrir
        </a>
      </div>
    </div>
  );
}

function ManualSection({ sections, search }) {
  const [collapsed, setCollapsed] = useState({});

  const filtered = sections.map(cat => ({
    ...cat,
    items: cat.items.filter(item =>
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.model.toLowerCase().includes(search.toLowerCase()) ||
      item.type.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(cat => cat.items.length > 0);

  return (
    <div className="space-y-3">
      {filtered.map((cat, ci) => (
        <Card key={ci}>
          <CardHeader className="pb-0 pt-3 px-4">
            <button
              className="flex items-center justify-between w-full text-left"
              onClick={() => setCollapsed(c => ({ ...c, [ci]: !c[ci] }))}
            >
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="text-base">{cat.icon || '📄'}</span>
                <Badge className={cat.color}>{cat.category}</Badge>
                <span className="text-xs text-gray-400 font-normal">({cat.items.length})</span>
              </CardTitle>
              {collapsed[ci] ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
            </button>
          </CardHeader>
          {!collapsed[ci] && (
            <CardContent className="p-0 mt-2">
              <div className="divide-y">
                {cat.items.map((item, ii) => <ManualRow key={ii} item={item} />)}
              </div>
            </CardContent>
          )}
        </Card>
      ))}
      {filtered.length === 0 && (
        <div className="text-center text-gray-400 py-10 text-sm">No se encontraron manuales para esa búsqueda.</div>
      )}
    </div>
  );
}

export default function Manuals() {
  const [search, setSearch] = useState('');

  const solarCount = SOLAR_MANUALS.reduce((a, c) => a + c.items.length, 0);
  const otherCount = OTHER_MANUALS.reduce((a, c) => a + c.items.length, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-teal-600" />Manuales Técnicos
        </h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs flex items-center gap-1">
            <Globe className="w-3 h-3" /> Online · Auto-actualizados
          </Badge>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Buscar manual, marca, modelo, tipo..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2">
        <RefreshCw className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          <strong>Manuales online auto-actualizados:</strong> Los documentos se cargan directamente desde los servidores oficiales de cada fabricante.
          Siempre verás la versión más reciente. Puedes abrirlos, imprimirlos o copiar el enlace.
        </div>
      </div>

      <Tabs defaultValue="solar">
        <TabsList className="w-full">
          <TabsTrigger value="solar" className="flex-1 flex items-center gap-1">
            <Sun className="w-4 h-4" /> Energía Solar <Badge className="ml-1 text-[10px] bg-amber-100 text-amber-800">{solarCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="otros" className="flex-1 flex items-center gap-1">
            <Zap className="w-4 h-4" /> Clima · Refrigeración · Eléctrico <Badge className="ml-1 text-[10px]">{otherCount}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="solar" className="mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {[
              { icon: '☀️', label: 'Paneles', count: SOLAR_MANUALS[0].items.length },
              { icon: '⚡', label: 'Inversores', count: SOLAR_MANUALS[1].items.length + SOLAR_MANUALS[2].items.length },
              { icon: '🔋', label: 'Baterías / BMS', count: SOLAR_MANUALS[3].items.length + SOLAR_MANUALS[6].items.length },
              { icon: '📋', label: 'Normativa', count: SOLAR_MANUALS[8].items.length },
            ].map((s, i) => (
              <div key={i} className="bg-white border rounded-lg p-3 text-center">
                <div className="text-2xl">{s.icon}</div>
                <div className="text-xs font-medium text-gray-700 mt-1">{s.label}</div>
                <div className="text-lg font-bold text-amber-600">{s.count}</div>
              </div>
            ))}
          </div>
          <ManualSection sections={SOLAR_MANUALS} search={search} />
        </TabsContent>

        <TabsContent value="otros" className="mt-4">
          <ManualSection sections={OTHER_MANUALS} search={search} />
        </TabsContent>
      </Tabs>

      <p className="text-xs text-gray-400 text-center pb-4">
        Los manuales son accedidos directamente desde los servidores de cada fabricante y se actualizan automáticamente.
        Si un enlace no funciona, el fabricante puede haber cambiado su URL.
      </p>
    </div>
  );
}