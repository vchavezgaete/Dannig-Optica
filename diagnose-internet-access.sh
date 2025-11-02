#!/bin/bash

# Script para diagnosticar problemas de acceso desde Internet

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🔍 Diagnóstico de Acceso desde Internet"
echo "========================================"
echo ""

# Get IPs
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "unknown")
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s https://api.ipify.org 2>/dev/null || echo "unknown")
DOMAIN="Dannig-Optica.freeddns.org"

echo "📡 Información de Red:"
echo "   IP Local: $LOCAL_IP"
echo "   IP Pública: $PUBLIC_IP"
echo "   Dominio: $DOMAIN"
echo ""

# Check DNS
echo "🌐 Verificación DNS:"
DNS_IP=$(nslookup $DOMAIN 2>/dev/null | grep -A2 "Name:" | grep "Address:" | awk '{print $2}' | head -1 || echo "")
if [ -n "$DNS_IP" ]; then
  if [ "$DNS_IP" = "$PUBLIC_IP" ]; then
    echo "   ✅ DNS apunta a IP pública correcta: $DNS_IP"
  else
    echo "   ⚠️  DNS apunta a: $DNS_IP"
    echo "   ⚠️  IP pública es: $PUBLIC_IP"
    echo "   ❌ NO COINCIDEN - Actualiza el DDNS"
  fi
else
  echo "   ❌ No se puede resolver DNS"
fi
echo ""

# Check ports locally
echo "🔌 Puertos Locales:"
HTTP_PORT=$(grep "^TRAEFIK_HTTP_PORT=" .env 2>/dev/null | cut -d= -f2 || echo "80")
HTTPS_PORT=$(grep "^TRAEFIK_HTTPS_PORT=" .env 2>/dev/null | cut -d= -f2 || echo "443")

echo "   HTTP: $HTTP_PORT"
echo "   HTTPS: $HTTPS_PORT"
echo ""

# Check if ports are listening
echo "📋 Estado de Puertos:"
if ss -tuln 2>/dev/null | grep -q ":$HTTPS_PORT "; then
  LISTEN_INFO=$(ss -tuln 2>/dev/null | grep ":$HTTPS_PORT ")
  if echo "$LISTEN_INFO" | grep -q "0.0.0.0"; then
    echo "   ✅ Puerto $HTTPS_PORT escuchando en todas las interfaces (0.0.0.0)"
  else
    echo "   ⚠️  Puerto $HTTPS_PORT escuchando en: $LISTEN_INFO"
    echo "   ⚠️  Debería estar en 0.0.0.0 para acceso desde Internet"
  fi
else
  echo "   ❌ Puerto $HTTPS_PORT NO está escuchando"
fi
echo ""

# Check Docker containers
echo "🐳 Estado de Contenedores:"
if docker ps --format "{{.Names}}" | grep -q "dannig-traefik"; then
  echo "   ✅ Traefik está corriendo"
  TRAEFIK_PORTS=$(docker ps --filter "name=dannig-traefik" --format "{{.Ports}}" | head -1)
  echo "   Puertos: $TRAEFIK_PORTS"
else
  echo "   ❌ Traefik NO está corriendo"
fi

if docker ps --format "{{.Names}}" | grep -q "dannig-frontend"; then
  echo "   ✅ Frontend está corriendo"
else
  echo "   ❌ Frontend NO está corriendo"
fi
echo ""

# Test local access
echo "🧪 Prueba de Acceso Local:"
if curl -k -s -m 3 -H "Host: app.$DOMAIN" "https://localhost:$HTTPS_PORT" 2>&1 | grep -q "DOCTYPE"; then
  echo "   ✅ Acceso local funciona"
else
  echo "   ❌ Acceso local NO funciona"
fi
echo ""

# Test from public IP
echo "🌍 Prueba de Acceso desde IP Pública:"
if [ "$PUBLIC_IP" != "unknown" ]; then
  RESULT=$(curl -k -s -m 5 "https://$PUBLIC_IP:$HTTPS_PORT" 2>&1)
  if echo "$RESULT" | grep -q "DOCTYPE\|html"; then
    echo "   ✅ Acceso desde IP pública funciona"
  elif echo "$RESULT" | grep -q "Connection refused\|timed out"; then
    echo "   ❌ Conexión rechazada o timeout"
    echo "   ⚠️  Probable causa: Puerto no está abierto en el router/firewall"
  else
    echo "   ⚠️  Resultado: ${RESULT:0:50}..."
  fi
else
  echo "   ⚠️  No se puede obtener IP pública para probar"
fi
echo ""

# Recommendations
echo "💡 Recomendaciones:"
echo ""
echo "1. Verifica Port Forwarding en tu Router:"
echo "   - Puerto $HTTPS_PORT (TCP) → $LOCAL_IP:$HTTPS_PORT"
echo "   - Puerto $HTTP_PORT (TCP) → $LOCAL_IP:$HTTP_PORT (opcional)"
echo ""
echo "2. Verifica Firewall del Router:"
echo "   - Asegúrate de que los puertos $HTTP_PORT y $HTTPS_PORT estén permitidos"
echo ""
echo "3. Si usas puertos personalizados ($HTTPS_PORT):"
echo "   - DEBES configurar port forwarding en el router"
echo "   - El acceso será: https://$DOMAIN:$HTTPS_PORT"
echo ""
echo "4. Para usar puertos estándar (80/443):"
echo "   - Cambia .env: TRAEFIK_HTTP_PORT=80, TRAEFIK_HTTPS_PORT=443"
echo "   - Configura port forwarding: 80→80, 443→443"
echo "   - Acceso directo: https://$DOMAIN (sin puerto)"
echo ""

