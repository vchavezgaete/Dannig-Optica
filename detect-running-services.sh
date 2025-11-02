#!/bin/bash

# Script para detectar todos los servicios corriendo y qué puertos usan

set -e

echo "🔍 Detección de Servicios Corriendo"
echo "===================================="
echo ""

# Function to get service info from PID
get_service_info() {
  local pid=$1
  if [ -z "$pid" ] || [ "$pid" = "unknown" ]; then
    return
  fi
  
  # Try to get process name
  local process=$(ps -p "$pid" -o comm= 2>/dev/null || echo "unknown")
  local cmdline=$(cat /proc/$pid/cmdline 2>/dev/null | tr '\0' ' ' || echo "unknown")
  
  # Check if it's a Docker container
  if echo "$cmdline" | grep -q docker; then
    local container=$(docker ps --format "{{.Names}}" --filter "pids=$pid" 2>/dev/null || echo "")
    if [ -n "$container" ]; then
      echo "  🐳 Docker: $container"
    fi
  fi
  
  # Check if it's a systemd service
  if systemctl is-active --quiet "$process.service" 2>/dev/null; then
    echo "  📦 Systemd: $process.service"
  fi
  
  echo "  📋 Process: $process (PID: $pid)"
  if [ "$cmdline" != "unknown" ]; then
    echo "  💻 Command: ${cmdline:0:80}..."
  fi
}

# Check specific ports
check_port() {
  local port=$1
  echo ""
  echo "🔌 Puerto $port:"
  echo "-----------------------------------"
  
  # Get all processes using this port
  local port_info=$(ss -tulpn 2>/dev/null | grep ":${port} " || echo "")
  
  if [ -z "$port_info" ]; then
    echo "  ✅ Disponible (no hay servicios usando este puerto)"
    return
  fi
  
  # Extract PIDs
  echo "$port_info" | while read line; do
    pid=$(echo "$line" | grep -oP 'pid=\K[0-9]+' || echo "unknown")
    proto=$(echo "$line" | awk '{print $1}')
    state=$(echo "$line" | awk '{print $2}')
    
    echo ""
    echo "  ⚠️  En uso:"
    get_service_info "$pid"
  done
}

# Main check for common ports
echo "🔎 Verificando puertos comunes..."
check_port 80
check_port 443
check_port 8080
check_port 8001
check_port 8888
check_port 9000
check_port 9443

echo ""
echo "📊 Resumen de Docker Containers:"
echo "-----------------------------------"
if command -v docker &> /dev/null; then
  docker ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}" 2>/dev/null || echo "  No hay contenedores Docker corriendo"
else
  echo "  Docker no está instalado o no está en el PATH"
fi

echo ""
echo "📦 Resumen de Systemd Services (HTTP/Web):"
echo "-----------------------------------"
if command -v systemctl &> /dev/null; then
  # Common web services
  for service in apache2 nginx httpd lighttpd; do
    if systemctl list-units --type=service 2>/dev/null | grep -q "$service"; then
      status=$(systemctl is-active "$service.service" 2>/dev/null || echo "inactive")
      if [ "$status" = "active" ]; then
        echo "  ✅ $service: $status"
      fi
    fi
  done
else
  echo "  systemctl no disponible"
fi

echo ""
echo "💡 Para ver todos los puertos en uso:"
echo "   sudo ss -tulpn | grep LISTEN"
echo ""
echo "💡 Para detener un servicio:"
echo "   sudo systemctl stop <service-name>"
echo "   o"
echo "   sudo docker stop <container-name>"
echo ""

