# Frontend Dockerfile para Dannig Óptica
FROM node:18-alpine as build

# Establecer directorio de trabajo
WORKDIR /app

# Accept build argument for API URL
# Default value (will be overridden by docker-compose)
# Using standard port 443 (no port needed in URL)
ARG VITE_API_URL=https://api.Dannig-Optica.freeddns.org
ENV VITE_API_URL=$VITE_API_URL

# Copiar package.json y package-lock.json primero (para mejor caching)
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar código fuente
COPY . .

# Construir la aplicación con variables de entorno
RUN npm run build

# Etapa de producción con nginx
FROM nginx:alpine

# Copiar archivos construidos
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar configuración personalizada de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer puerto 80
EXPOSE 80

# Comando para iniciar nginx
CMD ["nginx", "-g", "daemon off;"]
