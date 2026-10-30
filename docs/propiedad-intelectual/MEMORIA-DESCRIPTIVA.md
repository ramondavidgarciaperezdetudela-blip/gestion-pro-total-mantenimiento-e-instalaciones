# MEMORIA DESCRIPTIVA DEL PROGRAMA DE ORDENADOR

> Documento de apoyo para la solicitud de inscripción en el **Registro de la
> Propiedad Intelectual** (programa de ordenador, art. 95 y ss. del Texto
> Refundido de la Ley de Propiedad Intelectual, RDL 1/1996).
>
> Los campos entre corchetes `[ ]` deben completarse antes de la presentación.

---

## 1. Identificación de la obra

| Campo | Dato |
|---|---|
| **Título del programa** | Gestión Pro Total — Mantenimiento e Instalaciones |
| **Tipo de obra** | Programa de ordenador (software) |
| **Versión objeto de registro** | 1.63.0 |
| **Fecha de finalización / divulgación** | [fecha] |
| **Clase de obra** | Aplicación informática de gestión empresarial (vertical SAT) |
| **Soporte de depósito** | Listado de código fuente en soporte digital (PDF/ZIP) |
| **Lenguajes de programación** | JavaScript (ES2022), JSX/React, HTML5, CSS3 |
| **Entorno de ejecución** | Navegador web (multiplataforma), empaquetable como app Android (APK) y de escritorio |

## 2. Titular y autoría

| Campo | Dato |
|---|---|
| **Autor** | Ramón David García Pérez de Tudela |
| **NIF/NIE** | [NIF] |
| **Domicilio** | [domicilio completo] |
| **Nacionalidad** | Española |
| **Titular de los derechos de explotación** | Ramón David García Pérez de Tudela [o razón social, si procede] |
| **Carácter de la obra** | Obra individual / [colectiva, si aplica] |

*(Si la obra se desarrolló en el marco de una relación laboral o por encargo, los
derechos de explotación corresponden al empresario/cliente salvo pacto en
contrario — art. 97.4 TRLPI. Indíquese en tal caso.)*

## 3. Descripción funcional del programa

**Gestión Pro Total** es una plataforma integral de gestión para empresas de
**Servicio de Asistencia Técnica (SAT)** e instalaciones en los sectores de
**climatización, electricidad, refrigeración y energía solar**. Centraliza la
operativa de campo y administrativa: clientes, equipos, órdenes de trabajo,
mantenimientos, presupuestos, facturación, inventario, proveedores y
documentación legal, e incorpora módulos de cálculo técnico y de inteligencia
artificial de apoyo.

### 3.1. Módulos principales

- **Gestión de clientes y contactos**: fichas de cliente, máquinas/equipos
  instalados, histórico de intervenciones y notas.
- **Órdenes de servicio (SAT)**: creación, priorización, calendario, chat de SAT,
  parte de trabajo del técnico y portal público de seguimiento.
- **Mantenimiento**: hojas de mantenimiento, planificación y recordatorios
  inteligentes; histórico de averías de equipos.
- **Presupuestos y facturación**: presupuestos (incluido presupuesto público),
  plantillas de líneas y documentos, facturas y resumen de compras.
- **Inventario y repuestos**: control de stock, gestor de repuestos y resumen de
  compras.
- **Proveedores y tarifas**: catálogo de proveedores, importación y comparación de
  precios, actualización de tarifas en línea.
- **Calculadoras técnicas**: cálculo térmico, cámara frigorífica, instalación
  eléctrica, batería y dimensionado solar (incl. integración fotovoltaica).
- **Documentación y normativa**: plantillas de documentos, documentos legales con
  firma, manuales y normativa aplicable.
- **Inteligencia artificial**: asistente, generación de presupuestos, informes,
  planificación y búsqueda asistida.
- **Administración**: configuración de empresa, registro de auditoría,
  automatizaciones, centro de copias de seguridad y exportación de datos.

### 3.2. Modelo de datos

El programa gestiona, entre otras, las siguientes entidades de negocio:
Contact, ClientMachine, ClientDocument, ClientNote, Equipment, EquipmentDiary,
EquipmentFailure, SATOrder, SATWorkTemplate, SATChatMessage, MaintenanceSheet,
Appointment, Project, Invoice, PriceItem, LineTemplate, DocumentTemplate,
StockItem, Supplier, SupplierCatalog, SupplierPrice, SolarCalculation,
ThermalCalculation, Note, CompanySettings, ChangeLog, AIConsultation, User.

## 4. Arquitectura técnica

- **Arquitectura**: aplicación web de página única (SPA) con enrutado en cliente.
- **Frontend**: React 18 con Vite 6 como empaquetador; componentes de interfaz
  basados en Radix UI y Tailwind CSS.
- **Gestión de estado y datos**: React Query (TanStack) y formularios con React
  Hook Form + Zod.
- **Backend / persistencia**: servicios del proveedor **Base44** mediante su SDK
  (`@base44/sdk`), consumidos a través de un cliente centralizado.
- **Visualización**: Recharts (gráficas), Leaflet (mapas/rutas), generación de
  PDF (jsPDF) y exportación a Excel (xlsx).
- **Distribución**: web/PWA, empaquetado **Android (APK)** y **escritorio**
  mediante Capacitor/Electron desde el mismo código fuente.

## 5. Volumen y estructura del código fuente

- Aproximadamente **53.000 líneas** de código fuente original.
- **51 páginas** funcionales y **137 componentes** reutilizables.
- Organización en directorios: `src/pages`, `src/components`, `src/api`,
  `src/hooks`, `src/lib`, `src/utils`, además de configuración de construcción.

El inventario detallado de ficheros figura en
[`INVENTARIO-CODIGO-FUENTE.md`](./INVENTARIO-CODIGO-FUENTE.md).

## 6. Originalidad

El programa constituye una **creación original** de su autor, fruto de su esfuerzo
intelectual, tanto en la estructura y organización del código como en la lógica de
negocio específica del sector (cálculos técnicos, flujos de SAT y mantenimiento,
gestión documental). El uso de bibliotecas de terceros de código abierto se limita
a componentes de infraestructura, integrados y orquestados de forma original por el
autor; dichas bibliotecas conservan sus respectivas licencias y no forman parte de
la autoría reclamada.

---

*Documento generado como apoyo a la tramitación. Revísese y complétese con los
datos definitivos antes de su presentación ante el Registro.*
