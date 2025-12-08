-- Script SQL para migrar datos del schema antiguo al nuevo
-- Ejecutar ANTES de prisma db push

-- Migrar usuarios: convertir campo 'nombre' a 'nombres', 'apellido_paterno', 'apellido_materno'
-- Solo si los campos nuevos no existen o están vacíos
UPDATE usuario 
SET 
  nombres = SUBSTRING_INDEX(nombre, ' ', 1),
  apellido_paterno = IF(
    LOCATE(' ', nombre) > 0,
    SUBSTRING_INDEX(SUBSTRING_INDEX(nombre, ' ', 2), ' ', -1),
    'Sin Apellido'
  ),
  apellido_materno = IF(
    (LENGTH(nombre) - LENGTH(REPLACE(nombre, ' ', ''))) >= 2,
    SUBSTRING(nombre, LOCATE(' ', nombre, LOCATE(' ', nombre) + 1) + 1),
    NULL
  )
WHERE 
  nombre IS NOT NULL 
  AND nombre != ''
  AND (nombres IS NULL OR nombres = '' OR apellido_paterno IS NULL OR apellido_paterno = '');

-- Migrar clientes: convertir campo 'nombre' a 'nombres', 'apellido_paterno', 'apellido_materno'
UPDATE cliente 
SET 
  nombres = SUBSTRING_INDEX(nombre, ' ', 1),
  apellido_paterno = IF(
    LOCATE(' ', nombre) > 0,
    SUBSTRING_INDEX(SUBSTRING_INDEX(nombre, ' ', 2), ' ', -1),
    'Sin Apellido'
  ),
  apellido_materno = IF(
    (LENGTH(nombre) - LENGTH(REPLACE(nombre, ' ', ''))) >= 2,
    SUBSTRING(nombre, LOCATE(' ', nombre, LOCATE(' ', nombre) + 1) + 1),
    NULL
  )
WHERE 
  nombre IS NOT NULL 
  AND nombre != ''
  AND (nombres IS NULL OR nombres = '' OR apellido_paterno IS NULL OR apellido_paterno = '');

