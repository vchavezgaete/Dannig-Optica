# Frontend Dockerfile para Dannig Óptica (React + Vite)
# CONTEXTO: este archivo está dentro de la carpeta "frontend"

########################
# ETAPA 1: BUILD (Vite)
########################
FROM node:18-alpine AS build

WORKDIR /app

# Variable para la API (la puedes setear en Railway)
ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL
ENV NODE_ENV=production

# Copiamos solo package*.json primero
COPY package*.json package-lock.json* ./

# Instalamos dependencias (ci si hay lock, si no install)
RUN npm ci --include=dev --no-audit --no-fund || \
    (echo "npm ci falló, usando npm install..." && npm install --no-audit --no-fund)

# Copiamos el código fuente
COPY . .

# Build de la app React (Vite)
RUN npm run build

# Comprobación simple
RUN test -f dist/index.html || (echo "ERROR: dist/index.html no generado" && ls -la dist && exit 1)

########################
# ETAPA 2: NGINX
########################
FROM nginx:alpine

# Copiamos la config de nginx (asegúrate que existe frontend/nginx.conf)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiamos el build
COPY --from=build /app/dist /usr/share/nginx/html

# Puerto que usará Railway
EXPOSE 80

# Comando de arranque
CMD ["nginx", "-g", "daemon off;"]
