// Script to seed demo data for reports
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("[INFO] Starting database seeding...");

  // Create demo users (vendors)
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
    vendors.push(vendor);
    console.log(`[OK] Created vendor: ${vendor.nombre}`);
  }

  // Create vendor role and assign to users
  const vendorRole = await prisma.rol.upsert({
    where: { nombre: "Vendedor" },
    update: {},
    create: { nombre: "Vendedor" },
  });

  for (const vendor of vendors) {
    await prisma.usuarioRol.upsert({
      where: {
        idUsuario_idRol: {
          idUsuario: vendor.idUsuario,
          idRol: vendorRole.idRol,
        },
      },
      update: {},
      create: {
        idUsuario: vendor.idUsuario,
        idRol: vendorRole.idRol,
      },
    });
  }

  // Create demo clients
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
        fechaCreacion: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000), // Random date within last 6 months
      },
    });
    clients.push(client);
    console.log(`[OK] Created client: ${client.nombre} (Vendor: ${vendors[vendorIndex].nombre})`);
  }

  // Create demo products
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
    console.log(`[OK] Created product: ${product.nombre}`);
  }

  // Create demo sales
  for (let i = 0; i < 30; i++) {
    const randomClient = clients[Math.floor(Math.random() * clients.length)];
    const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items per sale
    
    // Select random products for this sale
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

    // Calculate total
    let total = 0;
    saleProducts.forEach(product => {
      total += Number(product.precio);
    });

    // Create sale with random date within last 6 months
    const sale = await prisma.venta.create({
      data: {
        idCliente: randomClient.idCliente,
        fechaVenta: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000),
        total: total,
      },
    });

    // Create sale items
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

    console.log(`[OK] Created sale #${sale.idVenta} for ${randomClient.nombre} - Total: $${total}`);
  }

  console.log("\n🎉 Database seeding completed successfully!");
  console.log("\n[INFO] Summary:");
  console.log(`   - ${vendors.length} vendors created`);
  console.log(`   - ${clients.length} clients created`);
  console.log(`   - ${createdProducts.length} products created`);
  console.log(`   - 30 sales created with items`);
  console.log("\n[INFO] Demo credentials:");
  console.log("   Email: juan.perez@dannig.cl");
  console.log("   Password: demo123");
}

main()
  .catch((e) => {
    console.error("[ERROR] Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

