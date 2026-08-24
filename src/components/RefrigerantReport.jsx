import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { PrinterIcon, Download, Edit2, Save } from 'lucide-react';
import { REFRIGERANT_DATABASE } from '@/components/refrigerantData';

export default function RefrigerantReport() {
  const [editMode, setEditMode] = useState(false);
  const [notes, setNotes] = useState('');
  const [title, setTitle] = useState('Informe de Refrigerantes - Normativa F-Gas');

  const getCategoryConfig = (category) => {
    const configs = {
      moderno: { badge: 'bg-blue-100 text-blue-800', header: '✓ RECOMENDADO (Moderno)', order: 1 },
      transicion: { badge: 'bg-yellow-100 text-yellow-800', header: '⚠️ TRANSICIÓN', order: 2 },
      natural: { badge: 'bg-green-100 text-green-800', header: '🌱 NATURALES', order: 3 },
      futuro: { badge: 'bg-purple-100 text-purple-800', header: '🔮 FUTURO', order: 4 },
      antiguo: { badge: 'bg-red-100 text-red-800', header: '❌ PROHIBIDO', order: 5 },
    };
    return configs[category] || configs.moderno;
  };

  const groupedRefrigerants = REFRIGERANT_DATABASE.reduce((acc, ref) => {
    const cat = ref.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(ref);
    return acc;
  }, {});

  const orderedGroups = Object.keys(groupedRefrigerants).sort(
    (a, b) => getCategoryConfig(a).order - getCategoryConfig(b).order
  );

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const styles = `
      <style>
        @media print {
          body { margin: 0; padding: 10mm; font-family: Arial, sans-serif; }
          .no-print { display: none; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #333; padding: 8px; text-align: left; }
          th { background-color: #f0f0f0; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .category-header { background-color: #e0e0e0; font-weight: bold; font-size: 12px; }
          .badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 10px; }
          .page-break { page-break-after: always; }
        }
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { font-size: 24px; color: #333; margin: 20px 0 10px; }
        .info-section { margin: 20px 0; padding: 10px; background-color: #f9f9f9; border-left: 3px solid #0ea5e9; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background-color: #f0f0f0; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .category-header { background-color: #e8e8e8; font-weight: bold; font-size: 12px; text-align: center; }
        .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; margin: 2px; }
        .moderno { background-color: #dbeafe; color: #1e40af; }
        .transicion { background-color: #fef3c7; color: #92400e; }
        .natural { background-color: #dcfce7; color: #166534; }
        .futuro { background-color: #e9d5ff; color: #6b21a8; }
        .antiguo { background-color: #fee2e2; color: #991b1b; }
        .footer { margin-top: 30px; font-size: 10px; color: #666; border-top: 1px solid #ccc; padding-top: 10px; }
      </style>
    `;

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        ${styles}
      </head>
      <body>
        <h1>${title}</h1>
        <div class="info-section">
          <p><strong>Fecha del informe:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
          <p><strong>Regulación:</strong> Reglamento (UE) 2024/573 sobre gases fluorados de efecto invernadero (F-Gas), que sustituyó al 517/2014</p>
        </div>
    `;

    if (notes) {
      html += `
        <div class="info-section">
          <p><strong>Notas:</strong></p>
          <p>${notes.replace(/\n/g, '<br>')}</p>
        </div>
      `;
    }

    orderedGroups.forEach((category) => {
      const config = getCategoryConfig(category);
      html += `
        <table>
          <thead>
            <tr class="category-header">
              <td colspan="6">${config.header}</td>
            </tr>
            <tr>
              <th>Código</th>
              <th>Tipo</th>
              <th>GWP</th>
              <th>Hasta Prohibición</th>
              <th>Sustituto</th>
              <th>Retrofit</th>
            </tr>
          </thead>
          <tbody>
      `;

      groupedRefrigerants[category].forEach((ref) => {
        const banDate = ref.fgas_ban_date ? new Date(ref.fgas_ban_date).toLocaleDateString('es-ES') : 'N/A';
        html += `
          <tr>
            <td><strong>${ref.code}</strong></td>
            <td>${ref.type}</td>
            <td>${ref.gwp}</td>
            <td>${ref.fgas_status}</td>
            <td>${ref.replacement || '-'}</td>
            <td>${ref.retrofit_type}</td>
          </tr>
        `;
      });

      html += `
          </tbody>
        </table>
      `;
    });

    html += `
      <div class="footer">
        <p>Este informe contiene información regulatoria sobre refrigerantes según el Reglamento (UE) 2024/573.</p>
        <p>Para información técnica completa, consultar con personal especializado.</p>
      </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownloadCSV = () => {
    let csv = `${title}\n`;
    csv += `Fecha: ${new Date().toLocaleDateString('es-ES')}\n\n`;

    orderedGroups.forEach((category) => {
      const config = getCategoryConfig(category);
      csv += `\n${config.header}\n`;
      csv += `Código,Tipo,GWP,Hasta Prohibición,Sustituto,Retrofit\n`;

      groupedRefrigerants[category].forEach((ref) => {
        csv += `"${ref.code}","${ref.type}","${ref.gwp}","${ref.fgas_status}","${ref.replacement || '-'}","${ref.retrofit_type}"\n`;
      });
    });

    if (notes) {
      csv += `\n\nNotas:\n${notes}\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `refrigerantes-fgas-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>📋 Tabla de Refrigerantes - Normativa F-Gas</CardTitle>
          <div className="flex gap-2">
            {editMode ? (
              <Button size="sm" variant="default" onClick={() => setEditMode(false)}>
                <Save className="w-4 h-4 mr-1" /> Listo
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setEditMode(true)}>
                <Edit2 className="w-4 h-4 mr-1" /> Editar
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handlePrint}>
              <PrinterIcon className="w-4 h-4 mr-1" /> Imprimir
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownloadCSV}>
              <Download className="w-4 h-4 mr-1" /> CSV
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {editMode && (
            <>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Título del informe</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Notas del informe</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Añade notas, observaciones o recomendaciones..."
                  className="text-sm"
                  rows={3}
                />
              </div>
            </>
          )}

          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              {orderedGroups.map((category) => {
                const config = getCategoryConfig(category);
                return (
                  <React.Fragment key={category}>
                    <thead>
                      <tr className={`${config.badge} text-xs font-bold`}>
                        <th colSpan="6" className="p-2 text-left">
                          {config.header}
                        </th>
                      </tr>
                      <tr className="bg-gray-100 border-b">
                        <th className="p-2 border-r border-gray-300 font-semibold">Código</th>
                        <th className="p-2 border-r border-gray-300 font-semibold">Tipo</th>
                        <th className="p-2 border-r border-gray-300 font-semibold">GWP</th>
                        <th className="p-2 border-r border-gray-300 font-semibold">Hasta Prohibición</th>
                        <th className="p-2 border-r border-gray-300 font-semibold">Sustituto</th>
                        <th className="p-2 font-semibold">Retrofit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedRefrigerants[category].map((ref) => (
                        <tr key={ref.code} className="border-b hover:bg-gray-50">
                          <td className="p-2 border-r border-gray-300">
                            <span className="font-bold text-gray-900">{ref.code}</span>
                          </td>
                          <td className="p-2 border-r border-gray-300 text-xs text-gray-700">{ref.type}</td>
                          <td className="p-2 border-r border-gray-300 font-semibold text-gray-900">{ref.gwp}</td>
                          <td className="p-2 border-r border-gray-300">
                            <Badge className={`text-xs ${config.badge}`}>
                              {ref.fgas_status}
                            </Badge>
                          </td>
                          <td className="p-2 border-r border-gray-300 text-xs text-gray-700">
                            {ref.replacement ? <span className="text-green-700 font-semibold">{ref.replacement}</span> : '-'}
                          </td>
                          <td className="p-2 text-xs">
                            <span className={ref.retrofit_type.includes('NO') ? 'text-red-700 font-semibold' : 'text-green-700 font-semibold'}>
                              {ref.retrofit_type.includes('NO') ? '❌' : '✓'} {ref.retrofit_type.substring(0, 20)}...
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </React.Fragment>
                );
              })}
            </table>
          </div>

          {/* Leyenda */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 p-3 bg-gray-50 rounded-lg text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 font-semibold">Moderno</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800 font-semibold">Transición</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded bg-green-100 text-green-800 font-semibold">Natural</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded bg-purple-100 text-purple-800 font-semibold">Futuro</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded bg-red-100 text-red-800 font-semibold">Prohibido</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-xs text-gray-600 border-t pt-3">
            <p className="mb-1"><strong>Fuente normativa:</strong> Reglamento (UE) 2024/573 sobre gases fluorados de efecto invernadero</p>
            <p>Generado: {new Date().toLocaleString('es-ES')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}