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
- El diseño antiguo (menú lateral oscuro anterior, barra inferior del móvil y fondos por sección) ya no está en el programa. Quien quiera la versión anterior dispone del paquete «antigua» (1.117.0).

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
- **Buscar artículos por nombre o por un trozo de la descripción**, no solo por referencia, en la línea de búsqueda de presupuestos, facturas y recibos. Si lo escrito no es una referencia exacta, se busca en todas las tarifas de proveedores y en Mi base de datos (sin tildes ni mayúsculas, con varias palabras en cualquier orden); si hay varios resultados se elige uno, y si hay uno solo se añade directamente.

---

## [1.116.0] — 2026-11-08

### Añadido
- **IVA a elegir en cada línea** de presupuestos, facturas y recibos (y en el presupuesto con IA): *IVA aparte* (se suma, como siempre), *IVA incluido* (el precio escrito ya lleva el IVA) o *Exenta de IVA*. Los totales se recalculan con cada opción; si hay líneas con IVA incluido o exentas, el total muestra «Base imponible». En la vista, la impresión y la página pública, esas líneas llevan una etiqueta.
- **Plano frigorífico:** selector «IVA de la mano de obra» en el panel de presupuesto (se recuerda la última elección), que se aplica a las líneas de mano de obra al generar el presupuesto.
- Los documentos antiguos no cambian: sin elección, todo sigue siendo IVA aparte.

---

## [1.115.6] — 2026-11-08

### Corregido
- **Vista previa de presupuestos, facturas y recibos:** el precio, la cantidad y el total salían partidos en varias líneas (la mitad arriba y el resto debajo) porque la columna de la descripción se comía el ancho. Ahora cantidad, precio unitario, descuento y total salen en una sola línea, como al imprimir. Aplicado a la vista de Documentos, la ventana de factura, el presupuesto IA y la página pública del presupuesto.

---

## [1.115.5] — 2026-11-07

### Añadido
- **Tras actualizar, la app pregunta si mantienes dónde se guardan los datos** («Mantener estos ajustes» o «Cambiar»: Base44, Supabase, servidor propio o solo este dispositivo), con la casilla «No volver a preguntar». Al cambiar se puede volver atrás con «Mantener como está».
- Guía ilustrada en PDF (`docs/GUIA-ILUSTRADA-DONDE-GUARDAR-LOS-DATOS.pdf`) para configurar Supabase y el servidor propio, con capturas reales de la app y esquemas de los pasos en Supabase.
- Se incluye `supabase/esquema.sql` también en esta versión (faltaba).

---

## [1.115.4] — 2026-11-07

### Corregido
- Nippon Gases: el botón de contacto tenía una dirección con doble barra; ahora abre la web oficial `eu.nipponsanso.com/es/`.

---

## [1.115.3] — 2026-11-07

### Corregido
- Proveedores de gases: teléfonos verificados — Carburos 935 661 480 (consultas gases), Nippon Gases 914 533 000 (web oficial `eu.nipponsanso.com/es`) y Messer 977 309 500. Linde sigue sin teléfono hasta confirmarlo.

---

## [1.115.2] — 2026-11-07

### Corregido
- **Proveedores de gases: webs y contactos actualizados.** Carburos Metálicos usa el acceso de clientes de Air Products (`account.airproducts.com/login`) y, en vez de «Tienda online», enlaza con `carburos.com`. Gases GRIT apunta al catálogo `gasesgrit.com/gases-refrigerantes/`, con su formulario de contacto y teléfono (se añade también al portal de proveedores). Nippon Gases, Linde, Air Liquide, Messer y Climalife usan ya sus direcciones vigentes.
- Se quitan los teléfonos que no se han podido verificar (Carburos, Linde, Nippon, Messer) para no dar números erróneos; se mantienen los verificados de Gases GRIT y Air Liquide.

---

## [1.115.1] — 2026-11-07

### Corregido
- **Los planos frigoríficos ya salen en la ficha del cliente.** La pestaña «Planos» del cliente leía mal la lista y salía siempre vacía, aunque el plano estuviera bien vinculado (por eso solo se veían desde el apartado general de planos). Ahora los muestra.
- Si tras restaurar una copia hay planos con el nombre del cliente pero sin vínculo válido, la pestaña los avisa y los vincula con un clic.
- Al recuperar una copia, el vínculo por nombre también reconoce el nombre completo o el de empresa del cliente.

