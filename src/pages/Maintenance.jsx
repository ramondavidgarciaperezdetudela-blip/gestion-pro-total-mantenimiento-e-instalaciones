import React, { useState, useEffect, useRef } from 'react';
import { cargarTodo } from '@/lib/cargarTodo';
import BuscadorCliente from '@/components/BuscadorCliente';
import BuscarFichaTecnica from '@/components/BuscarFichaTecnica';
import GuardarDocumentacion from '@/components/GuardarDocumentacion';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberField } from "@/components/ui/number-field";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, ClipboardList, Trash2, Eye, Phone, FileDown } from 'lucide-react';
import TechnicianSelect from '../components/TechnicianSelect';
import { format } from 'date-fns';
import { getNextAvailableNumber } from '../components/autoNumber';
import PrintButton from '../components/PrintButton';
import CompanyHeader from '../components/CompanyHeader';
import PhotoGallery from '../components/PhotoGallery';
import SignaturePad from '../components/SignaturePad';

const TYPES = ['clima', 'refrigeracion', 'electrico', 'solar', 'fontaneria', 'general'];

import InspeccionSanitaria from '@/components/InspeccionSanitaria';
import { fichaVacia, hayAlgoContestado } from '@/lib/inspeccionSanitaria';
import { htmlHojaSanitaria } from '@/lib/hojaSanitaria';
import { anotarEnDiario } from '@/lib/diarioDeReparaciones';
import { camposPerdidos, avisoDeCamposPerdidos } from '@/lib/guardadoDeVerdad';

const FGAS_GWP = {
  'R-410A': 2088, 'R-32': 675, 'R-134a': 1430, 'R-404A': 3922,
  'R-407C': 1774, 'R-290': 3, 'R-449A': 1397, 'R-452A': 2140, 'R-448A': 1387
};

// Campos que el servidor podría estar tirando en silencio si no están
// declarados en su ficha. Se comprueban al guardar: mandarlos y que
// desaparezcan sin decir nada es peor que un error, porque nadie se entera
// hasta que vuelve a abrir la ficha y el dato ya no está.
const CAMPOS_VIGILADOS = [
  'compressor_ref', 'compressor_brand', 'compressor_application', 'compressor_supply',
  'compressor_refrigerants', 'compressor_technology', 'compressor_power_hp', 'compressor_notes',
  'inspeccion_sanitaria',
];

const NOMBRES_VIGILADOS = {
  compressor_ref: 'Referencia del compresor',
  compressor_brand: 'Marca del compresor',
  compressor_application: 'Aplicación del compresor',
  compressor_supply: 'Alimentación del compresor',
  compressor_refrigerants: 'Refrigerantes admitidos',
  compressor_technology: 'Tecnología del compresor',
  compressor_power_hp: 'Potencia del compresor',
  compressor_notes: 'Otros datos de la placa',
  inspeccion_sanitaria: 'Hoja de inspección técnico-sanitaria',
};

const EMPTY_FORM = {
  sheet_number: '', contact_id: '', contact_name: '', date: format(new Date(), 'yyyy-MM-dd'),
  type: 'clima', equipment_brand: '', equipment_model: '', serial_number: '', location: '',
  // Datos de la placa del compresor. Antes solo cabían marca, modelo y número
  // de serie, y el resto (referencia completa, aplicación, alimentación,
  // refrigerantes admitidos, tecnología) acababa escrito a mano en el campo de
  // observaciones, donde no se puede buscar ni sale ordenado en la hoja.
  compressor_ref: '', compressor_brand: '', compressor_application: '',
  compressor_supply: '', compressor_refrigerants: '', compressor_technology: '',
  compressor_power_hp: '', compressor_notes: '',
  technician_name: '',
  readings_climate: { pressure_high: '', pressure_low: '', temp_impulsion: '', temp_retorno: '', temp_exterior: '', refrigerant_type: 'R-410A', refrigerant_charge: '', voltage: '', amperage_compressor: '', amperage_fan: '', superheat: '', subcooling: '', fgas_equivalent_co2: 0, fgas_gwp: 2088 },
  readings_electric: { voltage_l1: '', voltage_l2: '', voltage_l3: '', amperage_l1: '', amperage_l2: '', amperage_l3: '', power_factor: '', ground_resistance: '', insulation_resistance: '', differential_test: false, thermal_test: false },
  readings_solar: { panel_voltage: '', panel_current: '', inverter_output_w: '', battery_level_pct: '', production_kwh: '', panel_cleaning: false, connections_ok: false },
  readings_plumbing: { water_pressure_bar: '', temp_acs: '', flow_lmin: '', leaks_detected: false, filter_state: '' },
  general_tasks: '',
  observations: '', recommendations: '',
  photos_before: [], photos_after: [], photos_evaporator_plate: [], photos_condenser_plate: [],
  // La hoja que se le enseña a Sanidad cuando la ficha es de una cámara.
  // Va dentro de la propia ficha para que no puedan separarse: el informe
  // sanitario y las lecturas del día son la misma intervención.
  inspeccion_sanitaria: fichaVacia(),
  signature_technician: '', signature_client: '', sign_datetime_technician: '', sign_datetime_client: '', status: 'completada'
};

/**
 * Deja en "sin dato" (null) las LECTURAS que se han quedado en blanco.
 *
 * Solo se tocan los grupos de lecturas (readings_*), donde todo son medidas
 * numéricas. Los campos de texto se dejan como están: ahí un blanco es un
 * blanco y no hay nada que convertir.
 *
 * Y no se convierte a 0: en una revisión, 0 bar es una medida real y muy
 * distinta de "no lo he medido". Poner ceros para poder guardar falsearía el
 * documento que se le entrega al cliente firmado.
 */
