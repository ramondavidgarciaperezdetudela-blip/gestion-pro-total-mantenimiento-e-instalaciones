import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Templates estándar de documentos legalizados en España - COMPLETOS
const LEGAL_TEMPLATES = {
  solar: [
    {
      id: 'mtd_solar',
      name: 'Memoria Técnica de Diseño (MTD)',
      content: `<h2>1. MEMORIA TÉCNICA DE DISEÑO (MTD) - INSTALACIÓN FOTOVOLTAICA</h2>
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
      id: 'cie_solar',
      name: 'Certificado de Instalación Eléctrica (CIE)',
      content: `<h2>CERTIFICADO DE INSTALACIÓN ELÉCTRICA (CIE) - FOTOVOLTAICA</h2>
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
      name: 'Certificado Instalación Frigorífica',
      content: `<h2>CERTIFICADO DE INSTALACIÓN FRIGORÍFICA</h2>
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
      id: 'fgas_registro',
      name: 'Registro F-Gas y Libro Seguimiento',
      content: `<h2>REGISTRO F-GAS Y LIBRO DE SEGUIMIENTO</h2>
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
      name: 'Certificado Instalación RITE',
      content: `<h2>CERTIFICADO DE INSTALACIÓN TÉRMICA (RITE)</h2>
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
    }
  ],
  electrico: [
    {
      id: 'cie_bt',
      name: 'Certificado Instalación BT (CIE)',
      content: `<h2>CERTIFICADO DE INSTALACIÓN ELÉCTRICA BAJA TENSIÓN (CIE-BT)</h2>
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Crear plantillas en la base de datos
    const templates = [];
    
    for (const [type, docs] of Object.entries(LEGAL_TEMPLATES)) {
      for (const doc of docs) {
        templates.push({
          name: `LEGAL: ${doc.name}`,
          doc_type: type,
          primary_color: '#1e3a5f',
          secondary_color: '#0ea5e9',
          header_text: `Documento de legalización: ${doc.name}`,
          footer_text: 'Documento generado automáticamente - Revisar y firmar antes de presentar',
          show_logo: true,
          show_iban: false,
          show_signature_box: true,
          font_size: 'medium',
          iva_rate: 21,
          is_default: false,
          notes_template: doc.content
        });
      }
    }

    // Crear las plantillas
    const created = await base44.asServiceRole.entities.DocumentTemplate.bulkCreate(templates);
    
    return Response.json({
      success: true,
      message: `Se descargaron ${created.length} plantillas de legalización estándar`,
      templates: created.map(t => ({ id: t.id, name: t.name }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});