#!/bin/bash

# Script to migrate data from local database to Railway
# This is a wrapper script that sets up environment and runs the TypeScript migration
#
# Usage:
#   ./scripts/migrate-to-railway.sh
#
# Or with explicit database URLs:
#   DATABASE_URL_LOCAL="mysql://user:pass@localhost:3306/dannig" \
#   DATABASE_URL_RAILWAY="mysql://user:pass@host:port/railway" \
#   ./scripts/migrate-to-railway.sh

set -e

echo "[INFO] Database Migration Script - Local to Railway"
echo "=================================================="
echo ""

# Check if DATABASE_URL_LOCAL is set
if [ -z "$DATABASE_URL_LOCAL" ]; then
    # Try to load from .env.local file
    if [ -f ".env.local" ]; then
        echo "[INFO] Loading DATABASE_URL_LOCAL from .env.local..."
        export DATABASE_URL_LOCAL=$(grep "^DATABASE_URL=" .env.local | cut -d '=' -f2- | tr -d '"' | tr -d "'")
    fi
    
    # Fallback to DATABASE_URL if exists
    if [ -z "$DATABASE_URL_LOCAL" ] && [ ! -z "$DATABASE_URL" ]; then
        echo "[INFO] Using DATABASE_URL as local database..."
        export DATABASE_URL_LOCAL="$DATABASE_URL"
    fi
fi

# Check if DATABASE_URL_RAILWAY is set
if [ -z "$DATABASE_URL_RAILWAY" ]; then
    # Try to load from .env.railway file
    if [ -f ".env.railway" ]; then
        echo "[INFO] Loading DATABASE_URL_RAILWAY from .env.railway..."
        export DATABASE_URL_RAILWAY=$(grep "^DATABASE_URL=" .env.railway | cut -d '=' -f2- | tr -d '"' | tr -d "'")
    fi
    
    # Alternative: try RAILWAY_DATABASE_URL
    if [ -z "$DATABASE_URL_RAILWAY" ] && [ ! -z "$RAILWAY_DATABASE_URL" ]; then
        echo "[INFO] Using RAILWAY_DATABASE_URL..."
        export DATABASE_URL_RAILWAY="$RAILWAY_DATABASE_URL"
    fi
fi

# Validate required variables
if [ -z "$DATABASE_URL_LOCAL" ]; then
    echo "[ERROR] DATABASE_URL_LOCAL is not configured"
    echo ""
    echo "Please set DATABASE_URL_LOCAL environment variable or create .env.local file:"
    echo "  DATABASE_URL_LOCAL=\"mysql://user:password@localhost:3306/dannig\""
    echo ""
    echo "Or set DATABASE_URL if it points to your local database"
    exit 1
fi

if [ -z "$DATABASE_URL_RAILWAY" ]; then
    echo "[ERROR] DATABASE_URL_RAILWAY is not configured"
    echo ""
    echo "Please set DATABASE_URL_RAILWAY environment variable or create .env.railway file:"
    echo "  DATABASE_URL_RAILWAY=\"mysql://user:password@host:port/railway\""
    echo ""
    echo "You can get the Railway DATABASE_URL from:"
    echo "  - Railway Dashboard > MySQL Service > Variables > DATABASE_URL"
    echo ""
    exit 1
fi

# Mask passwords in output
LOCAL_MASKED=$(echo "$DATABASE_URL_LOCAL" | sed 's/:[^@]*@/:***@/')
RAILWAY_MASKED=$(echo "$DATABASE_URL_RAILWAY" | sed 's/:[^@]*@/:***@/')

echo "[INFO] Local Database: $LOCAL_MASKED"
echo "[INFO] Railway Database: $RAILWAY_MASKED"
echo ""
echo "[WARN] This will copy all data from local database to Railway"
echo "[WARN] Existing data in Railway may be updated (upsert)"
echo ""
read -p "Continue? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "[INFO] Migration cancelled by user"
    exit 0
fi

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo "[ERROR] package.json not found. Please run this script from the backend directory"
    exit 1
fi

# Check if ts-node is available
if ! command -v npx &> /dev/null; then
    echo "[ERROR] npx is not available. Please install Node.js and npm"
    exit 1
fi

# Run the TypeScript migration script
echo "[INFO] Starting migration..."
echo ""

DATABASE_URL_LOCAL="$DATABASE_URL_LOCAL" \
DATABASE_URL_RAILWAY="$DATABASE_URL_RAILWAY" \
npx ts-node --transpile-only scripts/migrate-to-railway.ts

echo ""
echo "[OK] Migration script completed"









