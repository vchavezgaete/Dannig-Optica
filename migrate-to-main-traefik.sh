#!/bin/bash

# Script para migrar Dannig Óptica al Traefik principal que ya funciona

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🔄 Migrando Dannig Óptica al Traefik Principal"
echo "=============================================="
echo ""

echo "📋 Verificando estado actual..."
echo ""

# Verificar que el Traefik principal esté corriendo
if ! docker ps --format "{{.Names}}" | grep -q "^traefik$"; then
  echo "❌ Error: El Traefik principal ('traefik') no está corriendo"
  echo "   Por favor, inicia el Traefik principal primero"
  exit 1
fi

echo "✅ Traefik principal detectado"
echo ""

# Detener dannig-traefik si está corriendo
if docker ps --format "{{.Names}}" | grep -q "^dannig-traefik$"; then
  echo "🛑 Deteniendo dannig-traefik..."
  docker stop dannig-traefik 2>/dev/null || true
  docker rm dannig-traefik 2>/dev/null || true
  echo "✅ dannig-traefik detenido"
else
  echo "ℹ️  dannig-traefik no está corriendo"
fi
echo ""

# Obtener el nombre de la red del Traefik principal
# Si usa network_mode: host, necesitamos conectar a la red bridge
TRAEFIK_NETWORK="bridge"

# Verificar si hay alguna red compartida
EXISTING_NETWORK=$(docker network ls --format "{{.Name}}" | grep -E "^(bridge|default|traefik|web)$" | head -1 || echo "bridge")
TRAEFIK_NETWORK="$EXISTING_NETWORK"

echo "📡 Red a usar: $TRAEFIK_NETWORK"
echo ""

# Actualizar frontend para usar URL sin puerto (puertos estándar 80/443)
echo "🔧 Actualizando configuración..."
echo "   - Frontend usará: https://api.Dannig-Optica.freeddns.org (sin puerto)"
echo ""

# Crear/actualizar docker-compose sin el servicio traefik
echo "🚀 Iniciando servicios con Traefik principal..."
docker compose -f docker-compose.use-main-traefik.yml down 2>/dev/null || true
docker compose -f docker-compose.use-main-traefik.yml up -d

echo ""
echo "✅ Servicios iniciados"
echo ""

# El Traefik principal usa network_mode: host, por lo que puede ver todos los contenedores
# a través del socket de Docker. No necesitamos conectar a una red específica.
echo "ℹ️  Traefik principal usa network_mode: host"
echo "   Los contenedores serán detectados automáticamente a través del socket de Docker"
echo ""

echo "⏳ Esperando que los servicios estén listos..."
sleep 5

echo ""
echo "🧪 Verificando servicios..."
docker compose -f docker-compose.use-main-traefik.yml ps

echo ""
echo "✅ Migración completada!"
echo ""
echo "🌐 Acceso:"
echo "   Frontend: https://app.Dannig-Optica.freeddns.org"
echo "   Backend:  https://api.Dannig-Optica.freeddns.org"
echo "   Adminer:  https://db.Dannig-Optica.freeddns.org"
echo ""
echo "📝 Nota: Puede tomar unos minutos para que Let's Encrypt genere los certificados"
echo ""