---

## [1.115.0] — 2026-11-07

### Añadido
- **Elegir dónde se guardan los datos en la propia aplicación con Base44** (APK, instalador de Windows, versión portable y web): cuenta de Base44 (como siempre), solo en el dispositivo, tu proyecto de Supabase o **un servidor propio en casa**. La primera vez que se abre la app instalada pregunta; después se cambia en *Configuración de empresa → Dónde se guardan los datos*. Quien no cambie nada sigue exactamente igual que antes.
- Con datos propios la aplicación no contacta con Base44 y la IA de Base44 pasa a Ollama.
- El servidor propio (`servidor-datos/`) se incluye también en esta versión, con la guía paso a paso `GUIA-SERVIDOR-PROPIO.md`.

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

## [1.101.1] — 2026-11-06

### Añadido
- **Referencia del presupuesto**: un campo «Referencia» (ej.: «Reforma cocina», «Cámara nave 2») para distinguir de un vistazo varios presupuestos del mismo cliente sin abrirlos. Sale junto al número en la lista de documentos y en la de pendientes, se puede **buscar** por ella, y aparece en la vista previa, en el PDF impreso, en la página que ve el cliente y en los asuntos de los mensajes.

### Corregido
- **Importar de fichero — artículos sin codificar**: cuando el programa del proveedor pone solo un punto («.») en la descripción y la descripción real en la línea de debajo, se coge la descripción de debajo (una o varias líneas) y se conservan la cantidad, el precio y el descuento de la línea del punto. Avisa de cuántas líneas ha recuperado.

### Para Base44
- `Invoice` gana el campo `doc_reference`: sincronizar main en Base44.

---

## [1.101.0] — 2026-11-05

### Añadido
- **Importar un presupuesto o tarifa desde un fichero** (botón «Importar de fichero» en las líneas del presupuesto). Admite **Excel, CSV, Word (.docx) y PDF con texto**, sin IA y sin conexión. Detecta solo las columnas: referencia / artículo, descripción, cantidad, precio unitario o PVP, descuento %, importe o precio total y **plazo de entrega** (días, semanas o meses; «stock» = inmediata). Calcula lo que falte (el precio a partir del importe, el importe a partir de cantidad × precio − descuento), avisa si el importe del fichero no cuadra y descarta las filas de subtotal, IVA y total.
- **Comprobación contra las bases de datos**: cada artículo se busca por referencia (aunque cambie la forma de escribirla) y por descripción parecida en **Mi base de datos** y en las **tarifas de los proveedores**.
  - Si ya existe, eliges **de qué proveedor quieres el precio** (el del fichero, el de Mi base de datos o el de cada proveedor).
  - Si no existe, te pregunta si quieres guardarlo y **dónde**: en **Mi base de datos** (con su **apartado** y el **proveedor** del precio) o en la **tarifa de cualquier proveedor** (KIDE, TAVER, los que tengas dados de alta; si el proveedor no existe se crea), o en ambos a la vez. También puedes poner un margen % sobre los precios del fichero.
- **Mi base de datos por apartados**: Cámaras frigoríficas KIDE, Cámaras frigoríficas TAVER, Equipos frigoríficos, Evaporadores y condensadores, Compresores y unidades condensadoras, Climatización, Ventilación, Eléctrico, Solar, Fontanería, Tubería, Material de instalación, Mano de obra y Otros (puedes crear los tuyos). En «Base de precios» hay filtro por apartado, referencia y plazo de entrega, y ya no se corta a 300 artículos.
- **Al añadir líneas a mano** se comprueba si el artículo existe en Mi base de datos: si existe ofrece usar su precio, y si no existe ofrece guardarlo. La búsqueda por referencia ahora enseña todas las coincidencias (proveedores y Mi base de datos) para elegir, y si no hay ninguna ofrece añadirla.
- Las líneas del presupuesto llevan **referencia y plazo de entrega**; salen en el PDF impreso y en la página que ve el cliente.
- Prueba automática nueva: `npm run test:importar`.

### Para Base44
- La entidad `PriceItem` gana los campos `reference`, `section` y `delivery_days`, y `Invoice.items` gana `reference`, `delivery_days`, `delivery_text` y `supplier_name`: hay que sincronizar main en Base44.

---

## [1.100.0] — 2026-11-02

