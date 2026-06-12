# Servidor local para Gestion Pro Total (Windows) - sirve ./dist en http://localhost:8080
$ErrorActionPreference = "Stop"
$root = Join-Path $PSScriptRoot "dist"
$port = 8080
if (-not (Test-Path $root)) { Write-Host "No se encuentra la carpeta dist." -ForegroundColor Red; pause; exit 1 }
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
try { $listener.Start() } catch { Write-Host "El puerto $port esta ocupado." -ForegroundColor Red; pause; exit 1 }
Write-Host "Gestion Pro Total funcionando en http://localhost:$port" -ForegroundColor Green
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
