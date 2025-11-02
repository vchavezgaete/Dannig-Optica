#!/bin/bash

# Script de construcción de Docker para Dannig Óptica Backend
set -e

echo "🐳 Iniciando construcción de Docker para Backend..."

# Verificar que estamos en el directorio correcto
if [ ! -f "Dockerfile" ]; then
    echo "❌ ERROR: Dockerfile no encontrado. Ejecutar desde el directorio backend/"
    exit 1
fi

# Verificar que los scripts existen
if [ ! -f "scripts/validate-env.sh" ]; then
    echo "❌ ERROR: scripts/validate-env.sh no encontrado"
    exit 1
fi

if [ ! -f "scripts/init.sh" ]; then
    echo "❌ ERROR: scripts/init.sh no encontrado"
    exit 1
fi

if [ ! -f "scripts/start-production.sh" ]; then
    echo "❌ ERROR: scripts/start-production.sh no encontrado"
    exit 1
fi

echo "✅ Todos los archivos necesarios encontrados"

# Limpiar caché de Docker para evitar problemas
echo "🧹 Limpiando caché de Docker..."
docker builder prune -f

# Construir la imagen con --no-cache para evitar problemas de caché
echo "🔨 Construyendo imagen Docker..."
docker build --no-cache -t dannig-optica-backend .

echo "✅ Construcción completada exitosamente"
echo "📋 Para ejecutar el contenedor:"
echo "   docker run -p 3001:3001 --env-file .env dannig-optica-backend"
