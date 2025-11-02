#!/bin/bash

# Script to start DannigOptica with custom ports
# This script checks for available ports and uses them

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Starting DannigOptica with custom ports..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
  echo "📝 Creating .env file with custom ports..."
  cat > .env <<EOF
# Traefik Ports Configuration
# Using alternative ports because standard ports may be in use
TRAEFIK_HTTP_PORT=8081
TRAEFIK_HTTPS_PORT=8443
TRAEFIK_DASHBOARD_PORT=8082

# MySQL Configuration
MYSQL_ROOT_PASSWORD=root
MYSQL_DATABASE=dannig
MYSQL_USER=dannig
MYSQL_PASSWORD=dannig

# Backend Configuration
JWT_SECRET=secure-token-change-in-production
ADMIN_NAME=Admin
ADMIN_EMAIL=admin@dannig.local
ADMIN_PASSWORD=admin123
CAPTADOR_NAME=Captador
CAPTADOR_EMAIL=captador@dannig.local
CAPTADOR_PASSWORD=captador123
OFTALMOLOGO_NAME="Dr. Oftalmologo"
OFTALMOLOGO_EMAIL=oftalmologo@dannig.local
OFTALMOLOGO_PASSWORD=oftalmologo123

# Frontend API URL (must include port when using custom ports)
VITE_API_URL=https://api.Dannig-Optica.freeddns.org:8443
EOF
  echo "✅ Created .env file"
  echo ""
else
  echo "✅ .env file exists"
  echo ""
fi

# Load environment variables
source .env || true

# Generate self-signed certificates (needed when using custom ports)
if [ ! -f traefik/certs/dannig.crt ] || [ ! -f traefik/certs/dannig.key ]; then
  echo "📝 Generating self-signed certificates..."
  if [ -f traefik/generate-certs.sh ]; then
    bash traefik/generate-certs.sh
  else
    echo "❌ Certificate generation script not found!"
    exit 1
  fi
  echo ""
fi

# Check ports availability
check_port() {
  local port=$1
  local name=$2
  
  if command -v ss &> /dev/null; then
    if ss -tuln 2>/dev/null | grep -q ":${port} "; then
      echo "⚠️  Port $port ($name) is already in use!"
      return 1
    else
      echo "✅ Port $port ($name) is available"
      return 0
    fi
  elif command -v netstat &> /dev/null; then
    if netstat -tuln 2>/dev/null | grep -q ":${port} "; then
      echo "⚠️  Port $port ($name) is already in use!"
      return 1
    else
      echo "✅ Port $port ($name) is available"
      return 0
    fi
  else
    echo "⚠️  Cannot check port $port (ss/netstat not available)"
    return 0
  fi
}

echo "🔍 Checking ports..."
HTTP_PORT=${TRAEFIK_HTTP_PORT:-8081}
HTTPS_PORT=${TRAEFIK_HTTPS_PORT:-8443}
DASHBOARD_PORT=${TRAEFIK_DASHBOARD_PORT:-8082}

ALL_AVAILABLE=true

check_port "$HTTP_PORT" "HTTP" || ALL_AVAILABLE=false
check_port "$HTTPS_PORT" "HTTPS" || ALL_AVAILABLE=false
check_port "$DASHBOARD_PORT" "Dashboard" || ALL_AVAILABLE=false

echo ""

if [ "$ALL_AVAILABLE" != true ]; then
  echo "⚠️  Some ports are in use. Please update .env file with different ports."
  echo ""
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo ""
echo "🐳 Starting Docker containers..."
echo ""

# Start services (try docker compose v2 first, fallback to docker-compose)
if command -v docker &> /dev/null && docker compose version &> /dev/null; then
  docker compose -f docker-compose.traefik.yml up --build -d
elif command -v docker-compose &> /dev/null; then
  docker-compose -f docker-compose.traefik.yml up --build -d
else
  echo "❌ Neither 'docker compose' nor 'docker-compose' found!"
  exit 1
fi

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

echo ""
echo "✅ Services started!"
echo ""
echo "📋 Access points:"
echo "   🌐 Frontend:     https://app.Dannig-Optica.freeddns.org:${HTTPS_PORT} or https://Dannig-Optica.freeddns.org:${HTTPS_PORT}"
echo "   🔧 Backend API:  https://api.Dannig-Optica.freeddns.org:${HTTPS_PORT}"
echo "   🗄️  Adminer (DB): https://db.Dannig-Optica.freeddns.org:${HTTPS_PORT}"
echo "   📊 Traefik Dashboard: https://dashboard.Dannig-Optica.freeddns.org:${HTTPS_PORT}"
echo ""
echo "⚠️  Important notes:"
echo "   - Using custom ports (${HTTP_PORT}, ${HTTPS_PORT})"
echo "   - Let's Encrypt won't work with custom ports"
echo "   - Using self-signed certificates"
echo "   - Your browser will show a security warning"
echo "   - Click 'Advanced' and 'Proceed anyway'"
echo ""
echo "📝 To view logs:"
echo "   docker compose -f docker-compose.traefik.yml logs -f"
echo ""
echo "🛑 To stop services:"
echo "   docker compose -f docker-compose.traefik.yml down"
echo ""

