/**
 * modelosGenerales.js — Los modelos del resto de documentos, dentro del programa.
 *
 * Lo mismo que modelosLegalizacion.js pero para el papeleo del día a día:
 * partes, contratos, presupuestos, facturas, recibos, actas e informes. Están
 * aquí para que no haya que descargar ningún formato: se elige, se rellena, se
 * guarda en la ficha del cliente y se imprime. Sin servidor y sin IA.
 *
 * Ojo: estos modelos son la hoja en blanco para rellenar a mano o sobre la
 * marcha. Para una factura o un presupuesto con líneas, IVA y totales
 * calculados, sigue estando la pantalla de Facturación, que es la que lleva la
 * numeración. Esto es el papel suelto de "necesito uno ahora y lo relleno yo".
 */

export const GENERALES = {
  trabajo: [
    {
      id: 'parte_trabajo',
      label: 'Parte de trabajo / Orden de servicio',
      contenido: `<h2>PARTE DE TRABAJO — ORDEN DE SERVICIO</h2>
<p><strong>Nº de parte:</strong> _______________________ &nbsp;&nbsp; <strong>Fecha:</strong> _______________________</p>

<h3>1. DATOS DEL CLIENTE Y DE LA EMPRESA</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Empresa:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>NIF Empresa:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Teléfono Empresa:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Cliente:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>NIF/DNI Cliente:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Dirección de la intervención:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Persona de contacto / Teléfono:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
  </tbody>
</table>

<h3>2. TIPO DE INTERVENCIÓN</h3>
<p>☐ Avería &nbsp; ☐ Mantenimiento preventivo &nbsp; ☐ Instalación nueva &nbsp; ☐ Puesta en marcha &nbsp; ☐ Revisión &nbsp; ☐ Presupuesto &nbsp; ☐ Garantía</p>
<p><strong>Hora de llegada:</strong> _______ &nbsp;&nbsp; <strong>Hora de salida:</strong> _______ &nbsp;&nbsp; <strong>Horas totales:</strong> _______</p>

<h3>3. EQUIPO SOBRE EL QUE SE ACTÚA</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Marca del equipo:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Modelo:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Nº de serie:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Gas refrigerante:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Ubicación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
  </tbody>
</table>

<h3>4. AVERÍA DECLARADA POR EL CLIENTE</h3>
<p style="border:1px solid #ccc;padding:10px;min-height:50px">_______________________________________________________________________<br/><br/>_______________________________________________________________________</p>

<h3>5. TRABAJO REALIZADO</h3>
<p style="border:1px solid #ccc;padding:10px;min-height:90px">_______________________________________________________________________<br/><br/>_______________________________________________________________________<br/><br/>_______________________________________________________________________<br/><br/>_______________________________________________________________________</p>

<h3>6. MATERIAL EMPLEADO</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">CANT.</th>
      <th style="padding:8px;background:#f3f4f6">DESCRIPCIÓN</th>
      <th style="padding:8px;background:#f3f4f6">PRECIO UD.</th>
      <th style="padding:8px;background:#f3f4f6">IMPORTE</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">Mano de obra (_____ h)</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">Desplazamiento</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
  </tbody>
</table>
<p style="text-align:right"><strong>Base imponible:</strong> _______ €&nbsp;&nbsp; <strong>IVA (21 %):</strong> _______ €&nbsp;&nbsp; <strong>TOTAL:</strong> _______ €</p>

<h3>7. ESTADO AL FINALIZAR</h3>
<p>☐ Reparado y en funcionamiento &nbsp; ☐ Pendiente de material &nbsp; ☐ Pendiente de presupuesto &nbsp; ☐ Requiere segunda visita</p>
<p><strong>Observaciones y recomendaciones:</strong></p>
<p style="border:1px solid #ccc;padding:10px;min-height:50px">_______________________________________________________________________<br/><br/>_______________________________________________________________________</p>

<h3>8. CONFORMIDAD</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr>
      <td style="padding:8px;border:1px solid #ccc;width:50%">
        <strong>Técnico:</strong> _______________________<br/><br/>
        Fecha: _______________________<br/><br/>
        Firma: ☐
      </td>
      <td style="padding:8px;border:1px solid #ccc">
        <strong>Cliente (recibí conforme):</strong> _______________________<br/><br/>
        Fecha: _______________________<br/><br/>
        Firma: ☐
      </td>
    </tr>
  </tbody>
</table>
<p style="font-size:11px;color:#666">La firma del cliente acredita la realización del trabajo descrito, no la conformidad con el importe si este queda pendiente de presupuesto.</p>`
    },
    {
      id: 'parte_averia',
      label: 'Parte de avería y diagnóstico',
      contenido: `<h2>PARTE DE AVERÍA Y DIAGNÓSTICO TÉCNICO</h2>
<p><strong>Nº de parte:</strong> _______________________ &nbsp;&nbsp; <strong>Fecha:</strong> _______________________</p>

<h3>1. IDENTIFICACIÓN</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Cliente:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Dirección de la instalación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Marca del equipo:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Modelo:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Nº de serie:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Gas refrigerante / Carga:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Antigüedad aproximada:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
  </tbody>
</table>

<h3>2. SÍNTOMA</h3>
<p>☐ No enfría / no calienta &nbsp; ☐ Enfría poco &nbsp; ☐ No arranca &nbsp; ☐ Salta el térmico &nbsp; ☐ Ruido anómalo &nbsp; ☐ Fuga de agua &nbsp; ☐ Fuga de gas &nbsp; ☐ Hielo en evaporador &nbsp; ☐ Código de error: _______</p>
<p><strong>Descripción del cliente:</strong></p>
<p style="border:1px solid #ccc;padding:10px;min-height:45px">_______________________________________________________________________<br/><br/>_______________________________________________________________________</p>

<h3>3. MEDIDAS TOMADAS EN LA INTERVENCIÓN</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">PARÁMETRO</th>
      <th style="padding:8px;background:#f3f4f6">MEDIDA</th>
      <th style="padding:8px;background:#f3f4f6">PARÁMETRO</th>
      <th style="padding:8px;background:#f3f4f6">MEDIDA</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">Presión de alta</td><td style="padding:8px;border:1px solid #ccc">_______ bar</td><td style="padding:8px;border:1px solid #ccc">Presión de baja</td><td style="padding:8px;border:1px solid #ccc">_______ bar</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Temp. aspiración</td><td style="padding:8px;border:1px solid #ccc">_______ °C</td><td style="padding:8px;border:1px solid #ccc">Temp. descarga</td><td style="padding:8px;border:1px solid #ccc">_______ °C</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Recalentamiento</td><td style="padding:8px;border:1px solid #ccc">_______ K</td><td style="padding:8px;border:1px solid #ccc">Subenfriamiento</td><td style="padding:8px;border:1px solid #ccc">_______ K</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Temp. ambiente</td><td style="padding:8px;border:1px solid #ccc">_______ °C</td><td style="padding:8px;border:1px solid #ccc">Temp. cámara / local</td><td style="padding:8px;border:1px solid #ccc">_______ °C</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Intensidad compresor</td><td style="padding:8px;border:1px solid #ccc">_______ A</td><td style="padding:8px;border:1px solid #ccc">Tensión de alimentación</td><td style="padding:8px;border:1px solid #ccc">_______ V</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Aislamiento motor</td><td style="padding:8px;border:1px solid #ccc">_______ MΩ</td><td style="padding:8px;border:1px solid #ccc">Consumo ventiladores</td><td style="padding:8px;border:1px solid #ccc">_______ A</td></tr>
  </tbody>
</table>

<h3>4. DIAGNÓSTICO</h3>
<p><strong>Causa detectada:</strong></p>
<p style="border:1px solid #ccc;padding:10px;min-height:60px">_______________________________________________________________________<br/><br/>_______________________________________________________________________<br/><br/>_______________________________________________________________________</p>
<p><strong>Origen:</strong> ☐ Desgaste / vida útil &nbsp; ☐ Falta de mantenimiento &nbsp; ☐ Defecto de instalación &nbsp; ☐ Mal uso &nbsp; ☐ Causa externa (tensión, agua…) &nbsp; ☐ Defecto de fábrica</p>

<h3>5. SOLUCIÓN PROPUESTA</h3>
<p style="border:1px solid #ccc;padding:10px;min-height:60px">_______________________________________________________________________<br/><br/>_______________________________________________________________________<br/><br/>_______________________________________________________________________</p>
<p><strong>Importe estimado de la reparación:</strong> _______ € &nbsp;&nbsp; <strong>Plazo estimado:</strong> _______________________</p>
<p>☐ Reparación recomendada &nbsp; ☐ Sustitución del equipo recomendada &nbsp; ☐ Equipo irreparable</p>

<h3>6. FIRMAS</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr>
      <td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Técnico:</strong> _______________________<br/><br/>Nº carnet: _______________________<br/><br/>Fecha: _______________________ Firma: ☐</td>
      <td style="padding:8px;border:1px solid #ccc"><strong>Cliente (enterado):</strong> _______________________<br/><br/>&nbsp;<br/><br/>Fecha: _______________________ Firma: ☐</td>
    </tr>
  </tbody>
</table>`
    },
    {
      id: 'acta_puesta_marcha',
      label: 'Acta de puesta en marcha',
      contenido: `<h2>ACTA DE PUESTA EN MARCHA</h2>
<p><strong>Nº de acta:</strong> _______________________ &nbsp;&nbsp; <strong>Fecha de puesta en marcha:</strong> _______________________</p>

<h3>1. DATOS DE LA INSTALACIÓN</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Empresa Instaladora:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>NIF Empresa:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Titular de la instalación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Dirección de la instalación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Tipo de instalación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Potencia / Capacidad:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
  </tbody>
</table>

<h3>2. EQUIPOS PUESTOS EN MARCHA</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">EQUIPO</th>
      <th style="padding:8px;background:#f3f4f6">MARCA / MODELO</th>
      <th style="padding:8px;background:#f3f4f6">Nº SERIE</th>
      <th style="padding:8px;background:#f3f4f6">GARANTÍA HASTA</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
  </tbody>
</table>

<h3>3. COMPROBACIONES REALIZADAS</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">COMPROBACIÓN</th>
      <th style="padding:8px;background:#f3f4f6">RESULTADO</th>
      <th style="padding:8px;background:#f3f4f6">VALOR MEDIDO</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">Estanquidad del circuito frigorífico</td><td style="padding:8px;border:1px solid #ccc">☐ Correcto ☐ N/A</td><td style="padding:8px;border:1px solid #ccc">_______ bar</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Vacío del circuito</td><td style="padding:8px;border:1px solid #ccc">☐ Correcto ☐ N/A</td><td style="padding:8px;border:1px solid #ccc">_______ micras</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Carga de refrigerante</td><td style="padding:8px;border:1px solid #ccc">☐ Correcto ☐ N/A</td><td style="padding:8px;border:1px solid #ccc">_______ kg</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Conexionado eléctrico y protecciones</td><td style="padding:8px;border:1px solid #ccc">☐ Correcto</td><td style="padding:8px;border:1px solid #ccc">_______ A</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Continuidad de la puesta a tierra</td><td style="padding:8px;border:1px solid #ccc">☐ Correcto</td><td style="padding:8px;border:1px solid #ccc">_______ Ω</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Sentido de giro / fases</td><td style="padding:8px;border:1px solid #ccc">☐ Correcto ☐ N/A</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Parámetros de funcionamiento en régimen</td><td style="padding:8px;border:1px solid #ccc">☐ Correcto</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Elementos de seguridad y presostatos</td><td style="padding:8px;border:1px solid #ccc">☐ Correcto</td><td style="padding:8px;border:1px solid #ccc">_______ bar</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Control y regulación / programación</td><td style="padding:8px;border:1px solid #ccc">☐ Correcto</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Desagües y evacuación de condensados</td><td style="padding:8px;border:1px solid #ccc">☐ Correcto ☐ N/A</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Aislamiento térmico de tuberías</td><td style="padding:8px;border:1px solid #ccc">☐ Correcto ☐ N/A</td><td style="padding:8px;border:1px solid #ccc">_______ mm</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Nivel sonoro en el entorno</td><td style="padding:8px;border:1px solid #ccc">☐ Correcto</td><td style="padding:8px;border:1px solid #ccc">_______ dB(A)</td></tr>
  </tbody>
</table>

<h3>4. FORMACIÓN ENTREGADA AL USUARIO</h3>
<p>☐ Manejo del mando / termostato &nbsp; ☐ Programación horaria &nbsp; ☐ Limpieza de filtros &nbsp; ☐ Consignas recomendadas &nbsp; ☐ Qué hacer ante una alarma &nbsp; ☐ Entrega de manuales</p>

<h3>5. DOCUMENTACIÓN ENTREGADA</h3>
<p>☐ Manuales de los equipos &nbsp; ☐ Certificado de instalación &nbsp; ☐ Garantías &nbsp; ☐ Esquema de la instalación &nbsp; ☐ Contrato de mantenimiento &nbsp; ☐ Libro de mantenimiento</p>

<h3>6. OBSERVACIONES</h3>
<p style="border:1px solid #ccc;padding:10px;min-height:60px">_______________________________________________________________________<br/><br/>_______________________________________________________________________<br/><br/>_______________________________________________________________________</p>

<h3>7. FIRMAS</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr>
      <td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Técnico responsable:</strong> _______________________<br/><br/>Nº carnet: _______________________<br/><br/>Fecha: _______________________ Firma: ☐</td>
      <td style="padding:8px;border:1px solid #ccc"><strong>Titular / Usuario:</strong> _______________________<br/><br/>&nbsp;<br/><br/>Fecha: _______________________ Firma: ☐</td>
    </tr>
  </tbody>
</table>
<p style="margin-top:15px"><strong>⚠️ La instalación queda entregada en correcto funcionamiento en la fecha indicada.</strong> La garantía queda condicionada al cumplimiento del mantenimiento periódico exigido por la normativa y por el fabricante.</p>`
    },
    {
      id: 'hoja_revision',
      label: 'Hoja de revisión periódica',
      contenido: `<h2>HOJA DE REVISIÓN PERIÓDICA</h2>
<p><strong>Nº de revisión:</strong> _______________________ &nbsp;&nbsp; <strong>Fecha:</strong> _______________________</p>

<h3>1. IDENTIFICACIÓN</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Cliente:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Dirección de la instalación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Empresa Mantenedora:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Periodicidad contratada:</strong></td><td style="padding:8px;border:1px solid #ccc">☐ Mensual ☐ Trimestral ☐ Semestral ☐ Anual</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Revisión anterior:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Próxima revisión:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
  </tbody>
</table>

<h3>2. EQUIPOS REVISADOS</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">Nº</th>
      <th style="padding:8px;background:#f3f4f6">EQUIPO / UBICACIÓN</th>
      <th style="padding:8px;background:#f3f4f6">MARCA / MODELO</th>
      <th style="padding:8px;background:#f3f4f6">ESTADO</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">1</td><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">☐ OK ☐ Defecto</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">2</td><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">☐ OK ☐ Defecto</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">3</td><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">☐ OK ☐ Defecto</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">4</td><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">☐ OK ☐ Defecto</td></tr>
  </tbody>
</table>

<h3>3. OPERACIONES REALIZADAS</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">OPERACIÓN</th>
      <th style="padding:8px;background:#f3f4f6">HECHO</th>
      <th style="padding:8px;background:#f3f4f6">OBSERVACIONES</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">Limpieza de filtros de aire</td><td style="padding:8px;border:1px solid #ccc">☐</td><td style="padding:8px;border:1px solid #ccc">_______________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Limpieza de baterías (evaporador / condensador)</td><td style="padding:8px;border:1px solid #ccc">☐</td><td style="padding:8px;border:1px solid #ccc">_______________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Limpieza de bandejas y desagües</td><td style="padding:8px;border:1px solid #ccc">☐</td><td style="padding:8px;border:1px solid #ccc">_______________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Comprobación de estanquidad / fugas de gas</td><td style="padding:8px;border:1px solid #ccc">☐</td><td style="padding:8px;border:1px solid #ccc">_______________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Comprobación de presiones de trabajo</td><td style="padding:8px;border:1px solid #ccc">☐</td><td style="padding:8px;border:1px solid #ccc">_______________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Medida de consumos eléctricos</td><td style="padding:8px;border:1px solid #ccc">☐</td><td style="padding:8px;border:1px solid #ccc">_______________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Apriete de conexiones eléctricas</td><td style="padding:8px;border:1px solid #ccc">☐</td><td style="padding:8px;border:1px solid #ccc">_______________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Comprobación de protecciones y seguridades</td><td style="padding:8px;border:1px solid #ccc">☐</td><td style="padding:8px;border:1px solid #ccc">_______________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Comprobación de desescarches</td><td style="padding:8px;border:1px solid #ccc">☐</td><td style="padding:8px;border:1px solid #ccc">_______________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Comprobación de temperaturas de consigna</td><td style="padding:8px;border:1px solid #ccc">☐</td><td style="padding:8px;border:1px solid #ccc">_______________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Revisión de aislamientos y soportes</td><td style="padding:8px;border:1px solid #ccc">☐</td><td style="padding:8px;border:1px solid #ccc">_______________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Verificación de anotaciones en el libro de mantenimiento</td><td style="padding:8px;border:1px solid #ccc">☐</td><td style="padding:8px;border:1px solid #ccc">_______________</td></tr>
  </tbody>
</table>

<h3>4. DEFICIENCIAS DETECTADAS</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">DEFICIENCIA</th>
      <th style="padding:8px;background:#f3f4f6">GRAVEDAD</th>
      <th style="padding:8px;background:#f3f4f6">ACTUACIÓN PROPUESTA</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">☐ Leve ☐ Grave ☐ Muy grave</td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">☐ Leve ☐ Grave ☐ Muy grave</td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">☐ Leve ☐ Grave ☐ Muy grave</td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
  </tbody>
</table>

<h3>5. RESULTADO DE LA REVISIÓN</h3>
<p style="font-size:15px"><strong>☐ FAVORABLE</strong> &nbsp;&nbsp; <strong>☐ FAVORABLE CON OBSERVACIONES</strong> &nbsp;&nbsp; <strong>☐ DESFAVORABLE</strong></p>

<h3>6. FIRMAS</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr>
      <td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Técnico mantenedor:</strong> _______________________<br/><br/>Nº carnet: _______________________<br/><br/>Fecha: _______________________ Firma: ☐</td>
      <td style="padding:8px;border:1px solid #ccc"><strong>Cliente:</strong> _______________________<br/><br/>&nbsp;<br/><br/>Fecha: _______________________ Firma: ☐</td>
    </tr>
  </tbody>
</table>`
    },
    {
      id: 'contrato_mantenimiento',
      label: 'Contrato de mantenimiento',
      contenido: `<h2>CONTRATO DE MANTENIMIENTO</h2>
<p><strong>Nº de contrato:</strong> _______________________ &nbsp;&nbsp; <strong>Fecha:</strong> _______________________</p>

<h3>REUNIDOS</h3>
<p><strong>De una parte, la EMPRESA MANTENEDORA:</strong></p>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Empresa:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>NIF Empresa:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Dirección Empresa:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Teléfono Empresa:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Nº Registro Empresa Mantenedora:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
  </tbody>
</table>
<p><strong>Y de otra, el CLIENTE:</strong></p>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Cliente:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>NIF/DNI Cliente:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Dirección:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Teléfono:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
  </tbody>
</table>

<h3>1. OBJETO DEL CONTRATO</h3>
<p>La empresa mantenedora se compromete a realizar el mantenimiento de las instalaciones que se relacionan a continuación, conforme a la reglamentación vigente y a las instrucciones de los fabricantes.</p>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">INSTALACIÓN / EQUIPO</th>
      <th style="padding:8px;background:#f3f4f6">UBICACIÓN</th>
      <th style="padding:8px;background:#f3f4f6">MARCA / MODELO</th>
      <th style="padding:8px;background:#f3f4f6">Nº SERIE</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
  </tbody>
</table>

<h3>2. ALCANCE DEL MANTENIMIENTO</h3>
<p><strong>Modalidad contratada:</strong></p>
<p>☐ <strong>Preventivo</strong> — revisiones periódicas programadas según normativa.<br/>
☐ <strong>Preventivo + correctivo con mano de obra incluida</strong> — se incluyen las horas de reparación; los materiales se facturan aparte.<br/>
☐ <strong>Todo incluido</strong> — mano de obra y materiales incluidos, salvo las exclusiones del punto 4.</p>
<p><strong>Periodicidad de las revisiones:</strong> ☐ Mensual ☐ Trimestral ☐ Semestral ☐ Anual &nbsp;&nbsp; (nº de visitas al año: _______)</p>
<p><strong>Tiempo de respuesta ante avería:</strong> _______ horas laborables desde el aviso.</p>
<p><strong>Horario de servicio:</strong> _______________________ &nbsp;&nbsp; ☐ Incluye servicio de urgencias 24 h</p>

<h3>3. OBLIGACIONES DE LAS PARTES</h3>
<p><strong>La empresa mantenedora se obliga a:</strong> realizar las revisiones en los plazos pactados; emitir y entregar el parte de cada intervención; anotar las actuaciones en el libro de mantenimiento; disponer de personal habilitado y de los medios adecuados; y guardar confidencialidad sobre la información del cliente.</p>
<p><strong>El cliente se obliga a:</strong> facilitar el acceso a las instalaciones y a los cuadros eléctricos; comunicar sin demora cualquier anomalía; no permitir la manipulación de los equipos por terceros no autorizados; conservar el libro de mantenimiento; y abonar el importe pactado en los plazos acordados.</p>

<h3>4. EXCLUSIONES</h3>
<p>Quedan excluidos de este contrato, salvo pacto expreso: los daños por mal uso, manipulación indebida o causas externas (sobretensiones, inundaciones, incendio, actos vandálicos); las obras de albañilería, fontanería o electricidad ajenas al equipo; la sustitución de equipos completos por fin de su vida útil; el suministro de gas refrigerante derivado de fugas no imputables al mantenimiento; y las actuaciones exigidas por cambios normativos posteriores a la firma.</p>

<h3>5. PRECIO Y FORMA DE PAGO</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Importe anual (sin IVA):</strong></td><td style="padding:8px;border:1px solid #ccc">_______ €</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>IVA aplicable:</strong></td><td style="padding:8px;border:1px solid #ccc">_______ %</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Importe total anual:</strong></td><td style="padding:8px;border:1px solid #ccc">_______ €</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Forma de pago:</strong></td><td style="padding:8px;border:1px solid #ccc">☐ Anual ☐ Semestral ☐ Trimestral ☐ Mensual</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Medio de pago:</strong></td><td style="padding:8px;border:1px solid #ccc">☐ Domiciliación ☐ Transferencia ☐ Efectivo</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Precio hora fuera de contrato:</strong></td><td style="padding:8px;border:1px solid #ccc">_______ €/h</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Descuento en materiales:</strong></td><td style="padding:8px;border:1px solid #ccc">_______ %</td></tr>
  </tbody>
</table>

<h3>6. DURACIÓN Y RENOVACIÓN</h3>
<p><strong>Fecha de inicio:</strong> _______________________ &nbsp;&nbsp; <strong>Fecha de fin:</strong> _______________________</p>
<p>El contrato se prorrogará automáticamente por periodos iguales salvo denuncia por cualquiera de las partes con una antelación mínima de _______ días a la fecha de vencimiento. La revisión de precios se aplicará conforme a la variación del IPC, salvo pacto distinto.</p>

<h3>7. PROTECCIÓN DE DATOS</h3>
<p>Los datos personales facilitados se tratarán por la empresa mantenedora con la finalidad de gestionar la relación contractual, conforme al Reglamento (UE) 2016/679 (RGPD) y a la Ley Orgánica 3/2018. El interesado puede ejercer sus derechos de acceso, rectificación, supresión, limitación, portabilidad y oposición dirigiéndose por escrito a la dirección de la empresa.</p>

<h3>8. FIRMAS</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr>
      <td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Por la empresa mantenedora</strong><br/><br/>Nombre: _______________________<br/><br/>Fecha: _______________________<br/><br/>Firma: ☐</td>
      <td style="padding:8px;border:1px solid #ccc"><strong>Por el cliente</strong><br/><br/>Nombre: _______________________<br/><br/>Fecha: _______________________<br/><br/>Firma: ☐</td>
    </tr>
  </tbody>
</table>`
    }
  ],

  comercial: [
    {
      id: 'presupuesto',
      label: 'Presupuesto',
      contenido: `<h2>PRESUPUESTO</h2>
<p><strong>Nº de presupuesto:</strong> _______________________ &nbsp;&nbsp; <strong>Fecha:</strong> _______________________ &nbsp;&nbsp; <strong>Validez:</strong> _______ días</p>

<h3>1. DATOS</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Empresa:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>NIF Empresa:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Dirección Empresa:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Teléfono Empresa:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Cliente:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>NIF/DNI Cliente:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Dirección:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
  </tbody>
</table>

<h3>2. DESCRIPCIÓN DEL TRABAJO</h3>
<p style="border:1px solid #ccc;padding:10px;min-height:60px">_______________________________________________________________________<br/><br/>_______________________________________________________________________<br/><br/>_______________________________________________________________________</p>

<h3>3. PARTIDAS</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">CANT.</th>
      <th style="padding:8px;background:#f3f4f6">CONCEPTO</th>
      <th style="padding:8px;background:#f3f4f6">PRECIO UD.</th>
      <th style="padding:8px;background:#f3f4f6">DTO. %</th>
      <th style="padding:8px;background:#f3f4f6">IMPORTE</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">Mano de obra (_____ h)</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">Puesta en marcha y pruebas</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">Retirada y gestión de residuos</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
  </tbody>
</table>

<h3>4. TOTALES</h3>
<table border="1" style="border-collapse:collapse;width:60%;margin:10px 0 10px auto">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Base imponible</strong></td><td style="padding:8px;border:1px solid #ccc;text-align:right">_______ €</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>IVA (_____ %)</strong></td><td style="padding:8px;border:1px solid #ccc;text-align:right">_______ €</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc;background:#f3f4f6"><strong>TOTAL PRESUPUESTO</strong></td><td style="padding:8px;border:1px solid #ccc;background:#f3f4f6;text-align:right"><strong>_______ €</strong></td></tr>
  </tbody>
</table>

<h3>5. CONDICIONES</h3>
<p><strong>Plazo de ejecución:</strong> _______________________ desde la aceptación.<br/>
<strong>Forma de pago:</strong> _______________________<br/>
<strong>Garantía:</strong> _______ años en equipos y _______ meses en mano de obra.<br/>
<strong>Validez de la oferta:</strong> _______ días desde la fecha de emisión.</p>
<p style="font-size:11px;color:#666">No se incluyen obras de albañilería, canalizaciones ni trabajos no descritos expresamente. Los precios podrán revisarse si varían las condiciones de la instalación respecto a lo visitado.</p>

<h3>6. ACEPTACIÓN</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr>
      <td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Por la empresa</strong><br/><br/>Nombre: _______________________<br/><br/>Fecha: _______________________<br/><br/>Firma: ☐</td>
      <td style="padding:8px;border:1px solid #ccc"><strong>Acepto el presupuesto</strong><br/><br/>Nombre: _______________________<br/><br/>Fecha: _______________________<br/><br/>Firma: ☐</td>
    </tr>
  </tbody>
</table>`
    },
    {
      id: 'factura',
      label: 'Factura',
      contenido: `<h2>FACTURA</h2>
<p><strong>Nº de factura:</strong> _______________________ &nbsp;&nbsp; <strong>Fecha de expedición:</strong> _______________________ &nbsp;&nbsp; <strong>Fecha de operación:</strong> _______________________</p>

<h3>1. EMISOR Y DESTINATARIO</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr>
      <td style="padding:8px;border:1px solid #ccc;width:50%;vertical-align:top">
        <strong>EMISOR</strong><br/><br/>
        <strong>Empresa:</strong> _______________________<br/>
        <strong>NIF Empresa:</strong> _______________________<br/>
        <strong>Dirección Empresa:</strong> _______________________<br/>
        <strong>Teléfono Empresa:</strong> _______________________
      </td>
      <td style="padding:8px;border:1px solid #ccc;vertical-align:top">
        <strong>DESTINATARIO</strong><br/><br/>
        <strong>Cliente:</strong> _______________________<br/>
        <strong>NIF/DNI Cliente:</strong> _______________________<br/>
        <strong>Dirección:</strong> _______________________<br/>
        <strong>Municipio / Provincia:</strong> _______________________
      </td>
    </tr>
  </tbody>
</table>

<h3>2. DETALLE</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">CANT.</th>
      <th style="padding:8px;background:#f3f4f6">DESCRIPCIÓN</th>
      <th style="padding:8px;background:#f3f4f6">PRECIO UD.</th>
      <th style="padding:8px;background:#f3f4f6">DTO. %</th>
      <th style="padding:8px;background:#f3f4f6">IMPORTE</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
  </tbody>
</table>

<h3>3. TOTALES</h3>
<table border="1" style="border-collapse:collapse;width:60%;margin:10px 0 10px auto">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Base imponible</strong></td><td style="padding:8px;border:1px solid #ccc;text-align:right">_______ €</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>IVA (_____ %)</strong></td><td style="padding:8px;border:1px solid #ccc;text-align:right">_______ €</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Retención IRPF (_____ %)</strong></td><td style="padding:8px;border:1px solid #ccc;text-align:right">– _______ €</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc;background:#f3f4f6"><strong>TOTAL A PAGAR</strong></td><td style="padding:8px;border:1px solid #ccc;background:#f3f4f6;text-align:right"><strong>_______ €</strong></td></tr>
  </tbody>
</table>

<h3>4. FORMA DE PAGO</h3>
<p><strong>Medio:</strong> ☐ Transferencia ☐ Domiciliación ☐ Tarjeta ☐ Efectivo ☐ Bizum<br/>
<strong>IBAN:</strong> _______________________<br/>
<strong>Vencimiento:</strong> _______________________</p>

<h3>5. OBSERVACIONES</h3>
<p style="border:1px solid #ccc;padding:10px;min-height:40px">_______________________________________________________________________</p>
<p style="font-size:11px;color:#666">Factura expedida conforme al RD 1619/2012, por el que se aprueba el Reglamento de facturación. Los datos personales se tratan conforme al Reglamento (UE) 2016/679 (RGPD) para la gestión contable, fiscal y administrativa.</p>`
    },
    {
      id: 'recibo',
      label: 'Recibo / Justificante de pago',
      contenido: `<h2>RECIBO — JUSTIFICANTE DE PAGO</h2>
<p><strong>Nº de recibo:</strong> _______________________ &nbsp;&nbsp; <strong>Fecha:</strong> _______________________</p>

<table border="1" style="border-collapse:collapse;width:100%;margin:15px 0">
  <tbody>
    <tr><td style="padding:10px;border:1px solid #ccc;width:40%"><strong>Empresa:</strong></td><td style="padding:10px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:10px;border:1px solid #ccc"><strong>NIF Empresa:</strong></td><td style="padding:10px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:10px;border:1px solid #ccc"><strong>He recibido de (Cliente):</strong></td><td style="padding:10px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:10px;border:1px solid #ccc"><strong>NIF/DNI Cliente:</strong></td><td style="padding:10px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:10px;border:1px solid #ccc"><strong>La cantidad de:</strong></td><td style="padding:10px;border:1px solid #ccc;font-size:16px"><strong>_______ €</strong></td></tr>
    <tr><td style="padding:10px;border:1px solid #ccc"><strong>En letra:</strong></td><td style="padding:10px;border:1px solid #ccc">_______________________________________ euros</td></tr>
    <tr><td style="padding:10px;border:1px solid #ccc"><strong>En concepto de:</strong></td><td style="padding:10px;border:1px solid #ccc">_______________________________________</td></tr>
    <tr><td style="padding:10px;border:1px solid #ccc"><strong>Factura / presupuesto asociado:</strong></td><td style="padding:10px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:10px;border:1px solid #ccc"><strong>Medio de pago:</strong></td><td style="padding:10px;border:1px solid #ccc">☐ Efectivo ☐ Transferencia ☐ Tarjeta ☐ Bizum</td></tr>
    <tr><td style="padding:10px;border:1px solid #ccc"><strong>Tipo de pago:</strong></td><td style="padding:10px;border:1px solid #ccc">☐ Total ☐ A cuenta &nbsp;&nbsp; Pendiente: _______ €</td></tr>
  </tbody>
</table>

<p style="margin-top:25px">Y para que conste, firmo el presente recibo en _______________________, a _______ de _______________________ de _______.</p>

<table border="1" style="border-collapse:collapse;width:100%;margin:25px 0">
  <tbody>
    <tr>
      <td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Recibí (empresa)</strong><br/><br/>Nombre: _______________________<br/><br/>Firma: ☐</td>
      <td style="padding:8px;border:1px solid #ccc"><strong>Pagador</strong><br/><br/>Nombre: _______________________<br/><br/>Firma: ☐</td>
    </tr>
  </tbody>
</table>`
    },
    {
      id: 'albaran',
      label: 'Albarán de entrega',
      contenido: `<h2>ALBARÁN DE ENTREGA</h2>
<p><strong>Nº de albarán:</strong> _______________________ &nbsp;&nbsp; <strong>Fecha de entrega:</strong> _______________________</p>

<h3>1. DATOS</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Empresa:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>NIF Empresa:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Cliente:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>NIF/DNI Cliente:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Dirección de entrega:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Presupuesto / pedido asociado:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
  </tbody>
</table>

<h3>2. MATERIAL ENTREGADO</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">CANT.</th>
      <th style="padding:8px;background:#f3f4f6">REFERENCIA</th>
      <th style="padding:8px;background:#f3f4f6">DESCRIPCIÓN</th>
      <th style="padding:8px;background:#f3f4f6">Nº SERIE</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
  </tbody>
</table>

<h3>3. OBSERVACIONES</h3>
<p style="border:1px solid #ccc;padding:10px;min-height:45px">_______________________________________________________________________<br/><br/>_______________________________________________________________________</p>

<h3>4. RECEPCIÓN</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr>
      <td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Entrega (empresa)</strong><br/><br/>Nombre: _______________________<br/><br/>Fecha: _______________________<br/><br/>Firma: ☐</td>
      <td style="padding:8px;border:1px solid #ccc"><strong>Recibí conforme (cliente)</strong><br/><br/>Nombre: _______________________<br/><br/>Fecha: _______________________<br/><br/>Firma: ☐</td>
    </tr>
  </tbody>
</table>
<p style="font-size:11px;color:#666">Este albarán no tiene valor de factura. La mercancía viaja por cuenta y riesgo del cliente salvo pacto en contrario. Cualquier reclamación por faltas o daños deberá comunicarse en un plazo máximo de 24 horas desde la entrega.</p>`
    }
  ],

  informe: [
    {
      id: 'informe_tecnico',
      label: 'Informe técnico',
      contenido: `<h2>INFORME TÉCNICO</h2>
<p><strong>Nº de informe:</strong> _______________________ &nbsp;&nbsp; <strong>Fecha:</strong> _______________________</p>

<h3>1. DATOS DEL INFORME</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Empresa:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>NIF Empresa:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Técnico redactor:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Nº Carnet / Colegiado:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Solicitante (Cliente):</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Dirección de la instalación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Fecha de la visita:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
  </tbody>
</table>

<h3>2. OBJETO DEL INFORME</h3>
<p style="border:1px solid #ccc;padding:10px;min-height:50px">_______________________________________________________________________<br/><br/>_______________________________________________________________________</p>

<h3>3. DESCRIPCIÓN DE LA INSTALACIÓN</h3>
<p style="border:1px solid #ccc;padding:10px;min-height:70px">_______________________________________________________________________<br/><br/>_______________________________________________________________________<br/><br/>_______________________________________________________________________</p>

<h3>4. ANTECEDENTES</h3>
<p style="border:1px solid #ccc;padding:10px;min-height:50px">_______________________________________________________________________<br/><br/>_______________________________________________________________________</p>

<h3>5. INSPECCIÓN REALIZADA Y DATOS OBTENIDOS</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">ELEMENTO COMPROBADO</th>
      <th style="padding:8px;background:#f3f4f6">VALOR / ESTADO</th>
      <th style="padding:8px;background:#f3f4f6">VALOR DE REFERENCIA</th>
      <th style="padding:8px;background:#f3f4f6">VALORACIÓN</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">☐ OK ☐ NO</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">☐ OK ☐ NO</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">☐ OK ☐ NO</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">☐ OK ☐ NO</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">☐ OK ☐ NO</td></tr>
  </tbody>
</table>
<p><strong>Equipos de medida empleados:</strong> _______________________________________________________________________</p>

<h3>6. REPORTAJE FOTOGRÁFICO</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr>
      <td style="padding:8px;border:1px solid #ccc;width:50%;height:140px;vertical-align:top"><strong>Fotografía 1</strong><br/><span style="font-size:11px;color:#666">Pie de foto: _______________________</span></td>
      <td style="padding:8px;border:1px solid #ccc;height:140px;vertical-align:top"><strong>Fotografía 2</strong><br/><span style="font-size:11px;color:#666">Pie de foto: _______________________</span></td>
    </tr>
    <tr>
      <td style="padding:8px;border:1px solid #ccc;height:140px;vertical-align:top"><strong>Fotografía 3</strong><br/><span style="font-size:11px;color:#666">Pie de foto: _______________________</span></td>
      <td style="padding:8px;border:1px solid #ccc;height:140px;vertical-align:top"><strong>Fotografía 4</strong><br/><span style="font-size:11px;color:#666">Pie de foto: _______________________</span></td>
    </tr>
  </tbody>
</table>

<h3>7. ANÁLISIS Y VALORACIÓN TÉCNICA</h3>
<p style="border:1px solid #ccc;padding:10px;min-height:90px">_______________________________________________________________________<br/><br/>_______________________________________________________________________<br/><br/>_______________________________________________________________________<br/><br/>_______________________________________________________________________</p>

<h3>8. NORMATIVA DE REFERENCIA</h3>
<p>_______________________________________________________________________</p>

<h3>9. CONCLUSIONES</h3>
<p style="border:1px solid #ccc;padding:10px;min-height:70px">_______________________________________________________________________<br/><br/>_______________________________________________________________________<br/><br/>_______________________________________________________________________</p>

<h3>10. RECOMENDACIONES</h3>
<p style="border:1px solid #ccc;padding:10px;min-height:60px">_______________________________________________________________________<br/><br/>_______________________________________________________________________</p>

<h3>11. FIRMA</h3>
<p style="margin-top:20px">
  Técnico redactor: _______________________<br/>
  Nº Carnet / Colegiado: _______________________<br/>
  Empresa: _______________________<br/>
  Fecha: _______________________ Firma: ☐
</p>`
    },
    {
      id: 'acta_entrega',
      label: 'Acta de entrega de instalación',
      contenido: `<h2>ACTA DE ENTREGA Y RECEPCIÓN DE LA INSTALACIÓN</h2>
<p><strong>Nº de acta:</strong> _______________________ &nbsp;&nbsp; <strong>Fecha de entrega:</strong> _______________________</p>

<h3>1. PARTES</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Empresa Instaladora:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>NIF Empresa:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Titular / Cliente:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>NIF/DNI Cliente:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Dirección de la instalación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
  </tbody>
</table>

<h3>2. OBJETO DE LA ENTREGA</h3>
<p style="border:1px solid #ccc;padding:10px;min-height:50px">_______________________________________________________________________<br/><br/>_______________________________________________________________________</p>

<h3>3. RELACIÓN DE EQUIPOS ENTREGADOS</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">EQUIPO</th>
      <th style="padding:8px;background:#f3f4f6">MARCA / MODELO</th>
      <th style="padding:8px;background:#f3f4f6">Nº SERIE</th>
      <th style="padding:8px;background:#f3f4f6">GARANTÍA</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
  </tbody>
</table>

<h3>4. DOCUMENTACIÓN QUE SE ENTREGA</h3>
<p>☐ Manuales de uso y mantenimiento &nbsp; ☐ Certificado / boletín de la instalación &nbsp; ☐ Memoria técnica<br/>
☐ Esquemas y planos as-built &nbsp; ☐ Garantías de los equipos &nbsp; ☐ Libro de mantenimiento<br/>
☐ Acta de puesta en marcha &nbsp; ☐ Fichas de seguridad del refrigerante &nbsp; ☐ Otros: _______________________</p>

<h3>5. PRUEBAS Y VERIFICACIONES SUPERADAS</h3>
<p>☐ Estanquidad &nbsp; ☐ Puesta en marcha &nbsp; ☐ Régimen de funcionamiento &nbsp; ☐ Seguridades &nbsp; ☐ Nivel sonoro &nbsp; ☐ Consumos</p>

<h3>6. RESERVAS Y PUNTOS PENDIENTES</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">PUNTO PENDIENTE</th>
      <th style="padding:8px;background:#f3f4f6">RESPONSABLE</th>
      <th style="padding:8px;background:#f3f4f6">PLAZO</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
  </tbody>
</table>

<h3>7. GARANTÍA Y MANTENIMIENTO</h3>
<p><strong>Garantía de la instalación:</strong> _______ años desde la fecha de esta acta.<br/>
<strong>Mantenimiento obligatorio:</strong> ☐ Sí ☐ No &nbsp;&nbsp; Periodicidad: _______________________<br/>
<strong>Contrato de mantenimiento suscrito:</strong> ☐ Sí, nº _______________ ☐ No</p>
<p style="font-size:11px;color:#666">La garantía queda condicionada al cumplimiento del mantenimiento periódico exigido por la normativa y por el fabricante, y a la no manipulación de los equipos por personal ajeno a la empresa instaladora.</p>

<h3>8. CONFORMIDAD</h3>
<p>Ambas partes dan por recibida la instalación en la fecha indicada, con las reservas que en su caso figuran en el punto 6.</p>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr>
      <td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Por la empresa instaladora</strong><br/><br/>Nombre: _______________________<br/><br/>Fecha: _______________________<br/><br/>Firma: ☐</td>
      <td style="padding:8px;border:1px solid #ccc"><strong>Por el titular / cliente</strong><br/><br/>Nombre: _______________________<br/><br/>Fecha: _______________________<br/><br/>Firma: ☐</td>
    </tr>
  </tbody>
</table>`
    },
    {
      id: 'declaracion_responsable',
      label: 'Declaración responsable de instalación',
      contenido: `<h2>DECLARACIÓN RESPONSABLE DE LA EMPRESA INSTALADORA</h2>
<p><strong>Nº de expediente:</strong> _______________________ &nbsp;&nbsp; <strong>Fecha:</strong> _______________________</p>

<h3>1. DATOS DE LA EMPRESA DECLARANTE</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Empresa:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>NIF Empresa:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Dirección Empresa:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Teléfono Empresa:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Nº Registro Empresa Instaladora:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Representante legal:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>DNI del representante:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
  </tbody>
</table>

<h3>2. DATOS DE LA INSTALACIÓN</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Titular de la instalación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>NIF/DNI Titular:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Dirección de la instalación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Municipio / Provincia:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Tipo de instalación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Potencia / Capacidad:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Fecha de finalización de los trabajos:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
  </tbody>
</table>

<h3>3. REGLAMENTACIÓN APLICADA</h3>
<p>☐ REBT — RD 842/2002, Reglamento Electrotécnico para Baja Tensión<br/>
☐ RITE — RD 1027/2007, Reglamento de Instalaciones Térmicas en los Edificios<br/>
☐ RSIF — RD 552/2019, Reglamento de Seguridad para Instalaciones Frigoríficas<br/>
☐ RD 115/2017 y Reglamento (UE) 2024/573, sobre gases fluorados de efecto invernadero<br/>
☐ RD 244/2019, autoconsumo de energía eléctrica<br/>
☐ Otra: _______________________</p>

<h3>4. DECLARACIÓN</h3>
<p>El representante legal de la empresa instaladora arriba indicada <strong>DECLARA BAJO SU RESPONSABILIDAD</strong> que:</p>
<p>1.º La instalación descrita ha sido ejecutada por esta empresa conforme a la reglamentación técnica que le es de aplicación, a las instrucciones de los fabricantes y a la buena práctica constructiva.</p>
<p>2.º La empresa cumple los requisitos exigidos por la normativa vigente para el ejercicio de la actividad, dispone del personal con la habilitación profesional exigida y mantiene en vigor el seguro de responsabilidad civil legalmente exigible.</p>
<p>3.º Se han realizado las pruebas y verificaciones reglamentarias, cuyos resultados han sido satisfactorios, y la instalación reúne las condiciones de seguridad exigidas para su puesta en servicio.</p>
<p>4.º Se ha entregado al titular la documentación técnica de la instalación, los manuales de los equipos y las instrucciones de uso y mantenimiento.</p>
<p>5.º Dispone de la documentación que acredita todo lo anterior y se compromete a mantenerla a disposición de la Administración durante el plazo legalmente establecido.</p>
<p style="border:1px solid #999;padding:10px;background:#fafafa;font-size:12px"><strong>⚠️ ADVERTENCIA:</strong> La inexactitud, falsedad u omisión de carácter esencial en los datos o manifestaciones de esta declaración responsable determinará la imposibilidad de continuar con el ejercicio de la actividad desde el momento en que se tenga constancia de tales hechos, sin perjuicio de las responsabilidades penales, civiles o administrativas a que hubiera lugar (art. 69 de la Ley 39/2015).</p>

<h3>5. DOCUMENTACIÓN QUE SE ACOMPAÑA</h3>
<p>☐ Certificado / boletín de la instalación &nbsp; ☐ Memoria técnica de diseño &nbsp; ☐ Proyecto (si procede)<br/>
☐ Esquema unifilar &nbsp; ☐ Certificado de pruebas &nbsp; ☐ Justificante de pago de tasas &nbsp; ☐ Otros: _______________________</p>

<h3>6. FIRMA</h3>
<p style="margin-top:20px">
  En _______________________, a _______ de _______________________ de _______.<br/><br/>
  Representante legal: _______________________<br/>
  DNI: _______________________<br/>
  Sello de la empresa y firma: ☐
</p>
<p style="margin-top:15px;font-size:11px;color:#666">Los datos personales facilitados se tratarán conforme al Reglamento (UE) 2016/679 (RGPD) y a la Ley Orgánica 3/2018, con la finalidad de tramitar la puesta en servicio de la instalación ante el órgano competente.</p>`
    }
  ]
};
