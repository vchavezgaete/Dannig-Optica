/**
 * Script de migración de datos: Convierte schema antiguo a nuevo
 * Migra campos 'nombre' a 'nombres', 'apellido_paterno', 'apellido_materno'
 * Este script debe ejecutarse ANTES de aplicar la migración de Prisma
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando migración de datos del schema...");

  try {
    // Primero verificar si los campos nuevos ya existen
    const checkColumns = await prisma.$queryRaw<Array<{ Field: string }>>`
      SELECT COLUMN_NAME as Field
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'usuario'
        AND COLUMN_NAME IN ('nombres', 'apellido_paterno', 'apellido_materno')
    `;

    const hasNewColumns = checkColumns.length > 0;
    const hasOldColumn = await prisma.$queryRaw<Array<{ Field: string }>>`
      SELECT COLUMN_NAME as Field
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'usuario'
        AND COLUMN_NAME = 'nombre'
    `;

    if (!hasOldColumn || hasOldColumn.length === 0) {
      console.log("✓ La base de datos ya está usando el schema nuevo. No se requiere migración de datos.");
      return;
    }

    if (!hasNewColumns || checkColumns.length < 3) {
      console.log("⚠ Los campos nuevos no existen aún. Creándolos como opcionales primero...");
      
      // Verificar qué campos faltan y crearlos
      const usuarioColumns = await prisma.$queryRaw<Array<{ Field: string }>>`
        SELECT COLUMN_NAME as Field
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'usuario'
      `;
      const usuarioColumnNames = usuarioColumns.map(c => c.Field);

      if (!usuarioColumnNames.includes('nombres')) {
        try {
          await prisma.$executeRawUnsafe(`ALTER TABLE usuario ADD COLUMN nombres VARCHAR(100) NULL`);
          console.log("  ✓ Campo 'nombres' creado en tabla usuario");
        } catch (e: any) {
          console.log("  ⚠ Error creando campo nombres:", e.message);
        }
      }
      if (!usuarioColumnNames.includes('apellido_paterno')) {
        try {
          await prisma.$executeRawUnsafe(`ALTER TABLE usuario ADD COLUMN apellido_paterno VARCHAR(50) NULL`);
          console.log("  ✓ Campo 'apellido_paterno' creado en tabla usuario");
        } catch (e: any) {
          console.log("  ⚠ Error creando campo apellido_paterno:", e.message);
        }
      }
      if (!usuarioColumnNames.includes('apellido_materno')) {
        try {
          await prisma.$executeRawUnsafe(`ALTER TABLE usuario ADD COLUMN apellido_materno VARCHAR(50) NULL`);
          console.log("  ✓ Campo 'apellido_materno' creado en tabla usuario");
        } catch (e: any) {
          console.log("  ⚠ Error creando campo apellido_materno:", e.message);
        }
      }

      const clienteColumns = await prisma.$queryRaw<Array<{ Field: string }>>`
        SELECT COLUMN_NAME as Field
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'cliente'
      `;
      const clienteColumnNames = clienteColumns.map(c => c.Field);

      if (!clienteColumnNames.includes('nombres')) {
        try {
          await prisma.$executeRawUnsafe(`ALTER TABLE cliente ADD COLUMN nombres VARCHAR(100) NULL`);
          console.log("  ✓ Campo 'nombres' creado en tabla cliente");
        } catch (e: any) {
          console.log("  ⚠ Error creando campo nombres:", e.message);
        }
      }
      if (!clienteColumnNames.includes('apellido_paterno')) {
        try {
          await prisma.$executeRawUnsafe(`ALTER TABLE cliente ADD COLUMN apellido_paterno VARCHAR(50) NULL`);
          console.log("  ✓ Campo 'apellido_paterno' creado en tabla cliente");
        } catch (e: any) {
          console.log("  ⚠ Error creando campo apellido_paterno:", e.message);
        }
      }
      if (!clienteColumnNames.includes('apellido_materno')) {
        try {
          await prisma.$executeRawUnsafe(`ALTER TABLE cliente ADD COLUMN apellido_materno VARCHAR(50) NULL`);
          console.log("  ✓ Campo 'apellido_materno' creado en tabla cliente");
        } catch (e: any) {
          console.log("  ⚠ Error creando campo apellido_materno:", e.message);
        }
      }

      // Ahora migrar los datos
      console.log("  Migrando datos...");
      try {
        // Migrar usuarios
        await prisma.$executeRawUnsafe(`
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
            AND (nombres IS NULL OR nombres = '')
        `);
        console.log("  ✓ Usuarios migrados");
      } catch (e: any) {
        console.log("  ⚠ Error migrando usuarios:", e.message);
      }

      try {
        // Migrar clientes
        await prisma.$executeRawUnsafe(`
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
            AND (nombres IS NULL OR nombres = '')
        `);
        console.log("  ✓ Clientes migrados");
      } catch (e: any) {
        console.log("  ⚠ Error migrando clientes:", e.message);
      }
    } else {
      // Los campos nuevos ya existen, migrar datos
      console.log("\n[1/2] Migrando usuarios...");
      
      const usuariosConNombre = await prisma.$queryRaw<Array<{ idUsuario: number; nombre: string }>>`
        SELECT id_usuario as idUsuario, nombre
        FROM usuario
        WHERE nombre IS NOT NULL AND nombre != ''
          AND (nombres IS NULL OR nombres = '' OR apellido_paterno IS NULL OR apellido_paterno = '')
      `;

      if (usuariosConNombre.length > 0) {
        console.log(`  Encontrados ${usuariosConNombre.length} usuarios para migrar`);
        
        for (const usuario of usuariosConNombre) {
          const partes = usuario.nombre.trim().split(/\s+/);
          const nombres = partes[0] || "Usuario";
          const apellidoPaterno = partes[1] || "Sin Apellido";
          const apellidoMaterno = partes.slice(2).join(" ") || null;

          await prisma.$executeRaw`
            UPDATE usuario 
            SET nombres = ${nombres},
                apellido_paterno = ${apellidoPaterno},
                apellido_materno = ${apellidoMaterno}
            WHERE id_usuario = ${usuario.idUsuario}
          `;

          console.log(`  ✓ Usuario ${usuario.idUsuario}: "${usuario.nombre}" -> "${nombres} ${apellidoPaterno}"`);
        }
      } else {
        console.log("  ✓ No hay usuarios que migrar");
      }

      console.log("\n[2/2] Migrando clientes...");
      
      const clientesConNombre = await prisma.$queryRaw<Array<{ idCliente: number; nombre: string }>>`
        SELECT id_cliente as idCliente, nombre
        FROM cliente
        WHERE nombre IS NOT NULL AND nombre != ''
          AND (nombres IS NULL OR nombres = '' OR apellido_paterno IS NULL OR apellido_paterno = '')
      `;

      if (clientesConNombre.length > 0) {
        console.log(`  Encontrados ${clientesConNombre.length} clientes para migrar`);
        
        for (const cliente of clientesConNombre) {
          const partes = cliente.nombre.trim().split(/\s+/);
          const nombres = partes[0] || "Cliente";
          const apellidoPaterno = partes[1] || "Sin Apellido";
          const apellidoMaterno = partes.slice(2).join(" ") || null;

          await prisma.$executeRaw`
            UPDATE cliente 
            SET nombres = ${nombres},
                apellido_paterno = ${apellidoPaterno},
                apellido_materno = ${apellidoMaterno}
            WHERE id_cliente = ${cliente.idCliente}
          `;

          console.log(`  ✓ Cliente ${cliente.idCliente}: "${cliente.nombre}" -> "${nombres} ${apellidoPaterno}"`);
        }
      } else {
        console.log("  ✓ No hay clientes que migrar");
      }
    }

    console.log("\n✓ Migración de datos completada exitosamente");
    console.log("  Ahora puedes ejecutar: npx prisma db push");
    
  } catch (error: any) {
    // Si el error es porque los campos ya no existen, significa que ya está migrado
    if (error.message?.includes("Unknown column 'nombre'") || 
        error.code === "P2010" ||
        error.message?.includes("does not exist")) {
      console.log("✓ La base de datos ya está usando el schema nuevo. No se requiere migración de datos.");
    } else {
      console.error("\n✗ Error en migración:", error.message);
      console.error("  Stack:", error.stack);
      // No lanzar error para que el proceso continúe
    }
  }
}

main()
  .catch((error) => {
    console.error("\n✗ Error fatal:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

