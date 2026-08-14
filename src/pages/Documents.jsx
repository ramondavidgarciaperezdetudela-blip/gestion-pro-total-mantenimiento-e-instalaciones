import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus, Search, FileText, Trash2, Edit, ShoppingCart, Copy,
  ChevronDown, ChevronUp, Save, Phone, Mail, AlertCircle, CheckCircle, Clock, Printer, FileDown, Bell, X, Link, Send, MessageCircle, XCircle, Layers, Loader2 } from
'lucide-react';
import QRCodeLib from 'qrcode';
import SupplierProductSearch from '../components/SupplierProductSearch';
import PriceItemSelector from '../components/PriceItemSelector';
import AdvancedPriceSearch from '../components/AdvancedPriceSearch';
import MaterialAutocomplete from '../components/MaterialAutocomplete';
import MaterialsExportButton from '../components/MaterialsExportButton';
import { format, startOfMonth } from 'date-fns';
import { getNextAvailableNumber } from '../components/autoNumber';
import CompanyHeader from '../components/CompanyHeader';
import SignatureCanvas from '../components/SignaturePad';

const DOC_TYPES = ['factura', 'presupuesto', 'recibo'];
const STATUSES = ['borrador', 'enviado', 'pagado', 'vencido', 'cancelado'];
const WORK_TYPES = ['electrico', 'clima', 'refrigeracion_industrial', 'solar', 'otro'];

const STATUS_COLORS = {
  borrador: 'bg-gray-100 text-gray-600',
  enviado: 'bg-blue-100 text-blue-700',
  pagado: 'bg-green-100 text-green-700',
  vencido: 'bg-red-100 text-red-700',
  cancelado: 'bg-orange-100 text-orange-700'
};

const STATUS_ICONS = {
  borrador: Clock,
  enviado: FileText,
  pagado: CheckCircle,
  vencido: AlertCircle,
  cancelado: AlertCircle
};

const NORMATIVE_MAP = {
  electrico: 'REBT (Reglamento Electrotécnico de Baja Tensión), RD 842/2002',
  clima: 'RITE (Reglamento de Instalaciones Térmicas en los Edificios), RD 1027/2007. F-Gas RD 115/2017',
  refrigeracion_industrial: 'Reglamento de Seguridad para Instalaciones Frigoríficas, F-Gas RD 115/2017',
  solar: 'CTE DB HE, RD 244/2019 Autoconsumo, REBT',
  otro: ''
};

const PAYMENT_TERMS = "Forma de pago: Máximo 3 pagos.\n1º Pago: 100% material + 50% mano de obra (al aceptar presupuesto)\n2º Pago: 25% mano de obra (al iniciar trabajos)\n3º Pago: 25% mano de obra restante (al finalizar)";

let _itemId = 0;
const newItem = () => ({ _id: ++_itemId, description: '', quantity: 1, unit_price: 0, discount: 0, total: 0 });

const EMPTY_FORM = {
  doc_type: 'presupuesto', doc_number: '', contact_id: '', contact_name: '', contact_nif: '', contact_address: '',
  date: format(new Date(), 'yyyy-MM-dd'), due_date: '', status: 'borrador', work_type: 'otro',
  items: [],  // Sin línea inicial — el usuario las añade manualmente o desde plantilla
  subtotal: 0, iva_rate: 21, iva_amount: 0, total: 0, observations: '', payment_terms: PAYMENT_TERMS, normative_references: ''
};

function recalculate(items, iva_rate) {
  const updatedItems = items.map((item) => ({
    ...item,
    total: (item.quantity || 0) * (item.unit_price || 0) * (1 - (item.discount || 0) / 100)
  }));
  const subtotal = updatedItems.reduce((sum, i) => sum + i.total, 0);
  const iva_amount = subtotal * (iva_rate / 100);
  return { items: updatedItems, subtotal, iva_amount, total: subtotal + iva_amount };
}