### Añadido
- **CADCraft funciona también en móvil y tableta (APK) para hacer planos.**
  - **Tamaño de pantalla**: la interfaz se reduce sola según el ancho (en el móvil además empieza con las paletas cerradas para dejar sitio al dibujo; se abren desde el menú Ventana). Antes salía enorme y cortada.
  - **Guardar de verdad**: al guardar un plano (Archivo › Guardar / Guardar como / exportar) se guarda en **Documentos/CADCraft** del dispositivo, con botón para **compartirlo** (WhatsApp, correo, Drive…). Antes la descarga no funcionaba dentro de la app de Android.
  - **Mis planos**: lista de los planos guardados para reabrirlos con un toque, compartirlos o borrarlos, y botón «Abrir un plano del dispositivo» (DXF/DWG).
  - **Táctil**: un dedo dibuja o selecciona; dos dedos acercan y mueven el plano; ya no se mueve la página al tocar.
  - Aviso si intentas cerrar con cambios sin guardar.
- Prueba automática nueva: `npm run test:planos`.

---

## [1.99.0] — 2026-11-02

### Añadido
- **Todos los documentos y pantallas se pueden guardar en PDF y imprimir.** En cada pantalla (salvo Inicio) aparecen abajo a la derecha los botones **PDF** e **Imprimir**. Cogen lo que ves, sin menús ni botones, en A4 y con colores.
  - En el programa de Windows/Linux, **PDF** guarda el archivo directamente y te pregunta dónde.
  - En el móvil o la tablet (APK) y en el navegador sale el menú de impresión del sistema, que incluye «Guardar como PDF».
  - **Ctrl+P** hace lo mismo que el botón Imprimir.
- Prueba automática nueva: `npm run test:pdf`.

---

## [1.98.0] — 2026-11-02

### Corregido
- **CADCraft ya no pide «Update and Restart»**: ese aviso era el actualizador propio de CADCraft y no podía sustituir la copia que viene con Gestión Pro Total, así que no hacía nada. Ahora lo gestiona Gestión Pro Total: **cada vez que abres CADCraft desde el programa se instala solo la última versión** (si la hay) y se conservan tus dibujos, ajustes y comandos propios.

## [1.97.0] — 2026-11-02

### Mejorado
- **Menú HVAC de CADCraft con imágenes**: cada máquina y elemento muestra una miniatura de su símbolo real de plano (compresor, condensadoras con ventiladores, cámara, válvulas, rejillas, símbolos eléctricos…) junto a su nombre, y el mismo dibujo es el que se coloca en el plano.

## [1.96.0] — 2026-11-02

### Mejorado
- **CADCraft en móvil y tableta (APK)** ahora incluye dentro las paredes y la biblioteca de equipos con los símbolos nuevos: la pestaña HVAC funciona también en la versión web.

## [1.95.0] — 2026-11-02

### Mejorado
- **Paredes en CADCraft rehechas**: se dibujan seguidas (una cadena de tramos con las esquinas bien unidas), con un solo aviso al empezar donde puedes cambiar material, grosor y alto; cada tramo muestra y rotula su medida; con la opción «Largo» escribes la longitud exacta en metros. Cada material tiene su color. «Editar pared» elige el tramo con un clic y cambia su largo (los tramos siguientes se desplazan con él), grosor, alto o material, y vuelve a rotular las medidas. Nuevo comando PAREDMEDIDAS.
- **Símbolos de CADCraft más reales y claros**: los 74 equipos se dibujan como en un plano de verdad (ventiladores con palas, serpentines y aletas, cámara con puerta y evaporadores, cassette, split, válvulas, rejillas, difusores, símbolos eléctricos y de seguridad…). Los símbolos pequeños se dibujan a 0,60 m como mínimo para que se vean. Los equipos aparecen al instante y se colocan con un clic (con la opción de giro).
- Los planos que se mandan desde Gestión Pro Total a CADCraft muestran también los símbolos nuevos.

## [1.94.0] — 2026-11-01

### Añadido
- **Pantalla de inicio completa**: faltaban accesos directos que sí estaban en el menú lateral. Ahora también salen CADCraft, Gases refrigerantes, Gamas y plan, Instrumentos, Informes Aseguradora, Galería de imágenes y Nuevo contacto, cada uno en su grupo.

## [1.93.0] — 2026-11-01

