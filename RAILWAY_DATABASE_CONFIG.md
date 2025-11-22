# Configuración de Base de Datos MySQL en Railway

## 📋 Información de la Base de Datos

### Tipo de Base de Datos
- **Tipo:** MySQL 8.0
- **ORM:** Prisma
- **Provider:** `mysql` (según `backend/prisma/schema.prisma`)

### Estructura del Schema
El proyecto incluye las siguientes tablas principales:
- `usuario` - Usuarios del sistema
- `rol` - Roles de usuarios
- `usuario_rol` - Relación usuarios-roles
- `cliente` - Clientes
- `operativo` - Operativos
- `cita` - Citas
- `ficha_clinica` - Fichas clínicas
- `receta` - Recetas
- `producto` - Productos
- `venta` - Ventas
- `item_venta` - Items de venta
- `garantia` - Garantías
- `alerta` - Alertas

## 🔧 Configuración en Railway Dashboard

### Paso 1: Crear Base de Datos MySQL

1. **Ir a Railway Dashboard** → Tu Proyecto
2. **Crear un nuevo servicio:**
   - Click en **"New"** → **"Database"** → **"MySQL"**
   - Railway creará automáticamente una base de datos MySQL

3. **Railway generará automáticamente:**
   - Host (`MYSQLHOST`)
   - Puerto (`MYSQLPORT`) - típicamente `3306`
   - Usuario (`MYSQLUSER`)
   - Contraseña (`MYSQLPASSWORD`)
   - Base de datos (`MYSQLDATABASE`)

### Paso 2: Conectar MySQL al Servicio Backend

1. **En el servicio MySQL recién creado:**
   - Click en **"Connect"** (botón en la parte superior)
   - Busca tu servicio **Backend** en la lista
   - Selecciónalo y confirma

2. **Railway creará automáticamente la variable de entorno `DATABASE_URL`**
   - Esta variable estará disponible en tu servicio Backend
   - Formato: `mysql://usuario:password@host:port/database`

### Paso 3: Verificar Variables de Entorno

En el servicio **Backend**, verifica que tengas estas variables:

#### Variables Requeridas:

```bash
# Base de Datos (creada automáticamente por Railway al conectar MySQL)
DATABASE_URL=mysql://usuario:password@host:port/database

# Seguridad JWT (debes crearla manualmente)
JWT_SECRET=tu-secret-super-seguro-de-al-menos-32-caracteres

# Opcional: Seed de datos iniciales (solo para primer despliegue)
SEED_DATABASE=true
```

#### Variables Opcionales:

```bash
# Puerto del servidor (Railway lo asigna automáticamente)
PORT=3001

# Entorno
NODE_ENV=production

# CORS (si tienes dominio personalizado)
ALLOWED_ORIGINS=https://tu-frontend.railway.app

# Forzar seed (para re-poblar datos)
FORCE_SEED=false
```

## 📝 Formato de DATABASE_URL

El formato esperado por el proyecto es:

```
mysql://usuario:password@host:port/nombre_base_datos
```

**Ejemplo real (Railway lo genera automáticamente):**
```
mysql://root:abc123def456@containers-us-west-xxx.railway.app:3306/railway
```

### Desglose de Componentes:

- **Protocolo:** `mysql://` (obligatorio)
- **Usuario:** Generado por Railway (ej: `root`)
- **Contraseña:** Generada por Railway (ej: `abc123def456`)
- **Host:** Host de Railway (ej: `containers-us-west-xxx.railway.app`)
- **Puerto:** Típicamente `3306`
- **Base de datos:** Nombre generado por Railway (ej: `railway`)

## 🔍 Verificar Conexión

### Opción 1: Desde Railway Dashboard

1. Ve a tu servicio **MySQL** en Railway Dashboard
2. Click en **"Connect"** tab
3. Verás todas las variables generadas automáticamente:
   - `MYSQLHOST`
   - `MYSQLPORT`
   - `MYSQLUSER`
   - `MYSQLPASSWORD`
   - `MYSQLDATABASE`
   - `DATABASE_URL` (para servicios conectados)

### Opción 2: Desde el Servicio Backend

