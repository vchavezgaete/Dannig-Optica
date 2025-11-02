#!/bin/bash

# Script de validación de variables de entorno para deployment
set -e

echo "🔍 Validando variables de entorno..."

# Verificar DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL no está configurada"
    echo "📋 Variables de entorno disponibles:"
    env | grep -E "(DATABASE|NODE_ENV|PORT|JWT)" || echo "No se encontraron variables relevantes"
    exit 1
else
    echo "✅ DATABASE_URL configurada: ${DATABASE_URL:0:20}..."
fi

# Verificar NODE_ENV
if [ -z "$NODE_ENV" ]; then
    echo "⚠️ WARNING: NODE_ENV no está configurada, usando 'development'"
    export NODE_ENV=development
else
    echo "✅ NODE_ENV: $NODE_ENV"
fi

# Verificar PORT
if [ -z "$PORT" ]; then
    echo "⚠️ WARNING: PORT no está configurada, usando 3001"
    export PORT=3001
else
    echo "✅ PORT: $PORT"
fi

# Verificar JWT_SECRET
if [ -z "$JWT_SECRET" ]; then
    echo "❌ ERROR: JWT_SECRET no está configurada"
    exit 1
else
    echo "✅ JWT_SECRET configurada"
fi

echo "🎯 Todas las variables de entorno están configuradas correctamente"
