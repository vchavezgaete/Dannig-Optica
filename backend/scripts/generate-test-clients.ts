import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Datos de prueba para generar clientes realistas
const nombres = [
  'María González', 'Carlos Rodríguez', 'Ana Martínez', 'Luis Fernández', 'Carmen López',
  'José García', 'Isabel Sánchez', 'Miguel Pérez', 'Rosa Díaz', 'Antonio Ruiz',
  'Elena Moreno', 'Francisco Jiménez', 'Pilar Muñoz', 'Manuel Álvarez', 'Teresa Romero',
  'Pedro Navarro', 'Concepción Molina', 'Javier Herrera', 'Dolores Ramos', 'Fernando Blanco',
  'Cristina Torres', 'Rafael Vargas', 'Mercedes Castillo', 'Ángel Morales', 'Beatriz Ortega',
  'Sergio Delgado', 'Nuria Vega', 'Roberto Medina', 'Silvia Guerrero', 'Víctor Campos',
  'Patricia Reyes', 'Alejandro Cruz', 'Montserrat Aguilar', 'Rubén Peña', 'Sonia Fuentes',
  'Óscar Mendoza', 'Raquel León', 'Iván Cabrera', 'Mónica Flores', 'Adrián Gutiérrez',
  'Laura Espinoza', 'Diego Valenzuela', 'Andrea Contreras', 'Sebastián Silva', 'Valentina Rojas',
  'Matías Herrera', 'Camila Paredes', 'Nicolás Figueroa', 'Javiera Morales', 'Benjamín Castro',
  'Francisca Soto', 'Maximiliano Núñez', 'Constanza Ramírez', 'Tomás Espinoza', 'Isidora Vargas',
  'Emilio Tapia', 'Trinidad González', 'Agustín Muñoz', 'Amanda Silva', 'Renato Herrera',
  'Antonella Rojas', 'Felipe Contreras', 'Catalina Paredes', 'Martín Figueroa', 'Josefa Morales',
  'Ignacio Castro', 'Magdalena Soto', 'Cristóbal Núñez', 'Rocío Ramírez', 'Esteban Espinoza',
  'Daniela Vargas', 'Rodrigo Tapia', 'Fernanda González', 'Nicolás Muñoz', 'Paz Silva',
  'Sebastián Herrera', 'Amanda Rojas', 'Tomás Contreras', 'Trinidad Paredes', 'Agustín Figueroa',
  'Isidora Morales', 'Emilio Castro', 'Francisca Soto', 'Maximiliano Núñez', 'Constanza Ramírez',
  'Benjamín Espinoza', 'Javiera Vargas', 'Matías Tapia', 'Valentina González', 'Diego Muñoz',
  'Andrea Silva', 'Sebastián Herrera', 'Camila Rojas', 'Nicolás Contreras', 'Francisca Paredes'
];

const sectores = [
  'Centro', 'Providencia', 'Las Condes', 'Ñuñoa', 'Maipú', 'Puente Alto', 'La Florida',
  'San Miguel', 'La Reina', 'Vitacura', 'Lo Barnechea', 'Huechuraba', 'Quilicura',
  'Renca', 'Conchalí', 'Independencia', 'Recoleta', 'Quinta Normal', 'Lo Prado',
  'Cerro Navia', 'Pudahuel', 'Estación Central', 'Cerrillos', 'Pedro Aguirre Cerda'
];

const tiposTelefono = ['+569', '+568'];
const dominiosEmail = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'live.com'];

