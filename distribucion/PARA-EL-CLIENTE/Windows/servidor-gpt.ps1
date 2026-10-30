# Servidor local para Gestion Pro Total (Windows) - sirve ./dist
# Intenta servir a TODA la red local (otros equipos); si no puede, solo este PC.
$ErrorActionPreference = "Stop"
$root = Join-Path $PSScriptRoot "dist"
$port = 8080
if (-not (Test-Path $root)) { Write-Host "No se encuentra la carpeta dist." -ForegroundColor Red; pause; exit 1 }

# IP de este equipo en la red local
$ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
       Where-Object { $_.IPAddress -notlike '169.*' -and $_.IPAddress -ne '127.0.0.1' } |
       Select-Object -First 1).IPAddress
if (-not $ip) { $ip = "TU-IP" }

$listener = New-Object System.Net.HttpListener
$lan = $false
# 1) Intento LAN (requiere ejecutar como administrador la primera vez)
try { $listener.Prefixes.Add("http://+:$port/"); $listener.Start(); $lan = $true }
catch {
  # 2) Fallback: solo este PC
  $listener = New-Object System.Net.HttpListener
  $listener.Prefixes.Add("http://localhost:$port/")
  try { $listener.Start() } catch { Write-Host "El puerto $port esta ocupado." -ForegroundColor Red; pause; exit 1 }
}
Write-Host "Gestion Pro Total funcionando:" -ForegroundColor Green
Write-Host "  En este PC:        http://localhost:$port"
if ($lan) {
  Write-Host "  Otros equipos red: http://${ip}:$port" -ForegroundColor Cyan
  Write-Host "  (si no conectan, permite el puerto $port en el Firewall de Windows)"
} else {
  Write-Host "  Para acceder desde OTROS equipos: cierra y ejecuta este menu" -ForegroundColor Yellow
  Write-Host "  con clic derecho -> 'Ejecutar como administrador'." -ForegroundColor Yellow
}
Start-Process "http://localhost:$port"
$mime = @{ ".html"="text/html";".js"="application/javascript";".css"="text/css";".json"="application/json";".png"="image/png";".jpg"="image/jpeg";".svg"="image/svg+xml";".ico"="image/x-icon";".woff2"="font/woff2";".webmanifest"="application/manifest+json" }
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $path = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart("/")
  if ($path -eq "") { $path = "index.html" }
  $file = Join-Path $root $path
  if (-not (Test-Path $file -PathType Leaf)) { $file = Join-Path $root "index.html" } # SPA fallback
  try {
    $bytes = [System.IO.File]::ReadAllBytes($file)
    $ext = [System.IO.Path]::GetExtension($file).ToLower()
    if ($mime.ContainsKey($ext)) { $ctx.Response.ContentType = $mime[$ext] }
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } catch { $ctx.Response.StatusCode = 404 }
  $ctx.Response.Close()
}
