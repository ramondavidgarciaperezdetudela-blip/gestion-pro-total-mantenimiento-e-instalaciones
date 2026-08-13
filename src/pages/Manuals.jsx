import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BookOpen, ExternalLink, Search, Sun, Zap, Copy, Printer, RefreshCw, Globe, ChevronDown, ChevronUp, WifiOff, CloudOff, Upload, Trash2, Plus, FolderOpen, Eye } from 'lucide-react';
import { saveToCache, formatCacheDate } from '@/lib/offlineCache';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { uploadImage } from '@/lib/uploadImage';

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

// ─── MANUALES PROPIOS (subidos por el usuario) ─────────────────────────────
const BRANDS = ['Daikin', 'Mitsubishi', 'Fujitsu', 'Samsung', 'LG', 'Toshiba', 'Panasonic', 'Midea', 'Carrier', 'Lennox', 'York', 'Intarcon', 'Copeland', 'Danfoss', 'Bitzer', 'Embraco', 'Hussmann', 'Rivacold', 'Schneider', 'ABB', 'Siemens', 'Victron', 'SMA', 'Fronius', 'Huawei Solar', 'Growatt', 'Otro'];
const DOC_CATEGORIES = ['Manual instalación', 'Manual usuario', 'Manual servicio', 'Ficha técnica', 'Esquema eléctrico', 'Catálogo', 'Normativa', 'Otro'];

