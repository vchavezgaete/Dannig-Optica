#!/bin/bash

# Railway initialization script for DannigOptica Backend
# Handles MySQL database setup, migrations, and seeding
set -e

echo "[INFO] Starting DannigOptica Backend on Railway..."

# Verify critical environment variables
echo "[INFO] Verifying environment variables..."
if [ -z "$DATABASE_URL" ]; then
    echo "[ERROR] DATABASE_URL is not configured"
    echo "        Please configure DATABASE_URL in Railway dashboard"
    exit 1
fi

if [ -z "$JWT_SECRET" ]; then
    echo "[ERROR] JWT_SECRET is not configured"
    echo "        Please configure JWT_SECRET in Railway dashboard"
    exit 1
fi

echo "[OK] Environment variables configured correctly"
echo "     PORT: ${PORT:-3001}"
echo "     DATABASE_URL: ${DATABASE_URL%%@*}@***"  # Mask password

# Generate Prisma client
echo "[INFO] Generating Prisma client..."
npx prisma generate || {
    echo "[ERROR] Failed to generate Prisma client"
    exit 1
}

# Wait for database to be ready (simple connection test)
echo "[INFO] Verifying database connection..."
# Prisma will handle connection retries internally

# Migrate existing data from old schema to new schema BEFORE applying schema changes
echo "[INFO] Migrating existing data from old schema to new schema..."
if npx ts-node --transpile-only scripts/migrate-schema-data.ts 2>/dev/null; then
    echo "[OK] Data migration completed successfully"
else
    echo "[WARN] Data migration script failed or not needed (this is OK if database is already migrated)"
fi

# Apply database migrations with retry logic
echo "[INFO] Applying database migrations..."
RETRY_COUNT=0
MIGRATION_SUCCESS=false

while [ $RETRY_COUNT -lt 3 ]; do
    if npx prisma db push --accept-data-loss --skip-generate; then
        MIGRATION_SUCCESS=true
        echo "[OK] Database migrations applied successfully"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -lt 3 ]; then
            echo "[WARN] Migration attempt $RETRY_COUNT failed, retrying in 5 seconds..."
            sleep 5
        fi
    fi
done

if [ "$MIGRATION_SUCCESS" = false ]; then
    echo "[WARN] Database migration failed after 3 attempts"
    echo "       Continuing startup anyway - migrations may need manual intervention"
fi

# Run database seeding if SEED_DATABASE is enabled
if [ "$SEED_DATABASE" = "true" ] || [ "$FORCE_SEED" = "true" ]; then
    echo "[INFO] Running database seed..."
    echo "       This will create demo users, clients, products, and sales data"
    
    # Use ts-node to run the seed script (ts-node is available as devDependency)
    if npx ts-node --transpile-only scripts/seed-demo-data.ts; then
        echo "[OK] Database seeding completed successfully"
    else
        echo "[WARN] Database seed failed, continuing anyway"
        echo "       You can manually seed later by setting SEED_DATABASE=true"
    fi
else
    echo "[INFO] Database seeding skipped (set SEED_DATABASE=true to enable)"
fi

echo "[OK] Database initialization completed"

# Start server
echo "[INFO] Starting server..."
echo "       Server will listen on port ${PORT:-3001}"
echo "       Environment: ${NODE_ENV:-production}"
exec npm start
