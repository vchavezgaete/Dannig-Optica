# Guía de Despliegue en Railway - DannigOptica

Esta guía explica cómo desplegar el sistema DannigOptica completo (backend, frontend y base de datos MySQL) en Railway.

## 📋 Prerrequisitos

- Cuenta en [Railway](https://railway.app)
- Repositorio de código conectado a GitHub/GitLab/Bitbucket
- Git configurado localmente

## 🗂️ Estructura del Proyecto

El proyecto tiene la siguiente estructura para Railway:

```
Dannig-Optica/
├── backend/              # Servicio backend (Fastify API)
│   ├── Dockerfile.railway-optimized
│   ├── railway.toml
│   └── scripts/
│       └── railway-init.sh
├── frontend/             # Servicio frontend (React + Vite)
│   ├── Dockerfile
│   └── railway.toml
├── railway.toml          # Configuración principal del backend
└── RAILWAY_DEPLOY.md     # Esta guía
```

## 🚀 Pasos de Despliegue

### 1. Crear Proyecto en Railway

1. Ve a [Railway Dashboard](https://railway.app/dashboard)
2. Haz clic en **"New Project"**
3. Selecciona **"Deploy from GitHub repo"** (o tu proveedor Git)
4. Selecciona el repositorio `Dannig-Optica`

### 2. Crear Base de Datos MySQL

1. En el proyecto de Railway, haz clic en **"+ New"**
2. Selecciona **"Database"** > **"Add MySQL"**
3. Railway creará automáticamente un servicio MySQL
4. Copia la variable `DATABASE_URL` del servicio MySQL (Railway la genera automáticamente)

**Importante:** Railway proporciona PostgreSQL por defecto, pero este proyecto usa MySQL. Asegúrate de seleccionar **MySQL** específicamente.

### 3. Desplegar Backend

#### 3.1. Crear Servicio Backend

1. En el proyecto de Railway, haz clic en **"+ New"**
2. Selecciona **"GitHub Repo"** (o tu proveedor Git)
3. Selecciona el mismo repositorio
4. Railway detectará automáticamente el `railway.toml` en la raíz

#### 3.2. Configurar Variables de Entorno del Backend

En el servicio de backend, ve a **"Variables"** y agrega:

```env
# Base de datos (copiada del servicio MySQL)
DATABASE_URL=mysql://root:password@hostname:3306/railway

# JWT Secret (genera uno seguro)
JWT_SECRET=tu_secret_jwt_seguro_minimo_32_caracteres_aqui

# Node Environment
NODE_ENV=production
PORT=3001

# Población inicial de base de datos (opcional)
# Usar en el primer despliegue para crear datos demo
SEED_DATABASE=true

# Forzar seed incluso si hay datos (opcional)
FORCE_SEED=false

# CORS - URLs permitidas (separadas por coma)
ALLOWED_ORIGINS=https://tu-frontend.railway.app
```

**Importante:**
- `DATABASE_URL`: Railway genera esta variable automáticamente cuando conectas el servicio MySQL al backend. Ve a **"Settings"** > **"Connect"** en el servicio MySQL y conecta el backend.
- `JWT_SECRET`: Debe tener mínimo 32 caracteres en producción. Usa un generador de secretos seguros.
- `SEED_DATABASE`: Pon `true` en el primer despliegue para poblar la base con datos demo. Después del primer despliegue, cambia a `false`.

#### 3.3. Configurar Root Directory (si es necesario)

1. Ve a **"Settings"** del servicio backend
2. En **"Root Directory"**, deja vacío o usa `backend/` si Railway no detecta automáticamente el servicio

#### 3.4. Conectar Base de Datos al Backend

1. En el servicio MySQL, ve a **"Settings"** > **"Connect"**
2. Haz clic en **"Add Service"** y selecciona el servicio backend
3. Esto creará automáticamente la variable `DATABASE_URL` en el backend

#### 3.5. Desplegar Backend

1. Railway comenzará automáticamente el despliegue cuando detecte el `railway.toml`
2. El proceso incluirá:
   - Build del Dockerfile
   - Generación del cliente Prisma
   - Aplicación de migraciones de base de datos
   - Seed de datos (si `SEED_DATABASE=true`)
   - Inicio del servidor

#### 3.6. Verificar Despliegue del Backend

1. Ve a **"Deployments"** en el servicio backend
2. Espera a que el deployment termine (verás logs en tiempo real)
3. Copia la URL pública del servicio backend (Railway la genera automáticamente)
4. Prueba el endpoint: `https://tu-backend.railway.app/health`

Deberías ver:
```json
{
  "status": "ok",
  "checks": {
    "api": "ok",
    "database": "ok"
  }
}
```

### 4. Desplegar Frontend

#### 4.1. Crear Servicio Frontend

1. En el proyecto de Railway, haz clic en **"+ New"**
2. Selecciona **"GitHub Repo"**
3. Selecciona el mismo repositorio
4. Railway debería detectar el `frontend/railway.toml`

#### 4.2. Configurar Root Directory

1. Ve a **"Settings"** del servicio frontend
2. En **"Root Directory"**, escribe: `frontend`

#### 4.3. Configurar Variables de Entorno del Frontend

En el servicio de frontend, ve a **"Variables"** y agrega:

```env
# URL del backend (obtenida del paso 3.6)
VITE_API_URL=https://tu-backend.railway.app

# Node Environment
NODE_ENV=production
```

**Importante:** 
- `VITE_API_URL` debe configurarse ANTES del primer build, ya que Vite necesita esta variable durante el tiempo de compilación.
- Reemplaza `https://tu-backend.railway.app` con la URL real de tu backend.

#### 4.4. Desplegar Frontend

1. Railway comenzará automáticamente el despliegue
2. El proceso incluirá:
   - Build de la aplicación React con Vite
   - Compilación con la variable `VITE_API_URL` embebida
   - Configuración de Nginx
   - Inicio del servidor Nginx

#### 4.5. Verificar Despliegue del Frontend

1. Ve a **"Deployments"** en el servicio frontend
2. Espera a que el deployment termine
3. Copia la URL pública del servicio frontend
4. Abre la URL en tu navegador

Deberías ver la aplicación DannigOptica funcionando.

### 5. Configurar CORS en Backend

1. Ve al servicio backend > **"Variables"**
2. Actualiza `ALLOWED_ORIGINS` con la URL de tu frontend:
   ```env
   ALLOWED_ORIGINS=https://tu-frontend.railway.app
   ```
3. Si tienes múltiples orígenes, sepáralos por comas:
   ```env
   ALLOWED_ORIGINS=https://tu-frontend.railway.app,https://otra-url.com
   ```
4. Railway redeployará automáticamente el backend

## 🔧 Scripts y Comandos Útiles

### Backend

- **Seed de datos demo:**
  ```bash
  # En Railway, agregar variable de entorno:
  SEED_DATABASE=true
  # Luego hacer redeploy
  ```

- **Forzar seed (incluso si hay datos):**
  ```bash
  FORCE_SEED=true
  ```

- **Ver logs del backend:**
  En Railway Dashboard > Backend service > Deployments > View logs

### Frontend

- **Redeploy después de cambiar VITE_API_URL:**
  Cualquier cambio en `VITE_API_URL` requiere un nuevo build del frontend.

## 🔐 Credenciales Demo (si usaste SEED_DATABASE)

Después del seed inicial, puedes usar estas credenciales:

```
Email: juan.perez@dannig.cl
Password: demo123
```

**Importante:** Cambia estas credenciales en producción.

## 📊 Monitoreo y Logs

- **Logs en tiempo real:** Railway Dashboard > Service > Deployments > View logs
- **Health checks:** 
  - Backend: `https://tu-backend.railway.app/health`
  - Frontend: `https://tu-frontend.railway.app/`

## 🐛 Solución de Problemas

### Backend no inicia

1. Verifica que `DATABASE_URL` esté correctamente configurada
2. Verifica que `JWT_SECRET` tenga al menos 32 caracteres
3. Revisa los logs del deployment para errores específicos

### Frontend no se conecta al backend

1. Verifica que `VITE_API_URL` esté configurada correctamente
2. Verifica que el backend esté funcionando (endpoint `/health`)
3. Verifica que `ALLOWED_ORIGINS` en el backend incluya la URL del frontend
4. **Importante:** Si cambias `VITE_API_URL`, necesitas hacer un redeploy completo del frontend

### Base de datos no conecta

1. Verifica que el servicio MySQL esté conectado al backend
2. Verifica que `DATABASE_URL` tenga el formato correcto: `mysql://user:password@host:port/database`
3. Verifica que el servicio MySQL esté corriendo

### Migraciones fallan

1. El script `railway-init.sh` intentará aplicar migraciones automáticamente
2. Si fallan, revisa los logs para el error específico
3. Puedes conectarte a la base de datos manualmente para verificar el estado

## 📝 Notas Importantes

1. **MySQL vs PostgreSQL:** Este proyecto usa MySQL. Asegúrate de crear un servicio MySQL en Railway, no PostgreSQL.

2. **Variables de entorno de Vite:** Las variables `VITE_*` solo están disponibles durante el build, no en runtime. Por eso `VITE_API_URL` debe configurarse antes del primer despliegue.

3. **CORS:** El backend valida los orígenes permitidos en producción. Asegúrate de configurar `ALLOWED_ORIGINS` correctamente.

4. **Secrets:** Nunca comitees secretos en el código. Usa las Variables de Entorno de Railway.

5. **Costos:** Railway ofrece un plan gratuito limitado. Revisa los límites y precios antes de desplegar en producción.

## 🔄 Actualizaciones y Redeploys

### Actualizar Backend

1. Haz cambios en el código
2. Commit y push a la rama principal
3. Railway detectará automáticamente los cambios y desplegará

### Actualizar Frontend

1. Haz cambios en el código
2. Si cambias `VITE_API_URL`, actualiza la variable de entorno primero
3. Commit y push a la rama principal
4. Railway detectará automáticamente los cambios y desplegará

## 📚 Recursos Adicionales

- [Railway Documentation](https://docs.railway.app)
- [Railway MySQL Guide](https://docs.railway.app/databases/mysql)
- [Prisma Deployment Guide](https://www.prisma.io/docs/guides/deployment)

## ✅ Checklist de Despliegue

- [ ] Proyecto creado en Railway
- [ ] Servicio MySQL creado y conectado
- [ ] Backend desplegado con variables de entorno correctas
- [ ] Backend responde en `/health`
- [ ] Frontend desplegado con `VITE_API_URL` correcta
- [ ] Frontend carga correctamente en el navegador
- [ ] CORS configurado en backend
- [ ] Credenciales demo funcionando (si usaste seed)
- [ ] Logs revisados y sin errores críticos

---

**¿Problemas?** Revisa los logs en Railway Dashboard o abre un issue en el repositorio.

