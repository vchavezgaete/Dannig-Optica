// Script to generate sales data with frames and lenses for testing
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Productos realistas de marcos y cristales
const marcos = [
  { codigo: "MARCO-001", nombre: "Marco Metal Clásico Negro", precio: 35000, tipo: "Marco" },
  { codigo: "MARCO-002", nombre: "Marco Metal Plateado", precio: 38000, tipo: "Marco" },
  { codigo: "MARCO-003", nombre: "Marco Acetato Negro", precio: 45000, tipo: "Marco" },
  { codigo: "MARCO-004", nombre: "Marco Acetato Marrón", precio: 48000, tipo: "Marco" },
  { codigo: "MARCO-005", nombre: "Marco Acetato Azul", precio: 50000, tipo: "Marco" },
  { codigo: "MARCO-006", nombre: "Marco Titanio Negro", precio: 65000, tipo: "Marco" },
  { codigo: "MARCO-007", nombre: "Marco Titanio Plateado", precio: 68000, tipo: "Marco" },
  { codigo: "MARCO-008", nombre: "Marco Flexible Negro", precio: 42000, tipo: "Marco" },
  { codigo: "MARCO-009", nombre: "Marco Flexible Marrón", precio: 44000, tipo: "Marco" },
  { codigo: "MARCO-010", nombre: "Marco Premium Oro", precio: 85000, tipo: "Marco" },
];

const cristales = [
  { codigo: "CRIST-001", nombre: "Cristal Monofocal Estándar", precio: 45000, tipo: "Cristal" },
  { codigo: "CRIST-002", nombre: "Cristal Monofocal Antirreflejo", precio: 55000, tipo: "Cristal" },
  { codigo: "CRIST-003", nombre: "Cristal Monofocal Blue Light", precio: 65000, tipo: "Cristal" },
  { codigo: "CRIST-004", nombre: "Cristal Bifocal Estándar", precio: 75000, tipo: "Cristal" },
  { codigo: "CRIST-005", nombre: "Cristal Bifocal Antirreflejo", precio: 85000, tipo: "Cristal" },
  { codigo: "CRIST-006", nombre: "Cristal Progresivo Estándar", precio: 120000, tipo: "Cristal" },
  { codigo: "CRIST-007", nombre: "Cristal Progresivo Premium", precio: 150000, tipo: "Cristal" },
  { codigo: "CRIST-008", nombre: "Cristal Progresivo Digital", precio: 180000, tipo: "Cristal" },
  { codigo: "CRIST-009", nombre: "Cristal Fotocromático", precio: 95000, tipo: "Cristal" },
  { codigo: "CRIST-010", nombre: "Cristal Polarizado", precio: 85000, tipo: "Cristal" },
];