/**
 * Cómo sale una medida en la hoja que firma el cliente.
 *
 * Lo que no se ha medido sale como «— no medido», NO como 0. Antes se
 * imprimía «0 bar», «0 V», «0 °C» para toda lectura en blanco: eso no es un
 * hueco, es una medida falsa en un documento firmado. Y un 0 real (que
 * existe: 0 °C de subenfriamiento) quedaba indistinguible de un hueco.
 */
/**
 * Los datos del compresor en la hoja impresa.
 *
 * Solo salen las casillas rellenas: si no se sabe la tecnología, no tiene
 * sentido imprimir «Tecnología: -» en un documento que se le entrega al
 * cliente. Y si no se ha puesto ninguna, el bloque entero no aparece.
 */
function bloqueCompresor(sheet) {
  const filas = [
    ['Referencia', sheet.compressor_ref],
    ['Marca', sheet.compressor_brand],
    ['Aplicación', sheet.compressor_application],
    ['Alimentación', sheet.compressor_supply],
    ['Refrigerantes', sheet.compressor_refrigerants],
    ['Tecnología', sheet.compressor_technology],
    ['Potencia', sheet.compressor_power_hp],
    ['Otros', sheet.compressor_notes],
  ].filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '');
  if (!filas.length) return '';
  return `
    <div style="margin-top:6px;padding:6px 8px;border:1px solid #e5e7eb;border-radius:5px;background:#f8fafc">
      <div style="font-weight:700;color:#1e3a5f;margin-bottom:3px">Compresor</div>
      ${filas.map(([n, v]) => `<div class="field"><span>${n}: </span>${v}</div>`).join('')}
    </div>`;
}

function medida(valor, unidad = '', decimales = null) {
  if (valor === null || valor === undefined || valor === '') {
    return '<span style="color:#9ca3af">— no medido</span>';
  }
  const n = typeof valor === 'number' ? valor : parseFloat(String(valor).replace(',', '.'));
  if (!Number.isFinite(n)) return String(valor);
  const texto = decimales === null ? String(n) : n.toFixed(decimales);
  return `${texto}${unidad ? ' ' + unidad : ''}`;
}

function sinVacios(datos) {
  const salida = { ...datos };
  for (const [grupo, lecturas] of Object.entries(datos)) {
    if (!grupo.startsWith('readings_') || !lecturas || typeof lecturas !== 'object') continue;
    const limpio = {};
    let cambiado = false;
    for (const [campo, valor] of Object.entries(lecturas)) {
      if (valor === '') { limpio[campo] = null; cambiado = true; }
      else limpio[campo] = valor;
    }
    if (cambiado) salida[grupo] = limpio;
  }
  return salida;
}

