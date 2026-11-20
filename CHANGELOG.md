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

## [1.157.0] — 2026-11-20

### Corregido
- **La copia de seguridad en Android se retoma sola si el programa se cierra.** La copia se va guardando por tramos en el teléfono y un diario apunta hasta dónde llegó. Si Android cierra el programa (sin memoria, etc.), al volver a la pantalla de copias sigue desde el último punto guardado, sin repetir nada. Cada vez que se retoma, las páginas son la mitad de grandes para gastar menos memoria. Al terminar, los tramos se unen en el fichero definitivo y se borran. Si hay una copia interrumpida, sale un aviso con «Continuar la copia» y «Empezar de nuevo».
- **El cierre al 92 %:** la subida a Google Drive iba acumulando en memoria todos los trozos pendientes cuando era más lenta que la copia (cientos de MB al final). Ahora espera y nunca tiene más de dos trozos a la vez. Si algo falla al leer una sección, lo ya copiado no se tira: se puede continuar.

## [1.156.0] — 2026-11-20

### Corregido
- **Copia de seguridad en Android: ya no se cierra el programa a mitad de la copia.** La causa era que cada sección (por ejemplo las tarifas con miles de fotos) se leía ENTERA en memoria antes de escribir nada; el móvil se quedaba sin memoria, reiniciaba la aplicación y el fichero quedaba roto. Ahora se lee y se escribe página a página (en el móvil, de 1.000 en 1.000): nunca hay más de una página en memoria.
- **Se pueden recuperar copias dañadas** (error «El archivo está dañado… Expected ',' or '}'…»): se leen las secciones y registros que están enteros y se avisa de lo que falta. Una copia rescatada solo se puede restaurar en modo «actualizar» (no borra nada).
- **Copia en Google Drive: pasos claros y a prueba de errores.** El programa genera la clave y la pone ya dentro del código que se copia (antes había que cambiarla a mano, y si se olvidaba daba «clave incorrecta»). Nuevo paso «autorizar» en el script para que Google pida el permiso (antes no pedía nada y la aplicación no conectaba). Cada fallo dice qué paso falta (acceso «Cualquier usuario», permiso sin dar, clave que no coincide, sin internet).
- El script de Drive (v2) guarda cada copia en trozos dentro de su carpeta, comprueba al final que están todos y no ofrece copias a medias; así aguanta copias de cientos de MB. Las copias antiguas siguen apareciendo. **Hay que pegar el script nuevo** (el programa lo da) y elegir «Nueva versión» al implementar.

## [1.155.0] — 2026-11-20

### Corregido
- **Si el programa se reinicia o se recarga, vuelves a la pantalla en la que estabas trabajando** (antes caía siempre en el menú principal y había que volver a abrirla). Se recuerda la última pantalla y, si el reinicio ocurre en los 15 minutos siguientes (Android que cierra la ventana al ir a WhatsApp o a la cámara, recarga, actualización), se abre esa misma. Abrir el programa más tarde sigue empezando en el menú. Las páginas que abre el cliente no se ven afectadas. Lo que estabas escribiendo se sigue devolviendo a su formulario.

## [1.154.0] — 2026-11-20

### Corregido
- **Las notas informativas ya no quedan «pendientes de envío» si no las has enviado.** Al modificar o preparar una nota para los clientes, no se marca como enviada ni se archiva en la ficha del cliente como «pendiente de firma». Solo cuenta como enviada cuando pulsas tú **WhatsApp** o **correo**.
- Estados claros en cada cliente: «Preparada · sin enviar», «Enviada · pendiente de firma» y «Firmada». El botón de correo masivo solo envía las que aún no se han enviado.
- Las que una versión anterior ya había archivado como pendientes sin enviarse se retiran de la ficha del cliente.

## [1.153.0] — 2026-11-19

### Corregido
- **Menos parpadeos y recargas del programa con tarifas grandes.** Con los datos en el servidor propio o en Supabase, cada consulta suelta a una tabla de miles de artículos con fotos (tarifas de 10.000 líneas, cientos de MB) volvía a bajar la tabla ENTERA si habían pasado más de 4 segundos. En una tablet o un móvil eso congelaba la pantalla o hacía que el sistema cerrase y recargase la aplicación. Ahora las tablas de más de 1.000 registros se descargan una vez y se mantienen al día con lo que graba este aparato; en la prueba, abrir la tarifa y hacer tres consultas sueltas pasó de 4 descargas completas a 1. Los cambios de otros aparatos se ven al pulsar «Recargar» (que ahora vuelve a bajar los datos) o pasados 10 minutos.
- **Recargar la tarifa ya no parpadea.** Al recargar con la lista a la vista, se cambia de una vez al final en lugar de vaciarse, encogerse y volver a crecer.

## [1.152.0] — 2026-11-18

### Añadido
- **Catálogos con la foto al lado de la tabla.** En páginas como «Split de pared» (foto del equipo a la izquierda y, a su derecha, «Serie H14X» con su tabla Código | Artículo | €), cada foto se asigna ahora a TODAS las filas de la tabla que tiene al lado, hasta que cambia la serie o el modelo, y así en todo el catálogo. Si dentro de una misma tabla hay otra banda de serie («SERIE H12») con su propia foto, esa serie lleva la suya. Las pegatinas, el QR y los iconos de la página no se toman por foto del producto.
- **Descripción del artículo.** Cuando la tabla trae el modelo y la descripción entre la referencia y el precio, el artículo se guarda con ella («MUPR-09-H14X Refrigeración 2.720 W - Calefacción 3.130 W») y con la referencia del proveedor (CL20060); la serie queda en las notas.

