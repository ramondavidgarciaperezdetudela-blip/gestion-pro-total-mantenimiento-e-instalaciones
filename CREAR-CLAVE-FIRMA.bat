@echo off
chcp 65001 >nul 2>&1
title Generar clave de firma (keystore) - Gestion Pro Total
setlocal enabledelayedexpansion

echo.
echo  ============================================================
echo    GENERAR TU CLAVE DE FIRMA (keystore)  -  Gestion Pro Total
echo  ============================================================
echo.
echo  Esto crea TU clave privada de firma (release.keystore).
echo  - La clave privada se queda SOLO en este ordenador.
echo  - Es PERMANENTE: usa SIEMPRE este mismo fichero para actualizar la app.
echo  - Si la pierdes, NO podras volver a actualizar la app. Haz copia.
echo.

:: Comprobar Java (keytool)
where keytool >nul 2>&1
if errorlevel 1 (
  echo  ERROR: No se encontro "keytool" ^(falta Java^).
  echo  Instala Java JDK 17: https://adoptium.net  y vuelve a ejecutar.
  echo.
  pause
  exit /b 1
)

:: Carpeta segura para la clave (fuera del proyecto): Documentos\ClavesGestionProTotal
set DESTDIR=%USERPROFILE%\Documents\ClavesGestionProTotal
if not exist "%DESTDIR%" mkdir "%DESTDIR%"
set KSFILE=%DESTDIR%\release.keystore

if exist "%KSFILE%" (
  echo  AVISO: Ya existe una clave en:
  echo    %KSFILE%
  echo  Si creas otra, NO podras actualizar apps firmadas con la anterior.
  set /p OVER=  Quieres continuar de todas formas? (S/N):
  if /i not "!OVER!"=="S" (echo  Cancelado. & pause & exit /b 0)
)

set ALIAS=gestionpro
echo.
echo  Alias de la clave: %ALIAS%
echo.
echo  A continuacion keytool te pedira:
echo    1) Una contrasena para el almacen  ^(APUNTALA: KEYSTORE_PASSWORD^)
echo    2) Tus datos ^(nombre, organizacion, ciudad, pais ES...^)
echo    3) Confirmar / contrasena de la clave ^(puede ser la misma: KEY_PASSWORD^)
echo.
pause

keytool -genkey -v -keystore "%KSFILE%" -alias %ALIAS% -keyalg RSA -keysize 2048 -validity 10000
if errorlevel 1 (
  echo.
  echo  ERROR al generar la clave. Revisa los mensajes de arriba.
  pause
  exit /b 1
)

echo.
echo  ============================================================
echo    CLAVE CREADA CORRECTAMENTE
echo  ============================================================
echo.
echo  Fichero (clave privada):  %KSFILE%
echo  Alias:                    %ALIAS%
echo.
echo  GUARDA EN UN GESTOR DE CONTRASENAS:
echo    - KEYSTORE_PASSWORD = la contrasena del almacen que escribiste
echo    - KEY_ALIAS         = %ALIAS%
echo    - KEY_PASSWORD      = la contrasena de la clave
echo.
echo  HAZ UNA COPIA DE SEGURIDAD de "release.keystore" en otro sitio
echo  (USB / disco externo). Si lo pierdes, no podras actualizar la app.
echo.
echo  Ver tu certificado/clave PUBLICA cuando quieras:
echo    keytool -list -v -keystore "%KSFILE%" -alias %ALIAS%
echo.
echo  NO copies este fichero dentro del proyecto ni a GitHub.
echo  Para firmar: ver COMO-RECOMPILAR-APK-SEGURO.txt y FIRMA-AUTOMATICA-RELEASE.txt
echo.
:: Abrir la carpeta de la clave
explorer "%DESTDIR%"
pause
endlocal