1. Ve a tu servicio **Backend** en Railway Dashboard
2. Click en **"Variables"** tab
3. Busca `DATABASE_URL`
4. Debería estar configurada automáticamente si conectaste MySQL

### Opción 3: Desde los Logs del Backend

Al iniciar el backend, verás en los logs:
```
✅ Environment variables configured correctly
   PORT: 3001
   DATABASE_URL: mysql://root@***  # Contraseña enmascarada
```

## ⚠️ Importante: MySQL vs PostgreSQL

**El proyecto requiere MySQL, NO PostgreSQL.**

Si accidentalmente creaste PostgreSQL:
1. Elimina el servicio PostgreSQL
2. Crea un nuevo servicio **MySQL** (no PostgreSQL)
3. Conecta MySQL al Backend
4. Verifica que `DATABASE_URL` empiece con `mysql://`

## 🚀 Migraciones y Seed

El script de inicialización (`backend/scripts/railway-init.sh`) maneja automáticamente:

1. **Generación de Prisma Client:**
   ```bash
   npx prisma generate
   ```

2. **Migraciones de Base de Datos:**
   ```bash
   npx prisma db push --accept-data-loss --skip-generate
   ```

3. **Seed de Datos (si `SEED_DATABASE=true`):**
   ```bash
   npx ts-node --transpile-only scripts/seed-demo-data.ts
   ```

### Activar Seed Inicial

Para poblar la base de datos con datos de demostración:

1. Ve a tu servicio **Backend** → **Variables**
2. Agrega o modifica:
   ```
   SEED_DATABASE=true
   ```
3. Guarda y redeploya el servicio

**Nota:** Solo activa `SEED_DATABASE=true` en el primer despliegue, o si quieres re-poblar los datos.

## 📊 Tablas Creadas Automáticamente

Cuando el backend se inicia por primera vez, Prisma creará automáticamente estas tablas:

- `usuario`
- `rol`
- `usuario_rol`
- `cliente`
- `operativo`
- `cita`
- `ficha_clinica`
- `receta`
- `producto`
- `venta`
- `item_venta`
- `garantia`
- `alerta`

## 🔐 Seguridad

### Variables Sensibles

- **`DATABASE_URL`:** Contiene credenciales de la base de datos - **NO compartir**
- **`JWT_SECRET`:** Secret para tokens JWT - **NO compartir**

### Mejores Prácticas

1. **JWT_SECRET:**
   - Mínimo 32 caracteres en producción
   - Usa un generador de secretos aleatorios
   - Ejemplo: `openssl rand -base64 32`

2. **DATABASE_URL:**
   - Railway la genera automáticamente
   - No necesitas modificarla manualmente
   - Está enmascarada en los logs del backend

## 🐛 Solución de Problemas

### Error: "DATABASE_URL is not configured"

**Solución:**
1. Verifica que hayas conectado MySQL al servicio Backend
2. Ve a Backend → Variables → Busca `DATABASE_URL`
3. Si no existe, conecta MySQL manualmente desde el servicio MySQL

### Error: "Se detectó PostgreSQL, pero el proyecto requiere MySQL"

**Solución:**
1. Elimina el servicio PostgreSQL
2. Crea un nuevo servicio MySQL
3. Conecta MySQL al Backend
4. Verifica que `DATABASE_URL` empiece con `mysql://`

### Error: "Failed to generate Prisma client"

**Solución:**
1. Verifica que `DATABASE_URL` tenga el formato correcto
2. Verifica que la base de datos esté accesible
3. Revisa los logs del servicio MySQL en Railway

### Error: "Migration failed"

**Solución:**
1. El script tiene reintentos automáticos (3 intentos)
2. Verifica que la base de datos esté completamente iniciada
3. Revisa los logs del backend para ver el error específico
4. Si persiste, conecta manualmente a MySQL y verifica la conexión

## 📚 Referencias

- [Railway MySQL Documentation](https://docs.railway.app/databases/mysql)
- [Prisma MySQL Documentation](https://www.prisma.io/docs/concepts/database-connectors/mysql)
- [Schema Prisma del Proyecto](./backend/prisma/schema.prisma)

