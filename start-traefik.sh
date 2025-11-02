#!/bin/bash

# Script to start DannigOptica with Traefik and HTTPS
# This script will:
# 1. Generate self-signed certificates if they don't exist
# 2. Check if ports are available
# 3. Start all services

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Starting DannigOptica with Traefik..."
echo ""

# Check if .env exists, if not, create from .env.example
if [ ! -f .env ]; then
  echo "⚠️  .env file not found. Creating from defaults..."
  cat > .env <<EOF
# Traefik Ports Configuration
TRAEFIK_HTTP_PORT=80
TRAEFIK_HTTPS_PORT=8443
TRAEFIK_DASHBOARD_PORT=8080

# MySQL Configuration
MYSQL_ROOT_PASSWORD=D@nnlg-Opt|c4-Passw0rd
MYSQL_DATABASE=dannig
MYSQL_USER=dannig
MYSQL_PASSWORD=D4nn1g-Us3R

# Backend Configuration
JWT_SECRET=jwt-S3cR3T-D4nN1G-0Pt|c4
ADMIN_NAME=Admin
ADMIN_EMAIL=admin@dannig-optica.cl
ADMIN_PASSWORD=4dMln-123.@
CAPTADOR_NAME=Captador-Demo
CAPTADOR_EMAIL=captador@dannig-optica.cl
CAPTADOR_PASSWORD=C4pt@D0r.123
OFTALMOLOGO_NAME=Dr. Oftalmólogo
OFTALMOLOGO_EMAIL=oftalmologo@dannig-optica.cl
OFTALMOLOGO_PASSWORD=0ft4lm0loG0.123
EOF
  echo "✅ Created .env file. You can modify it if needed."
  echo ""
fi

# Load environment variables
source .env || true

# Check if certificates exist, if not generate them
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
  
  if command -v netstat &> /dev/null; then
    if netstat -tuln 2>/dev/null | grep -q ":$port "; then
      echo "⚠️  Port $port ($name) is already in use!"
      return 1
    fi
  elif command -v ss &> /dev/null; then
    if ss -tuln 2>/dev/null | grep -q ":$port "; then
      echo "⚠️  Port $port ($name) is already in use!"
      return 1
    fi
  fi
  return 0
}

echo "🔍 Checking ports..."
HTTP_PORT=${TRAEFIK_HTTP_PORT:-80}
HTTPS_PORT=${TRAEFIK_HTTPS_PORT:-443}
DASHBOARD_PORT=${TRAEFIK_DASHBOARD_PORT:-8080}

check_port "$HTTP_PORT" "HTTP" || {
  echo "💡 Tip: Change TRAEFIK_HTTP_PORT in .env file"
  exit 1
}

check_port "$HTTPS_PORT" "HTTPS" || {
  echo "💡 Tip: Change TRAEFIK_HTTPS_PORT in .env file"
  exit 1
}

check_port "$DASHBOARD_PORT" "Dashboard" || {
  echo "💡 Tip: Change TRAEFIK_DASHBOARD_PORT in .env file"
  exit 1
}

echo "✅ All ports are available"
echo ""

# Check DNS resolution
echo "🔍 Checking DNS configuration..."
DOMAIN="Dannig-Optica.freeddns.org"
if command -v nslookup &> /dev/null; then
  if nslookup "$DOMAIN" &> /dev/null; then
    echo "✅ Domain $DOMAIN resolves correctly"
  else
    echo "⚠️  Domain $DOMAIN does not resolve"
    echo "   Make sure your DDNS is configured and pointing to this server's IP"
  fi
elif command -v host &> /dev/null; then
  if host "$DOMAIN" &> /dev/null; then
    echo "✅ Domain $DOMAIN resolves correctly"
  else
    echo "⚠️  Domain $DOMAIN does not resolve"
    echo "   Make sure your DDNS is configured and pointing to this server's IP"
  fi
else
  echo "⚠️  Cannot check DNS (nslookup/host not available)"
  echo "   Make sure your DDNS points to this server's IP address"
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
if [ "$HTTPS_PORT" = "443" ]; then
  echo "   🌐 Frontend:     https://app.Dannig-Optica.freeddns.org or https://Dannig-Optica.freeddns.org"
  echo "   🔧 Backend API:  https://api.Dannig-Optica.freeddns.org"
  echo "   🗄️  Adminer (DB): https://db.Dannig-Optica.freeddns.org"
  echo "   📊 Traefik Dashboard: https://dashboard.Dannig-Optica.freeddns.org"
else
  echo "   🌐 Frontend:     https://app.Dannig-Optica.freeddns.org:${HTTPS_PORT} or https://Dannig-Optica.freeddns.org:${HTTPS_PORT}"
  echo "   🔧 Backend API:  https://api.Dannig-Optica.freeddns.org:${HTTPS_PORT}"
  echo "   🗄️  Adminer (DB): https://db.Dannig-Optica.freeddns.org:${HTTPS_PORT}"
  echo "   📊 Traefik Dashboard: https://dashboard.Dannig-Optica.freeddns.org:${HTTPS_PORT}"
fi
echo ""
echo "🔐 SSL Certificates:"
echo "   Using Let's Encrypt for automatic SSL certificates."
echo "   Certificates will be issued automatically on first access."
echo "   Make sure ports 80 and 443 are open in your firewall."
echo ""
echo "📝 To view logs:"
echo "   docker compose -f docker-compose.traefik.yml logs -f"
echo ""
echo "🛑 To stop services:"
echo "   docker compose -f docker-compose.traefik.yml down"
echo ""

