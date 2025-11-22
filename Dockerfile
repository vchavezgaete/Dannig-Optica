# Frontend Dockerfile para Dannig Óptica
# Railway construye desde la raíz del repo, por lo que el contexto es la raíz
# Las rutas deben incluir el prefijo frontend/ porque el contexto es la raíz
FROM node:18-alpine as build

# Establecer directorio de trabajo
WORKDIR /app

# Accept build argument for API URL
ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL

# Copiar package.json y package-lock.json primero (para mejor caching)
# El contexto es la raíz del repo, así que las rutas deben incluir frontend/
COPY frontend/package*.json ./

# Instalar dependencias
RUN npm install

# Copiar código fuente del frontend completo (esto incluye nginx.conf y scripts)
# El contexto es la raíz del repo, así que las rutas deben incluir frontend/
COPY frontend/ .

# Copiar nginx.conf a /tmp antes de construir (estará disponible en la etapa de nginx)
RUN cp nginx.conf /tmp/nginx.conf || (echo "ERROR: nginx.conf no encontrado" && ls -la && exit 1)

# Construir la aplicación con variables de entorno
RUN npm run build

# Verificar que dist/index.html existe después del build
RUN test -f dist/index.html || (echo "ERROR: index.html no generado en build" && ls -la dist/ && exit 1)

# Etapa de producción con nginx
FROM nginx:alpine

# Instalar bash para scripts que lo requieran
RUN apk add --no-cache bash && \
    rm -rf /var/cache/apk/*

# Copiar archivos construidos
COPY --from=build /app/dist /usr/share/nginx/html

# Verificar que los archivos se copiaron correctamente
RUN ls -la /usr/share/nginx/html && \
    test -f /usr/share/nginx/html/index.html || (echo "ERROR: index.html no encontrado después de copiar" && exit 1)

# Copiar configuración personalizada de nginx desde la etapa de build
COPY --from=build /tmp/nginx.conf /etc/nginx/conf.d/default.conf

# Verificar configuración de nginx
RUN nginx -t || (echo "ERROR: Configuración de nginx inválida" && cat /etc/nginx/conf.d/default.conf && exit 1)

# Copiar script de inicio desde la etapa de build
COPY --from=build /app/scripts/start-nginx.sh /start-nginx.sh
RUN chmod +x /start-nginx.sh || echo "Script no encontrado, usando comando directo"

# Exponer puerto 80 (Railway mapeará esto automáticamente)
EXPOSE 80

# Comando para iniciar nginx - usar script si existe, sino comando directo
CMD ["/bin/sh", "-c", "if [ -f /start-nginx.sh ]; then exec /start-nginx.sh; else echo '🚀 Iniciando nginx...' && nginx -t && exec nginx -g 'daemon off;'; fi"]
