#!/bin/sh
# Script de inicio para nginx en Railway
# Verifica que todo esté correcto antes de iniciar nginx

set -e

echo "[INFO] Verifying environment before starting nginx..."

# Verify static files exist
if [ ! -d "/usr/share/nginx/html" ]; then
    echo "[ERROR] /usr/share/nginx/html does not exist"
    exit 1
fi

if [ ! -f "/usr/share/nginx/html/index.html" ]; then
    echo "[ERROR] index.html not found in /usr/share/nginx/html"
    echo "[INFO] Contents of /usr/share/nginx/html:"
    ls -la /usr/share/nginx/html
    exit 1
fi

echo "[OK] Static files found in /usr/share/nginx/html"

# Verify nginx configuration exists
if [ ! -f "/etc/nginx/conf.d/default.conf" ]; then
    echo "[ERROR] default.conf not found"
    exit 1
fi

echo "[OK] Nginx configuration found"

# Test nginx configuration
echo "[INFO] Testing nginx configuration..."
if ! nginx -t; then
    echo "[ERROR] Invalid nginx configuration"
    echo "[INFO] Contents of default.conf:"
    cat /etc/nginx/conf.d/default.conf
    exit 1
fi

echo "[OK] Nginx configuration is valid"
echo "[INFO] Starting nginx in foreground mode..."

# Start nginx in foreground
exec nginx -g 'daemon off;'

