#!/bin/bash

# Script para corregir DATABASE_URL en Railway
# Railway a veces proporciona URLs sin el protocolo correcto

echo "[INFO] Verifying and correcting DATABASE_URL..."

# Verify if DATABASE_URL is configured
if [ -z "$DATABASE_URL" ]; then
    echo "[ERROR] DATABASE_URL is not configured"
    exit 1
fi

echo "[INFO] Original DATABASE_URL: $DATABASE_URL"

# Detect if URL needs correction
if [[ "$DATABASE_URL" == mysql://* ]]; then
    echo "[OK] DATABASE_URL already has correct protocol"
elif [[ "$DATABASE_URL" == *"mysql"* ]]; then
    echo "[INFO] Correcting DATABASE_URL..."
    # Add mysql:// protocol if missing
    export DATABASE_URL="mysql://$DATABASE_URL"
    echo "[OK] DATABASE_URL corrected: $DATABASE_URL"
elif [[ "$DATABASE_URL" == *"postgresql"* ]] || [[ "$DATABASE_URL" == *"postgres"* ]]; then
    echo "[WARN] DATABASE_URL appears to be PostgreSQL, but schema is configured for MySQL"
    echo "[INFO] Converting to MySQL..."
    # Railway may be providing PostgreSQL by default
    # We need to use MySQL specifically
    echo "[ERROR] MySQL required, but PostgreSQL detected"
    echo "[INFO] Solution: In Railway Dashboard, create a MySQL database specifically"
    exit 1
else
    echo "[ERROR] DATABASE_URL does not have a recognized format"
    echo "[INFO] Expected format: mysql://user:password@host:port/database"
    echo "[INFO] Received format: $DATABASE_URL"
    exit 1
fi

echo "[OK] DATABASE_URL validated correctly"
