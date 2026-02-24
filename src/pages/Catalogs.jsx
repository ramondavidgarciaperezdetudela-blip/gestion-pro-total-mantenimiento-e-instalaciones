import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link as LinkIcon, Download, FileText, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = {
  'clima': { label: 'Climatización', color: 'bg-blue-50 border-blue-200' },
  'refrigeracion': { label: 'Refrigeración', color: 'bg-cyan-50 border-cyan-200' },
  'electrico': { label: 'Eléctrico', color: 'bg-yellow-50 border-yellow-200' },
  'solar': { label: 'Solar', color: 'bg-orange-50 border-orange-200' },
  'fontaneria': { label: 'Fontanería', color: 'bg-green-50 border-green-200' },
  'general': { label: 'General', color: 'bg-gray-50 border-gray-200' }
};

export default function Catalogs() {
  const [catalogs, setCatalogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCatalogs();
  }, []);

  const loadCatalogs = async () => {
    setLoading(true);
    const data = await base44.entities.SupplierCatalog.list('-created_date', 1000);
    setCatalogs(data || []);
    setLoading(false);
  };

  const filteredCatalogs = catalogs.filter(c => {
    const matchCategory = !selectedCategory || c.supplier_category === selectedCategory;
    const matchSearch = !searchQuery || 
      c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const catalogsByCategory = Object.keys(CATEGORIES).reduce((acc, cat) => {
    acc[cat] = filteredCatalogs.filter(c => c.supplier_category === cat);
    return acc;
  }, {});

  const CatalogCard = ({ catalog }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-sm">{catalog.title}</h3>
              <span className="text-[10px] bg-slate-100 rounded px-2 py-1">{catalog.catalog_type}</span>
            </div>
            <p className="text-xs text-gray-600 mb-2">{catalog.supplier_name}</p>
            {catalog.description && (
              <p className="text-xs text-gray-500 mb-2">{catalog.description}</p>
            )}
            {catalog.last_updated && (
              <p className="text-[10px] text-gray-400">
                Actualizado: {new Date(catalog.last_updated).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {catalog.url && (
              <a
                href={catalog.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                title="Abrir catálogo"
              >
                <LinkIcon className="w-4 h-4" />
              </a>
            )}
            {catalog.file_url && (
              <a
                href={catalog.file_url}
                download
                className="p-2 text-green-500 hover:bg-green-50 rounded-lg"
                title="Descargar"
              >
                <Download className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Catálogos de Proveedores</h1>
        <Button onClick={loadCatalogs} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-64">
          <Input
            placeholder="Buscar catálogos, proveedores..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-9"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>Todas las categorías</SelectItem>
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <SelectItem key={key} value={key}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-8">Cargando catálogos...</p>
      ) : Object.values(catalogsByCategory).some(cats => cats.length > 0) ? (
        <div className="space-y-6">
          {Object.entries(catalogsByCategory).map(([category, cats]) => (
            cats.length > 0 && (
              <div key={category}>
                <div className={`border rounded-lg p-4 mb-3 ${CATEGORIES[category].color}`}>
                  <h2 className="font-semibold text-lg">{CATEGORIES[category].label}</h2>
                  <p className="text-sm text-gray-600">{cats.length} catálogo{cats.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {cats.map(catalog => (
                    <CatalogCard key={catalog.id} catalog={catalog} />
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No hay catálogos disponibles</p>
          <p className="text-xs mt-2">Añade catálogos a tus proveedores</p>
        </div>
      )}
    </div>
  );
}