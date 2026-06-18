# 🔏 Firma de los instaladores (quitar el aviso de "editor desconocido")

Cuando Windows/macOS muestran *"editor desconocido"* o *"Windows protegió tu PC"* es
porque los instaladores **no están firmados con un certificado**. Firmarlos quita ese
aviso y da confianza al cliente.

> ⚠️ **Importante:** la firma requiere **certificados de pago** que van a tu nombre.
> No se pueden generar desde aquí. Abajo tienes qué comprar y cómo conectarlo. Una vez
> añadidos los certificados como *secrets*, **la compilación los firma sola** (electron-builder
> los detecta automáticamente; no hay que tocar código).

---

## 🪟 Windows — Certificado de firma de código (Authenticode)

1. **Compra un certificado** "Code Signing" (o, mejor, **EV Code Signing**, que quita el
   aviso de SmartScreen al instante). Proveedores: Sectigo, DigiCert, SSL.com…
   (aprox. 200–400 €/año; el EV puede requerir un token USB o firma en la nube).
2. Te darán un archivo **`.pfx`** (con contraseña) o una firma en la nube.
3. En GitHub → repositorio → **Settings → Secrets and variables → Actions**, añade:
   - `CSC_LINK` = el `.pfx` en **base64** (en Windows PowerShell:
     `[Convert]::ToBase64String([IO.File]::ReadAllBytes("cert.pfx")) > cert.txt`)
   - `CSC_KEY_PASSWORD` = la contraseña del `.pfx`
4. En el workflow de publicación, esos secrets se pasan como variables de entorno al
   paso de compilar escritorio. electron-builder firmará el `.exe` automáticamente.

## 🍎 macOS — Firma + Notarización (Apple)

1. Necesitas una **cuenta Apple Developer** (99 $/año).
2. Crea un certificado **"Developer ID Application"** y expórtalo a `.p12`.
3. Añade como secrets:
   - `CSC_LINK` = el `.p12` en base64 · `CSC_KEY_PASSWORD` = su contraseña
   - Para **notarizar**: `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` y `APPLE_TEAM_ID`
4. electron-builder firma y notariza el `.dmg` automáticamente con esas variables.

## 🤖 Android — Firma del APK
El APK ya se firma en la compilación con tu *keystore* (lo creas con
`CREAR-CLAVE-FIRMA.bat`). Para publicar en Google Play necesitas ese keystore guardado.

---

## ¿Qué está ya preparado?
- `electron-builder.yml` produce los instaladores y **detecta los certificados por
  variables de entorno** (`CSC_LINK`, `CSC_KEY_PASSWORD`, las de Apple). No hay que
  cambiar código: en cuanto añadas los secrets y vuelvas a publicar, salen **firmados**.

## Mientras tanto (sin firmar)
La app funciona perfectamente; solo aparece el aviso la primera vez:
- **Windows:** "Más información" → "Ejecutar de todas formas".
- **macOS:** clic derecho → "Abrir" → "Abrir".

> Recomendación: si vas a vender a muchos clientes, el **EV Code Signing de Windows** es
> el que más confianza aporta (elimina el SmartScreen desde el primer día).