export default function Maintenance() {
  const [sheets, setSheets] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const printRef = useRef(null);

  useEffect(() => {
    Promise.all([
      cargarTodo('MaintenanceSheet', '-date'),
      base44.entities.Contact.list(),
    ]).then(([s, c]) => {
      setSheets(s);
      setContacts(c);
      // Pre-calcular número para nueva ficha
      setForm(f => ({ ...f, sheet_number: getNextAvailableNumber(s.map(x => x.sheet_number || '')) }));
    });
  }, []);

  const handleSave = async () => {
    // Lo que no se ha medido se manda como "sin dato", no como texto vacío.
    // Antes se enviaba '' y el servidor rechazaba la hoja entera nombrando
    // hasta 17 campos, obligando a poner ceros en lecturas que no se han hecho
    // — y un cero no es lo mismo que "no medido": falsea la revisión.
    const data = sinVacios({ ...form });
    let guardadaId = editing?.id || '';
    let devuelta = null;
    if (editing) {
      devuelta = await base44.entities.MaintenanceSheet.update(editing.id, data);
    } else {
      // Re-calcular número justo antes de guardar (por si otro guardó mientras tanto)
      const latest = await cargarTodo('MaintenanceSheet', '-date');
      if (!data.sheet_number || data.sheet_number === getNextAvailableNumber(latest.filter(x => x.id !== editing?.id).map(x => x.sheet_number || ''))) {
        data.sheet_number = getNextAvailableNumber(latest.map(x => x.sheet_number || ''));
      }
      const saved = await base44.entities.MaintenanceSheet.create(data);
      devuelta = saved;
      guardadaId = saved?.id || '';
      if (form.contact_id) {
        await base44.entities.ClientDocument.create({
          contact_id: form.contact_id,
          contact_name: form.contact_name,
          title: `Ficha Mantenimiento #${form.sheet_number} - ${form.type}`,
          doc_type: 'ficha_mantenimiento',
          date: form.date,
          description: `${form.type} | ${form.equipment_brand} ${form.equipment_model}`,
          reference_id: saved.id,
        });
      }
    }
    // ¿Ha guardado el servidor TODO lo que se le ha mandado? Lo que contesta
    // al guardar es su versión del registro, así que comparando se sabe si ha
    // descartado algún campo en silencio.
    const perdidos = camposPerdidos(data, devuelta, CAMPOS_VIGILADOS);

    // Si la ficha lleva hoja de inspección sanitaria, la intervención queda
    // apuntada en el diario de esa cámara. Antes había que hacerlo a mano
    // después, así que casi nunca se hacía: la máquina que más avisos daba
    // era justo la que salía con el diario en blanco.
    let avisoDiario = '';
    const inspeccion = form.inspeccion_sanitaria;
    if (inspeccion?.activa && hayAlgoContestado(inspeccion) && form.contact_id) {
      try {
        const ficha = { ...data, id: guardadaId };
        const r = await anotarEnDiario(base44, { sheet: ficha, ficha: inspeccion });
        if (r.ok) {
          avisoDiario = r.creado
            ? '\n📔 Se ha creado el diario de esta cámara y se ha apuntado la intervención.'
            : '\n📔 Apuntada en el diario de reparaciones de esta cámara.';
        }
      } catch (e) {
        // Que falle el diario no puede tirar la ficha, que ya está guardada.
        console.error('[Maintenance] No se pudo apuntar en el diario:', e);
        avisoDiario = '\n⚠️ La ficha se ha guardado, pero no se ha podido apuntar en el diario. Ábrelo y añádela a mano.';
      }
    }

    setDialogOpen(false);
    setEditing(null);
    const s = await cargarTodo('MaintenanceSheet', '-date');
    setSheets(s);
    setForm({ ...EMPTY_FORM, sheet_number: getNextAvailableNumber(s.map(x => x.sheet_number || '')) });
    const okMsg = (editing ? '✅ Ficha actualizada correctamente' : '✅ Ficha guardada y vinculada al cliente') + avisoDiario;
    alert(perdidos.length
      ? `${okMsg}\n\n${avisoDeCamposPerdidos(perdidos, 'MaintenanceSheet', NOMBRES_VIGILADOS)}`
      : okMsg);
  };

  const handleEdit = (sheet) => {
    setEditing(sheet);
    setForm({
      sheet_number: sheet.sheet_number || '', contact_id: sheet.contact_id || '', contact_name: sheet.contact_name || '',
      date: sheet.date || '', type: sheet.type || 'clima', equipment_brand: sheet.equipment_brand || '',
      equipment_model: sheet.equipment_model || '', serial_number: sheet.serial_number || '', location: sheet.location || '',
      compressor_ref: sheet.compressor_ref || '', compressor_brand: sheet.compressor_brand || '',
      compressor_application: sheet.compressor_application || '', compressor_supply: sheet.compressor_supply || '',
      compressor_refrigerants: sheet.compressor_refrigerants || '',
      compressor_technology: sheet.compressor_technology || '',
      compressor_power_hp: sheet.compressor_power_hp || '', compressor_notes: sheet.compressor_notes || '',
      technician_name: sheet.technician_name || '',
      readings_climate: sheet.readings_climate || EMPTY_FORM.readings_climate,
      readings_electric: sheet.readings_electric || EMPTY_FORM.readings_electric,
      readings_solar: sheet.readings_solar || EMPTY_FORM.readings_solar,
      readings_plumbing: sheet.readings_plumbing || EMPTY_FORM.readings_plumbing,
      general_tasks: sheet.general_tasks || '',
      observations: sheet.observations || '', recommendations: sheet.recommendations || '',
      photos_before: sheet.photos_before || [], photos_after: sheet.photos_after || [],
      photos_evaporator_plate: sheet.photos_evaporator_plate || [],
      photos_condenser_plate: sheet.photos_condenser_plate || [],
      inspeccion_sanitaria: { ...fichaVacia(), ...(sheet.inspeccion_sanitaria || {}) },
      signature_technician: sheet.signature_technician || '',
      signature_client: sheet.signature_client || '',
      sign_datetime_technician: sheet.sign_datetime_technician || '',
      sign_datetime_client: sheet.sign_datetime_client || '',
      status: sheet.status || 'completada'
    });
    setDialogOpen(true);
  };

  const updateClimate = (field, val) => {
    const updated = { ...form.readings_climate, [field]: val };
    if (field === 'refrigerant_type') {
      updated.fgas_gwp = FGAS_GWP[val] || 0;
      updated.fgas_equivalent_co2 = ((updated.refrigerant_charge || 0) * (FGAS_GWP[val] || 0)) / 1000;
    }
    if (field === 'refrigerant_charge') {
      updated.fgas_equivalent_co2 = (val * (updated.fgas_gwp || 0)) / 1000;
    }
    setForm({ ...form, readings_climate: updated });
  };
  const updateElectric = (field, val) => setForm({ ...form, readings_electric: { ...form.readings_electric, [field]: val } });
  const updateSolar = (field, val) => setForm({ ...form, readings_solar: { ...form.readings_solar, [field]: val } });
  const updatePlumbing = (field, val) => setForm({ ...form, readings_plumbing: { ...form.readings_plumbing, [field]: val } });

  const typeColor = { clima: 'bg-blue-100 text-blue-700', refrigeracion: 'bg-cyan-100 text-cyan-700', electrico: 'bg-yellow-100 text-yellow-700', solar: 'bg-amber-100 text-amber-700', fontaneria: 'bg-teal-100 text-teal-700', general: 'bg-gray-100 text-gray-700' };

  /**
   * La hoja para el inspector de Sanidad.
   *
   * Va aparte del PDF normal a propósito: son dos documentos con dos lectores
   * distintos. El de siempre es para el cliente y el archivo del instalador
   * (presiones, recalentamientos, F-Gas); este es para Sanidad y responde a
   * otra pregunta —en qué estado quedó la cámara ese día— con el veredicto
   * arriba del todo y las fotos de la intervención al final.
   */
  const imprimirHojaSanitaria = async (sheet) => {
    const ficha = sheet?.inspeccion_sanitaria;
    if (!hayAlgoContestado(ficha)) {
      alert('Esta ficha todavía no tiene nada contestado en la hoja de inspección sanitaria.');
      return;
    }
    const [settingsList, contactList] = await Promise.all([
      base44.entities.CompanySettings.list(),
      sheet.contact_id ? base44.entities.Contact.filter({ id: sheet.contact_id }) : Promise.resolve([]),
    ]);
    const html = htmlHojaSanitaria({
      sheet,
      ficha,
      company: settingsList[0] || {},
      contact: contactList[0] || {},
    });
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 600);
  };

  const generatePDF = async (sheet) => {
    const [settingsList, contactList] = await Promise.all([
      base44.entities.CompanySettings.list(),
      base44.entities.Contact.filter({ id: sheet.contact_id }),
    ]);
    const company = settingsList[0] || {};
    const contact = contactList[0] || {};

    // Fotos del equipo del cliente
    let equipPhotos = [];
    if (sheet.contact_id) {
      const clientDocs = await base44.entities.ClientDocument.filter({ contact_id: sheet.contact_id });
      equipPhotos = clientDocs.filter(d => d.doc_type === 'foto_equipo').map(d => d.file_url);
    }

    const photosHtml = (photos, label) => {
      if (!photos?.length) return '';
      return `<div style="margin-top:12px"><p style="font-weight:600;font-size:11px;color:#374151;margin-bottom:6px">${label}</p>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${photos.map(url => `<img src="${url}" style="width:120px;height:90px;object-fit:cover;border:1px solid #e5e7eb;border-radius:4px" />`).join('')}
        </div></div>`;
    };

    const readingsHtml = () => {
      if ((sheet.type === 'clima' || sheet.type === 'refrigeracion') && sheet.readings_climate) {
        const r = sheet.readings_climate;
        return `<table style="width:100%;border-collapse:collapse;font-size:10px;margin-top:8px">
          <tr style="background:#f0f9ff"><th colspan="4" style="padding:4px 6px;text-align:left;color:#0369a1">Lecturas Clima/Refrigeración</th></tr>
          <tr><td style="padding:3px 6px;border:1px solid #e5e7eb">P. Alta</td><td style="padding:3px 6px;border:1px solid #e5e7eb"><b>${medida(r.pressure_high, 'bar')}</b></td>
              <td style="padding:3px 6px;border:1px solid #e5e7eb">P. Baja</td><td style="padding:3px 6px;border:1px solid #e5e7eb"><b>${medida(r.pressure_low, 'bar')}</b></td></tr>
          <tr><td style="padding:3px 6px;border:1px solid #e5e7eb">T. Impulsión</td><td style="padding:3px 6px;border:1px solid #e5e7eb"><b>${medida(r.temp_impulsion, '°C')}</b></td>
              <td style="padding:3px 6px;border:1px solid #e5e7eb">T. Retorno</td><td style="padding:3px 6px;border:1px solid #e5e7eb"><b>${medida(r.temp_retorno, '°C')}</b></td></tr>
          <tr><td style="padding:3px 6px;border:1px solid #e5e7eb">Gas</td><td style="padding:3px 6px;border:1px solid #e5e7eb"><b>${r.refrigerant_type||'-'}</b></td>
              <td style="padding:3px 6px;border:1px solid #e5e7eb">Carga gas</td><td style="padding:3px 6px;border:1px solid #e5e7eb"><b>${medida(r.refrigerant_charge, 'kg')}</b></td></tr>
          <tr><td style="padding:3px 6px;border:1px solid #e5e7eb">Recalent.</td><td style="padding:3px 6px;border:1px solid #e5e7eb"><b>${medida(r.superheat, '°C')}</b></td>
              <td style="padding:3px 6px;border:1px solid #e5e7eb">Subenfr.</td><td style="padding:3px 6px;border:1px solid #e5e7eb"><b>${medida(r.subcooling, '°C')}</b></td></tr>
          <tr><td style="padding:3px 6px;border:1px solid #e5e7eb">GWP</td><td style="padding:3px 6px;border:1px solid #e5e7eb"><b>${medida(r.fgas_gwp)}</b></td>
              <td style="padding:3px 6px;border:1px solid #e5e7eb">CO₂ equiv.</td><td style="padding:3px 6px;border:1px solid #e5e7eb"><b>${medida(r.fgas_equivalent_co2, 't', 3)}</b></td></tr>
        </table>`;
      }
      if (sheet.type === 'electrico' && sheet.readings_electric) {
        const r = sheet.readings_electric;
        return `<table style="width:100%;border-collapse:collapse;font-size:10px;margin-top:8px">
          <tr style="background:#fefce8"><th colspan="4" style="padding:4px 6px;text-align:left;color:#a16207">Lecturas Eléctricas</th></tr>
          <tr><td style="padding:3px 6px;border:1px solid #e5e7eb">V L1</td><td style="padding:3px 6px;border:1px solid #e5e7eb"><b>${medida(r.voltage_l1, 'V')}</b></td>
              <td style="padding:3px 6px;border:1px solid #e5e7eb">V L2</td><td style="padding:3px 6px;border:1px solid #e5e7eb"><b>${medida(r.voltage_l2, 'V')}</b></td></tr>
          <tr><td style="padding:3px 6px;border:1px solid #e5e7eb">R. Tierra</td><td style="padding:3px 6px;border:1px solid #e5e7eb"><b>${medida(r.ground_resistance, 'Ω')}</b></td>
              <td style="padding:3px 6px;border:1px solid #e5e7eb">R. Aislam.</td><td style="padding:3px 6px;border:1px solid #e5e7eb"><b>${medida(r.insulation_resistance, 'MΩ')}</b></td></tr>
          <tr><td style="padding:3px 6px;border:1px solid #e5e7eb">Test dif.</td><td style="padding:3px 6px;border:1px solid #e5e7eb"><b>${r.differential_test?'✓':'✗'}</b></td>
              <td style="padding:3px 6px;border:1px solid #e5e7eb">Test térm.</td><td style="padding:3px 6px;border:1px solid #e5e7eb"><b>${r.thermal_test?'✓':'✗'}</b></td></tr>
        </table>`;
      }
      return '';
    };

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
      <title>Ficha Mantenimiento #${sheet.sheet_number}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:20px;max-width:800px;margin:0 auto;font-size:11px;color:#111}
        .header{display:flex;align-items:center;gap:16px;border-bottom:3px solid #1e3a5f;padding-bottom:10px;margin-bottom:14px}
        .header img{height:60px;object-fit:contain}
        .title{color:#1e3a5f;font-size:18px;font-weight:700}
        .section{margin-top:14px;padding:10px;background:#f8fafc;border-left:4px solid #0ea5e9;border-radius:4px}
        .section-title{font-weight:700;font-size:12px;color:#0369a1;margin-bottom:6px}
        .grid2{display:grid;grid-template-columns:1fr 1fr;gap:6px 16px}
        .field{font-size:10px}.field span{color:#6b7280}
        .sig-box{border:1px solid #e5e7eb;padding:8px;text-align:center;border-radius:4px}
        .sig-box img{height:60px;max-width:100%;object-fit:contain}
        .footer{margin-top:20px;padding-top:8px;border-top:1px solid #e5e7eb;font-size:8px;color:#9ca3af;text-align:center}
        @media print{@page{margin:15mm}}
      </style></head><body>
      <div class="header">
        ${company.logo_url ? `<img src="${company.logo_url}" alt="logo"/>` : ''}
        <div>
          <div class="title">${company.company_name || 'Empresa'}</div>
          <div style="font-size:10px;color:#6b7280">${company.address||''} ${company.city||''} | ${company.phone||''} | ${company.email||''}</div>
        </div>
        <div style="margin-left:auto;text-align:right">
          <div style="font-size:16px;font-weight:700;color:#0ea5e9">Ficha Mantenimiento</div>
          <div style="font-size:20px;font-weight:700">#${sheet.sheet_number}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Datos del Cliente</div>
        <div class="grid2">
          <div class="field"><span>Cliente: </span><b>${sheet.contact_name||'-'}</b></div>
          <div class="field"><span>NIF: </span>${contact.nif||'-'}</div>
          <div class="field"><span>Teléfono: </span>${contact.phone||'-'}</div>
          <div class="field"><span>Email: </span>${contact.email||'-'}</div>
          <div class="field"><span>Dirección: </span>${contact.address||''} ${contact.city||''}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Datos del Equipo</div>
        <div class="grid2">
          <div class="field"><span>Fecha: </span><b>${sheet.date}</b></div>
          <div class="field"><span>Tipo: </span><b>${sheet.type}</b></div>
          <div class="field"><span>Marca: </span>${sheet.equipment_brand||'-'}</div>
          <div class="field"><span>Modelo: </span>${sheet.equipment_model||'-'}</div>
          <div class="field"><span>Nº serie: </span>${sheet.serial_number||'-'}</div>
          ${bloqueCompresor(sheet)}
          <div class="field"><span>Ubicación: </span>${sheet.location||'-'}</div>
          <div class="field"><span>Técnico: </span><b>${sheet.technician_name||'-'}</b></div>
        </div>
      </div>

      ${readingsHtml()}

      ${sheet.observations ? `<div class="section"><div class="section-title">Observaciones</div><p style="font-size:10px">${sheet.observations}</p></div>` : ''}
      ${sheet.recommendations ? `<div class="section"><div class="section-title">Recomendaciones</div><p style="font-size:10px;color:#1d4ed8">${sheet.recommendations}</p></div>` : ''}

      ${photosHtml(sheet.photos_before, 'Fotos antes')}
      ${photosHtml(sheet.photos_after, 'Fotos después')}
      ${equipPhotos.length ? photosHtml(equipPhotos, 'Fotos equipo instalado (archivo cliente)') : ''}

      ${(sheet.signature_technician || sheet.signature_client) ? `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px">
        ${sheet.signature_technician ? `<div class="sig-box"><img src="${sheet.signature_technician}" /><p style="font-size:9px;color:#6b7280;margin-top:4px">Técnico: ${sheet.technician_name||''}</p></div>` : '<div></div>'}
        ${sheet.signature_client ? `<div class="sig-box"><img src="${sheet.signature_client}" /><p style="font-size:9px;color:#6b7280;margin-top:4px">Cliente: ${sheet.contact_name||''}</p></div>` : ''}
      </div>` : ''}

      <div class="footer">Documento generado el ${new Date().toLocaleDateString('es-ES')} — ${company.company_name||''} | NIF: ${company.nif||''}</div>
    </body></html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 600);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fichas de Mantenimiento</h1>
        <Button className="bg-cyan-600" onClick={() => { setEditing(null); setForm({ ...EMPTY_FORM, sheet_number: getNextAvailableNumber(sheets.map(x => x.sheet_number || '')) }); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />Nueva ficha
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={() => {}}>
        <DialogContent className="max-w-5xl w-[98vw] max-h-[98vh] overflow-y-auto" onPointerDownOutside={e => e.preventDefault()} onInteractOutside={e => e.preventDefault()}>
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>{editing ? 'Editar' : 'Nueva'} ficha de mantenimiento</DialogTitle>
                <Button size="sm" variant="ghost" onClick={() => { setDialogOpen(false); setEditing(null); setForm({ ...EMPTY_FORM, sheet_number: getNextAvailableNumber(sheets.map(x => x.sheet_number || '')) }); }} className="text-gray-400 hover:text-gray-600">✕</Button>
              </div>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Nº ficha" value={form.sheet_number} onChange={e => setForm({ ...form, sheet_number: e.target.value })} />
                <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <BuscadorCliente
                contacts={contacts}
                value={form.contact_id}
                onValueChange={v => {
                const c = contacts.find(co => co.id === v);
                setForm({ ...form, contact_id: v, contact_name: c ? `${c.name} ${c.surname || ''}` : '' });
              }}
                placeholder="Cliente"
              />
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Marca" value={form.equipment_brand} onChange={e => setForm({ ...form, equipment_brand: e.target.value })} />
                <Input placeholder="Modelo" value={form.equipment_model} onChange={e => setForm({ ...form, equipment_model: e.target.value })} />
                <Input placeholder="Nº serie" value={form.serial_number} onChange={e => setForm({ ...form, serial_number: e.target.value })} />
              </div>

              {/* Datos de la placa del compresor. Se copian tal cual de la
                  etiqueta: cada cosa en su casilla, para que salgan ordenados
                  en la hoja y se puedan buscar después. */}
              <div className="rounded-lg border border-slate-200 p-3 space-y-2" data-prueba="datos-compresor">
                <p className="text-sm font-semibold text-slate-700">🔧 Datos del compresor</p>
                <p className="text-xs text-slate-500">
                  Cópialos de la placa. Lo que no sepas, déjalo en blanco: no hace falta rellenarlo todo.
                </p>
                {/* Rellenarlos sin teclear: pegando la ficha del fabricante o
                    deduciéndolos de la referencia. */}
                <BuscarFichaTecnica form={form} setForm={setForm} />
                {/* Y guardarse la documentación del fabricante en Manuales,
                    en la carpeta de su marca, para consultarla luego. */}
                <GuardarDocumentacion
                  marca={form.compressor_brand || form.equipment_brand}
                  modelo={form.equipment_model}
                  referencia={form.compressor_ref}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Input placeholder="Referencia completa (ej: FH4518Y-XC3A)" value={form.compressor_ref}
                    onChange={e => setForm({ ...form, compressor_ref: e.target.value })} />
                  <Input placeholder="Marca (ej: FH2)" value={form.compressor_brand}
                    onChange={e => setForm({ ...form, compressor_brand: e.target.value })} />
                  <Input placeholder="Aplicación (ej: HBP, MBP, LBP)" value={form.compressor_application}
                    onChange={e => setForm({ ...form, compressor_application: e.target.value })} />
                  <Input placeholder="Alimentación (ej: 220-240V 1PH 50Hz)" value={form.compressor_supply}
                    onChange={e => setForm({ ...form, compressor_supply: e.target.value })} />
                  <Input placeholder="Refrigerantes (ej: R-134a, R-513A)" value={form.compressor_refrigerants}
                    onChange={e => setForm({ ...form, compressor_refrigerants: e.target.value })} />
                  <Input placeholder="Tecnología (ej: Recíproco, Scroll)" value={form.compressor_technology}
                    onChange={e => setForm({ ...form, compressor_technology: e.target.value })} />
                  <Input placeholder="Potencia (CV / HP)" value={form.compressor_power_hp}
                    onChange={e => setForm({ ...form, compressor_power_hp: e.target.value })} />
                  <Input placeholder="Otros datos de la placa" value={form.compressor_notes}
                    onChange={e => setForm({ ...form, compressor_notes: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Ubicación" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                <TechnicianSelect
                  value={form.technician_name}
                  onChange={v => setForm({ ...form, technician_name: v })}
                  placeholder="Seleccionar técnico"
                />
              </div>

              {/* Climate readings */}
              {(form.type === 'clima' || form.type === 'refrigeracion') && (
                <div className="bg-blue-50 p-3 rounded-lg space-y-2">
                  <p className="font-medium text-sm text-blue-700">Lecturas Clima / Refrigeración</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[['pressure_high','P. Alta (bar)'],['pressure_low','P. Baja (bar)'],['voltage','Voltaje (V)'],['temp_impulsion','T. Impulsión °C'],['temp_retorno','T. Retorno °C'],['temp_exterior','T. Exterior °C'],['amperage_compressor','A. Compresor'],['amperage_fan','A. Ventilador'],['superheat','Recalent. °C'],['subcooling','Subenfr. °C'],['refrigerant_charge','Carga gas (kg)']].map(([f,l]) => (
                      <div key={f}><label className="text-[10px] text-gray-500">{l}</label><NumberField value={form.readings_climate[f]} onChange={v => updateClimate(f, v)} /></div>
                    ))}
                    <div>
                      <label className="text-[10px] text-gray-500">Tipo gas</label>
                      <Select value={form.readings_climate.refrigerant_type} onValueChange={v => updateClimate('refrigerant_type', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.keys(FGAS_GWP).map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  {/* F-Gas section */}
                  <div className="bg-orange-50 border border-orange-200 rounded p-2 mt-2">
                    <p className="text-xs font-semibold text-orange-700 mb-1">🌿 Registro F-Gas (Reglamento (UE) 2024/573)</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div><span className="text-gray-500">Gas:</span> <strong>{form.readings_climate.refrigerant_type}</strong></div>
                      <div><span className="text-gray-500">GWP:</span> <strong>{form.readings_climate.fgas_gwp || FGAS_GWP[form.readings_climate.refrigerant_type] || '-'}</strong></div>
                      <div><span className="text-gray-500">CO₂ equiv.:</span> <strong>{(form.readings_climate.fgas_equivalent_co2 || 0).toFixed(3)} t</strong></div>
                    </div>
                    <p className="text-[10px] text-orange-600 mt-1">
                      {(form.readings_climate.fgas_equivalent_co2 || 0) >= 5
                        ? '⚠️ Supera 5 t CO₂eq. — Requiere certificado F-Gas y registro obligatorio'
                        : (form.readings_climate.fgas_equivalent_co2 || 0) >= 1
                        ? '⚠️ Supera 1 t CO₂eq. — Verificación anual requerida'
                        : '✅ Por debajo de umbrales de inspección obligatoria'}
                    </p>
                  </div>
                </div>
              )}

              {/* Electric readings */}
              {form.type === 'electrico' && (
                <div className="bg-yellow-50 p-3 rounded-lg space-y-2">
                  <p className="font-medium text-sm text-yellow-700">Lecturas Eléctricas</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[['voltage_l1','V L1'],['voltage_l2','V L2'],['voltage_l3','V L3'],['amperage_l1','A L1'],['amperage_l2','A L2'],['amperage_l3','A L3'],['power_factor','Factor potencia'],['ground_resistance','R. Tierra (Ω)'],['insulation_resistance','R. Aislam. (MΩ)']].map(([f,l]) => (
                      <div key={f}><label className="text-[10px] text-gray-500">{l}</label><NumberField value={form.readings_electric[f]} onChange={v => updateElectric(f, v)} /></div>
                    ))}
                  </div>
                  <div className="flex gap-4 text-sm mt-1">
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.readings_electric.differential_test} onChange={e => updateElectric('differential_test', e.target.checked)} />Test diferencial ✓</label>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.readings_electric.thermal_test} onChange={e => updateElectric('thermal_test', e.target.checked)} />Test térmico ✓</label>
                  </div>
                </div>
              )}

              {/* Solar readings */}
              {form.type === 'solar' && (
                <div className="bg-amber-50 p-3 rounded-lg space-y-2">
                  <p className="font-medium text-sm text-amber-700">Lecturas Sistema Solar</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[['panel_voltage','V Panel'],['panel_current','A Panel'],['inverter_output_w','W Inversor'],['battery_level_pct','% Batería'],['production_kwh','kWh producidos']].map(([f,l]) => (
                      <div key={f}><label className="text-[10px] text-gray-500">{l}</label><NumberField value={form.readings_solar[f]} onChange={v => updateSolar(f, v)} /></div>
                    ))}
                    <div><label className="text-[10px] text-gray-500">Estado filtros</label><Input value={form.readings_solar.filter_state || ''} onChange={e => updateSolar('filter_state', e.target.value)} /></div>
                  </div>
                  <div className="flex gap-4 text-sm mt-1">
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.readings_solar.panel_cleaning} onChange={e => updateSolar('panel_cleaning', e.target.checked)} />Limpieza paneles ✓</label>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.readings_solar.connections_ok} onChange={e => updateSolar('connections_ok', e.target.checked)} />Conexiones OK ✓</label>
                  </div>
                </div>
              )}

              {/* Plumbing readings */}
              {form.type === 'fontaneria' && (
                <div className="bg-teal-50 p-3 rounded-lg space-y-2">
                  <p className="font-medium text-sm text-teal-700">Lecturas Fontanería</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[['water_pressure_bar','Presión (bar)'],['temp_acs','T. ACS (°C)'],['flow_lmin','Caudal (l/min)']].map(([f,l]) => (
                      <div key={f}><label className="text-[10px] text-gray-500">{l}</label><NumberField value={form.readings_plumbing[f]} onChange={v => updatePlumbing(f, v)} /></div>
                    ))}
                    <div><label className="text-[10px] text-gray-500">Estado filtros</label><Input value={form.readings_plumbing.filter_state || ''} onChange={e => updatePlumbing('filter_state', e.target.value)} /></div>
                  </div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.readings_plumbing.leaks_detected} onChange={e => updatePlumbing('leaks_detected', e.target.checked)} />Fugas detectadas</label>
                </div>
              )}

              {/* Hoja de inspección técnico-sanitaria (cámaras frigoríficas) */}
              {form.type === 'refrigeracion' && (
                <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/40 p-3 space-y-3">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4"
                      checked={!!form.inspeccion_sanitaria?.activa}
                      data-prueba="activar-hoja-sanitaria"
                      onChange={e => setForm({
                        ...form,
                        inspeccion_sanitaria: { ...fichaVacia(), ...form.inspeccion_sanitaria, activa: e.target.checked },
                      })}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-emerald-900">
                        🧊 Es una cámara frigorífica — añadir hoja de inspección técnico-sanitaria
                      </span>
                      <span className="mt-0.5 block text-xs text-emerald-800/80">
                        Genera una hoja aparte para Sanidad, con el estado de la cámara de un vistazo y
                        las fotos de este mismo día. Al guardar, la intervención queda apuntada en el
                        diario de reparaciones de esta cámara.
                      </span>
                    </span>
                  </label>

                  {form.inspeccion_sanitaria?.activa && (
                    <InspeccionSanitaria
                      ficha={form.inspeccion_sanitaria}
                      onChange={v => setForm({ ...form, inspeccion_sanitaria: v })}
                    />
                  )}
                </div>
              )}

              {/* General tasks */}
              {form.type === 'general' && (
                <Textarea placeholder="Tareas realizadas en mantenimiento general..." value={form.general_tasks} onChange={e => setForm({ ...form, general_tasks: e.target.value })} rows={4} />
              )}

              <Textarea placeholder="Observaciones" value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} />
              <Textarea placeholder="Recomendaciones" value={form.recommendations} onChange={e => setForm({ ...form, recommendations: e.target.value })} />

              <PhotoGallery photos={form.photos_before} onChange={p => setForm({ ...form, photos_before: p })} label="Fotos antes" maxPhotos={200} />
              <PhotoGallery photos={form.photos_after} onChange={p => setForm({ ...form, photos_after: p })} label="Fotos después" maxPhotos={200} />
              {(form.type === 'clima' || form.type === 'refrigeracion') && <>
                <PhotoGallery photos={form.photos_evaporator_plate} onChange={p => setForm({ ...form, photos_evaporator_plate: p })} label="Placa evaporadora" maxPhotos={200} />
                <PhotoGallery photos={form.photos_condenser_plate} onChange={p => setForm({ ...form, photos_condenser_plate: p })} label="Placa condensadora" maxPhotos={200} />
              </>}

              {/* Signatures — solo aparece cuando hay datos suficientes en la hoja */}
              {(form.contact_name || form.equipment_brand || form.equipment_model || form.observations || form.technician_name) && (
              <div className="border rounded-lg p-3 space-y-2">
                <p className="font-medium text-sm">Firmas</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Técnico: {form.technician_name}</p>
                    <SignaturePad
                      value={form.signature_technician}
                      existingDatetime={form.sign_datetime_technician}
                      onSave={(sig, dt) => setForm({ ...form, signature_technician: sig, sign_datetime_technician: dt })}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Cliente: {form.contact_name}</p>
                    <SignaturePad
                      value={form.signature_client}
                      existingDatetime={form.sign_datetime_client}
                      onSave={(sig, dt) => setForm({ ...form, signature_client: sig, sign_datetime_client: dt })}
                    />
                  </div>
                </div>
              </div>
              )}

              <Button onClick={handleSave} className="w-full bg-cyan-600">{editing ? 'Actualizar' : 'Guardar ficha'}</Button>
            </div>
        </DialogContent>
      </Dialog>

      {/* Preview */}
      <Dialog open={!!preview} onOpenChange={() => {}}>
        <DialogContent className="max-w-5xl w-[98vw] max-h-[98vh] overflow-y-auto" onPointerDownOutside={e => e.preventDefault()} onInteractOutside={e => e.preventDefault()}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Vista previa</DialogTitle>
              <button className="text-gray-400 hover:text-gray-700 p-1 rounded" onClick={() => setPreview(null)}>✕</button>
            </div>
          </DialogHeader>
          {preview && (
            <div ref={printRef}>
              <CompanyHeader className="mb-3" />
              <h2 className="font-bold text-lg">Ficha Mantenimiento #{preview.sheet_number}</h2>
              <Badge className={`${typeColor[preview.type] || ''} mb-2`}>{preview.type}</Badge>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p><span className="text-gray-500">Cliente:</span> {preview.contact_name}</p>
                <p><span className="text-gray-500">Fecha:</span> {preview.date}</p>
                <p><span className="text-gray-500">Equipo:</span> {preview.equipment_brand} {preview.equipment_model}</p>
                <p><span className="text-gray-500">Nº serie:</span> {preview.serial_number}</p>
                <p><span className="text-gray-500">Ubicación:</span> {preview.location}</p>
                <p><span className="text-gray-500">Técnico:</span> {preview.technician_name}</p>
              </div>
              {preview.observations && <p className="text-sm mt-3"><strong>Obs.:</strong> {preview.observations}</p>}
              {preview.recommendations && <p className="text-sm mt-1 text-blue-700"><strong>Recom.:</strong> {preview.recommendations}</p>}
              {(preview.signature_technician || preview.signature_client) && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {preview.signature_technician && (
                    <div className="border rounded p-2 text-center">
                      <img src={preview.signature_technician} alt="Firma técnico" className="h-16 mx-auto" />
                      <p className="text-xs text-gray-500 mt-1">Técnico: {preview.technician_name}</p>
                    </div>
                  )}
                  {preview.signature_client && (
                    <div className="border rounded p-2 text-center">
                      <img src={preview.signature_client} alt="Firma cliente" className="h-16 mx-auto" />
                      <p className="text-xs text-gray-500 mt-1">Cliente: {preview.contact_name}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <PrintButton contentRef={printRef} title={`Mantenimiento ${preview?.sheet_number}`} />
            <Button variant="outline" onClick={() => generatePDF(preview)} className="gap-2">
              <FileDown className="w-4 h-4" /> PDF completo con fotos
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-2">
        {sheets.map(s => (
          <Card key={s.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <ClipboardList className="w-5 h-5 text-cyan-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">#{s.sheet_number} — {s.contact_name}</p>
                  <p className="text-xs text-gray-500">{s.date} | {s.type} | {s.equipment_brand} {s.equipment_model}</p>
                  {s.technician_name && <p className="text-xs text-blue-600 mt-0.5">👷 {s.technician_name}</p>}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <Badge className={typeColor[s.type] || 'bg-gray-100 text-gray-700'}>{s.type}</Badge>
                </div>
              </div>
              <div className="flex gap-1 mt-2 border-t pt-2 flex-wrap">
                <button onClick={() => handleEdit(s)} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-cyan-50 text-cyan-700 hover:bg-cyan-100">
                  <Eye className="w-3 h-3" /> Ver/Editar
                </button>
                <button onClick={() => generatePDF(s)} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                  <FileDown className="w-3 h-3" /> PDF
                </button>
                {hayAlgoContestado(s.inspeccion_sanitaria) && (
                  <button
                    onClick={() => imprimirHojaSanitaria(s)}
                    data-prueba="hoja-sanitaria"
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                    <FileDown className="w-3 h-3" /> Hoja Sanidad
                  </button>
                )}
                <button
                  onClick={() => {
                    const phone = s.contact_phone?.replace(/\D/g,'') || '';
                    const msg = encodeURIComponent(`Ficha Mantenimiento #${s.sheet_number}\nCliente: ${s.contact_name}\nFecha: ${s.date}\nTipo: ${s.type}\nEquipo: ${s.equipment_brand} ${s.equipment_model}\nObservaciones: ${s.observations || '-'}`);
                    window.open(phone ? `https://wa.me/34${phone}?text=${msg}` : `https://wa.me/?text=${msg}`, '_blank');
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-50 text-green-700 hover:bg-green-100">
                  <Phone className="w-3 h-3" /> WA
                </button>
                <button onClick={() => { base44.entities.MaintenanceSheet.delete(s.id).then(() => setSheets(sheets.filter(x => x.id !== s.id))); }} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-50 text-red-700 hover:bg-red-100 ml-auto">
                  <Trash2 className="w-3 h-3" /> Eliminar
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
        {sheets.length === 0 && <p className="text-center text-gray-400 py-8">No hay fichas de mantenimiento</p>}
      </div>
    </div>
  );
}