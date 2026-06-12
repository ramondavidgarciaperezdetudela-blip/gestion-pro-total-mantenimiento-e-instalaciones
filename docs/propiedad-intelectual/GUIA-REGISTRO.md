# Guía para registrar el programa en la Propiedad Intelectual (España)

Esta guía resume **qué es**, **qué documentos hacen falta** y **cómo presentar** la
solicitud de inscripción de un programa de ordenador en el Registro de la Propiedad
Intelectual. No sustituye al asesoramiento jurídico ni a la información oficial del
Registro competente.

> ⚖️ Importante: en España la propiedad intelectual del software **nace con la
> creación de la obra**, sin necesidad de registro. El registro **no constituye**
> el derecho, pero es un **medio de prueba cualificado** (presunción de
> titularidad) muy útil ante conflictos. Es voluntario y de bajo coste.

---

## 1. Marco legal

- **Real Decreto Legislativo 1/1996** (Texto Refundido de la Ley de Propiedad
  Intelectual), en especial el **Título VII "Programas de ordenador"** (arts. 95 a
  104).
- **Real Decreto 281/2003**, Reglamento del Registro General de la Propiedad
  Intelectual.

## 2. ¿Qué se registra y qué protege?

- Se protege la **expresión** del programa (código fuente y objeto, documentación
  preparatoria), **no las ideas ni los métodos** subyacentes.
- La protección dura, con carácter general, **toda la vida del autor + 70 años**.

## 3. Documentos a presentar

1. **Solicitud oficial** (modelo del Registro de tu Comunidad Autónoma). Se obtiene
   en la sede electrónica del Registro Territorial competente.
2. **Memoria / descripción** del programa → usar
   [`MEMORIA-DESCRIPTIVA.md`](./MEMORIA-DESCRIPTIVA.md) (convertir a PDF).
3. **Identificación del solicitante**: DNI/NIE del autor/titular (y poder de
   representación o escritura, si se actúa por una sociedad).
4. **Ejemplar del código fuente** (el "depósito"). Habitualmente se admite:
   - Listado del código fuente en **PDF**, o
   - Archivo **ZIP** con el código, en soporte digital.
   Algunos registros piden las **primeras y últimas páginas** del listado y/o la
   obra completa; consúltalo en tu registro territorial.
5. **Declaración de autoría/titularidad** → usar
   [`DECLARACION-AUTORIA-Y-TITULARIDAD.md`](./DECLARACION-AUTORIA-Y-TITULARIDAD.md).
6. **Justificante de pago de la tasa** correspondiente.
7. (Opcional) **Inventario de ficheros** y **huella SHA-256** del depósito →
   [`INVENTARIO-CODIGO-FUENTE.md`](./INVENTARIO-CODIGO-FUENTE.md).

## 4. Cómo preparar el depósito de código fuente

Desde la raíz del repositorio:

```bash
# 1) Generar un PDF del listado de código (requiere 'enscript' y 'ps2pdf', o usa
#    cualquier herramienta de impresión a PDF sobre los ficheros fuente).
#    Alternativa simple: empaquetar el código en ZIP.
git archive --format=zip -o codigo-fuente.zip HEAD

# 2) Calcular la huella de integridad del depósito
sha256sum codigo-fuente.zip > codigo-fuente.sha256.txt
```

Anota la huella resultante en la declaración de autoría (anexo).

## 5. Dónde y cómo presentar

- El Registro de la Propiedad Intelectual es de **gestión autonómica**. Debes
  acudir al **Registro Territorial de tu Comunidad Autónoma** (o al Registro
  Central, según el caso).
- La mayoría dispone de **sede electrónica** para presentación telemática con
  certificado digital o Cl@ve, y también presencial con cita previa.
- Pasos típicos:
  1. Rellenar el modelo de solicitud (datos del titular + descripción de la obra).
  2. Adjuntar memoria, depósito de código, declaración e identificación.
  3. Abonar la tasa (autoliquidación) y adjuntar el justificante.
  4. Presentar y conservar el **resguardo**; más adelante se notifica el **número
     de inscripción** y la resolución.

## 6. Tasas (orientativo)

La tasa por inscripción de una obra es **reducida** (habitualmente en el entorno de
**unos 13–15 €**, variable por Comunidad Autónoma y año). Consulta el importe
exacto y el modelo de autoliquidación en tu registro territorial.

## 7. Lista de comprobación previa a presentar

- [ ] Memoria descriptiva en PDF, con datos definitivos cumplimentados.
- [ ] Declaración de autoría firmada (NIF, lugar y fecha).
- [ ] Código fuente empaquetado (PDF o ZIP) + huella SHA-256.
- [ ] Copia del DNI/NIE (y poder/escritura si es sociedad).
- [ ] Modelo de solicitud oficial cumplimentado.
- [ ] Tasa abonada y justificante adjunto.

---

## Otras vías complementarias de prueba (no sustituyen al Registro)

- **Sellado de tiempo** (timestamping) del ZIP de código por una autoridad de
  confianza.
- **Depósito notarial** del código y su huella.
- El **historial de Git** firmado (commits firmados con GPG) como prueba adicional
  de autoría y fechas.

> Esta guía es informativa y puede variar según la Comunidad Autónoma y la
> normativa vigente en el momento de la presentación. Verifica siempre los
> requisitos y tasas en la sede oficial de tu Registro Territorial.
