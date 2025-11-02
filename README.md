# DannigOptica - Sistema de Gestión Óptica

Sistema completo de gestión para óptica Dannig, incluyendo gestión de clientes, citas, productos, ventas y más.

## 🏗️ Arquitectura

- **Backend**: Fastify + Prisma + MySQL
- **Frontend**: React + Vite + React Router
- **Infraestructura**: Docker (MySQL + Adminer)
- **Containerización**: Docker Compose para desarrollo y producción

## 🚀 Inicio Rápido

### 1. Requisitos Previos

- Docker y Docker Compose
- OpenSSL (para generar certificados autofirmados)

### 2. Configuración con Traefik y HTTPS (Recomendado)

Esta configuración usa Traefik como reverse proxy con HTTPS habilitado usando el dominio DDNS `Dannig-Optica.freeddns.org` y certificados SSL automáticos con Let's Encrypt.

#### Pasos de Configuración

1. **Configurar DDNS** (una sola vez):

   Asegúrate de que tu servicio DDNS (`Dannig-Optica.freeddns.org`) esté configurado y apunte a la IP pública de tu servidor.

   - Verifica la configuración en tu proveedor DDNS
   - Asegúrate de que los puertos 80 y 443 estén abiertos en tu router/firewall

2. **Configurar subdominios** (opcional):

   Si tu proveedor DDNS lo permite, configura los siguientes subdominios apuntando a la misma IP:
   - `app.Dannig-Optica.freeddns.org` → Frontend
   - `api.Dannig-Optica.freeddns.org` → Backend API
   - `db.Dannig-Optica.freeddns.org` → Adminer
   - `dashboard.Dannig-Optica.freeddns.org` → Traefik Dashboard

   **Nota**: Si no puedes configurar subdominios, el dominio principal (`Dannig-Optica.freeddns.org`) también funcionará para el frontend.

3. **Iniciar servicios con el script automatizado:**
   ```bash
   ./start-traefik.sh
   ```

   Este script:
   - Verifica que los puertos estén disponibles
   - Verifica la configuración DNS
   - Configura y levanta todos los servicios
   - Let's Encrypt emitirá certificados automáticamente en el primer acceso

4. **O manualmente:**
   ```bash
   # Crear archivo .env (si no existe)
   cp .env.example .env
   # Editar .env si necesitas cambiar puertos

   # Levantar servicios
   docker-compose -f docker-compose.traefik.yml up --build -d
   ```

5. **Acceder a los servicios:**
   - 🌐 **Frontend**: https://app.Dannig-Optica.freeddns.org o https://Dannig-Optica.freeddns.org
   - 🔧 **Backend API**: https://api.Dannig-Optica.freeddns.org
   - 🗄️ **Adminer (DB)**: https://db.Dannig-Optica.freeddns.org
   - 📊 **Traefik Dashboard**: https://dashboard.Dannig-Optica.freeddns.org

   🔐 **Certificados SSL**: Los certificados se emitirán automáticamente con Let's Encrypt en el primer acceso. Puede tomar unos minutos.

#### Configuración de Puertos

Por defecto se usan los puertos estándar (80 y 443). Si necesitas cambiarlos, edita el archivo `.env`:

```bash
# Puertos de Traefik
TRAEFIK_HTTP_PORT=80          # Puerto HTTP (redirige a HTTPS)
TRAEFIK_HTTPS_PORT=443       # Puerto HTTPS (estándar)
TRAEFIK_DASHBOARD_PORT=8080  # Puerto del dashboard de Traefik
```

⚠️ **Importante**: Let's Encrypt requiere que los puertos 80 y 443 estén accesibles desde Internet. Si usas puertos personalizados, Let's Encrypt no funcionará.

#### Comandos Útiles