### Añadido
- **CADCraft se puede abrir solo**, sin plano frigorífico, para cualquier otro tipo de plano: nueva página «CADCraft (dibujo CAD)» en el menú.
- **CADCraft se actualiza automáticamente**: cada semana se descarga su última versión oficial (storytold/cadcraft), se le aplican las mejoras de Gestión Pro Total y se publica. El programa de escritorio la baja con un botón y **conserva tus dibujos, ajustes y comandos propios**; si cambiaste una rutina nuestra, se respeta la tuya y la nueva se guarda al lado como «.nuevo».
- **CADCraft en móvil y tableta (APK)**: se incluye la versión web de CADCraft dentro del APK.

## [1.92.0] — 2026-11-01

### Añadido
- **CADCraft incluido con el programa** (versión de escritorio): CADCraft, el CAD libre y gratuito, se instala junto con Gestión Pro Total. Trae una pestaña **HVAC** con paredes (`PARED`, `PAREDEDIT`) con largo, grosor, alto y material (ladrillo, bloque, hormigón, cemento, yeso, pladur, panel, madera, cristal), medida en vivo mientras se dibuja, precisión libre hasta el milímetro, snaps a objetos y una biblioteca de 74 equipos de frío y electricidad.
- Botón **«Abrir en CADCraft»** en el plano: envía el plano a CADCraft y, al guardar, vuelve a Gestión Pro Total con paredes, materiales, medidas y equipos (la vista 3D se ve en Gestión Pro Total).

### Corregido
- **Copias de seguridad compatibles con cualquier versión**: al restaurar se aceptan copias hechas por versiones anteriores o posteriores, con distintos envoltorios, mayúsculas, BOM o campos nuevos, sin el error «no es una copia del programa». Se muestran mensajes concretos si el archivo está dañado.

---

## [1.91.0] — 2026-11-01

### Añadido
- **Editor de planos con estilo CAD** en pantalla completa (ordenador): panel fijo a la izquierda con todas las máquinas y elementos por categorías plegables y buscador (un clic y se coloca), pestañas **Plano 2D / Vista 3D** para ver la instalación en 3D dentro del propio editor, y barra de estado inferior con las coordenadas del cursor en metros, imán, modo de movimiento y zoom.

## [1.90.0] — 2026-11-01

### Añadido
- **Medida en vivo al dibujar paredes**: mientras se traza una pared aparece su longitud en metros junto al cursor (o el dedo), para saber hasta dónde llegar.
- **Editar una pared ya dibujada**: al seleccionarla se cambia el largo (las paredes encadenadas siguen el extremo), el grosor, el alto y el tipo de pared (ladrillo, bloque de hormigón, hormigón, cemento, yeso, pladur, panel sándwich, madera, cristal u otro). El tipo se ve con su color y grosor en el plano y en la vista 3D.

## [1.90.0] — 2026-11-01

### Añadido
- **Imán a puntos al dibujar paredes y cotas** (como el «punto cercano» de CAD): engancha al extremo y al centro de las paredes y al centro de los equipos, con una marca naranja que indica a qué se engancha, y a la alineación horizontal o vertical con ellos. Se activa o desactiva con «Imán a puntos».
- **Escribir la medida exacta de la pared**: al dibujar, se teclea el largo en metros (por ejemplo 2,5) y con Intro se crea la pared en la dirección del ratón.

### Cambiado
- **Movimiento libre hasta el milímetro**: «Libre» ya no está limitado a pasos de 0,1 m; la medida en vivo de la pared muestra tres decimales. «A cuadrícula» sigue disponible.

## [1.89.0] — 2026-11-01

### Añadido
- **Galería de imágenes por carpetas** (menú Documentos): las fotos de órdenes SAT, fichas de mantenimiento, informes de aseguradora, averías, notas y documentos de clientes se agrupan en una carpeta con el nombre del documento al que pertenecen, con buscador y visor a pantalla completa (flechas, teclado, ampliar, descargar).
- **Ampliar las fotos desde el propio documento**: al tocar una miniatura en cualquier galería de fotos se abre el mismo visor grande.
- **Descarga directa de internet sin IA** en el Centro de Actualizaciones: normativa del BOE (últimos 7 días, filtrada a frío, climatización e instalaciones), tarifas de proveedores que publican su lista (CSV o JSON) en el enlace de su ficha, e imágenes de artículos desde Wikimedia Commons. No gasta créditos.
- **Barra de porcentaje en cualquier pantalla** mientras se baja algo de internet (precios, imágenes, tarifas, normativa, carga de la galería): se puede cancelar y desaparece sola al terminar.

