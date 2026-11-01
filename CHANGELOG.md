# Changelog — Gestión Pro Total

Todos los cambios notables de **Gestión Pro Total Mantenimiento e Instalaciones** se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/) y este proyecto sigue [Versionado Semántico](https://semver.org/lang/es/).

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