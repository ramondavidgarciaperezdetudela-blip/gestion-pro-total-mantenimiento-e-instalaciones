# Distribución de Gestión Pro Total — paquetes por sistema operativo

Esta carpeta organiza, **por sistema operativo**, lo que se entrega al cliente.

> IMPORTANTE: los instaladores (115–160 MB) **no se guardan dentro del repositorio**
> (GitHub no admite ficheros de más de 100 MB). Se publican en **Releases**:
> https://github.com/ramondavidgarciaperezdetudela-blip/gestion-pro-total-mantenimiento-e-instalaciones/releases/tag/v1.0.0
> Aquí solo están las instrucciones y la recomendación de cada sistema.

## Qué enviar a cada cliente (fichero recomendado)

| Sistema | Fichero recomendado | Para qué |
|---------|---------------------|----------|
| 🪟 Windows | **...-Windows-Portable.exe** | Un solo .exe: doble clic y a usar (sin instalar). |
| 🪟 Windows | ...-Windows-Instalador.exe | Alternativa: instalación normal con icono y desinstalador. |
| 🍎 macOS | **...-Mac.dmg** | Abrir y arrastrar a Aplicaciones. |
| 🐧 Linux / Chromebook | **...-Linux.AppImage** | Portable: dar permisos y ejecutar. |
| 🐧 Linux / Chromebook | ...-Linux.deb | Alternativa: instalar con apt/dpkg. |
| 🤖 Android | **gestion-pro-total.apk** | Instalar en el móvil/tablet. |

## Cómo preparar el envío
1. Descarga de la Release los ficheros que necesites (estando logueado, el repo es privado).
2. Colócalos en la carpeta de su sistema (Windows / macOS / Linux / Android).
3. Comprime esa carpeta y envíasela al cliente. Cada carpeta lleva un LEEME para él.
