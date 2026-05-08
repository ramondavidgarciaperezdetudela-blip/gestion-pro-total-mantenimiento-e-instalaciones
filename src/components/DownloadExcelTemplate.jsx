import { utils, writeFile } from 'xlsx';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

/**
 * Genera y descarga un .xlsx de plantilla con la estructura exacta
 * que necesita el importador de tarifas de proveedor.
 */
export default function DownloadExcelTemplate({ size = 'sm' }) {
  const handleDownload = () => {
    // ── Hoja 1: Plantilla a rellenar ──────────────────────────────────────
    const headers = [
      'referencia',
      'descripcion',
      'marca',
      'precio_neto',
      'unidad',
      'categoria',
      'notas',
    ];

    const ejemplos = [
      ['CAB-001',  'Cable eléctrico flexible 1.5mm² negro',           'Prysmian', 0.85,   'm',     'electrico',      'Disponible en rollo de 100m'],
      ['CAB-002',  'Cable eléctrico flexible 2.5mm² negro',           'Prysmian', 1.20,   'm',     'electrico',      ''],
      ['CLI-204',  'Split mural inverter 2250 frigorías',              'Daikin',   649.00, 'ud',    'clima',          'Mod. FTXC25C – incluye control remoto'],
      ['CLI-205',  'Split mural inverter 3500 frigorías',              'Daikin',   749.00, 'ud',    'clima',          'Mod. FTXC35C'],
      ['CLI-401',  'Unidad exterior inverter R-32 3,5kW',             'Mitsubishi',580.00,'ud',    'clima',          'Compresor rotativo'],
      ['REF-R32',  'Gas refrigerante R-32 10kg',                      'Dupont',    72.50, 'bote',  'refrigeracion',  'Cilindro recargable'],
      ['REF-R410', 'Gas refrigerante R-410A 10kg',                    'Honeywell', 68.00, 'bote',  'refrigeracion',  ''],
      ['TUB-14',   'Tubería cobre 14mm rollo 50m',                    'Wieland',   88.00, 'rollo', 'clima',          'Recocida, pared 0.8mm'],
      ['TUB-22',   'Tubería cobre 22mm rollo 25m',                    'Wieland',  112.00, 'rollo', 'clima',          ''],
      ['SOL-300',  'Panel solar monocristalino 300W',                 'Jinko',     95.00, 'ud',    'solar',          'Garantía 25 años rendimiento'],
      ['SOL-INV',  'Inversor solar monofásico 3kW',                   'Huawei',   420.00, 'ud',    'solar',          'Con monitorización WiFi'],
      ['BAT-5K',   'Batería litio 5kWh para autoconsumo',             'BYD',      1850.00,'ud',    'solar',          'Ciclos: 6000'],
      ['AIST-50',  'Aislamiento armaflex 13mm rollo 10m',             'Armacell',  18.50, 'rollo', 'clima',          ''],
      ['FONT-15',  'Tubería PEX 15mm rollo 50m',                      'Uponor',    42.00, 'rollo', 'fontaneria',     ''],
      ['ELEC-DIF', 'Diferencial 40A 30mA 2P',                         'Schneider', 28.90, 'ud',    'electrico',      'Curva AC'],
    ];

    const wsData = [headers, ...ejemplos];
    const ws = utils.aoa_to_sheet(wsData);

    // Anchos de columna
    ws['!cols'] = [
      { wch: 12 }, // referencia
      { wch: 45 }, // descripcion
      { wch: 14 }, // marca
      { wch: 12 }, // precio_neto
      { wch: 8  }, // unidad
      { wch: 16 }, // categoria
      { wch: 35 }, // notas
    ];

    // ── Hoja 2: Instrucciones ─────────────────────────────────────────────
    const instrData = [
      ['INSTRUCCIONES DE IMPORTACIÓN'],
      [''],
      ['COLUMNA',        'OBLIGATORIA', 'DESCRIPCIÓN',                                              'VALORES ACEPTADOS / EJEMPLOS'],
      ['referencia',     'No',          'Código o SKU del producto',                                 'CAB-001 · TUB-14 · CLI-204'],
      ['descripcion',    'SÍ',          'Nombre completo del producto',                              'Cable eléctrico 1.5mm² negro'],
      ['marca',          'No',          'Fabricante o marca',                                        'Daikin · Prysmian · Jinko'],
      ['precio_neto',    'SÍ',          'Precio numérico SIN símbolo € y con punto como decimal',   '0.85 · 649.00 · 1850'],
      ['unidad',         'No',          'Unidad de medida',                                          'ud · m · m2 · kg · l · rollo · bote'],
      ['categoria',      'No',          'Categoría del producto',                                    'clima · refrigeracion · electrico · solar · fontaneria · material · otro'],
      ['notas',          'No',          'Descripción técnica adicional (máx. 150 caracteres)',       'Modelo FTXC25C · Pared 0.8mm'],
      [''],
      ['CONSEJOS IMPORTANTES'],
      ['1. El precio debe ser un número puro: usa punto (.) como decimal, NO coma. Ejemplo correcto: 649.00  ❌ Incorrecto: 649,00 €'],
      ['2. La primera fila debe ser la cabecera (igual que en la hoja "Plantilla").'],
      ['3. No dejes filas completamente vacías en medio del listado.'],
      ['4. El archivo puede llamarse con cualquier nombre, pero debe ser .xlsx, .xls o .csv.'],
      ['5. Los nombres de columna pueden variar: el sistema también acepta precio, pvp, tarifa, coste, importe, cod, art, articulo…'],
      ['6. Las columnas pueden estar en cualquier orden.'],
    ];

    const wsInstr = utils.aoa_to_sheet(instrData);
    wsInstr['!cols'] = [{ wch: 16 }, { wch: 13 }, { wch: 55 }, { wch: 50 }];

    // ── Libro ─────────────────────────────────────────────────────────────
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Plantilla');
    utils.book_append_sheet(wb, wsInstr, 'Instrucciones');

    writeFile(wb, 'plantilla_tarifa_proveedor.xlsx');
  };

  return (
    <Button
      size={size}
      variant="outline"
      className="border-blue-300 text-blue-700 hover:bg-blue-50 gap-1.5"
      onClick={handleDownload}
    >
      <Download className="w-3.5 h-3.5" />
      Descargar plantilla Excel
    </Button>
  );
}