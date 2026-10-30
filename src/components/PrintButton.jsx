import React from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Printer, FileDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { printDocument } from '@/lib/printHelper';
import { cssDelDiseno } from '@/lib/disenoDocumento';

function getPdfStyles(cfg = {}) {
  const mt = cfg.margin_top || 15;
  const mb = cfg.margin_bottom || 15;
  const ml = cfg.margin_left || 15;
  const mr = cfg.margin_right || 15;
  const paper = cfg.paper_size || 'A4';
  const font = cfg.font_family || 'Segoe UI';
  const fontSize = cfg.font_size === 'small' ? '8px' : cfg.font_size === 'large' ? '11px' : '9.5px';
  const fitPage = cfg.fit_to_page !== false;
  const avoidBreaks = cfg.avoid_table_breaks !== false;

  return `
  @page {
    size: ${paper} portrait;
    margin: ${mt}mm ${mr}mm ${mb}mm ${ml}mm;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    font-family: '${font}', Arial, sans-serif;
    color: #1a1a2e;
    background: #fff;
    font-size: ${fontSize};
    line-height: 1.45;
  }
  ${fitPage ? `
  @media print {
    html, body { width: ${paper === 'A5' ? '148mm' : paper === 'Carta' ? '216mm' : '210mm'}; }
  }` : ''}
  ${avoidBreaks ? `
  table { page-break-inside: auto; }
  tr { page-break-inside: avoid; page-break-after: auto; }
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }
  .section-card { page-break-inside: avoid; }
  ` : ''}
  ${cssDelDiseno(cfg)}`
}

const PDF_STYLES_STATIC = `
  .page-wrapper {
    width: 100%;
  }

  /* Header empresa */
  .company-header { display: flex; align-items: center; gap: 14px; padding: 10px 14px; background: linear-gradient(135deg, #1e3a5f 0%, #2d5f8a 100%); color: white; border-radius: 6px; margin-bottom: 12px; }
  .company-header img { width: var(--logo-w, 35mm); height: var(--logo-h, 20mm); max-width: var(--logo-w, 35mm); max-height: var(--logo-h, 20mm); object-fit: contain; background: white; border-radius: 4px; padding: 4px; flex-shrink: 0; display: block; }
  .company-header h1 { font-size: 14px; font-weight: 700; margin: 0 0 4px; }
  .company-header p { font-size: 8.5px; opacity: 0.85; margin: 0; }

  /* Título del documento */
  .doc-title { font-size: 14px; font-weight: 700; color: #1e3a5f; border-bottom: 3px solid #0ea5e9; padding-bottom: 6px; margin-bottom: 12px; }

  /* KPI cards */
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; }
  .kpi-box { padding: 9px 6px; border-radius: 6px; text-align: center; border: 1px solid #e2e8f0; }
  .kpi-box .val { font-size: 14px; font-weight: 700; }
  .kpi-box .lbl { font-size: 8px; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; }
  .kpi-box .sub { font-size: 8px; color: #94a3b8; }
  .kpi-amber { background: #fffbeb; color: #d97706; border-color: #fde68a; }
  .kpi-blue { background: #eff6ff; color: #2563eb; border-color: #bfdbfe; }
  .kpi-green { background: #f0fdf4; color: #16a34a; border-color: #bbf7d0; }
  .kpi-purple { background: #faf5ff; color: #7c3aed; border-color: #e9d5ff; }
  .kpi-orange { background: #fff7ed; color: #ea580c; border-color: #fed7aa; }

  /* Info box */
  .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #0ea5e9; border-radius: 5px; padding: 8px 12px; margin-bottom: 10px; }
  .info-box p { margin-bottom: 2px; font-size: 9px; }
  .info-box strong { color: #1e3a5f; }

  /* Sección título */
  .section-title { font-size: 10px; font-weight: 700; color: #1e3a5f; margin: 12px 0 6px; padding: 5px 9px; background: #f1f5f9; border-left: 4px solid #0ea5e9; border-radius: 0 5px 5px 0; }

  /* Tablas — fuente más compacta para caber en A4 */
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 8px; table-layout: fixed; }
  thead tr { background: #1e3a5f; color: white; }
  thead th { padding: 5px 6px; text-align: left; font-weight: 600; overflow: hidden; word-break: break-word; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  tbody td { padding: 4px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top; overflow: hidden; word-break: break-word; }
  tfoot tr { background: #1e3a5f; color: white; font-weight: 700; }
  tfoot td { padding: 5px 6px; }

  /* Tabla amber */
  .table-amber thead tr { background: #92400e; }
  .table-green thead tr { background: #166534; }
  .table-purple thead tr { background: #4c1d95; }
  .table-blue thead tr { background: #1e40af; }

  /* Diagrama SVG — escalar para que quepa */
  svg { max-width: 100%; height: auto; display: block; margin: 0 auto; }

  /* Footer */
  .doc-footer { margin-top: 16px; padding-top: 8px; border-top: 2px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; color: #94a3b8; font-size: 8px; }

  /* Tarjeta sección */
  .section-card { border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 14px; overflow: hidden; page-break-inside: avoid; }
  .section-card-header { padding: 8px 14px; font-weight: 700; font-size: 11px; }
  .section-card-header.amber { background: #fef3c7; color: #92400e; border-bottom: 1px solid #fde68a; }
  .section-card-header.green { background: #dcfce7; color: #166534; border-bottom: 1px solid #bbf7d0; }
  .section-card-body { padding: 10px 14px; }

  /* Alertas */
  .note-box { background: #fefce8; border: 1px solid #fde047; border-radius: 5px; padding: 6px 10px; font-size: 8px; color: #713f12; margin-top: 8px; }

  /* Ocultar controles de la app */
  .no-print, button, [role="button"] { display: none !important; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page-break { page-break-before: always; }
  }
`;

function buildPrintHTML(title, content, cfg = {}) {
  const date = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const logoW = cfg.logo_width_mm || 35;
  const logoH = cfg.logo_height_mm || 20;
  const footerText = cfg.footer_text || 'Documento confidencial';
  const headerText = cfg.header_text || '';
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    :root { --logo-w: ${logoW}mm; --logo-h: ${logoH}mm; }
    ${getPdfStyles(cfg)}
    ${PDF_STYLES_STATIC}
  </style>
</head>
<body>
  <div class="page-wrapper">
    ${headerText ? `<div style="text-align:center;font-size:8px;color:#64748b;padding:4px 0 8px;border-bottom:1px solid #e2e8f0;margin-bottom:8px;">${headerText}</div>` : ''}
    ${content}
    <div class="doc-footer">
      <span>Generado el ${date}</span>
      <span>${title}</span>
      <span>${footerText}</span>
    </div>
  </div>
</body>
</html>`;
}

export default function PrintButton({ contentRef, title = "Documento", className = "" }) {
  const openPrintWindow = async () => {
    const el = contentRef?.current;
    if (!el) return;
    let cfg = {};
    try {
      const settings = await base44.entities.CompanySettings.list();
      if (settings.length > 0) cfg = settings[0].printer_config || {};
    } catch(e) {}
    const html = buildPrintHTML(title, el.innerHTML, cfg);
    printDocument(html, title);
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