#!/bin/bash

# Script para migrar de MySQL a PostgreSQL en deployment
# Este script se ejecuta automáticamente en producción

echo "🔄 Migrando schema de MySQL a PostgreSQL..."

# Verificar si estamos en producción (PostgreSQL)
if [[ "$DATABASE_URL" == *"postgresql"* ]]; then
    echo "📊 Detectado PostgreSQL en producción"
    
    # Generar cliente Prisma para PostgreSQL
    npx prisma generate
    
    # Aplicar migraciones
    npx prisma db push --accept-data-loss
    
    echo "✅ Migración a PostgreSQL completada"
else
    echo "🐬 Usando MySQL en desarrollo"
    
    # Generar cliente Prisma para MySQL
    npx prisma generate
    
    # Aplicar migraciones
    npx prisma db push --accept-data-loss
    
    echo "✅ Schema MySQL sincronizado"
fi

echo "🚀 Iniciando servidor..."
node dist/server.js
