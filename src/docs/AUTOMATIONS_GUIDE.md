# Guía de Automatizaciones y Recordatorios

## 📋 Panel de Tareas Pendientes

El **Panel de Tareas Pendientes** aparece automáticamente en la página de inicio (Home) y destaca:

### 1. 📋 Presupuestos sin Respuesta (+7 días)
- Muestra presupuestos enviados hace más de 7 días sin que el cliente haya aceptado o rechazado
- Botón 📱 para enviar recordatorio rápido por WhatsApp al cliente
- Color naranja: **Advertencia**

### 2. 🔧 Órdenes SAT Pendientes (+5 días)
- Muestra SAT en estado "pendiente" que hace más de 5 días no se actualizan
- Botón 📱 para contactar al cliente sobre el estado de la orden
- Color rojo: **Urgente**

### 3. ⚙️ Mantenimientos Pendientes (+60 días)
- Muestra equipos cuya última ficha de mantenimiento tiene más de 60 días
- Botón 📱 para ofrecer revisión de mantenimiento
- Color ámbar: **Precaución**

---

## 🤖 Automatizaciones Configuradas

### Recordatorios de Citas (Diario a las 20:00)
**Función:** `appointmentReminder`  
**Frecuencia:** Todos los días a las 20:00 (Madrid time)  
**Acción:** Busca todas las citas programadas para mañana y:
- Envía WhatsApp automático al cliente recordando la cita
- Registra la nota en la ficha del cliente
- Incluye hora, ubicación y tipo de servicio

**Ejemplo de mensaje:**
```
¡Recordatorio de cita! 📅

Tenemos una cita programada para mañana jueves 27 de marzo a las 10:00h.

📌 Servicio: Revisión de aire acondicionado
📍 Ubicación: Calle ejemplo 123

Si necesita cambiar la fecha, contáctenos.

Gracias
```

---

## 🎯 Cómo Usar

### Actualizar Tareas Pendientes
1. El panel se actualiza automáticamente cada 5 minutos
2. Haz clic en el icono 🔄 para actualizar manualmente

### Enviar Recordatorios Manuales
1. Localiza el panel de "Tareas Pendientes" en Home
2. Haz clic en el botón 📱 junto al item que deseas recordar
3. Se abrirá WhatsApp con el mensaje preformateado

### Probar Automatización de Citas
1. Haz clic en el botón 📱 en la esquina del panel
2. Se enviarán recordatorios de citas de mañana inmediatamente
3. Recibirás una confirmación cuando se haya procesado

---

## ⚙️ Cómo Personalizar

### Cambiar Hora de Recordatorios (20:00)
1. Ve a **Recordatorios** en el menú lateral
2. Busca "Recordatorios de citas (Diario a las 20:00)"
3. Edita el horario (ej: cambiar a 19:00 si prefieres antes)

### Cambiar Umbrales de Días
Para modificar cuándo aparecen los avisos:

**Archivo:** `components/PendingTasksPanel.jsx`

```javascript
// Línea ~28 - Presupuestos sin respuesta
return days > 7; // Cambiar 7 a otro número

// Línea ~36 - SAT pendientes
return days > 5; // Cambiar 5 a otro número

// Línea ~46 - Mantenimientos
.filter(m => m.date && differenceInDays(today, parseISO(m.date)) > 60)
// Cambiar 60 a otro número
```

### Agregar Nuevas Automatizaciones
La función backend `appointmentReminder` puede extenderse para:
- Enviar recordatorios al técnico (no solo al cliente)
- Incluir fotos del equipo
- Generar reportes automáticos
- Integrar con calendario de Google

---

## 📊 Datos Registrados

Cada recordatorio enviado se registra en:
- **ClientNote:** Guarda registro de que se envió el recordatorio
- **timestamp:** Fecha y hora exacta del envío
- **contact_name:** Cliente al que se notificó

---

## 🚀 Próximas Mejoras

- [ ] Envío automático de recordatorios al técnico
- [ ] Estadísticas de respuesta de clientes
- [ ] Notificaciones en-app además de WhatsApp
- [ ] Personalización de mensajes por tipo de servicio
- [ ] SMS como alternativa a WhatsApp
- [ ] Retrasos automáticos si no se responde en 3 días

---

## ❓ FAQ

**P: ¿Qué pasa si el cliente no tiene teléfono?**  
R: El recordatorio no se enviará. Asegúrate de tener teléfonos en las fichas de cliente.

**P: ¿Se puede cambiar el contenido del recordatorio?**  
R: Sí, editando la función `appointmentReminder.js` en la carpeta de funciones.

**P: ¿Los recordatorios se envían en fines de semana?**  
R: Sí, la automatización se ejecuta todos los días. Puedes desactivarla manualmente si prefieres.

**P: ¿Cuántas citas puede procesar a la vez?**  
R: Sin límite, procesa todas las citas del día siguiente automáticamente.