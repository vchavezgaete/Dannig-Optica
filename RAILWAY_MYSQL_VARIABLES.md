# Variables de Entorno MySQL en Railway

## 📋 Variables Generadas Automáticamente por Railway

Cuando creas un servicio MySQL en Railway, estas variables son generadas **automáticamente** y no necesitas configurarlas manualmente:

### Variables del Servicio MySQL

```bash
# Nombre de la base de datos
MYSQL_DATABASE="railway"

# Contraseña del usuario root
MYSQL_ROOT_PASSWORD="XcuMUAjEozNFiyldkPEwutZFvcAEPwZv"

# Usuario de la base de datos
MYSQLUSER="root"

# Host privado de Railway (para conexión interna)
MYSQLHOST="${{RAILWAY_PRIVATE_DOMAIN}}"

# Puerto de MySQL
MYSQLPORT="3306"

# Nombre de la base de datos (alias de MYSQL_DATABASE)
MYSQLDATABASE="${{MYSQL_DATABASE}}"

# Contraseña de MySQL (alias de MYSQL_ROOT_PASSWORD)
MYSQLPASSWORD="${{MYSQL_ROOT_PASSWORD}}"
```

### URLs de Conexión Generadas

```bash
# URL privada para conexión interna entre servicios
MYSQL_URL="mysql://${{MYSQLUSER}}:${{MYSQL_ROOT_PASSWORD}}@${{RAILWAY_PRIVATE_DOMAIN}}:3306/${{MYSQL_DATABASE}}"

# URL pública (si necesitas conexión externa)
MYSQL_PUBLIC_URL="mysql://${{MYSQLUSER}}:${{MYSQL_ROOT_PASSWORD}}@${{RAILWAY_TCP_PROXY_DOMAIN}}:${{RAILWAY_TCP_PROXY_PORT}}/${{MYSQL_DATABASE}}"
```

## 🔗 Variables en el Servicio Backend (Conectado)

Cuando conectas el servicio MySQL al Backend en Railway Dashboard, Railway crea automáticamente la variable `DATABASE_URL` en el servicio Backend:

```bash
# Variable creada automáticamente en el Backend cuando conectas MySQL
DATABASE_URL="mysql://root:XcuMUAjEozNFiyldkPEwutZFvcAEPwZv@${{RAILWAY_PRIVATE_DOMAIN}}:3306/railway"
```

**Formato completo expandido:**
```
mysql://root:XcuMUAjEozNFiyldkPEwutZFvcAEPwZv@railway-proxy.railway.app:3306/railway
```

## 📝 Variables de Dominio de Railway

Railway proporciona estas variables internas que se resuelven automáticamente:

- `${{RAILWAY_PRIVATE_DOMAIN}}` - Dominio privado para conexiones internas entre servicios
- `${{RAILWAY_TCP_PROXY_DOMAIN}}` - Dominio público TCP proxy (si habilitas TCP proxy)
- `${{RAILWAY_TCP_PROXY_PORT}}` - Puerto del TCP proxy (si habilitas TCP proxy)

## ✅ Verificación en Railway Dashboard

### 1. Ver Variables del Servicio MySQL

1. Ve a **Railway Dashboard** → Tu Proyecto
2. Click en el servicio **MySQL**
3. Click en la pestaña **"Variables"** o **"Connect"**
4. Verás todas las variables listadas arriba

### 2. Ver Variables en el Servicio Backend

1. Ve a **Railway Dashboard** → Tu Proyecto
2. Click en el servicio **Backend**
3. Click en la pestaña **"Variables"**
4. Busca `DATABASE_URL` - debería estar configurada automáticamente

### 3. Conectar MySQL al Backend

Si `DATABASE_URL` no está en el Backend:

1. Ve al servicio **MySQL** → Pestaña **"Connect"**
2. Busca tu servicio **Backend** en la lista
3. Click en **"Connect"** o selecciónalo
4. Railway creará automáticamente `DATABASE_URL` en el Backend

