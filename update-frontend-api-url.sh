#!/bin/bash

# Script para actualizar la URL de la API en el frontend después de cambios

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🔄 Actualizando URL de API en Frontend"
echo "======================================"
echo ""

# Load .env if exists
if [ -f .env ]; then
  source .env
fi

HTTPS_PORT=${TRAEFIK_HTTPS_PORT:-8443}
API_URL="https://api.Dannig-Optica.freeddns.org:${HTTPS_PORT}"

echo "📋 Configuración:"
echo "   Puerto HTTPS: $HTTPS_PORT"
echo "   URL API: $API_URL"
echo ""

echo "🔨 Reconstruyendo imagen del frontend..."
docker compose -f docker-compose.traefik.yml build frontend

echo ""
echo "🔄 Reiniciando servicio frontend..."
docker compose -f docker-compose.traefik.yml up -d frontend

echo ""
echo "✅ Frontend actualizado"
echo ""
echo "🧪 Para verificar:"
echo "   1. Abre: https://app.Dannig-Optica.freeddns.org:${HTTPS_PORT}"
echo "   2. Abre la consola del navegador (F12)"
echo "   3. Revisa que las peticiones API usen: $API_URL"
echo ""

