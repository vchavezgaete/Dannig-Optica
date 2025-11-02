#!/bin/bash

# Script para corregir DATABASE_URL en Railway
# Railway a veces proporciona URLs sin el protocolo correcto

echo "🔧 Verificando y corrigiendo DATABASE_URL..."

# Verificar si DATABASE_URL está configurada
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL no está configurada"
    exit 1
fi

echo "📋 DATABASE_URL original: $DATABASE_URL"

# Detectar si la URL necesita corrección
if [[ "$DATABASE_URL" == mysql://* ]]; then
    echo "✅ DATABASE_URL ya tiene el protocolo correcto"
elif [[ "$DATABASE_URL" == *"mysql"* ]]; then
    echo "🔧 Corrigiendo DATABASE_URL..."
    # Agregar protocolo mysql:// si falta
    export DATABASE_URL="mysql://$DATABASE_URL"
    echo "✅ DATABASE_URL corregida: $DATABASE_URL"
elif [[ "$DATABASE_URL" == *"postgresql"* ]] || [[ "$DATABASE_URL" == *"postgres"* ]]; then
    echo "⚠️ WARNING: DATABASE_URL parece ser PostgreSQL, pero el schema está configurado para MySQL"
    echo "🔧 Convirtiendo a MySQL..."
    # Railway puede estar proporcionando PostgreSQL por defecto
    # Necesitamos usar MySQL específicamente
    echo "❌ ERROR: Se requiere MySQL, pero se detectó PostgreSQL"
    echo "💡 Solución: En Railway Dashboard, crear una base de datos MySQL específicamente"
    exit 1
else
    echo "❌ ERROR: DATABASE_URL no tiene un formato reconocido"
    echo "📋 Formato esperado: mysql://usuario:password@host:port/database"
    echo "📋 Formato recibido: $DATABASE_URL"
    exit 1
fi

echo "✅ DATABASE_URL validada correctamente"
