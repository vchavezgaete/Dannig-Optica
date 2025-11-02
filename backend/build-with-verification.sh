#!/bin/bash

# Script de verificación y construcción de Docker para Dannig Óptica Backend
set -e

echo "🔍 Verificando archivos necesarios para construcción de Docker..."

# Verificar que estamos en el directorio correcto
if [ ! -f "Dockerfile" ]; then
    echo "❌ ERROR: Dockerfile no encontrado. Ejecutar desde el directorio backend/"
    exit 1
fi

# Verificar archivos críticos
REQUIRED_FILES=(
    "package.json"
    "tsconfig.json"
    "src/server.ts"
    "prisma/schema.prisma"
    "scripts/init.sh"
    "scripts/start-production.sh"
    "scripts/validate-env.sh"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ ERROR: Archivo requerido no encontrado: $file"
        exit 1
    else
        echo "✅ $file"
    fi
done

echo ""
echo "🧹 Limpiando caché de Docker..."
docker builder prune -f

echo ""
echo "🔨 Construyendo imagen Docker con verificación completa..."
docker build --no-cache --progress=plain -t dannig-optica-backend .

echo ""
echo "✅ Construcción completada exitosamente"
echo "📋 Para ejecutar el contenedor:"
echo "   docker run -p 3001:3001 --env-file .env dannig-optica-backend"