## 🔐 Valores Reales (Ejemplo)

Basándote en los datos que proporcionaste:

```bash
# Base de datos
MYSQL_DATABASE="railway"
MYSQLDATABASE="railway"

# Usuario
MYSQLUSER="root"

# Contraseña
MYSQL_ROOT_PASSWORD="XcuMUAjEozNFiyldkPEwutZFvcAEPwZv"
MYSQLPASSWORD="XcuMUAjEozNFiyldkPEwutZFvcAEPwZv"

# Host y Puerto
MYSQLHOST="${{RAILWAY_PRIVATE_DOMAIN}}"  # Se resuelve automáticamente (ej: railway-proxy.railway.app)
MYSQLPORT="3306"

# URLs de conexión
MYSQL_URL="mysql://root:XcuMUAjEozNFiyldkPEwutZFvcAEPwZv@${{RAILWAY_PRIVATE_DOMAIN}}:3306/railway"
DATABASE_URL="mysql://root:XcuMUAjEozNFiyldkPEwutZFvcAEPwZv@${{RAILWAY_PRIVATE_DOMAIN}}:3306/railway"
```

## ⚠️ Importante: No Configurar Manualmente

**Estas variables son generadas automáticamente por Railway.** 

No necesitas:
- ❌ Crearlas manualmente
- ❌ Copiarlas manualmente al Backend
- ❌ Modificarlas manualmente

**Railway las gestiona automáticamente cuando:**
- ✅ Creas un servicio MySQL
- ✅ Conectas MySQL a otro servicio (Backend)
- ✅ Railway genera las variables de conexión

## 🚀 Configuración Requerida en Backend

Las **únicas variables** que debes configurar manualmente en el servicio Backend son:

```bash
# ⚠️ DEBES CONFIGURAR ESTA MANUALMENTE
JWT_SECRET="tu-secret-super-seguro-de-al-menos-32-caracteres"

# ✅ ESTA SE CREA AUTOMÁTICAMENTE AL CONECTAR MySQL
DATABASE_URL="mysql://root:password@host:3306/railway"

# 🔧 OPCIONAL: Para poblar datos iniciales (solo primer despliegue)
SEED_DATABASE="true"
```

## 📊 Flujo de Conexión Automática

```
1. Creas servicio MySQL en Railway
   └─ Railway genera: MYSQL_DATABASE, MYSQL_ROOT_PASSWORD, MYSQLUSER, etc.

2. Creas servicio Backend en Railway
   └─ Railway detecta el repositorio y Dockerfile

3. Conectas MySQL al Backend (en MySQL → Connect)
   └─ Railway crea automáticamente: DATABASE_URL en el Backend

4. Backend se inicia y usa DATABASE_URL
   └─ Prisma se conecta a MySQL usando DATABASE_URL
```

## 🔍 Verificar Conexión

### Desde los Logs del Backend

Al iniciar el backend, verás:

```
🚀 Starting DannigOptica Backend on Railway...
📋 Verifying environment variables...
✅ Environment variables configured correctly
   PORT: 3001
   DATABASE_URL: mysql://root@***  # Contraseña enmascarada
⚙️  Generating Prisma client...
✅ Prisma client generated
🔄 Applying database migrations...
✅ Database migrations applied successfully
```

### Si ves Error de Conexión

1. **Verifica que MySQL esté conectado al Backend:**
   - MySQL → Connect → Verifica que Backend esté en la lista

2. **Verifica que DATABASE_URL exista en Backend:**
   - Backend → Variables → Busca `DATABASE_URL`

3. **Verifica el formato de DATABASE_URL:**
   - Debe empezar con `mysql://`
   - No debe tener espacios
   - Debe incluir usuario, contraseña, host, puerto y base de datos

## 📚 Referencias

- [Railway MySQL Documentation](https://docs.railway.app/databases/mysql)
- [Railway Variables Documentation](https://docs.railway.app/variables)
- [Railway Service Connections](https://docs.railway.app/deploy/service-connections)

