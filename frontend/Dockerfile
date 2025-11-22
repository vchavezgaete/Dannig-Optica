# Frontend Dockerfile para Dannig Óptica
# Railway construye desde el Root Directory (frontend/), por lo que las rutas son relativas a ese directorio
FROM node:18-alpine as build

# Establecer directorio de trabajo
WORKDIR /app

# Accept build argument for API URL
# Default value (will be overridden by Railway environment variables)
ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL

# Copiar package.json y package-lock.json primero (para mejor caching)
# Como el contexto es frontend/, las rutas son relativas a ese directorio
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar código fuente del frontend (contexto es frontend/, así que solo copiamos .)
COPY . .

# Copiar nginx.conf en la etapa de build para tenerlo disponible después
COPY nginx.conf /tmp/nginx.conf

# Construir la aplicación con variables de entorno
RUN npm run build

# Etapa de producción con nginx
FROM nginx:alpine

# Copiar archivos construidos
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar configuración personalizada de nginx desde la etapa de build
COPY --from=build /tmp/nginx.conf /etc/nginx/conf.d/default.conf

# Exponer puerto 80
EXPOSE 80

# Comando para iniciar nginx
# Railway ejecutará este CMD directamente
# nginx:alpine tiene sh, no bash, así que usamos sh
CMD ["/bin/sh", "-c", "nginx -g 'daemon off;'"]