```bash
# Ver logs de todos los servicios
docker-compose -f docker-compose.traefik.yml logs -f

# Ver logs de un servicio específico
docker-compose -f docker-compose.traefik.yml logs -f backend
docker-compose -f docker-compose.traefik.yml logs -f frontend

# Detener servicios
docker-compose -f docker-compose.traefik.yml down

# Detener y eliminar volúmenes (¡CUIDADO! Esto elimina la BD)
docker-compose -f docker-compose.traefik.yml down -v
```

📖 **Documentación completa de Traefik**: Ver [traefik/README.md](./traefik/README.md)

### 3. Configuración Simple con Docker Compose (Sin Traefik)

Si prefieres una configuración más simple sin HTTPS:

```bash
# Levantar todos los servicios
docker compose up -d

# Ver logs del backend
docker logs -f dannig-backend

# Ver logs del frontend
docker logs -f dannig-frontend
```

El usuario admin se crea automáticamente al iniciar el backend.

### 4. Configuración Manual (Desarrollo Local)

```bash
# Levantar infraestructura (MySQL + Adminer)
cd infra
docker-compose up -d
cd ..

# Configurar Backend
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev  # En una terminal separada

# Crear usuario admin (en otra terminal)
curl -X POST http://localhost:3001/auth/seed

# Configurar Frontend (en otra terminal)
cd ../frontend
npm install
npm run dev
```

### 5. Acceso (Configuración Simple)

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Adminer (DB Admin)**: http://localhost:8080
- **MySQL**: localhost:3307

### 6. Credenciales por defecto

Las credenciales del usuario admin se configuran mediante variables de entorno en `docker-compose.yml`:

- **Email**: admin@dannig.local
- **Password**: admin123

Para cambiar las credenciales, modifica las siguientes variables de entorno en el servicio `backend` del archivo `docker-compose.yml`:

```yaml
environment:
  - ADMIN_NAME=Admin
  - ADMIN_EMAIL=admin@dannig.local
  - ADMIN_PASSWORD=admin123
```

## 🔐 Variables de Entorno

### Backend

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `DATABASE_URL` | URL de conexión a MySQL | `mysql://dannig:dannig@mysql:3306/dannig` |
| `NODE_ENV` | Entorno de ejecución | `production` |
| `PORT` | Puerto del servidor | `3001` |
| `JWT_SECRET` | Secreto para tokens JWT | `secure-token-change-in-production` |
| `ADMIN_NAME` | Nombre del usuario admin | `Admin` |
| `ADMIN_EMAIL` | Email del usuario admin | `admin@dannig.local` |
| `ADMIN_PASSWORD` | Contraseña del usuario admin | `admin123` |

### MySQL

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `MYSQL_ROOT_PASSWORD` | Contraseña de root | `root` |
| `MYSQL_DATABASE` | Nombre de la base de datos | `dannig` |
| `MYSQL_USER` | Usuario de la base de datos | `dannig` |
| `MYSQL_PASSWORD` | Contraseña del usuario | `dannig` |

## 📂 Estructura del Proyecto

```
DannigOptica/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma       # Schema de base de datos
│   ├── src/
│   │   ├── routes/            # Endpoints de API
│   │   ├── plugins/           # Autenticación JWT
│   │   ├── db.ts              # Cliente Prisma
│   │   └── server.ts          # Servidor Fastify
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/             # Páginas (Login, Home, Leads, etc)
│   │   ├── components/        # Componentes reutilizables (DannigLayout)
│   │   ├── auth/              # Context de autenticación
│   │   ├── api.ts             # Cliente Axios
│   │   ├── index.css          # Estilos CSS centralizados
│   │   ├── Layout.tsx         # Layout para rutas protegidas
│   │   ├── ProtectedRoute.tsx # Protección de rutas
│   │   └── main.tsx           # Entry point React
│   ├── index.html             # HTML mínimo (solo div#root)
│   └── package.json
├── infra/
│   └── docker-compose.yml     # MySQL + Adminer
├── backup/
│   └── deprecated/            # Archivos no utilizados (HeaderBar, etc)
```

## 🔧 Variables de Entorno

