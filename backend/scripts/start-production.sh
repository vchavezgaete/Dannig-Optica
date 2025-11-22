#!/bin/bash

# Script de inicialización robusto para DannigOptica Backend
# Maneja automáticamente MySQL (desarrollo) y PostgreSQL (producción)

set -e  # Salir si cualquier comando falla

echo "[INFO] Starting DannigOptica Backend..."
echo "[INFO] Verifying database configuration..."

# Detect database type
if [[ "$DATABASE_URL" == *"postgresql"* ]]; then
    echo "[INFO] PostgreSQL detected"
    
    # Generate Prisma client for PostgreSQL
    echo "[INFO] Generating Prisma client for PostgreSQL..."
    npx prisma generate --schema=./prisma/schema.prisma
    
    # Apply migrations with retries
    echo "[INFO] Applying migrations to PostgreSQL..."
    for i in {1..3}; do
        echo "Migration attempt $i..."
        if npx prisma db push --accept-data-loss --schema=./prisma/schema.prisma; then
            echo "[OK] PostgreSQL migration completed successfully"
            break
        else
            echo "[ERROR] Attempt $i failed, retrying..."
            sleep 5
        fi
    done
    
else
    echo "[INFO] MySQL detected"
    
    # Verify if mysql host exists
    if nslookup mysql >/dev/null 2>&1; then
        echo "[OK] Host 'mysql' found, waiting for connection..."
        until nc -z mysql 3306; do
            echo "[INFO] Waiting for MySQL..."
            sleep 2
        done
        echo "[OK] MySQL available"
    else
        echo "[WARN] Host 'mysql' not found, skipping connection verification"
    fi
    
    # Generate Prisma client for MySQL
    echo "[INFO] Generating Prisma client for MySQL..."
    npx prisma generate --schema=./prisma/schema.prisma
    
    # Sync schema
    echo "[INFO] Syncing MySQL schema..."
    npx prisma db push --accept-data-loss --schema=./prisma/schema.prisma
    echo "[OK] MySQL schema synced successfully"
fi

echo "[INFO] Starting Node.js server..."
node dist/server.js
