# 📱 Probar Gestión Pro Total en el móvil con Expo Go

Esto te deja **probar la app en tu teléfono ANTES de publicarla en internet**,
escaneando un código QR con la app **Expo Go** (gratis en Play Store / App Store).

> Es un envoltorio: carga la app web (la misma de `dist/`) dentro de una app
> nativa para que puedas verla y tocarla en el móvil real.

## Requisitos (una sola vez)
- Node.js instalado en el PC.
- App **Expo Go** instalada en el móvil.
- PC y móvil en la **misma red WiFi**.

## Pasos
1. **Sirve la app web** desde la carpeta del proyecto (una opción):
   - App ya compilada:  `npx serve dist`  (suele abrir en el puerto 3000)
   - O en desarrollo:   `npm run dev`     (Vite, puerto 5173)

2. **Averigua la IP local de tu PC**:
   - Windows: `ipconfig`  → "Dirección IPv4" (p.ej. 192.168.1.40)
   - Mac/Linux: `ifconfig` o `ip a`

3. **Indica esa URL** a la app Expo. Edita `app.json` → `expo.extra.appUrl`:
   ```json
   "appUrl": "http://192.168.1.40:3000"
   ```
   (usa el puerto que te haya dado el paso 1)

4. **Arranca Expo** dentro de esta carpeta:
   ```bash
   cd movil-expo
   npm install
   npx expo start
   ```

5. **Escanea el QR** que aparece en la terminal con la app **Expo Go**.
   - ¿No conecta por WiFi? Usa túnel:  `npx expo start --tunnel`

## Probar la web ya desplegada
Si ya tienes la web publicada (o un preview), pon esa URL en `appUrl` y
escanea el QR: verás esa versión en el móvil.

## Notas
- Esto es para **probar**, no es la app de la tienda. Para publicar en
  Play Store/App Store se hace una build con EAS (`eas build`).
- El `.apk` que ya tienes en `PARA-EL-CLIENTE/Android` también sirve para
  instalar y probar directamente.
