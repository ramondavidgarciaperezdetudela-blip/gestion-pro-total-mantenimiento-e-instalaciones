@echo off
setlocal enableextensions
title Crear acceso directo - Gestion Pro Total
REM ============================================================
REM   Crea un icono en el Escritorio para subir nuevas versiones.
REM   Solo tienes que hacer DOBLE CLIC en este archivo (una vez).
REM ============================================================

set "AQUI=%~dp0"
set "HTML=%AQUI%Subir-Nueva-Version.html"
set "ICONO=%AQUI%Gestion-Pro-Total.ico"
set "VBS=%TEMP%\_gpt_crear_acceso.vbs"

echo.
echo   Creando el acceso directo en tu Escritorio...
echo.

REM --- Comprobar que el programa esta en esta carpeta ---
if not exist "%HTML%" (
  echo   [ERROR] No se encuentra "Subir-Nueva-Version.html" en esta carpeta.
  echo   Manten todos los archivos juntos en la misma carpeta y vuelve a intentarlo.
  echo.
  pause
  exit /b 1
)

REM --- Generar un pequeno script VBS que crea el acceso directo ---
if exist "%VBS%" del "%VBS%"
>>"%VBS%" echo Set ws = CreateObject("WScript.Shell")
>>"%VBS%" echo strDesktop = ws.SpecialFolders("Desktop")
>>"%VBS%" echo Set lnk = ws.CreateShortcut(strDesktop ^& "\Subir version Gestion Pro.lnk")
>>"%VBS%" echo lnk.TargetPath = "%HTML%"
>>"%VBS%" echo lnk.WorkingDirectory = "%AQUI%"
if exist "%ICONO%" >>"%VBS%" echo lnk.IconLocation = "%ICONO%, 0"
>>"%VBS%" echo lnk.Description = "Subir nueva version de Gestion Pro Total"
>>"%VBS%" echo lnk.Save

REM --- Ejecutar el script ---
cscript //nologo "%VBS%"
set "RES=%errorlevel%"
del "%VBS%" >nul 2>&1

echo.
if "%RES%"=="0" (
  echo   [OK] Listo. Busca en tu Escritorio el icono:
  echo        "Subir version Gestion Pro"
) else (
  echo   [ERROR] No se pudo crear el acceso directo automaticamente.
  echo   Puedes abrir igualmente "Subir-Nueva-Version.html" con doble clic.
)

echo.
echo   Pulsa una tecla para cerrar esta ventana.
pause >nul