### Corregido
- **Plano en el móvil**: ya no se queda clavado. Dos dedos mueven y amplían (pellizco) el plano en cualquier herramienta, un toque cancelado ya no deja el lienzo bloqueado, y en pantalla completa las herramientas van plegadas («Herramientas», «Mover plano», «Datos») para que el plano ocupe la pantalla.
- Las descargas largas ceden el control a la pantalla entre elemento y elemento, así que el programa no se queda congelado.

## [1.88.0] — 2026-11-01

### Añadido
- **Lectura directa de archivos .dwg de AutoCAD** en el importador de planos (además del DXF): se leen líneas, polilíneas y el contenido de los bloques con su posición, giro y escala; se eligen las capas de muros y las unidades, se ve la vista previa y se crea la vista 3D vinculada al plano y al cliente. La lectura se hace en el propio equipo (WebAssembly), sin enviar el plano a ningún servidor.
- No se convierten círculos, arcos, textos ni bloques con elementos especiales (se avisa de cuántos hay); si un DWG no se puede leer, se sugiere guardarlo desde AutoCAD en una versión anterior o como DXF.

## [1.87.0] — 2026-11-01

### Añadido
- **Foto en todas las fichas**, con «Hacer foto» (cámara del móvil, tableta u ordenador) o «Subir imagen», y «Quitar»: clientes, equipos/maquinaria (ahora dentro de *Identificación*), proveedores, técnicos e instrumentos.
- **Ficha de maquinaria y equipos** con la foto del equipo en el bloque de identificación y un bloque de *Observaciones*.
- **Importar planos de AutoCAD (DXF)** en el editor de planos frigoríficos y eléctricos: se reconocen los muros por capas y unidades, se muestra una vista previa, se crea la vista 3D y el archivo original queda guardado y vinculado al plano, a la ficha y al cliente (aparece en su menú *Equipos > Planos y archivos CAD*). Los .dwg se piden en DXF («Guardar como»).
- **Gases refrigerantes**: botellas (con saldo en kg), registro de cargas y recuperaciones (no deja sacar más de lo que hay ni superar la capacidad) y resumen anual de manipulación con existencias.
- **Gamas de mantenimiento y plan preventivo**: gamas con tareas, asignación a equipos, tarjetas de vencidas/próximas y generación de órdenes SAT preventivas sin duplicar las ya abiertas.
- **Instrumentos** con calibración (próxima fecha, vencida/próxima) y foto.
- **Ficha de técnico** en tarjetas (datos personales, habilitaciones y caducidades F-Gas, RITE, PRL y reconocimiento médico) con aviso de caducados.
- Nuevas entidades: `RefrigerantCylinder`, `GasMovement`, `MaintenanceGama`, `GamaAssignment`, `Instrument`.

### Cambiado
- **Órdenes SAT en un formato profesional** por tarjetas (datos de la orden, equipo, planificación y técnico, trabajo, materiales, mano de obra, fotos, notas), manteniendo todos los apartados anteriores y añadiendo marca, modelo, nº de serie y ubicación del equipo, que también salen en la vista previa.

## [1.86.0] — 2026-11-01

### Añadido
- **Nuevo formulario de cliente en tarjetas** (Datos generales, Contacto, Dirección, Zona climática, Facturación, Contrato de mantenimiento y Notas), igual para crear y para editar. Valida razón social/nombre, correo, código postal e IBAN.
- **Zona climática CTE DB-HE** dentro del cliente: se busca **por comunidad autónoma → provincia**, o pulsando la provincia en el mapa; muestra la zona (por ejemplo B3), la leyenda y la rejilla, y se puede quitar o fijar a mano. La altitud se guarda pero no corrige la zona automáticamente.
- **Ficha del cliente con menús y submenús**: todos los apartados donde se vinculan documentos (facturas, presupuestos, recibos, órdenes SAT, fichas de mantenimiento, informes de aseguradora, legalización, cálculos, manuales, fotos y archivos) con sus ficheros, en una pantalla «Documentación» y navegación de dos niveles.

