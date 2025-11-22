// Script to migrate data from local database to Railway
// This script exports all data from local MySQL and imports it to Railway MySQL
// 
// Usage:
//   DATABASE_URL_LOCAL="mysql://user:pass@localhost:3306/dannig" \
//   DATABASE_URL_RAILWAY="mysql://user:pass@host:port/railway" \
//   npx ts-node --transpile-only scripts/migrate-to-railway.ts
//
// Or set environment variables in .env.local and .env.railway files

import { PrismaClient } from "@prisma/client";

// Load environment variables (if dotenv is available)
try {
  const dotenv = require("dotenv");
  dotenv.config({ path: ".env.local" });
  dotenv.config({ path: ".env.railway" });
} catch {
  // dotenv is optional, environment variables can be set directly
}

// Database URLs
const DATABASE_URL_LOCAL = process.env.DATABASE_URL_LOCAL || process.env.DATABASE_URL;
const DATABASE_URL_RAILWAY = process.env.DATABASE_URL_RAILWAY || process.env.RAILWAY_DATABASE_URL;

if (!DATABASE_URL_LOCAL) {
  console.error("[ERROR] DATABASE_URL_LOCAL is not configured");
  console.error("        Set DATABASE_URL_LOCAL or DATABASE_URL environment variable");
  process.exit(1);
}

if (!DATABASE_URL_RAILWAY) {
  console.error("[ERROR] DATABASE_URL_RAILWAY is not configured");
  console.error("        Set DATABASE_URL_RAILWAY or RAILWAY_DATABASE_URL environment variable");
  process.exit(1);
}

// Create Prisma clients for both databases
const prismaLocal = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL_LOCAL,
    },
  },
});

const prismaRailway = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL_RAILWAY,
    },
  },
});

interface MigrationStats {
  usuarios: number;
  roles: number;
  usuarioRoles: number;
  clientes: number;
  operativos: number;
  citas: number;
  fichasClinicas: number;
  recetas: number;
  productos: number;
  ventas: number;
  itemsVenta: number;
  garantias: number;
  alertas: number;
}

async function testConnection(prisma: PrismaClient, name: string): Promise<boolean> {
  try {
    await prisma.$connect();
    console.log(`[OK] Connected to ${name} database`);
    return true;
  } catch (error: any) {
    console.error(`[ERROR] Failed to connect to ${name} database:`, error.message);
    return false;
  }
}

