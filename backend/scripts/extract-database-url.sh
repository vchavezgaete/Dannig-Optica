#!/bin/bash

# Script mejorado para extraer DATABASE_URL limpia de Railway
# Railway concatena todas las variables en una sola línea

echo "[INFO] Extracting clean DATABASE_URL..."

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
    echo "[ERROR] Could not extract valid DATABASE_URL"
    echo "[INFO] Input received: $DATABASE_URL"
    exit 1
fi

echo "[INFO] Extracted DATABASE_URL: $CLEAN_URL"

# Validate format
if [[ "$CLEAN_URL" =~ ^mysql://[^:]+:[^@]+@[^:]+:[0-9]+/[^[:space:]]+$ ]]; then
    echo "[OK] DATABASE_URL has valid format"
    export DATABASE_URL="$CLEAN_URL"
elif [[ "$CLEAN_URL" =~ ^mysql:// ]]; then
    echo "[WARN] DATABASE_URL has mysql:// protocol but format may be invalid"
    export DATABASE_URL="$CLEAN_URL"
else
    echo "[ERROR] DATABASE_URL does not have valid format"
    echo "[INFO] Expected format: mysql://user:password@host:port/database"
    echo "[INFO] Received format: $CLEAN_URL"
    exit 1
fi

echo "[OK] DATABASE_URL configured correctly: $DATABASE_URL"
