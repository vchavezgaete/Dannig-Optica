#!/bin/bash

# Script para solucionar problemas de acceso desde Internet
# Opciones: Port Forwarding o cambiar a puertos estándar

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🔧 Solución de Acceso desde Internet"
echo "====================================="
echo ""

# Load current config
source .env 2>/dev/null || true
HTTP_PORT=${TRAEFIK_HTTP_PORT:-80}
HTTPS_PORT=${TRAEFIK_HTTPS_PORT:-443}
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "192.168.x.x")
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "unknown")

echo "📊 Configuración Actual:"
echo "   IP Local: $LOCAL_IP"
echo "   IP Pública: $PUBLIC_IP"
echo "   Puerto HTTP: $HTTP_PORT"
echo "   Puerto HTTPS: $HTTPS_PORT"
echo ""

echo "🔍 Problema Detectado:"
echo "   El puerto $HTTPS_PORT no está accesible desde Internet"
echo "   Esto significa que falta Port Forwarding en tu router"
echo ""

echo "📋 Opciones de Solución:"
echo ""
echo "1. Configurar Port Forwarding (Recomendado si quieres mantener puerto $HTTPS_PORT)"
echo "   - Entra a tu router (generalmente http://192.168.1.1 o http://192.168.0.1)"
echo "   - Busca 'Port Forwarding' o 'Virtual Server'"
echo "   - Agrega regla: Puerto externo $HTTPS_PORT → $LOCAL_IP:$HTTPS_PORT (TCP)"
echo "   - También agrega: Puerto externo $HTTP_PORT → $LOCAL_IP:$HTTP_PORT (TCP)"
echo ""
echo "2. Cambiar a puertos estándar (80/443)"
echo "   - Requiere liberar puertos 80 y 443"
echo "   - Acceso directo: https://Dannig-Optica.freeddns.org (sin puerto)"
echo "   - Más fácil de configurar en router"
echo ""
read -p "¿Qué opción prefieres? (1 o 2): " option

case $option in
  1)
    echo ""
    echo "📝 Instrucciones para Port Forwarding:"
    echo ""
    echo "1. Accede a tu router:"
    echo "   - Abre navegador: http://$(echo $LOCAL_IP | cut -d. -f1-3).1"
    echo "   - O prueba: http://192.168.1.1 o http://192.168.0.1"
    echo ""
    echo "2. Busca 'Port Forwarding', 'Virtual Server' o 'NAT'"
    echo ""
    echo "3. Agrega estas reglas:"
    echo "   Regla 1:"
    echo "     - Puerto externo: $HTTPS_PORT"
    echo "     - Puerto interno: $HTTPS_PORT"
    echo "     - IP destino: $LOCAL_IP"
    echo "     - Protocolo: TCP"
    echo ""
    echo "   Regla 2:"
    echo "     - Puerto externo: $HTTP_PORT"
    echo "     - Puerto interno: $HTTP_PORT"
    echo "     - IP destino: $LOCAL_IP"
    echo "     - Protocolo: TCP"
    echo ""
    echo "4. Guarda y aplica cambios"
    echo ""
    echo "5. Prueba el acceso desde Internet:"
    echo "   https://app.Dannig-Optica.freeddns.org:$HTTPS_PORT"
    echo ""
    ;;
    
  2)
    echo ""
    echo "🔄 Cambiando a puertos estándar (80/443)..."
    echo ""
    
    # Check if ports 80/443 are in use
    if ss -tuln 2>/dev/null | grep -q ":80 "; then
      echo "⚠️  Puerto 80 está en uso. Necesitas liberarlo primero."
      ss -tuln 2>/dev/null | grep ":80 " | head -3
      echo ""
      read -p "¿Quieres continuar de todas formas? (y/n) " -n 1 -r
      echo
      if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
      fi
    fi
    
    if ss -tuln 2>/dev/null | grep -q ":443 "; then
      echo "⚠️  Puerto 443 está en uso. Necesitas liberarlo primero."
      ss -tuln 2>/dev/null | grep ":443 " | head -3
      echo ""
      read -p "¿Quieres continuar de todas formas? (y/n) " -n 1 -r
      echo
      if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
      fi
    fi
    
    # Update .env
    if [ ! -f .env ]; then
      cat > .env <<EOF
TRAEFIK_HTTP_PORT=80
TRAEFIK_HTTPS_PORT=443
TRAEFIK_DASHBOARD_PORT=8080
EOF
    else
      sed -i 's/^TRAEFIK_HTTP_PORT=.*/TRAEFIK_HTTP_PORT=80/' .env
      sed -i 's/^TRAEFIK_HTTPS_PORT=.*/TRAEFIK_HTTPS_PORT=443/' .env
    fi
    
    echo "✅ .env actualizado"
    echo ""
    echo "🔄 Reiniciando servicios..."
    docker compose -f docker-compose.traefik.yml down traefik 2>/dev/null || true
    docker compose -f docker-compose.traefik.yml up -d traefik 2>/dev/null || docker-compose -f docker-compose.traefik.yml up -d traefik 2>/dev/null
    
    sleep 5
    
    echo ""
    echo "✅ Servicios reiniciados"
    echo ""
    echo "📝 Ahora configura Port Forwarding en tu router:"
    echo "   - Puerto 80 (TCP) → $LOCAL_IP:80"
    echo "   - Puerto 443 (TCP) → $LOCAL_IP:443"
    echo ""
    echo "🌐 Acceso:"
    echo "   https://app.Dannig-Optica.freeddns.org"
    echo "   (sin necesidad de especificar puerto)"
    echo ""
    ;;
    
  *)
    echo "❌ Opción inválida"
    exit 1
    ;;
esac

echo ""
echo "🧪 Para verificar el acceso:"
echo "   ./diagnose-internet-access.sh"
echo ""

