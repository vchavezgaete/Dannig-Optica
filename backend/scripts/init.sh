#!/bin/sh
set -e

echo "Esperando MySQL..."
until nc -z mysql 3306; do
  sleep 1
done

echo "MySQL disponible, sincronizando schema..."
npx prisma db push --accept-data-loss

echo "Schema sincronizado"

# Iniciar servidor en background
echo "Iniciando servidor..."
node dist/server.js &
SERVER_PID=$!

# Esperar a que el servidor esté listo
echo "Esperando que el servidor esté listo..."
sleep 3

# Crear usuario admin automáticamente
echo "Creando usuario admin con credenciales desde ENV..."
curl -X POST http://localhost:3001/auth/seed -f -s || echo "Admin ya existe o error en seed"

# Traer el servidor al foreground
wait $SERVER_PID

