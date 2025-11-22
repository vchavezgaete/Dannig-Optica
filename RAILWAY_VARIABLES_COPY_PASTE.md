# Variables de Entorno para Railway - Copiar y Pegar

## 🎯 Variables por Servicio

### 📦 SERVICIO: MySQL (Database)
**✅ Estas variables son GENERADAS AUTOMÁTICAMENTE por Railway**
**❌ NO necesitas configurarlas manualmente**

Railway las genera automáticamente cuando creas el servicio MySQL. Solo necesitas:
1. Crear servicio MySQL en Railway Dashboard
2. Conectar MySQL al servicio Backend (esto crea `DATABASE_URL` automáticamente)

---

## 🔧 SERVICIO: Backend

### Variables REQUERIDAS (debes configurarlas manualmente)

```bash
JWT_SECRET=tu-secret-super-seguro-de-al-menos-32-caracteres-minimo-en-produccion
```

**⚠️ IMPORTANTE:** 
- Mínimo 32 caracteres en producción
- Genera uno seguro con: `openssl rand -base64 32`
- Ejemplo seguro: `aBc123XyZ789Def456GhI012JkL345MnO678PqR901StU234VwX567YzA890`

### Variables OPCIONALES (para primer despliegue)

```bash
# Para poblar la base de datos con datos iniciales (solo primer despliegue)
SEED_DATABASE=true

# Para forzar seed aunque ya existan datos (no recomendado)
FORCE_SEED=false
```

### Variables OPCIONALES (CORS - si usas dominio personalizado)

```bash
# URLs permitidas para CORS (separadas por comas)
# Reemplaza con las URLs reales de tu frontend
ALLOWED_ORIGINS=https://tu-frontend.railway.app,https://tu-dominio-custom.com
```

### Variables AUTOMÁTICAS (creadas por Railway)

```bash
# ✅ Creada automáticamente al conectar MySQL al Backend
DATABASE_URL=mysql://root:password@host:3306/railway

# ✅ Configuradas automáticamente por Railway
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
```

---

## 🎨 SERVICIO: Frontend

### Variables REQUERIDAS (debes configurarlas ANTES del primer build)

```bash
# URL del backend (obténla después de desplegar el backend)
# Reemplaza con la URL real de tu backend en Railway
VITE_API_URL=https://tu-backend.railway.app
```

**⚠️ IMPORTANTE:**
- Debe configurarse ANTES del primer build del frontend
- Obtén la URL del backend después de desplegarlo
- Formato: `https://nombre-servicio.up.railway.app` o `https://nombre-servicio.railway.app`

### Variables AUTOMÁTICAS (configuradas por Railway)

```bash
# ✅ Configurada automáticamente por Railway
NODE_ENV=production
```

---

## 📋 Lista Completa para Copiar y Pegar

### 🔧 Backend - Variables Mínimas Requeridas

**Copia y pega esto en Railway Dashboard → Backend → Variables:**

```bash
JWT_SECRET=aBc123XyZ789Def456GhI012JkL345MnO678PqR901StU234VwX567YzA890
```

**Para poblar datos iniciales (solo primer despliegue), agrega:**

```bash
SEED_DATABASE=true
```

**Después de obtener la URL del frontend, agrega (opcional):**

```bash
ALLOWED_ORIGINS=https://tu-frontend.railway.app
```

---

### 🎨 Frontend - Variables Requeridas

**Copia y pega esto en Railway Dashboard → Frontend → Variables:**

**⚠️ IMPORTANTE: Reemplaza `https://tu-backend.railway.app` con la URL real de tu backend**

```bash
VITE_API_URL=https://tu-backend.railway.app
```

**Ejemplo real (reemplaza con tu URL):**

```bash
VITE_API_URL=https://dannig-optica-production.up.railway.app
```

---

## 🚀 Orden de Configuración Paso a Paso

### Paso 1: Configurar Backend

1. **Crear servicio MySQL:**
   - Railway Dashboard → New → Database → MySQL
   - Railway genera automáticamente todas las variables de MySQL

2. **Crear servicio Backend:**
   - Railway Dashboard → New → Service → GitHub Repo (tu repo)
   - Root Directory: (vacío/raíz)
   - Conectar MySQL al Backend (MySQL → Connect → Backend)

3. **Agregar variables en Backend → Variables:**
   ```bash
   JWT_SECRET=aBc123XyZ789Def456GhI012JkL345MnO678PqR901StU234VwX567YzA890
   SEED_DATABASE=true
   ```

