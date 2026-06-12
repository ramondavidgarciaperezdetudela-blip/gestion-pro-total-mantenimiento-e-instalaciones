# Propiedad Intelectual — Gestión Pro Total

Documentos de apoyo para inscribir el programa en el **Registro de la Propiedad
Intelectual** (España). Complete los campos entre corchetes `[ ]` antes de
presentarlos.

| Documento | Para qué sirve |
|---|---|
| [`GUIA-REGISTRO.md`](./GUIA-REGISTRO.md) | Qué es, qué documentos hacen falta, tasas y cómo/dónde presentar. **Empieza por aquí.** |
| [`MEMORIA-DESCRIPTIVA.md`](./MEMORIA-DESCRIPTIVA.md) | Descripción técnica y funcional del programa (se adjunta a la solicitud). |
| [`DECLARACION-AUTORIA-Y-TITULARIDAD.md`](./DECLARACION-AUTORIA-Y-TITULARIDAD.md) | Declaración firmada de autoría y titularidad de derechos. |
| [`INVENTARIO-CODIGO-FUENTE.md`](./INVENTARIO-CODIGO-FUENTE.md) | Listado de ficheros del código fuente depositado. |

> ⚠️ Estos documentos son material de apoyo y **no constituyen asesoramiento
> jurídico**. Verifica requisitos, modelos oficiales y tasas en la sede del
> Registro Territorial de tu Comunidad Autónoma.

## Preparar el depósito del código fuente

```bash
git archive --format=zip -o codigo-fuente.zip HEAD
sha256sum codigo-fuente.zip > codigo-fuente.sha256.txt
```

Anota la huella SHA-256 resultante en la declaración de autoría.