### Cambiado
- Los nombres largos de la tarifa se ven en tres líneas.

## [1.151.0] — 2026-11-18

### Corregido
- **Tarifa bien puesta en tablet y móvil.** Las columnas Ref., Categoría, Coste, Venta y Margen ya no se parten letra a letra: tienen su ancho y la tabla se desliza si no cabe. La casilla de selección y la foto van una al lado de la otra.
- **Tarifas de miles de artículos.** Se dibujan de 100 en 100 (botones «Mostrar 200 más» y «Mostrar las N»), así el aparato no se bloquea y las fotos cargan al momento.

### Añadido
- **Filtro Todos / Con foto / Sin foto** en cada tarifa, con contador. La cabecera dice cuántos artículos llevan foto.
- **Foto guardada que no se puede mostrar:** se marca con un icono rojo y la cabecera lo cuenta, para no confundirla con «sin foto».

## [1.150.0] — 2026-11-18

### Cambiado
- **Artículos sin descripción no se importan.** Si en una tarifa (Excel, CSV o PDF) una fila solo trae números —o solo su referencia— y ninguna descripción que diga qué es, ya no se añade: no sabemos qué artículo es ni se puede buscar su foto. Al importar, la app avisa de cuántas filas ha descartado.
- **Eliminar una tarifa entera es de golpe.** «Toda la tarifa de…» borra por bloques de 1.000 líneas en una sola operación (antes iba línea por línea). Si algún bloque falla, solo ese se reintenta una a una para decir cuáles no se pudieron borrar. El botón Deshacer también recupera por bloques.

## [1.149.0] — 2026-11-18

### Corregido
- **Móvil — «Tareas y avisos»:** la ventana ya no sube por debajo de la barra del teléfono (hora, batería…): deja el margen de seguridad arriba y el botón de cerrar queda a la vista. Abajo hay dos botones grandes, **Atrás** y **Menú principal**.

### Añadido
- **«Marcar completada»** en todas las tareas y avisos (facturas, presupuestos, SAT, firmas, proyectos…): desaparece de la lista y se puede recuperar en «Anulados».
- Los mantenimientos ya no vuelven a avisar hasta la revisión del año siguiente cuando se pulsa «Quitar aviso» o «Revisión hecha» (comprobado: tras recargar la app no reaparecen y el mensaje indica la fecha en que volverán).

### Cambiado
- Las listas de SAT y mantenimientos que alimentan los avisos leen hasta 5.000 registros (antes 300).

## [1.148.0] — 2026-11-18

### Corregido
- **Las fotos de los PDF y de internet no se guardaban bien con servidor propio (ni Supabase).** Cada foto era una petición al servidor; con 11.000 fotos se superaba el límite de 1.500 peticiones por minuto y muchas se rechazaban, además de reescribir todo el fichero de datos cada vez y llegar a bloquear la pantalla por falta de memoria. Ahora las fotos se guardan en lotes de 100 (una sola escritura por lote). Con el catálogo de Tarragona: 11.302 fotos en 3 min 14 s y 145 peticiones (antes más de 1.900 y la pantalla se caía).
- La búsqueda de fotos en internet también guarda por grupos (una escritura por artículo-grupo en vez de una por medida).
- `bulkUpdate` de los almacenes propios escribe el lote de una vez.

## [1.147.0] — 2026-11-18

### Cambiado
- **«Fotos desde PDF» ya no bloquea el programa.** Antes abría una ventana que impedía usar nada hasta terminar. Ahora corre en segundo plano: puedes cambiar de pantalla y trabajar, y un panel abajo a la izquierda (visible en cualquier pantalla) enseña la página, las fotos guardadas, el tiempo y los pasos; al acabar muestra el resumen y el fichero de las que faltan.
- **Búsqueda de fotos en internet más rápida:** 12 búsquedas a la vez (antes 6) y 20 s máximo por artículo (antes 30).
- **La lectura del PDF cede el hilo entre páginas**, así la pantalla sigue respondiendo.

### Corregido
- Los paneles de avance en segundo plano (fotos e importación) se pintaban en mitad de la página en lugar de en la esquina de la pantalla.

## [1.146.0] — 2026-11-18

### Corregido
- **Al volver a subir una tarifa se actualizan precios y fotos solos.** Comprobado en pantalla: una segunda versión de la tarifa cambia los precios de los artículos que ya existían, pone sus fotos nuevas y añade los artículos nuevos, sin duplicar ninguno.
- **Tarifas en tabla con fotos pequeñas:** las miniaturas de producto de 30–50 puntos (típicas de las listas de precios con una foto por fila) no se detectaban y el artículo se quedaba sin imagen. Ahora se importan.

## [1.145.0] — 2026-11-17

### Añadido
- **Las fotos se pueden ampliar.** En las tarifas, pulsa la foto de cualquier artículo (o la del cuadro de edición) y se abre el visor a pantalla completa con lupa, flechas y teclado para pasar a las demás fotos.

