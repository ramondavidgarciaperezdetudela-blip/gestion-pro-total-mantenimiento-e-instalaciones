import React from 'react';
import { Button } from "@/components/ui/button";
import { Printer, FileDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PDF_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: #fff; font-size: 11px; line-height: 1.5; }
  
  /* Header empresa */
  .company-header { display: flex; align-items: center; gap: 16px; padding: 16px 20px; background: linear-gradient(135deg, #1e3a5f 0%, #2d5f8a 100%); color: white; border-radius: 8px; margin-bottom: 20px; }
  .company-header img { width: 60px; height: 60px; object-fit: contain; background: white; border-radius: 6px; padding: 4px; }
  .company-header h1 { font-size: 18px; font-weight: 700; }
  .company-header p { font-size: 10px; opacity: 0.85; }

  /* Título del documento */
  .doc-title { font-size: 16px; font-weight: 700; color: #1e3a5f; border-bottom: 3px solid #0ea5e9; padding-bottom: 8px; margin-bottom: 16px; }

  /* KPI cards */
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
  .kpi-box { padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0; }
  .kpi-box .val { font-size: 18px; font-weight: 700; }
  .kpi-box .lbl { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
  .kpi-box .sub { font-size: 9px; color: #94a3b8; }
  .kpi-amber { background: #fffbeb; color: #d97706; border-color: #fde68a; }
  .kpi-blue { background: #eff6ff; color: #2563eb; border-color: #bfdbfe; }
  .kpi-green { background: #f0fdf4; color: #16a34a; border-color: #bbf7d0; }
  .kpi-purple { background: #faf5ff; color: #7c3aed; border-color: #e9d5ff; }
  .kpi-orange { background: #fff7ed; color: #ea580c; border-color: #fed7aa; }

  /* Info box */
  .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #0ea5e9; border-radius: 6px; padding: 10px 14px; margin-bottom: 14px; }
  .info-box p { margin-bottom: 3px; font-size: 10.5px; }
  .info-box strong { color: #1e3a5f; }

  /* Sección título */
  .section-title { font-size: 12px; font-weight: 700; color: #1e3a5f; margin: 18px 0 8px; padding: 6px 10px; background: #f1f5f9; border-left: 4px solid #0ea5e9; border-radius: 0 6px 6px 0; }

  /* Tablas */
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 9.5px; }
  thead tr { background: #1e3a5f; color: white; }
  thead th { padding: 7px 8px; text-align: left; font-weight: 600; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  tbody td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  tfoot tr { background: #1e3a5f; color: white; font-weight: 700; }
  tfoot td { padding: 7px 8px; }

  /* Tabla amber */
  .table-amber thead tr { background: #92400e; }
  .table-green thead tr { background: #166534; }
  .table-purple thead tr { background: #4c1d95; }
  .table-blue thead tr { background: #1e40af; }

  /* Diagrama SVG */
  svg { max-width: 100%; height: auto; }

  /* Footer */
  .doc-footer { margin-top: 24px; padding-top: 12px; border-top: 2px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; color: #94a3b8; font-size: 9px; }

  /* Tarjeta sección */
  .section-card { border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 18px; overflow: hidden; page-break-inside: avoid; }
  .section-card-header { padding: 10px 16px; font-weight: 700; font-size: 13px; }
  .section-card-header.amber { background: #fef3c7; color: #92400e; border-bottom: 1px solid #fde68a; }
  .section-card-header.green { background: #dcfce7; color: #166534; border-bottom: 1px solid #bbf7d0; }
  .section-card-body { padding: 14px 16px; }

  /* Alertas */
  .note-box { background: #fefce8; border: 1px solid #fde047; border-radius: 6px; padding: 8px 12px; font-size: 9px; color: #713f12; margin-top: 12px; }

  .no-print, button { display: none !important; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page-break { page-break-before: always; }
  }
`;

function buildPrintHTML(title, content) {
  const date = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>${PDF_STYLES}</style>
</head>
<body>
  ${content}
  <div class="doc-footer">
    <span>Generado el ${date}</span>
    <span>${title}</span>
    <span>Documento confidencial</span>
  </div>
</body>
</html>`;
}

export default function PrintButton({ contentRef, title = "Documento", className = "" }) {
  const openPrintWindow = () => {
    const el = contentRef?.current;
    if (!el) return;
    const win = window.open('', '_blank');
    win.document.write(buildPrintHTML(title, el.innerHTML));
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 600);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Printer className="w-4 h-4 mr-2" />
          Imprimir / PDF
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={openPrintWindow}>
          <Printer className="w-4 h-4 mr-2" />
          Imprimir en papel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={openPrintWindow}>
          <FileDown className="w-4 h-4 mr-2" />
          Exportar como PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}