function generarRUT(): string {
  const numero = Math.floor(Math.random() * 25000000) + 1000000;
  const dv = calcularDV(numero);
  return `${numero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
}

function calcularDV(numero: number): string {
  const rut = numero.toString().split('').reverse();
  let suma = 0;
  let multiplicador = 2;
  
  for (const digito of rut) {
    suma += parseInt(digito) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  
  const resto = suma % 11;
  const dv = 11 - resto;
  
  if (dv === 11) return '0';
  if (dv === 10) return 'K';
  return dv.toString();
}

function generarTelefono(): string {
  const tipo = tiposTelefono[Math.floor(Math.random() * tiposTelefono.length)];
  const numero = Math.floor(Math.random() * 10000000) + 1000000;
  return `${tipo}${numero}`;
}

function generarEmail(nombre: string): string {
  const nombreLimpio = nombre.toLowerCase()
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/ñ/g, 'n')
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, '.');
  
  const dominio = dominiosEmail[Math.floor(Math.random() * dominiosEmail.length)];
  const numero = Math.floor(Math.random() * 100);
  
  return numero > 50 ? `${nombreLimpio}@${dominio}` : `${nombreLimpio}${numero}@${dominio}`;
}

function generarDireccion(sector: string): string {
  const calles = [
    'Av. Principal', 'Calle Central', 'Pasaje Los Robles', 'Av. Libertador', 'Calle del Sol',
    'Av. Providencia', 'Calle Las Flores', 'Pasaje Los Pinos', 'Av. Independencia', 'Calle San Martín',
    'Av. Vicuña Mackenna', 'Calle Los Leones', 'Pasaje Los Tilos', 'Av. Grecia', 'Calle Italia',
    'Av. Irarrázaval', 'Calle Los Plátanos', 'Pasaje Los Cerezos', 'Av. Apoquindo', 'Calle Las Condes'
  ];
  
  const calle = calles[Math.floor(Math.random() * calles.length)];
  const numero = Math.floor(Math.random() * 5000) + 1;
  const depto = Math.random() > 0.7 ? `, Depto. ${Math.floor(Math.random() * 20) + 1}` : '';
  
  return `${calle} ${numero}${depto}, ${sector}`;
}

async function generarClientes() {
  console.log('🚀 Iniciando generación de clientes de prueba...');
  
  try {
    // 1. Obtener usuarios vendedores (captadores y admin)
    const vendedores = await prisma.usuario.findMany({
      where: {
        roles: {
          some: {
            rol: {
              nombre: {
                in: ['captador', 'admin']
              }
            }
          }
        }
      },
      include: {
        roles: {
          include: {
            rol: true
          }
        }
      }
    });

    if (vendedores.length === 0) {
      console.log('❌ No se encontraron vendedores. Ejecuta primero /auth/seed');
      return;
    }

    console.log(`📋 Encontrados ${vendedores.length} vendedores:`);
    vendedores.forEach(v => {
      const roles = v.roles.map((ur: any) => ur.rol.nombre).join(', ');
      console.log(`   - ${v.nombre} (${v.correo}) - Roles: ${roles}`);
    });

    // 2. Eliminar datos existentes (en orden correcto por restricciones FK)
    console.log('🗑️ Eliminando datos existentes...');
    
    // Eliminar en orden: primero las tablas que referencian a cliente
    const deletedAlertas = await prisma.alerta.deleteMany({});
    console.log(`   ✅ Eliminadas ${deletedAlertas.count} alertas`);
    
    const deletedCitas = await prisma.cita.deleteMany({});
    console.log(`   ✅ Eliminadas ${deletedCitas.count} citas`);
    
    const deletedVentas = await prisma.venta.deleteMany({});
    console.log(`   ✅ Eliminadas ${deletedVentas.count} ventas`);
    
    // Ahora eliminar clientes
    const deletedClients = await prisma.cliente.deleteMany({});
    console.log(`   ✅ Eliminados ${deletedClients.count} clientes existentes`);

    // 3. Generar 100 nuevos clientes con distribución específica
    console.log('👥 Generando 100 nuevos clientes...');
    const clientes = [];
    
    // Separar vendedores por rol
    const captadores = vendedores.filter(v => 
      v.roles.some((ur: any) => ur.rol.nombre === 'captador')
    );
    const admins = vendedores.filter(v => 
      v.roles.some((ur: any) => ur.rol.nombre === 'admin')
    );
    
    console.log(`   📋 Captadores encontrados: ${captadores.length}`);
    console.log(`   👨‍💼 Administradores encontrados: ${admins.length}`);
    
    // Distribución: 70% captadores, 30% admin
    const clientesCaptadores = 70;
    const clientesAdmin = 30;
    
    // Generar clientes para captadores (70 clientes)
    console.log(`   👥 Generando ${clientesCaptadores} clientes para captadores...`);
    for (let i = 0; i < clientesCaptadores; i++) {
      const nombre = nombres[Math.floor(Math.random() * nombres.length)];
      const sector = sectores[Math.floor(Math.random() * sectores.length)];
      const captador = captadores[Math.floor(Math.random() * captadores.length)];
      
      // Fecha de creación aleatoria en los últimos 6 meses
      const fechaCreacion = new Date();
      fechaCreacion.setDate(fechaCreacion.getDate() - Math.floor(Math.random() * 180));
      
      const cliente = {
        rut: generarRUT(),
        nombre,
        telefono: generarTelefono(),
        correo: generarEmail(nombre),
        direccion: generarDireccion(sector),
        sector,
        fechaCreacion,
        idVendedor: captador.idUsuario
      };
      
      clientes.push(cliente);
    }
    
    // Generar clientes para administradores (30 clientes)
    console.log(`   👨‍💼 Generando ${clientesAdmin} clientes para administradores...`);
    for (let i = 0; i < clientesAdmin; i++) {
      const nombre = nombres[Math.floor(Math.random() * nombres.length)];
      const sector = sectores[Math.floor(Math.random() * sectores.length)];
      const admin = admins[Math.floor(Math.random() * admins.length)];
      
      // Fecha de creación aleatoria en los últimos 6 meses
      const fechaCreacion = new Date();
      fechaCreacion.setDate(fechaCreacion.getDate() - Math.floor(Math.random() * 180));
      
      const cliente = {
        rut: generarRUT(),
        nombre,
        telefono: generarTelefono(),
        correo: generarEmail(nombre),
        direccion: generarDireccion(sector),
        sector,
        fechaCreacion,
        idVendedor: admin.idUsuario
      };
      
      clientes.push(cliente);
    }

    // 4. Insertar clientes en lotes
    console.log('💾 Insertando clientes en la base de datos...');
    const batchSize = 20;
    
    for (let i = 0; i < clientes.length; i += batchSize) {
      const batch = clientes.slice(i, i + batchSize);
      await prisma.cliente.createMany({
        data: batch
      });
      console.log(`   ✅ Insertados ${Math.min(i + batchSize, clientes.length)}/${clientes.length} clientes`);
    }

    // 5. Estadísticas finales
    const totalClientes = await prisma.cliente.count();
    const clientesPorVendedor = await prisma.cliente.groupBy({
      by: ['idVendedor'],
      _count: {
        idCliente: true
      }
    });

    console.log('\n📊 Estadísticas generadas:');
    console.log(`   Total clientes: ${totalClientes}`);
    console.log('\n📈 Distribución por vendedor:');
    
    for (const item of clientesPorVendedor) {
      if (item.idVendedor) {
        const vendedor = vendedores.find(v => v.idUsuario === item.idVendedor);
        const esCaptador = vendedor?.roles.some((ur: any) => ur.rol.nombre === 'captador');
        const esAdmin = vendedor?.roles.some((ur: any) => ur.rol.nombre === 'admin');
        const rol = esCaptador ? '📋 Captador' : esAdmin ? '👨‍💼 Admin' : '❓ Desconocido';
        console.log(`   - ${vendedor?.nombre || 'Desconocido'} (${rol}): ${item._count.idCliente} clientes`);
      }
    }
    
    // Estadísticas por rol
    const clientesCaptadoresCount = clientesPorVendedor
      .filter(item => {
        if (!item.idVendedor) return false;
        const vendedor = vendedores.find(v => v.idUsuario === item.idVendedor);
        return vendedor?.roles.some((ur: any) => ur.rol.nombre === 'captador');
      })
      .reduce((sum, item) => sum + item._count.idCliente, 0);
    
    const clientesAdminCount = clientesPorVendedor
      .filter(item => {
        if (!item.idVendedor) return false;
        const vendedor = vendedores.find(v => v.idUsuario === item.idVendedor);
        return vendedor?.roles.some((ur: any) => ur.rol.nombre === 'admin');
      })
      .reduce((sum, item) => sum + item._count.idCliente, 0);
    
    console.log('\n🎯 Distribución por rol:');
    console.log(`   📋 Captadores: ${clientesCaptadoresCount} clientes`);
    console.log(`   👨‍💼 Administradores: ${clientesAdminCount} clientes`);

    console.log('\n🎉 ¡Generación de clientes completada exitosamente!');
    console.log('💡 Puedes ahora probar el sistema con los diferentes perfiles:');
    console.log('   - admin@dannig.local (admin123)');
    console.log('   - captador@dannig.local (captador123)');
    console.log('   - oftalmologo@dannig.local (oftalmologo123)');

  } catch (error) {
    console.error('❌ Error generando clientes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  generarClientes();
}

export { generarClientes };
