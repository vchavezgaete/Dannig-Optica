#!/bin/bash

# Script de diagnóstico para problemas de deployment
# Ejecutar este script para identificar problemas comunes

echo "🔍 Diagnóstico de Deployment - DannigOptica"
echo "=============================================="

# Verificar variables de entorno críticas
echo "📋 Verificando variables de entorno..."
echo "NODE_ENV: ${NODE_ENV:-'NO CONFIGURADO'}"
echo "PORT: ${PORT:-'NO CONFIGURADO'}"
echo "DATABASE_URL: ${DATABASE_URL:+'CONFIGURADO'}"
echo "JWT_SECRET: ${JWT_SECRET:+'CONFIGURADO'}"

# Verificar archivos críticos
echo ""
echo "📁 Verificando archivos críticos..."
if [ -f "dist/server.js" ]; then
    echo "✅ dist/server.js existe"
else
    echo "❌ dist/server.js NO existe - problema de build"
fi

if [ -f "prisma/schema.prisma" ]; then
    echo "✅ prisma/schema.prisma existe"
else
    echo "❌ prisma/schema.prisma NO existe"
fi

# Verificar conexión a base de datos
echo ""
echo "🗄️ Verificando conexión a base de datos..."
if command -v npx &> /dev/null; then
    echo "⚙️ Generando cliente Prisma..."
    npx prisma generate --schema=./prisma/schema.prisma
    
    echo "🔗 Probando conexión a BD..."
    timeout 10 npx prisma db push --accept-data-loss --schema=./prisma/schema.prisma
    if [ $? -eq 0 ]; then
        echo "✅ Conexión a base de datos exitosa"
    else
        echo "❌ Error de conexión a base de datos"
    fi
else
    echo "❌ npx no disponible"
fi

# Verificar puerto
echo ""
echo "🌐 Verificando puerto..."
if [ -n "$PORT" ]; then
    echo "✅ Puerto configurado: $PORT"
else
    echo "❌ Puerto no configurado"
fi

# Verificar dependencias
echo ""
echo "📦 Verificando dependencias..."
if [ -f "package.json" ]; then
    echo "✅ package.json existe"
    if [ -d "node_modules" ]; then
        echo "✅ node_modules existe"
    else
        echo "❌ node_modules NO existe"
    fi
else
    echo "❌ package.json NO existe"
fi

echo ""
echo "🏁 Diagnóstico completado"
echo "=========================="
