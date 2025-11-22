# Frontend Dockerfile para Dannig Optica - React + Vite + Railway
# CONTEXTO: Railway construye desde Root Directory "frontend"
# El contexto de build es frontend/, asi que todas las rutas son relativas a ese directorio

# ============================================================================
# ETAPA DE BUILD: Compilar aplicacion React con Vite
# ============================================================================
FROM node:20-alpine3.19 AS build

# Variables de entorno para el build
# IMPORTANTE: Vite necesita estas variables durante el BUILD (no en runtime)
ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL
ENV NODE_ENV=production

# Configurar directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema necesarias para el build
RUN apk update && apk upgrade && apk add --no-cache libc6-compat && rm -rf /var/cache/apk/*

# Copiar archivos de dependencias primero (mejor caching de Docker)
COPY package.json package-lock.json* ./

# Instalar dependencias (incluyendo devDependencies necesarias para el build)
# Usar npm ci para instalacion deterministica y mas rapida
RUN npm ci --include=dev --no-audit --no-fund || \
    (echo "Warning: npm ci failed, trying npm install..." && npm install --no-audit --no-fund)

# Verificar que Vite esta instalado correctamente
RUN node -e "require('vite')" || (echo "ERROR: Vite no esta instalado" && exit 1)

# Copiar codigo fuente del frontend (esto incluye src/, index.html, vite.config.ts, etc.)
COPY . .

# Verificar que archivos criticos existen
RUN test -f index.html || (echo "ERROR: index.html no encontrado" && exit 1) && \
    test -f vite.config.ts || (echo "ERROR: vite.config.ts no encontrado" && exit 1) && \
    test -d src || (echo "ERROR: directorio src/ no encontrado" && exit 1)

# Copiar configuracion de nginx a /tmp para la etapa de produccion
RUN cp nginx.conf /tmp/nginx.conf || (echo "ERROR: nginx.conf no encontrado" && ls -la && exit 1)

# Construir la aplicacion React con Vite
# Vite necesitara VITE_API_URL durante este paso (se inyecta en tiempo de build)
RUN echo "Building React app with Vite..." && \
    echo "VITE_API_URL=$VITE_API_URL" && \
    echo "NODE_ENV=$NODE_ENV" && \
    npm run build && \
    echo "Build completed successfully"

# Verificar que el build genero los archivos necesarios
RUN test -d dist || (echo "ERROR: directorio dist/ no generado" && exit 1) && \
    test -f dist/index.html || (echo "ERROR: dist/index.html no generado" && ls -la dist/ && exit 1) && \
    echo "Build verification passed - archivos generados correctamente"

# Limpiar cache de npm para reducir tamano de imagen
RUN npm cache clean --force

# ============================================================================
# ETAPA DE PRODUCCION: Servir aplicacion con Nginx
# ============================================================================
FROM nginx:alpine

# Instalar herramientas necesarias (bash para scripts, curl para healthchecks)
RUN apk add --no-cache bash curl && rm -rf /var/cache/apk/*

# Copiar archivos construidos desde la etapa de build
COPY --from=build /app/dist /usr/share/nginx/html

# Verificar que los archivos se copiaron correctamente
RUN ls -la /usr/share/nginx/html && \
    test -f /usr/share/nginx/html/index.html || \
    (echo "ERROR: index.html no encontrado despues de copiar" && exit 1) && \
    echo "Archivos estaticos copiados correctamente"

# Copiar configuracion personalizada de nginx
COPY --from=build /tmp/nginx.conf /etc/nginx/conf.d/default.conf

# Verificar que la configuracion de nginx es valida
RUN nginx -t || \
    (echo "ERROR: Configuracion de nginx invalida" && \
     cat /etc/nginx/conf.d/default.conf && \
     exit 1) && \
    echo "Configuracion de nginx valida"

# Copiar script de inicio (si existe)
COPY --from=build /app/scripts/start-nginx.sh /start-nginx.sh
RUN chmod +x /start-nginx.sh 2>/dev/null || \
    echo "Warning: Script de inicio no encontrado, usando comando directo"

# Exponer puerto 80 (Railway mapeara esto automaticamente)
EXPOSE 80

# Healthcheck para verificar que nginx esta funcionando
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Comando para iniciar nginx
# Usa el script de inicio si existe, sino usa comando directo con verificaciones
CMD ["/bin/sh", "-c", \
     "if [ -f /start-nginx.sh ]; then \
        exec /start-nginx.sh; \
      else \
        echo 'Starting nginx...' && \
        nginx -t && \
        echo 'Nginx config OK' && \
        exec nginx -g 'daemon off;'; \
      fi"]
