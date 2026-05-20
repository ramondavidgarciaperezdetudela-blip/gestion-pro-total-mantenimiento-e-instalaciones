# Guía de SAT Público - Aceptación y Rechazo Digital

## 📋 Descripción General

El sistema **SAT Público** permite que los clientes acepten o rechacen órdenes de SAT de forma digital y segura, con firma electrónica. Funciona igual que el sistema de presupuestos públicos, pero específicamente para órdenes de servicio técnico (SAT).

## 🎯 Flujo de Trabajo

### 1. **Crear una Orden SAT**
- Ve a **SAT** en el menú lateral
- Haz clic en "Nueva orden"
- Completa los datos de la orden (cliente, descripción, importe, etc.)
- Guarda la orden

### 2. **Enviar SAT Público al Cliente**
- Desde la vista de detalle (preview) de la orden SAT
- Haz clic en el botón **"🔗 Enviar SAT"**
- Se abrirá WhatsApp con un mensaje preformateado
- Incluye el enlace público de la orden
- El cliente recibe un enlace seguro

### 3. **Cliente Acepta o Rechaza**
- El cliente abre el enlace en su navegador
- Ve toda la información de la orden (descripción, materiales, importe, etc.)
- **Opción A: Aceptar** → Firma digitalmente → La orden cambia a estado "en_curso"
- **Opción B: Rechazar** → Firma digitalmente → La orden cambia a estado "cancelada"

### 4. **Registro y Notificaciones**
- La firma se registra con fecha/hora exacta
- Se envían correos de confirmación (admin + cliente)
- Se archiван en la ficha del cliente
- Historial de decisiones visible en la orden

---

## 🔗 Estructura de URLs

**URL Pública de SAT:**
```
https://app.base44.io/sat-publico?id={order_id}
```

**Ejemplo completo:**
```
https://app.base44.io/sat-publico?id=614f3c1a8b2d4f8c9e1a2b3c
```

**Con método de envío (opcional):**
```
https://app.base44.io/sat-publico?id={order_id}&method=whatsapp
https://app.base44.io/sat-publico?id={order_id}&method=email
```

---

## 📊 Gestión de SAT Aceptadas y Rechazadas

### En el módulo SAT:

#### **Tab: Aceptadas ✅**
- Muestra todas las órdenes aceptadas y firmadas por el cliente
- Status: `en_curso` + `signature_client` presente
- Muestra fecha de firma
- Permite editar, ver detalles y contactar

#### **Tab: Rechazadas ❌**
- Muestra todas las órdenes rechazadas y firmadas por el cliente
- Status: `cancelada` + `signature_client` presente
- Muestra fecha de firma
- Permite editar, ver detalles y contactar

#### **Filtros:**
- **"Todas las firmas"** → Muestra todas las órdenes
- **"✅ Aceptadas"** → Solo órdenes aceptadas y firmadas
- **"❌ Rechazadas"** → Solo órdenes rechazadas y firmadas

#### **KPIs actualizados:**
- Total de órdenes
- Pendientes
- **✅ Aceptadas** (nuevo)
- **❌ Rechazadas** (nuevo)

---

## 🔐 Características de Seguridad

### Firma Digital
- Canvas signature pad integrado
- Firma en formato JPEG comprimido
- URL de firma generada automáticamente
- Almacenada en la base de datos

### Validación
- Link único por orden SAT
- Verificación de propietario de orden
- Token de cambio de opinión (si aplica)
- Método de firma registrado (web/email/WhatsApp)

### Auditoría
- Fecha y hora exacta de firma (DD/MM/YYYY HH:MM:SS)
- Historial completo de decisiones
- Cambios de opinión registrados
- Emails de notificación archivados

---

## 📧 Notificaciones Automáticas

### Al **ACEPTAR** la orden SAT:
**Email al Admin:**
- ✅ Orden SAT ACEPTADA y firmada
- Datos de la orden (número, cliente, importe)
- Fecha y hora de firma
- Firma digital del cliente

