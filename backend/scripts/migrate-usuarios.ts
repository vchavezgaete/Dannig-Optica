/**
 * Script de migración para actualizar usuarios del schema antiguo al nuevo
 * Convierte el campo 'nombre' en 'nombres', 'apellidoPaterno', 'apellidoMaterno'
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando migración de usuarios...");

  try {
    // Intentar obtener usuarios con el campo nombre (schema antiguo)
    // Si la base de datos ya tiene el schema nuevo, esto fallará y está bien
    const usuarios = await prisma.$queryRaw<Array<{ idUsuario: number; nombre?: string; nombres?: string }>>`
      SELECT id_usuario, nombre, nombres 
      FROM usuario 
      WHERE nombre IS NOT NULL AND (nombres IS NULL OR nombres = '')
    `;

    if (usuarios.length === 0) {
      console.log("✓ No hay usuarios que migrar. La base de datos ya está actualizada.");
      return;
    }

    console.log(`Encontrados ${usuarios.length} usuarios para migrar...`);

    for (const usuario of usuarios) {
      if (usuario.nombre && !usuario.nombres) {
        // Dividir el nombre en partes
        const partes = usuario.nombre.trim().split(/\s+/);
        const nombres = partes[0] || "";
        const apellidoPaterno = partes[1] || "";
        const apellidoMaterno = partes.slice(2).join(" ") || null;

        try {
          // Actualizar usando query raw para evitar problemas de schema
          await prisma.$executeRaw`
            UPDATE usuario 
            SET nombres = ${nombres},
                apellido_paterno = ${apellidoPaterno},
                apellido_materno = ${apellidoMaterno}
            WHERE id_usuario = ${usuario.idUsuario}
          `;

          console.log(`✓ Usuario ${usuario.idUsuario} migrado: "${usuario.nombre}" -> "${nombres} ${apellidoPaterno}"`);
        } catch (error: any) {
          console.error(`✗ Error migrando usuario ${usuario.idUsuario}:`, error.message);
        }
      }
    }

    console.log("✓ Migración completada");
  } catch (error: any) {
    // Si el error es porque la tabla no tiene el campo 'nombre', significa que ya está migrada
    if (error.message?.includes("Unknown column 'nombre'") || error.code === "P2010") {
      console.log("✓ La base de datos ya está usando el schema nuevo. No se requiere migración.");
    } else {
      console.error("Error en migración:", error);
      throw error;
    }
  }
}

main()
  .catch((error) => {
    console.error("Error fatal:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