### Cambiado
- **Fotos más ligeras pero más nítidas.** Se guardan en WebP (≈35 % menos peso que JPEG con la misma calidad; JPEG de respaldo donde no exista) y con más resolución (hasta 480 px de lado), así se ven bien al ampliarlas sin engordar la base de datos.
- **Sin tope de artículos por proveedor.** Todas las pantallas que consultan precios de proveedor (buscador global, presupuestos con IA, calculadoras, consulta de producto, resumen de compras…) leen ahora TODOS los precios por tandas, en lugar de los primeros 500 o 1000.

## [1.144.0] — 2026-11-17

### Sin límites en las tarifas
- La lista de tarifas carga **todos** los artículos (sin tope de 500.000) y todos los proveedores (antes 200). La importación ya no tenía tope: probado con 11.421 artículos, todos guardados sin error.

### Corregido
- **«Fotos desde PDF» era lentísimo** (más de 20 minutos con 11.421 artículos, parecía que no encontraba nada): la lista se repintaba entera por cada foto. Ahora se pinta por tandas: el catálogo de Tarragona completo se recupera en **2 min 36 s** (11.302 fotos guardadas en sus artículos; las 119 restantes salen en el informe con su motivo). Probado en la aplicación de escritorio real y en el navegador.

---

## [1.143.0] — 2026-11-17

### Corregido
- **«Fotos desde PDF» no recuperaba ninguna foto** (con el catálogo de Tarragona: 0 fotos tras 10 minutos). Nuevo motor: entiende catálogos con foto + tabla de referencias, fotos dentro de formularios del PDF y tarifas con una foto por bloque o página. Con el mismo catálogo: **11.302 de 11.421 fotos en 1 minuto**. Las medidas del mismo producto comparten la foto. Si el motor nuevo no saca ninguna, se prueba el clásico.
- Las fotos se guardan en los artículos del proveedor elegido (la pregunta «¿De qué proveedor es la tarifa?» llegó en la 1.142.0).

---

## [1.142.0] — 2026-11-17

### Mejorado
- **«Fotos desde PDF» y «Rellenar imágenes que faltan» preguntan primero de qué proveedor es la tarifa.** Solo se buscan las fotos de los artículos de ese proveedor (con el número de artículos sin foto de cada uno), así la carga es mucho más rápida. «Todos los proveedores» sigue disponible, pero más lento.

### Windows
- El flujo de compilación firma el instalador de Windows automáticamente cuando se añaden los secretos de firma (Azure Artifact Signing o certificado .pfx). Nueva guía `GUIA-FIRMAR-WINDOWS.md` con los pasos, costes y qué hacer mientras tanto. Sin certificado, Windows seguirá avisando: es la única forma real de quitar el aviso de SmartScreen.

---

## [1.141.0] — 2026-11-17

### Corregido
- **Tarifas y folletos en PDF leídos como tabla ya traen las imágenes.** Antes se leían los precios pero las fotos se perdían. Ahora cada artículo recibe la foto más cercana de su página (la imagen del bloque), se ignoran logos y sellos repetidos y fondos a página completa, y las medidas del mismo producto comparten la foto principal.
- Se leen también las fotos que los programas de maquetación (InDesign, Canva, Illustrator) guardan dentro de «formularios» del PDF: en el catálogo de Tarragona suben de 6.310 a 6.794 artículos con foto.
- Si un PDF no trae fotos de producto, el aviso lo dice y sugiere «Rellenar imágenes».

---

## [1.140.0] — 2026-11-17

### Mejorado
- **Mismo producto en varias medidas = misma foto.** En catálogos y tarifas, los artículos con el mismo título y descripción (aunque estén en otra página u otro bloque) comparten la foto principal. «Rellenar imágenes» busca una sola vez por producto y aplica la foto a todas sus medidas.
- **Folletos tipo tarifa.** Los folletos cortos con fotos de producto y precios (con o sin «€») se leen con todos sus datos y su imagen. Si la tabla da mejores nombres, se usa y se le unen las fotos por referencia.
- **Rellenar imágenes** busca en internet por nombre (sin la medida), por descripción y por referencia, y recuerda lo encontrado.
- **Desde el navegador con servidor propio**, la búsqueda de imágenes funciona: el servidor lee los buscadores (nueva ruta protegida `/api/web`, solo con sesión, solo direcciones públicas y con límites).

---

## [1.139.0] — 2026-11-17

### Corregido
- **Catálogos y revistas en PDF con fotos.** Al importar un catálogo en formato revista (fotos + tablas de código y precio) la aplicación ahora lee el título, la descripción, la variante, el código, el precio y **la foto de cada artículo**. Con el catálogo de Tarragona de 524 páginas: 11.421 artículos, 6.310 con foto. Los que no tienen foto se completan con **«Rellenar imágenes»** (búsqueda en internet).
- **Actualizar un catálogo ya cargado** ahora también actualiza las imágenes, la descripción y el precio, no solo el precio; y no duplica artículos que no tienen código.
- Barra de progreso al leer PDFs grandes y posibilidad de cancelar.

### Seguridad (servidor propio)
- Bloqueo temporal tras varios intentos fallidos de inicio de sesión (por dirección y por correo) y límite de peticiones por minuto.
- Las sesiones abiertas caducan al cambiar la contraseña.
- Cabeceras de seguridad en todas las respuestas (nosniff, no incrustable, política de contenido, HSTS con HTTPS).
- Archivos subidos: nombres impredecibles, no se aceptan .html/.js/.exe…, y se sirven aislados (sandbox) para que no puedan ejecutar código en la aplicación.
- Corregido el acceso a carpetas fuera de la web (`../`), el envío de correo ya no puede apuntar a la red interna, límites de tamaño y tiempos de conexión, y `/api/estado` no revela cuántos usuarios hay.
- Nueva guía «Publicar en internet con seguridad» en `GUIA-SERVIDOR-PROPIO.md` y pruebas automáticas (`npm run test:seguridad`).