### Cambiado
- **Los clientes que ya existen se muestran automáticamente con el nuevo formato**, incluida su zona climática calculada desde su provincia, sin tocar sus datos.

## [1.85.0] — 2026-11-01

### Cambiado
- **Panel de firma a pantalla completa** para el técnico y para el cliente, en móvil, tableta y portátil. Ocupa toda la pantalla, **no se mueve ni se desplaza la página mientras se firma** (se bloquea y se recupera su posición al cerrar) y se dibuja por encima de cualquier ventana, de modo que ya no se desplaza dentro de los diálogos. Se firma con dedo, lápiz o ratón.
- La firma **se conserva al girar el dispositivo** o cambiar el tamaño de la ventana; en el móvil en vertical sugiere girarlo para tener más espacio. Los botones son grandes (Borrar, Confirmar firma, Cancelar) y no deja confirmar una firma vacía o un simple toque.
- La imagen guardada se **recorta a la firma y se encaja siempre en el mismo formato**, así se ve igual de grande en el documento firmes grande o pequeño.
- Aplicado en: firmas del SAT y de los informes (técnico y cliente), páginas públicas del cliente para aceptar o rechazar **órdenes SAT** y **presupuestos**, y **documentos legales**.

### Notas
- No hay campos nuevos en la base de datos.

---

## [1.84.0] — 2026-11-01

### Añadido
- **Carga latente por psicrometría** en *Calculadora de potencia de aire acondicionado*: con temperatura y humedad relativa interior y exterior, altitud, caudal de ventilación, número de personas y humedad extra (kg/h), calcula la **carga latente**, la carga sensible de ventilación, el total, el factor de calor sensible y los kilos de agua a retirar por hora. Avisa cuando el factor es bajo y conviene una máquina con buena deshumectación.
- **Densidad del aire según la altitud**: la presión local y la densidad del aire (interior y exterior) se corrigen con la altitud, además del punto de rocío y la humedad absoluta. Las entradas se recuerdan en el equipo.

### Notas
- Valores orientativos para pre-dimensionar. No hay campos nuevos en la base de datos.

---

## [1.83.0] — 2026-11-01

### Añadido
- **Averías e incidencias como tarjetas con micro-estados**: borde fino con color semántico (rojo, ámbar, verde, gris), icono mínimo y rejilla densa con etiquetas diminutas en mayúsculas sobre cada cifra (tipo, fecha, días abierta o que tardó, coste, técnico, horas, piezas). Una avería sin reparar pasa a **urgente** (roja y con pulso) si lleva más de 7 días o es una fuga de gas. Sustituye a la lista en *Historial de averías* e *Incidencias*; la galería y la impresión no cambian.
- **Simulador del ciclo frigorífico** en *Diagnóstico de carga*: cuatro deslizadores (presión de baja, presión de alta, recalentamiento, subenfriamiento) que funcionan como mandos físicos; el diagnóstico se recalcula al mover cada uno (falta de gas, exceso de carga, válvula obstruida, golpe de líquido, condensación alta, compresor gastado…). Parte de tus medidas reales, se puede restablecer y **aplicar al diagnóstico**.
- **Zona climática del CTE en la ficha del cliente**: a partir del código postal, la provincia, la población o las coordenadas se muestra la zona (por ejemplo A3, D3, E1), su descripción de invierno y verano y un **mapa de puntos** de las capitales de provincia coloreadas por severidad, con la del cliente resaltada. Es la zona de la capital, orientativa: el municipio puede variar por altitud.
- **Generador de órdenes de mantenimiento preventivo** en *Plan de mantenimiento*: lista los equipos vencidos, próximos y al día según su periodicidad; se marcan los que se quieran y se genera la **hoja de trabajo en PDF** (una por página, con lista de tareas según el tipo de equipo, control de fugas de gas fluorado cuando es obligatorio, zona climática, espacio para mediciones y firmas) o se **crean como órdenes de SAT** numeradas rellenando huecos.

### Notas
- No hay campos nuevos en la base de datos: no hace falta sincronizar entidades en Base44.

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
- **Eliminar tarifas antiguas**: en Tarifas por proveedor, dentro de cada proveedor hay casillas para elegir líneas y botones para eliminar las **seleccionadas**, las **caducadas** (vigencia ya pasada) o **toda la tarifa de ese proveedor**. Se borra por lotes con contador, dice cuántas no se pudieron borrar y por qué, y deja **Deshacer** durante 15 segundos.

