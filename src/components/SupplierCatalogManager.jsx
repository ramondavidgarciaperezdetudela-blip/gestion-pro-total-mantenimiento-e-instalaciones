import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, Plus, Download, RefreshCw, Loader2, Link as LinkIcon, FileText, Upload } from 'lucide-react';
import { uploadFile } from '@/lib/uploadImage';
import { borrarArchivoLocal } from '@/nube/archivosLocales';
import { toast } from 'sonner';

const CATALOG_TYPES = [
{ value: 'pdf_url', label: 'Enlace a PDF', icon: LinkIcon },
{ value: 'productos', label: 'Lista de productos', icon: FileText },
{ value: 'documento', label: 'Documento descargable', icon: Download },
{ value: 'archivo', label: 'Archivo subido (PDF, Excel, Word…)', icon: Upload }];

const ACEPTADOS = '.pdf,.xls,.xlsx,.xlsm,.csv,.doc,.docx,.odt,.ods,.txt,.rtf,.ppt,.pptx,.zip,.jpg,.jpeg,.png,.webp';
// Descarga con el nombre original del archivo (si la dirección es de otro origen, el navegador ignoraría el nombre)
async function descargarArchivo(ev, c) {
  if (String(c.url).startsWith('gptblob:')) return; // lo abre el vigilante de archivos locales
  ev.preventDefault();
  try {
    const r = await fetch(c.url); if (!r.ok) throw new Error(String(r.status));
    const u = URL.createObjectURL(await r.blob());
    const a = document.createElement('a'); a.href = u; a.download = c.file_name || 'archivo'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 10000);
  } catch { window.open(c.url, '_blank'); }
}
const tamanoTexto = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);


