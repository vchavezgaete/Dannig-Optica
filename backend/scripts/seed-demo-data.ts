// Script para cargar datos de prueba para demostración y reportes
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("[INFO] Iniciando carga de datos de prueba...");

  // 1. Crear Roles
  const roles = ["Administrador", "Vendedor", "Captador", "Oftalmólogo", "Gerente"];
  const roleMap = new Map();

  for (const roleName of roles) {
    const role = await prisma.rol.upsert({
      where: { nombre: roleName },
      update: {},
      create: { nombre: roleName },
    });
    roleMap.set(roleName, role.idRol);
    console.log(`[OK] Rol asegurado: ${roleName}`);
  }

  // 2. Crear Usuarios Especiales desde Variables de Entorno (o valores por defecto)
  // Contraseña por defecto si no se especifica
  const defaultPassword = process.env.DEFAULT_PASSWORD || "dannig123";
  const hashedDefaultPassword = await bcrypt.hash(defaultPassword, 10);

  // Función auxiliar para crear usuario con rol
  const createUserWithRole = async (name: string, email: string, password: string | undefined, roleName: string) => {
    if (!email) return;
    
    const hash = password ? await bcrypt.hash(password, 10) : hashedDefaultPassword;
    
    const user = await prisma.usuario.upsert({
      where: { correo: email },
      update: {
        nombre: name,
        // No actualizamos contraseña si el usuario ya existe para evitar bloqueos,
        // a menos que se fuerce un reset manual. Asumimos seguridad primero.
      },
      create: {
        nombre: name,
        correo: email,
        hashPassword: hash,
        activo: 1,
      },
    });

    const roleId = roleMap.get(roleName);
    if (roleId) {
      await prisma.usuarioRol.upsert({
        where: {
          idUsuario_idRol: {
            idUsuario: user.idUsuario,
            idRol: roleId,
          },
        },
        update: {},
        create: {
          idUsuario: user.idUsuario,
          idRol: roleId,
        },
      });
      console.log(`[OK] Usuario ${name} (${roleName}) asegurado.`);
    }
  };

  // Administrador
  await createUserWithRole(
    process.env.ADMIN_NAME || "Administrador Principal",
    process.env.ADMIN_EMAIL || "admin@dannig.cl",
    process.env.ADMIN_PASSWORD,
    "Administrador"
  );

  // Captador
  await createUserWithRole(
    process.env.CAPTADOR_NAME || "Captador Demo",
    process.env.CAPTADOR_EMAIL || "captador@dannig.cl",
    process.env.CAPTADOR_PASSWORD,
    "Captador"
  );

  // Oftalmólogo
  await createUserWithRole(
    process.env.OFTALMOLOGO_NAME || "Oftalmólogo Demo",
    process.env.OFTALMOLOGO_EMAIL || "oftalmologo@dannig.cl",
    process.env.OFTALMOLOGO_PASSWORD,
    "Oftalmólogo"
  );

  // 3. Crear Vendedores de demostración
  const hashedPassword = await bcrypt.hash("demo123", 10);
  
  const vendors = [];
  const vendorNames = [
    { nombre: "Juan Pérez", correo: "juan.perez@dannig.cl" },
    { nombre: "María González", correo: "maria.gonzalez@dannig.cl" },
    { nombre: "Carlos Rodríguez", correo: "carlos.rodriguez@dannig.cl" },
    { nombre: "Ana Martínez", correo: "ana.martinez@dannig.cl" },
  ];

  for (const vendorData of vendorNames) {
    const vendor = await prisma.usuario.upsert({
      where: { correo: vendorData.correo },
      update: {},
      create: {
        nombre: vendorData.nombre,
        correo: vendorData.correo,
        hashPassword: hashedPassword,
        activo: 1,
      },
    });
    
    // Asignar rol Vendedor
    await prisma.usuarioRol.upsert({
        where: {
          idUsuario_idRol: {
            idUsuario: vendor.idUsuario,
            idRol: roleMap.get("Vendedor"),
          },
        },
        update: {},
        create: {
          idUsuario: vendor.idUsuario,
          idRol: roleMap.get("Vendedor"),
        },
      });

    vendors.push(vendor);
    console.log(`[OK] Vendedor creado: ${vendor.nombre}`);
  }

  // 4. Crear Clientes de demostración
  const clientNames = [
    { rut: "12345678-9", nombre: "Pedro Silva", sector: "Maipú" },
    { rut: "23456789-0", nombre: "Laura Castro", sector: "Santiago Centro" },
    { rut: "34567890-1", nombre: "Roberto Muñoz", sector: "Las Condes" },
    { rut: "45678901-2", nombre: "Carmen Flores", sector: "Providencia" },
    { rut: "56789012-3", nombre: "Diego Torres", sector: "Ñuñoa" },
    { rut: "67890123-4", nombre: "Sofía Ramírez", sector: "Maipú" },
    { rut: "78901234-5", nombre: "Andrés Vargas", sector: "Santiago Centro" },
    { rut: "89012345-6", nombre: "Patricia Herrera", sector: "Pudahuel" },
    { rut: "90123456-7", nombre: "Francisco Morales", sector: "Cerrillos" },
    { rut: "11223344-5", nombre: "Isabel Rojas", sector: "Maipú" },
    { rut: "22334455-6", nombre: "Javier Soto", sector: "Las Condes" },
    { rut: "33445566-7", nombre: "Valentina Cruz", sector: "Providencia" },
  ];

  const clients = [];
  for (let i = 0; i < clientNames.length; i++) {
    const clientData = clientNames[i];
    const vendorIndex = i % vendors.length;
    
    const client = await prisma.cliente.upsert({
      where: { rut: clientData.rut },
      update: {},
      create: {
        rut: clientData.rut,
        nombre: clientData.nombre,
        telefono: `+569${Math.floor(10000000 + Math.random() * 90000000)}`,
        correo: `${clientData.nombre.toLowerCase().replace(" ", ".")}@email.com`,
        direccion: `Calle Demo ${i + 1}`,
        sector: clientData.sector,
        idVendedor: vendors[vendorIndex].idUsuario,
        // Fecha aleatoria dentro de los últimos 6 meses
        fechaCreacion: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000), 
      },
    });
    clients.push(client);
    console.log(`[OK] Cliente creado: ${client.nombre} (Vendedor: ${vendors[vendorIndex].nombre})`);
  }

  // Crear Productos de demostración
  const products = [
    { codigo: "LENT-001", nombre: "Lentes Monofocales", precio: 45000, tipo: "Lentes" },
    { codigo: "LENT-002", nombre: "Lentes Bifocales", precio: 65000, tipo: "Lentes" },
    { codigo: "LENT-003", nombre: "Lentes Progresivos", precio: 120000, tipo: "Lentes" },
    { codigo: "MARC-001", nombre: "Marco Metal Clásico", precio: 35000, tipo: "Marcos" },
    { codigo: "MARC-002", nombre: "Marco Acetato Premium", precio: 55000, tipo: "Marcos" },
    { codigo: "SOL-001", nombre: "Lentes de Sol Polarizados", precio: 75000, tipo: "Accesorios" },
    { codigo: "LIMPIA-001", nombre: "Kit de Limpieza", precio: 8000, tipo: "Accesorios" },
    { codigo: "ESTUCHE-001", nombre: "Estuche Rígido", precio: 5000, tipo: "Accesorios" },
  ];

  const createdProducts = [];
  for (const productData of products) {
    const product = await prisma.producto.upsert({
      where: { codigo: productData.codigo },
      update: {},
      create: productData,
    });
    createdProducts.push(product);
    console.log(`[OK] Producto creado: ${product.nombre}`);
  }

  // Crear Ventas de demostración
  for (let i = 0; i < 30; i++) {
    const randomClient = clients[Math.floor(Math.random() * clients.length)];
    const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items por venta
    
    // Seleccionar productos aleatorios para esta venta
    const saleProducts = [];
    const usedIndices = new Set();
    for (let j = 0; j < numItems; j++) {
      let productIndex;
      do {
        productIndex = Math.floor(Math.random() * createdProducts.length);
      } while (usedIndices.has(productIndex));
      usedIndices.add(productIndex);
      saleProducts.push(createdProducts[productIndex]);
    }

    // Calcular total
    let total = 0;
    saleProducts.forEach(product => {
      total += Number(product.precio);
    });

    // Crear venta con fecha aleatoria en los últimos 6 meses
    const sale = await prisma.venta.create({
      data: {
        idCliente: randomClient.idCliente,
        fechaVenta: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000),
        total: total,
      },
    });

    // Crear items de venta
    for (const product of saleProducts) {
      await prisma.itemVenta.create({
        data: {
          idVenta: sale.idVenta,
          idProducto: product.idProducto,
          cantidad: 1,
          precioUnitario: product.precio,
        },
      });
    }

    console.log(`[OK] Venta #${sale.idVenta} creada para ${randomClient.nombre} - Total: $${total}`);
  }

  console.log("\n🎉 Carga de datos completada exitosamente!");
  console.log("\n[INFO] Resumen:");
  console.log(`   - Usuarios Admin, Captador, Oftalmólogo asegurados`);
  console.log(`   - ${vendors.length} vendedores creados`);
  console.log(`   - ${clients.length} clientes creados`);
  console.log(`   - ${createdProducts.length} productos creados`);
  console.log(`   - 30 ventas creadas con items`);
  console.log("\n[INFO] Credenciales:");
  console.log(`   Admin: ${process.env.ADMIN_EMAIL || "admin@dannig.cl"}`);
  console.log(`   Captador: ${process.env.CAPTADOR_EMAIL || "captador@dannig.cl"}`);
  console.log(`   Oftalmólogo: ${process.env.OFTALMOLOGO_EMAIL || "oftalmologo@dannig.cl"}`);
  console.log("   Vendedores: demo123");
}

main()
  .catch((e) => {
    console.error("[ERROR] Error cargando datos:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