async function main() {
  console.log("🛍️  Starting sales data generation...");

  // Obtener clientes existentes
  const clientes = await prisma.cliente.findMany({
    orderBy: { idCliente: "asc" },
    take: 20, // Limitar a los primeros 20 clientes para evitar demasiadas ventas
  });

  if (clientes.length === 0) {
    console.log("⚠️  No se encontraron clientes en la base de datos.");
    console.log("   Por favor, primero crea algunos clientes usando el módulo de captación.");
    process.exit(0);
  }

  console.log(`✅ Encontrados ${clientes.length} clientes`);

  // Crear productos de marcos
  console.log("\n📦 Creando productos de marcos...");
  const marcosCreados = [];
  for (const marcoData of marcos) {
    const marco = await prisma.producto.upsert({
      where: { codigo: marcoData.codigo },
      update: {
        nombre: marcoData.nombre,
        precio: marcoData.precio,
        tipo: marcoData.tipo,
      },
      create: marcoData,
    });
    marcosCreados.push(marco);
    console.log(`   ✅ ${marco.nombre} - $${marco.precio}`);
  }

  // Crear productos de cristales
  console.log("\n🔬 Creando productos de cristales...");
  const cristalesCreados = [];
  for (const cristalData of cristales) {
    const cristal = await prisma.producto.upsert({
      where: { codigo: cristalData.codigo },
      update: {
        nombre: cristalData.nombre,
        precio: cristalData.precio,
        tipo: cristalData.tipo,
      },
      create: cristalData,
    });
    cristalesCreados.push(cristal);
    console.log(`   ✅ ${cristal.nombre} - $${cristal.precio}`);
  }

  // Crear ventas realistas
  console.log("\n💰 Creando ventas...");
  const ventasCreadas = [];
  const numVentas = Math.min(clientes.length * 2, 40); // Máximo 2 ventas por cliente o 40 total

  for (let i = 0; i < numVentas; i++) {
    // Seleccionar cliente aleatorio
    const cliente = clientes[Math.floor(Math.random() * clientes.length)];

    // Crear una venta típica: 1 marco + 2 cristales (uno para cada ojo)
    const itemsVenta = [];

    // Seleccionar un marco aleatorio
    const marco = marcosCreados[Math.floor(Math.random() * marcosCreados.length)];
    itemsVenta.push({
      idProducto: marco.idProducto,
      cantidad: 1,
      precioUnitario: marco.precio,
    });

    // Seleccionar un tipo de cristal (normalmente se venden 2 cristales, uno para cada ojo)
    const cristal = cristalesCreados[Math.floor(Math.random() * cristalesCreados.length)];
    itemsVenta.push({
      idProducto: cristal.idProducto,
      cantidad: 2, // Dos cristales (ojo derecho e izquierdo)
      precioUnitario: cristal.precio,
    });

    // Calcular total
    const total = itemsVenta.reduce(
      (sum, item) => sum + Number(item.precioUnitario) * item.cantidad,
      0
    );

    // Fecha aleatoria en los últimos 6 meses
    const fechaVenta = new Date(
      Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000
    );

    // Crear venta
    const venta = await prisma.venta.create({
      data: {
        idCliente: cliente.idCliente,
        fechaVenta: fechaVenta,
        total: total,
      },
    });

    // Crear items de venta
    for (const item of itemsVenta) {
      await prisma.itemVenta.create({
        data: {
          idVenta: venta.idVenta,
          idProducto: item.idProducto,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
        },
      });
    }

    ventasCreadas.push(venta);
    console.log(
      `   ✅ Venta #${venta.idVenta} para ${cliente.nombre} - Total: $${total.toLocaleString()}`
    );
  }

  // Crear algunas ventas adicionales con solo marco (para casos donde el cliente ya tenía cristales)
  console.log("\n🔄 Creando ventas adicionales (solo marcos)...");
  const numVentasSoloMarcos = Math.min(clientes.length, 15);

  for (let i = 0; i < numVentasSoloMarcos; i++) {
    const cliente = clientes[Math.floor(Math.random() * clientes.length)];
    const marco = marcosCreados[Math.floor(Math.random() * marcosCreados.length)];

    const fechaVenta = new Date(
      Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000
    );

    const venta = await prisma.venta.create({
      data: {
        idCliente: cliente.idCliente,
        fechaVenta: fechaVenta,
        total: marco.precio,
      },
    });

    await prisma.itemVenta.create({
      data: {
        idVenta: venta.idVenta,
        idProducto: marco.idProducto,
        cantidad: 1,
        precioUnitario: marco.precio,
      },
    });

    console.log(
      `   ✅ Venta #${venta.idVenta} (solo marco) para ${cliente.nombre} - Total: $${Number(marco.precio).toLocaleString()}`
    );
  }

  // Resumen
  console.log("\n🎉 Generación de datos de ventas completada!");
  console.log("\n📊 Resumen:");
  console.log(`   - ${marcosCreados.length} marcos disponibles`);
  console.log(`   - ${cristalesCreados.length} tipos de cristales disponibles`);
  console.log(`   - ${ventasCreadas.length} ventas completas creadas (marco + cristales)`);
  console.log(`   - ${numVentasSoloMarcos} ventas de solo marco creadas`);
  console.log(`   - Total: ${ventasCreadas.length + numVentasSoloMarcos} ventas`);
}

main()
  .catch((e) => {
    console.error("❌ Error generando datos de ventas:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