function MyManualsTab() {
  const [manuals, setManuals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filterBrand, setFilterBrand] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [searchOwn, setSearchOwn] = useState('');
  const fileRef = useRef(null);
  const [form, setForm] = useState({ title: '', brand: '', model: '', category: 'Manual instalación', notes: '' });

  const load = async () => {
    setLoading(true);
    const docs = await base44.entities.ClientDocument.filter({ contact_id: 'MANUAL_LIBRARY' });
    setManuals(docs.sort((a, b) => (b.date || '').localeCompare(a.date || '')));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const file_url = await uploadImage(file);
      await base44.entities.ClientDocument.create({
        contact_id: 'MANUAL_LIBRARY',
        contact_name: form.brand,
        title: form.title || file.name,
        doc_type: 'manual',
        file_url,
        description: JSON.stringify({ brand: form.brand, model: form.model, category: form.category, notes: form.notes }),
        date: format(new Date(), 'yyyy-MM-dd'),
      });
      setUploadDialog(false);
      setForm({ title: '', brand: '', model: '', category: 'Manual instalación', notes: '' });
      load();
    } catch (err) {
      alert(err.message || 'Error al subir el manual');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este manual?')) return;
    await base44.entities.ClientDocument.delete(id);
    setManuals(prev => prev.filter(m => m.id !== id));
  };

  const parseExtra = (desc) => {
    try { return JSON.parse(desc || '{}'); } catch { return {}; }
  };

  const filtered = manuals.filter(m => {
    const ex = parseExtra(m.description);
    const matchBrand = !filterBrand || filterBrand === 'todos' || ex.brand === filterBrand;
    const matchCat = !filterCat || filterCat === 'todos' || ex.category === filterCat;
    const matchSearch = !searchOwn || m.title?.toLowerCase().includes(searchOwn.toLowerCase()) ||
      ex.brand?.toLowerCase().includes(searchOwn.toLowerCase()) ||
      ex.model?.toLowerCase().includes(searchOwn.toLowerCase());
    return matchBrand && matchCat && matchSearch;
  });

  // Group by brand
  const byBrand = {};
  filtered.forEach(m => {
    const ex = parseExtra(m.description);
    const brand = ex.brand || 'Sin marca';
    if (!byBrand[brand]) byBrand[brand] = [];
    byBrand[brand].push({ ...m, _extra: ex });
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-gray-500">Sube y organiza tus propios manuales por marca y modelo para consulta rápida durante reparaciones.</p>
        <Button className="bg-teal-600 hover:bg-teal-700" size="sm" onClick={() => setUploadDialog(true)}>
          <Plus className="w-4 h-4 mr-1" /> Subir manual
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input className="pl-9" placeholder="Buscar..." value={searchOwn} onChange={e => setSearchOwn(e.target.value)} />
        </div>
        <Select value={filterBrand} onValueChange={setFilterBrand}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Marca" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas las marcas</SelectItem>
            {BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Categoría" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas las categorías</SelectItem>
            {DOC_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading && <p className="text-center text-gray-400 py-6 text-sm">Cargando...</p>}

      {!loading && Object.keys(byBrand).length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Sin manuales subidos</p>
          <p className="text-xs mt-1">Usa el botón "Subir manual" para añadir PDFs o imágenes organizados por marca y modelo.</p>
        </div>
      )}

      {Object.entries(byBrand).map(([brand, items]) => (
        <Card key={brand}>
          <CardHeader className="pb-0 pt-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <span>🏷️</span>
              <span className="font-bold text-gray-800">{brand}</span>
              <span className="text-xs text-gray-400 font-normal">({items.length} {items.length === 1 ? 'manual' : 'manuales'})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 mt-2">
            <div className="divide-y">
              {items.map(m => (
                <div key={m.id} className="p-3 flex items-center justify-between gap-2 flex-wrap hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{m.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {m._extra.model && <span className="text-xs text-gray-500">Modelo: {m._extra.model}</span>}
                      {m._extra.category && <Badge variant="outline" className="text-[10px]">{m._extra.category}</Badge>}
                      {m._extra.notes && <span className="text-xs text-gray-400 italic">{m._extra.notes}</span>}
                      <span className="text-[10px] text-gray-300">{m.date}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {m.file_url && (
                      <a href={m.file_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs bg-teal-600 text-white px-2 py-1.5 rounded-lg hover:bg-teal-700 transition-colors">
                        <Eye className="w-3 h-3" /> Abrir
                      </a>
                    )}
                    <button onClick={() => handleDelete(m.id)}
                      className="flex items-center gap-1 text-xs bg-red-50 text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-100 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Dialog subir manual */}
      <Dialog open={uploadDialog} onOpenChange={setUploadDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Subir manual técnico</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500">Título del manual</label>
              <Input placeholder="Ej: Manual instalación MSZ-HR" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Marca</label>
                <Select value={form.brand} onValueChange={v => setForm({...form, brand: v})}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Modelo</label>
                <Input placeholder="Ej: MSZ-HR25" value={form.model} onChange={e => setForm({...form, model: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500">Categoría</label>
              <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DOC_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Notas (opcional)</label>
              <Input placeholder="Ej: Para modelo de 2022" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
            </div>
            <Button className="w-full bg-teal-600 hover:bg-teal-700" onClick={() => fileRef.current?.click()} disabled={uploading || !form.brand}>
              <Upload className="w-4 h-4 mr-2" />{uploading ? 'Subiendo...' : 'Seleccionar archivo (PDF / imagen)'}
            </Button>
            {!form.brand && <p className="text-xs text-amber-600 text-center">Selecciona una marca antes de subir</p>}
            <input ref={fileRef} type="file" accept=".pdf,image/*" className="hidden" onChange={handleFile} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
  const [isOffline, setIsOffline] = useState(false);
  const [cacheDate, setCacheDate] = useState('');

  useEffect(() => {
    // Guardar índice de manuales en caché (sólo metadatos, sin URLs externas que requieren red)
    const allData = { solar: SOLAR_MANUALS, others: OTHER_MANUALS };
    saveToCache('manuals_index', allData);
    setCacheDate(formatCacheDate(Date.now()));

    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    setIsOffline(!navigator.onLine);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const solarCount = SOLAR_MANUALS.reduce((a, c) => a + c.items.length, 0);
  const otherCount = OTHER_MANUALS.reduce((a, c) => a + c.items.length, 0);

  return (
    <div className="space-y-4">
      {isOffline && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          <span>Sin conexión — los nombres y referencias están disponibles, pero los enlaces externos requieren internet</span>
        </div>
      )}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-teal-600" />Manuales Técnicos
        </h1>
        <div className="flex items-center gap-2">
          {!isOffline ? (
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              <Globe className="w-3 h-3" /> Online · Auto-actualizados
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs flex items-center gap-1 border-amber-300 text-amber-700">
              <CloudOff className="w-3 h-3" /> Modo sin conexión
            </Badge>
          )}
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

      <Tabs defaultValue="mis_manuales">
        <TabsList className="w-full flex flex-wrap h-auto gap-1">
          <TabsTrigger value="mis_manuales" className="flex-1 flex items-center gap-1 min-w-[120px]">
            <FolderOpen className="w-4 h-4" /> Mis Manuales
          </TabsTrigger>
          <TabsTrigger value="solar" className="flex-1 flex items-center gap-1 min-w-[120px]">
            <Sun className="w-4 h-4" /> Solar <Badge className="ml-1 text-[10px] bg-amber-100 text-amber-800">{solarCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="otros" className="flex-1 flex items-center gap-1 min-w-[120px]">
            <Zap className="w-4 h-4" /> Clima · Refrig. <Badge className="ml-1 text-[10px]">{otherCount}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mis_manuales" className="mt-4">
          <MyManualsTab />
        </TabsContent>

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