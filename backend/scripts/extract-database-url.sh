#!/bin/bash

# Script mejorado para extraer DATABASE_URL limpia de Railway
# Railway concatena todas las variables en una sola línea

echo "🔧 Extrayendo DATABASE_URL limpia..."

# Función para extraer DATABASE_URL usando regex
extract_database_url() {
    local input="$1"
    
    # Usar regex para extraer solo la parte de DATABASE_URL
    # Buscar desde DATABASE_URL= hasta el primer espacio
    if [[ $input =~ DATABASE_URL=([^[:space:]]+) ]]; then
        echo "${BASH_REMATCH[1]}"
    else
        echo ""
    fi
}

# Extraer DATABASE_URL limpia
CLEAN_URL=$(extract_database_url "$DATABASE_URL")

if [ -z "$CLEAN_URL" ]; then
    echo "❌ ERROR: No se pudo extraer DATABASE_URL válida"
    echo "📋 Input recibido: $DATABASE_URL"
    exit 1
fi

echo "📋 DATABASE_URL extraída: $CLEAN_URL"

# Validar formato
if [[ "$CLEAN_URL" =~ ^mysql://[^:]+:[^@]+@[^:]+:[0-9]+/[^[:space:]]+$ ]]; then
    echo "✅ DATABASE_URL tiene formato válido"
    export DATABASE_URL="$CLEAN_URL"
elif [[ "$CLEAN_URL" =~ ^mysql:// ]]; then
    echo "⚠️ DATABASE_URL tiene protocolo mysql:// pero formato puede ser inválido"
    export DATABASE_URL="$CLEAN_URL"
else
    echo "❌ ERROR: DATABASE_URL no tiene formato válido"
    echo "📋 Formato esperado: mysql://usuario:password@host:port/database"
    echo "📋 Formato recibido: $CLEAN_URL"
    exit 1
fi

echo "✅ DATABASE_URL configurada correctamente: $DATABASE_URL"
