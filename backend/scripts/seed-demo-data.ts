import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return {
    nombres: parts[0] || "Usuario",
    apellidoPaterno: parts[1] || "Demo",
    apellidoMaterno: parts.slice(2).join(" ") || null,
  };
}

async function createUserWithRole(
  roleMap: Map<string, number>,
  fullName: string,
  correo: string,
  password: string,
  roleName: string,
) {
  const name = splitFullName(fullName);
  const hashPassword = await bcrypt.hash(password, 10);

  const usuario = await prisma.usuario.upsert({
    where: { correo },
    update: {
      ...name,
      hashPassword,
      activo: 1,
    },
    create: {
      ...name,
      correo,
      hashPassword,
      activo: 1,
    },
  });

  const idRol = roleMap.get(roleName);
  if (!idRol) throw new Error(`Role not found: ${roleName}`);

  await prisma.usuarioRol.upsert({
    where: {
      idUsuario_idRol: {
        idUsuario: usuario.idUsuario,
        idRol,
      },
    },
    update: {},
    create: {
      idUsuario: usuario.idUsuario,
      idRol,
    },
  });

  return usuario;
}

async function main() {
  console.log("[INFO] Loading demo data...");

  const roles = ["admin", "captador", "oftalmologo", "vendedor", "gerente"];
  const roleMap = new Map<string, number>();

  for (const nombre of roles) {
    const role = await prisma.rol.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
    roleMap.set(nombre, role.idRol);
  }

  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const captadorPassword = process.env.CAPTADOR_PASSWORD || "captador123";
  const oftalmologoPassword = process.env.OFTALMOLOGO_PASSWORD || "oftalmologo123";

  await createUserWithRole(
    roleMap,
    process.env.ADMIN_NAME || "Admin Demo",
    process.env.ADMIN_EMAIL || "admin@dannig.local",
    adminPassword,
    "admin",
  );

  await createUserWithRole(
    roleMap,
    process.env.CAPTADOR_NAME || "Captador Demo",
    process.env.CAPTADOR_EMAIL || "captador@dannig.local",
    captadorPassword,
    "captador",
  );

  await createUserWithRole(
    roleMap,
    process.env.OFTALMOLOGO_NAME || "Oftalmologo Demo",
    process.env.OFTALMOLOGO_EMAIL || "oftalmologo@dannig.local",
    oftalmologoPassword,
    "oftalmologo",
  );

  const vendors = [];
  for (const vendor of [
    { nombre: "Juan Perez", correo: "juan.perez@dannig.local" },
    { nombre: "Maria Gonzalez", correo: "maria.gonzalez@dannig.local" },
    { nombre: "Carlos Rodriguez", correo: "carlos.rodriguez@dannig.local" },
    { nombre: "Ana Martinez", correo: "ana.martinez@dannig.local" },
  ]) {
    vendors.push(await createUserWithRole(roleMap, vendor.nombre, vendor.correo, "demo123", "vendedor"));
  }

  const region = await prisma.region.upsert({
    where: { nombre: "Region Metropolitana" },
    update: {},
    create: { nombre: "Region Metropolitana", ordinal: "RM" },
  });

  const comunaCache = new Map<string, number>();
  const sectorCache = new Map<string, number>();

  async function getSectorId(nombreComuna: string, nombreSector: string) {
    let idComuna = comunaCache.get(nombreComuna);
    if (!idComuna) {
      const comuna = await prisma.comuna.upsert({
        where: { nombre: nombreComuna },
        update: {},
        create: { nombre: nombreComuna, idRegion: region.idRegion },
      });
      idComuna = comuna.idComuna;
      comunaCache.set(nombreComuna, idComuna);
    }

    const cacheKey = `${idComuna}:${nombreSector}`;
    let idSector = sectorCache.get(cacheKey);
    if (!idSector) {
      const sector = await prisma.sector.create({
        data: { nombre: nombreSector, idComuna },
      });
      idSector = sector.idSector;
      sectorCache.set(cacheKey, idSector);
    }

    return { idComuna, idSector };
  }

  const clientSeeds = [
    { rut: "12345678-9", nombre: "Pedro Silva", comuna: "Maipu", sector: "Centro" },
    { rut: "23456789-0", nombre: "Laura Castro", comuna: "Santiago", sector: "Centro" },
    { rut: "34567890-1", nombre: "Roberto Munoz", comuna: "Las Condes", sector: "Oriente" },
    { rut: "45678901-2", nombre: "Carmen Flores", comuna: "Providencia", sector: "Centro" },
    { rut: "56789012-3", nombre: "Diego Torres", comuna: "Nunoa", sector: "Sur" },
    { rut: "67890123-4", nombre: "Sofia Ramirez", comuna: "Maipu", sector: "Poniente" },
    { rut: "78901234-5", nombre: "Andres Vargas", comuna: "Santiago", sector: "Norte" },
    { rut: "89012345-6", nombre: "Patricia Herrera", comuna: "Pudahuel", sector: "Centro" },
    { rut: "90123456-7", nombre: "Francisco Morales", comuna: "Cerrillos", sector: "Centro" },
    { rut: "11223344-5", nombre: "Isabel Rojas", comuna: "Maipu", sector: "Sur" },
    { rut: "22334455-6", nombre: "Javier Soto", comuna: "Las Condes", sector: "Oriente" },
    { rut: "33445566-7", nombre: "Valentina Cruz", comuna: "Providencia", sector: "Centro" },
  ];

  const clients = [];
  for (let i = 0; i < clientSeeds.length; i += 1) {
    const clientSeed = clientSeeds[i];
    const vendor = vendors[i % vendors.length];
    const name = splitFullName(clientSeed.nombre);
    const { idComuna, idSector } = await getSectorId(clientSeed.comuna, clientSeed.sector);

    const cliente = await prisma.cliente.upsert({
      where: { rut: clientSeed.rut },
      update: {
        ...name,
        idComuna,
        idSector,
        idVendedor: vendor.idUsuario,
      },
      create: {
        rut: clientSeed.rut,
        ...name,
        telefono: `+569${Math.floor(10000000 + Math.random() * 90000000)}`,
        correo: `${clientSeed.nombre.toLowerCase().replace(/\s+/g, ".")}@email.local`,
        calle: "Calle Demo",
        numero: String(i + 1),
        idComuna,
        idSector,
        idVendedor: vendor.idUsuario,
        fechaCreacion: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000),
      },
    });
    clients.push(cliente);
  }

  const productSeeds = [
    { codigo: "LENT-001", nombre: "Lentes Monofocales", precio: 45000, categoria: "Lentes" },
    { codigo: "LENT-002", nombre: "Lentes Bifocales", precio: 65000, categoria: "Lentes" },
    { codigo: "LENT-003", nombre: "Lentes Progresivos", precio: 120000, categoria: "Lentes" },
    { codigo: "MARC-001", nombre: "Marco Metal Clasico", precio: 35000, categoria: "Marcos" },
    { codigo: "MARC-002", nombre: "Marco Acetato Premium", precio: 55000, categoria: "Marcos" },
    { codigo: "SOL-001", nombre: "Lentes de Sol Polarizados", precio: 75000, categoria: "Accesorios" },
    { codigo: "LIMPIA-001", nombre: "Kit de Limpieza", precio: 8000, categoria: "Accesorios" },
    { codigo: "ESTUCHE-001", nombre: "Estuche Rigido", precio: 5000, categoria: "Accesorios" },
  ];

  const products = [];
  for (const productSeed of productSeeds) {
    const categoria = await prisma.categoriaProducto.upsert({
      where: { nombre: productSeed.categoria },
      update: {},
      create: { nombre: productSeed.categoria },
    });

    const product = await prisma.producto.upsert({
      where: { codigo: productSeed.codigo },
      update: {
        nombre: productSeed.nombre,
        precio: productSeed.precio,
        idCategoria: categoria.idCategoria,
      },
      create: {
        codigo: productSeed.codigo,
        nombre: productSeed.nombre,
        precio: productSeed.precio,
        idCategoria: categoria.idCategoria,
      },
    });
    products.push(product);
  }

  if ((await prisma.venta.count()) === 0) {
    for (let i = 0; i < 30; i += 1) {
      const cliente = clients[Math.floor(Math.random() * clients.length)];
      const saleProducts = products.sort(() => Math.random() - 0.5).slice(0, Math.floor(Math.random() * 3) + 1);
      const total = saleProducts.reduce((sum, product) => sum + Number(product.precio), 0);

      await prisma.venta.create({
        data: {
          idCliente: cliente.idCliente,
          fechaVenta: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000),
          total,
          tipoDocumento: Math.random() > 0.5 ? "Boleta" : "Factura",
          items: {
            create: saleProducts.map((product) => ({
              idProducto: product.idProducto,
              cantidad: 1,
              precioUnitario: product.precio,
            })),
          },
        },
      });
    }
  }

  console.log("[OK] Demo data ready");
  console.log(`[INFO] Admin: ${process.env.ADMIN_EMAIL || "admin@dannig.local"} / ${adminPassword}`);
  console.log(`[INFO] Captador: ${process.env.CAPTADOR_EMAIL || "captador@dannig.local"} / ${captadorPassword}`);
  console.log(`[INFO] Oftalmologo: ${process.env.OFTALMOLOGO_EMAIL || "oftalmologo@dannig.local"} / ${oftalmologoPassword}`);
}

main()
  .catch((error) => {
    console.error("[ERROR] Failed loading demo data:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