---

## [1.138.0] — 2026-11-16

### Corregido
- **«Nueva cita» en la Agenda no abría nada.** El botón no hacía nada porque la ventana de la cita no se abría desde él. Ahora abre el formulario vacío con la fecha de hoy. Editar una cita existente ya funcionaba y sigue igual.

---

## [1.137.0] — 2026-11-16

### Mejorado
- **«Tareas y avisos» se abre por encima de cualquier pantalla.** Antes la campana dibujaba su ventana dentro de la barra superior y las pestañas del programa la tapaban. Ahora se abre fuera de todas las barras, desde la campana o desde el apartado «Tareas y avisos» del menú, sin sacarte de la pantalla en la que estás. Se cierra con la X, tocando fuera o con Esc.
- **Todo en un solo sitio, sin ir cliente por cliente.** Una única lista con: presupuestos sin respuesta, facturas vencidas o por vencer, SAT pendientes, firmas que faltan, mantenimientos atrasados, citas de hoy, proyectos vencidos y cambios de opinión. Filtro por tipo y buscador por cliente o número.
- **Acciones directas en cada aviso:** *anular* el presupuesto, factura, orden SAT, cita o proyecto (con confirmación), marcar cobrada, pasar el SAT a en curso o completado, confirmar o dar por hecha una cita, completar o pausar un proyecto, marcar atendido un cambio de opinión, recordatorio por WhatsApp (busca el teléfono del cliente al pulsar), «Abrir para cambiar» y «Ficha» del cliente. «Quitar aviso» lo esconde sin tocar el documento, y en «Anulados» se puede restaurar.
- **Barra de título fija con PDF e Imprimir a la derecha.** Solo se mueve la lista; el título y los filtros se quedan arriba. En esta pantalla ya no flotan los botones PDF e Imprimir sobre la lista.
- **El número de la campana** sale de la misma lista que la ventana, así que siempre coinciden. Las listas ya no se limitan a los 60 documentos más recientes, y un mantenimiento solo avisa si la última revisión de ese equipo es antigua.

---

## [1.136.0] — 2026-11-16

### Mejorado
- **Fotos al buscar y al añadir artículos.** En «Buscar en proveedores» y en el desplegable de la descripción de cada línea sale la **foto** de cada artículo (una miniatura) para reconocerlo de un vistazo.
- **Al imprimir un documento pregunta por las fotos:** *sin fotos*, *con todas* o *solo las que yo elija* (con la lista de líneas y su foto para marcar). Recuerda lo último que elegiste. Las fotos no se guardan dentro del documento (no pesa), se toman del artículo.
- **Filtro por proveedor más completo:** se puede elegir el proveedor **sin escribir nada** y ver sus artículos, y con el proveedor elegido sirven todos los tipos de búsqueda (todo, nombre/descripción, referencia, marca/categoría). Si ningún artículo tiene todas las palabras, enseña los que tienen alguna (los de más coincidencias primero).
- **La pantalla «Tarifas por proveedor» busca igual:** sin tildes, palabras en cualquier orden y referencia con otro formato.
- **Importar tarifas y catálogos de más tipos de archivo:** además de PDF y Excel, ahora LibreOffice (.ods), .xlsm, .xlsb, CSV/TSV, TXT y tablas web (.html). Los **catálogos en PDF que no son una tabla** (artículos con su referencia y precio repartidos por la página) se leen por líneas, sin IA.
- **Búsqueda de fotos en internet desde el navegador, sin IA:** hasta ahora solo funcionaba en el programa de escritorio y en el móvil. En esta versión sin Base44 sigue funcionando en el programa de escritorio y en el móvil; en el navegador necesita el servidor propio.

### Corregido
- **Precios con coma en CSV/TXT:** «9,5» se leía como 95 y «1.949,69» como 1,949. Ahora se leen bien («9,5» → 9,50; «1.949,69» → 1949,69), también en Excel con texto.

---

## [1.135.0] — 2026-11-16

### Mejorado
- **Buscar artículos de proveedores al poner líneas en un documento.** Nuevo botón «Buscar en proveedores» (en presupuestos, facturas, recibos y en los materiales del SAT): se busca por nombre, descripción, referencia o palabras sueltas, sin importar tildes, mayúsculas ni el orden. Cada resultado dice **en qué proveedor está**, su referencia y su precio, y hay un **filtro de proveedor** con el número de coincidencias de cada uno («Frigicoll (3), Zanotti (1)…»). También se puede limitar a «Nombre / descripción» o a «Referencia» (esta acepta la referencia con o sin guiones, puntos o espacios).
- **Rápido:** los artículos se cargan una vez y se preparan para buscar; con 100.000 artículos cada búsqueda tarda unos 16 ms.
- **El desplegable de la descripción de cada línea** ya busca igual (palabras sueltas, sin tildes, por referencia) y enseña el proveedor de cada opción, con botones para quedarse con uno solo.
- **«Base de precios»** buscaba solo en los 200 primeros artículos y solo en la descripción; ahora lee todos y busca también por referencia, marca y proveedor.

