# Guía: montar tu propio servidor en casa

Con esta guía los datos de Gestión Pro Total se guardan en un ordenador tuyo (en casa u oficina) y no en la nube de nadie. La aplicación del móvil, la tablet, el instalador de Windows y la versión portable se conectan a él.

Es opcional: si no lo montas, el programa sigue funcionando como siempre con Base44, o solo en el propio dispositivo.

## 1. Qué necesitas
- Un ordenador que pueda estar encendido cuando quieras usar el programa (Windows, Linux, Mac o una Raspberry Pi).
- Node.js 18 o superior (https://nodejs.org). No hace falta instalar nada más: el servidor no usa librerías externas.
- La carpeta `servidor-datos` de este proyecto (viene en el ZIP). Si quieres que el propio servidor también muestre la aplicación en el navegador, la carpeta `dist` (la aplicación ya compilada) junto a ella.

## 2. Arrancarlo
1. Abre una terminal (en Windows: «Símbolo del sistema» o PowerShell) dentro de la carpeta del proyecto.
2. Ejecuta: `node servidor-datos/servidor.mjs`
3. La primera vez crea la cuenta de administrador, muestra su correo y guarda la clave inicial en el archivo `ADMIN-CLAVE.txt`, dentro de la carpeta de datos.
4. Entra en la aplicación con ese correo y esa clave, cámbiala y borra el archivo `ADMIN-CLAVE.txt`.

Opciones (variables de entorno, todas opcionales):
- `PUERTO` — puerto del servidor (por defecto 8787).
- `DATOS` — carpeta donde se guardan los datos (por defecto `datos-gpt`).
- `WEB` — carpeta de la aplicación compilada que se sirve en el navegador (por defecto `dist`).
- `ADMIN_EMAIL` y `ADMIN_PASSWORD` — correo y clave del administrador en la primera arrancada.

Ejemplo en Linux/Mac: `PUERTO=9000 DATOS=/srv/gpt node servidor-datos/servidor.mjs`
Ejemplo en Windows (PowerShell): `$env:PUERTO=9000; node servidor-datos/servidor.mjs`

## 3. Conectar tus aparatos
1. Averigua la dirección de tu ordenador en la red de casa (por ejemplo `192.168.1.20`): en Windows escribe `ipconfig` en una terminal y mira «Dirección IPv4»; en Linux, `hostname -I`. El servidor solo muestra `localhost` y «IP-DE-ESTE-ORDENADOR», así que la IP la pones tú.
2. En la aplicación (APK, instalador de Windows, portable o web): al abrirla por primera vez elige **«Servidor propio»** — o, si ya la usas, ve a **Configuración de empresa → Dónde se guardan los datos → Cambiar**.
3. Escribe la dirección completa, por ejemplo `http://192.168.1.20:8787`, y pulsa «Probar y guardar».
4. Entra con tu correo y tu clave. Para crear más usuarios, usa «Crear una cuenta» en esa misma pantalla o el apartado de usuarios.

El móvil y la tablet deben estar en el mismo wifi. Si en Windows aparece el aviso del cortafuegos al arrancar el servidor, permite el acceso a redes privadas.

## 4. Pasar los datos que ya tienes
Los datos no se mueven solos al cambiar de destino:
1. En el sitio de origen, ve a **Copia de seguridad → Exportar**, y guarda el archivo.
2. Cambia el destino a «Servidor propio» y entra.
3. Ve a **Copia de seguridad → Restaurar** y elige el archivo. Esperas a que la barra de progreso llegue al 100 %.

Para volver a Base44 o a otro sitio haces lo mismo al revés.

## 5. Que arranque solo
**Linux (systemd).** Crea `/etc/systemd/system/gpt.service`:

```
[Unit]
Description=Gestion Pro Total
After=network.target

[Service]
WorkingDirectory=/ruta/al/proyecto
Environment=PUERTO=8787
Environment=DATOS=/srv/gpt-datos
ExecStart=/usr/bin/node servidor-datos/servidor.mjs
Restart=always

[Install]
WantedBy=multi-user.target
```

Después: `sudo systemctl enable --now gpt`

**Windows.** Crea un archivo `arrancar-servidor.bat` con `cd /d C:\ruta\al\proyecto` y `node servidor-datos\servidor.mjs`, y pon un acceso directo a él en la carpeta de inicio (`Win + R` → `shell:startup`).

## 6. Usarlo desde fuera de casa (opcional)
Dentro de casa no hace falta nada más. Para entrar desde la calle, lo más seguro, de mejor a peor:
1. **Una VPN hacia tu casa** (por ejemplo WireGuard o Tailscale): el servidor no queda expuesto a internet y usas la dirección privada.
2. **Un acceso con HTTPS** con un proxy como Caddy (`caddy reverse-proxy --from tudominio.com --to localhost:8787` consigue el certificado solo) y redirigiendo ese puerto en el router.
3. Evita abrir el puerto 8787 tal cual a internet: el tráfico iría sin cifrar.

La aplicación Android admite direcciones `http://` de tu red; fuera de casa usa `https://`.

## 7. Copias de seguridad del servidor
Todo está en la carpeta de datos (`datos-gpt` o la que elijas con `DATOS`): copiarla entera, con el servidor parado o no, es una copia completa. Haz además copias con **Copia de seguridad → Exportar** desde la aplicación; son independientes del servidor.

## 8. Publicar en internet con seguridad
Si vas a abrir el servidor a internet (para trabajar desde fuera de casa), sigue **todos** estos pasos. No lo expongas directamente sin ellos.

1. **Usa siempre HTTPS.** Sin cifrado, contraseñas y datos de clientes viajan a la vista. La forma más fácil:
   - **Cloudflare Tunnel** (gratis, no abres puertos del router): instala `cloudflared` y apunta tu dominio a `http://localhost:8787`.
   - O **Caddy** delante del servidor (consigue el certificado solo): `tudominio.es { reverse_proxy localhost:8787 }`.
2. **Con un proxy delante**, arranca el servidor con `CONFIAR_PROXY=1` (así los bloqueos por intentos fallidos usan la dirección real del visitante) y `FORZAR_HTTPS=1`.
3. **Fija el origen permitido**: `ORIGEN_PERMITIDO=https://tudominio.es` (por defecto acepta cualquiera).
4. **Contraseña de administrador larga** (12+ caracteres) y cámbiala nada más entrar; borra `ADMIN-CLAVE.txt`.
5. **No abras más puerto que el 443** del proxy; el puerto 8787 debe quedar solo para uso interno.
6. **Copias de seguridad** de la carpeta de datos fuera del servidor (Drive, disco externo) y guarda `secreto.txt`: quien lo tenga puede firmar sesiones.
7. Mantén al día el sistema, Node y la aplicación.

Qué hace el servidor por ti: bloquea 15 minutos tras 6 intentos fallidos (ajustable con `FALLOS_LOGIN`), limita las peticiones por minuto (`PETICIONES_POR_MINUTO`), caduca las sesiones al cambiar la contraseña (y a los `DIAS_SESION`, por defecto 7), no deja subir archivos ejecutables ni .html y aísla los archivos subidos, impide que el correo apunte a tu red interna, añade cabeceras de seguridad y no revela qué cuentas existen.

Variables disponibles: `PUERTO`, `DATOS`, `WEB`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `CONFIAR_PROXY`, `FORZAR_HTTPS`, `ORIGEN_PERMITIDO`, `FALLOS_LOGIN`, `PETICIONES_POR_MINUTO`, `DIAS_SESION`.

### Lo que este servidor NO cubre
- Los enlaces públicos de presupuestos y SAT que usan Base44 solo piden el identificador del documento; si usas Base44, valora añadir un código secreto a esos enlaces y revisar las reglas de acceso de cada entidad en su panel.
- No hay doble factor (2FA) ni registro de auditoría detallado.
- Los datos del navegador y del móvil no van cifrados en el propio aparato: protege el dispositivo con bloqueo de pantalla.

## Límites que conviene conocer
- El servidor es sencillo: pensado para una empresa pequeña (unos pocos usuarios a la vez), no para cientos.
- El correo directo desde la aplicación sale por el servidor, con el SMTP que pongas en Configuración → Correo.
- La IA de Base44 no está disponible con datos propios: la aplicación usa Ollama u OpenRouter (Configuración → IA).
- Se ha probado el servidor y el flujo de conexión en un navegador y por línea de comandos; falta probarlo en tus aparatos reales.

## Otras opciones de guardado
- **Supabase** (tu propia nube): el archivo `supabase/esquema.sql` y los pasos están en la guía ilustrada `GUIA-ILUSTRADA-DONDE-GUARDAR-LOS-DATOS.pdf`.
- Tras actualizar la app, esta te pregunta si mantienes los ajustes de guardado o los cambias; también puedes hacerlo en Configuración de empresa → Dónde se guardan los datos.
