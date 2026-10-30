# 📜 Cumplimiento de protección de datos (RGPD / LOPDGDD)

> Documento informativo de cómo Gestión Pro Total trata los datos personales.
> No sustituye al asesoramiento legal; adáptalo con tu asesor si lo necesitas.

## Responsable del tratamiento
**Gestión Pro Total** — Ramón David García Pérez de Tudela.
Contacto / ejercicio de derechos: **kairigarcia.gestionprototal@gmail.com**

## Qué datos se tratan y para qué

| Dato | Finalidad | Base legal |
|---|---|---|
| Nombre / empresa, email, teléfono | Emitir y gestionar la **licencia** y dar soporte | Ejecución de contrato |
| Identificador de equipo (deviceId) | Atar la licencia a un equipo y evitar fraude | Interés legítimo / contrato |
| Comprobante de pago / matrícula | Verificar el pago o el derecho a tarifa de estudiante | Obligación contractual |
| Datos de uso de la app (los que el cliente introduce: sus propios clientes, facturas…) | Los gestiona **el propio cliente** en su equipo; el propietario del software **no accede** a ellos | Responsabilidad del cliente |

## Dónde se guardan
- **En el equipo del cliente** (modo offline): sus datos de negocio no salen de su dispositivo.
- **En la nube del propietario** (opcional, Google del correo del programa): solo los datos
  de **solicitud de licencia** (nombre, email, equipo, plan y comprobante) en Google Sheets/Drive.
- La **clave privada** de firma nunca se sube a internet.

## Conservación
Los datos de licencia se conservan mientras dure la relación comercial y el tiempo legal
necesario (p. ej. facturación). El comprobante de pago se conserva según obligaciones fiscales.

## Derechos de las personas
Acceso, rectificación, supresión, oposición, limitación y portabilidad, escribiendo a
**kairigarcia.gestionprototal@gmail.com**. También pueden reclamar ante la **AEPD** (aepd.es).

## Consentimiento
El formulario de **Solicitud de licencia** incluye una casilla de **consentimiento informado**
antes de enviar los datos. Sin aceptarla, no se envía la solicitud.

## Seguridad de los datos (resumen)
- Comunicaciones por **HTTPS**.
- Acceso al panel y al backend protegido por **contraseña**.
- Datos mínimos necesarios (**minimización**).
- Ver medidas técnicas en `docs/SEGURIDAD.md`.

## Encargados / terceros
- **Google** (Apps Script, Sheets, Drive, Gmail) como encargado de tratamiento si se usa el
  modo nube — cuenta del propietario.
- **Stripe** (si se activan pagos con tarjeta) como procesador de pagos.
- **Base44** como backend de la aplicación, según su propia política.

> Mantén publicada la **Política de Privacidad** (`distribucion/LEGAL/Politica-Privacidad-y-Aviso-Legal.md`
> y `docs/legal/PRIVACIDAD.md`) y enlázala en la solicitud y en la app.
