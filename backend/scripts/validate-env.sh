#!/bin/bash

# Script de validación de variables de entorno para deployment
set -e

echo "[INFO] Validating environment variables..."

# Verify DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "[ERROR] DATABASE_URL is not configured"
    echo "[INFO] Available environment variables:"
    env | grep -E "(DATABASE|NODE_ENV|PORT|JWT)" || echo "No relevant variables found"
    exit 1
else
    echo "[OK] DATABASE_URL configured: ${DATABASE_URL:0:20}..."
fi

# Verify NODE_ENV
if [ -z "$NODE_ENV" ]; then
    echo "[WARN] NODE_ENV is not configured, using 'development'"
    export NODE_ENV=development
else
    echo "[OK] NODE_ENV: $NODE_ENV"
fi

# Verify PORT
if [ -z "$PORT" ]; then
    echo "[WARN] PORT is not configured, using 3001"
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
