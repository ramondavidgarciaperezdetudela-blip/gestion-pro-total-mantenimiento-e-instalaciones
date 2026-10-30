# Gestión Pro Total — versión fuera de Base44

Misma aplicación (mantenimiento, electricidad, refrigeración/clima y solar), pero **sin depender de Base44**.
Al abrirla por primera vez eliges dónde se guardan los datos:

| Opción | Qué es | Cuándo elegirla |
|---|---|---|
| **Solo en este dispositivo** | Datos en el propio aparato (IndexedDB). Sin cuentas ni servidor. | Un solo usuario / un solo aparato. Lo más sencillo. |
| **Supabase (nube)** | Tus datos en tu proyecto de Supabase. Entran varios aparatos con correo y contraseña. | Ordenador + móvil + tablet sincronizados, sin mantener un servidor. |
| **Servidor propio** | `servidor-datos/servidor.mjs`: un servidor sin dependencias (Node 18+) que también sirve la aplicación. | Quieres los datos en tu ordenador o en tu VPS. |

Se puede cambiar después («Cambiar dónde se guardan los datos» en la pantalla de entrada). **Los datos no se mueven solos**: se pasan con *Copia de seguridad → exportar* en el origen y *restaurar* en el destino.

## Arranque rápido

```bash
npm install
npm run build
npm run servidor          # modo «Servidor propio»: http://localhost:8787
```

Para el modo local basta con servir `dist/` o instalar la aplicación de escritorio / el APK.

### Servidor propio
1. `npm run servidor` (variables opcionales: `PUERTO=8787`, `DATOS=/ruta/datos`).
2. En el móvil o la tablet (mismo wifi) abre `http://IP-DEL-ORDENADOR:8787`. Elige «Servidor propio»; la dirección se rellena sola.
3. La primera cuenta que se crea es la del administrador; después el registro se cierra.
4. Los datos quedan en `datos-gpt/` (copia esa carpeta para respaldarlos). Para usarlo desde fuera de casa, ponlo detrás de HTTPS (nginx/Caddy).

### Supabase
1. Crea un proyecto en supabase.com.
2. SQL Editor → pega y ejecuta `supabase/esquema.sql`.
3. En la aplicación elige «Supabase», pega la URL del proyecto y la clave pública `anon`, y crea tu cuenta.
4. Desactiva el registro abierto (Authentication → Providers → Email) cuando tengas las cuentas de tu equipo.

## Iconos con IA (ordenador, móvil y tablet)
Prueba por orden: generador de imágenes → tu clave de OpenRouter (modelo de imagen) → la IA de texto dibujando un SVG → icono propio sin IA. Activa «Ayuda con IA» y pega tu clave de OpenRouter en *Configuración → IA*; vale en todos los aparatos.

## Lo que NO existe sin Base44
- Envío de correos desde la aplicación (copias firmadas, avisos de cita, alertas de factura, soporte…).
- Enlaces públicos para que el cliente acepte/rechace presupuestos y órdenes SAT, y verificación de documentos por QR.
- Lectura de Excel/PDF con IA, actualización de tarifas de proveedores por internet, invitar usuarios.
- «Descuento de stock» sí funciona (se hace dentro de la aplicación).
Esas funciones muestran un aviso claro al usarlas; requerirían un servidor con correo propio.

## Pruebas
`npm run test:servidor` (servidor propio), `test:filtro`, `test:capilar`, `test:gases`, `test:equivalencias`, `test:clima`, `test:vinculos`, `test:iconoia`.

Basada en Gestión Pro Total 1.75.1. El código lleva el nombre `base44Client.js` por compatibilidad: ahora es un cliente propio (`src/nube/`).
