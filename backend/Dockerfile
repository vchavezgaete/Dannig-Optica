# Backend Dockerfile para Dannig Óptica
FROM node:18-alpine

# Establecer directorio de trabajo
WORKDIR /app

# Dependencias del sistema requeridas por Prisma y espera de DB
RUN apk add --no-cache openssl libc6-compat netcat-openbsd curl

# Copiar package.json y package-lock.json
COPY package*.json ./

# Copiar prisma schema antes de instalar dependencias
COPY prisma ./prisma

# Instalar dependencias (postinstall ejecutará prisma generate)
RUN npm install

# Generar cliente Prisma explícitamente después de instalar dependencias
RUN npx prisma generate

# Copiar solo fuentes necesarias para build
COPY tsconfig.json ./
COPY src ./src

# Compilar TypeScript a dist
RUN npm run build

# Crear directorio de scripts y copiar todos los scripts necesarios
RUN mkdir -p ./scripts
COPY scripts/*.sh ./scripts/
COPY scripts/*.ts ./scripts/
RUN chmod +x ./scripts/*.sh

# Exponer puerto
EXPOSE 3001

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3001

# Comando de inicio simplificado
CMD ["npm", "start"]
