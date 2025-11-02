# Script de construcción robusta de Docker para Dannig Óptica Backend (Windows PowerShell)
param(
    [switch]$NoCache,
    [string]$Tag = "dannig-optica-backend",
    [string]$Dockerfile = "Dockerfile"
)

Write-Host "🔍 Verificando archivos necesarios para construcción de Docker..." -ForegroundColor Cyan

# Verificar que estamos en el directorio correcto
if (-not (Test-Path $Dockerfile)) {
    Write-Host "❌ ERROR: $Dockerfile no encontrado. Ejecutar desde el directorio backend/" -ForegroundColor Red
    exit 1
}

# Verificar archivos críticos
$requiredFiles = @(
    "package.json",
    "tsconfig.json", 
    "src/server.ts",
    "prisma/schema.prisma",
    "scripts/init.sh",
    "scripts/start-production.sh",
    "scripts/validate-env.sh"
)

foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        Write-Host "❌ ERROR: Archivo requerido no encontrado: $file" -ForegroundColor Red
        exit 1
    } else {
        Write-Host "✅ $file" -ForegroundColor Green
    }
}

Write-Host ""

# Limpiar caché de Docker si se solicita
if ($NoCache) {
    Write-Host "🧹 Limpiando caché de Docker..." -ForegroundColor Yellow
    docker builder prune -f
}

# Construir la imagen
Write-Host "🔨 Construyendo imagen Docker con verificación completa..." -ForegroundColor Cyan
$buildArgs = @("build", "--progress=plain", "-t", $Tag)
if ($NoCache) {
    $buildArgs += "--no-cache"
}
$buildArgs += "-f"
$buildArgs += $Dockerfile
$buildArgs += "."

& docker @buildArgs

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Construcción completada exitosamente" -ForegroundColor Green
    Write-Host "📋 Para ejecutar el contenedor:" -ForegroundColor Cyan
    Write-Host "   docker run -p 3001:3001 --env-file .env $Tag" -ForegroundColor White
} else {
    Write-Host "❌ Error en la construcción de Docker" -ForegroundColor Red
    Write-Host "Intenta usar: .\build-robust.ps1 -Dockerfile Dockerfile.definitive -NoCache" -ForegroundColor Yellow
    exit 1
}
