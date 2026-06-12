@echo off
title Gestion Pro Total
echo Iniciando Gestion Pro Total...
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0servidor-gpt.ps1"
pause
