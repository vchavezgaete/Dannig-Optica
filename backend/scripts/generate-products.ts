// Script to generate products (frames and lenses) for testing
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

// Productos adicionales (accesorios y otros)
const accesorios = [
  { codigo: "SOL-001", nombre: "Lentes de Sol Polarizados", precio: 75000, tipo: "Accesorio" },
  { codigo: "LIMPIA-001", nombre: "Kit de Limpieza", precio: 8000, tipo: "Accesorio" },
  { codigo: "ESTUCHE-001", nombre: "Estuche Rígido", precio: 5000, tipo: "Accesorio" },
  { codigo: "ESTUCHE-002", nombre: "Estuche Suave", precio: 3000, tipo: "Accesorio" },
  { codigo: "MICROFIBRA-001", nombre: "Paño Microfibra", precio: 2500, tipo: "Accesorio" },
];

async function main() {
  console.log("📦 Starting products generation...");

  // Verificar productos existentes
  const productosExistentes = await prisma.producto.count();
  console.log(`ℹ️  Productos existentes en la base de datos: ${productosExistentes}`);

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

  // Crear productos accesorios
  console.log("\n🛍️  Creando productos accesorios...");
  const accesoriosCreados = [];
  for (const accesorioData of accesorios) {
    const accesorio = await prisma.producto.upsert({
      where: { codigo: accesorioData.codigo },
      update: {
        nombre: accesorioData.nombre,
        precio: accesorioData.precio,
        tipo: accesorioData.tipo,
      },
      create: accesorioData,
    });
    accesoriosCreados.push(accesorio);
    console.log(`   ✅ ${accesorio.nombre} - $${accesorio.precio}`);
  }

  // Resumen
  console.log("\n🎉 Generación de productos completada!");
  console.log("\n📊 Resumen:");
  console.log(`   - ${marcosCreados.length} marcos disponibles`);
  console.log(`   - ${cristalesCreados.length} tipos de cristales disponibles`);
  console.log(`   - ${accesoriosCreados.length} accesorios disponibles`);
  console.log(`   - Total: ${marcosCreados.length + cristalesCreados.length + accesoriosCreados.length} productos`);
  
  const totalFinal = await prisma.producto.count();
  console.log(`\n📦 Total de productos en la base de datos: ${totalFinal}`);
}

main()
  .catch((e) => {
    console.error("❌ Error generando productos:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

