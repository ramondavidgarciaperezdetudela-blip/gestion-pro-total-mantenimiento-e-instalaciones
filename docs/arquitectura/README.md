# 📐 Arquitectura de Gestión Pro Total

Diagramas técnicos de la aplicación, generados con [Archify](https://github.com/tt-a1i/archify)
(skill de diagramas para agentes de IA). Cada diagrama es un **HTML autocontenido**
e interactivo: tema **oscuro/claro**, zoom/pan, búsqueda, vistas guiadas y exportación
a PNG/SVG. Ábrelos con doble clic en cualquier navegador.

## Diagramas

| Archivo | Qué muestra |
|---|---|
| **Arquitectura-Gestion-Pro-Total.html** | Arquitectura del sistema: App (React+Vite) → base44 (BaaS: entidades, funciones Deno, integraciones IA/Core), y empaquetado/distribución (Electron, Capacitor, GitHub Actions, repo de descargas con auto-update). |
| **Workflow-Gestion-Pro-Total.html** | Flujo de compilación y publicación: push → merge a main → GitHub Actions → `vite build` → Electron + Capacitor (APK) → crear release → auto-update en el dispositivo. |
| **Arquitectura-oscuro.png** / **Workflow-oscuro.png** | Vista en tema oscuro (imagen) para documentos o presentaciones. |
| **arquitectura.archify.json** / **workflow.archify.json** | Especificación fuente (Archify) para regenerar o editar los diagramas. |

## Regenerar un diagrama

Con la skill Archify instalada (`npx skills add tt-a1i/archify -g`):

```bash
# validar y entregar el HTML
node ~/.agents/skills/archify/bin/archify.mjs deliver architecture \
  docs/arquitectura/arquitectura.archify.json \
  docs/arquitectura/Arquitectura-Gestion-Pro-Total.html --quality showcase
```

(Para el workflow, usa `deliver workflow` con `workflow.archify.json`.)
