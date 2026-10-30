/**
 * modelosExpediente.js — Los papeles que acompañan a una legalización.
 *
 * Son los que aparecen en la lista de "documentación que se acompaña" de la
 * declaración responsable: certificado, memoria, proyecto, esquema unifilar,
 * certificado de pruebas, tasas y uno en blanco para lo que haga falta.
 *
 * Un aviso que va también dentro de los modelos, porque importa: el
 * certificado de instalación y el boletín se presentan en el impreso OFICIAL
 * de cada Comunidad Autónoma, casi siempre por su sede electrónica. Estos
 * modelos sirven para reunir los datos, dejar constancia técnica del trabajo,
 * entregarle copia al cliente y tener el papel que piden los fabricantes para
 * la garantía. No sustituyen al impreso autonómico.
 *
 * Y otro: cualquiera de estos documentos lo tiene que revisar y firmar un
 * técnico o instalador habilitado. El programa pone el papel y los datos que
 * ya sabe; la responsabilidad de lo que se firma es de quien firma.
 */

const AVISO_OFICIAL = `<p style="border:1px solid #999;padding:10px;background:#fafafa;font-size:12px;margin-top:20px"><strong>⚠️ IMPORTANTE:</strong> El certificado de instalación y el boletín se presentan ante el órgano competente en el <strong>impreso oficial de cada Comunidad Autónoma</strong>, normalmente por su sede electrónica. Este documento sirve para reunir y dejar constancia de todos los datos, para entregar copia al titular y para acreditar ante el fabricante que la instalación y la puesta en marcha las ha hecho empresa habilitada. Debe ser revisado y firmado por técnico o instalador habilitado.</p>`;

