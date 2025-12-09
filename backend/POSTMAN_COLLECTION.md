# Colección de Postman para Dannig Óptica

Esta guía contiene las pruebas de Postman para los endpoints de autenticación y corrección de roles.

## Endpoints Disponibles

### 1. POST /auth/fix-admin-role
Corrige el rol de administrador para un usuario específico.

**Request:**
```json
POST {{base_url}}/auth/fix-admin-role
Content-Type: application/json

{
  "email": "admin@dannig-optica.cl"
}
```

**Response esperado:**
```json
{
  "ok": true,
  "message": "Rol 'admin' asignado correctamente a admin@dannig-optica.cl",
  "usuario": {
    "id": 1,
    "correo": "admin@dannig-optica.cl",
    "roles": ["admin"]
  }
}
```

**Pruebas:** Usa el archivo `postman-tests-fix-admin-role.js`

---

### 2. GET /auth/diagnostico
Verifica el estado del sistema y del usuario administrador.

**Request:**
```
GET {{base_url}}/auth/diagnostico
```

**Response esperado:**
```json
{
  "jwt": {
    "configurado": true,
    "longitud": 64,
    "detalles": "JWT_SECRET configurado (64 caracteres)",
    "error": ""
  },
  "usuarios": {
    "total": 5,
    "activos": 5,
    "error": "",
    "adminRoles": ["admin"],
    "adminTieneRol": true
  },
  "servidor": {
    "estado": "running",
    "timestamp": "2025-01-XX..."
  }
}
```

**Pruebas:** Usa el archivo `postman-tests-diagnostico.js`

---

## Configuración en Postman

1. **Crear una variable de entorno:**
   - Variable: `base_url`
   - Valor (local): `http://localhost:3000`
   - Valor (producción): `https://tu-backend-url.railway.app`

2. **Importar las pruebas:**
   - Copia el contenido de `postman-tests-fix-admin-role.js` en la pestaña "Tests" de la request correspondiente
   - Copia el contenido de `postman-tests-diagnostico.js` en la pestaña "Tests" de la request correspondiente

3. **Ejecutar las pruebas:**
   - Primero ejecuta `/auth/diagnostico` para verificar el estado actual
   - Si `adminTieneRol` es `false`, ejecuta `/auth/fix-admin-role` con el email del administrador
   - Vuelve a ejecutar `/auth/diagnostico` para verificar que el rol fue asignado correctamente

---

## Solución de Problemas

### El usuario admin no tiene rol asignado
1. Ejecuta `POST /auth/fix-admin-role` con el email del administrador
2. Verifica la respuesta - debería mostrar `"ok": true`
3. Cierra sesión y vuelve a iniciar sesión en el frontend

### El rol existe como "Administrador" en lugar de "admin"
El endpoint `/auth/fix-admin-role` automáticamente:
- Renombra "Administrador" a "admin" si existe
- Asigna el rol "admin" al usuario si no lo tiene

### El módulo de Usuarios no aparece en el menú
1. Verifica que el usuario tiene el rol "admin" usando `/auth/diagnostico`
2. Si no tiene el rol, ejecuta `/auth/fix-admin-role`
3. Cierra sesión completamente y vuelve a iniciar sesión
4. Limpia el localStorage del navegador si es necesario