## [1.134.0] — 2026-11-13

### Añadido
- **Notas personalizadas para cada cliente, también al enviarlas a todos.** La nota se guarda con los avisos y, al prepararla para los clientes, el programa rellena solo en cada una: `[nombre de cliente]`, `[nombre de tu empresa]`, `[Tu nombre]` (el usuario que la envía), `[Teléfono / Correo electrónico]` (los de la empresa) y `[fecha]` (la del envío), además de `[teléfono]`, `[correo electrónico]`, `[dirección]`, `[web]` y los datos propios del cliente (`[teléfono del cliente]`…). Se aceptan mayúsculas, tildes y llaves. Si falta algún dato, el aviso se queda visible. Botones para insertarlos y vista previa con un cliente real. Los modelos estándar ya llevan fecha, saludo y despedida con estos avisos.
- **La nota queda en la ficha de cada cliente desde que se prepara** (pendiente de firma) y la misma ficha pasa a «firmada» cuando firma, sin duplicarse.
- **Editar:** la nota guardada se puede cambiar cuando quieras y puedes aplicar el cambio a los envíos pendientes (los ya firmados no cambian); también se puede editar el texto de un cliente concreto.
- El correo de aviso de firma incluye ahora el texto de la nota y la firma.

### Cambiado
- Los huecos de fecha de los modelos (p. ej. fecha del cambio) pasan a `[FECHA DEL CAMBIO]`; `[fecha]` es siempre la de envío.

## [1.133.0] — 2026-11-13

### Corregido
- **«Redactar» en las notas informativas ya siempre te da un texto.** Antes, si la IA no estaba configurada o no respondía (por ejemplo sin Ollama encendido o sin clave), no pasaba nada. Ahora salen dos opciones a la vez: la versión de la IA y un modelo estándar (cierre por vacaciones, horarios, tarifas, mantenimiento, gases refrigerantes, interrupción de servicio, facturación, protección de datos, urgencias…) que aparece al instante, sin IA ni internet. Si la IA falla, se explica el motivo en palabras llanas.
- Botón «Ver modelos en internet» para buscar un modelo en el navegador.
- Los huecos del modelo van entre [corchetes] y el programa avisa antes de guardar la nota si quedan sin completar.

## [1.132.0] — 2026-11-13

### Añadido
- **Notas informativas a clientes con firma de lectura** (Clientes → Notas informativas). Escribes la nota a mano o le pides un borrador a la IA y lo cambias antes de guardarla; eliges mandarla a todos los clientes o solo a algunos; y la envías por WhatsApp, correo o copiando el enlace personal de cada cliente. El cliente la lee y la firma desde su enlace (página pública `/nota-publica`), y la firma queda guardada con fecha y hora.
- Cada firma se archiva sola en la ficha del cliente (pestaña Archivos y notas → Notas informativas, y en Documentación → Otros archivos → Notas informativas firmadas), donde se puede recuperar e imprimir con la constancia de lectura. Cada envío conserva el texto tal como lo recibió el cliente, aunque después edites la nota.
- También se puede recoger la firma sin enlace: que el cliente firme en tu pantalla o subir la foto/PDF del papel firmado.
- Entran en las copias de seguridad (NotaInformativa y NotaEnvio). Funciones nuevas de Base44: `getNotaPublica`, `firmarNota` (avisa a la empresa por correo) y `enviarNotaInformativa` (correo a varios clientes).

### Nota
- La firma a distancia por enlace y el correo masivo necesitan Base44; en la versión sin Base44 se firma en pantalla o con el papel escaneado.

## [1.131.0] — 2026-11-11

### Corregido
- **Restaurar una copia deja exactamente lo que guardaste.** Antes se quedaban los clientes antiguos o repetidos que no estaban en la copia y había que borrarlos a mano. Ahora, al restaurar, lo que no está en la copia (o está repetido) se quita; si la copia no coincide con nada de lo actual no se borra nada, por seguridad.
- **Los partes SAT quedan unidos a su cliente al restaurar.** Con clientes repetidos, el parte se vinculaba a uno de los antiguos y al borrarlo perdía al cliente. Ahora siempre se une al cliente que se conserva, y los partes sin número se reconocen por fecha y cliente para no duplicarse.

## [1.130.0] — 2026-11-11

### Corregido
- **Al borrar un presupuesto, factura o recibo ya desaparece de Documentación del cliente.** La copia que se guarda en la ficha del cliente no llevaba vínculo con el original y se quedaba para siempre. Ahora la copia lleva el vínculo, se borra junto con el documento (desde Documentos, desde la ficha del cliente y desde Presupuestos IA) y las copias huérfanas de borrados anteriores se ocultan y se limpian solas al abrir la ficha.

## [1.129.0] — 2026-11-11

### Corregido
- **Imprimir directamente desde la vista previa y desde las páginas del cliente.** Antes había que exportar a PDF y luego imprimir. Ahora el botón Imprimir abre el diálogo de impresión en el acto: en navegador con un marco oculto de la propia página (sin ventanas emergentes que se bloquean), en el programa de escritorio con un fichero temporal (los documentos con fotos o firmas ya no fallan) y en Android con el sistema de impresión nativo. Si el programa de escritorio falla, imprime desde la propia página en vez de quedarse sin hacer nada.
- El botón «Imprimir o guardar en PDF» de los presupuestos y partes que ve el cliente también funciona dentro del programa.