### Corregido
- Al eliminar una tarifa o un catálogo que falla (casi siempre porque lo creó otra cuenta), ahora lo dice en vez de no hacer nada.

## [1.77.1] — 2026-10-30

### Añadido
- **Accesos directos en la pantalla de inicio (Android)**: al mantener pulsado el icono salen Nueva orden SAT, Agenda, Clientes, Documentos, Plano frigorífico y Copia de seguridad, y se pueden arrastrar a la pantalla de inicio como iconos propios. Abren la app directamente en esa pantalla, esté cerrada o abierta. En la web instalada (PWA) se han añadido también Plano y Copias a sus accesos. En Windows el instalador ya crea el acceso en el escritorio y en el menú Inicio.

## [1.77.0] — 2026-10-30

### Añadido
- **Cálculo frigorífico en el plano** (botón «Cálculo frío»): para cada cámara dibujada calcula la carga (transmisión, producto, aire y puertas, luz y personas, ventiladores y desescarche), la potencia del equipo según las horas de marcha y el escalón comercial. Todos los datos se pueden cambiar.
- **Máquinas y precios de tu proveedor**: eliges el proveedor con el que trabajas y se buscan en su tarifa los evaporadores y condensadoras que cubren esa potencia (la potencia se lee del nombre: kW, W o kcal/h). Al elegirlas se añaden al plano con su referencia y precio, y el presupuesto del plano las cuenta en su propia línea.
- **La copia de seguridad guarda la configuración completa del programa**: además de los datos de empresa y ajustes del sistema, los ajustes del aparato (aspecto, letra, IA, impresión, carpeta de copias, proveedor elegido…). Al restaurar se vuelven a poner solos. Nunca se copian sesiones ni licencias.

## [1.76.2] — 2026-10-30

### Corregido
- **Invitar usuarios o administradores**: si falla, ahora dice el motivo real y avisa de que la cuenta con la que has entrado no es administradora (solo una administradora puede invitar).
- **Restauración «pero NO se ve»**: indica con qué cuenta has entrado y si es administradora; los datos solo se ven con la cuenta que los creó o con la administradora.

### Cambiado
- **Administradora de serie**: la cuenta kairigardia.gestionprototal@gmail.com figura en las reglas de acceso de todas las tablas, así que ve todos los datos sin depender de quién los creó. Requiere publicar los cambios de entidades en Base44.

## [1.76.1] — 2026-10-30

### Añadido
- **Plano frigorífico más técnico**: puertas, puertas de cámara y ventanas se encajan solas en la pared (ancho de la pared o de la cámara), se pueden mover a lo largo de ella, cambiar de ancho, centrar, abrir hacia dentro o fuera; en el visor 3D se ven los huecos, marcos y hojas también desde dentro.
- **Tubería frigorífica, cableado eléctrico y conductos «a mano»**: botones de trazado manual, punto a punto por el recorrido que elijas, con longitud y codos en vivo, modo ortogonal, y edición de puntos (arrastrar, insertar, borrar). Las tuberías y cables también se dibujan en el visor 3D y en los informes.

### Corregido
- **QR y enlaces al cliente**: llevan de serie una dirección pública (la del programa publicado), sin tener que configurarla; si se pone otra en Configuración, manda esa.
- **Documentos ↔ cliente**: al abrir el programa se unen solos con su cliente (por identificador o por nombre) los documentos, facturas, órdenes y fichas que hubieran quedado sueltos.
- **Pantalla «La página no se cargó correctamente»** (APK): ahora muestra el motivo real del fallo, lo guarda para diagnóstico y el botón «Limpiar caché y recargar» vacía solo cachés y service workers, sin tocar datos ni documentos.
- **Restauración de copia de seguridad**: tras restaurar se lee cada entidad del servidor para comprobar que los datos son visibles; si no lo son, se avisa claramente en vez de decir que está todo bien. Se reenlazan clientes y ficheros por id y por nombre.

## [1.75.1] — 2026-10-30

### Corregido
- **«Añadir elemento al catálogo» → «Crear estándar + IA»** ya no depende de que la IA responda: si ninguna vía de IA da el icono, se avisa y se guarda con el icono propio (sin IA), que se puede cambiar después. Antes, si fallaba el generador, no se guardaba nada.

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