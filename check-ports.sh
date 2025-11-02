#!/bin/bash

# Script to check if required ports are available
# Usage: ./check-ports.sh [HTTP_PORT] [HTTPS_PORT] [DASHBOARD_PORT]

set -e

HTTP_PORT=${1:-80}
HTTPS_PORT=${2:-8443}
DASHBOARD_PORT=${3:-8080}

check_port() {
  local port=$1
  local name=$2
  
  echo -n "Checking port $port ($name)... "
  
  if command -v netstat &> /dev/null; then
    if netstat -tuln 2>/dev/null | grep -q ":$port "; then
      echo "❌ IN USE"
      if command -v lsof &> /dev/null; then
        echo "   Process using port:"
        lsof -i :$port 2>/dev/null | tail -n +2 | awk '{print "   " $1 " (PID: " $2 ")"}'
      fi
      return 1
    else
      echo "✅ Available"
      return 0
    fi
  elif command -v ss &> /dev/null; then
    if ss -tuln 2>/dev/null | grep -q ":$port "; then
      echo "❌ IN USE"
      return 1
    else
      echo "✅ Available"
      return 0
    fi
  else
    echo "⚠️  Cannot check (netstat/ss not available)"
    return 0
  fi
}

echo "🔍 Checking port availability..."
echo ""

ALL_AVAILABLE=true

check_port "$HTTP_PORT" "HTTP" || ALL_AVAILABLE=false
check_port "$HTTPS_PORT" "HTTPS" || ALL_AVAILABLE=false
check_port "$DASHBOARD_PORT" "Dashboard" || ALL_AVAILABLE=false

echo ""

if [ "$ALL_AVAILABLE" = true ]; then
  echo "✅ All ports are available!"
  exit 0
else
  echo "⚠️  Some ports are in use."
  echo ""
  echo "💡 Tip: Edit .env file to use different ports:"
  echo "   TRAEFIK_HTTP_PORT=<different_port>"
  echo "   TRAEFIK_HTTPS_PORT=<different_port>"
  echo "   TRAEFIK_DASHBOARD_PORT=<different_port>"
  exit 1
fi

