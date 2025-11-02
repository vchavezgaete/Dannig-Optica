// src/routes/reportes.ts
import { FastifyInstance } from "fastify";
import { prisma } from "../db";

export async function reporteRoutes(app: FastifyInstance) {
  // 🔐 Require JWT on all routes
  app.addHook("preHandler", (app as any).authenticate);
  
  // 🔒 Solo admin puede acceder a reportes
  app.addHook("preHandler", (app as any).authorize(["admin"]));

  app.get("/", async (req, reply) => {
    const { tipo, fechaDesde, fechaHasta, limit } = req.query as {
      tipo?: string;
      fechaDesde?: string;
      fechaHasta?: string;
      limit?: string;
    };

    if (!tipo) {
      return reply.status(400).send({ error: "Parameter 'tipo' is required" });
    }

    const limitNum = limit ? parseInt(limit) : 10;

    try {
      switch (tipo) {
        case "top-vendedores":
          return await getTopVendedores(fechaDesde, fechaHasta, limitNum);
        
        case "productos-mas-vendidos":
          return await getProductosMasVendidos(fechaDesde, fechaHasta, limitNum);
        
        case "ventas-por-periodo":
          return await getVentasPorPeriodo(fechaDesde, fechaHasta);
        
        case "clientes-nuevos":
          return await getClientesNuevos(fechaDesde, fechaHasta, limitNum);
        
        case "top-clientes":
          return await getTopClientes(fechaDesde, fechaHasta, limitNum);
        
        case "horas-agendadas":
          return await getHorasAgendadas(fechaDesde, fechaHasta, limitNum);
        
        default:
          return reply.status(400).send({ 
            error: "Invalid report type",
            validTypes: [
              "top-vendedores",
              "productos-mas-vendidos",
              "ventas-por-periodo",
              "clientes-nuevos",
              "top-clientes",
              "horas-agendadas"
            ]
          });
      }
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });
}

// Top Vendors by Clients Captured
async function getTopVendedores(
  fechaDesde?: string,
  fechaHasta?: string,
  limit: number = 10
) {
  const whereClause = buildDateFilter(fechaDesde, fechaHasta, "fechaCreacion");

  const vendedores = await prisma.usuario.findMany({
    where: { activo: 1 },
    include: {
      clientesCaptados: {
        where: whereClause,
        select: { 
          idCliente: true,
          nombre: true,
          fechaCreacion: true
        }
      },
      roles: { 
        include: { 
          rol: { 
            select: { nombre: true } 
          } 
        } 
      }
    }
  });

  const result = vendedores
    .map(v => ({
      idUsuario: v.idUsuario,
      nombre: v.nombre,
      correo: v.correo,
      totalClientes: v.clientesCaptados.length,
      roles: v.roles.map(r => r.rol.nombre),
      clientes: v.clientesCaptados
    }))
    .filter(v => v.totalClientes > 0)
    .sort((a, b) => b.totalClientes - a.totalClientes)
    .slice(0, limit);

  return {
    tipo: "top-vendedores",
    fechaDesde: fechaDesde || null,
    fechaHasta: fechaHasta || null,
    total: result.length,
    datos: result
  };
}

// Most Sold Products
async function getProductosMasVendidos(
  fechaDesde?: string,
  fechaHasta?: string,
  limit: number = 10
) {
  const dateFilter = buildDateFilter(fechaDesde, fechaHasta, "fechaVenta");
  
  const itemsVenta = await prisma.itemVenta.findMany({
    where: {
      venta: dateFilter ? { ...dateFilter } : undefined
    },
    include: {
      producto: {
        select: {
          idProducto: true,
          codigo: true,
          nombre: true,
          precio: true,
          tipo: true
        }
      },
      venta: {
        select: {
          fechaVenta: true
        }
      }
    }
  });

  // Group by product and calculate totals
  const productMap = new Map<number, {
    producto: any;
    cantidadVendida: number;
    ingresoTotal: number;
  }>();

  for (const item of itemsVenta) {
    const existing = productMap.get(item.producto.idProducto);
    const ingreso = Number(item.precioUnitario) * item.cantidad;
    
    if (existing) {
      existing.cantidadVendida += item.cantidad;
      existing.ingresoTotal += ingreso;
    } else {
      productMap.set(item.producto.idProducto, {
        producto: item.producto,
        cantidadVendida: item.cantidad,
        ingresoTotal: ingreso
      });
    }
  }

  const result = Array.from(productMap.values())
    .sort((a, b) => b.cantidadVendida - a.cantidadVendida)
    .slice(0, limit)
    .map(item => ({
      ...item.producto,
      cantidadVendida: item.cantidadVendida,
      ingresoTotal: item.ingresoTotal
    }));

  return {
    tipo: "productos-mas-vendidos",
    fechaDesde: fechaDesde || null,
    fechaHasta: fechaHasta || null,
    total: result.length,
    datos: result
  };
}

// Sales by Period
async function getVentasPorPeriodo(
  fechaDesde?: string,
  fechaHasta?: string
) {
  const whereClause = buildDateFilter(fechaDesde, fechaHasta, "fechaVenta");

  const ventas = await prisma.venta.findMany({
    where: whereClause,
    select: {
      idVenta: true,
      fechaVenta: true,
      total: true,
      cliente: {
        select: {
          nombre: true
        }
      }
    },
    orderBy: {
      fechaVenta: "desc"
    }
  });

  const totalVentas = ventas.length;
  const ingresoTotal = ventas.reduce((sum, v) => sum + Number(v.total), 0);
  const promedioVenta = totalVentas > 0 ? ingresoTotal / totalVentas : 0;

  return {
    tipo: "ventas-por-periodo",
    fechaDesde: fechaDesde || null,
    fechaHasta: fechaHasta || null,
    estadisticas: {
      totalVentas,
      ingresoTotal,
      promedioVenta
    },
    datos: ventas
  };
}

// New Clients
async function getClientesNuevos(
  fechaDesde?: string,
  fechaHasta?: string,
  limit: number = 10
) {
  const whereClause = buildDateFilter(fechaDesde, fechaHasta, "fechaCreacion");

  const clientes = await prisma.cliente.findMany({
    where: whereClause,
    include: {
      vendedor: {
        select: {
          idUsuario: true,
          nombre: true,
          correo: true
        }
      }
    },
    orderBy: {
      fechaCreacion: "desc"
    },
    take: limit
  });

  return {
    tipo: "clientes-nuevos",
    fechaDesde: fechaDesde || null,
    fechaHasta: fechaHasta || null,
    total: clientes.length,
    datos: clientes
  };
}

// Top Clients by Purchase Amount
async function getTopClientes(
  fechaDesde?: string,
  fechaHasta?: string,
  limit: number = 10
) {
  const dateFilter = buildDateFilter(fechaDesde, fechaHasta, "fechaVenta");

  const ventas = await prisma.venta.findMany({
    where: dateFilter,
    include: {
      cliente: {
        select: {
          idCliente: true,
          rut: true,
          nombre: true,
          telefono: true,
          correo: true
        }
      }
    }
  });

  // Group by client and calculate totals
  const clientMap = new Map<number, {
    cliente: any;
    totalCompras: number;
    montoTotal: number;
    ultimaCompra: Date;
  }>();

  for (const venta of ventas) {
    const existing = clientMap.get(venta.cliente.idCliente);
    const monto = Number(venta.total);
    
    if (existing) {
      existing.totalCompras += 1;
      existing.montoTotal += monto;
      if (venta.fechaVenta > existing.ultimaCompra) {
        existing.ultimaCompra = venta.fechaVenta;
      }
    } else {
      clientMap.set(venta.cliente.idCliente, {
        cliente: venta.cliente,
        totalCompras: 1,
        montoTotal: monto,
        ultimaCompra: venta.fechaVenta
      });
    }
  }

  const result = Array.from(clientMap.values())
    .sort((a, b) => b.montoTotal - a.montoTotal)
    .slice(0, limit)
    .map(item => ({
      ...item.cliente,
      totalCompras: item.totalCompras,
      montoTotal: item.montoTotal,
      promedioCompra: item.montoTotal / item.totalCompras,
      ultimaCompra: item.ultimaCompra
    }));

  return {
    tipo: "top-clientes",
    fechaDesde: fechaDesde || null,
    fechaHasta: fechaHasta || null,
    total: result.length,
    datos: result
  };
}

// Reporte de horas agendadas
async function getHorasAgendadas(fechaDesde?: string, fechaHasta?: string, limit: number = 10) {
  const whereClause: any = {};
  
  if (fechaDesde || fechaHasta) {
    whereClause.fechaHora = {};
    if (fechaDesde) {
      whereClause.fechaHora.gte = new Date(fechaDesde);
    }
    if (fechaHasta) {
      whereClause.fechaHora.lte = new Date(fechaHasta);
    }
  }

  const citas = await prisma.cita.findMany({
    where: whereClause,
    include: {
      cliente: {
        select: {
          idCliente: true,
          nombre: true,
          rut: true,
          telefono: true,
          correo: true
        }
      }
    },
    orderBy: { fechaHora: "desc" },
    take: limit
  });

  // Estadísticas adicionales
  const totalCitas = await prisma.cita.count({ where: whereClause });
  
  const citasPorEstado = await prisma.cita.groupBy({
    by: ["estado"],
    where: whereClause,
    _count: { estado: true }
  });

  const citasPorMes = await prisma.cita.groupBy({
    by: ["fechaHora"],
    where: whereClause,
    _count: { fechaHora: true },
    orderBy: { fechaHora: "desc" }
  });

  return {
    tipo: "horas-agendadas",
    fechaDesde: fechaDesde || null,
    fechaHasta: fechaHasta || null,
    total: totalCitas,
    estadisticas: {
      porEstado: citasPorEstado.map(item => ({
        estado: item.estado,
        cantidad: item._count.estado
      })),
      totalCitas: totalCitas
    },
    datos: citas.map(cita => ({
      idCita: cita.idCita,
      fechaHora: cita.fechaHora,
      estado: cita.estado,
      tipoConsulta: null, // Campo no disponible en el modelo actual
      observaciones: null, // Campo no disponible en el modelo actual
      cliente: {
        idCliente: cita.cliente.idCliente,
        nombre: cita.cliente.nombre,
        rut: cita.cliente.rut,
        telefono: cita.cliente.telefono,
        correo: cita.cliente.correo
      }
    }))
  };
}

// Helper function to build date filters
function buildDateFilter(
  fechaDesde?: string,
  fechaHasta?: string,
  fieldName: string = "fechaCreacion"
): any {
  if (!fechaDesde && !fechaHasta) {
    return {};
  }

  const filter: any = {};
  
  if (fechaDesde || fechaHasta) {
    filter[fieldName] = {};
    if (fechaDesde) {
      filter[fieldName].gte = new Date(fechaDesde);
    }
    if (fechaHasta) {
      // Add 1 day to include the entire end date
      const endDate = new Date(fechaHasta);
      endDate.setDate(endDate.getDate() + 1);
      filter[fieldName].lt = endDate;
    }
  }

  return filter;
}