### Backend (.env)
```env
DATABASE_URL="mysql://dannig:dannig@localhost:3307/dannig"
JWT_SECRET="dev_secret_key_change_in_production"
```

### Frontend (.env)
```env
VITE_API_URL="http://localhost:3001"
```

## 📋 Funcionalidades

- ✅ Autenticación con JWT
- ✅ Gestión de Clientes (CRUD)
- ✅ Gestión de Citas
- ✅ Gestión de Productos
- ✅ Sistema de Roles (Admin, Operador)
- ✅ Fichas Clínicas
- ✅ Recetas Médicas
- ✅ Control de Ventas
- ✅ Sistema de Garantías
- ✅ Alertas y Recordatorios

## 🔌 API Endpoints

### Auth
- `POST /auth/login` - Iniciar sesión
- `POST /auth/seed` - Crear usuario admin inicial

### Leads/Clientes
- `GET /leads` - Listar clientes
- `POST /leads` - Crear cliente

### Appointments
- `GET /appointments` - Listar citas
- `POST /appointments` - Crear cita

### Productos
- `GET /productos` - Listar productos
- `POST /productos` - Crear producto

## 🎯 Flujo de Login

1. Al acceder a http://localhost:5180/, React Router detecta que no hay token
2. `ProtectedRoute` redirige automáticamente a `/login`
3. El componente `Login.tsx` muestra el formulario con el diseño de Dannig
4. Al hacer clic en "Ingresar":
   - Se validan email y contraseña
   - Se hace POST a `/auth/login`
   - Se recibe y guarda el token JWT
   - Se redirige automáticamente a la página principal

**Nota**: El login es completamente manejado por React. No hay formularios HTML estáticos.

## 🛠️ Comandos Útiles

```bash
# Backend
cd backend
npm run dev          # Modo desarrollo
npm run build        # Compilar TypeScript
npm run start        # Producción
npx prisma studio    # Interface visual de DB

# Frontend
cd frontend
npm run dev          # Modo desarrollo
npm run build        # Build producción
npm run preview      # Preview build

# Database
docker exec -it dannig-mysql mysql -u dannig -pdannig dannig  # Acceder a MySQL
npx prisma migrate dev --name <nombre>  # Nueva migración
npx prisma db push   # Sincronizar schema sin migración
```

## 🐛 Solución de Problemas

### El backend no inicia
- Verificar que MySQL esté corriendo: `docker ps`
- Verificar variables de entorno en `backend/.env`
- Regenerar Prisma Client: `npx prisma generate`

### Errores de permisos con bcrypt
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

### Puerto ya en uso
```bash
# Backend (puerto 3001)
lsof -i :3001
kill -9 <PID>

# Frontend (puerto 5180)
lsof -i :5180
kill -9 <PID>
```

## 📝 Notas de Desarrollo

- El proyecto usa TypeScript en modo estricto
- Prisma maneja todas las migraciones de base de datos
- El frontend usa React Router para navegación
- La autenticación usa JWT con expiración de 8 horas

## 🔐 Seguridad

⚠️ **IMPORTANTE**: 
- Cambiar `JWT_SECRET` en producción
- Cambiar credenciales de MySQL en producción
- No commitear archivos `.env` al repositorio
- Usar HTTPS en producción

## 🐳 Docker (Recomendado)

Para un despliegue más fácil y consistente, puedes usar Docker:

### Inicio Rápido con Docker

```bash
# Levantar toda la aplicación
docker-compose up --build

# En modo detached (background)
docker-compose up --build -d

# Detener servicios
docker-compose down
```

### URLs con Docker
- 🌐 **Frontend**: http://localhost:5173
- 🔧 **Backend**: http://localhost:3001
- 🗄️ **Adminer**: http://localhost:8080
- 🐬 **MySQL**: localhost:3307

📖 **Documentación completa**: Ver [DOCKER.md](./DOCKER.md) para más detalles sobre Docker.

## 📄 Licencia

Proyecto privado - Dannig Óptica

#   D a n n i g - O p t i c a  
 