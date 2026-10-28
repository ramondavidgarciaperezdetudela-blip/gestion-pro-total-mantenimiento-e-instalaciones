# Changelog — Gestión Pro Total

Todos los cambios notables de **Gestión Pro Total Mantenimiento e Instalaciones** se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/) y este proyecto sigue [Versionado Semántico](https://semver.org/lang/es/).

---

## [1.72.0] — 2026-10-28

### Añadido
- **Diseño de instalaciones y planos frigoríficos** (Refrigeración → Diseño
  Instalación, y también en los accesos de Inicio). Se dibuja la instalación
  entera y de ahí sale el presupuesto, sin tener que pasar por tres pantallas
  distintas ni por el cuaderno.
  - **Paredes libres.** El local se dibuja tramo a tramo, con sus pilares, sus
    entrantes y las formas en L o en U que tienen las obras de verdad: ya no
    hay que fingir que todo es una habitación cuadrada. Doble clic o Escape
    cierra el contorno; con «Cota» se mide cualquier distancia y queda escrita
    en el plano.
  - **Catálogo de 46 elementos** en cinco familias: frío (centrales, unidades
    condensadoras, evaporadores, cámaras, murales, arcones, válvulas…), clima,
    **aparamenta de seguridad** (válvulas de seguridad, presostatos, detectores
    de fugas, alarmas), **electricidad** (cuadros, diferenciales, magneto-
    térmicos, variadores, controladores) y obra.
  - **Cada elemento pide lo suyo.** El evaporador pregunta potencia, refrige-
    rante, desescarche y nº de ventiladores; el diferencial, sensibilidad,
    clase y polos; la válvula de seguridad, el tarado y a dónde descarga. El
    detector de fugas avisa de lo que pide el Reglamento (UE) 2024/573.
  - **Tuberías entre equipos, automáticas o a mano.** Se pulsa un equipo y
    luego el otro y la línea se une y se cierra sola; para llevarla por donde
    toca, se pulsan los codos por el camino.
  - **Cálculo de tubería.** Al añadirla pide los tamaños de **gas y de
    líquido** y los sugiere con la potencia del equipo, la longitud y el
    desnivel, penalizando las tiradas largas. Dice también la carga aproximada
    que se queda en la línea de líquido, y avisa cuando la tirada pide sifones
    o cuando se sale de tabla.
  - **Líneas eléctricas.** Pide **tipo de conexión de potencia** (monofásica,
    trifásica, mando, maniobra) y de **comunicación** (Modbus RTU, BACnet,
    KNX, bus propietario, Ethernet), y sugiere la **sección en mm²** por
    intensidad y por caída de tensión, con el cable de datos separado de la
    fuerza.
  - **Presupuesto aproximado automático**, que se va recalculando mientras se
    dibuja: material por elemento, metros de tubería y de cable, y un 35 % de
    mano de obra. Si tienes tus propios precios en Tarifas, manda el tuyo.
  - **Y detallado con la IA**: coge el inventario del plano y devuelve el
    presupuesto por capítulos con las partidas que no se ven en un dibujo
    (vacío, carga de gas, puesta en marcha, legalización, desplazamientos) y
    las jornadas estimadas, diciendo además qué falta preguntar al cliente.
  - **Vinculado al cliente.** El plano se guarda en su ficha como documento
    («plano_instalacion»), con la imagen y el dibujo entero dentro, así que se
    vuelve a abrir y se sigue editando; los planos de ese cliente salen en una
    fila para reabrirlos de un toque.
  - **Imprimir y PDF** con la misma preparación de página que el resto del
    programa (colores y cuadros incluidos), y guardado automático del borrador
    por si se sale sin querer.

### Corregido
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