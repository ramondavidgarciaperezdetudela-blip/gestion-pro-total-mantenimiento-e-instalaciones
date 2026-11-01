# Changelog — Gestión Pro Total

Todos los cambios notables de **Gestión Pro Total Mantenimiento e Instalaciones** se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/) y este proyecto sigue [Versionado Semántico](https://semver.org/lang/es/).

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