#!/bin/bash

# Railway initialization script
set -e

echo "Starting DannigOptica Backend on Railway..."

# Verify critical environment variables
echo "Verifying environment variables..."
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL is not configured"
    exit 1
fi

if [ -z "$JWT_SECRET" ]; then
    echo "ERROR: JWT_SECRET is not configured"
    exit 1
fi

echo "Environment variables configured correctly"
echo "PORT: ${PORT:-3001}"

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate || {
    echo "ERROR: Failed to generate Prisma client"
    exit 1
}

# Apply database migrations (skip if fails to avoid blocking startup)
echo "Applying database migrations..."
npx prisma db push --accept-data-loss || {
    echo "WARNING: Database migration failed, continuing anyway"
}

echo "Database initialization completed"

# Start server
echo "Starting server..."
echo "Server will listen on port ${PORT:-3001}"
exec npm start
