#!/bin/bash

# Script de inicialización robusto para DannigOptica Backend
# Maneja automáticamente MySQL (desarrollo) y PostgreSQL (producción)

set -e  # Salir si cualquier comando falla

echo "🚀 Iniciando DannigOptica Backend..."
echo "📊 Verificando configuración de base de datos..."

# Detectar tipo de base de datos
if [[ "$DATABASE_URL" == *"postgresql"* ]]; then
    echo "🐘 PostgreSQL detectado"
    
    # Generar cliente Prisma para PostgreSQL
    echo "⚙️ Generando cliente Prisma para PostgreSQL..."
    npx prisma generate --schema=./prisma/schema.prisma
    
    # Aplicar migraciones con reintentos
    echo "🔄 Aplicando migraciones a PostgreSQL..."
    for i in {1..3}; do
        echo "Intento $i de migración..."
        if npx prisma db push --accept-data-loss --schema=./prisma/schema.prisma; then
            echo "✅ Migración PostgreSQL completada exitosamente"
            break
        else
            echo "❌ Intento $i falló, reintentando..."
            sleep 5
        fi
    done
    
else
    echo "🐬 MySQL detectado"
    
    # Verificar si el host mysql existe
    if nslookup mysql >/dev/null 2>&1; then
        echo "✅ Host 'mysql' encontrado, esperando conexión..."
        until nc -z mysql 3306; do
            echo "⏳ Esperando MySQL..."
            sleep 2
        done
        echo "✅ MySQL disponible"
    else
        echo "⚠️ Host 'mysql' no encontrado, saltando verificación de conexión"
    fi
    
    # Generar cliente Prisma para MySQL
    echo "⚙️ Generando cliente Prisma para MySQL..."
    npx prisma generate --schema=./prisma/schema.prisma
    
    # Sincronizar schema
    echo "🔄 Sincronizando schema MySQL..."
    npx prisma db push --accept-data-loss --schema=./prisma/schema.prisma
    echo "✅ Schema MySQL sincronizado exitosamente"
fi

echo "🎯 Iniciando servidor Node.js..."
node dist/server.js
