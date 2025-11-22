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

# Copiar código fuente del frontend completo (esto incluye nginx.conf)
# El contexto es la raíz del repo, así que las rutas deben incluir frontend/
COPY frontend/ .

# Copiar nginx.conf a /tmp antes de construir (estará disponible en la etapa de nginx)
RUN cp nginx.conf /tmp/nginx.conf || (echo "ERROR: nginx.conf no encontrado" && ls -la && exit 1)

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
# Ahora bash está disponible si es necesario
CMD ["/bin/sh", "-c", "nginx -g 'daemon off;'"]