## [1.128.0] — 2026-11-09

### Corregido
- **El botón del Asistente Técnico IA quedaba escondido bajo la barra de abajo en móvil y tablet** (y tapado por el icono de la base de precios en escritorio), y no se podía abrir. Ahora está siempre encima del icono de la base de datos, por encima de la barra y de la zona de gestos del móvil. La ventana del chat se abre ajustada a la pantalla (en el móvil ocupa el ancho disponible) y deja a la vista la barra de abajo.

## [1.127.0] — 2026-11-09

### Añadido
- **Cambiar el margen de ganancia desde Tarifas de proveedores** (botón «Cambiar margen»): escribes el nuevo margen (por ejemplo, 35 en lugar del 30 actual) y eliges si se aplica a **todas las tarifas juntas**, a **unas tarifas seleccionadas** o a **una sola**. Antes de aplicar muestra cuántos artículos cambian y cuántos se quedan como están (los que no tienen coste no se tocan); la venta se recalcula como coste + margen. Opción de cambiar solo los que aún no tienen precio de venta. Con barra de progreso, porcentaje y tiempos, y se puede detener.

### Mejorado
- **«Fotos desde PDF» mucho más rápido y apto para equipos con poca memoria:** el PDF se lee por trozos desde el propio archivo (sin copiarlo entero a memoria), solo se analizan las imágenes de las páginas donde aparece algún código pendiente, cada foto se reduce directamente a miniatura y se guarda al momento, se libera la memoria de cada página y la pantalla no se queda bloqueada. En equipos de 4 GB o menos se usan miniaturas más pequeñas y se descartan fotos enormes en vez de colgarse. La búsqueda de códigos es instantánea aunque la tarifa tenga decenas de miles de artículos.
- **Barra de progreso con porcentaje, tiempo transcurrido y tiempo restante**, página que se está leyendo, fotos encontradas y botón «Detener».
- **Informe de lo que no se ha podido recuperar:** al terminar, el programa avisa de cuántas fotos faltan y lista las referencias; el botón «Descargar fichero de las que faltan» da un CSV (se abre con Excel) con proveedor, referencia, nombre y motivo, para buscar esas fotos y añadirlas desde la ficha del artículo.

## [1.126.0] — 2026-11-08

### Añadido
- **Fotos de tarifas: primero la web del proveedor y del fabricante, después internet.** Para cada artículo se busca antes en la web que figura en la ficha del proveedor y en la del fabricante (el programa conoce las de las marcas habituales de frío, clima, electricidad y calefacción; se pueden añadir más en Ajustes de IA, una línea «marca=web»). Solo si no aparece ahí, se busca en todo internet, por código y por nombre.
- **«Fotos desde PDF»:** sube la tarifa del proveedor en PDF y el programa recupera las fotos que lleva dentro, asignando cada una al artículo cuyo código tiene al lado. Funciona sin conexión. Lo que no encuentre se puede añadir a mano desde la ficha del artículo (subir archivo o pegar enlace).
- El botón «Buscar imagen en internet» de la ficha del artículo usa ahora el mismo buscador (web del proveedor/fabricante primero).

## [1.125.0] — 2026-11-08

### Añadido
- **Más buscadores para las fotos de tarifas:** además de Bing y DuckDuckGo, ahora Google (web) y Yandex; se prueban por orden hasta que uno responde. Con clave de Google propia, ese va primero y funciona también en el navegador. Los ajustes llevan la guía paso a paso para conseguir la clave y el buscador de Google.
- **Que Claude implemente las peticiones de cambio:** el botón «Que Claude la implemente» crea una incidencia de GitHub con la etiqueta `claude`; el flujo `.github/workflows/claude-implementa.yml` (Claude Code en GitHub) programa el cambio y abre una pull request. Guía en `docs/CLAUDE-IMPLEMENTA.md`.

## [1.124.0] — 2026-11-08

### Añadido
- **Claude con tu propia clave como IA de todo el programa** (Configuración → IA y Centro de IA → Ajustes de IA). Se usa la clave de la API de la cuenta de Anthropic que ya usas; Anthropic no permite entrar con usuario y contraseña ni con una suscripción Pro/Max desde otros programas. Si no hay internet o se acaba el saldo, el programa repite la consulta en **Ollama** (IA local, gratis, sin límite y sin internet) cuando está instalado.
- **El Centro de IA usa la IA que elijas:** Claude, Ollama (sin límite y sin conexión) u OpenRouter. Los modelos locales pequeños crean módulos más sencillos.
- **Imágenes de las tarifas de proveedores:** el programa busca la foto de cada artículo primero por el **código del proveedor** y, si no la encuentra, por el **nombre** (la IA elegida desempata). Funciona en la app de escritorio y en el móvil sin configurar nada; en el navegador, con un buscador de Google propio (opcional). La foto se reduce y se guarda dentro del artículo, así se sigue viendo sin conexión; sin internet no se buscan fotos nuevas y se avisa sin estropear nada.

## [1.123.0] — 2026-11-08

