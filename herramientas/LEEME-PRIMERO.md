# 🧰 Mini-programa para subir nuevas versiones

Este pequeño programa te deja **subir ficheros nuevos** (instaladores, APK, etc.) al
repositorio de descargas de tus clientes **sin saber programar**: arrastras los ficheros
y pulsas un botón.

- 📄 El programa es el archivo **`Subir-Nueva-Version.html`** (en esta misma carpeta).
- 👉 Para usarlo: **doble clic** sobre él. Se abre en tu navegador (Chrome, Edge, etc.).

### 🖥️ Tener el icono en el Escritorio (recomendado)

Para no buscar el archivo cada vez, crea un acceso directo con el logo de la app:

- **En Windows:** doble clic en **`Crear acceso directo (Windows).bat`**.
  Aparecerá en tu Escritorio un icono llamado **"Subir version Gestion Pro"** con el
  logo de la aplicación. A partir de ahí, solo tienes que pulsar ese icono.
- **En Mac:** usa el archivo **`Subir version Gestion Pro (Mac).command`** (doble clic).
  La primera vez, si macOS no deja abrirlo: clic derecho → "Abrir" → "Abrir".
  Puedes arrastrarlo al Dock para tenerlo a mano.

> ⚠️ No muevas el archivo `Subir-Nueva-Version.html` ni el icono `Gestion-Pro-Total.ico`
> de esta carpeta, o el acceso directo dejará de funcionar. Si los mueves, vuelve a
> ejecutar el creador de acceso directo.

---

## 🔑 SOLO LA PRIMERA VEZ: crear tu "clave de acceso" (token)

Para que el programa pueda subir ficheros por ti, GitHub necesita una **clave de acceso**
(se llama *token*). Se crea una vez y se reutiliza siempre. Tardas 2 minutos.

### Pasos para crear la clave

1. Entra en esta página (inicia sesión en GitHub si te lo pide):
   👉 https://github.com/settings/personal-access-tokens/new

2. Rellena así:
   - **Token name** (nombre): escribe algo como `Subir versiones Gestión Pro`.
   - **Expiration** (caducidad): elige **90 days** o **No expiration** (si eliges 90 días,
     tendrás que crear una nueva clave cada 3 meses).
   - **Resource owner**: déjalo en tu usuario
     (`ramondavidgarciaperezdetudela-blip`).

3. En **Repository access**, marca **"Only select repositories"** y elige el repositorio:
   **`gestion-pro-total-releases`**.

4. Baja a **Permissions → Repository permissions**. Busca **"Contents"** y ponlo en
   **"Read and write"** (Lectura y escritura).
   - *(No hace falta nada más. Deja el resto como está.)*

5. Baja del todo y pulsa el botón verde **"Generate token"**.

6. GitHub te mostrará la clave **una sola vez**. Empieza por `github_pat_…`.
   **Cópiala y guárdala** en un sitio seguro (por ejemplo, un documento privado o un
   gestor de contraseñas). Si la pierdes, no pasa nada: creas otra repitiendo estos pasos.

> ⚠️ **Importante:** esta clave es como una contraseña. No la compartas ni la subas a
> ningún sitio público.

---

## 🚀 Cómo publicar una versión (cada vez)

1. Doble clic en **`Subir-Nueva-Version.html`**.
2. **Paso 1:** pega tu clave de acceso.
   - Puedes marcar *"Recordar la clave en este equipo"* para no pegarla cada vez
     (no lo marques en ordenadores compartidos).
3. **Paso 2:** escribe el **número de versión** (p. ej. `1.0.1`). Si quieres, añade un
   título y las novedades.
4. **Paso 3:** **arrastra los ficheros** que quieras publicar (o haz clic para elegirlos).
5. Pulsa **🚀 Publicar versión** y espera a que termine.
6. Al acabar te dará el **enlace de descargas** para tus clientes (siempre el mismo):
   👉 https://github.com/ramondavidgarciaperezdetudela-blip/gestion-pro-total-releases/releases/latest

---

## ❓ Preguntas frecuentes

**¿Esto sustituye a la publicación automática?**
No necesariamente. La forma recomendada sigue siendo la automática (pestaña *Actions*),
explicada en `docs/COMO-PUBLICAR-NUEVA-VERSION.md`. Este programa es para cuando quieras
subir ficheros **a mano**.

**Subí un fichero con un nombre que ya existía. ¿Lo rompo?**
No. El programa **reemplaza** el fichero anterior por el nuevo automáticamente.

**Me dice "La clave de acceso no es válida o ha caducado".**
Crea una clave nueva siguiendo los pasos de arriba y pégala otra vez.

**¿Es seguro?**
Sí. Tu clave **nunca se envía a internet** salvo directamente a GitHub. El programa
funciona dentro de tu navegador, en tu ordenador.

**¿Tengo que estar conectado a internet?**
Sí, para subir los ficheros. El programa en sí no necesita instalación.
