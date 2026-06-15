# 📘 Cómo publicar una nueva versión de Gestión Pro Total

> **Resumen en una frase:** cambias un número, pulsas un botón, y GitHub hace solo
> todo lo demás (compilar Windows / Mac / Linux / Android y publicar las descargas).

Lo harás todo desde la web de GitHub, **sin instalar nada** en tu ordenador.

Tienes **dos formas** de publicar:

- **Forma A (recomendada):** publicación automática. GitHub compila la app y publica
  las descargas él solo. Es la que debes usar normalmente.
- **Forma B (manual):** subir tú unos ficheros concretos con el mini-programa
  `herramientas/Subir-Nueva-Version.html`. Útil si ya tienes los instaladores hechos
  o quieres añadir un archivo suelto.

---

## ✅ FORMA A — Publicación automática (recomendada)

### 🟢 PASO 1 — Cambiar el número de versión

Cada versión nueva necesita un número más alto que la anterior. La actual es **1.0.0**.

Reglas sencillas para elegir el número nuevo:

- ¿Arreglos pequeños o cambios menores? → **1.0.1**
- ¿Funciones nuevas? → **1.1.0**
- ¿Cambio muy grande? → **2.0.0**

(Si tienes dudas, simplemente sube el último número: 1.0.0 → 1.0.1 → 1.0.2…)

**Cómo cambiarlo:**

1. Entra en el archivo `package.json` del repositorio (web de GitHub).
2. Pulsa el **icono del lápiz** ✏️ (arriba a la derecha) para editar.
3. Busca, cerca del principio, una línea parecida a:
   ```
   "version": "1.0.0",
   ```
4. Cambia **solo** el número entre comillas. Por ejemplo:
   ```
   "version": "1.0.1",
   ```
   ⚠️ No borres las comillas ni la coma del final.
5. Baja del todo y pulsa el botón verde **"Commit changes…"**.
6. En la ventanita que sale, pulsa otra vez **"Commit changes"** (no cambies nada más).

✅ Listo el paso 1.

### 🟢 PASO 2 — Lanzar la publicación

1. Entra en la pestaña **Actions** del repositorio.
2. En la lista de la **izquierda**, haz clic en
   **"Publicar release pública (descargas + auto-update)"**.
3. A la **derecha** aparecerá el botón **"Run workflow"**. Púlsalo.
4. Deja la rama en **`main`** y pulsa el botón verde **"Run workflow"**.

✅ Ya está trabajando solo.

### 🟢 PASO 3 — Esperar (unos 10-15 minutos)

- Círculo **amarillo** girando 🟡 = está compilando.
- **✓ verde** = terminó bien.
- **✗ roja** = algo falló; no pasa nada, avisa para revisarlo.

> Puedes cerrar la página mientras tanto.

### 🟢 PASO 4 — Comprobar que está publicada

Cuando salga el ✓ verde, tus clientes ya tienen la versión nueva aquí
(este enlace **es siempre el mismo**, no cambia nunca):

👉 **https://github.com/ramondavidgarciaperezdetudela-blip/gestion-pro-total-releases/releases/latest**

---

## ✅ FORMA B — Subir ficheros a mano con el mini-programa

Usa esto cuando ya tengas los ficheros (instaladores, APK, etc.) y quieras subirlos
tú directamente.

1. Abre el archivo **`herramientas/Subir-Nueva-Version.html`** con doble clic
   (se abre en tu navegador).
2. Sigue las instrucciones de la pantalla: pega tu clave de acceso, escribe el número
   de versión, arrastra los ficheros y pulsa **"Publicar".**
3. Cuando termine, te dará el enlace de descargas para los clientes.

> La primera vez necesitas crear una "clave de acceso" (token). Está todo explicado,
> paso a paso, en **`herramientas/LEEME-PRIMERO.md`**.

---

## 🔄 ¿Y la actualización automática?

No tienes que hacer nada especial. Los clientes que **ya tengan instalada** la app en
ordenador recibirán un aviso de "hay una actualización disponible" la próxima vez que
la abran, y se actualizará sola. Eso ya quedó configurado. 🎉

*(En Android, el cliente descarga el nuevo APK desde el mismo enlace.)*

---

## ⚠️ Errores típicos y cómo evitarlos

| Si te pasa esto… | Es porque… | Solución |
|---|---|---|
| ✗ roja nada más empezar, habla de "version" o "tag" | Olvidaste subir el número | Repite el Paso 1 con un número más alto |
| Error al editar `package.json` | Se borró una comilla `"` o la coma `,` | Déjalo exacto: `"version": "1.0.2",` |
| No aparece "Run workflow" | Pestaña equivocada | Ve a **Actions** y pulsa el nombre del workflow a la izquierda |

---

## 📝 Lo que NO debes tocar

- No hace falta volver a crear el token de publicación ni el repositorio público:
  **ya están hechos para siempre.**
- No toques los archivos de configuración (`electron-builder.yml`, la carpeta
  `.github`)… salvo que te lo indiquen.
