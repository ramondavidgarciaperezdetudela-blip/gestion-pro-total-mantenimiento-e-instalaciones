import { construirPaquetePDF, opcionesPorDefecto, nombreArchivo } from '@/lib/planoPaquete';
import { exportarDXFPorHojas } from '@/lib/planoDxfExport';

// Exportación e impresión del plano, POR APARTADOS: plano frigorífico (con su
// leyenda y los datos de los elementos), plano eléctrico (con su leyenda),
// cálculos y medidas, y vista 3D; cada uno en su hoja, en vertical u
// horizontal según se elija. La parte pesada está en lib/planoPaquete.js
// (PDF e impresión) y lib/planoDxfExport.js (CAD).

const datosDe = (plan, elements, walls, connections, presupuesto, empresa) => ({
  plan, elements, walls, connections, empresa: empresa || {}, presupuesto: presupuesto || null,
});

export function construirPDF(plan, elements, walls, connections, { autoPrint = false, presupuesto = null, empresa = {}, opciones } = {}) {
  return construirPaquetePDF(datosDe(plan, elements, walls, connections, presupuesto, empresa), { ...(opciones || opcionesPorDefecto()), autoPrint });
}

export function exportarPDF(plan, elements, walls, connections, presupuesto = null, empresa = {}, opciones) {
  const doc = construirPDF(plan, elements, walls, connections, { presupuesto, empresa, opciones });
  doc.save(nombreArchivo(plan, 'pdf'));
}

export function imprimirPlano(plan, elements, walls, connections, presupuesto = null, empresa = {}, opciones) {
  const doc = construirPDF(plan, elements, walls, connections, { autoPrint: true, presupuesto, empresa, opciones });
  window.open(doc.output('bloburl'), '_blank');
}

export function exportarCAD(plan, elements, walls, connections, presupuesto = null, empresa = {}, opciones) {
  return exportarDXFPorHojas(datosDe(plan, elements, walls, connections, presupuesto, empresa), opciones || opcionesPorDefecto());
}