### Añadido
- **Centro de IA** (menú «IA y asistencia»). Permite configurar el programa con funciones propias:
  - **Pídele una función:** describes lo que quieres y Claude (con la clave de Anthropic de cada empresa) crea una pantalla nueva. Se puede probar antes de guardar («modo prueba»: lee tus datos, pero no escribe ni envía nada) y se activa al aprobar los permisos que pide. Si lo pedido exige cambiar el propio código del programa, se guarda como petición de cambio.
  - **Mis módulos:** las pantallas creadas aparecen en un área nueva del menú, «Mis módulos». Se pueden activar, desactivar, mejorar con IA, revisar sus permisos, exportar o borrar.
  - **Skills:** instrucciones permanentes para la IA (tono, normativa, diseño) con plantillas para empezar.
  - **Conectores:** webs/APIs y GitHub. La clave se guarda solo en el aparato y nunca entra en las copias de seguridad.
  - **Complementos:** exportar e importar módulos, skills y conectores en un archivo. Todo lo importado entra desactivado y sin permisos.
  - **Peticiones:** cambios del programa pedidos a la IA, con copiar, descargar .md y crear incidencia en GitHub.
- Seguridad: los módulos corren aislados (sin red ni acceso al programa) y solo hablan por un puente que comprueba cada permiso; nunca ven usuarios, ajustes de empresa, contraseñas ni claves.
- Cinco entidades nuevas de Base44: `ModuloIA`, `SkillIA`, `ConectorIA`, `PeticionCambioIA` y `DatoModulo`.

## [1.122.0] — 2026-11-08

### Corregido
- **Los diarios de reparaciones se vinculan con el cliente por su nombre y con el equipo por su tipo.** Antes la ficha del cliente solo enseñaba los diarios con su identificador exacto, y los creados sin cliente, con un registro duplicado o importados solo con el nombre quedaban sueltos. Ahora el cliente se reconoce por nombre (sin mayúsculas, tildes ni signos, y en cualquier orden nombre/apellidos o por nombre de empresa) y el equipo por número de serie o por tipo de equipo (con marca/modelo/nombre si hay varios del mismo tipo). Si dos clientes se llaman igual no se adivina: ese diario se deja sin tocar.
- La ficha del cliente trae sola los diarios que son suyos y avisa de cuántos ha vinculado; el diario de reparaciones general hace lo mismo al abrirse y tiene el botón **«Vincular con clientes»**. La pasada es repetible: volver a ejecutarla no cambia nada más.

### Añadido
- Filtro por **tipo de equipo** en los diarios de la ficha del cliente.
- La lista general carga hasta 1.000 diarios (antes 200).

---

## [1.121.0] — 2026-11-08

### Mejorado
- **Menú lateral de un solo clic.** Al pasar el ratón por un área (Operación, Comercial, Cálculo…) se abre a su derecha la lista de apartados, y un clic en el apartado abre la pantalla. Antes había que pulsar el área y luego buscar el apartado. Pulsar el área sigue abriendo su primer apartado, y con el teclado se abre al enfocar (Esc la cierra).
- **Las pantallas abren más rápido.** Al acercar el ratón (o tocar) un enlace del menú o del cuadro general, la pantalla se empieza a descargar antes del clic, y al arrancar se adelantan las más usadas (SAT, clientes, documentos, agenda, reparto, inventario, tarifas…).
- **Al abrir una pantalla el menú y la barra ya no desaparecen**: solo cambia el contenido, con un indicador de carga en su sitio.

---

## [1.120.0] — 2026-11-08

### Cambiado
- **Pantalla principal limpia:** solo el cuadro general con todas las áreas del programa (y el aviso de copia de seguridad si toca). Se quitan de ahí los paneles de datos y los accesos rápidos.
- **Nuevo menú «Paneles del negocio»** con submenús para abrir cada panel por separado: Cómo va el negocio, Cifras clave, Hoy (citas, documentos y SAT), Tablero SAT, Agenda y firmas pendientes, Tareas y avisos, Presupuestos aceptados y rechazados, Estado de documentos y facturas, Ingresos y trabajos pendientes, Compras y proveedores, Mantenimiento y stock bajo, Clientes recientes y crear documento, y Automatizaciones. «Resumen completo» los muestra todos juntos como antes.
- Los paneles ahora también se ven en el móvil.

---

## [1.119.0] — 2026-11-08

### Añadido
- **Artículos a mano en cualquier tarifa.** Botón **«Añadir artículo»** arriba y **«Añadir artículo a esta tarifa»** dentro de cada proveedor: se escribe nombre, referencia, marca, coste, venta, margen, unidad y notas, y se guarda solo ese artículo sin tocar el resto de la tarifa. Lo que dejes en blanco entre coste, venta y margen se calcula con lo demás. Hay «Guardar y añadir otro» para meter varios seguidos.

### Corregido
- **Editar precios en las tarifas.** Los cuadros de coste, venta y margen son ahora de texto libre (coma o punto, al pulsar se selecciona el valor para escribir encima). Si guardar falla (por ejemplo, tarifa creada por otra cuenta), ahora sale un aviso claro en lugar de quedarse sin hacer nada.

### Cambiado
- **Pantalla principal sin los bloques negros de accesos** («Refrigeración y Gases» y «Accesos por secciones»): todos esos accesos están en el cuadro general de arriba y en el menú lateral.

---

## [1.118.0] — 2026-11-08

