# Script de construcción de Docker para Dannig Óptica Backend (Windows PowerShell)
param(
    [switch]$NoCache,
    [string]$Tag = "dannig-optica-backend"
)

Write-Host "🐳 Iniciando construcción de Docker para Backend..." -ForegroundColor Cyan

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "Dockerfile")) {
    Write-Host "❌ ERROR: Dockerfile no encontrado. Ejecutar desde el directorio backend/" -ForegroundColor Red
    exit 1
}

# Verificar que los scripts existen
$requiredScripts = @("scripts/validate-env.sh", "scripts/init.sh", "scripts/start-production.sh")
foreach ($script in $requiredScripts) {
    if (-not (Test-Path $script)) {
        Write-Host "❌ ERROR: $script no encontrado" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Todos los archivos necesarios encontrados" -ForegroundColor Green

# Limpiar caché de Docker si se solicita
if ($NoCache) {
    Write-Host "🧹 Limpiando caché de Docker..." -ForegroundColor Yellow
    docker builder prune -f
}

# Construir la imagen
Write-Host "🔨 Construyendo imagen Docker..." -ForegroundColor Cyan
$buildArgs = @("build", "-t", $Tag)
if ($NoCache) {
    $buildArgs += "--no-cache"
}
$buildArgs += "."

& docker @buildArgs

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Construcción completada exitosamente" -ForegroundColor Green
    Write-Host "📋 Para ejecutar el contenedor:" -ForegroundColor Cyan
    Write-Host "   docker run -p 3001:3001 --env-file .env $Tag" -ForegroundColor White
} else {
    Write-Host "❌ Error en la construcción de Docker" -ForegroundColor Red
    exit 1
}
