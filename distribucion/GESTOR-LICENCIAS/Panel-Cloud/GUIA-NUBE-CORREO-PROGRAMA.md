# ☁️ Software de licencias en la nube (correo del programa)

Esta guía deja tu **gestión de licencias en la nube**, ligada al correo del programa
(**kairigarcia.gestionprototal@gmail.com**), usando **Google Apps Script** (gratis, del
propio Google). Así las solicitudes de los clientes llegan a tu correo y a una hoja de
cálculo, y puedes **emitir licencias desde cualquier dispositivo**.

> 🔒 **Seguridad:** la **clave privada** que firma las licencias **nunca se sube a la
> nube**. Tú la pegas en el panel solo cuando emites una clave; no se guarda online.

---

## ¿Qué queda en la nube?

1. **Receptor (Apps Script)** — recibe las solicitudes/alertas del programa de los
   clientes, las guarda en **Google Sheets** y te avisa por **email**. Vive en tu cuenta
   de Google (la del correo del programa).
2. **Panel de licencias** — lo abres desde cualquier ordenador (es un archivo HTML que
   puedes tener en Google Drive o en tu equipo) y, pegando tu clave privada, **firmas y
   envías** la licencia al cliente.

---

## PASO 1 — Crear el receptor en la nube (5 minutos)

1. Inicia sesión en Google con el **correo del programa**.
2. Entra en **https://script.google.com** → **Nuevo proyecto**.
3. Borra el código de ejemplo y **pega íntegro** el archivo
   `GPT-Receptor-Alertas.gs` (está en esta carpeta).
4. Arriba en `CONFIG`, comprueba que `EMAIL_ADMIN` es tu correo del programa.
   Cambia `PASS_ADMIN` por una contraseña tuya.
5. Pulsa **Guardar** 💾.
6. Pulsa **Implementar → Nueva implementación**.
   - Tipo: **Aplicación web**.
   - "Ejecutar como": **Yo**.
   - "Quién tiene acceso": **Cualquier persona**.
   - Pulsa **Implementar** y **autoriza** los permisos (es tu propia cuenta).
7. Copia la **URL de la aplicación web** que te da (termina en `/exec`).

✅ Ya tienes el receptor en la nube de tu correo.

## PASO 2 — Conectar el programa con la nube

En el archivo de configuración de cobro/avisos del programa pega esa URL donde se
indique el receptor (campo "URL del receptor / Apps Script"). A partir de ahí, cuando un
cliente pulse **"Solicitar licencia"**, su solicitud llega a tu **correo** y a la **hoja
de Google** automáticamente.

## PASO 3 — Emitir la licencia (desde cualquier sitio)

1. Abre **`Panel-Licencias-Gestion-Pro-Total.html`** (puedes guardarlo en Google Drive y
   abrirlo desde cualquier equipo, o tenerlo en tu carpeta).
2. Pega tu **clave privada** (solo se queda en ese momento, no se sube).
3. Rellena cliente, email, **ID de equipo** y **plan**.
4. Genera la clave y **envíasela** al cliente (botón de email/WhatsApp).

---

## 📋 Reglas de licencia (ya aplicadas en el panel)

| Plan | Precio | Duración | Requisito |
|---|---|---|---|
| **Demo** | Gratis | **7 días** | Ninguno. Al caducar, el cliente elige un plan. |
| **Estudiantes** | **Gratis** | **1 año** | **Justificante de matrícula actual.** Se renueva cada año con nueva matrícula, hasta que elija otro plan. |
| Mensual / Trimestral / Semestral / Anual | de pago | según plan | Comprobante de pago. |
| Perpetuo | de pago | sin caducidad | Comprobante de pago. |
| Empresa (Packs) | a medida | según acuerdo | — |

> Para **renovar** a un estudiante: cuando se acerque el año, pídele la **matrícula
> nueva** y reemite la licencia (plan Estudiantes) por otro año.

---

## ¿Y si quiero el panel también accesible online?

Sube `Panel-Licencias-Gestion-Pro-Total.html` a **Google Drive** (clic derecho → Abrir
con → Vista previa, o usa un visor HTML) o ábrelo desde tu equipo. Como la firma se hace
en tu navegador con tu clave privada (que tú pegas), **no hace falta ningún servidor** y
sigue siendo seguro.