### Añadido
- **Nuevo diseño «Carril DIN».** Menú lateral oscuro en el escritorio con las áreas del programa (y los apartados del área abierta), barra superior con la ruta, papel milimetrado de fondo y, en cada pantalla, su dibujo técnico de fondo. Todas las pantallas anteriores siguen accesibles, agrupadas por áreas.
- **Móvil:** barra inferior fija (Hoy, Partes, Material, Menú) y menú en mosaico de áreas.
- **Pantalla principal con el cuadro general:** todas las áreas y apartados de un vistazo, con los avisos de hoy y los urgentes.
- **Reparto del día** (Operación): cada técnico es un carril y cada aviso del SAT un módulo; al arrastrar un aviso al carril de un técnico, se le asigna.
- **Cálculo de cámaras** y **visor 3D de cámara** (Comercial).
- **Placa de características** y tarjetas de presión en cada equipo de la ficha del cliente.
- **Configuración › Logotipo y fondos:** se sube el logotipo y se elige la intensidad del logotipo y de los dibujos de fondo. Se guarda con los datos de la empresa.
- Prueba del cálculo de cámara (`npm test` ahora ejecuta las pruebas principales).

### Quitado
- El diseño antiguo (menú lateral oscuro anterior, barra inferior del móvil y fondos por sección) ya no está en el programa. La versión anterior está en el paquete «antigua» (1.117.0).

### Para Base44
- Añade a la entidad `CompanySettings` los campos `tema_mostrar_logo_fondo`, `tema_opacidad_logo`, `tema_mostrar_dibujo_fondo` y `tema_opacidad_dibujo` (están en `base44/entities/CompanySettings.jsonc`). Sin ellos, los ajustes se recuerdan solo en el aparato.

---

## [1.117.0] — 2026-11-08

### Añadido
- **Copia de seguridad en Google Drive, cada empresa en el suyo.** En Copias de seguridad hay un panel «Copia en Google Drive»: se pega el enlace (y la clave) de un pequeño script que la empresa instala en su propia cuenta de Google, y cada copia se sube también a una carpeta de ese Drive. Las instrucciones y el código están en el propio panel y en la carpeta `drive-copias/`.
- **Recuperar desde cualquier equipo:** en Restaurar, con el mismo enlace y clave, «Ver copias del Drive» lista las copias y «Usar esta copia» la carga para restaurarla.
- El enlace y la clave de Drive no se incluyen dentro de las copias.

---

## [1.116.2] — 2026-11-08

### Cambiado
- **Al abrir el programa siempre se entra en el menú principal**, no en la pantalla donde se dejó. Si había texto a medio escribir se sigue devolviendo al abrir ese mismo formulario.

---

## [1.116.1] — 2026-11-08

### Añadido
- Buscar artículos por nombre o por un trozo de la descripción (no solo por referencia) en presupuestos, facturas y recibos.

---

## [1.116.0] — 2026-11-08

### Añadido
- IVA a elegir en cada línea de presupuestos, facturas y recibos (IVA aparte, IVA incluido o exenta) y selector de IVA de la mano de obra en el presupuesto del plano frigorífico. Los documentos antiguos no cambian.

---

## [1.115.6] — 2026-11-08

### Corregido
- Vista previa de presupuestos, facturas y recibos: cantidad, precio y total salen en una sola línea (antes se partían en dos).

---

## [1.115.5] — 2026-11-07

### Añadido
- Tras actualizar, la app pregunta si mantienes dónde se guardan los datos o los cambias (con «No volver a preguntar»), y en Configuración de empresa → «Dónde se guardan los datos» se puede cambiar cuando quieras.
- Guía ilustrada en PDF para configurar Supabase y el servidor propio (`docs/`).

---

## [1.115.4] — 2026-11-07

### Corregido
- Nippon Gases: enlace de contacto corregido (abre la web oficial).

---

## [1.115.3] — 2026-11-07

### Corregido
- Proveedores de gases: teléfonos de Carburos, Nippon Gases y Messer, y web oficial de Nippon.

---

## [1.115.2] — 2026-11-07

### Corregido
- Proveedores de gases: webs y contactos actualizados (Carburos con acceso de clientes de Air Products y web `carburos.com`, Gases GRIT con su catálogo y contacto, y el resto con sus direcciones vigentes). Se quitan teléfonos no verificados.

---

## [1.115.1] — 2026-11-07

### Corregido
- **Los planos frigoríficos ya salen en la ficha del cliente** (la pestaña «Planos» leía mal la lista y salía vacía). Si tras restaurar una copia hay planos con el nombre del cliente sin vínculo válido, se avisa y se vinculan con un clic.

---

## [1.115.0] — 2026-11-07

### Añadido
- Guía paso a paso para montar el servidor propio en casa (`GUIA-SERVIDOR-PROPIO.md`). Esta versión (sin Base44) ya permitía elegir local, Supabase o servidor propio.

---

## [1.114.0] — 2026-11-07

### Corregido
- **La copia de seguridad ahora incluye los planos frigoríficos.** Antes no se copiaban. Ahora entran en la copia (con su vista 3D, su cliente y todo el dibujo), junto con el catálogo propio de elementos del plano y las fichas técnicas de máquinas, y se pueden elegir al restaurar, también en el móvil y la tablet.
- **Cada plano vuelve unido a su cliente** al restaurar (por identificador y, si no, por nombre), y se ve en la ficha del cliente.
- **Los presupuestos generados desde un plano guardan el plano al que pertenecen** y, al restaurar, lo recuperan.

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