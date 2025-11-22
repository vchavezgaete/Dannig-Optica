# Frontend Dockerfile para Dannig Óptica
# Railway construye desde la raíz del repo cuando dockerfilePath = "frontend/Dockerfile"
FROM node:18-alpine as build

# Establecer directorio de trabajo
WORKDIR /app

# Accept build argument for API URL
# Default value (will be overridden by Railway environment variables)
ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL

# Copiar package.json y package-lock.json primero (para mejor caching)
# Railway construye desde la raíz, así que necesitamos frontend/package*.json
COPY frontend/package*.json ./

# Instalar dependencias
RUN npm install

# Copiar código fuente del frontend
# Railway construye desde la raíz, así que necesitamos frontend/
COPY frontend/ .

# Copiar nginx.conf en la etapa de build para tenerlo disponible después
COPY frontend/nginx.conf /tmp/nginx.conf

# Construir la aplicación con variables de entorno
RUN npm run build

# Etapa de producción con nginx
FROM nginx:alpine

# Instalar bash para scripts que lo requieran
RUN apk add --no-cache bash && \
    rm -rf /var/cache/apk/*

# Copiar archivos construidos
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar configuración personalizada de nginx desde la etapa de build
COPY --from=build /tmp/nginx.conf /etc/nginx/conf.d/default.conf

# Exponer puerto 80
EXPOSE 80

# Comando para iniciar nginx
# Ahora podemos usar bash si es necesario, aunque nginx funciona bien con sh
CMD ["/bin/sh", "-c", "nginx -g 'daemon off;'"]
