#!/bin/bash
# Helper script to stop services on ports 80 and 443
# WARNING: This will stop processes using these ports

echo "⚠️  Deteniendo servicios en puertos 80 y 443..."
echo ""

for port in 80 443; do
  pids=$(sudo ss -tulpn 2>/dev/null | grep ":${port} " | grep -oP 'pid=\K[0-9]+' | sort -u)
  
  if [ -n "$pids" ]; then
    echo "Puerto $port:"
    for pid in $pids; do
      process=$(ps -p "$pid" -o comm= 2>/dev/null || echo "unknown")
      echo "  - PID $pid ($process)"
      read -p "¿Detener este proceso? (y/n) " -n 1 -r
      echo
      if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo kill "$pid" 2>/dev/null || echo "   No se pudo detener PID $pid"
      fi
    done
  fi
done

echo ""
echo "✅ Proceso completado"
