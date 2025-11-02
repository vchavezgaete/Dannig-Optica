#!/bin/bash

# Script inteligente para liberar puertos 80/443 y usar Let's Encrypt
# Detecta servicios y ayuda a reubicarlos detrás de Traefik

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🔧 Liberador de Puertos para Let's Encrypt"
echo "=========================================="
echo ""

# Function to check port usage without sudo (if possible)
check_port_simple() {
  local port=$1
  if command -v ss &> /dev/null; then
    ss -tuln 2>/dev/null | grep -q ":${port} " && return 0 || return 1
  elif command -v netstat &> /dev/null; then
    netstat -tuln 2>/dev/null | grep -q ":${port} " && return 0 || return 1
  fi
  return 1
}

# Check ports
echo "🔍 Verificando puertos 80 y 443..."
echo ""

PORT80_IN_USE=false
PORT443_IN_USE=false

if check_port_simple 80; then
  PORT80_IN_USE=true
  echo "⚠️  Puerto 80 está en uso"
else
  echo "✅ Puerto 80 está disponible"
fi

if check_port_simple 443; then
  PORT443_IN_USE=true
  echo "⚠️  Puerto 443 está en uso"
else
  echo "✅ Puerto 443 está disponible"
fi

echo ""

if [ "$PORT80_IN_USE" = false ] && [ "$PORT443_IN_USE" = false ]; then
  echo "✅ ¡Perfecto! Los puertos 80 y 443 están libres"
  echo ""
  echo "Puedes usar Let's Encrypt directamente:"
  echo "  ./start-traefik.sh"
  exit 0
fi

echo "📋 Opciones para usar Let's Encrypt:"
echo ""
echo "1. 🔄 Configurar servicios existentes detrás de Traefik (Recomendado)"
echo "   - Traefik escucha en 80/443"
echo "   - Servicios existentes se mueven a puertos internos"
echo "   - Traefik enruta por hostname/path"
echo "   - Let's Encrypt funciona perfectamente"
echo ""
echo "2. 📦 Detectar y detener servicios temporalmente"
echo "   - Lista servicios en 80/443"
echo "   - Ayuda a detenerlos o reconfigurarlos"
echo ""
echo "3. 🔀 Usar Traefik solo para DannigOptica (otros servicios se mantienen)"
echo "   - Requiere mover otros servicios a puertos alternativos"
echo ""
read -p "Selecciona opción (1-3): " option

case $option in
  1)
    echo ""
    echo "🚀 Configurando Traefik como proxy único..."
    echo ""
    ./setup-traefik-proxy.sh
    ;;
    
  2)
    echo ""
    echo "📋 Detectando servicios en puertos 80 y 443..."
    echo ""
    echo "Ejecuta estos comandos para ver qué usa los puertos:"
    echo ""
    echo "  sudo ss -tulpn | grep ':80 '"
    echo "  sudo ss -tulpn | grep ':443 '"
    echo ""
    echo "O usa el script helper:"
    echo "  ./migrate-services.sh"
    echo ""
    echo "Una vez que hayas movido o detenido los servicios:"
    echo "  ./start-traefik.sh"
    ;;
    
  3)
    echo ""
    echo "📝 Para usar Let's Encrypt con DannigOptica:"
    echo ""
    echo "1. Mueve otros servicios de 80/443 a puertos alternativos"
    echo "2. Ejecuta: ./start-traefik.sh"
    echo ""
    echo "Puertos recomendados para otros servicios:"
    echo "  - HTTP: 8080, 8888, 9000"
    echo "  - HTTPS: 8443, 9443"
    echo ""
    ;;
    
  *)
    echo "❌ Opción inválida"
    exit 1
    ;;
esac

echo ""
echo "✅ Configuración completada"
echo ""
echo "💡 Recuerda: Para Let's Encrypt necesitas:"
echo "   - Puertos 80 y 443 libres"
echo "   - DNS configurado correctamente"
echo "   - Puertos 80/443 accesibles desde Internet"

