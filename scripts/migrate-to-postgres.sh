#!/bin/bash
# Script para migrar de MySQL a PostgreSQL

set -e

echo "🔄 Migrando schema de Prisma de MySQL a PostgreSQL..."

SCHEMA_FILE="backend/prisma/schema.prisma"

if [ ! -f "$SCHEMA_FILE" ]; then
    echo "❌ Error: No se encontró $SCHEMA_FILE"
    exit 1
fi

# Backup del schema original
cp "$SCHEMA_FILE" "${SCHEMA_FILE}.mysql.backup"
echo "✅ Backup creado: ${SCHEMA_FILE}.mysql.backup"

# Cambiar provider
sed -i.bak 's/provider = "mysql"/provider = "postgresql"/' "$SCHEMA_FILE"
echo "✅ Provider cambiado a PostgreSQL"

# Cambiar tipos de datos
sed -i.bak 's/@db\.DateTime(0)/@db.Timestamp(0)/g' "$SCHEMA_FILE"
echo "✅ DateTime(0) → Timestamp(0)"

sed -i.bak 's/@db\.TinyInt/@db.SmallInt/g' "$SCHEMA_FILE"
echo "✅ TinyInt → SmallInt"

# Limpiar archivos .bak
rm -f "${SCHEMA_FILE}.bak"

echo ""
echo "✅ Migración completada!"
echo ""
echo "Próximos pasos:"
echo "1. Configurar DATABASE_URL en .env con PostgreSQL"
echo "2. cd backend"
echo "3. npx prisma generate"
echo "4. npx prisma db push"
echo ""
echo "Para revertir: cp ${SCHEMA_FILE}.mysql.backup $SCHEMA_FILE"