async function migrateData() {
  console.log("[INFO] Starting data migration from local to Railway...");
  console.log(`[INFO] Local DB: ${DATABASE_URL_LOCAL.split("@")[1] || "***"}`);
  console.log(`[INFO] Railway DB: ${DATABASE_URL_RAILWAY.split("@")[1] || "***"}`);

  // Test connections
  console.log("\n[INFO] Testing database connections...");
  const localConnected = await testConnection(prismaLocal, "local");
  const railwayConnected = await testConnection(prismaRailway, "Railway");

  if (!localConnected || !railwayConnected) {
    console.error("\n[ERROR] Failed to connect to one or both databases");
    await prismaLocal.$disconnect();
    await prismaRailway.$disconnect();
    process.exit(1);
  }

  const stats: MigrationStats = {
    usuarios: 0,
    roles: 0,
    usuarioRoles: 0,
    clientes: 0,
    operativos: 0,
    citas: 0,
    fichasClinicas: 0,
    recetas: 0,
    productos: 0,
    ventas: 0,
    itemsVenta: 0,
    garantias: 0,
    alertas: 0,
  };

  try {
    // Step 1: Migrate Roles (no dependencies)
    console.log("\n[INFO] Step 1/12: Migrating roles...");
    const roles = await prismaLocal.rol.findMany();
    for (const role of roles) {
      await prismaRailway.rol.upsert({
        where: { idRol: role.idRol },
        update: { nombre: role.nombre },
        create: {
          idRol: role.idRol,
          nombre: role.nombre,
        },
      });
    }
    stats.roles = roles.length;
    console.log(`[OK] Migrated ${stats.roles} roles`);

    // Step 2: Migrate Usuarios (depends on nothing, but referenced by roles)
    console.log("\n[INFO] Step 2/12: Migrating usuarios...");
    const usuarios = await prismaLocal.usuario.findMany();
    for (const usuario of usuarios) {
      await prismaRailway.usuario.upsert({
        where: { idUsuario: usuario.idUsuario },
        update: {
          nombre: usuario.nombre,
          correo: usuario.correo,
          hashPassword: usuario.hashPassword,
          activo: usuario.activo,
        },
        create: {
          idUsuario: usuario.idUsuario,
          nombre: usuario.nombre,
          correo: usuario.correo,
          hashPassword: usuario.hashPassword,
          activo: usuario.activo,
        },
      });
    }
    stats.usuarios = usuarios.length;
    console.log(`[OK] Migrated ${stats.usuarios} usuarios`);

    // Step 3: Migrate UsuarioRol (depends on usuarios and roles)
    console.log("\n[INFO] Step 3/12: Migrating usuario_rol...");
    const usuarioRoles = await prismaLocal.usuarioRol.findMany();
    for (const ur of usuarioRoles) {
      await prismaRailway.usuarioRol.upsert({
        where: {
          idUsuario_idRol: {
            idUsuario: ur.idUsuario,
            idRol: ur.idRol,
          },
        },
        update: {},
        create: {
          idUsuario: ur.idUsuario,
          idRol: ur.idRol,
        },
      });
    }
    stats.usuarioRoles = usuarioRoles.length;
    console.log(`[OK] Migrated ${stats.usuarioRoles} usuario_rol records`);

    // Step 4: Migrate Operativos (no dependencies)
    console.log("\n[INFO] Step 4/12: Migrating operativos...");
    const operativos = await prismaLocal.operativo.findMany();
    for (const operativo of operativos) {
      await prismaRailway.operativo.upsert({
        where: { idOperativo: operativo.idOperativo },
        update: {
          nombre: operativo.nombre,
          fecha: operativo.fecha,
          lugar: operativo.lugar,
          cupos: operativo.cupos,
        },
        create: {
          idOperativo: operativo.idOperativo,
          nombre: operativo.nombre,
          fecha: operativo.fecha,
          lugar: operativo.lugar,
          cupos: operativo.cupos,
        },
      });
    }
    stats.operativos = operativos.length;
    console.log(`[OK] Migrated ${stats.operativos} operativos`);

    // Step 5: Migrate Clientes (may reference usuarios as vendedor)
    console.log("\n[INFO] Step 5/12: Migrating clientes...");
    const clientes = await prismaLocal.cliente.findMany();
    for (const cliente of clientes) {
      await prismaRailway.cliente.upsert({
        where: { idCliente: cliente.idCliente },
        update: {
          rut: cliente.rut,
          nombre: cliente.nombre,
          telefono: cliente.telefono,
          correo: cliente.correo,
          direccion: cliente.direccion,
          sector: cliente.sector,
          fechaCreacion: cliente.fechaCreacion,
          idVendedor: cliente.idVendedor,
        },
        create: {
          idCliente: cliente.idCliente,
          rut: cliente.rut,
          nombre: cliente.nombre,
          telefono: cliente.telefono,
          correo: cliente.correo,
          direccion: cliente.direccion,
          sector: cliente.sector,
          fechaCreacion: cliente.fechaCreacion,
          idVendedor: cliente.idVendedor,
        },
      });
    }
    stats.clientes = clientes.length;
    console.log(`[OK] Migrated ${stats.clientes} clientes`);

    // Step 6: Migrate Productos (no dependencies)
    console.log("\n[INFO] Step 6/12: Migrating productos...");
    const productos = await prismaLocal.producto.findMany();
    for (const producto of productos) {
      await prismaRailway.producto.upsert({
        where: { idProducto: producto.idProducto },
        update: {
          codigo: producto.codigo,
          nombre: producto.nombre,
          precio: producto.precio,
          tipo: producto.tipo,
        },
        create: {
          idProducto: producto.idProducto,
          codigo: producto.codigo,
          nombre: producto.nombre,
          precio: producto.precio,
          tipo: producto.tipo,
        },
      });
    }
    stats.productos = productos.length;
    console.log(`[OK] Migrated ${stats.productos} productos`);

    // Step 7: Migrate Citas (depends on clientes and operativos)
    console.log("\n[INFO] Step 7/12: Migrating citas...");
    const citas = await prismaLocal.cita.findMany();
    for (const cita of citas) {
      await prismaRailway.cita.upsert({
        where: { idCita: cita.idCita },
        update: {
          idCliente: cita.idCliente,
          idOperativo: cita.idOperativo,
          fechaHora: cita.fechaHora,
          estado: cita.estado,
        },
        create: {
          idCita: cita.idCita,
          idCliente: cita.idCliente,
          idOperativo: cita.idOperativo,
          fechaHora: cita.fechaHora,
          estado: cita.estado,
        },
      });
    }
    stats.citas = citas.length;
    console.log(`[OK] Migrated ${stats.citas} citas`);

    // Step 8: Migrate FichasClinicas (depends on citas)
    console.log("\n[INFO] Step 8/12: Migrating fichas_clinicas...");
    const fichasClinicas = await prismaLocal.fichaClinica.findMany();
    for (const ficha of fichasClinicas) {
      await prismaRailway.fichaClinica.upsert({
        where: { idFicha: ficha.idFicha },
        update: {
          idCita: ficha.idCita,
          antecedentesGenerales: ficha.antecedentesGenerales,
          antecedentesOftalmologicos: ficha.antecedentesOftalmologicos,
          observaciones: ficha.observaciones,
          fechaRegistro: ficha.fechaRegistro,
        },
        create: {
          idFicha: ficha.idFicha,
          idCita: ficha.idCita,
          antecedentesGenerales: ficha.antecedentesGenerales,
          antecedentesOftalmologicos: ficha.antecedentesOftalmologicos,
          observaciones: ficha.observaciones,
          fechaRegistro: ficha.fechaRegistro,
        },
      });
    }
    stats.fichasClinicas = fichasClinicas.length;
    console.log(`[OK] Migrated ${stats.fichasClinicas} fichas_clinicas`);

    // Step 9: Migrate Recetas (depends on fichas_clinicas)
    console.log("\n[INFO] Step 9/12: Migrating recetas...");
    const recetas = await prismaLocal.receta.findMany();
    for (const receta of recetas) {
      await prismaRailway.receta.upsert({
        where: { idReceta: receta.idReceta },
        update: {
          idFicha: receta.idFicha,
          odEsfera: receta.odEsfera,
          odCilindro: receta.odCilindro,
          odEje: receta.odEje,
          oiEsfera: receta.oiEsfera,
          oiCilindro: receta.oiCilindro,
          oiEje: receta.oiEje,
          adicion: receta.adicion,
          pd: receta.pd,
          vigenciaDias: receta.vigenciaDias,
          fechaEmision: receta.fechaEmision,
        },
        create: {
          idReceta: receta.idReceta,
          idFicha: receta.idFicha,
          odEsfera: receta.odEsfera,
          odCilindro: receta.odCilindro,
          odEje: receta.odEje,
          oiEsfera: receta.oiEsfera,
          oiCilindro: receta.oiCilindro,
          oiEje: receta.oiEje,
          adicion: receta.adicion,
          pd: receta.pd,
          vigenciaDias: receta.vigenciaDias,
          fechaEmision: receta.fechaEmision,
        },
      });
    }
    stats.recetas = recetas.length;
    console.log(`[OK] Migrated ${stats.recetas} recetas`);

    // Step 10: Migrate Ventas (depends on clientes and recetas)
    console.log("\n[INFO] Step 10/12: Migrating ventas...");
    const ventas = await prismaLocal.venta.findMany();
    for (const venta of ventas) {
      await prismaRailway.venta.upsert({
        where: { idVenta: venta.idVenta },
        update: {
          idCliente: venta.idCliente,
          idReceta: venta.idReceta,
          fechaVenta: venta.fechaVenta,
          total: venta.total,
          tipoDocumento: venta.tipoDocumento,
        },
        create: {
          idVenta: venta.idVenta,
          idCliente: venta.idCliente,
          idReceta: venta.idReceta,
          fechaVenta: venta.fechaVenta,
          total: venta.total,
          tipoDocumento: venta.tipoDocumento,
        },
      });
    }
    stats.ventas = ventas.length;
    console.log(`[OK] Migrated ${stats.ventas} ventas`);

    // Step 11: Migrate ItemVenta (depends on ventas and productos)
    console.log("\n[INFO] Step 11/12: Migrating item_venta...");
    const itemsVenta = await prismaLocal.itemVenta.findMany();
    for (const item of itemsVenta) {
      await prismaRailway.itemVenta.upsert({
        where: { idItem: item.idItem },
        update: {
          idVenta: item.idVenta,
          idProducto: item.idProducto,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          garantia: item.garantia,
        },
        create: {
          idItem: item.idItem,
          idVenta: item.idVenta,
          idProducto: item.idProducto,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          garantia: item.garantia,
        },
      });
    }
    stats.itemsVenta = itemsVenta.length;
    console.log(`[OK] Migrated ${stats.itemsVenta} item_venta records`);

    // Step 12a: Migrate Garantias (depends on item_venta)
    console.log("\n[INFO] Step 12a/13: Migrating garantias...");
    const garantias = await prismaLocal.garantia.findMany();
    for (const garantia of garantias) {
      await prismaRailway.garantia.upsert({
        where: { idGarantia: garantia.idGarantia },
        update: {
          idItem: garantia.idItem,
          fechaInicio: garantia.fechaInicio,
          fechaFin: garantia.fechaFin,
          condiciones: garantia.condiciones,
        },
        create: {
          idGarantia: garantia.idGarantia,
          idItem: garantia.idItem,
          fechaInicio: garantia.fechaInicio,
          fechaFin: garantia.fechaFin,
          condiciones: garantia.condiciones,
        },
      });
    }
    stats.garantias = garantias.length;
    console.log(`[OK] Migrated ${stats.garantias} garantias`);

    // Step 12b: Migrate Alertas (depends on clientes)
    console.log("\n[INFO] Step 12b/13: Migrating alertas...");
    const alertas = await prismaLocal.alerta.findMany();
    for (const alerta of alertas) {
      await prismaRailway.alerta.upsert({
        where: { idAlerta: alerta.idAlerta },
        update: {
          idCliente: alerta.idCliente,
          tipo: alerta.tipo,
          canal: alerta.canal,
          mensaje: alerta.mensaje,
          fechaProgramada: alerta.fechaProgramada,
          enviado: alerta.enviado,
        },
        create: {
          idAlerta: alerta.idAlerta,
          idCliente: alerta.idCliente,
          tipo: alerta.tipo,
          canal: alerta.canal,
          mensaje: alerta.mensaje,
          fechaProgramada: alerta.fechaProgramada,
          enviado: alerta.enviado,
        },
      });
    }
    stats.alertas = alertas.length;
    console.log(`[OK] Migrated ${stats.alertas} alertas`);

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("[OK] Migration completed successfully!");
    console.log("=".repeat(60));
    console.log("\nMigration Statistics:");
    console.log(`  - Roles: ${stats.roles}`);
    console.log(`  - Usuarios: ${stats.usuarios}`);
    console.log(`  - Usuario Roles: ${stats.usuarioRoles}`);
    console.log(`  - Operativos: ${stats.operativos}`);
    console.log(`  - Clientes: ${stats.clientes}`);
    console.log(`  - Productos: ${stats.productos}`);
    console.log(`  - Citas: ${stats.citas}`);
    console.log(`  - Fichas Clínicas: ${stats.fichasClinicas}`);
    console.log(`  - Recetas: ${stats.recetas}`);
    console.log(`  - Ventas: ${stats.ventas}`);
    console.log(`  - Items Venta: ${stats.itemsVenta}`);
    console.log(`  - Garantías: ${stats.garantias}`);
    console.log(`  - Alertas: ${stats.alertas}`);
    console.log(`\nTotal records migrated: ${
      stats.roles +
      stats.usuarios +
      stats.usuarioRoles +
      stats.operativos +
      stats.clientes +
      stats.productos +
      stats.citas +
      stats.fichasClinicas +
      stats.recetas +
      stats.ventas +
      stats.itemsVenta +
      stats.garantias +
      stats.alertas
    }`);

  } catch (error: any) {
    console.error("\n[ERROR] Migration failed:", error);
    console.error("        Error details:", error.message);
    if (error.stack) {
      console.error("        Stack trace:", error.stack);
    }
    throw error;
  } finally {
    await prismaLocal.$disconnect();
    await prismaRailway.$disconnect();
    console.log("\n[INFO] Database connections closed");
  }
}

// Run migration
migrateData()
  .then(() => {
    console.log("\n[OK] Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n[ERROR] Script failed:", error);
    process.exit(1);
  });

