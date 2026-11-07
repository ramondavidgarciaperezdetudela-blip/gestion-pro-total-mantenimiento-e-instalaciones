# Changelog — Gestión Pro Total

Todos los cambios notables de **Gestión Pro Total Mantenimiento e Instalaciones** se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/) y este proyecto sigue [Versionado Semántico](https://semver.org/lang/es/).

---

## [1.103.1] — 2026-11-06

### Corregido
- **Documentos en el móvil: ya se ven el número y el cliente.** En pantallas pequeñas la tarjeta de cada presupuesto, factura o recibo solo mostraba el importe; ahora va en dos filas: arriba el tipo, número, referencia y cliente, y abajo el importe, el estado y los botones.
- **Abrir documentos en el móvil es más fácil.** Toda la zona de datos de la tarjeta abre el documento, y hay un botón azul **«Ver»** en cada tarjeta. La vista previa aprovecha mejor la pantalla y la tabla de líneas se desplaza en horizontal en lugar de apretarse.
- Los botones Editar, Duplicar y Borrar quedan siempre visibles en el móvil (antes solo aparecían al pasar el ratón).

---

## [1.113.0] — 2026-11-07

### Añadido
- **Importar tarifas en segundo plano.** Mientras se guarda una tarifa puedes cerrar la ventana («Seguir trabajando») y seguir usando el programa: abajo a la derecha sale un panel con la barra, el porcentaje, el tiempo transcurrido y el que queda. Al terminar avisa con «Importación realizada con éxito»; si hay errores o avisos, la notificación se queda en pantalla con el detalle para revisarlo. Vale para la tarifa de proveedor y para Mi base de datos.

## [1.112.0] — 2026-11-07

### Añadido
- **Importar una tarifa enseña el progreso de cada apartado**, como la copia de seguridad: barra con porcentaje y contador para «Leer la tarifa actual», «Guardar productos nuevos» y «Actualizar precios» (tarifa de proveedor), y para «Leer tu base de datos» y «Guardar y actualizar artículos» (Mi base de datos).

## [1.111.0] — 2026-11-07

### Añadido
- **Subir la tarifa de un proveedor desde su ficha:** botón «Subir tarifa (PDF / Excel)» en cada proveedor, con el proveedor ya elegido.
- **Cálculo de cámaras: alimentación y monobloc.** Se elige 230 V monofásica o 400 V trifásica y se descartan las máquinas de la tarifa que dicen la otra tensión; además de evaporador y condensadora, propone equipos monobloc, y enseña la tensión de cada máquina y el volumen de la cámara.

## [1.110.0] — 2026-11-07

### Añadido
- **Subir la tarifa de un proveedor en PDF sin IA.** Al elegir el proveedor y subir su PDF, el programa lee la tabla de precios (referencia, descripción, unidad y precio) en el momento, sin internet ni IA y de cualquier tamaño, y la deja en la tarifa de ese proveedor tras revisarla. Solo si el PDF es una foto escaneada, sin texto, hace falta la IA o pedir el Excel al proveedor.

## [1.109.0] — 2026-11-07

### Añadido
- **Vista 3D sin nombres:** ya no salen los nombres de los equipos ni de las cámaras, para enseñárselo bien al cliente; con la casilla «Mostrar nombres» los vuelves a ver. El PDF del plano también sale sin nombres.
- **Color de paredes y suelo** al dibujar una cámara frigorífica (si lo sabes), y editable después en cámaras, salas y paredes sueltas. La vista 3D usa esos colores.
- **Posición exacta de cualquier equipo** (X / Y en metros), además de la altura sobre el suelo, el alto, el giro y las medidas que ya se podían cambiar.

## [1.108.0] — 2026-11-07

### Añadido
- **Tubería de desagüe** en el plano: botones «Desagüe» y «Desagüe a mano» para dibujar la línea por donde se necesite, con diámetro del tubo, pendiente y si sale por gravedad o con bomba. Sale en la leyenda, en el PDF y en la hoja de materiales.
- **Bomba de condensados** en Climatización y en Refrigeración, para impulsar el agua de condensación de la máquina.
- **Atajos de teclado en el plano:** Ctrl+C copiar, Ctrl+X cortar, Ctrl+V pegar, Ctrl+Z deshacer, Ctrl+Y rehacer. Pegar varias veces va desplazando cada copia.

### Corregido
- **Esc** cierra el cuadro de la tubería/cable recién dibujado, y al pulsarlo otra vez suelta la herramienta y quita la selección.

## [1.107.0] — 2026-11-07

### Añadido
- **Plano: distancia a la pared al colocar equipos.** Al colocar, arrastrar o seleccionar un equipo salen en el plano las distancias a las paredes de los cuatro lados, con milímetros (por ejemplo 0,375 m) y un punto de referencia marcado en la pared. Escribe la distancia que quieras, sin límite de 1 m o 0,5 m, y pulsa Intro: el equipo se coloca exactamente ahí. Con Tab cambias de pared de referencia.
- **Panel de distancias del equipo seleccionado**, con las cuatro medidas editables desde 1 mm.
- **Cuadrícula con cualquier medida** (de 1 mm a 50 m), además de 1 m y 0,5 m.

### Cambiado
- El imán de puntos cercanos ahora se ajusta solo a las paredes, no a otros equipos, que van a distancias distintas.

## [1.106.0] — 2026-11-07

### Añadido
- **Lista de elementos del plano en el lateral derecho.** Todo lo dibujado (cámaras y salas, puertas y ventanas, equipos, conexiones, paredes y cotas) aparece en una lista agrupada, con buscador. Pulsando un elemento en la lista se selecciona en el plano —y al revés: lo que seleccionas en el dibujo se marca en la lista—. Así se llega a las puertas sin que se coja la cámara por error.
- **Puertas y elementos finos más fáciles de pulsar en el dibujo**: tienen una zona mínima de pulsación (18 px en pantalla), aunque estén pegados a la pared de la cámara.
- **Cambiar la escala del dibujo ya no deforma el plano.** Antes, al pasar de 50 a 80 px por metro las paredes y equipos cambiaban de medida real. Ahora se reescalan todas las coordenadas (paredes, cámaras, equipos, tuberías, cotas) y el dibujo mantiene sus medidas en metros; se puede deshacer.
- **Escala siempre visible bajo el plano**: px por metro, cuadrícula, zoom y la escala normalizada a la que saldría impreso en A3 y en A4 (1:50, 1:100…).
- **Hoja de materiales para el pedido** (botón «Hoja de materiales» y apartado «Materiales y pedido» al exportar el plano en PDF/imprimir, en su propia hoja): tubería frigorífica por diámetro (metros, codos y pedido con +10 %), distancia de cada tramo, cableado por sección, conductos, paneles de cámara (m² de paredes, techo y suelo y medida de cada pared), paredes y tabiques, y equipos/puertas con sus medidas. Se puede guardar en PDF, imprimir o bajar a Excel (CSV). Las medidas salen del dibujo y se actualizan solas.
- Prueba automática nueva: `npm run test:planolista`.

---

## [1.105.0] — 2026-11-07

### Añadido
- **Fichas técnicas de máquinas** (nuevo apartado en el menú y en Inicio → Herramientas y Manuales). Cada ficha guarda fabricante, modelo, referencia, enlace a la ficha del fabricante, copia en PDF (si la subes o se puede descargar), las conexiones de tubería (líquido y aspiración) y notas. Se puede buscar, editar y borrar, y entra en las copias de seguridad.
- **Al añadir una máquina a un presupuesto**, el aviso de tubería reconoce **fabricante y modelo** a partir de la descripción o la referencia y:
  - si la máquina **ya está en Fichas técnicas**, saca a un lado «✔ Guardada» con el botón **Abrir la ficha** (la copia guardada si la hay, si no el enlace) y usa sus conexiones de tubería: ya no hace falta ir a internet;
  - si **no está**, ofrece **Buscar la ficha con IA** (solo si la ayuda con IA está encendida; usa búsqueda en internet y lo que devuelve es una sugerencia que hay que revisar), enlaces de **búsqueda en Google** con fabricante y modelo, y la página de descargas del fabricante cuando se conoce; puedes **pegar el enlace** o **subir el PDF** y pulsar **Guardar en Fichas técnicas**, que guarda también las conexiones elegidas;
  - con el programa del ordenador o la app del móvil puede además **guardar una copia del PDF** del enlace (el navegador no deja).
- Prueba automática nueva: `npm run test:fichasmaquinas`.

### Para Base44
- Entidad nueva `FichaTecnicaMaquina`: sincronizar main en Base44 y publicar.

---

## [1.104.0] — 2026-11-06

### Añadido
- **Tubería automática al añadir equipos frigoríficos o de clima** (splits, cassettes, multisplits, unidades condensadoras, evaporadores, cámaras… ZANOTTI, INTARCON, DANFOSS, KIDE, TAVER, etc.). Unos segundos después de añadir un equipo a un documento aparece un aviso azul que:
  - **averigua las conexiones** (líquido y aspiración): primero las que hayas guardado para esa referencia, luego las que vengan escritas en la descripción (`1/4" - 3/8"`, `líquido 3/8 aspiración 5/8`, `Ø 6,35/12,7 mm`…) y, si no hay, unas orientativas según la potencia (BTU, kW, frigorías o CV). Te dice de dónde ha salido cada dato y siempre puedes cambiar los diámetros;
  - **propone el material**: tubo de cobre de líquido y de aspiración, aislamiento, codos 90º, uniones/manguitos y, opcionales, soldadura de plata y cinta/abrazaderas; con tu distancia, número de codos y de uniones, que puedes cambiar;
  - **pone el precio** de Mi base de datos si ya tienes ese tubo, codo, etc. (por diámetro); si no, lo dejas tú;
  - se añade al presupuesto solo lo que marques, y puede **recordar las conexiones** de esa referencia para la próxima vez (en este dispositivo).
- Avisos propios: multisplit (una línea por unidad interior) y baja temperatura (la aspiración suele subir una medida).
- Prueba automática nueva: `npm run test:tuberias`.

---

## [1.103.0] — 2026-11-06

### Añadido
- **Mi base de datos se actualiza con lo que modifiques.** Al guardar un documento, si una línea tiene una referencia que ya está en Mi base de datos y has cambiado su descripción, precio, unidad o plazo, se abre un aviso con «antes → ahora» de cada dato; marcas lo que quieres y se actualiza el artículo (nada cambia sin tu confirmación). Se ignoran los campos vacíos y la descripción «.».
- Prueba automática nueva: `npm run test:actualizarbase`.

---

## [1.102.0] — 2026-11-06

### Añadido
- **Documentos vencidos por falta de respuesta.** Al cumplirse el plazo, los documentos sin respuesta pasan solos a **«vencido»** y aparece un aviso rojo arriba en Documentos con el número, cliente, referencia, importe y los días de retraso.
  - **Plazo**: la fecha de vencimiento del propio documento si la tiene; si no, la fecha de emisión + **30 días** (cambiable en el propio aviso, «Plazo para responder»).
  - **Qué vence**: presupuestos en borrador o enviados y facturas enviadas, mientras el cliente no haya firmado (aceptado o rechazado). Los pagados, cancelados y recibos no se tocan.
  - **Recuperarlos**: «Ampliar plazo» (vuelve a enviado con nueva fecha límite), «Pasar a…» (borrador, enviado, pagado o cancelado), «Recordar» por WhatsApp (presupuestos) o «Descartar aviso».
  - **El aviso se borra solo** al hacer cualquiera de esas gestiones, o al cambiar el estado desde la lista o al editar el documento. Si el plazo ya había pasado, se renueva para que no vuelva a vencer al instante.
- Prueba automática nueva: `npm run test:vencimientos`.

### Para Base44
- `Invoice` gana los campos `vencido_el` y `vencido_aviso_cerrado`: sincronizar main en Base44.

---

## [1.84.0] — 2026-11-01

### Añadido
- **Carga latente por psicrometría** en *Calculadora de potencia de aire acondicionado*: con temperatura y humedad relativa interior y exterior, altitud, caudal de ventilación, número de personas y humedad extra (kg/h), calcula la **carga latente**, la carga sensible de ventilación, el total, el factor de calor sensible y los kilos de agua a retirar por hora. Avisa cuando el factor es bajo y conviene una máquina con buena deshumectación.
- **Densidad del aire según la altitud**: la presión local y la densidad del aire (interior y exterior) se corrigen con la altitud, además del punto de rocío y la humedad absoluta. Las entradas se recuerdan en el equipo.

### Notas
- Valores orientativos para pre-dimensionar. Versión sin Base44.

---

## [1.83.0] — 2026-11-01

### Añadido
- **Averías e incidencias como tarjetas con micro-estados**: borde fino con color semántico (rojo, ámbar, verde, gris), icono mínimo y rejilla densa con etiquetas diminutas en mayúsculas sobre cada cifra (tipo, fecha, días abierta o que tardó, coste, técnico, horas, piezas). Una avería sin reparar pasa a **urgente** (roja y con pulso) si lleva más de 7 días o es una fuga de gas. Sustituye a la lista en *Historial de averías* e *Incidencias*; la galería y la impresión no cambian.
- **Simulador del ciclo frigorífico** en *Diagnóstico de carga*: cuatro deslizadores (presión de baja, presión de alta, recalentamiento, subenfriamiento) que funcionan como mandos físicos; el diagnóstico se recalcula al mover cada uno (falta de gas, exceso de carga, válvula obstruida, golpe de líquido, condensación alta, compresor gastado…). Parte de tus medidas reales, se puede restablecer y **aplicar al diagnóstico**.
- **Zona climática del CTE en la ficha del cliente**: a partir del código postal, la provincia, la población o las coordenadas se muestra la zona (por ejemplo A3, D3, E1), su descripción de invierno y verano y un **mapa de puntos** de las capitales de provincia coloreadas por severidad, con la del cliente resaltada. Es la zona de la capital, orientativa: el municipio puede variar por altitud.
- **Generador de órdenes de mantenimiento preventivo** en *Plan de mantenimiento*: lista los equipos vencidos, próximos y al día según su periodicidad; se marcan los que se quieran y se genera la **hoja de trabajo en PDF** (una por página, con lista de tareas según el tipo de equipo, control de fugas de gas fluorado cuando es obligatorio, zona climática, espacio para mediciones y firmas) o se **crean como órdenes de SAT** numeradas rellenando huecos.

### Notas
- Versión sin Base44: todo funciona con los datos locales.

---

## [1.82.0] — 2026-11-01

### Cambiado
- **Todo el programa con el estilo de la ficha de maquinaria**: las tarjetas llevan cabecera con línea de separación y relleno compacto; las etiquetas de los campos van en mayúsculas pequeñas; los campos, desplegables y áreas de texto tienen fondo propio y borde fino; las pestañas tienen marco y la activa se destaca como tarjeta; las tablas llevan cabecera tenue en mayúsculas y cifras alineadas; las etiquetas de estado (insignias) usan tipografía de instrumento; y los diálogos separan su título con una línea.
- Se aplica en los componentes base, así que lo heredan **todas las pantallas** a la vez, en claro y en oscuro. La barra «Volver» de los diálogos ya respeta el modo oscuro.

---

## [1.81.0] — 2026-11-01

### Cambiado
- **Registro de maquinaria de clientes en secciones**, como una ficha técnica: *Identificación*, *Refrigerante · Reglamento (UE) 2024/573*, *Circuito frigorífico*, *Potencias y consignas*, *Mantenimiento preventivo* y *Foto y notas*. Se usa tanto en Inventario › Equipos Cliente como en la pestaña de equipos de la ficha del cliente.
- **Con el gas y la carga se calcula al momento** el CO₂ equivalente (t), los kg de HFO (Anexo II) y el **control de fugas obligatorio** (cada 12, 6 o 3 meses según toneladas; se duplica con detector de fugas; no obligatorio por debajo de 5 t, o de 10 t si es hermético), con la fecha del próximo control. Al elegir el gas se rellena el PCA, que se puede corregir.
- Nuevos datos de la máquina: carga de refrigerante, PCA, último control de fugas, hermético / detección de fugas / residencial, aceite y su carga, expansión, compresor, presiones nominales y PS de placa, potencia sensible y calorífica, consignas de frío y calor, humedad relativa y último preventivo (con el próximo calculado).
- El cliente y el nombre del equipo son obligatorios al guardar.

---

## [1.80.0] — 2026-11-01

### Añadido
- **Diseño de panel de control (estilo SCADA)** para las herramientas de refrigeración, con colores termodinámicos semánticos: cian (baja presión, frío), rojo (alta presión, calor), verde (estable) y ámbar (tolerancia).
- **Panel de instrumentos en Diagnóstico de carga**: presión baja, presión alta, recalentamiento (SH), subenfriamiento (SC) y salto en el filtro como tarjetas con **medidor de zonas** (crítica · tolerancia · estable) y aguja. Si el recalentamiento es casi nulo, la tarjeta **pulsa en rojo** con el aviso «peligro de golpe de líquido»; el estado global del ciclo (estable / tolerancia / crítico) sale arriba.
- **Tendencia de presiones**: «Anotar lectura» guarda cada medición y dibuja las curvas de baja y alta superpuestas en el mismo eje, como un manómetro digital.
- Presiones de gas con displays de instrumento: valores en tipografía monoespaciada, etiquetas en mayúsculas y las unidades en tono más claro.
- Los campos numéricos de toda la aplicación usan tipografía monoespaciada con cifras alineadas.

---

## [1.79.0] — 2026-10-31

### Añadido
- **Vista 3D en CAD**: al guardar en CAD con el apartado «Vista 3D» marcado salen dos cosas: una **hoja isométrica** en líneas, como un apartado más (vertical u horizontal), y el **modelo 3D real** (paredes y equipos como cuerpos 3D, a escala 1:1 en milímetros) en las capas `VISTA3D_PAREDES` y `VISTA3D_EQUIPOS`, a la derecha de las hojas, que se puede girar en AutoCAD, LibreCAD o FreeCAD.

### Nota
- El CAD se guarda en **DXF**. Un DWG real no se puede generar desde la aplicación; en AutoCAD basta «Guardar como» DWG, o convertirlo con el programa gratuito *ODA File Converter*.

---

## [1.78.0] — 2026-10-31

### Cambiado
- **El plano se guarda e imprime POR APARTADOS**, no todo mezclado en una hoja. Cada apartado sale en su propia hoja, con marco, cajetín (cliente, empresa, apartado, escala y fecha) y número de hoja:
  1. **Plano frigorífico** con su leyenda y los datos de cada elemento (marca, modelo, referencia, proveedor, precio…).
  2. **Plano eléctrico** con su leyenda de líneas y elementos, y a continuación el esquema eléctrico.
  3. **Cálculos y medidas**: resumen, cargas de cada cámara, metros de tubería por diámetro, instalación eléctrica y presupuesto aproximado.
  4. **Vista 3D**, aparte.
- **Eliges la posición de cada hoja**: vertical u horizontal por apartado, papel A3 o A4 y qué apartados incluir. Lo elegido se recuerda.
- Un solo botón **«Guardar / imprimir…»** (también el PDF de la barra superior) para PDF, imprimir o CAD, en vez de botones sueltos.
- **CAD (DXF) nuevo y válido**: las hojas van una al lado de otra, en milímetros de papel y a escala normalizada 1:N, con capas por apartado. Los textos salen sin acentos para que cualquier CAD los lea.
- El envío por Gmail adjunta el mismo PDF por apartados.

### Corregido
- Algunos símbolos del esquema eléctrico (magnetotérmico, diferencial…) daban error al generar el PDF.

---

## [1.77.2] — 2026-10-30

### Añadido
- **Eliminar tarifas antiguas**: dentro de cada proveedor, casillas y botones para eliminar las seleccionadas, las caducadas o toda su tarifa; con contador, aviso de las que fallan y Deshacer durante 15 segundos.

## [1.77.1] — 2026-10-30

### Añadido
- **Accesos directos en la pantalla de inicio (Android)**: al mantener pulsado el icono salen Nueva orden SAT, Agenda, Clientes, Documentos, Plano frigorífico y Copia de seguridad, y se pueden arrastrar a la pantalla de inicio. En Windows el instalador crea el acceso en el escritorio y en el menú Inicio.

## [1.77.0] — 2026-10-30

### Añadido
- **Cálculo frigorífico en el plano** («Cálculo frío»): carga de cada cámara, potencia del equipo y escalón comercial; busca evaporadores y condensadoras en la tarifa del proveedor que elijas y los añade al plano con su precio.
- **La copia de seguridad guarda la configuración completa del programa** (aspecto, letra, IA, impresión, carpeta de copias…) y la restaura sola. Nunca copia sesiones ni licencias.

## [1.76.3] — 2026-10-30

### Añadido
- **Envío de correos directo** con el servidor propio: usa los datos de Configuración → Email (servidor SMTP, usuario y clave de aplicación; TLS en 465 o STARTTLS en 587). Ya no pide «backend activo». En el modo «solo este dispositivo» o con Supabase sigue disponible el correo del móvil (mailto:) y se explica el motivo.

## [1.76.2] — 2026-10-30

### Añadido
- **Administrador de serie** en el servidor propio: al arrancar por primera vez ya existe la cuenta kairigardia.gestionprototal@gmail.com (o la de ADMIN_EMAIL), con la clave de ADMIN_PASSWORD o una inicial guardada en ADMIN-CLAVE.txt. En el modo «solo este dispositivo» quien usa el aparato ya es el administrador.
- **Alta de usuarios** desde Configuración → Usuarios sin Base44: el administrador crea la cuenta y recibe una clave provisional para entregarla. Cambio de clave propio (`/api/clave`).
- Incluye todo lo de la 1.76.x de la versión con Base44: puertas y ventanas en pared, tubería/cable/conducto a mano, 3D con conexiones, verificación de restauración, vinculación automática de documentos con su cliente.

## [1.75.0] — 2026-10-30

### Mejorado
- **Iconos con IA en ordenador, móvil y tablet**: si el generador de imágenes del servicio no está disponible o no da permiso, el programa prueba solo con tu clave de OpenRouter (modelo de imagen) y, si tampoco, hace que la IA de texto configurada dibuje el icono en SVG. Si ninguna responde, sigue existiendo el icono propio sin IA, así que siempre se puede guardar.

## [1.74.2] — 2026-10-30

### Corregido
- **«Crear estándar + IA»** daba «Permission denied for create operation on PlanoCatalogItem»: la regla de seguridad solo dejaba crear a administradores. Ahora cada usuario crea, ve y edita sus propios elementos (el administrador, todos).
- En **pantalla completa** las ventanas de «Añadir elemento» y de iconos IA quedaban ocultas detrás del plano; ahora se muestran por encima.

## [1.74.1] — 2026-10-30

### Corregido
- **Restaurar copia de seguridad**: ahora cada factura, documento, orden SAT, ficha, cálculo, nota y cita se vuelve a vincular con su cliente. Antes, al crearse los registros con identificadores nuevos, los enlaces se rompían. Se restaura primero clientes y proveedores, luego facturas/órdenes/fichas y por último el resto, enlazando por identificador y, si este ya estaba roto en la copia, por el nombre del cliente. Al terminar se informa de cuántos registros se han vinculado y cuántos apuntan a un cliente que no está.
- Los documentos de cliente con el mismo nombre ya no se confunden entre sí al restaurar.

## [1.74.0] — 2026-10-30

### Añadido
- **Filtro deshidratador** (Refrigeración → Filtros): caudal de refrigerante, velocidad en la línea de líquido por tubo, capacidad de catálogo mínima, caída de presión con el filtro de tu catálogo, riesgo de vapor antes de la válvula, esquema del circuito e informe A4 vinculado al cliente («+ Filtros» en su ficha).
- **Plano frigorífico**: alto de sala y de cámara; altura de montaje y alto de cada equipo (evaporador colgado, etc.); girar e invertir iconos (90°, ángulo libre, espejo izquierda/derecha y arriba/abajo, p. ej. puerta que abre hacia fuera); desplazar el plano (arrastrar en un hueco, botón central o derecho, barra espaciadora, rueda, herramienta «Mover plano»); la tecla Esc suelta el elemento que se está colocando y deselecciona.
- **Vista 3D más realista**: equipos con forma propia (ventiladores, aletas, puertas, cristal, depósitos), sombras, paredes con espesor y alturas reales.
- Equivalencias de gases, tablas P–T y diagnóstico con datos reales de 29 gases.

### Corregido
- Copia de seguridad: tras restaurar se vacía la memoria del programa y se recarga, para que se vean los datos restaurados; una sección que el servidor no conoce ya no se da por restaurada.
- Iconos con IA: ya no usa una función inexistente para subir; si la IA falla (permiso, créditos, conexión) explica el motivo y guarda un icono propio del equipo.
- Los diálogos de sala, cámara y visor 3D quedaban por debajo de la pantalla completa; ahora van por encima. Las medidas admiten coma decimal.

## [1.72.0] — 2026-10-28

### Añadido
- **Planos frigoríficos, ahora con los cálculos dentro** (Refrigeración →
  Plano Frigorífico, y en los accesos de Inicio). La pantalla ya dejaba
  dibujar el local con sus paredes, colocar equipos, conectarlos y sacar el
  presupuesto con IA. Lo que faltaba era que supiera de frío y de electricidad:
  - **Catálogo de 55 elementos** en cinco categorías: refrigeración,
    climatización (nueva), electricidad y aparamenta, seguridad y estructura.
    Entran centrales, vitrinas, murales, arcones, abatidores, recibidores,
    separadores de aceite, filtros, visores, solenoides, presostatos,
    termostatos, splits, cassettes, conductos, fancoils, recuperadores,
    contactores, guardamotores, variadores, autómatas, luminarias, detectores
    de fugas, alarmas de persona encerrada y ventilación de emergencia.
  - **Cada equipo pide lo suyo.** El evaporador pregunta potencia,
    refrigerante, desescarche y nº de ventiladores; el diferencial,
    sensibilidad, clase y polos; la válvula de seguridad, el tarado y a dónde
    descarga; el cuadro, módulos y grado IP. Los valores que casi nunca
    cambian vienen ya puestos (un diferencial, 30 mA clase A). El detector de
    fugas avisa de lo que pide el Reglamento (UE) 2024/573, y la válvula de
    seguridad de a dónde puede descargar.
  - **Cálculo de tubería.** Al seleccionar una tubería pide gas y líquido y
    los **sugiere** con la potencia del equipo al que va enganchada, la
    longitud dibujada y el desnivel, penalizando las tiradas largas. Dice la
    carga aproximada que se queda en la línea de líquido y avisa cuando la
    tirada pide sifones de retorno de aceite o cuando se sale de tabla.
  - **Cálculo eléctrico.** Las líneas eléctricas distinguen lo que llevan
    (potencia, maniobra, comunicación o tierra) y **sugieren la sección en
    mm²** por intensidad y por caída de tensión, diciendo cuál de las dos
    manda. La de comunicación pide el bus (Modbus RTU, Modbus TCP, BACnet,
    KNX, CAN, LonWorks, Ethernet, Wi-Fi o propietario) y se pinta de otro
    color en el plano, aparte de la fuerza.
  - **Presupuesto aproximado a la vista**, recalculándose mientras se dibuja:
    material por equipo, metros de tubería y de cable, y un 35 % de mano de
    obra. Si tienes tus precios en Tarifas, manda el tuyo. La IA parte de esa
    cifra en vez de inventarla de cero.
  - **El PDF y la impresión** llevan ahora los datos de cada equipo, el
    desnivel de cada tubería, la sección y el bus de cada línea eléctrica y el
    total aproximado, con el aviso de que los diámetros y las secciones son
    orientativos.

### Corregido
- **El PDF del plano no se generaba nunca**, ni al exportar ni al imprimir: el
  exportador llamaba a un método de jsPDF que no existe, y el aviso en
  pantalla solo decía «No se pudo generar el PDF» sin contar el motivo.
- La pantalla de planos **no cargaba** («La página no se cargó correctamente»)
  en cuanto el catálogo traía una categoría nueva, porque la paleta se quedaba
  sin icono para ella. Ahora lleva icono de reserva.
- La tubería recién creada no quedaba seleccionada, así que la ficha donde se
  piden los diámetros de gas y de líquido no se abría: había que ir a buscar
  la línea al plano para rellenarla.
- El resumen del PDF se escribía fuera del papel cuando la instalación tenía
  muchos equipos: ahora pasa a una hoja nueva.
- Al imprimir cualquier pantalla con un lienzo, el dibujo salía **en blanco**:
  lo pintado no está en el HTML, está dentro del lienzo. Ahora se imprime como
  imagen.
- La ficha de cliente se quedaba en «Cargando…» para siempre cuando se abría
  sin indicar cliente: ahora dice qué ha pasado y ofrece ir a la lista.

---

## [1.71.0] — 2026-10-28

### Añadido
- **Pantalla «Novedades del programa».** Hasta ahora el historial que se veía
  dentro del programa solo anotaba ediciones de DATOS (clientes, documentos…),
  porque es lo único que pasa por el registrador de cambios. Los arreglos y las
  mejoras del programa se escribían en el CHANGELOG, que vivía solo en el
  repositorio: podías tener dos días de trabajo hecho y, mirando el programa,
  parecía que no había pasado nada. Ahora se ven desde Sistema → Novedades, y
  también desde los accesos de Inicio.
  - Una ficha por versión, con su fecha y cuántos cambios trae; la que tienes
    instalada viene abierta y marcada.
  - Los cambios separados por apartado (añadido, corregido, mejorado, internos),
    cada uno con su color.
  - Buscador: se escribe «copias», «gas» o «firma» y salen solo los cambios que
    hablan de eso.
- El CHANGELOG se empaqueta DENTRO del programa, así que esta pantalla funciona
  sin cobertura y sin ir a buscar nada a GitHub.

---

## [1.70.0] — 2026-10-28

### Añadido
- **Documentación de arquitectura y workflow.** Diagramas técnicos (HTML + imágenes) generados con Archify y sincronizados desde el repositorio de GitHub:
  - `docs/arquitectura/Arquitectura-Gestion-Pro-Total.html`
  - `docs/arquitectura/Workflow-Gestion-Pro-Total.html`
  - `docs/arquitectura/arquitectura.archify.json`
  - `docs/arquitectura/workflow.archify.json`
  - `docs/arquitectura/README.md`
- **Integración con GitHub.** Sincronización bidireccional del repositorio
  `gestion-pro-total-mantenimiento-e-instalaciones`; los commits externos ya se
  reflejan automáticamente en la app.

### Corregido
- **Copias de seguridad incompletas silenciosas.** Antes, una página de lectura
  cortada por exceso de peticiones se tomaba por "fin de los datos", así que la
  copia se guardaba a medias sin avisar y una restauración en modo "copia limpia"
  se llevaba por delante lo que faltaba. Ahora cualquier lectura incompleta falla
  de forma explícita y la sección se marca como fallida, no como vacía.
- **Saturación del servidor durante la copia/restauración.** Se lanzaban 4
  entidades × 3 páginas en paralelo (12 lecturas simultáneas), que vaciaban el
  cupo de 140 lecturas/min en segundos y provocaban reintentos encadenados hasta
  agotarlos. Ahora las páginas van seguidas dentro de cada entidad y solo 2
  entidades a la vez.
- **Restauración a ciegas en modo "actualizar".** Si la lectura de registros
  actuales fallaba por exceso de peticiones, antes se actualizaba igual y se
  creaban duplicados o se machacaban datos sin saberlo. Ahora esa sección se
  omite y se anota, sin tocarla.

### Mejorado (rendimiento y fiabilidad)
- **Limitador global de peticiones compartido.** Nuevo `crearFrenoGlobal()` en
  `src/lib/limiteServidor.js` como singleton que coordina el ritmo proactivo
  entre conteos, copias, restauraciones y borrado de duplicados, evitando que
  operaciones paralelas compitan y vuelvan a saturar el servidor.
- **Conteo de registros sin descargar el contenido.** `contarRegistros()` ahora
  pide solo el campo `id` en vez de la ficha entera (fotos, PDF, firmas), por lo
  que la pantalla de copias se abre y vuelve tras restaurar mucho más rápido.
- **Progreso por sección en copia/restauración.** Nuevo componente
  `SeccionesProgreso` integrado en el Centro de Copias que muestra el avance de
  cada apartado (leyendo / guardando / borrando / hecho / fallo) con su conteo de
  registros, en vez de una barra única global.
- **Restauración "limpia" con rescate previo.** Antes de borrar nada se guarda
  una copia de los registros existentes; si ese rescate falla, no se borra. La
  "copia limpia" deja de ser una operación sin vuelta atrás.
- **Secciones vacías no se vacían.** Una sección sin registros en la copia casi
  siempre significa que no se pudo leer cuando se hizo, no que estuviera vacía.
  Ahora no se toca, en vez de borrarla para no meter nada dentro.
- **Duplicados: análisis y borrado separados.** `analizarDuplicados()` muestra lo
  que va a pasar antes de borrar; `borrarDuplicados()` solo toca lo marcado como
  seguro y cuenta los fallos en vez de tragárselos.

### Cambios internos
- `backupEngine.js` refactorizado para usar `crearFrenoGlobal()` en todos los
  procesos de conteo, copia, restauración y borrado de duplicados.
- Reducida la concurrencia de conteos de registros de 8 a 2.
- `crearFreno` refactorizado para persistir como singleton global.

---

## [1.69.1] — 2026-10-27

### Corregido
- Fallo intermitente en copias y restauraciones por saturación de peticiones al
  servidor (140 lecturas/min), ahora centralizado bajo un único limitador
  compartido.
- El indicador global de progreso de copia no se perdía al navegar a otra
  pantalla (el motor vive fuera del componente `BackupCenter`).

### Mejorado
- Progreso por sección visible durante la copia y la restauración.
- Concurso de peticiones reducido de 12 lecturas simultáneas a 2.

---

## [1.69.0] — 2026-10-27

### Añadido
- Componente `SeccionesProgreso` con progreso granular por apartado.
- `crearFrenoGlobal` en `src/lib/limiteServidor.js`.

### Cambios internos
- Centralización del control de flujo de datos en `BackupCenter.jsx` usando un
  único limitador de peticiones compartido.
- Versión verificada con build de producción exitoso.