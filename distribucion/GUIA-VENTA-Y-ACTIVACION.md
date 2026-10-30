# Guía de venta y activación — Gestión Pro Total

Guía rápida para **entregar el programa a un cliente** y **activar su licencia**.
Soporte: **kairigarcia.gestionprototal@gmail.com**

---

## 1. Qué archivo dar a cada cliente

Descarga el archivo desde la **página pública de descargas** (siempre la última versión) y entrega el de su sistema:

➡️ `https://github.com/ramondavidgarciaperezdetudela-blip/gestion-pro-total-releases/releases/latest`


| El cliente usa… | Archivo a enviar | Cómo lo abre |
|-----------------|------------------|--------------|
| 🪟 **Windows** (recomendado) | `...-Windows-Portable.exe` | Doble clic. No se instala nada. |
| 🪟 Windows (instalación) | `...-Windows-Instalador.exe` | Doble clic → Siguiente → Instalar. |
| 🍎 **macOS** | `...-Mac.dmg` | Abrir y arrastrar a Aplicaciones. |
| 🐧 **Linux / Chromebook** | `...-Linux.AppImage` | Dar permiso de ejecución y doble clic. |
| 🐧 Linux (instalación) | `...-Linux.deb` | `sudo dpkg -i` o Centro de Software. |
| 🤖 **Android** | `gestion-pro-total.apk` | Instalar en el móvil/tablet. |

> Aviso de Windows/macOS la primera vez ("editor desconocido"): es normal hasta firmar la app. En Windows: *Más información → Ejecutar de todas formas*.

---

## 2. Cómo compra y activa la licencia el cliente (paso a paso)

### Paso 1 — El cliente abre el programa
Al abrirlo por primera vez aparece la **pantalla de licencia** con dos pestañas:
**“Solicitar licencia”** y **“Ya tengo mi clave / Activar clave”**.

### Paso 2 — Elige plan y paga
En **“Solicitar licencia”** el cliente:
1. Elige el **plan** (Demo, Mensual, Trimestral, Semestral, Anual, Perpetuo, Estudiantes, Empresa).
   - **Demo:** gratis **7 días**; al caducar, el cliente elige y activa el plan que quiera.
   - **Estudiantes:** **gratis**, pero debe **adjuntar su matrícula actual**. Dura **1 año** y se **renueva cada año** con nueva matrícula (hasta que pase a otro plan).
2. Paga por el método disponible:
   - **Tarjeta** (si has configurado el enlace de Stripe del plan), o
   - **Bizum / Transferencia** (con tus datos).
3. Rellena **nombre, email** y adjunta el **comprobante de pago**.
4. Pulsa **“He pagado · enviar mis datos”**. Te llegan sus datos y su **ID de equipo**.

### Paso 3 — Tú emites la clave (panel gestor)
En el **panel de licencias** (`distribucion/GESTOR-LICENCIAS/`):
1. Crea una licencia con: **cliente, email, ID de equipo y plan** elegido.
2. El panel **firma** la clave (con tu clave privada) y calcula la **caducidad según el plan**
   (p. ej. anual = 365 días; perpetuo = sin caducidad).
3. Copia la clave generada y **envíasela al cliente** (email/WhatsApp).

### Paso 4 — El cliente activa
El cliente abre la pestaña **“Activar clave”**, **pega la clave** y pulsa **Activar**.
- El programa verifica la firma, ata la licencia a su equipo y muestra:
  **“¡Licencia [plan] activada correctamente!”** y la fecha **“Válida hasta…”** (o “Permanente”).
- A partir de ahí el programa queda **activo según su plan**.

### Paso 5 — Renovación
Cuando se acerque la caducidad, el cliente verá el aviso y podrá **renovar** desde la
pantalla de renovación (botón que escribe a soporte). Tú emites una nueva clave con el
nuevo periodo y la pega igual que en el Paso 4.

---

## 3. Notas para la comercialización

- **Una licencia = un equipo** (va atada al ID del dispositivo). Si el cliente cambia de PC,
  emítele una clave nueva para el nuevo equipo.
- **Precios y datos de cobro** se editan en `src/lib/plans.config.js` (Bizum, IBAN, enlaces de Stripe).
- **Recomendable para vender**: firmar los instaladores con un **certificado de firma de código**
  (evita el aviso de “editor desconocido”). Cuando lo tengas, se integra en la compilación automática.
- **Soporte y contacto**: kairigarcia.gestionprototal@gmail.com

---

*Gestión Pro Total · Software de gestión para mantenimiento e instalaciones.*