export default function Documents() {
  const urlParams = new URLSearchParams(window.location.search);
  const preContactId = urlParams.get('contact_id');
  const preType = urlParams.get('type');
  const preEditId = urlParams.get('edit');

  const [docs, setDocs] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [lineTemplates, setLineTemplates] = useState([]);
  const [showLineTemplates, setShowLineTemplates] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState(preType || 'all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterWorkType, setFilterWorkType] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  // Ajustes de impresión/PDF (A4): margen y escala para cuadrar en la impresora
  const [pdfMargin, setPdfMargin] = useState(() => { try { return parseInt(localStorage.getItem('gpt_pdf_margin')) || 10; } catch { return 10; } });
  const [pdfScale, setPdfScale] = useState(() => { try { return parseInt(localStorage.getItem('gpt_pdf_scale')) || 100; } catch { return 100; } });
  const [supplierSearchOpen, setSupplierSearchOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const autoSaveTimer = useRef(null);
  const [form, setForm] = useState({ ...EMPTY_FORM, doc_type: preType || 'presupuesto', contact_id: preContactId || '' });
  const [activeTab, setActiveTab] = useState('all'); // all | facturas | presupuestos
  const printRef = useRef(null);

  // Suscripción en tiempo real: si el cliente firma, actualiza automáticamente
  useEffect(() => {
    const unsubscribe = base44.entities.Invoice.subscribe((event) => {
      if (event.type === 'update' && event.data?.signature_client) {
        setDocs(prev => prev.map(d => d.id === event.id ? { ...d, ...event.data } : d));
        setPreviewDoc(prev => prev && prev.id === event.id ? { ...prev, ...event.data } : prev);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    Promise.all([
    base44.entities.Invoice.list('-date', 500),
    base44.entities.Contact.list('name', 500),
    base44.entities.DocumentTemplate.list('name', 50),
    base44.entities.LineTemplate.list('name', 100)]
    ).then(([d, c, t, lt]) => {
      setDocs(d);
      setContacts(c);
      setTemplates(t);
      setLineTemplates(lt);
      if (preContactId && preType) {
        const contact = c.find((co) => co.id === preContactId);
        if (contact) {
          const tpl = t.find((tp) => tp.doc_type === preType && tp.is_default);
          openNew(preType, contact, tpl);
        }
      } else if (preEditId) {
        const docToEdit = d.find(doc => doc.id === preEditId);
        if (docToEdit) {
          // Abre directamente en modo edición
          const draft = (() => { try { const r = localStorage.getItem('doc_draft'); return r ? JSON.parse(r) : null; } catch { return null; } })();
          if (draft && draft.editing === docToEdit.id) {
            setEditing(docToEdit);
            setForm(draft.form);
          } else {
            const items = (docToEdit.items?.length ? docToEdit.items : [newItem()]).map((it, idx) => ({ _id: idx, ...it }));
            setEditing(docToEdit);
            setForm({ ...EMPTY_FORM, ...docToEdit, items });
          }
          setDialogOpen(true);
        }
      }
    });
  }, []);

  // Autoguardado en localStorage cada vez que cambia el formulario
  useEffect(() => {
    if (!dialogOpen) return;
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      localStorage.setItem('doc_draft', JSON.stringify({ form, editing: editing?.id || null }));
      setAutoSaved(true);
      setTimeout(() => setAutoSaved(false), 1500);
    }, 800);
    return () => clearTimeout(autoSaveTimer.current);
  }, [form, dialogOpen]);

  // Al abrir el dialog, intentar restaurar borrador si existe y coincide
  const restoreDraft = useCallback(() => {
    try {
      const raw = localStorage.getItem('doc_draft');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  }, []);

  const clearDraft = useCallback(() => {
    localStorage.removeItem('doc_draft');
  }, []);

  const openNew = (docType = 'presupuesto', contact = null, tpl = null) => {
    const baseForm = { ...EMPTY_FORM, doc_type: docType };
    if (tpl) {baseForm.iva_rate = tpl.iva_rate || 21;baseForm.observations = tpl.notes_template || '';}
    if (contact) {
      baseForm.contact_id = contact.id;
      baseForm.contact_name = `${contact.name} ${contact.surname || ''}`.trim();
      baseForm.contact_nif = contact.nif || '';
      baseForm.contact_address = `${contact.address || ''}, ${contact.city || ''} ${contact.postal_code || ''} ${contact.province || ''}`.trim();
    }
    // Auto-numerar por tipo: cada tipo tiene su propia secuencia
    const sameType = docs.filter((d) => d.doc_type === docType).map((d) => d.doc_number || '');
    baseForm.doc_number = getNextAvailableNumber(sameType);
    // Comprobar si hay borrador para nuevo doc del mismo tipo
    const draft = restoreDraft();
    if (draft && !draft.editing && draft.form?.doc_type === docType) {
      setForm(draft.form);
    } else {
      setForm(baseForm);
      clearDraft();
    }
    setEditing(null);setDialogOpen(true);setShowAdvanced(false);
  };

  // Cambio directo de campo de item (string mientras escribe, parseo al blur)
  const handleItemChange = useCallback((index, field, value) => {
    setForm((prev) => {
      const newItems = prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item);
      return { ...prev, ...recalculate(newItems, prev.iva_rate) };
    });
  }, []);

  const handleItemLocalChange = useCallback((index, field, strValue) => {
    // Guarda el string tal cual para que el input no bloquee
    setForm((prev) => {
      const newItems = prev.items.map((item, i) => i === index ? { ...item, [field]: strValue } : item);
      // No recalcular mientras escribe para no interrumpir
      return { ...prev, items: newItems };
    });
  }, []);

  const handleItemBlur = useCallback((index, field) => {
    setForm((prev) => {
      const newItems = prev.items.map((item, i) => {
        if (i !== index) return item;
        const parsed = parseFloat(String(item[field]).replace(',', '.')) || 0;
        return { ...item, [field]: parsed };
      });
      return { ...prev, ...recalculate(newItems, prev.iva_rate) };
    });
  }, []);

  const getItemDisplayValue = useCallback((index, field, formValue) => formValue ?? '', []);

  // ── Añadir línea buscando por REFERENCIA de proveedor ──────────────────────
  const [refBusca, setRefBusca] = useState('');
  const [refBuscando, setRefBuscando] = useState(false);
  const [refMsg, setRefMsg] = useState('');
  const addLineaPorReferencia = useCallback(async () => {
    const ref = refBusca.trim();
    if (!ref) return;
    setRefBuscando(true); setRefMsg('');
    try {
      let found = null;
      // 1) Tarifas de proveedor por código exacto
      const m = await base44.entities.SupplierPrice.filter({ product_code: ref }).catch(() => []);
      if (m && m.length) found = { description: m[0].product_name, unit_price: m[0].sale_price || m[0].cost_price || 0 };
      // 2) Artículos de precio por referencia de proveedor
      if (!found) {
        const p = await base44.entities.PriceItem.filter({ supplier_ref: ref }).catch(() => []);
        if (p && p.length) found = { description: p[0].description, unit_price: p[0].unit_price || 0 };
      }
      if (found) {
        setForm((prev) => {
          const newItems = [...prev.items, { _id: ++_itemId, description: found.description, quantity: 1, unit_price: found.unit_price, discount: 0, total: found.unit_price }];
          return { ...prev, ...recalculate(newItems, prev.iva_rate) };
        });
        setRefBusca('');
        setRefMsg('✅ Añadido: ' + found.description);
      } else {
        setRefMsg('⚠ No se encontró ninguna referencia "' + ref + '"');
      }
    } catch {
      setRefMsg('⚠ Error al buscar la referencia');
    }
    setRefBuscando(false);
  }, [refBusca]);

  const addItem = useCallback(() => {
    setForm((prev) => ({ ...prev, items: [...prev.items, newItem()] }));
  }, []);

  const removeItem = useCallback((i) => {
    setForm((prev) => {
      const newItems = prev.items.filter((_, idx) => idx !== i);
      return { ...prev, ...recalculate(newItems, prev.iva_rate) };
    });
  }, []);

  const addItemFromSupplier = useCallback((item) => {
    setForm((prev) => {
      const newItems = [...prev.items, item];
      return { ...prev, ...recalculate(newItems, prev.iva_rate) };
    });
  }, []);

  const handleContactSelect = useCallback((contactId) => {
    setForm((prev) => {
      const c = contacts.find((co) => co.id === contactId);
      if (!c) return prev;
      return {
        ...prev, contact_id: contactId,
        contact_name: `${c.name} ${c.surname || ''}`.trim(),
        contact_nif: c.nif || '',
        contact_address: `${c.address || ''}, ${c.city || ''} ${c.postal_code || ''}`.trim()
      };
    });
  }, [contacts]);

  const handleIvaChange = useCallback((val) => {
    setForm((prev) => {
      const iva_rate = parseFloat(val) || 0;
      return { ...prev, iva_rate, ...recalculate(prev.items, iva_rate) };
    });
  }, []);

  const handleWorkTypeChange = useCallback((wt) => {
    setForm((prev) => ({ ...prev, work_type: wt, normative_references: NORMATIVE_MAP[wt] || '' }));
  }, []);

  // Limpia el formulario antes de enviarlo a la API:
  //  - quita el _id interno de cada línea (sólo para React) y los campos
  //    built-in del entity (id, created_date, updated_date, created_by_id)
  //  - fuerza tipos numéricos en las líneas (quantity, unit_price, discount,
  //    total) para que el valor que se está escribiendo al pulsar "Guardar"
  //    (aún como string) se envíe como número y no rompa la validación.
  const sanitizeForm = (f) => {
    const { id, created_date, updated_date, created_by_id, ...rest } = f || {};
    const toNum = (v) => {
      const n = parseFloat(String(v ?? 0).replace(',', '.'));
      return isFinite(n) ? n : 0;
    };
    const items = (rest.items || []).map((it) => ({
      description: it.description ?? '',
      quantity: toNum(it.quantity),
      unit_price: toNum(it.unit_price),
      discount: toNum(it.discount),
      total: toNum(it.total),
    }));
    return { ...rest, items };
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = sanitizeForm(form);
    const docLabel = form.doc_type === 'factura' ? 'Factura' : form.doc_type === 'presupuesto' ? 'Presupuesto' : 'Recibo';
    let savedDoc = null;
    const wasEditing = !!editing;
    const editingId = editing?.id;
    if (editing) {
      savedDoc = await base44.entities.Invoice.update(editing.id, payload);
    } else {
      savedDoc = await base44.entities.Invoice.create(payload);
      if (form.contact_id) {
        await base44.entities.ClientDocument.create({
          contact_id: form.contact_id, contact_name: form.contact_name,
          title: `${docLabel} ${form.doc_number || ''}`,
          doc_type: form.doc_type, date: form.date,
          description: `Total: ${form.total?.toFixed(2)} € | Estado: ${form.status}`
        });
      }
    }
    setSaving(false);
    clearDraft();
    setDialogOpen(false);setEditing(null);
    const d = await base44.entities.Invoice.list('-date', 500);
    setDocs(d);
    // Abrir la vista previa del documento guardado para poder enviarlo,
    // imprimirlo o exportarlo a PDF al momento (y en cualquier momento).
    const savedId = savedDoc?.id || editingId;
    const fresh = (savedId && d.find(x => x.id === savedId)) || savedDoc || (!wasEditing ? d[0] : null);
    if (fresh) setPreviewDoc(fresh);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este documento?')) return;
    await base44.entities.Invoice.delete(id);
    setDocs(docs.filter((d) => d.id !== id));
  };

  const handleDuplicate = async (doc) => {
    const { id, created_date, updated_date, ...rest } = doc;
    await base44.entities.Invoice.create({ ...rest, doc_number: `${rest.doc_number}-COPIA`, status: 'borrador', date: format(new Date(), 'yyyy-MM-dd') });
    const d = await base44.entities.Invoice.list('-date', 500);
    setDocs(d);
  };

  const handleEdit = (doc) => {
    setEditing(doc);
    // Comprobar si hay borrador para este mismo documento
    const draft = restoreDraft();
    if (draft && draft.editing === doc.id) {
      setForm(draft.form);
    } else {
      // Al editar, mantener líneas tal cual están (sin añadir línea vacía)
      const items = (doc.items || []).map((it, idx) => ({ _id: idx, ...it }));
      setForm({ ...EMPTY_FORM, ...doc, items });
      clearDraft();
    }
    setDialogOpen(true);
  };

  const handleStatusChange = async (doc, newStatus) => {
    await base44.entities.Invoice.update(doc.id, { status: newStatus });
    setDocs(docs.map((d) => d.id === doc.id ? { ...d, status: newStatus } : d));
  };

  const getSignLink = (doc, method = 'web') => `${window.location.origin}/presupuesto-publico?id=${doc.id}&method=${method}`;

  const sendWhatsApp = (doc) => {
    const c = contacts.find((x) => x.id === doc.contact_id);
    const phone = c?.phone?.replace(/[^0-9]/g, '') || '';
    const msg = encodeURIComponent(`*${doc.doc_type?.toUpperCase()} Nº${doc.doc_number}*\nCliente: ${doc.contact_name}\nFecha: ${doc.date}\nTotal: ${doc.total?.toFixed(2)} €\nEstado: ${doc.status}`);
    window.open(phone ? `https://wa.me/34${phone}?text=${msg}` : `https://wa.me/?text=${msg}`, '_blank');
  };

  const sendEmail = (doc) => {
    const c = contacts.find((x) => x.id === doc.contact_id);
    const email = c?.email || '';
    const subject = encodeURIComponent(`${doc.doc_type?.toUpperCase()} Nº${doc.doc_number}`);
    const body = encodeURIComponent(`Estimado/a ${doc.contact_name},\n\nAdjunto ${doc.doc_type} Nº${doc.doc_number} de fecha ${doc.date}.\nTotal: ${doc.total?.toFixed(2)} €\n\nQuedamos a su disposición.`);
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
  };

  const sendReminderWhatsApp = (doc) => {
    const c = contacts.find((x) => x.id === doc.contact_id);
    const phone = c?.phone?.replace(/[^0-9]/g, '') || '';
    const diasPendiente = Math.floor((new Date() - new Date(doc.date)) / (1000 * 60 * 60 * 24));
    const link = getSignLink(doc);
    const msg = encodeURIComponent(
      `Estimado/a *${doc.contact_name}*,\n\nLe recordamos que tiene pendiente de respuesta nuestro *PRESUPUESTO Nº${doc.doc_number}* de fecha ${doc.date} por importe de *${doc.total?.toFixed(2)} €*.\n\nHace ${diasPendiente} días que está pendiente de confirmación.\n\nPuede *ACEPTAR o RECHAZAR* el presupuesto y firmarlo digitalmente aquí:\n${link}\n\nQuedamos a su disposición para cualquier consulta.`
    );
    window.open(phone ? `https://wa.me/34${phone}?text=${msg}` : `https://wa.me/?text=${msg}`, '_blank');
  };

  const sendSignLink = (doc, via) => {
    const c = contacts.find((x) => x.id === doc.contact_id);
    const link = getSignLink(doc, via);
    const isAlreadySent = !!doc.signature_client || doc.status === 'enviado';
    const avisoReenvio = isAlreadySent
      ? `\n\n⚠️ *AVISO: Este presupuesto ya fue enviado anteriormente. Este enlace es únicamente para aceptarlo o rechazarlo digitalmente y dejar constancia firmada.*`
      : '';

    if (via === 'whatsapp') {
      const phone = c?.phone?.replace(/[^0-9]/g, '') || '';
      const msg = encodeURIComponent(
        `Estimado/a *${doc.contact_name}*,\n\nLe enviamos el enlace para *ACEPTAR o RECHAZAR* el presupuesto con su firma digital:\n\n📄 *${doc.doc_type?.toUpperCase()} Nº${doc.doc_number}*\n💶 Total: *${doc.total?.toFixed(2)} €*\n📅 Fecha: ${doc.date}\n\n🔗 *Firmar aquí:*\n${link}${avisoReenvio}`
      );
      window.open(phone ? `https://wa.me/34${phone}?text=${msg}` : `https://wa.me/?text=${msg}`, '_blank');
    } else {
      const email = c?.email || '';
      const subject = encodeURIComponent(`Solicitud de firma - ${doc.doc_type?.toUpperCase()} Nº${doc.doc_number}`);
      const avisoEmail = isAlreadySent
        ? `\n\n⚠️ AVISO: Este presupuesto ya fue enviado anteriormente. Este enlace es únicamente para aceptarlo o rechazarlo digitalmente y dejar constancia firmada.`
        : '';
      const body = encodeURIComponent(
        `Estimado/a ${doc.contact_name},\n\nLe enviamos el enlace para ACEPTAR o RECHAZAR el presupuesto con su firma digital:\n\n${doc.doc_type?.toUpperCase()} Nº${doc.doc_number}\nTotal: ${doc.total?.toFixed(2)} €\nFecha: ${doc.date}\n\nFirmar aquí:\n${link}${avisoEmail}\n\nQuedamos a su disposición.`
      );
      window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
    }
  };

  const sendChangeOpinionLink = (doc, via) => {
    const c = contacts.find((x) => x.id === doc.contact_id);
    const presupuestoUrl = `${window.location.origin}/presupuesto-publico?id=${doc.id}&method=${via}`;

    if (via === 'whatsapp') {
      const phone = c?.phone?.replace(/[^0-9]/g, '') || '';
      const msg = encodeURIComponent(
        `📄 *PRESUPUESTO - Opción de cambio de opinión*\n\nHola *${doc.contact_name}*,\n\nTienes la opción de cambiar tu decisión anterior sobre el presupuesto *Nº${doc.doc_number}* por *${(doc.total || 0).toFixed(2)} €*.\n\nAccede aquí para revisar y actualizar tu respuesta:\n${presupuestoUrl}\n\nGracias`
      );
      window.open(phone ? `https://wa.me/34${phone}?text=${msg}` : `https://wa.me/?text=${msg}`, '_blank');
    } else {
      const email = c?.email || '';
      const subject = encodeURIComponent(`Opción de cambio de opinión - Presupuesto Nº${doc.doc_number}`);
      const body = encodeURIComponent(
        `Estimado/a ${doc.contact_name},\n\nTienes la opción de cambiar tu decisión anterior sobre el presupuesto Nº${doc.doc_number} por ${(doc.total || 0).toFixed(2)} €.\n\nAccede aquí para revisar y actualizar tu respuesta:\n${presupuestoUrl}\n\nGracias`
      );
      window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
    }
  };

  const sendReminderEmail = (doc) => {
    const c = contacts.find((x) => x.id === doc.contact_id);
    const email = c?.email || '';
    const diasPendiente = Math.floor((new Date() - new Date(doc.date)) / (1000 * 60 * 60 * 24));
    const link = getSignLink(doc);
    const subject = encodeURIComponent(`Recordatorio: Presupuesto Nº${doc.doc_number} pendiente de confirmación`);
    const body = encodeURIComponent(`Estimado/a ${doc.contact_name},\n\nLe recordamos que tiene pendiente de respuesta nuestro Presupuesto Nº${doc.doc_number} de fecha ${doc.date} por importe de ${doc.total?.toFixed(2)} €.\n\nHace ${diasPendiente} días que está pendiente de confirmación.\n\nPuede aceptar o rechazar el presupuesto y firmarlo digitalmente aquí:\n${link}\n\nQuedamos a su disposición para cualquier consulta.`);
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
  };

  // Presupuestos pendientes >7 días
  const presupuestosPendientes = docs.filter(d => {
    if (d.doc_type !== 'presupuesto') return false;
    if (!['borrador', 'enviado'].includes(d.status)) return false;
    const dias = Math.floor((new Date() - new Date(d.date)) / (1000 * 60 * 60 * 24));
    return dias > 7;
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  const [showPendientes, setShowPendientes] = useState(true);

  const exportPDF = async (doc) => {
    const csArr = await base44.entities.CompanySettings.list();
    const cs = csArr?.[0] || {};
    // QR de verificación del documento (abre la página pública de verificación).
    const base = (cs.public_app_url && String(cs.public_app_url).replace(/\/$/, '')) || window.location.origin;
    const verifyUrl = `${base}/verificar-documento?id=${doc.id}`;
    let verifyQR = '';
    try { verifyQR = await QRCodeLib.toDataURL(verifyUrl, { width: 220, margin: 1 }); } catch { verifyQR = ''; }
    const validezTxt = doc.verify_expires ? `Verificable hasta ${new Date(doc.verify_expires).toLocaleDateString('es-ES')}` : 'Verificable online';
    const verifyBoxHtml = verifyQR ? `
      <div style="margin-top:16px;display:flex;gap:12px;align-items:center;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;background:#f9fafb">
        <img src="${verifyQR}" width="72" height="72" style="border-radius:4px;background:#fff;padding:3px" />
        <div style="font-size:8px;color:#555;line-height:1.5">
          <div style="font-weight:700;color:#1e3a5f;font-size:10px">Verificación del documento</div>
          <div>Escanea el QR para comprobar su autenticidad y estado.</div>
          <div>Código: <b>${(doc.id||'').toString().slice(-10)}</b></div>
          <div>${validezTxt}</div>
        </div>
      </div>` : '';
    const hasDiscount = doc.items?.some(i => i.discount > 0);
    const itemsHtml = (doc.items || []).map((item, i) => `
      <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#fff'}">
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb">${item.description || ''}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center">${item.quantity}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right">${(item.unit_price||0).toFixed(2)} €</td>
        ${hasDiscount ? `<td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;color:#d97706">${item.discount > 0 ? item.discount + '%' : '-'}</td>` : ''}
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${(item.total||0).toFixed(2)} €</td>
      </tr>`).join('');
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${doc.doc_type?.toUpperCase()} ${doc.doc_number||''}</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:10px;color:#111;padding:20px;max-width:800px;margin:0 auto}
    .header{display:flex;align-items:flex-start;justify-content:space-between;border-bottom:2px solid #1e3a5f;padding-bottom:12px;margin-bottom:16px}
    .company-name{font-size:14px;font-weight:700;color:#1e3a5f}.doc-title{font-size:20px;font-weight:800;text-transform:uppercase;color:#1e3a5f}
    .client-box{background:#f0f4ff;border-left:4px solid #1e3a5f;padding:10px 14px;margin:12px 0;border-radius:4px}
    table{width:100%;border-collapse:collapse;margin:12px 0;font-size:9px}th{background:#1e3a5f;color:white;padding:7px 8px;text-align:left}
    th.right{text-align:right}th.center{text-align:center}
    .totals{text-align:right;padding:8px 0;border-top:2px solid #e5e7eb;margin-top:8px}
    .footer{margin-top:20px;border-top:1px solid #e5e7eb;padding-top:8px;font-size:8px;color:#aaa;text-align:center}
    .logo{max-height:50px;max-width:120px;object-fit:contain}
    body{zoom:${(pdfScale||100)/100};} /* escala para cuadrar en la impresora */
    @media print{body{padding:${pdfMargin||10}px}@page{margin:${pdfMargin||10}mm;size:A4}}</style></head><body>
    <div class="header">
      <div>${cs.logo_url ? `<img src="${cs.logo_url}" class="logo" alt="Logo" /><br/>` : ''}
        <span class="company-name">${cs.company_name||''}</span>
        <div style="font-size:9px;color:#555;line-height:1.6">${cs.nif?`NIF: ${cs.nif}<br/>`:''}${cs.address?`${cs.address}${cs.city?', '+cs.city:''}${cs.postal_code?' '+cs.postal_code:''}<br/>`:''}${cs.phone?`Tel: ${cs.phone}`:''} ${cs.email?'· '+cs.email:''}</div></div>
      <div style="text-align:right"><div class="doc-title">${doc.doc_type?.toUpperCase()||''}</div>
        <div style="font-size:9px;color:#666">Nº: <strong>${doc.doc_number||'-'}</strong></div>
        <div style="font-size:9px;color:#666">Fecha: <strong>${doc.date||'-'}</strong></div>
        ${doc.due_date?`<div style="font-size:9px;color:#666">Vencimiento: ${doc.due_date}</div>`:''}
      </div>
    </div>
    <div class="client-box"><div style="font-size:12px;font-weight:700">${doc.contact_name||'Sin cliente'}</div>
      ${doc.contact_nif?`<div style="font-size:9px;color:#555">NIF: ${doc.contact_nif}</div>`:''}
      ${doc.contact_address?`<div style="font-size:9px;color:#555">${doc.contact_address}</div>`:''}
    </div>
    <table><thead><tr><th>Descripción</th><th class="center">Cant.</th><th class="right">P.Unit.</th>${hasDiscount?'<th class="right">Dto%</th>':''}<th class="right">Total</th></tr></thead>
    <tbody>${itemsHtml}</tbody></table>
    <div class="totals">
      <div style="display:flex;justify-content:flex-end;gap:20px;font-size:9px;color:#555"><span>Subtotal:</span><span><strong>${(doc.subtotal||0).toFixed(2)} €</strong></span></div>
      <div style="display:flex;justify-content:flex-end;gap:20px;font-size:9px;color:#555"><span>IVA (${doc.iva_rate||21}%):</span><span><strong>${(doc.iva_amount||0).toFixed(2)} €</strong></span></div>
      <div style="display:flex;justify-content:flex-end;gap:20px;font-size:14px;font-weight:800;color:#1e3a5f"><span>TOTAL:</span><span>${(doc.total||0).toFixed(2)} €</span></div>
    </div>
    ${doc.observations?`<div style="background:#f9fafb;border-radius:4px;padding:8px 12px;font-size:8px;color:#555;white-space:pre-wrap;margin-top:10px"><strong>Observaciones:</strong>\n${doc.observations}</div>`:''}
    ${doc.payment_terms?`<div style="background:#f9fafb;border-radius:4px;padding:8px 12px;font-size:8px;color:#555;white-space:pre-wrap;margin-top:6px">${doc.payment_terms}</div>`:''}
    ${doc.signature_client ? `
    <div style="margin-top:20px;padding-top:12px;border-top:1px solid #e5e7eb">
      <p style="font-size:9px;font-weight:600;color:#555;margin-bottom:6px">Conformidad del cliente:</p>
      <img src="${doc.signature_client}" style="max-height:60px;border:1px solid #e5e7eb;border-radius:4px;background:#fff" alt="Firma" />
      <p style="font-size:8px;color:#555;margin-top:3px">${doc.contact_name}${doc.sign_datetime ? ` · 🕐 ${doc.sign_datetime}` : ` · ${doc.date}`}</p>
    </div>` : ''}
    ${verifyBoxHtml}
    <div class="footer">Documento generado · ${cs.company_name||''} · ${cs.phone||''} · ${cs.email||''}</div>
    </body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 400);
  };

  // Filtrado
  let filtered = docs.filter((d) => {
    const matchSearch = `${d.doc_number} ${d.contact_name} ${d.work_type}`.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || d.doc_type === filterType;
    const matchStatus = filterStatus === 'all' || d.status === filterStatus;
    const matchWork = filterWorkType === 'all' || d.work_type === filterWorkType;
    return matchSearch && matchType && matchStatus && matchWork;
  });

  // KPIs
  const facturas = docs.filter((d) => d.doc_type === 'factura');
  const presupuestos = docs.filter((d) => d.doc_type === 'presupuesto');
  const totalFacturado = facturas.reduce((s, d) => s + (d.total || 0), 0);
  const pendienteCobro = facturas.filter((d) => ['enviado', 'vencido'].includes(d.status)).reduce((s, d) => s + (d.total || 0), 0);
  const cobradoMes = facturas.filter((d) => d.status === 'pagado' && d.date >= format(startOfMonth(new Date()), 'yyyy-MM-dd')).reduce((s, d) => s + (d.total || 0), 0);
  const vencidas = facturas.filter((d) => d.status === 'vencido').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6 text-violet-500" />Documentos
        </h1>
        <div className="flex gap-2">
          <Button className="bg-blue-600 text-primary-foreground px-5 py-2 text-xl font-extrabold rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow h-8 hover:bg-blue-700" size="sm" onClick={() => openNew('presupuesto', null, templates.find((t) => t.doc_type === 'presupuesto' && t.is_default))}>
            <Plus className="w-4 h-4 mr-1" />Presupuesto
          </Button>
          <Button className="bg-violet-600 text-primary-foreground px-5 py-2 text-xl font-extrabold rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow h-8 hover:bg-violet-700" size="sm" onClick={() => openNew('factura', null, templates.find((t) => t.doc_type === 'factura' && t.is_default))}>
            <Plus className="w-4 h-4 mr-1" />Factura
          </Button>
          <Button className="bg-green-600 text-primary-foreground px-5 py-2 text-lg font-extrabold rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow h-8 hover:bg-green-700" size="sm" onClick={() => openNew('recibo')}>
            <Plus className="w-4 h-4 mr-1" />Recibo
          </Button>
        </div>
      </div>

      {/* KPIs financieros */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-violet-400">
          <CardContent className="p-3">
            <p className="text-gray-500 mb-0.5 text-sm font-extrabold">Total facturado</p>
            <p className="text-violet-700 text-3xl font-bold">{totalFacturado.toFixed(0)} €</p>
            <p className="text-gray-400 font-extrabold">{facturas.length} facturas</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-green-400">
          <CardContent className="p-3">
            <p className="text-gray-500 mb-0.5 text-sm font-black">Cobrado este mes</p>
            <p className="text-green-700 text-3xl font-bold">{cobradoMes.toFixed(0)} €</p>
            <p className="text-gray-400 font-extrabold">Facturas pagadas</p>
          </CardContent>
        </Card>
        <Card className={`border-l-4 ${pendienteCobro > 0 ? 'border-orange-400' : 'border-gray-300'}`}>
          <CardContent className="p-3">
            <p className="text-gray-500 mb-0.5 text-base font-extrabold">Pendiente cobro</p>
            <p className="text-gray-400 text-3xl font-bold">{pendienteCobro.toFixed(0)} €</p>
            {vencidas > 0 && <p className="text-[10px] text-red-500 font-medium">{vencidas} vencidas</p>}
          </CardContent>
        </Card>
        <Card className="border-l-4 border-blue-400">
          <CardContent className="p-3">
            <p className="text-gray-500 mb-0.5 text-sm font-extrabold">Presupuestos</p>
            <p className="text-blue-700 text-3xl font-bold">{presupuestos.length}</p>
            <p className="text-gray-400 font-black">{presupuestos.filter((d) => d.status === 'enviado').length} enviados</p>
          </CardContent>
        </Card>
      </div>

      {/* Panel presupuestos pendientes >7 días */}
      {presupuestosPendientes.length > 0 && (
        <div className="border border-orange-200 rounded-xl bg-orange-50 overflow-hidden">
          <div
            className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-orange-100 transition-colors"
            onClick={() => setShowPendientes(v => !v)}
          >
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-orange-500" />
              <span className="font-semibold text-orange-800 text-sm">
                {presupuestosPendientes.length} presupuesto{presupuestosPendientes.length > 1 ? 's' : ''} sin respuesta hace más de 7 días
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-orange-400 transition-transform ${showPendientes ? 'rotate-180' : ''}`} />
          </div>
          {showPendientes && (
            <div className="divide-y divide-orange-100">
              {presupuestosPendientes.map(doc => {
                const diasPendiente = Math.floor((new Date() - new Date(doc.date)) / (1000 * 60 * 60 * 24));
                const c = contacts.find(x => x.id === doc.contact_id);
                return (
                  <div key={doc.id} className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap bg-white/60">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-800 truncate">
                        Presupuesto Nº{doc.doc_number} — {doc.contact_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Fecha: {doc.date} · Total: <strong>{doc.total?.toFixed(2)} €</strong>
                        <span className="ml-2 text-orange-600 font-semibold">⏱ {diasPendiente} días pendiente</span>
                      </p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-700 border-green-200 hover:bg-green-50 h-7 text-xs px-2"
                        onClick={() => sendReminderWhatsApp(doc)}
                        title={c?.phone ? `WhatsApp a ${c.phone}` : 'WhatsApp (sin teléfono)'}
                      >
                        <Phone className="w-3 h-3 mr-1" />
                        {c?.phone ? 'WhatsApp' : 'WhatsApp (sin tel.)'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-blue-700 border-blue-200 hover:bg-blue-50 h-7 text-xs px-2"
                        onClick={() => sendReminderEmail(doc)}
                        title={c?.email ? `Email a ${c.email}` : 'Email (sin dirección)'}
                      >
                        <Mail className="w-3 h-3 mr-1" />
                        {c?.email ? 'Email' : 'Email (sin dirección)'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-36">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar nº, cliente, tipo trabajo..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Tipo doc." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {DOC_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos estados</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterWorkType} onValueChange={setFilterWorkType}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Trabajo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos trabajos</SelectItem>
            {WORK_TYPES.map((w) => <SelectItem key={w} value={w}>{w.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-gray-400">{filtered.length} documento{filtered.length !== 1 ? 's' : ''} · Total: <strong>{filtered.reduce((s, d) => s + (d.total || 0), 0).toFixed(2)} €</strong></p>

      {/* ===== DIALOG CREAR/EDITAR ===== */}
      <Dialog open={dialogOpen} onOpenChange={(o) => {
        // Solo cerrar si el usuario pulsa X explícitamente (no al hacer click fuera)
        if (o === false) return; // bloquear cierre por click fuera
        setDialogOpen(o);
        if (!o) { setEditing(null); setShowAdvanced(false); }
      }}>
        <DialogContent
          className="max-w-5xl w-[98vw] max-h-[98vh] overflow-y-auto"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <div className="flex items-center justify-between gap-2">
              <DialogTitle>{editing ? `Editar ${editing.doc_type} ${editing.doc_number}` : 'Nuevo documento'}</DialogTitle>
              <div className="flex items-center gap-2">
                {autoSaved && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Borrador guardado</span>}
                <button
                  className="text-gray-400 hover:text-gray-700 p-1 rounded"
                  onClick={() => { clearDraft(); setDialogOpen(false); setEditing(null); setShowAdvanced(false); }}
                  title="Cerrar sin guardar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Select value={form.doc_type} onValueChange={(v) => {
                // Al cambiar tipo, recalcular número automáticamente solo si es documento nuevo
                if (!editing) {
                  const sameType = docs.filter((d) => d.doc_type === v).map((d) => d.doc_number || '');
                  setForm((p) => ({ ...p, doc_type: v, doc_number: getNextAvailableNumber(sameType) }));
                } else {
                  setForm((p) => ({ ...p, doc_type: v }));
                }
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DOC_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Nº documento" value={form.doc_number}
              onChange={(e) => {const v = e.target.value;setForm((p) => ({ ...p, doc_number: v }));}} />
              <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <Select value={form.contact_id || ''} onValueChange={handleContactSelect}>
              <SelectTrigger><SelectValue placeholder="Seleccionar cliente (opcional)" /></SelectTrigger>
              <SelectContent>
                {contacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} {c.surname} {c.company_name ? `(${c.company_name})` : ''}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Si no hay cliente seleccionado, permitir introducir datos manualmente */}
            {!form.contact_id &&
            <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Nombre cliente (libre)" value={form.contact_name}
              onChange={(e) => setForm((p) => ({ ...p, contact_name: e.target.value }))} />
                <Input placeholder="NIF / CIF" value={form.contact_nif}
              onChange={(e) => setForm((p) => ({ ...p, contact_nif: e.target.value }))} />
              </div>
            }

            {form.contact_name &&
            <div className="bg-blue-50 border border-blue-100 p-2 rounded text-xs text-gray-600">
                <strong>{form.contact_name}</strong>{form.contact_nif ? ` · NIF: ${form.contact_nif}` : ''}
                {form.contact_address && <><br />{form.contact_address}</>}
              </div>
            }

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-gray-500">Fecha</label>
                <Input type="date" value={form.date} onChange={(e) => {const v = e.target.value;setForm((p) => ({ ...p, date: v }));}} />
              </div>
              <div>
                <label className="text-xs text-gray-500">Vencimiento</label>
                <Input type="date" value={form.due_date || ''} onChange={(e) => {const v = e.target.value;setForm((p) => ({ ...p, due_date: v }));}} />
              </div>
              <div>
                <label className="text-xs text-gray-500">IVA (%)</label>
                <Select value={String(form.iva_rate)} onValueChange={handleIvaChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0% (Exento)</SelectItem>
                    <SelectItem value="4">4% (Super reducido)</SelectItem>
                    <SelectItem value="10">10% (Reducido)</SelectItem>
                    <SelectItem value="21">21% (General)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Select value={form.work_type} onValueChange={handleWorkTypeChange}>
              <SelectTrigger><SelectValue placeholder="Tipo de trabajo" /></SelectTrigger>
              <SelectContent>{WORK_TYPES.map((w) => <SelectItem key={w} value={w}>{w.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
            </Select>

            {/* Líneas */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Líneas del documento</label>
              {/* Añadir artículo por REFERENCIA de proveedor (rellena descripción y precio) */}
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg p-2">
                <Search className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <input
                  className="flex-1 text-xs h-8 border border-input rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Referencia del proveedor → añade el artículo con su descripción y precio"
                  value={refBusca}
                  onChange={(e) => setRefBusca(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLineaPorReferencia(); } }}
                />
                <Button size="sm" onClick={addLineaPorReferencia} disabled={refBuscando || !refBusca.trim()} className="bg-blue-600 hover:bg-blue-700 text-white gap-1">
                  {refBuscando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}Buscar ref.
                </Button>
              </div>
              {refMsg && <p className="text-xs px-1 text-gray-600">{refMsg}</p>}
              <div className="hidden md:grid grid-cols-12 gap-1 text-[10px] text-gray-400 px-1">
                <span className="col-span-5">Descripción</span>
                <span className="col-span-2">Cant.</span>
                <span className="col-span-2">€/ud</span>
                <span className="col-span-1">Dto%</span>
                <span className="col-span-1 text-right">Total</span>
                <span className="col-span-1"></span>
              </div>
              {form.items.map((item, i) =>
              <div key={item._id ?? i} className="grid grid-cols-12 gap-1 items-center">
                   <div className="col-span-5">
                    <MaterialAutocomplete
                      value={item.description}
                      onChange={(v) => handleItemChange(i, 'description', v)}
                      onSelectItem={(sel) => {
                        setForm((prev) => {
                          const newItems = prev.items.map((it, idx) => idx === i
                            ? { ...it, description: sel.description, unit_price: sel.unit_price || it.unit_price }
                            : it);
                          return { ...prev, ...recalculate(newItems, prev.iva_rate) };
                        });
                      }}
                    />
                  </div>
                
                   <input
                  className="col-span-2 text-xs h-8 border border-input rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                  inputMode="decimal" placeholder="Cant."
                  value={getItemDisplayValue(i, 'quantity', item.quantity)}
                  onChange={(e) => handleItemLocalChange(i, 'quantity', e.target.value)}
                  onBlur={() => handleItemBlur(i, 'quantity')} />
                   <input
                  className="col-span-2 text-xs h-8 border border-input rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                  inputMode="decimal" placeholder="Precio"
                  value={getItemDisplayValue(i, 'unit_price', item.unit_price)}
                  onChange={(e) => handleItemLocalChange(i, 'unit_price', e.target.value)}
                  onBlur={() => handleItemBlur(i, 'unit_price')} />
                   <input
                  className="col-span-1 text-xs h-8 border border-input rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                  inputMode="decimal" placeholder="Dto%"
                  value={getItemDisplayValue(i, 'discount', item.discount || 0)}
                  onChange={(e) => handleItemLocalChange(i, 'discount', e.target.value)}
                  onBlur={() => handleItemBlur(i, 'discount')} />
                   <span className="col-span-1 text-xs text-right font-medium text-green-700">{item.total?.toFixed(2)}</span>
                   <button className="col-span-1 text-red-400 hover:text-red-600 text-lg leading-none text-center" onClick={() => removeItem(i)}>×</button>
                 </div>
              )}
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={addItem}><Plus className="w-3 h-3 mr-1" />Línea</Button>
                <PriceItemSelector onSelect={(item) => {
                  setForm((prev) => {
                    const newItems = [...prev.items, { _id: ++_itemId, description: item.description, quantity: item.quantity || 1, unit_price: item.unit_price, discount: 0, total: item.unit_price }];
                    return { ...prev, ...recalculate(newItems, prev.iva_rate) };
                  });
                }} />
                {lineTemplates.length > 0 && (
                  <div className="relative">
                    <Button size="sm" variant="outline" className="text-purple-600 border-purple-200 hover:bg-purple-50 gap-1"
                      onClick={() => setShowLineTemplates(v => !v)}>
                      <Layers className="w-3 h-3" />Plantillas
                      {lineTemplates.filter(lt => lt.doc_type === 'todos' || lt.doc_type === form.doc_type).length > 0 && (
                        <span className="bg-purple-600 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                          {lineTemplates.filter(lt => lt.doc_type === 'todos' || lt.doc_type === form.doc_type).length}
                        </span>
                      )}
                    </Button>
                    {showLineTemplates && (
                      <div className="absolute z-50 top-full left-0 mt-1 bg-white border rounded-xl shadow-2xl min-w-64 max-h-80 overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b px-3 py-2 flex items-center justify-between">
                          <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-purple-500" />
                            Cargar plantilla de líneas
                          </p>
                          <button onClick={() => setShowLineTemplates(false)} className="text-gray-400 hover:text-gray-600">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {lineTemplates.filter(lt => lt.doc_type === 'todos' || lt.doc_type === form.doc_type).length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-6">No hay plantillas para este tipo de documento</p>
                        ) : (
                          lineTemplates
                            .filter(lt => lt.doc_type === 'todos' || lt.doc_type === form.doc_type)
                            .map(lt => {
                              const subtotal = (lt.items || []).reduce((s, it) => s + (it.quantity || 0) * (it.unit_price || 0) * (1 - (it.discount || 0) / 100), 0);
                              return (
                                <button key={lt.id} className="w-full text-left px-3 py-2.5 hover:bg-purple-50 border-b last:border-0 group transition-colors"
                                  onClick={() => {
                                    const newItems = (lt.items || []).map((it) => ({ _id: ++_itemId, ...it }));
                                    setForm(prev => {
                                      const merged = [...prev.items, ...newItems];
                                      return { ...prev, ...recalculate(merged, prev.iva_rate), observations: lt.notes_template ? (prev.observations ? prev.observations + '\n' + lt.notes_template : lt.notes_template) : prev.observations };
                                    });
                                    setShowLineTemplates(false);
                                  }}>
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-purple-700 text-sm group-hover:text-purple-800">{lt.name}</p>
                                      <p className="text-[10px] text-gray-400 mt-0.5">{lt.items?.length || 0} líneas · {lt.doc_type === 'todos' ? 'Todos los tipos' : lt.doc_type}</p>
                                      {lt.items?.slice(0, 2).map((it, i) => (
                                        <p key={i} className="text-[10px] text-gray-500 truncate">· {it.description}</p>
                                      ))}
                                    </div>
                                    <span className="text-xs font-bold text-green-700 shrink-0">~{subtotal.toFixed(0)} €</span>
                                  </div>
                                </button>
                              );
                            })
                        )}
                        <div className="sticky bottom-0 bg-gray-50 border-t px-3 py-1.5">
                          <p className="text-[10px] text-gray-400">Las líneas se añaden al documento actual</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <AdvancedPriceSearch onSelect={(item) => {
                  setForm((prev) => {
                    const newItems = [...prev.items, { _id: ++_itemId, description: item.description, quantity: 1, unit_price: item.unit_price, discount: 0, total: item.unit_price }];
                    return { ...prev, ...recalculate(newItems, prev.iva_rate) };
                  });
                }} triggerLabel="Buscar precio BD" />
                <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => setSupplierSearchOpen(true)}>
                  <ShoppingCart className="w-3 h-3 mr-1" />Buscar en distribuidor
                </Button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg space-y-1 text-sm">
              <div className="flex justify-between text-gray-600"><span>Subtotal:</span><span>{form.subtotal?.toFixed(2)} €</span></div>
              <div className="flex justify-between text-gray-600"><span>IVA ({form.iva_rate}%):</span><span>{form.iva_amount?.toFixed(2)} €</span></div>
              <div className="flex justify-between font-bold text-lg text-blue-800"><span>TOTAL:</span><span>{form.total?.toFixed(2)} €</span></div>
            </div>

            {/* Observaciones - siempre visible */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Observaciones del documento</label>
              <textarea className="w-full border border-input rounded-md px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Añade aquí cualquier aclaración o nota sobre este documento..." value={form.observations || ''} onChange={(e) => {const v = e.target.value;setForm((p) => ({ ...p, observations: v }));}} rows={3} />
            </div>

            <button className="text-xs text-gray-500 flex items-center gap-1" onClick={() => setShowAdvanced((v) => !v)}>
              {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Condiciones de pago y normativa
            </button>
            {showAdvanced &&
            <div className="space-y-2">
                <textarea className="w-full border border-input rounded-md px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Condiciones de pago" value={form.payment_terms || ''} onChange={(e) => {const v = e.target.value;setForm((p) => ({ ...p, payment_terms: v }));}} rows={4} />
                {form.normative_references &&
              <div className="bg-blue-50 p-3 rounded-lg text-xs">
                    <p className="font-medium text-blue-700 mb-1">Normativa aplicable:</p>
                    <textarea className="w-full border border-input rounded-md px-3 py-2 text-xs resize-y focus:outline-none focus:ring-1 focus:ring-ring" value={form.normative_references || ''} onChange={(e) => {const v = e.target.value;setForm((p) => ({ ...p, normative_references: v }));}} rows={2} />
                  </div>
              }
              </div>
            }

            <div className="pt-2 border-t mt-2">
              <Button onClick={handleSave} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 gap-2 h-11 text-base font-semibold">
                <Save className="w-4 h-4" />
                {saving ? 'Guardando...' : editing ? '💾 Actualizar documento' : '💾 Guardar documento'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SupplierProductSearch open={supplierSearchOpen} onClose={() => setSupplierSearchOpen(false)} onAddItem={addItemFromSupplier} />

      {/* ===== PREVIEW ===== */}
      <Dialog open={!!previewDoc} onOpenChange={() => {}}>
        <DialogContent className="max-w-5xl w-[98vw] max-h-[98vh] overflow-y-auto" onPointerDownOutside={e => e.preventDefault()} onInteractOutside={e => e.preventDefault()}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="capitalize">{previewDoc?.doc_type} {previewDoc?.doc_number}</DialogTitle>
              <button className="text-gray-400 hover:text-gray-700 p-1 rounded" onClick={() => setPreviewDoc(null)}>✕</button>
            </div>
          </DialogHeader>
          {previewDoc &&
          <>
              <div ref={printRef} className="bg-white">
                <CompanyHeader className="mb-4 pb-4 border-b" />
                <div className="space-y-4 p-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold uppercase tracking-wide">{previewDoc.doc_type}</h2>
                      <p className="text-sm text-gray-500">Nº: {previewDoc.doc_number}</p>
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      <p>Fecha: <strong>{previewDoc.date}</strong></p>
                      {previewDoc.due_date && <p>Vencimiento: {previewDoc.due_date}</p>}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm border-l-4 border-blue-500">
                    <p className="font-bold">{previewDoc.contact_name || 'Sin cliente'}</p>
                    {previewDoc.contact_nif && <p className="text-gray-500">NIF: {previewDoc.contact_nif}</p>}
                    {previewDoc.contact_address && <p className="text-gray-500">{previewDoc.contact_address}</p>}
                  </div>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-800 text-white">
                        <th className="text-left p-2">Descripción</th>
                        <th className="p-2 text-center">Cant.</th>
                        <th className="p-2 text-right">P.Unit.</th>
                        {previewDoc.items?.some((i) => i.discount > 0) && <th className="p-2 text-right">Dto%</th>}
                        <th className="p-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewDoc.items?.map((item, i) =>
                    <tr key={i} className={`border-b ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                          <td className="p-2">{item.description}</td>
                          <td className="p-2 text-center">{item.quantity}</td>
                          <td className="p-2 text-right">{item.unit_price?.toFixed(2)} €</td>
                          {previewDoc.items?.some((i) => i.discount > 0) && <td className="p-2 text-right text-orange-600">{item.discount > 0 ? `${item.discount}%` : '-'}</td>}
                          <td className="p-2 text-right font-medium">{item.total?.toFixed(2)} €</td>
                        </tr>
                    )}
                    </tbody>
                  </table>
                  <div className="text-right space-y-1 text-sm border-t pt-3">
                    <p className="text-gray-600">Subtotal: <strong>{previewDoc.subtotal?.toFixed(2)} €</strong></p>
                    <p className="text-gray-600">IVA ({previewDoc.iva_rate}%): <strong>{previewDoc.iva_amount?.toFixed(2)} €</strong></p>
                    <p className="font-bold text-xl text-gray-900">TOTAL: {previewDoc.total?.toFixed(2)} €</p>
                  </div>
                  {previewDoc.observations && <div className="bg-gray-50 p-3 rounded text-xs text-gray-600 whitespace-pre-wrap"><strong>Observaciones:</strong> {previewDoc.observations}</div>}
                  {previewDoc.payment_terms && <p className="text-xs text-gray-500 whitespace-pre-wrap border-t pt-2">{previewDoc.payment_terms}</p>}
                  {previewDoc.normative_references && <p className="text-xs text-blue-600 border-t pt-2">Normativa: {previewDoc.normative_references}</p>}

                  {/* Firma digital del cliente */}
                  <div className="mt-4 pt-4 border-t">
                    {previewDoc.signature_history && previewDoc.signature_history.length > 0 && (
                      <div className="mb-4 space-y-2">
                        <h4 className="font-bold text-sm text-gray-700 flex items-center gap-2">
                          📋 Historial de firmas ({previewDoc.signature_history.length})
                        </h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {previewDoc.signature_history.map((item, idx) => {
                            const isChangeOfOpinion = idx > 0;
                            const isAccepted = item.action === 'aceptar';
                            const bgColor = isChangeOfOpinion ? 'bg-orange-50 border-l-4 border-l-orange-500' : isAccepted ? 'bg-green-50 border-l-4 border-l-green-500' : 'bg-red-50 border-l-4 border-l-red-500';
                            const textColor = isChangeOfOpinion ? 'text-orange-700' : isAccepted ? 'text-green-700' : 'text-red-700';
                            const label = isChangeOfOpinion ? (isAccepted ? 'CAMBIO → ACEPTADO' : 'CAMBIO → RECHAZADO') : (isAccepted ? 'ACEPTADO' : 'RECHAZADO');
                            return (
                              <div key={idx} className={`${bgColor} rounded p-3`}>
                                <div className="flex items-center gap-2 mb-2">
                                  {isAccepted ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                                  <span className={`font-bold text-sm ${textColor}`}>{label}</span>
                                  <span className="text-xs text-gray-500 ml-auto">🕐 {item.datetime}</span>
                                </div>
                                {item.signature_url && (
                                  <img src={item.signature_url} alt={`Firma ${label}`} className="max-h-16 rounded border border-gray-300 bg-white p-1" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {previewDoc.signature_client ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm font-semibold text-green-700">Firmado por el cliente</span>
                          <span className="text-xs text-gray-400">· {previewDoc.contact_name}</span>
                        </div>
                        <div className="border border-green-200 rounded-lg bg-green-50 p-3">
                          <img src={previewDoc.signature_client} alt="Firma cliente" className="max-h-20 rounded border border-gray-200 bg-white" />
                          {previewDoc.sign_datetime && (
                            <p className="text-[10px] text-gray-500 font-mono mt-1 text-center">🕐 Firmado: {previewDoc.sign_datetime}</p>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">Esta firma puede imprimirse con el documento exportando el PDF.</p>
                      </div>
                    ) : (
                      <SignatureCanvas
                        label="✍️ Conformidad del cliente"
                        value={previewDoc.signature_client}
                        existingDatetime={previewDoc.sign_datetime || null}
                        onSave={async (dataUrl, signDt) => {
                          // Guardamos el dataURL directamente en el campo de la
                          // firma (es una imagen pequeña JPEG). Así evitamos la
                          // subida a la nube (que falla si no hay créditos de
                          // integración o red) y la firma queda siempre guardada.
                          const updateData = { signature_client: dataUrl, sign_datetime: signDt };
                          await base44.entities.Invoice.update(previewDoc.id, updateData);
                          const updated = { ...previewDoc, ...updateData };
                          setPreviewDoc(updated);
                          setDocs(prev => prev.map(d => d.id === previewDoc.id ? updated : d));
                          // Enviar copia firmada al cliente
                          const c = contacts.find(x => x.id === previewDoc.contact_id);
                          base44.functions.invoke('enviarCopiaFirmada', {
                            contact_email: c?.email || null,
                            contact_name: previewDoc.contact_name,
                            doc_title: `${previewDoc.doc_type?.toUpperCase()} Nº${previewDoc.doc_number}`,
                            doc_type: previewDoc.doc_type,
                            sign_datetime: signDt,
                            signature_url: dataUrl,
                            signer_role: 'cliente',
                            extra_info: `Total: ${previewDoc.total?.toFixed(2)} € | Fecha doc: ${previewDoc.date}`
                          }).catch(() => {});
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
              {/* Bloque enviar enlace de firma para presupuestos */}
              {previewDoc?.doc_type === 'presupuesto' && (
                <div className="mt-3 pt-3 border-t no-print space-y-3">
                  {(previewDoc.signature_client || previewDoc.status === 'enviado') && (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700">
                        <strong>Aviso:</strong> Este presupuesto ya fue enviado anteriormente. El enlace es únicamente para que el cliente lo <strong>acepte o rechace digitalmente</strong> y quede constancia firmada con fecha y hora.
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => sendSignLink(previewDoc, 'whatsapp')}>
                      <Send className="w-3.5 h-3.5 mr-1" />Enviar enlace firma (WhatsApp)
                    </Button>
                    <Button size="sm" variant="outline" className="text-blue-700 border-blue-200 hover:bg-blue-50" onClick={() => sendSignLink(previewDoc, 'email')}>
                      <Mail className="w-3.5 h-3.5 mr-1" />Enviar enlace firma (Email)
                    </Button>
                    <Button size="sm" variant="outline" className="text-gray-500" onClick={() => { navigator.clipboard.writeText(getSignLink(previewDoc)); }}>
                      <Link className="w-3.5 h-3.5 mr-1" />Copiar enlace
                    </Button>
                  </div>

                  {previewDoc.signature_history && previewDoc.signature_history.length > 0 && (
                    <div className="flex gap-2 flex-wrap pt-2 border-t">
                      <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-white" onClick={() => sendChangeOpinionLink(previewDoc, 'whatsapp')}>
                        <MessageCircle className="w-3.5 h-3.5 mr-1" />Cambio de opinión (WhatsApp)
                      </Button>
                      <Button size="sm" variant="outline" className="text-yellow-700 border-yellow-200 hover:bg-yellow-50" onClick={() => sendChangeOpinionLink(previewDoc, 'email')}>
                        <Mail className="w-3.5 h-3.5 mr-1" />Cambio de opinión (Email)
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 mt-3 pt-3 border-t flex-wrap no-print">
                <MaterialsExportButton
                  items={previewDoc.items || []}
                  title={`${previewDoc.doc_type?.toUpperCase()} ${previewDoc.doc_number} — ${previewDoc.contact_name}`}
                />
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white font-semibold" onClick={() => exportPDF(previewDoc)}>
                  <FileDown className="w-4 h-4 mr-1" />Exportar PDF
                </Button>
                <Button size="sm" variant="outline" onClick={() => window.print()}>
                  <Printer className="w-4 h-4 mr-1" />Imprimir
                </Button>
                <Button variant="outline" size="sm" onClick={() => {setPreviewDoc(null);handleEdit(previewDoc);}}>
                  <Edit className="w-4 h-4 mr-1" />Editar
                </Button>
                <Button variant="outline" size="sm" className="text-green-700" onClick={() => sendWhatsApp(previewDoc)}>
                  <Phone className="w-4 h-4 mr-1" />WhatsApp
                </Button>
                <Button variant="outline" size="sm" className="text-blue-700" onClick={() => sendEmail(previewDoc)}>
                  <Mail className="w-4 h-4 mr-1" />Email
                </Button>
                <Button variant="outline" size="sm" onClick={() => {setPreviewDoc(null);handleDuplicate(previewDoc);}}>
                  <Copy className="w-4 h-4 mr-1" />Duplicar
                </Button>
              </div>
              {/* Ajustes de impresión / PDF (cuadrar en A4) */}
              <div className="mt-3 border-t pt-3">
                <p className="text-xs font-semibold text-gray-600 mb-1">🖨️ Ajuste de impresión / PDF (A4)</p>
                <div className="flex items-center gap-4 flex-wrap text-xs">
                  <label className="flex items-center gap-2">
                    Margen: <b>{pdfMargin} mm</b>
                    <input type="range" min="3" max="25" value={pdfMargin}
                      onChange={(e) => { const v = parseInt(e.target.value); setPdfMargin(v); try { localStorage.setItem('gpt_pdf_margin', String(v)); } catch {} }} />
                  </label>
                  <label className="flex items-center gap-2">
                    Escala: <b>{pdfScale}%</b>
                    <input type="range" min="60" max="130" step="5" value={pdfScale}
                      onChange={(e) => { const v = parseInt(e.target.value); setPdfScale(v); try { localStorage.setItem('gpt_pdf_scale', String(v)); } catch {} }} />
                  </label>
                  <Button size="sm" variant="outline" className="text-xs"
                    onClick={() => { setPdfMargin(10); setPdfScale(100); try { localStorage.setItem('gpt_pdf_margin','10'); localStorage.setItem('gpt_pdf_scale','100'); } catch {} }}>
                    Ajustar a A4 (por defecto)
                  </Button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Si el documento se sale o queda pequeño en tu impresora, ajusta margen y escala y vuelve a Exportar PDF/Imprimir.</p>
              </div>

              {/* Verificación del documento (QR): caducidad configurable */}
              <div className="mt-3 border-t pt-3">
                <p className="text-xs font-semibold text-gray-600 mb-1">🔐 Verificación por QR (validez del enlace)</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {[['90 días', 90], ['6 meses', 182], ['1 año', 365], ['Sin caducidad', 0]].map(([lbl, dias]) => (
                    <Button key={lbl} size="sm" variant="outline" className="text-xs"
                      onClick={async () => {
                        const exp = dias > 0 ? new Date(Date.now() + dias * 86400000).toISOString() : null;
                        await base44.entities.Invoice.update(previewDoc.id, { verify_enabled: true, verify_expires: exp });
                        setPreviewDoc({ ...previewDoc, verify_enabled: true, verify_expires: exp });
                        setDocs(docs.map(d => d.id === previewDoc.id ? { ...d, verify_enabled: true, verify_expires: exp } : d));
                      }}>{lbl}</Button>
                  ))}
                  <span className="text-[11px] text-gray-500">
                    {previewDoc.verify_expires ? `Válido hasta ${new Date(previewDoc.verify_expires).toLocaleDateString('es-ES')}` : 'Sin caducidad'}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">El QR va en el PDF y abre la página de verificación. Si editas el documento, la verificación se actualiza sola.</p>
              </div>
            </>
          }
        </DialogContent>
      </Dialog>

      {/* ===== LISTA ===== */}
      <div className="space-y-2">
        {filtered.length === 0 &&
        <div className="text-center py-12 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>No hay documentos</p>
          </div>
        }
        {filtered.map((doc) => {
          const StatusIcon = STATUS_ICONS[doc.status] || FileText;
          const isPresupuesto = doc.doc_type === 'presupuesto';
          const isAceptado = isPresupuesto && doc.signature_client && doc.status !== 'cancelado';
          const isRechazado = isPresupuesto && doc.status === 'cancelado' && doc.signature_client;
          return (
            <Card key={doc.id} className={`hover:shadow-md transition-shadow cursor-pointer group ${isAceptado ? 'border-green-300 bg-green-50/30' : isRechazado ? 'border-red-300 bg-red-50/30' : ''}`} onClick={() => setPreviewDoc(doc)}>
              <CardContent className="p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${isAceptado ? 'bg-green-100' : isRechazado ? 'bg-red-100' : doc.doc_type === 'factura' ? 'bg-violet-100' : doc.doc_type === 'presupuesto' ? 'bg-blue-100' : 'bg-green-100'}`}>
                    <FileText className={`w-4 h-4 ${isAceptado ? 'text-green-600' : isRechazado ? 'text-red-500' : doc.doc_type === 'factura' ? 'text-violet-600' : doc.doc_type === 'presupuesto' ? 'text-blue-600' : 'text-green-600'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-lg font-extrabold capitalize truncate">{doc.doc_type} {doc.doc_number}</p>
                      {isAceptado && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 flex-shrink-0">✅ ACEPTADO</span>}
                      {isRechazado && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200 flex-shrink-0">❌ RECHAZADO</span>}
                    </div>
                    <p className="text-gray-500 text-sm truncate">{doc.contact_name || 'Sin cliente'} · {doc.date} {doc.work_type && doc.work_type !== 'otro' ? `· ${doc.work_type}` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <span className="text-base font-extrabold">{doc.total?.toFixed(2)} €</span>
                  <Select value={doc.status} onValueChange={(v) => handleStatusChange(doc, v)}>
                    <SelectTrigger className="bg-blue-100 text-blue-700 px-3 py-2 text-base rounded-md flex items-center justify-between whitespace-nowrap border-input shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 h-6 w-24 border-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {/* Acciones rápidas SIEMPRE visibles: enviar / imprimir / PDF */}
                  <button onClick={(e) => { e.stopPropagation(); sendWhatsApp(doc); }} className="text-green-600 hover:text-green-800 p-1" title="Enviar por WhatsApp"><MessageCircle className="w-4 h-4" /></button>
                  <button onClick={(e) => { e.stopPropagation(); sendEmail(doc); }} className="text-blue-600 hover:text-blue-800 p-1" title="Enviar por Email"><Mail className="w-4 h-4" /></button>
                  <button onClick={(e) => { e.stopPropagation(); exportPDF(doc); }} className="text-red-600 hover:text-red-800 p-1" title="Imprimir o guardar en PDF"><Printer className="w-4 h-4" /></button>
                  {isPresupuesto && (
                    <button onClick={(e) => { e.stopPropagation(); sendSignLink(doc, 'whatsapp'); }} className="text-emerald-500 hover:text-emerald-700 p-1" title="Enviar enlace de firma (aceptar/rechazar)"><Send className="w-4 h-4" /></button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); handleEdit(doc); }} className="text-gray-400 hover:text-blue-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity" title="Editar"><Edit className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDuplicate(doc)} className="text-gray-400 hover:text-blue-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity" title="Duplicar"><Copy className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(doc.id)} className="text-red-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </CardContent>
            </Card>);

        })}
      </div>
    </div>);

}