/**
 * modelosLegalizacion.js — Los documentos de legalización, dentro del programa.
 *
 * Por qué existe esto: los modelos vivían en una función del servidor
 * (`downloadLegalDocuments`) y había que "descargarlos" cada vez. Si esa
 * función no estaba publicada, o no había cobertura, o se habían acabado los
 * créditos de la IA, el botón se quedaba girando y no salía ningún documento.
 *
 * Un modelo de documento no es información que haya que ir a buscar a ningún
 * sitio: es un papel en blanco con sus apartados. Así que va aquí dentro, se
 * abre al instante, funciona en la furgoneta sin cobertura y no gasta ni un
 * crédito. Solo hay que rellenarlo, guardarlo e imprimirlo.
 *
 * Los huecos van con guiones bajos (_______) para poder escribir a mano o a
 * boli sobre el papel impreso. Lo que el programa ya sabe —empresa, cliente,
 * técnico, gas…— lo rellena solo `rellenarModelo()` de modelosDocumentos.js.
 */

export const LEGALIZACION = {
  solar: [
    {
      id: 'mtd_solar',
      label: 'Memoria Técnica de Diseño (MTD)',
      contenido: `<h2>1. MEMORIA TÉCNICA DE DISEÑO (MTD) - INSTALACIÓN FOTOVOLTAICA</h2>
<p><strong>Referencia Normativa:</strong> RD 244/2019, REBT RD 842/2002</p>

<h3>1.1. DATOS GENERALES</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">CONCEPTO</th>
      <th style="padding:8px;background:#f3f4f6">VALOR</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">Empresa Instaladora</td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">NIF Empresa</td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Titular Instalación</td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">NIF/DNI Titular</td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Dirección Instalación</td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Municipio / Provincia</td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Fecha Proyecto</td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
  </tbody>
</table>

<h3>1.2. DESCRIPCIÓN DE LA INSTALACIÓN</h3>
<p><strong>Modalidad:</strong> Autoconsumo sin excedentes / Autoconsumo con excedentes / Venta total</p>
<p><strong>Ubicación:</strong> Cubierta / Suelo / Fachada / Otro</p>
<p><strong>Descripción:</strong> _______________________</p>

<h3>1.3. COMPONENTES PRINCIPALES</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">COMPONENTE</th>
      <th style="padding:8px;background:#f3f4f6">ESPECIFICACIÓN</th>
      <th style="padding:8px;background:#f3f4f6">CANTIDAD</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">Paneles Fotovoltaicos</td><td style="padding:8px;border:1px solid #ccc">_____ Wp × marca</td><td style="padding:8px;border:1px solid #ccc">_____ uds</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Inversor</td><td style="padding:8px;border:1px solid #ccc">_____ kW marca/modelo</td><td style="padding:8px;border:1px solid #ccc">_____ uds</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Baterías (si aplica)</td><td style="padding:8px;border:1px solid #ccc">_____ kWh marca/modelo</td><td style="padding:8px;border:1px solid #ccc">_____ uds</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Cableado DC</td><td style="padding:8px;border:1px solid #ccc">_____ mm² secc.</td><td style="padding:8px;border:1px solid #ccc">_____ m</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Cableado AC</td><td style="padding:8px;border:1px solid #ccc">_____ mm² secc.</td><td style="padding:8px;border:1px solid #ccc">_____ m</td></tr>
  </tbody>
</table>

<h3>1.4. CÁLCULOS TÉCNICOS</h3>
<p><strong>Potencia Pico Total:</strong> _____ kWp</p>
<p><strong>Producción Estimada Anual:</strong> _____ kWh/año</p>
<p><strong>Rendimiento Global Sistema:</strong> _____ %</p>
<p><strong>Orientación Paneles:</strong> Azimut _____ º | Inclinación _____ º</p>

<h3>1.5. CARACTERÍSTICAS DE SEGURIDAD</h3>
<ul>
  <li>Protección CC: Interruptor DC magnetotérmico _____ A</li>
  <li>Protección AC: Interruptor AC diferencial _____ A / _____ mA</li>
  <li>Puesta a tierra: _____ Ω (medida realizada)</li>
  <li>Toma de tierra: Placa de cobre 1m² enterrada a _____ m</li>
</ul>

<h3>1.6. CONFORMIDAD NORMATIVA</h3>
<p>Esta instalación cumple con:</p>
<ul>
  <li>RD 244/2019 de autoconsumo en España</li>
  <li>REBT (RD 842/2002) y norma UNE 20460</li>
  <li>UNE-EN 61730 (seguridad paneles)</li>
  <li>UNE-EN 62109 (inversores)</li>
</ul>

<h3>1.7. FIRMA TÉCNICO</h3>
<p>Técnico responsable: _______________________</p>
<p>Colegiado nº: _______________________</p>
<p>Fecha: _______________________</p>
<p>Firma: ☐ (espacio para firma)</p>`
    },
    {
      id: 'boletin_solar',
      label: 'Boletín Instalación Baja Tensión',
      contenido: `<h2>BOLETÍN OFICIAL DE INSTALACIÓN ELÉCTRICA DE BAJA TENSIÓN - FOTOVOLTAICA</h2>
<p><strong>Conforme a REBT RD 842/2002 - ITC-BT-40</strong></p>

<h3>DATOS GENERALES</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Empresa Instaladora:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Nº Colegiado MINCOTUR:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Titular Instalación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Dirección Obra:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Fecha finalización:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
  </tbody>
</table>

<h3>CIRCUITOS Y PROTECCIONES</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">CIRCUITO</th>
      <th style="padding:8px;background:#f3f4f6">PROTECCIÓN (A)</th>
      <th style="padding:8px;background:#f3f4f6">SECCIÓN (mm²)</th>
      <th style="padding:8px;background:#f3f4f6">LONGITUD (m)</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">Paneles - Inversor (DC)</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Inversor - Cuadro (AC)</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Cuadro - Distribuidora</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
  </tbody>
</table>

<h3>PRUEBAS DE SEGURIDAD</h3>
<p><strong>Aislamiento DC:</strong> _____ MΩ ☐ ≥1 MΩ</p>
<p><strong>Aislamiento AC:</strong> _____ MΩ ☐ ≥1 MΩ</p>
<p><strong>Puesta a tierra:</strong> _____ Ω ☐ &lt;80 Ω</p>
<p><strong>Funcionamiento diferencial:</strong> ☐ Correcto</p>

<h3>FIRMA DEL TÉCNICO</h3>
<p style="margin-top:30px">
  Técnico: _______________________ Colegiado: _______________________<br/>
  Firma: ☐ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Fecha: _______________________
</p>`
    },
    {
      id: 'cau_solar',
      label: 'Comunicación de Autoconsumo (CAU)',
      contenido: `<h2>COMUNICACIÓN DE AUTOCONSUMO (CAU) - RD 244/2019</h2>
<p><strong>Formulario oficial de tramitación ante distribuidora</strong></p>

<h3>IDENTIFICACIÓN INSTALACIÓN</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>CUPS:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Distribuidora:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Titular:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>DNI/NIF:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Modalidad:</strong></td><td style="padding:8px;border:1px solid #ccc">☐ Sin excedentes ☐ Con excedentes</td></tr>
  </tbody>
</table>

<h3>CARACTERÍSTICAS INSTALACIÓN</h3>
<p><strong>Potencia pico (kWp):</strong> _______________________</p>
<p><strong>Nº paneles:</strong> _______ × _______ Wp = _______ kWp</p>
<p><strong>Inversor:</strong> _______ kW - _______________________</p>
<p><strong>Baterías (si aplica):</strong> _______ kWh - _______________________</p>

<h3>CONFORMIDAD NORMATIVA</h3>
<ul>
  <li>☐ Conforme RD 244/2019</li>
  <li>☐ Conforme REBT RD 842/2002</li>
  <li>☐ Instalación completada y funcional</li>
  <li>☐ Puesta a tierra verificada</li>
</ul>

<h3>FIRMA SOLICITANTE</h3>
<p style="margin-top:30px">
  Nombre: _______________________ DNI: _______________________<br/>
  Firma: ☐ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Fecha: _______________________
</p>`
    },
    {
      id: 'cie_solar',
      label: 'Certificado de Instalación Eléctrica (CIE)',
      contenido: `<h2>CERTIFICADO DE INSTALACIÓN ELÉCTRICA (CIE) - FOTOVOLTAICA</h2>
<p><strong>Conforme a REBT RD 842/2002 e ITC-BT-40</strong></p>

<h3>DATOS GENERALES</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Empresa Instaladora:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>NIF:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Titular:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Dirección Obra:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Fecha de finalización:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
  </tbody>
</table>

<h3>INSPECCIÓN Y PRUEBAS REALIZADAS</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">PRUEBA</th>
      <th style="padding:8px;background:#f3f4f6">RESULTADO</th>
      <th style="padding:8px;background:#f3f4f6">OBSERVACIONES</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">Continuidad de conductores</td><td style="padding:8px;border:1px solid #ccc">☐ CORRECTO</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Aislamiento (Megaohm)</td><td style="padding:8px;border:1px solid #ccc">_____ MΩ ☐ ≥1 MΩ</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Puesta a tierra</td><td style="padding:8px;border:1px solid #ccc">_____ Ω ☐ &lt;80 Ω</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Protecciones (DIF)</td><td style="padding:8px;border:1px solid #ccc">☐ FUNCIONA</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Seccionamiento</td><td style="padding:8px;border:1px solid #ccc">☐ CORRECTO</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
  </tbody>
</table>

<h3>FIRMA DEL TÉCNICO RESPONSABLE</h3>
<p style="margin-top:30px">El que suscribe, técnico responsable, certifica que la instalación se ha ejecutado conforme a los planos y cálculos presentados y que reúne todas las condiciones de seguridad exigidas por el REBT.</p>

<p style="margin-top:20px">
  Nombre: _______________________ &nbsp;&nbsp; Colegiado nº: _______________________<br/>
  Fecha: _______________________ &nbsp;&nbsp; Firma: ☐
</p>`
    }
  ],
  frio: [
    {
      id: 'cert_frigo',
      label: 'Certificado Instalación Frigorífica',
      contenido: `<h2>CERTIFICADO DE INSTALACIÓN FRIGORÍFICA</h2>
<p><strong>Conforme a RD 138/2011 y RD 115/2017 (F-Gas)</strong></p>

<h3>DATOS GENERALES</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Empresa Instaladora:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>NIF Empresa:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Titular/Cliente:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Localización Equipo:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Fecha de finalización:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
  </tbody>
</table>

<h3>DESCRIPCIÓN DEL EQUIPO FRIGORÍFICO</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">PARÁMETRO</th>
      <th style="padding:8px;background:#f3f4f6">ESPECIFICACIÓN</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">Tipo de Instalación</td><td style="padding:8px;border:1px solid #ccc">☐ Cámara frigorífica ☐ Climatización ☐ Bombas calor ☐ Otra: _____</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Gas Refrigerante</td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">GWP del gas</td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Carga Total (kg)</td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">CO₂ equivalentes (t)</td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Marca Equipo Compresor</td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Modelo / Nº serie</td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Potencia Frigorífica (kW)</td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Temperatura Funcionamiento</td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
  </tbody>
</table>

<h3>PRUEBAS DE HERMETICIDAD Y FUNCIONAMIENTO</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">PRUEBA</th>
      <th style="padding:8px;background:#f3f4f6">RESULTADO</th>
      <th style="padding:8px;background:#f3f4f6">FECHA</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">Presurización a N₂</td><td style="padding:8px;border:1px solid #ccc">_____ bar ☐ Hermético</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Vacío (evacuación)</td><td style="padding:8px;border:1px solid #ccc">≤ 100 Pa ☐ Correcto</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Carga de gas</td><td style="padding:8px;border:1px solid #ccc">_____ kg ☐ Correcto</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Funcionamiento equipo</td><td style="padding:8px;border:1px solid #ccc">☐ Normal ☐ Anómalo: _____</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Test de fugas (electrónico)</td><td style="padding:8px;border:1px solid #ccc">☐ Sin fugas ☐ Detectadas: _____</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
  </tbody>
</table>

<h3>CONFORMIDAD F-GAS (si aplica)</h3>
<p>☐ Este equipo cumple Reglamento (UE) 517/2014 (F-Gas)</p>
<p>☐ Carga ≥ 3 kg CO₂eq — Requiere registro de fugas anual</p>
<p>☐ Se ha entregado manual de mantenimiento al propietario</p>
<p>☐ Se ha registrado en placa del equipo la responsabilidad de mantenimiento</p>

<h3>FIRMA Y CERTIFICACIÓN</h3>
<p style="margin-top:30px">
  Técnico responsable: _______________________<br/>
  Colegiado nº: _______________________<br/>
  Fecha: _______________________ Firma: ☐
</p>`
    },
    {
      id: 'ficha_equipo_fgas',
      label: 'Ficha de Equipo F-Gas',
      contenido: `<h2>FICHA TÉCNICA DE EQUIPO F-GAS</h2>
<p><strong>Conforme a RD 115/2017 y Reglamento (UE) 517/2014</strong></p>

<h3>IDENTIFICACIÓN EQUIPO</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Ubicación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Propietario:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Marca:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Modelo:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Nº serie:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Año fabricación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
  </tbody>
</table>

<h3>DATOS REFRIGERANTE</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Tipo gas:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>GWP:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Carga (kg):</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>CO₂ eq (t):</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
  </tbody>
</table>

<h3>HISTORIAL DE INTERVENCIONES</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">FECHA</th>
      <th style="padding:8px;background:#f3f4f6">TIPO INTERVENCIÓN</th>
      <th style="padding:8px;background:#f3f4f6">CANTIDAD (kg)</th>
      <th style="padding:8px;background:#f3f4f6">TÉCNICO</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">Instalación</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">Revisión/Reposición</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">Control de fugas</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">Recuperación / Retirada</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
  </tbody>
</table>

<h3>FIRMA DEL OPERADOR CERTIFICADO</h3>
<p style="margin-top:20px">
  Técnico responsable: _______________________<br/>
  Nº Carnet F-Gas: _______________________<br/>
  Empresa: _______________________<br/>
  Fecha: _______________________ Firma: ☐
</p>
<p style="margin-top:15px;font-size:11px;color:#666">Ficha de obligada conservación conforme al RD 115/2017 y al Reglamento (UE) 2024/573. Debe mantenerse actualizada durante toda la vida del equipo y estar a disposición de la Administración.</p>`
    },
    {
      id: 'fgas_registro',
      label: 'Registro F-Gas y Libro Seguimiento',
      contenido: `<h2>REGISTRO F-GAS Y LIBRO DE SEGUIMIENTO</h2>
<p><strong>Conforme a RD 115/2017 y Reglamento (UE) 517/2014</strong></p>

<h3>DATOS DEL EQUIPO</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Ubicación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Propietario:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Marca / Modelo equipo:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Nº serie:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Gas refrigerante:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Carga nominal (kg):</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>CO₂ equivalentes (t):</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
  </tbody>
</table>

<h3>REGISTRO DE CARGAS Y RECUPERACIONES</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">FECHA</th>
      <th style="padding:8px;background:#f3f4f6">OPERACIÓN</th>
      <th style="padding:8px;background:#f3f4f6">GAS (kg)</th>
      <th style="padding:8px;background:#f3f4f6">CANTIDAD TOTAL (kg)</th>
      <th style="padding:8px;background:#f3f4f6">TÉCNICO</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">Carga inicial</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">Reposición</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">Recuperación</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
  </tbody>
</table>

<h3>COMPROBACIÓN ANUAL DE FUGAS</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">AÑO</th>
      <th style="padding:8px;background:#f3f4f6">FECHA CONTROL</th>
      <th style="padding:8px;background:#f3f4f6">RESULTADO</th>
      <th style="padding:8px;background:#f3f4f6">TÉCNICO</th>
      <th style="padding:8px;background:#f3f4f6">FIRMA</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">☐ Sin fugas</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">☐</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">☐ Sin fugas</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">☐</td></tr>
  </tbody>
</table>

<p style="margin-top:20px"><strong>Nota importante:</strong> Este documento debe conservarse durante toda la vida útil del equipo y como mínimo 3 años después del desmantelamiento.</p>`
    }
  ],
  clima: [
    {
      id: 'cert_rite',
      label: 'Certificado Instalación RITE',
      contenido: `<h2>CERTIFICADO DE INSTALACIÓN TÉRMICA (RITE)</h2>
<p><strong>Conforme a RD 1027/2007 (RITE) y actualizaciones normativas</strong></p>

<h3>DATOS GENERALES</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Empresa Instaladora:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>NIF:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Propietario/Titular:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Dirección de la instalación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Tipo de edificio:</strong></td><td style="padding:8px;border:1px solid #ccc">☐ Residencial ☐ Terciario ☐ Industrial</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Fecha finalización:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
  </tbody>
</table>

<h3>EQUIPOS INSTALADOS</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">TIPO EQUIPO</th>
      <th style="padding:8px;background:#f3f4f6">MARCA/MODELO</th>
      <th style="padding:8px;background:#f3f4f6">POTENCIA (kW)</th>
      <th style="padding:8px;background:#f3f4f6">RENDIMIENTO (%)</th>
      <th style="padding:8px;background:#f3f4f6">ZONAS</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">Generador (Caldera/Bomba Calor)</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Sistema distribución</td><td style="padding:8px;border:1px solid #ccc">Tuberías / Conductos</td><td style="padding:8px;border:1px solid #ccc">-</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Terminales (Radiadores/Split)</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Sistema control/regulación</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">-</td><td style="padding:8px;border:1px solid #ccc">-</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
  </tbody>
</table>

<h3>CARACTERÍSTICAS TÉCNICAS</h3>
<p><strong>Gas refrigerante (si aplica):</strong> _______________________ &nbsp; GWP: _______________________</p>
<p><strong>Fluido caloportador:</strong> ☐ Aire ☐ Agua ☐ Otro: _______________________</p>
<p><strong>Aislamiento de tuberías:</strong> Espesor ≥ _____ mm ☐ Conforme</p>

<h3>PRUEBAS Y PUESTA EN MARCHA</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">PRUEBA</th>
      <th style="padding:8px;background:#f3f4f6">RESULTADO</th>
      <th style="padding:8px;background:#f3f4f6">FECHA</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">Funcionamiento generador</td><td style="padding:8px;border:1px solid #ccc">☐ Correcto ☐ Anómalo</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Control automático</td><td style="padding:8px;border:1px solid #ccc">☐ Correcto ☐ Anómalo</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Presurización (si circuito cerrado)</td><td style="padding:8px;border:1px solid #ccc">_____ bar ☐ Correcto</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Purgado de aire</td><td style="padding:8px;border:1px solid #ccc">☐ Realizado</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
  </tbody>
</table>

<h3>FIRMA Y CERTIFICACIÓN</h3>
<p style="margin-top:20px">
  Técnico RITE responsable: _______________________<br/>
  Colegiado nº: _______________________<br/>
  Fecha: _______________________ Firma: ☐
</p>`
    },
    {
      id: 'memoria_rite',
      label: 'Memoria Técnica RITE',
      contenido: `<h2>MEMORIA TÉCNICA DE LA INSTALACIÓN TÉRMICA (RITE)</h2>
<p><strong>Conforme a RD 1027/2007 (RITE), IT 1 y modificaciones posteriores</strong></p>

<h3>1. DATOS GENERALES</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Empresa Instaladora:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>NIF Empresa:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Nº Registro Empresa Instaladora:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Titular de la instalación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>NIF/DNI Titular:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Dirección de la instalación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Municipio / Provincia:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Uso del edificio:</strong></td><td style="padding:8px;border:1px solid #ccc">☐ Residencial ☐ Terciario ☐ Industrial</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Fecha del documento:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
  </tbody>
</table>

<h3>2. OBJETO Y ALCANCE</h3>
<p>La presente memoria técnica describe la instalación térmica proyectada, justifica el cumplimiento de las exigencias de bienestar e higiene, eficiencia energética y seguridad recogidas en el RITE, y sirve de documentación para su registro ante el órgano competente de la Comunidad Autónoma.</p>
<p><strong>Tipo de instalación:</strong> ☐ Nueva ☐ Reforma ☐ Ampliación ☐ Sustitución de generador</p>
<p><strong>Potencia térmica nominal total instalada:</strong> _______ kW &nbsp;&nbsp; (☐ &lt; 70 kW: memoria técnica &nbsp; ☐ ≥ 70 kW: proyecto)</p>

<h3>3. DESCRIPCIÓN DE LA INSTALACIÓN</h3>
<p><strong>Sistema empleado:</strong> _______________________ (bomba de calor / caldera / VRF / aerotermia / suelo radiante / fancoils…)</p>
<p><strong>Servicios que presta:</strong> ☐ Calefacción ☐ Refrigeración ☐ ACS ☐ Ventilación</p>
<p><strong>Fluido caloportador:</strong> ☐ Aire ☐ Agua ☐ Refrigerante directo ☐ Otro: _______________________</p>
<p><strong>Gas refrigerante (si aplica):</strong> _______________________ &nbsp; GWP: _______ &nbsp; Carga: _______ kg</p>

<h3>4. CONDICIONES DE DISEÑO (IT 1.1)</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">CONCEPTO</th>
      <th style="padding:8px;background:#f3f4f6">INVIERNO</th>
      <th style="padding:8px;background:#f3f4f6">VERANO</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">Temperatura exterior de cálculo</td><td style="padding:8px;border:1px solid #ccc">_______ °C</td><td style="padding:8px;border:1px solid #ccc">_______ °C</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Temperatura interior de diseño</td><td style="padding:8px;border:1px solid #ccc">21 – 23 °C</td><td style="padding:8px;border:1px solid #ccc">23 – 25 °C</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Humedad relativa de diseño</td><td style="padding:8px;border:1px solid #ccc">40 – 50 %</td><td style="padding:8px;border:1px solid #ccc">45 – 60 %</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Velocidad media del aire</td><td style="padding:8px;border:1px solid #ccc">≤ 0,15 m/s</td><td style="padding:8px;border:1px solid #ccc">≤ 0,20 m/s</td></tr>
  </tbody>
</table>

<h3>5. CARGAS TÉRMICAS POR ZONA</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">ZONA / LOCAL</th>
      <th style="padding:8px;background:#f3f4f6">SUPERFICIE (m²)</th>
      <th style="padding:8px;background:#f3f4f6">CARGA CALEF. (W)</th>
      <th style="padding:8px;background:#f3f4f6">CARGA REFRIG. (W)</th>
      <th style="padding:8px;background:#f3f4f6">EQUIPO TERMINAL</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>TOTAL</strong></td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">—</td></tr>
  </tbody>
</table>

<h3>6. EQUIPOS GENERADORES Y RENDIMIENTOS (IT 1.2)</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">EQUIPO</th>
      <th style="padding:8px;background:#f3f4f6">MARCA / MODELO</th>
      <th style="padding:8px;background:#f3f4f6">POTENCIA (kW)</th>
      <th style="padding:8px;background:#f3f4f6">COP / SCOP</th>
      <th style="padding:8px;background:#f3f4f6">EER / SEER</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">Generador principal</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Generador de apoyo / ACS</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
  </tbody>
</table>

<h3>7. REDES DE DISTRIBUCIÓN Y AISLAMIENTO (IT 1.2.4.2)</h3>
<p><strong>Tuberías:</strong> Material _______________ &nbsp; Diámetros _______________ &nbsp; Aislamiento espesor ≥ _____ mm</p>
<p><strong>Conductos:</strong> Material _______________ &nbsp; Aislamiento espesor ≥ _____ mm &nbsp; Estanquidad clase _______</p>
<p><strong>Justificación:</strong> Los espesores de aislamiento cumplen las tablas 1.2.4.2.1 a 1.2.4.2.5 de la IT 1.2.</p>

<h3>8. VENTILACIÓN Y CALIDAD DEL AIRE INTERIOR (IT 1.1.4.2)</h3>
<p><strong>Categoría de calidad de aire interior:</strong> ☐ IDA 1 ☐ IDA 2 ☐ IDA 3 ☐ IDA 4</p>
<p><strong>Caudal de aire exterior:</strong> _______ l/s por persona &nbsp;&nbsp; Total: _______ m³/h</p>
<p><strong>Filtración:</strong> Clase de filtros _______________ &nbsp; ☐ Recuperador de calor (obligatorio si caudal &gt; 0,5 m³/s)</p>

<h3>9. SEGURIDAD Y CONTROL (IT 1.3 e IT 1.2.4.3)</h3>
<p>☐ Elementos de seguridad: válvula de seguridad, vaso de expansión, termostato de seguridad.<br/>
☐ Control automático de la temperatura por zona (THM-C_____).<br/>
☐ Corte automático del generador por temperatura de consigna.<br/>
☐ Contabilización de consumos según IT 1.2.4.4 (si procede).<br/>
☐ Sala de máquinas conforme a IT 1.3.4.1.2 (si procede).</p>

<h3>10. NORMATIVA APLICADA</h3>
<p>RD 1027/2007 (RITE) y modificaciones (RD 178/2021) · CTE DB-HE · RD 842/2002 (REBT) · RD 115/2017 y Reglamento (UE) 2024/573 sobre gases fluorados · UNE-EN 12831 · UNE-EN 378.</p>

<h3>11. FIRMA</h3>
<p style="margin-top:20px">
  Técnico competente / Instalador habilitado: _______________________<br/>
  Nº Carnet / Colegiado: _______________________<br/>
  Empresa: _______________________<br/>
  Fecha: _______________________ Firma: ☐
</p>
<p style="margin-top:20px"><strong>⚠️ DECLARACIÓN:</strong> El técnico que suscribe declara que la instalación descrita cumple las exigencias del RITE y del resto de reglamentación que le es de aplicación.</p>`
    },
    {
      id: 'libro_mant_rite',
      label: 'Libro de Mantenimiento RITE',
      contenido: `<h2>LIBRO DE MANTENIMIENTO DE LA INSTALACIÓN TÉRMICA</h2>
<p><strong>Conforme a la IT 3 del RITE (RD 1027/2007) — de conservación obligatoria por el titular</strong></p>

<h3>1. IDENTIFICACIÓN</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Titular de la instalación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>NIF/DNI Titular:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Dirección de la instalación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Empresa Mantenedora:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>NIF Empresa:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Nº Registro Empresa Mantenedora:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Potencia térmica nominal:</strong></td><td style="padding:8px;border:1px solid #ccc">_______ kW</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Fecha de puesta en servicio:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
  </tbody>
</table>

<h3>2. PERIODICIDAD EXIGIDA (IT 3.3)</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">POTENCIA TÉRMICA NOMINAL</th>
      <th style="padding:8px;background:#f3f4f6">PERIODICIDAD DE MANTENIMIENTO</th>
      <th style="padding:8px;background:#f3f4f6">APLICA</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">P ≤ 70 kW</td><td style="padding:8px;border:1px solid #ccc">Anual</td><td style="padding:8px;border:1px solid #ccc">☐</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">70 kW &lt; P ≤ 1.000 kW</td><td style="padding:8px;border:1px solid #ccc">Trimestral / semestral según operación</td><td style="padding:8px;border:1px solid #ccc">☐</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">P &gt; 1.000 kW</td><td style="padding:8px;border:1px solid #ccc">Mensual</td><td style="padding:8px;border:1px solid #ccc">☐</td></tr>
  </tbody>
</table>

<h3>3. PROGRAMA DE MANTENIMIENTO PREVENTIVO (IT 3.3)</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">OPERACIÓN</th>
      <th style="padding:8px;background:#f3f4f6">PERIODICIDAD</th>
      <th style="padding:8px;background:#f3f4f6">REALIZADO</th>
      <th style="padding:8px;background:#f3f4f6">OBSERVACIONES</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">Limpieza de los evaporadores</td><td style="padding:8px;border:1px solid #ccc">Anual</td><td style="padding:8px;border:1px solid #ccc">☐</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Limpieza de los condensadores</td><td style="padding:8px;border:1px solid #ccc">Anual</td><td style="padding:8px;border:1px solid #ccc">☐</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Comprobación de estanquidad del circuito de refrigerante</td><td style="padding:8px;border:1px solid #ccc">Según RD 115/2017</td><td style="padding:8px;border:1px solid #ccc">☐</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Comprobación de niveles de refrigerante y aceite</td><td style="padding:8px;border:1px solid #ccc">Anual</td><td style="padding:8px;border:1px solid #ccc">☐</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Revisión y limpieza de filtros de aire</td><td style="padding:8px;border:1px solid #ccc">Anual / según uso</td><td style="padding:8px;border:1px solid #ccc">☐</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Revisión de unidades de tratamiento de aire</td><td style="padding:8px;border:1px solid #ccc">Anual</td><td style="padding:8px;border:1px solid #ccc">☐</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Revisión del sistema de control automático</td><td style="padding:8px;border:1px solid #ccc">Anual</td><td style="padding:8px;border:1px solid #ccc">☐</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Comprobación de elementos de seguridad</td><td style="padding:8px;border:1px solid #ccc">Anual</td><td style="padding:8px;border:1px solid #ccc">☐</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Revisión del vaso de expansión y presión del circuito</td><td style="padding:8px;border:1px solid #ccc">Anual</td><td style="padding:8px;border:1px solid #ccc">☐</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Revisión del estado del aislamiento térmico</td><td style="padding:8px;border:1px solid #ccc">Anual</td><td style="padding:8px;border:1px solid #ccc">☐</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Revisión del depósito de ACS y temperatura de acumulación</td><td style="padding:8px;border:1px solid #ccc">Anual</td><td style="padding:8px;border:1px solid #ccc">☐</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Análisis de combustión (si generador de combustión)</td><td style="padding:8px;border:1px solid #ccc">Anual</td><td style="padding:8px;border:1px solid #ccc">☐</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
  </tbody>
</table>

<h3>4. INSPECCIÓN DE EFICIENCIA ENERGÉTICA (IT 4)</h3>
<p><strong>Última inspección realizada:</strong> _______________________ &nbsp;&nbsp; <strong>Próxima:</strong> _______________________</p>
<p><strong>Resultado:</strong> ☐ Aceptable ☐ Condicionada ☐ Negativa &nbsp;&nbsp; <strong>Nº de acta:</strong> _______________________</p>

<h3>5. REGISTRO DE ACTUACIONES</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">FECHA</th>
      <th style="padding:8px;background:#f3f4f6">TIPO</th>
      <th style="padding:8px;background:#f3f4f6">OPERACIONES REALIZADAS</th>
      <th style="padding:8px;background:#f3f4f6">TÉCNICO</th>
      <th style="padding:8px;background:#f3f4f6">FIRMA</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">☐ Prev. ☐ Corr.</td><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">☐</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">☐ Prev. ☐ Corr.</td><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">☐</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">☐ Prev. ☐ Corr.</td><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">☐</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">☐ Prev. ☐ Corr.</td><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">☐</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">☐ Prev. ☐ Corr.</td><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">☐</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">☐ Prev. ☐ Corr.</td><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">☐</td></tr>
  </tbody>
</table>

<h3>6. INCIDENCIAS Y AVERÍAS</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">FECHA</th>
      <th style="padding:8px;background:#f3f4f6">INCIDENCIA</th>
      <th style="padding:8px;background:#f3f4f6">SOLUCIÓN APLICADA</th>
      <th style="padding:8px;background:#f3f4f6">TÉCNICO</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
  </tbody>
</table>

<h3>7. FIRMA DE LA EMPRESA MANTENEDORA</h3>
<p style="margin-top:20px">
  Técnico mantenedor: _______________________<br/>
  Nº Carnet / Registro: _______________________<br/>
  Fecha: _______________________ Firma: ☐
</p>
<p style="margin-top:20px"><strong>⚠️ AVISO:</strong> Este libro debe permanecer en poder del titular de la instalación y estar a disposición de la Administración durante toda la vida útil de la instalación.</p>`
    }
  ],
  electrico: [
    {
      id: 'memoria_bt',
      label: 'Memoria Descriptiva BT',
      contenido: `<h2>MEMORIA DESCRIPTIVA - INSTALACIÓN ELÉCTRICA BAJA TENSIÓN</h2>
<p><strong>Conforme a REBT RD 842/2002</strong></p>

<h3>DATOS GENERALES</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Empresa Instaladora:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Ubicación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Titular:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Tensión:</strong></td><td style="padding:8px;border:1px solid #ccc">☐ 230V monofásico ☐ 400V trifásico</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Potencia contratada:</strong></td><td style="padding:8px;border:1px solid #ccc">_______ kW</td></tr>
  </tbody>
</table>

<h3>DESCRIPCIÓN INSTALACIÓN</h3>
<p>_________________________________________________________________</p>
<p>_________________________________________________________________</p>

<h3>CÁLCULO DE SECCIONES Y PROTECCIONES</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">CIRCUITO</th>
      <th style="padding:8px;background:#f3f4f6">CARGA (A)</th>
      <th style="padding:8px;background:#f3f4f6">SECCIÓN (mm²)</th>
      <th style="padding:8px;background:#f3f4f6">PROTECCIÓN (A)</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">C1 - _______</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">C2 - _______</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">C3 - _______</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td></tr>
  </tbody>
</table>

<h3>FIRMA TÉCNICO</h3>
<p style="margin-top:30px">
  Técnico: _______________________ Colegiado: _______________________<br/>
  Firma: ☐ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Fecha: _______________________
</p>`
    },
    {
      id: 'boletin_bt',
      label: 'Boletín Instalación BT',
      contenido: `<h2>BOLETÍN OFICIAL DE INSTALACIÓN ELÉCTRICA DE BAJA TENSIÓN</h2>
<p><strong>Conforme a REBT RD 842/2002</strong></p>

<h3>IDENTIFICACIÓN</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Empresa Instaladora:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Nº Colegiado:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Titular:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Ubicación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
  </tbody>
</table>

<h3>DATOS TÉCNICOS</h3>
<p><strong>Tensión:</strong> ☐ 230V ☐ 400V &nbsp;&nbsp; <strong>Potencia:</strong> _______ kW &nbsp;&nbsp; <strong>Esquema:</strong> ☐ TT ☐ TN-S ☐ TN-C-S</p>

<h3>ELEMENTOS DE PROTECCIÓN</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">ELEMENTO</th>
      <th style="padding:8px;background:#f3f4f6">ESPECIFICACIÓN</th>
      <th style="padding:8px;background:#f3f4f6">VERIFICADO</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">IGA (Principal)</td><td style="padding:8px;border:1px solid #ccc">_______ A</td><td style="padding:8px;border:1px solid #ccc">☐</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Diferencial (IID/A)</td><td style="padding:8px;border:1px solid #ccc">_______ A / _______ mA</td><td style="padding:8px;border:1px solid #ccc">☐</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Magnetotérmicos</td><td style="padding:8px;border:1px solid #ccc">Varios según circuitos</td><td style="padding:8px;border:1px solid #ccc">☐</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Toma de tierra</td><td style="padding:8px;border:1px solid #ccc">_______ Ω (&lt;80 Ω)</td><td style="padding:8px;border:1px solid #ccc">☐</td></tr>
  </tbody>
</table>

<h3>FIRMA Y CERTIFICACIÓN</h3>
<p style="margin-top:30px">
  Técnico: _______________________ Colegiado: _______________________<br/>
  Firma: ☐ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Fecha: _______________________
</p>`
    },
    {
      id: 'cie_bt',
      label: 'Certificado Instalación BT (CIE)',
      contenido: `<h2>CERTIFICADO DE INSTALACIÓN ELÉCTRICA BAJA TENSIÓN (CIE-BT)</h2>
<p><strong>Conforme a REBT RD 842/2002 - ITC-BT-01</strong></p>

<h3>DATOS IDENTIFICATIVOS</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Empresa Instaladora:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Nº Colegiado MINCOTUR:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Titular de la instalación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Ubicación instalación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Tipo edificio:</strong></td><td style="padding:8px;border:1px solid #ccc">☐ Vivienda ☐ Terciario ☐ Industrial ☐ Otro</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Fecha finalización:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
  </tbody>
</table>

<h3>CARACTERÍSTICAS GENERALES INSTALACIÓN</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Tensión nominal:</strong></td><td style="padding:8px;border:1px solid #ccc">☐ 230V monofásico ☐ 400V trifásico</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Potencia solicitada:</strong></td><td style="padding:8px;border:1px solid #ccc">________ kW</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Tipo de instalación:</strong></td><td style="padding:8px;border:1px solid #ccc">☐ Fija ☐ Temporal ☐ Provisional</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Esquema conexión:</strong></td><td style="padding:8px;border:1px solid #ccc">☐ TT ☐ TN-S ☐ TN-C-S ☐ IT</td></tr>
  </tbody>
</table>

<h3>PROTECCIONES Y ELEMENTOS DE SEGURIDAD</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">ELEMENTO</th>
      <th style="padding:8px;background:#f3f4f6">ESPECIFICACIÓN</th>
      <th style="padding:8px;background:#f3f4f6">VERIFICACIÓN</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">Interruptor principal</td><td style="padding:8px;border:1px solid #ccc">_____ A tipo _____</td><td style="padding:8px;border:1px solid #ccc">☐ OK</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Diferencial (IID/A)</td><td style="padding:8px;border:1px solid #ccc">_____ A / _____ mA</td><td style="padding:8px;border:1px solid #ccc">☐ OK</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Magnetotérmicos circuitos</td><td style="padding:8px;border:1px solid #ccc">Varios _____ A</td><td style="padding:8px;border:1px solid #ccc">☐ OK</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Toma de tierra</td><td style="padding:8px;border:1px solid #ccc">Ω &lt; 80 Ω medido: _____</td><td style="padding:8px;border:1px solid #ccc">☐ OK</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Conductores protección</td><td style="padding:8px;border:1px solid #ccc">Continuidad verificada</td><td style="padding:8px;border:1px solid #ccc">☐ OK</td></tr>
  </tbody>
</table>

<h3>PRUEBAS DE SEGURIDAD REALIZADAS</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">PRUEBA</th>
      <th style="padding:8px;background:#f3f4f6">RESULTADO</th>
      <th style="padding:8px;background:#f3f4f6">VALOR ACEPTABLE</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">Aislamiento (Megaohm)</td><td style="padding:8px;border:1px solid #ccc">_____ MΩ</td><td style="padding:8px;border:1px solid #ccc">≥ 1 MΩ ☐</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Funcionamiento diferencial</td><td style="padding:8px;border:1px solid #ccc">☐ CORRECTO</td><td style="padding:8px;border:1px solid #ccc">Dispara a I_N</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Continuidad tierra</td><td style="padding:8px;border:1px solid #ccc">☐ VERIFICADO</td><td style="padding:8px;border:1px solid #ccc">&lt; 0,05 Ω</td></tr>
  </tbody>
</table>

<h3>FIRMA DEL TÉCNICO RESPONSABLE</h3>
<p style="margin-top:30px">
  Técnico responsable: _______________________<br/>
  Nº Colegiado: _______________________<br/>
  Fecha: _______________________ Firma: ☐
</p>
<p style="margin-top:20px"><strong>⚠️ DECLARACIÓN:</strong> Certifico que la instalación se ha realizado conforme a los planos y proyecto presentados y que reúne todas las condiciones de seguridad exigidas por el REBT.</p>`
    }
  ]
};