export const EXPEDIENTE = {
  expediente: [
    {
      id: 'certificado_instalacion',
      label: 'Certificado / Boletín de la instalación',
      contenido: `<h2>CERTIFICADO DE LA INSTALACIÓN</h2>
<p><strong>Nº de certificado:</strong> _______________________ &nbsp;&nbsp; <strong>Fecha:</strong> _______________________</p>

<h3>1. REGLAMENTO QUE SE APLICA</h3>
<p>☐ <strong>REBT</strong> — RD 842/2002, Reglamento Electrotécnico para Baja Tensión (Certificado de Instalación Eléctrica, «boletín»)<br/>
☐ <strong>RITE</strong> — RD 1027/2007 y RD 178/2021, instalaciones térmicas en los edificios<br/>
☐ <strong>RSIF</strong> — RD 552/2019, instalaciones frigoríficas &nbsp;&nbsp; Nivel: ☐ 1 ☐ 2<br/>
☐ <strong>Autoconsumo</strong> — RD 244/2019 &nbsp;&nbsp; ☐ <strong>Otro:</strong> _______________________</p>

<h3>2. EMPRESA INSTALADORA</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Empresa Instaladora:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>NIF Empresa:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Dirección Empresa:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Teléfono Empresa:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Nº Registro Empresa Instaladora:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Técnico responsable:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Nº Carnet / Categoría:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Seguro de responsabilidad civil (póliza / compañía):</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
  </tbody>
</table>

<h3>3. TITULAR Y EMPLAZAMIENTO</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Titular de la instalación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>NIF/DNI Titular:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Dirección de la instalación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Municipio / Provincia:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Referencia catastral:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Uso:</strong></td><td style="padding:8px;border:1px solid #ccc">☐ Vivienda ☐ Local comercial ☐ Industrial ☐ Pública concurrencia ☐ Agrícola</td></tr>
  </tbody>
</table>

<h3>4. DATOS DE LA INSTALACIÓN</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Tipo de instalación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Potencia / Capacidad:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Tensión de alimentación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Gas refrigerante (si procede):</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>GWP:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Carga de refrigerante (kg):</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Tipo de actuación:</strong></td><td style="padding:8px;border:1px solid #ccc">☐ Nueva ☐ Ampliación ☐ Reforma ☐ Sustitución</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Documentación técnica:</strong></td><td style="padding:8px;border:1px solid #ccc">☐ Memoria técnica ☐ Proyecto (nº: _______)</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Fecha de finalización de los trabajos:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
  </tbody>
</table>

<h3>5. EQUIPOS INSTALADOS</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">EQUIPO</th>
      <th style="padding:8px;background:#f3f4f6">MARCA / MODELO</th>
      <th style="padding:8px;background:#f3f4f6">Nº SERIE</th>
      <th style="padding:8px;background:#f3f4f6">POTENCIA</th>
      <th style="padding:8px;background:#f3f4f6">Nº FACTURA</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
  </tbody>
</table>

<h3>6. PRUEBAS REGLAMENTARIAS SUPERADAS</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">PRUEBA</th>
      <th style="padding:8px;background:#f3f4f6">RESULTADO</th>
      <th style="padding:8px;background:#f3f4f6">VALOR</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">Resistencia de aislamiento</td><td style="padding:8px;border:1px solid #ccc">☐ Correcto ☐ N/A</td><td style="padding:8px;border:1px solid #ccc">_______ MΩ</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Continuidad de conductores de protección</td><td style="padding:8px;border:1px solid #ccc">☐ Correcto ☐ N/A</td><td style="padding:8px;border:1px solid #ccc">_______ Ω</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Resistencia de puesta a tierra</td><td style="padding:8px;border:1px solid #ccc">☐ Correcto ☐ N/A</td><td style="padding:8px;border:1px solid #ccc">_______ Ω</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Disparo de diferenciales</td><td style="padding:8px;border:1px solid #ccc">☐ Correcto ☐ N/A</td><td style="padding:8px;border:1px solid #ccc">_______ mA / _______ ms</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Estanquidad del circuito frigorífico</td><td style="padding:8px;border:1px solid #ccc">☐ Correcto ☐ N/A</td><td style="padding:8px;border:1px solid #ccc">_______ bar</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Estanquidad / presión del circuito hidráulico</td><td style="padding:8px;border:1px solid #ccc">☐ Correcto ☐ N/A</td><td style="padding:8px;border:1px solid #ccc">_______ bar</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Funcionamiento en régimen y seguridades</td><td style="padding:8px;border:1px solid #ccc">☐ Correcto</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
  </tbody>
</table>
<p style="font-size:11px;color:#666">El detalle y los valores medidos van en el «Certificado de pruebas y verificaciones».</p>

<h3>7. GARANTÍA DEL FABRICANTE</h3>
<p>Los fabricantes condicionan la garantía a que la instalación y la puesta en marcha las haya hecho empresa habilitada y a que se registre el equipo. Deja constancia aquí:</p>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Puesta en marcha realizada por empresa habilitada:</strong></td><td style="padding:8px;border:1px solid #ccc">☐ Sí — fecha: _______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Registro de garantía ante el fabricante:</strong></td><td style="padding:8px;border:1px solid #ccc">☐ Hecho — nº/referencia: _______________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Garantía del equipo hasta:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Mantenimiento exigido por el fabricante:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Manuales entregados al titular:</strong></td><td style="padding:8px;border:1px solid #ccc">☐ Sí</td></tr>
  </tbody>
</table>

<h3>8. CERTIFICACIÓN</h3>
<p>El técnico que suscribe <strong>CERTIFICA</strong> que la instalación descrita se ha ejecutado conforme al reglamento marcado en el apartado 1, a la documentación técnica de referencia y a las instrucciones del fabricante; que se han realizado con resultado favorable las pruebas reglamentarias; y que la instalación reúne las condiciones de seguridad exigidas para su puesta en servicio.</p>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr>
      <td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Técnico / Instalador habilitado</strong><br/><br/>Técnico responsable: _______________________<br/><br/>Nº Carnet: _______________________<br/><br/>Fecha: _______________________<br/><br/>Sello y firma: ☐</td>
      <td style="padding:8px;border:1px solid #ccc"><strong>Recibí conforme — Titular</strong><br/><br/>Nombre: _______________________<br/><br/>&nbsp;<br/><br/>Fecha: _______________________<br/><br/>Firma: ☐</td>
    </tr>
  </tbody>
</table>
${AVISO_OFICIAL}`
    },
    {
      id: 'memoria_tecnica_diseno',
      label: 'Memoria Técnica de Diseño (MTD)',
      contenido: `<h2>MEMORIA TÉCNICA DE DISEÑO</h2>
<p><strong>Nº de expediente:</strong> _______________________ &nbsp;&nbsp; <strong>Fecha del documento:</strong> _______________________</p>

<h3>1. REGLAMENTO Y ALCANCE</h3>
<p>☐ REBT — RD 842/2002 (instalaciones que no precisan proyecto, según la ITC-BT-04)<br/>
☐ RITE — RD 1027/2007 y RD 178/2021 (potencia térmica nominal inferior a 70 kW)<br/>
☐ RSIF — RD 552/2019 (instalaciones de nivel 1)<br/>
☐ Otro: _______________________</p>
<p style="font-size:11px;color:#666">Por encima de esos umbrales el reglamento exige <strong>proyecto</strong> firmado por técnico titulado competente, no memoria técnica. Comprueba el umbral antes de tramitar.</p>

<h3>2. DATOS GENERALES</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Empresa Instaladora:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>NIF Empresa:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Nº Registro Empresa Instaladora:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Técnico redactor:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Nº Carnet / Colegiado:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Titular de la instalación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>NIF/DNI Titular:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Dirección de la instalación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Municipio / Provincia:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
  </tbody>
</table>

<h3>3. OBJETO</h3>
<p style="border:1px solid #ccc;padding:10px;min-height:50px">_______________________________________________________________________<br/><br/>_______________________________________________________________________</p>

<h3>4. DESCRIPCIÓN DE LA INSTALACIÓN</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Tipo de instalación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Potencia / Capacidad:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Sistema empleado:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Tensión de alimentación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Gas refrigerante (si procede):</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Carga de refrigerante (kg):</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
  </tbody>
</table>
<p><strong>Descripción:</strong></p>
<p style="border:1px solid #ccc;padding:10px;min-height:70px">_______________________________________________________________________<br/><br/>_______________________________________________________________________<br/><br/>_______________________________________________________________________</p>

<h3>5. BASES DE CÁLCULO Y JUSTIFICACIÓN</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">CONCEPTO</th>
      <th style="padding:8px;background:#f3f4f6">DATO DE PARTIDA</th>
      <th style="padding:8px;background:#f3f4f6">RESULTADO</th>
      <th style="padding:8px;background:#f3f4f6">NORMA APLICADA</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
  </tbody>
</table>

<h3>6. RELACIÓN DE EQUIPOS Y MATERIALES</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">CANT.</th>
      <th style="padding:8px;background:#f3f4f6">DESCRIPCIÓN</th>
      <th style="padding:8px;background:#f3f4f6">MARCA / MODELO</th>
      <th style="padding:8px;background:#f3f4f6">CARACTERÍSTICAS</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
  </tbody>
</table>

<h3>7. MEDIDAS DE SEGURIDAD Y PROTECCIONES</h3>
<p style="border:1px solid #ccc;padding:10px;min-height:60px">_______________________________________________________________________<br/><br/>_______________________________________________________________________<br/><br/>_______________________________________________________________________</p>

<h3>8. NORMATIVA APLICADA</h3>
<p>_______________________________________________________________________</p>
<p style="font-size:11px;color:#666">Referencias habituales: RD 842/2002 (REBT) e ITC-BT · RD 1027/2007 y RD 178/2021 (RITE) · RD 552/2019 (RSIF) · RD 115/2017 y Reglamento (UE) 2024/573 (gases fluorados) · RD 244/2019 (autoconsumo) · CTE.</p>

<h3>9. DOCUMENTOS QUE COMPLETAN ESTA MEMORIA</h3>
<p>☐ Esquema unifilar / de principio &nbsp; ☐ Planos de planta &nbsp; ☐ Cálculos justificativos<br/>
☐ Certificado de pruebas &nbsp; ☐ Fichas técnicas de los equipos &nbsp; ☐ Otros: _______________________</p>

<h3>10. FIRMA</h3>
<p style="margin-top:20px">
  Técnico redactor: _______________________<br/>
  Nº Carnet / Colegiado: _______________________<br/>
  Empresa: _______________________<br/>
  Fecha: _______________________ Firma: ☐
</p>`
    },
    {
      id: 'proyecto_tecnico',
      label: 'Proyecto técnico (portada e índice)',
      contenido: `<h2>PROYECTO TÉCNICO — PORTADA E ÍNDICE</h2>
<p style="font-size:11px;color:#666">Este modelo es la portada, el índice reglamentario y las hojas de firma y visado. El contenido de cada documento (memoria, cálculos, pliego, presupuesto y planos) lo redacta el técnico titulado competente que lo firma.</p>

<h3>1. IDENTIFICACIÓN DEL PROYECTO</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Título del proyecto:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Nº de expediente:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Titular de la instalación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>NIF/DNI Titular:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Dirección de la instalación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Municipio / Provincia:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Tipo de instalación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Potencia / Capacidad:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Presupuesto de ejecución material:</strong></td><td style="padding:8px;border:1px solid #ccc">_______ €</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Fecha del documento:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
  </tbody>
</table>

<h3>2. TÉCNICO AUTOR Y EMPRESA</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Técnico redactor:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Titulación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Nº Colegiado / Colegio profesional:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Empresa Instaladora:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>NIF Empresa:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Dirección de obra a cargo de:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
  </tbody>
</table>

<h3>3. MOTIVO POR EL QUE SE REDACTA PROYECTO</h3>
<p>☐ REBT — la instalación está entre las que exigen proyecto según la tabla de la <strong>ITC-BT-04</strong><br/>
☐ RITE — potencia térmica nominal <strong>igual o superior a 70 kW</strong> (RD 1027/2007)<br/>
☐ RSIF — instalación de <strong>nivel 2</strong> (RD 552/2019)<br/>
☐ Exigido por el órgano competente de la Comunidad Autónoma<br/>
☐ Otro: _______________________</p>

<h3>4. ÍNDICE DEL PROYECTO</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">DOCUMENTO</th>
      <th style="padding:8px;background:#f3f4f6">CONTENIDO</th>
      <th style="padding:8px;background:#f3f4f6">PÁG.</th>
      <th style="padding:8px;background:#f3f4f6">INCLUIDO</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">DOC. 1 — Memoria</td><td style="padding:8px;border:1px solid #ccc">Objeto, antecedentes, titular, emplazamiento, descripción, normativa</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">☐</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">DOC. 1 — Anexo de cálculos</td><td style="padding:8px;border:1px solid #ccc">Cargas, secciones, protecciones, caídas de tensión, rendimientos</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">☐</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">DOC. 1 — Estudio de seguridad y salud</td><td style="padding:8px;border:1px solid #ccc">O estudio básico, según proceda (RD 1627/1997)</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">☐</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">DOC. 1 — Gestión de residuos</td><td style="padding:8px;border:1px solid #ccc">Si procede</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">☐</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">DOC. 2 — Planos</td><td style="padding:8px;border:1px solid #ccc">Situación, emplazamiento, planta, esquema unifilar o de principio, detalles</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">☐</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">DOC. 3 — Pliego de condiciones</td><td style="padding:8px;border:1px solid #ccc">Técnicas, de ejecución, de materiales y de pruebas</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">☐</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">DOC. 4 — Mediciones y presupuesto</td><td style="padding:8px;border:1px solid #ccc">Mediciones, precios unitarios, presupuesto de ejecución</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">☐</td></tr>
  </tbody>
</table>

<h3>5. RELACIÓN DE PLANOS</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">Nº</th>
      <th style="padding:8px;background:#f3f4f6">TÍTULO DEL PLANO</th>
      <th style="padding:8px;background:#f3f4f6">ESCALA</th>
      <th style="padding:8px;background:#f3f4f6">FORMATO</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">01</td><td style="padding:8px;border:1px solid #ccc">Situación y emplazamiento</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">02</td><td style="padding:8px;border:1px solid #ccc">Planta general</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">03</td><td style="padding:8px;border:1px solid #ccc">Esquema unifilar / de principio</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">04</td><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">05</td><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
  </tbody>
</table>

<h3>6. VISADO Y PRESENTACIÓN</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Visado colegial:</strong></td><td style="padding:8px;border:1px solid #ccc">☐ Sí, nº _______________ ☐ No procede</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Órgano ante el que se presenta:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Fecha de presentación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Nº de registro de entrada:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
  </tbody>
</table>

<h3>7. FIRMA</h3>
<p style="margin-top:20px">
  En _______________________, a _______ de _______________________ de _______.<br/><br/>
  Técnico redactor: _______________________<br/>
  Titulación: _______________________<br/>
  Nº Colegiado: _______________________<br/>
  Firma: ☐
</p>`
    },
    {
      id: 'esquema_unifilar',
      label: 'Esquema unifilar (hoja de datos)',
      contenido: `<h2>ESQUEMA UNIFILAR — HOJA DE DATOS</h2>
<p><strong>Nº de plano:</strong> _______________________ &nbsp;&nbsp; <strong>Fecha:</strong> _______________________ &nbsp;&nbsp; <strong>Revisión:</strong> _______</p>

<h3>1. IDENTIFICACIÓN</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Titular de la instalación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Dirección de la instalación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Empresa Instaladora:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Técnico responsable:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Cuadro que se representa:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
  </tbody>
</table>

<h3>2. ACOMETIDA Y CABECERA</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Tensión de alimentación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Potencia contratada / instalada:</strong></td><td style="padding:8px;border:1px solid #ccc">_______ kW</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>CUPS:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Distribuidora:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>IGA — Interruptor General Automático:</strong></td><td style="padding:8px;border:1px solid #ccc">_______ A &nbsp; Curva _______ &nbsp; Poder de corte _______ kA</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>ICP / Control de potencia:</strong></td><td style="padding:8px;border:1px solid #ccc">_______ A</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Protección contra sobretensiones:</strong></td><td style="padding:8px;border:1px solid #ccc">☐ Tipo 1 ☐ Tipo 2 ☐ Tipo 3 ☐ No</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Resistencia de puesta a tierra:</strong></td><td style="padding:8px;border:1px solid #ccc">_______ Ω</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Sistema de conexión (esquema de distribución):</strong></td><td style="padding:8px;border:1px solid #ccc">☐ TT ☐ TN-S ☐ TN-C ☐ IT</td></tr>
  </tbody>
</table>

<h3>3. RELACIÓN DE CIRCUITOS</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">Nº</th>
      <th style="padding:8px;background:#f3f4f6">DENOMINACIÓN</th>
      <th style="padding:8px;background:#f3f4f6">P (W)</th>
      <th style="padding:8px;background:#f3f4f6">MAGNETO. (A)</th>
      <th style="padding:8px;background:#f3f4f6">DIFEREN. (A/mA)</th>
      <th style="padding:8px;background:#f3f4f6">SECCIÓN (mm²)</th>
      <th style="padding:8px;background:#f3f4f6">LONG. (m)</th>
      <th style="padding:8px;background:#f3f4f6">c.d.t. (%)</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">C1</td><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">C2</td><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">C3</td><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">C4</td><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">C5</td><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">C6</td><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">C7</td><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">C8</td><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">C9</td><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">C10</td><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">C11</td><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">C12</td><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td><td style="padding:8px;border:1px solid #ccc">_____</td></tr>
  </tbody>
</table>
<p style="font-size:11px;color:#666">c.d.t. = caída de tensión. Límites de la ITC-BT-19: 3 % en alumbrado y 5 % en el resto de usos para instalaciones interiores en viviendas; 4,5 % y 6,5 % respectivamente cuando la alimentación es por línea general.</p>

<h3>4. DIBUJO DEL ESQUEMA</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;height:420px;vertical-align:top">Espacio para dibujar el esquema unifilar a mano o pegar el plano.</td></tr>
  </tbody>
</table>

<h3>5. OBSERVACIONES</h3>
<p style="border:1px solid #ccc;padding:10px;min-height:50px">_______________________________________________________________________<br/><br/>_______________________________________________________________________</p>

<h3>6. FIRMA</h3>
<p style="margin-top:20px">
  Técnico responsable: _______________________<br/>
  Nº Carnet / Colegiado: _______________________<br/>
  Empresa: _______________________<br/>
  Fecha: _______________________ Firma: ☐
</p>`
    },
    {
      id: 'certificado_pruebas',
      label: 'Certificado de pruebas y verificaciones',
      contenido: `<h2>CERTIFICADO DE PRUEBAS Y VERIFICACIONES</h2>
<p><strong>Nº de certificado:</strong> _______________________ &nbsp;&nbsp; <strong>Fecha de las pruebas:</strong> _______________________</p>

<h3>1. IDENTIFICACIÓN</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Empresa Instaladora:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>NIF Empresa:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Técnico responsable:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Nº Carnet:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Titular de la instalación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Dirección de la instalación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Tipo de instalación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
  </tbody>
</table>

<h3>2. EQUIPOS DE MEDIDA UTILIZADOS</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">EQUIPO</th>
      <th style="padding:8px;background:#f3f4f6">MARCA / MODELO</th>
      <th style="padding:8px;background:#f3f4f6">Nº SERIE</th>
      <th style="padding:8px;background:#f3f4f6">CALIBRACIÓN HASTA</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
  </tbody>
</table>

<h3>3. VERIFICACIONES ELÉCTRICAS (REBT · UNE-HD 60364-6)</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">VERIFICACIÓN</th>
      <th style="padding:8px;background:#f3f4f6">VALOR MEDIDO</th>
      <th style="padding:8px;background:#f3f4f6">VALOR EXIGIDO</th>
      <th style="padding:8px;background:#f3f4f6">RESULTADO</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">Inspección visual previa</td><td style="padding:8px;border:1px solid #ccc">—</td><td style="padding:8px;border:1px solid #ccc">Sin defectos</td><td style="padding:8px;border:1px solid #ccc">☐ Apto ☐ N/A</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Continuidad de conductores de protección</td><td style="padding:8px;border:1px solid #ccc">_______ Ω</td><td style="padding:8px;border:1px solid #ccc">Continuidad correcta</td><td style="padding:8px;border:1px solid #ccc">☐ Apto ☐ N/A</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Resistencia de aislamiento (230 V)</td><td style="padding:8px;border:1px solid #ccc">_______ MΩ</td><td style="padding:8px;border:1px solid #ccc">≥ 1,0 MΩ</td><td style="padding:8px;border:1px solid #ccc">☐ Apto ☐ N/A</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Resistencia de aislamiento (400 V)</td><td style="padding:8px;border:1px solid #ccc">_______ MΩ</td><td style="padding:8px;border:1px solid #ccc">≥ 1,0 MΩ</td><td style="padding:8px;border:1px solid #ccc">☐ Apto ☐ N/A</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Resistencia de puesta a tierra</td><td style="padding:8px;border:1px solid #ccc">_______ Ω</td><td style="padding:8px;border:1px solid #ccc">Según ITC-BT-18 y sensibilidad del diferencial</td><td style="padding:8px;border:1px solid #ccc">☐ Apto ☐ N/A</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Disparo del diferencial — corriente</td><td style="padding:8px;border:1px solid #ccc">_______ mA</td><td style="padding:8px;border:1px solid #ccc">≤ In nominal</td><td style="padding:8px;border:1px solid #ccc">☐ Apto ☐ N/A</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Disparo del diferencial — tiempo</td><td style="padding:8px;border:1px solid #ccc">_______ ms</td><td style="padding:8px;border:1px solid #ccc">Dentro del tiempo del fabricante</td><td style="padding:8px;border:1px solid #ccc">☐ Apto ☐ N/A</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Impedancia del bucle de defecto</td><td style="padding:8px;border:1px solid #ccc">_______ Ω</td><td style="padding:8px;border:1px solid #ccc">Coordinada con la protección</td><td style="padding:8px;border:1px solid #ccc">☐ Apto ☐ N/A</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Caída de tensión máxima</td><td style="padding:8px;border:1px solid #ccc">_______ %</td><td style="padding:8px;border:1px solid #ccc">Según ITC-BT-19</td><td style="padding:8px;border:1px solid #ccc">☐ Apto ☐ N/A</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Secuencia de fases / sentido de giro</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">Correcta</td><td style="padding:8px;border:1px solid #ccc">☐ Apto ☐ N/A</td></tr>
  </tbody>
</table>

<h3>4. PRUEBAS DE LA INSTALACIÓN TÉRMICA (RITE · IT 2)</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">PRUEBA</th>
      <th style="padding:8px;background:#f3f4f6">VALOR MEDIDO</th>
      <th style="padding:8px;background:#f3f4f6">RESULTADO</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">Limpieza interior de redes</td><td style="padding:8px;border:1px solid #ccc">—</td><td style="padding:8px;border:1px solid #ccc">☐ Realizada ☐ N/A</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Estanquidad de la red hidráulica</td><td style="padding:8px;border:1px solid #ccc">_______ bar / _______ min</td><td style="padding:8px;border:1px solid #ccc">☐ Apto ☐ N/A</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Estanquidad de conductos</td><td style="padding:8px;border:1px solid #ccc">Clase _______</td><td style="padding:8px;border:1px solid #ccc">☐ Apto ☐ N/A</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Equilibrado hidráulico / de caudales de aire</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">☐ Apto ☐ N/A</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Prueba de libre dilatación</td><td style="padding:8px;border:1px solid #ccc">_______ °C</td><td style="padding:8px;border:1px solid #ccc">☐ Apto ☐ N/A</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Comportamiento térmico en régimen</td><td style="padding:8px;border:1px solid #ccc">_______ °C</td><td style="padding:8px;border:1px solid #ccc">☐ Apto ☐ N/A</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Prueba de los elementos de seguridad</td><td style="padding:8px;border:1px solid #ccc">_______ bar</td><td style="padding:8px;border:1px solid #ccc">☐ Apto ☐ N/A</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Análisis de combustión (si procede)</td><td style="padding:8px;border:1px solid #ccc">CO _______ ppm / rend. _______ %</td><td style="padding:8px;border:1px solid #ccc">☐ Apto ☐ N/A</td></tr>
  </tbody>
</table>

<h3>5. PRUEBAS DEL CIRCUITO FRIGORÍFICO (RSIF · UNE-EN 378)</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">PRUEBA</th>
      <th style="padding:8px;background:#f3f4f6">VALOR MEDIDO</th>
      <th style="padding:8px;background:#f3f4f6">RESULTADO</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">Prueba de resistencia a presión</td><td style="padding:8px;border:1px solid #ccc">_______ bar</td><td style="padding:8px;border:1px solid #ccc">☐ Apto ☐ N/A</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Prueba de estanquidad</td><td style="padding:8px;border:1px solid #ccc">_______ bar / _______ h</td><td style="padding:8px;border:1px solid #ccc">☐ Apto ☐ N/A</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Vacío del circuito</td><td style="padding:8px;border:1px solid #ccc">_______ micras</td><td style="padding:8px;border:1px solid #ccc">☐ Apto ☐ N/A</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Detección de fugas (equipo y método)</td><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">☐ Sin fugas ☐ N/A</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Carga de refrigerante</td><td style="padding:8px;border:1px solid #ccc">_______ kg de _______</td><td style="padding:8px;border:1px solid #ccc">☐ Apto ☐ N/A</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Presiones de trabajo (alta / baja)</td><td style="padding:8px;border:1px solid #ccc">_______ / _______ bar</td><td style="padding:8px;border:1px solid #ccc">☐ Apto ☐ N/A</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Recalentamiento / subenfriamiento</td><td style="padding:8px;border:1px solid #ccc">_______ / _______ K</td><td style="padding:8px;border:1px solid #ccc">☐ Apto ☐ N/A</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Tarado de presostatos de seguridad</td><td style="padding:8px;border:1px solid #ccc">_______ bar</td><td style="padding:8px;border:1px solid #ccc">☐ Apto ☐ N/A</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">Detector de refrigerante en sala (si procede)</td><td style="padding:8px;border:1px solid #ccc">_______ ppm</td><td style="padding:8px;border:1px solid #ccc">☐ Apto ☐ N/A</td></tr>
  </tbody>
</table>

<h3>6. DEFECTOS DETECTADOS Y SUBSANACIÓN</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">DEFECTO</th>
      <th style="padding:8px;background:#f3f4f6">CLASIFICACIÓN</th>
      <th style="padding:8px;background:#f3f4f6">SUBSANADO</th>
      <th style="padding:8px;background:#f3f4f6">FECHA</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">☐ Leve ☐ Grave ☐ Muy grave</td><td style="padding:8px;border:1px solid #ccc">☐ Sí ☐ No</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">☐ Leve ☐ Grave ☐ Muy grave</td><td style="padding:8px;border:1px solid #ccc">☐ Sí ☐ No</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______________________</td><td style="padding:8px;border:1px solid #ccc">☐ Leve ☐ Grave ☐ Muy grave</td><td style="padding:8px;border:1px solid #ccc">☐ Sí ☐ No</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
  </tbody>
</table>

<h3>7. RESULTADO GLOBAL</h3>
<p style="font-size:15px"><strong>☐ FAVORABLE</strong> &nbsp;&nbsp; <strong>☐ FAVORABLE CON DEFECTOS LEVES</strong> &nbsp;&nbsp; <strong>☐ DESFAVORABLE</strong></p>

<h3>8. FIRMA</h3>
<p style="margin-top:20px">
  Técnico responsable: _______________________<br/>
  Nº Carnet / Colegiado: _______________________<br/>
  Empresa: _______________________<br/>
  Fecha: _______________________ Firma: ☐
</p>
<p style="margin-top:15px;font-size:11px;color:#666">Las pruebas se han realizado conforme al reglamento aplicable a cada instalación: RD 842/2002 (REBT) y UNE-HD 60364-6 en la parte eléctrica; RD 1027/2007 (RITE), IT 2, en la parte térmica; y RD 552/2019 (RSIF) junto con la UNE-EN 378 en el circuito frigorífico. Documento a revisar y firmar por técnico habilitado.</p>`
    },
    {
      id: 'justificante_tasas',
      label: 'Justificante de pago de tasas',
      contenido: `<h2>JUSTIFICANTE DE PAGO DE TASAS</h2>
<p><strong>Nº de expediente:</strong> _______________________ &nbsp;&nbsp; <strong>Fecha:</strong> _______________________</p>

<p style="border:1px solid #999;padding:10px;background:#fafafa;font-size:12px"><strong>⚠️ IMPORTANTE:</strong> El justificante que vale ante la Administración es el <strong>documento de pago sellado por la entidad bancaria o el recibo de la sede electrónica</strong> de la Comunidad Autónoma. Esta hoja es la ficha de control para el expediente y para el cliente: sirve para saber qué se pagó, cuándo y con qué referencia. Grapa o adjunta el justificante original.</p>

<h3>1. EXPEDIENTE</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Titular de la instalación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>NIF/DNI Titular:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Dirección de la instalación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Tipo de instalación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Empresa Instaladora:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>NIF Empresa:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
  </tbody>
</table>

<h3>2. DATOS DEL PAGO</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Administración / Comunidad Autónoma:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Órgano competente:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Modelo de tasa:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Código / concepto de la tasa:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Denominación del hecho imponible:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Importe abonado:</strong></td><td style="padding:8px;border:1px solid #ccc">_______ €</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Importe en letra:</strong></td><td style="padding:8px;border:1px solid #ccc">_________________________ euros</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Fecha de pago:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Forma de pago:</strong></td><td style="padding:8px;border:1px solid #ccc">☐ Sede electrónica ☐ Entidad bancaria ☐ Tarjeta ☐ Transferencia</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Entidad / oficina:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>NRC / Nº de referencia del ingreso:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Nº de justificante:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Pagado por:</strong></td><td style="padding:8px;border:1px solid #ccc">☐ El titular ☐ La empresa instaladora (a repercutir)</td></tr>
  </tbody>
</table>

<h3>3. PRESENTACIÓN DEL EXPEDIENTE</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Fecha de presentación:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Nº de registro de entrada:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Estado del expediente:</strong></td><td style="padding:8px;border:1px solid #ccc">☐ Presentado ☐ Requerido ☐ Resuelto</td></tr>
  </tbody>
</table>

<h3>4. JUSTIFICANTE ORIGINAL</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc;height:260px;vertical-align:top">Espacio para grapar o pegar el justificante sellado.</td></tr>
  </tbody>
</table>

<h3>5. FIRMA</h3>
<p style="margin-top:20px">
  Presentado por: _______________________<br/>
  Empresa: _______________________<br/>
  Fecha: _______________________ Firma: ☐
</p>`
    },
    {
      id: 'otros_documento',
      label: 'Otros — documento en blanco',
      contenido: `<h2>_______________________________________</h2>
<p style="font-size:11px;color:#666">Escribe aquí arriba el título del documento. Esta hoja es para lo que no encaja en ningún otro modelo: un anexo, una comunicación, un acta, una relación de material… Borra los apartados que no necesites y añade los que hagan falta con el botón «Editar».</p>

<p><strong>Nº de documento:</strong> _______________________ &nbsp;&nbsp; <strong>Fecha:</strong> _______________________</p>

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
    <tr><td style="padding:8px;border:1px solid #ccc"><strong>Técnico responsable:</strong></td><td style="padding:8px;border:1px solid #ccc">_______________________</td></tr>
  </tbody>
</table>

<h3>2. OBJETO</h3>
<p style="border:1px solid #ccc;padding:10px;min-height:50px">_______________________________________________________________________<br/><br/>_______________________________________________________________________</p>

<h3>3. CONTENIDO</h3>
<p style="border:1px solid #ccc;padding:10px;min-height:150px">_______________________________________________________________________<br/><br/>_______________________________________________________________________<br/><br/>_______________________________________________________________________<br/><br/>_______________________________________________________________________<br/><br/>_______________________________________________________________________<br/><br/>_______________________________________________________________________</p>

<h3>4. RELACIÓN / TABLA DE DATOS</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <thead>
    <tr>
      <th style="padding:8px;background:#f3f4f6">CONCEPTO</th>
      <th style="padding:8px;background:#f3f4f6">DETALLE</th>
      <th style="padding:8px;background:#f3f4f6">CANTIDAD</th>
      <th style="padding:8px;background:#f3f4f6">OBSERVACIONES</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
    <tr><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_______________</td><td style="padding:8px;border:1px solid #ccc">_______</td><td style="padding:8px;border:1px solid #ccc">_______</td></tr>
  </tbody>
</table>

<h3>5. OBSERVACIONES</h3>
<p style="border:1px solid #ccc;padding:10px;min-height:60px">_______________________________________________________________________<br/><br/>_______________________________________________________________________</p>

<h3>6. FIRMAS</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    <tr>
      <td style="padding:8px;border:1px solid #ccc;width:50%"><strong>Por la empresa</strong><br/><br/>Nombre: _______________________<br/><br/>Fecha: _______________________<br/><br/>Firma: ☐</td>
      <td style="padding:8px;border:1px solid #ccc"><strong>Por el cliente</strong><br/><br/>Nombre: _______________________<br/><br/>Fecha: _______________________<br/><br/>Firma: ☐</td>
    </tr>
  </tbody>
</table>`
    }
  ]
};
