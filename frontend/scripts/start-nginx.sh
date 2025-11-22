#!/bin/sh
# Script de inicio para nginx en Railway
# Verifica que todo esté correcto antes de iniciar nginx

set -e

echo "🔍 Verificando entorno antes de iniciar nginx..."

# Verificar que los archivos existen
if [ ! -d "/usr/share/nginx/html" ]; then
    echo "❌ ERROR: /usr/share/nginx/html no existe"
    exit 1
fi

if [ ! -f "/usr/share/nginx/html/index.html" ]; then
    echo "❌ ERROR: index.html no encontrado en /usr/share/nginx/html"
    echo "📁 Contenido de /usr/share/nginx/html:"
    ls -la /usr/share/nginx/html
    exit 1
fi

echo "✅ Archivos estáticos encontrados en /usr/share/nginx/html"

# Verificar configuración de nginx
if [ ! -f "/etc/nginx/conf.d/default.conf" ]; then
    echo "❌ ERROR: default.conf no encontrado"
    exit 1
fi

echo "✅ Configuración de nginx encontrada"

# Test de configuración de nginx
echo "🔧 Verificando configuración de nginx..."
if ! nginx -t; then
    echo "❌ ERROR: Configuración de nginx inválida"
    echo "📄 Contenido de default.conf:"
    cat /etc/nginx/conf.d/default.conf
    exit 1
fi

echo "✅ Configuración de nginx válida"
echo "🚀 Iniciando nginx en primer plano..."

# Iniciar nginx en primer plano
exec nginx -g 'daemon off;'

