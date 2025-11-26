import { FastifyInstance } from "fastify";
import { prisma } from "../db";

/**
 * Dashboard routes - Main metrics and KPIs for the system
 * Provides aggregated data for the main dashboard
 */
export async function dashboardRoutes(app: FastifyInstance) {
  // Requires JWT authentication on all routes
  app.addHook("preHandler", (app as any).authenticate);
  
  // Only admin can access dashboard
  app.addHook("preHandler", (app as any).authorize(["admin"]));

  /**
   * GET /dashboard/metrics
   * Returns main KPIs and metrics for the dashboard
   */
  app.get("/metrics", async (req, reply) => {
    try {
      const ahora = new Date();
      const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59);

      // Total clients
      const totalClientes = await prisma.cliente.count();

      // New clients this month
      const clientesNuevosMes = await prisma.cliente.count({
        where: {
          fechaCreacion: {
            gte: inicioMes,
            lte: finMes,
          },
        },
      });

      // Total appointments
      const totalCitas = await prisma.cita.count();

      // Appointments this month
      const citasMes = await prisma.cita.count({
        where: {
          fechaHora: {
            gte: inicioMes,
            lte: finMes,
          },
        },
      });

      // Appointments by status
      const citasPorEstado = await prisma.cita.groupBy({
        by: ["estado"],
        _count: {
          estado: true,
        },
      });

      // No-show rate (calculate from appointments)
      const citasNoShow = await prisma.cita.count({
        where: {
          estado: "NoShow",
          fechaHora: {
            gte: inicioMes,
            lte: finMes,
          },
        },
      });
      const tasaNoShow = citasMes > 0 ? (citasNoShow / citasMes) * 100 : 0;

      // Total sales
      const totalVentas = await prisma.venta.count();

      // Sales this month
      const ventasMes = await prisma.venta.count({
        where: {
          fechaVenta: {
            gte: inicioMes,
            lte: finMes,
          },
        },
      });

      // Revenue this month
      const ventasMesData = await prisma.venta.findMany({
        where: {
          fechaVenta: {
            gte: inicioMes,
            lte: finMes,
          },
        },
        select: {
          total: true,
        },
      });
      const ingresosMes = ventasMesData.reduce((sum, v) => sum + Number(v.total), 0);

      // Total revenue
      const todasVentas = await prisma.venta.findMany({
        select: {
          total: true,
        },
      });
      const ingresosTotales = todasVentas.reduce((sum, v) => sum + Number(v.total), 0);

      // Conversion rate: clients with sales / total clients
      const clientesConVentas = await prisma.venta.findMany({
        select: {
          idCliente: true,
        },
        distinct: ["idCliente"],
      });
      const tasaConversion = totalClientes > 0 
        ? (clientesConVentas.length / totalClientes) * 100 
        : 0;

      // Pending alerts
      const alertasPendientes = await prisma.alerta.count({
        where: {
          enviado: 0,
          fechaProgramada: {
            lte: ahora,
          },
        },
      });

      // Top vendors by clients captured
      const topVendedores = await prisma.usuario.findMany({
        where: {
          roles: {
            some: {
              rol: {
                nombre: "captador",
              },
            },
          },
        },
        include: {
          clientesCaptados: {
            where: {
              fechaCreacion: {
                gte: inicioMes,
                lte: finMes,
              },
            },
          },
        },
        take: 5,
      });

      // Recent sales (last 5)
      const ventasRecientes = await prisma.venta.findMany({
        take: 5,
        orderBy: {
          fechaVenta: "desc",
        },
        include: {
          cliente: {
            select: {
              nombre: true,
              rut: true,
            },
          },
        },
      });

      // Sales by month (last 6 months)
      const mesesAtras = 6;
      const ventasPorMes: Array<{ mes: string; total: number; cantidad: number }> = [];
      
      for (let i = mesesAtras - 1; i >= 0; i--) {
        const fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
        const fechaFin = new Date(ahora.getFullYear(), ahora.getMonth() - i + 1, 0, 23, 59, 59);
        
        const ventas = await prisma.venta.findMany({
          where: {
            fechaVenta: {
              gte: fechaInicio,
              lte: fechaFin,
            },
          },
          select: {
            total: true,
          },
        });

        const mes = fechaInicio.toLocaleDateString("es-CL", { month: "short", year: "numeric" });
        const total = ventas.reduce((sum, v) => sum + Number(v.total), 0);
        
        ventasPorMes.push({
          mes,
          total,
          cantidad: ventas.length,
        });
      }

      return {
        kpis: {
          totalClientes,
          clientesNuevosMes,
          totalCitas,
          citasMes,
          tasaNoShow: Math.round(tasaNoShow * 100) / 100,
          totalVentas,
          ventasMes,
          ingresosMes: Math.round(ingresosMes * 100) / 100,
          ingresosTotales: Math.round(ingresosTotales * 100) / 100,
          tasaConversion: Math.round(tasaConversion * 100) / 100,
          alertasPendientes,
        },
        citasPorEstado: citasPorEstado.map((item) => ({
          estado: item.estado,
          cantidad: item._count.estado,
        })),
        topVendedores: topVendedores.map((v) => ({
          idUsuario: v.idUsuario,
          nombre: v.nombre,
          clientesCaptados: v.clientesCaptados.length,
        })),
        ventasRecientes: ventasRecientes.map((v) => ({
          idVenta: v.idVenta,
          fechaVenta: v.fechaVenta,
          total: Number(v.total),
          cliente: v.cliente,
        })),
        ventasPorMes,
      };
    } catch (error: any) {
      req.log.error({ error }, "Error fetching dashboard metrics");
      return reply.code(500).send({ error: "Error al obtener métricas del dashboard" });
    }
  });
}








