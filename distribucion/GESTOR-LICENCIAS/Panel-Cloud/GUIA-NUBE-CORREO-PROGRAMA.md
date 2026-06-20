# ☁️ Software de licencias en la nube (correo del programa)

Esta guía deja tu **gestión de licencias en la nube**, ligada al correo del programa
(**kairigarcia.gestionprototal@gmail.com**), usando **Google Apps Script** (gratis, del
propio Google). Así las solicitudes de los clientes llegan a tu correo y a una hoja de
cálculo, y puedes **emitir licencias desde cualquier dispositivo**.

> 🔒 **Seguridad:** la **clave privada** que firma las licencias **nunca se sube a la
> nube**. Tú la pegas en el panel solo cuando emites una clave; no se guarda online.

---

## ¿Qué queda en la nube?

1. **Backend de licencias (Apps Script)** — vive en tu cuenta de Google (la del correo
   del programa). Guarda **todas las claves y su estado**, **crea una carpeta por cliente
   en tu Google Drive** con sus claves, **detecta claves compartidas** (la misma clave en
   varios equipos), te **avisa por email** y permite **revocarlas**.
2. **Panel de licencias** (`GESTOR-DE-LICENCIAS.html`) — lo abres desde cualquier equipo;
   con tu clave privada **firmas** las licencias y, al emitirlas/revocarlas, **se vinculan
   solas a tu nube** (carpeta del cliente incluida).

---

## PASO 1 — Crear el backend en la nube (5 minutos)

1. Inicia sesión en Google con el **correo del programa**.
2. Entra en **https://script.google.com** → **Nuevo proyecto**.
3. Borra el código de ejemplo y **pega íntegro** el archivo
   `GPT-Licencias-Backend.gs` (está en esta carpeta).
4. Arriba en `CFG`, comprueba que `EMAIL_ADMIN` es tu correo del programa.
   Cambia `PASS_ADMIN` por una contraseña tuya. (`MAX_EQUIPOS` = equipos por clave; 1 por defecto.)
5. Pulsa **Guardar** 💾.
6. Pulsa **Implementar → Nueva implementación**.
   - Tipo: **Aplicación web**.
   - "Ejecutar como": **Yo**.
   - "Quién tiene acceso": **Cualquier persona**.
   - Pulsa **Implementar** y **autoriza** los permisos (incluye Drive/Sheets/Gmail; es tu cuenta).
7. Copia la **URL de la aplicación web** que te da (termina en `/exec`).

✅ Ya tienes el backend en la nube de tu correo. En tu Drive se creará la carpeta
**"Gestion Pro Total - Licencias"** con una subcarpeta por cliente.

## PASO 2 — Conectar el panel con la nube
Pega la URL `…/exec` en el panel (**⚙️ Configuración → URL de Apps Script**). Desde
ese momento, cada licencia que emitas o revoques **se registra en tu nube** y se crea/
actualiza la **carpeta del cliente** en Drive.

En el archivo de configuración de cobro/avisos del programa pega esa URL donde se
indique el receptor (campo "URL del receptor / Apps Script"). A partir de ahí, cuando un
cliente pulse **"Solicitar licencia"**, su solicitud llega a tu **correo** y a la **hoja
de Google** automáticamente.

## PASO 3 — Emitir la licencia (desde cualquier sitio)

1. Abre **`GESTOR-DE-LICENCIAS.html`** (puedes guardarlo en Google Drive y
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

Sube `GESTOR-DE-LICENCIAS.html` a **Google Drive** (clic derecho → Abrir
con → Vista previa, o usa un visor HTML) o ábrelo desde tu equipo. Como la firma se hace
en tu navegador con tu clave privada (que tú pegas), **no hace falta ningún servidor** y
sigue siendo seguro.

---

## 🔴 Bloqueo REAL en la app (revocar / claves compartidas) — 2ª fase

Para que **revocar bloquee de verdad** al cliente y se **detecten duplicados al abrir**,
la app debe **consultar tu backend al arrancar** (necesita internet). Esto se conecta en
una segunda fase:

1. Despliega el backend (PASO 1) y **pásame la URL `…/exec`**.
2. Compilo la app en **modo nube** apuntando a esa URL y la **republico**. A partir de
   ahí, al abrir, la app llama a `validar` (envía su `deviceId`):
   - Si la clave está **revocada** → la app no deja entrar.
   - Si la clave aparece en **otro equipo** → ese equipo queda **bloqueado** y te llega
     el **aviso de compartición** (y la clave se marca como *compartida* en tu nube).

> ⚠️ **Nota técnica (CORS):** Google Apps Script tiene límites para que el **navegador
> lea** su respuesta. Si al conectar la app la lectura fallara por CORS, la alternativa
> robusta es un pequeño validador en **Cloudflare Workers** (gratis, con CORS) que lee los
> mismos datos. Te lo dejaría preparado si hiciera falta. El **registro de claves, la
> carpeta por cliente y los avisos por email funcionan con Apps Script** sin problema.