**Email al Cliente:**
- Confirmación de aceptación
- Resumen de la orden
- Firma digital registrada
- Mensaje: "Nos pondremos en contacto en breve"

**WhatsApp (opcional):**
- Resumen de aceptación
- Número de orden
- Importe
- Hora de firma

### Al **RECHAZAR** la orden SAT:
**Email al Admin:**
- ❌ Orden SAT RECHAZADA y firmada
- Datos de la orden
- Información de que puede cambiar de opinión

**Email al Cliente:**
- Confirmación de rechazo
- Opción de cambiar de opinión
- Enlace para acceder de nuevo

**WhatsApp (opcional):**
- Resumen de rechazo
- Invitación a contactar si desea revisar

---

## 🔄 Cambio de Opinión

Si un cliente **acepta y luego desea rechazar** (o viceversa), el sistema registra:

1. **Historial visible** en el SAT público
2. **Historial en la base de datos** con todas las decisiones
3. **Token único** para cada cambio
4. **Nueva firma** con fecha/hora de cambio
5. **Email notificando** el cambio

El cliente puede cambiar de opinión **ilimitadas veces** accediendo al mismo enlace.

---

## 🛠️ Campos Nuevos en SATOrder

```json
{
  "signature_history": [
    {
      "action": "aceptar",           // o "rechazar"
      "signature_url": "https://...", // URL de la firma
      "datetime": "27/03/2026 14:30:45",
      "method": "web"                // "web", "email", o "whatsapp"
    }
  ],
  "sign_datetime_client": "27/03/2026 14:30:45"  // Última firma
}
```

---

## 📱 Ejemplo de Envío por WhatsApp

Cuando haces clic en **"🔗 Enviar SAT"**, WhatsApp abre con:

```
Hola Juan García,

LE PRESENTAMOS LA ORDEN SAT Nº SAT-2026-001:

🔧 Tipo: reparación
💶 Importe: 250.00 €

➡️ Enlace para aceptar o rechazar:
https://app.base44.io/sat-publico?id=614f3c1a8b2d4f8c9e1a2b3c

Gracias por confiar en nosotros.
```

---

## ❓ FAQ

**P: ¿Qué pasa si el cliente rechaza la orden?**
R: La orden pasa a estado "cancelada" y se registra la firma. El cliente puede cambiar de opinión después accediendo al enlace.

**P: ¿Se puede cambiar de opinión?**
R: Sí, ilimitadas veces. Cada cambio se registra en el historial con fecha/hora y firma nueva.

**P: ¿Qué es el "método" de firma?**
R: Registra cómo se firmó: "web" (directamente en el navegador), "email" (si se envió por email), o "whatsapp" (si se envió por WhatsApp).

**P: ¿Dónde se ve el historial de decisiones?**
R: En la página pública de la orden SAT, aparece la sección "📋 Historial de decisiones" con todas las aceptaciones/rechazos.

**P: ¿Se notifica al cliente de cada cambio?**
R: Sí, se envían emails automáticos de notificación cada vez que acepta o rechaza.

**P: ¿Cuál es la diferencia con los presupuestos?**
R: Es el mismo sistema, pero adaptado para órdenes SAT en lugar de facturas/presupuestos. Las órdenes pasan a "en_curso" (aceptadas) o "cancelada" (rechazadas).

**P: ¿Se pierden los datos si el cliente rechaza?**
R: No, la orden se archiva con status "cancelada". El técnico puede editarla después si es necesario.

---

## 🚀 Próximas Mejoras Sugeridas

- [ ] Recordatorios automáticos si no se firma en X días
- [ ] SMS como alternativa a WhatsApp
- [ ] Integración con Google Calendar para confirmación de cita
- [ ] Notificación al técnico asignado automáticamente
- [ ] Estadísticas de tasa de aceptación/rechazo
- [ ] Envío masivo a múltiples clientes