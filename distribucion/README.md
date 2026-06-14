# Distribución de Gestión Pro Total — paquetes por sistema operativo

Esta carpeta organiza, **por sistema operativo**, lo que se entrega al cliente.

> IMPORTANTE: los instaladores (115–160 MB) **no se guardan dentro del repositorio**
> (GitHub no admite ficheros de más de 100 MB). Se publican en **Releases**:
> https://github.com/ramondavidgarciaperezdetudela-blip/gestion-pro-total-mantenimiento-e-instalaciones/releases/tag/v1.0.0
> Aquí solo están las instrucciones, la recomendación de cada sistema y los scripts de descarga.

## Qué enviar a cada cliente (fichero recomendado)

| Sistema | Fichero recomendado | Para qué |
|---------|---------------------|----------|
| 🪟 Windows | **...-1.0.0-Windows-Portable.exe** | Un solo .exe: doble clic y a usar (sin instalar). |
| 🪟 Windows | ...-1.0.0-Windows-Instalador.exe | Alternativa: instalación normal con icono y desinstalador. |
| 🍎 macOS | **...-1.0.0-Mac.dmg** | Abrir y arrastrar a Aplicaciones. |
| 🐧 Linux / Chromebook | **...-1.0.0-Linux.AppImage** | Portable: dar permisos y ejecutar. |
| 🐧 Linux / Chromebook | ...-1.0.0-Linux.deb | Alternativa: instalar con apt/dpkg. |
| 🤖 Android | **gestion-pro-total.apk** | Instalar en el móvil/tablet. |

## Opción A — Descarga automática (recomendada)
Coloca los ficheros en sus carpetas por ti:

1. Instala **GitHub CLI**: https://cli.github.com  y ejecuta una vez `gh auth login`.
2. Ejecuta el script de esta carpeta:
   - Windows: doble clic en **`DESCARGAR-ENTREGAS.bat`**
   - Mac/Linux: `./descargar-entregas.sh`
3. Quedarán rellenas las carpetas `Windows/ macOS/ Linux/ Android/`.

## Opción B — Manual
1. Descarga de la Release los ficheros que necesites (estando logueado, el repo es privado).
2. Colócalos en la carpeta de su sistema.

## Enviar al cliente
Comprime la carpeta del sistema que corresponda y envíasela. Cada carpeta lleva un LEEME con instrucciones para el cliente.