4. **Esperar a que el Backend se despliegue y obtener su URL:**
   - Ve a Backend → Settings → Domain
   - Copia la URL (ej: `https://dannig-optica-production.up.railway.app`)

### Paso 2: Configurar Frontend

1. **Crear servicio Frontend:**
   - Railway Dashboard → New → Service → GitHub Repo (tu repo)
   - Root Directory: `frontend`

2. **Agregar variables en Frontend → Variables (ANTES del build):**
   ```bash
   VITE_API_URL=https://dannig-optica-production.up.railway.app
   ```
   **⚠️ Usa la URL real del backend del Paso 1.4**

3. **Esperar a que el Frontend se despliegue y obtener su URL:**
   - Ve a Frontend → Settings → Domain
   - Copia la URL (ej: `https://dannig-frontend-production.up.railway.app`)

### Paso 3: Configurar CORS (Opcional)

1. **Volver a Backend → Variables:**
   - Agrega o actualiza:
   ```bash
   ALLOWED_ORIGINS=https://dannig-frontend-production.up.railway.app
   ```
   **⚠️ Usa la URL real del frontend del Paso 2.3**

2. **Redeploy Backend** (si es necesario)

---

## 🔐 Generar JWT_SECRET Seguro

### Opción 1: Usando OpenSSL (Recomendado)

```bash
openssl rand -base64 32
```

### Opción 2: Usando Node.js

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Opción 3: Generador Online

Usa un generador de secretos aleatorios confiable.

**Ejemplo de JWT_SECRET válido (64 caracteres):**
```
aBc123XyZ789Def456GhI012JkL345MnO678PqR901StU234VwX567YzA890
```

---

## ✅ Verificación

### Backend - Verificar Variables

En Railway Dashboard → Backend → Variables, debes tener:

- ✅ `DATABASE_URL` (automática) - Debe empezar con `mysql://`
- ✅ `JWT_SECRET` (manual) - Mínimo 32 caracteres
- ✅ `NODE_ENV=production` (automática)
- ✅ `PORT=3001` (automática)
- 🔧 `SEED_DATABASE=true` (opcional, solo primer despliegue)
- 🔧 `ALLOWED_ORIGINS` (opcional, después de desplegar frontend)

### Frontend - Verificar Variables

En Railway Dashboard → Frontend → Variables, debes tener:

- ✅ `VITE_API_URL` (manual) - URL del backend
- ✅ `NODE_ENV=production` (automática)

---

## 🐛 Solución de Problemas

### Error: "JWT_SECRET must be at least 32 characters"

**Solución:** Genera un nuevo JWT_SECRET con al menos 32 caracteres:
```bash
openssl rand -base64 32
```

### Error: "DATABASE_URL is not configured"

**Solución:** 
1. Verifica que MySQL esté conectado al Backend
2. MySQL → Connect → Verifica que Backend esté en la lista
3. Backend → Variables → Busca `DATABASE_URL`

### Error: "Cannot find module 'vite'" o problemas con VITE_API_URL

**Solución:**
1. Verifica que `VITE_API_URL` esté configurada ANTES del build
2. Si ya hiciste el build, debes:
   - Configurar `VITE_API_URL`
   - Hacer redeploy completo del frontend

### Error: CORS bloqueado

**Solución:**
1. Agrega la URL del frontend en Backend → Variables:
   ```bash
   ALLOWED_ORIGINS=https://tu-frontend.railway.app
   ```
2. Si usas múltiples dominios, sepáralos por comas:
   ```bash
   ALLOWED_ORIGINS=https://frontend1.railway.app,https://frontend2.railway.app
   ```

---

## 📚 Resumen Rápido

### Backend - Mínimo Requerido

```bash
JWT_SECRET=aBc123XyZ789Def456GhI012JkL345MnO678PqR901StU234VwX567YzA890
SEED_DATABASE=true
```

### Frontend - Mínimo Requerido

```bash
VITE_API_URL=https://tu-backend.railway.app
```

**⚠️ Reemplaza `https://tu-backend.railway.app` con la URL real de tu backend**

---

## 📝 Notas Finales

1. **DATABASE_URL** se crea automáticamente al conectar MySQL al Backend
2. **VITE_API_URL** debe configurarse ANTES del primer build del frontend
3. **JWT_SECRET** debe tener mínimo 32 caracteres
4. **SEED_DATABASE** solo se usa en el primer despliegue
5. **ALLOWED_ORIGINS** se configura después de tener la URL del frontend

---

¡Listo para copiar y pegar! 🚀

