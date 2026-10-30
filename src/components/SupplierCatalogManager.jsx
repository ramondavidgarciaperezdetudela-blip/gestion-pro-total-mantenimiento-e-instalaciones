import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, Plus, Download, RefreshCw, Loader2, Link as LinkIcon, FileText } from 'lucide-react';
import { toast } from 'sonner';

const CATALOG_TYPES = [
{ value: 'pdf_url', label: 'Enlace a PDF', icon: LinkIcon },
{ value: 'productos', label: 'Lista de productos', icon: FileText },
{ value: 'documento', label: 'Documento descargable', icon: Download }];


export default function SupplierCatalogManager({ supplierId, supplierName, supplierCategory }) {
  const [catalogs, setCatalogs] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCatalog, setEditingCatalog] = useState(null);
  const [fetching, setFetching] = useState(false);
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
      await base44.entities.SupplierCatalog.delete(id);
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
        <p className="text-xs text-gray-400">Sin catálogos. Busca en internet o añade manualmente.</p> :

        catalogs.map((catalog) =>
        <Card key={catalog.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="mb-1 text-base font-bold">{catalog.title}</h4>
                  {catalog.description && <p className="text-gray-600 mb-1 text-sm font-black">{catalog.description}</p>}
                  <div className="flex items-center gap-2 text-[10px] text-gray-500">
                    <span className="px-1.5 py-0.5 bg-slate-100 rounded">{catalog.catalog_type}</span>
                    {catalog.last_updated &&
                <span>Act. {new Date(catalog.last_updated).toLocaleDateString()}</span>
                }
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {catalog.url &&
              <a href={catalog.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-blue-500 hover:bg-blue-50 rounded">
                      <LinkIcon className="w-4 h-4" />
                    </a>
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