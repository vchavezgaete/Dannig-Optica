// Script to generate dummy doctors (oftalmologos) and clients for testing
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

// Nombres de médicos oftalmólogos realistas
const medicosData = [
  { nombre: "Dr. Carlos Mendoza", correo: "carlos.mendoza@dannig-optica.cl" },
  { nombre: "Dra. Patricia Silva", correo: "patricia.silva@dannig-optica.cl" },
  { nombre: "Dr. Roberto González", correo: "roberto.gonzalez@dannig-optica.cl" },
  { nombre: "Dra. Ana María Torres", correo: "ana.torres@dannig-optica.cl" },
  { nombre: "Dr. Fernando López", correo: "fernando.lopez@dannig-optica.cl" },
];

// Nombres de clientes dummy
const clientesData = [
  { nombre: "Juan Pérez", rut: "12345678-9", telefono: "+56912345678", sector: "Maipú" },
  { nombre: "María González", rut: "23456789-0", telefono: "+56923456789", sector: "San Bernardo" },
  { nombre: "Carlos Rodríguez", rut: "34567890-1", telefono: "+56934567890", sector: "Puente Alto" },
  { nombre: "Ana Martínez", rut: "45678901-2", telefono: "+56945678901", sector: "La Florida" },
  { nombre: "Pedro Sánchez", rut: "56789012-3", telefono: "+56956789012", sector: "Santiago Centro" },
  { nombre: "Laura Fernández", rut: "67890123-4", telefono: "+56967890123", sector: "Providencia" },
  { nombre: "Miguel Torres", rut: "78901234-5", telefono: "+56978901234", sector: "Las Condes" },
  { nombre: "Carmen Ruiz", rut: "89012345-6", telefono: "+56989012345", sector: "Ñuñoa" },
  { nombre: "Diego Morales", rut: "90123456-7", telefono: "+56990123456", sector: "Macul" },
  { nombre: "Sofía Vargas", rut: "01234567-8", telefono: "+56901234567", sector: "La Reina" },
];

function generarRUT(numero: number): string {
  // Generar RUT válido con dígito verificador
  let suma = 0;
  let multiplicador = 2;
  const numeroStr = numero.toString().padStart(8, '0');
  
  for (let i = numeroStr.length - 1; i >= 0; i--) {
    suma += parseInt(numeroStr[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  
  const resto = suma % 11;
  const dv = 11 - resto;
  
  if (dv === 11) return `${numeroStr}-0`;
  if (dv === 10) return `${numeroStr}-K`;
  return `${numeroStr}-${dv}`;
}

async function main() {
  console.log("🎭 Generando datos dummy (médicos y clientes)...\n");

  // 1. Verificar y crear rol oftalmologo si no existe
  console.log("👨‍⚕️ Creando/verificando rol oftalmologo...");
  const oftalmologoRol = await prisma.rol.upsert({
    where: { nombre: "oftalmologo" },
    update: {},
    create: { nombre: "oftalmologo" },
  });
  console.log(`   ✅ Rol 'oftalmologo' verificado\n`);

  // 2. Crear médicos oftalmólogos si no existen suficientes
  console.log("👨‍⚕️ Verificando médicos existentes...");
  const medicosExistentes = await prisma.usuario.findMany({
    where: {
      roles: {
        some: {
          idRol: oftalmologoRol.idRol,
        },
      },
    },
  });
  console.log(`   ℹ️  Médicos existentes: ${medicosExistentes.length}`);

  // Obtener correos de médicos existentes
  const correosExistentes = new Set(medicosExistentes.map(m => m.correo));

  if (medicosExistentes.length < 3) {
    console.log("\n👨‍⚕️ Creando médicos dummy...");
    const passwordHash = await bcrypt.hash("Medico123", 10);
    
    // Crear solo médicos que no existen
    const medicosACrear = medicosData.filter(m => !correosExistentes.has(m.correo));
    
    for (const medicoData of medicosACrear) {
      const medico = await prisma.usuario.upsert({
        where: { correo: medicoData.correo },
        update: {},
        create: {
          nombre: medicoData.nombre,
          correo: medicoData.correo,
          hashPassword: passwordHash,
          activo: 1,
        },
      });

      // Asignar rol oftalmologo
      await prisma.usuarioRol.upsert({
        where: {
          idUsuario_idRol: {
            idUsuario: medico.idUsuario,
            idRol: oftalmologoRol.idRol,
          },
        },
        update: {},
        create: {
          idUsuario: medico.idUsuario,
          idRol: oftalmologoRol.idRol,
        },
      });

      console.log(`   ✅ ${medico.nombre}`);
    }
    
    if (medicosACrear.length === 0) {
      console.log(`   ℹ️  Todos los médicos dummy ya existen.\n`);
    }
  } else {
    console.log(`   ℹ️  Ya existen suficientes médicos (${medicosExistentes.length}). No se crearán nuevos.\n`);
  }

  // 3. Verificar y crear clientes dummy si no existen suficientes
  console.log("👥 Verificando clientes existentes...");
  const clientesExistentes = await prisma.cliente.count();
  console.log(`   ℹ️  Clientes existentes: ${clientesExistentes}`);

  if (clientesExistentes < 5) {
    console.log("\n👥 Creando clientes dummy...");
    
    for (const clienteData of clientesData) {
      const cliente = await prisma.cliente.upsert({
        where: { rut: clienteData.rut },
        update: {
          nombre: clienteData.nombre,
          telefono: clienteData.telefono,
          sector: clienteData.sector,
        },
        create: {
          rut: clienteData.rut,
          nombre: clienteData.nombre,
          telefono: clienteData.telefono,
          sector: clienteData.sector,
        },
      });
      console.log(`   ✅ ${cliente.nombre} (${cliente.rut})`);
    }
  } else {
    console.log(`   ℹ️  Ya existen suficientes clientes (${clientesExistentes}). No se crearán nuevos.\n`);
  }

  // Resumen final
  const totalMedicos = await prisma.usuario.count({
    where: {
      roles: {
        some: {
          idRol: oftalmologoRol.idRol,
        },
      },
    },
  });
  
  const totalClientes = await prisma.cliente.count();

  console.log("\n🎉 Generación de datos dummy completada!\n");
  console.log("📊 Resumen:");
  console.log(`   - ${totalMedicos} médicos oftalmólogos disponibles`);
  console.log(`   - ${totalClientes} clientes disponibles`);
  console.log("\n💡 Nota: Las contraseñas de los médicos dummy son 'Medico123'");
}

main()
  .catch((e) => {
    console.error("❌ Error generando datos dummy:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