export default function SupplierCatalogManager({ supplierId, supplierName, supplierCategory }) {
  const [catalogs, setCatalogs] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCatalog, setEditingCatalog] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const entrada = React.useRef(null);
  const [form, setForm] = useState({
    catalog_type: 'pdf_url',
    title: '',
    description: '',
    url: '',
    auto_update_enabled: true,
    products: [],
    notes: ''
  });

  const loadCatalogs = async () => {
    const data = await base44.entities.SupplierCatalog.filter({ supplier_id: supplierId });
    setCatalogs(data || []);
  };

  React.useEffect(() => {
    if (supplierId) {
      loadCatalogs();
    }
  }, [supplierId]);

  const handleSave = async () => {
    if (!form.title) {
      toast.error('El título es obligatorio');
      return;
    }
    try {
      const catalogData = {
        supplier_id: supplierId,
        supplier_name: supplierName,
        supplier_category: supplierCategory,
        ...form,
        last_updated: new Date().toISOString()
      };
      if (editingCatalog) {
        await base44.entities.SupplierCatalog.update(editingCatalog.id, catalogData);
      } else {
        await base44.entities.SupplierCatalog.create(catalogData);
      }
      await loadCatalogs();
      setDialogOpen(false);
      setEditingCatalog(null);
      setForm({ catalog_type: 'pdf_url', title: '', description: '', url: '', auto_update_enabled: true, products: [], notes: '' });
      toast.success('Catálogo guardado');
    } catch (error) {
      toast.error('Error al guardar');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este catálogo?')) return;
    try {
      const antes = catalogs.find((c) => c.id === id);
      await base44.entities.SupplierCatalog.delete(id);
      if (antes?.url) borrarArchivoLocal(antes.url);
      toast.success('Catálogo eliminado');
    } catch (e) {
      toast.error(`No se pudo eliminar: ${e?.response?.data?.message || e?.message || 'sin permiso'}. Si lo creó otra cuenta, entra con la cuenta administradora.`);
    }
    await loadCatalogs();
  };

  const handleFetchCatalogs = async () => {
    setFetching(true);
    // Buscar catálogos públicos usando IA
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Busca en internet catálogos públicos disponibles en la web de ${supplierName}. Devuelve una lista con título, descripción y URL del catálogo.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          catalogs: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { "type": "string" },
                description: { "type": "string" },
                url: { "type": "string" }
              }
            }
          }
        }
      }
    });

    if (response?.catalogs?.length > 0) {
      for (const cat of response.catalogs) {
        await base44.entities.SupplierCatalog.create({
          supplier_id: supplierId,
          supplier_name: supplierName,
          supplier_category: supplierCategory,
          catalog_type: 'pdf_url',
          title: cat.title,
          description: cat.description,
          url: cat.url,
          auto_update_enabled: true,
          last_updated: new Date().toISOString()
        });
      }
      await loadCatalogs();
      toast.success(`${response.catalogs.length} catálogos encontrados`);
    } else {
      toast.info('No se encontraron catálogos públicos');
    }
    setFetching(false);
  };

  // Sube uno o varios ficheros del ordenador (catálogo o tarifa ya descargados) a la ficha del proveedor
  const subirArchivos = async (lista) => {
    const ficheros = [...(lista || [])];
    if (!ficheros.length) return;
    setSubiendo(true); let ok = 0;
    for (const f of ficheros) {
      try {
        const url = await uploadFile(f);
        await base44.entities.SupplierCatalog.create({
          supplier_id: supplierId, supplier_name: supplierName, supplier_category: supplierCategory,
          catalog_type: 'archivo', title: f.name.replace(/\.[^.]+$/, ''), file_name: f.name, file_size: f.size, file_type: f.type || '',
          url, auto_update_enabled: false, last_updated: new Date().toISOString()
        });
        ok++;
      } catch (e) { toast.error(`No se pudo subir «${f.name}»: ${e?.message || 'error'}`); }
    }
    setSubiendo(false);
    if (entrada.current) entrada.current.value = '';
    if (ok) { await loadCatalogs(); toast.success(ok === 1 ? 'Archivo subido al catálogo del proveedor' : `${ok} archivos subidos al catálogo del proveedor`); }
  };

  const handleEdit = (catalog) => {
    setEditingCatalog(catalog);
    setForm({
      catalog_type: catalog.catalog_type,
      title: catalog.title || '',
      description: catalog.description || '',
      url: catalog.url || '',
      auto_update_enabled: catalog.auto_update_enabled !== false,
      products: catalog.products || [],
      notes: catalog.notes || ''
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-sm">Catálogos de {supplierName}</h3>
        <div className="flex gap-2">
          <input ref={entrada} type="file" multiple accept={ACEPTADOS} className="hidden" onChange={(e) => subirArchivos(e.target.files)} data-prueba="catalogo-archivo-entrada" />
          <Button onClick={() => entrada.current?.click()} disabled={subiendo} size="sm" variant="outline" className="text-xs h-8 border-green-300 text-green-700 hover:bg-green-50" data-prueba="catalogo-subir-archivo" title="Sube un PDF, Excel, Word… que tengas en el ordenador">
            {subiendo ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Upload className="w-3 h-3 mr-1" />}
            {subiendo ? 'Subiendo…' : 'Subir archivo'}
          </Button>
          <Button
            onClick={() => {
              setEditingCatalog(null);
              setForm({ catalog_type: 'pdf_url', title: '', description: '', url: '', auto_update_enabled: true, products: [], notes: '' });
              setDialogOpen(true);
            }}
            size="sm"
            className="text-xs h-8 bg-blue-600 hover:bg-blue-700">
            
            <Plus className="w-3 h-3 mr-1" />
            Agregar catálogo
          </Button>
          <Button
            onClick={handleFetchCatalogs}
            disabled={fetching}
            variant="outline"
            size="sm"
            className="text-xs h-8">
            
            {fetching ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
            Buscar
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {catalogs.length === 0 ?
        <p className="text-xs text-gray-400">Sin catálogos. Sube un archivo de tu ordenador, busca en internet o añade uno a mano.</p> :

        catalogs.map((catalog) =>
        <Card key={catalog.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="mb-1 text-base font-bold">{catalog.title}</h4>
                  {catalog.description && <p className="text-gray-600 mb-1 text-sm font-black">{catalog.description}</p>}
                  <div className="flex items-center gap-2 text-[10px] text-gray-500">
                    <span className="px-1.5 py-0.5 bg-slate-100 rounded">{catalog.catalog_type}</span>
                    {catalog.file_name && <span className="truncate max-w-[14rem]" title={catalog.file_name}>{catalog.file_name}{catalog.file_size ? ` · ${tamanoTexto(catalog.file_size)}` : ''}</span>}
                    {catalog.last_updated &&
                <span>Act. {new Date(catalog.last_updated).toLocaleDateString()}</span>
                }
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {catalog.url && (catalog.catalog_type === 'archivo' || catalog.file_name ?
              <a href={catalog.url} download={catalog.file_name || true} onClick={(ev) => descargarArchivo(ev, catalog)} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Abrir / descargar el archivo" data-prueba="catalogo-descargar">
                      <Download className="w-4 h-4" />
                    </a> :
              <a href={catalog.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-blue-500 hover:bg-blue-50 rounded">
                      <LinkIcon className="w-4 h-4" />
                    </a>)
              }
                  <button onClick={() => handleEdit(catalog)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded">
                    <FileText className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(catalog.id)} className="p-1.5 text-red-400 hover:text-red-600 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
        )
        }
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingCatalog ? 'Editar' : 'Nuevo'} catálogo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={form.catalog_type} onValueChange={(v) => setForm({ ...form, catalog_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATALOG_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Título *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Textarea placeholder="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            {form.catalog_type === 'pdf_url' &&
            <Input placeholder="URL del PDF/catálogo" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            }
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={form.auto_update_enabled} onChange={(e) => setForm({ ...form, auto_update_enabled: e.target.checked })} />
              Actualizar automáticamente
            </label>
            <Button onClick={handleSave} className="w-full">{editingCatalog ? 'Actualizar' : 'Guardar'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>);

}