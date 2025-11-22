/**
 * Módulo de rutas para gestión de ventas
 * 
 * Este módulo maneja todas las operaciones relacionadas con las ventas de productos:
 * - Creación de ventas con múltiples productos
 * - Asociación de ventas con recetas oftalmológicas
 * - Consulta de historial de ventas
 * - Cálculo automático de totales
 */

import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db";
import { registrarAuditoriaDesdeRequest } from "../utils/auditoria";

// Esquema de validación para un item de venta
const itemVentaSchema = z.object({
  idProducto: z.number().int().positive(),
  cantidad: z.number().int().positive(),
  precioUnitario: z.number().positive(),
});

// Esquema de validación para crear una nueva venta
const createVentaSchema = z.object({
  idCliente: z.number().int().positive(),
  idReceta: z.number().int().positive().optional().nullable(),
  tipoDocumento: z.enum(["Boleta", "Factura"]).optional().nullable(),
  items: z.array(itemVentaSchema).min(1, "Debe incluir al menos un producto"),
});

export async function ventaRoutes(app: FastifyInstance) {
  // Middleware de autenticación: todas las rutas requieren JWT válido
  app.addHook("preHandler", (app as any).authenticate);
  
  // Middleware de autorización: solo usuarios con rol admin pueden acceder
  // En el futuro se puede agregar el rol vendedor
  app.addHook("preHandler", (app as any).authorize(["admin"]));

  /**
   * POST /ventas
   * Crea una nueva venta asociada a un cliente
   * Opcionalmente puede estar asociada a una receta oftalmológica
   * 
   * Body:
   * - idCliente: ID del cliente (requerido)
   * - idReceta: ID de la receta (opcional)
   * - items: Array de productos con cantidad y precio (requerido, mínimo 1)
   * 
   * Retorna: La venta creada con todos sus items y relaciones
   */
  app.post("/", async (req, reply) => {
    const parsed = createVentaSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return reply.code(400).send({ 
        error: "Datos inválidos", 
        issues: parsed.error.flatten() 
      });
    }

    const { idCliente, idReceta, tipoDocumento, items } = parsed.data;

    try {
      // Validar que el cliente existe
      const cliente = await prisma.cliente.findUnique({
        where: { idCliente }
      });

      if (!cliente) {
        return reply.code(404).send({ error: "Cliente no encontrado" });
      }

      // Validar que la receta existe si se proporciona
      if (idReceta) {
        const receta = await prisma.receta.findUnique({
          where: { idReceta }
        });

        if (!receta) {
          return reply.code(404).send({ error: "Receta no encontrada" });
        }
      }

      // Validar que todos los productos existen y obtener precios actuales
      const productos = await prisma.producto.findMany({
        where: {
          idProducto: {
            in: items.map(item => item.idProducto)
          }
        }
      });

      if (productos.length !== items.length) {
        return reply.code(400).send({ error: "Uno o más productos no encontrados" });
      }

      // Calcular total de la venta
      const total = items.reduce((sum, item) => {
        return sum + (item.precioUnitario * item.cantidad);
      }, 0);

      // Crear venta con items en una transacción
      const venta = await prisma.$transaction(async (tx) => {
        // Crear la venta
        const nuevaVenta = await tx.venta.create({
          data: {
            idCliente,
            idReceta: idReceta || null,
            tipoDocumento: tipoDocumento || null,
            total,
          }
        });

        // Crear los items de venta
        const itemsVenta = await Promise.all(
          items.map(item =>
            tx.itemVenta.create({
              data: {
                idVenta: nuevaVenta.idVenta,
                idProducto: item.idProducto,
                cantidad: item.cantidad,
                precioUnitario: item.precioUnitario,
              },
              include: {
                producto: true
              }
            })
          )
        );

        return {
          ...nuevaVenta,
          items: itemsVenta
        };
      });

      // Obtener venta completa con relaciones
      const ventaCompleta = await prisma.venta.findUnique({
        where: { idVenta: venta.idVenta },
        include: {
          cliente: true,
          receta: {
            include: {
              ficha: {
                include: {
                  cita: {
                    include: {
                      cliente: true
                    }
                  }
                }
              }
            }
          },
          items: {
            include: {
              producto: true,
              garantia: true
            }
          }
        }
      });

      if (!ventaCompleta) {
        throw new Error("Error retrieving created venta");
      }

      // Log audit
      registrarAuditoriaDesdeRequest(req, {
        tabla: "venta",
        operacion: "CREATE",
        registroId: ventaCompleta.idVenta,
        datosNuevos: ventaCompleta,
      }).catch((err) => {
        req.log.warn({ error: err }, "Failed to log audit for venta creation");
      });

      return reply.code(201).send(ventaCompleta);
    } catch (error: any) {
      console.error("Error creando venta:", error);
      return reply.code(500).send({ error: "Error interno del servidor" });
    }
  });

  /**
   * GET /ventas
   * Lista todas las ventas con filtros opcionales
   * 
   * Query params opcionales:
   * - clienteId: Filtrar por cliente específico
   * - desde: Fecha de inicio para filtrar por rango
   * - hasta: Fecha de fin para filtrar por rango
   * - limit: Cantidad máxima de resultados (default: 50)
   * - offset: Desplazamiento para paginación (default: 0)
   * 
   * Retorna: Array de ventas con información de cliente, receta e items
   */
  app.get("/", async (req) => {
    const { 
      clienteId, 
      desde, 
      hasta, 
      limit = "50",
      offset = "0" 
    } = (req.query || {}) as {
      clienteId?: string;
      desde?: string;
      hasta?: string;
      limit?: string;
      offset?: string;
    };

    const where: any = {};

    if (clienteId) {
      where.idCliente = Number(clienteId);
    }

    if (desde || hasta) {
      where.fechaVenta = {};
      if (desde) where.fechaVenta.gte = new Date(desde);
      if (hasta) where.fechaVenta.lte = new Date(hasta);
    }

    const ventas = await prisma.venta.findMany({
      where,
      include: {
        cliente: {
          select: {
            idCliente: true,
            rut: true,
            nombre: true,
            telefono: true,
            correo: true
          }
        },
        receta: {
          select: {
            idReceta: true,
            fechaEmision: true
          }
        },
        items: {
          include: {
            producto: true,
            garantia: true
          }
        }
      },
      orderBy: { fechaVenta: "desc" },
      take: Number(limit),
      skip: Number(offset)
    });

    return ventas;
  });

  /**
   * GET /ventas/:id
   * Obtiene una venta específica por su ID
   * Incluye toda la información relacionada: cliente, receta, items, productos y garantías
   * 
   * Params:
   * - id: ID de la venta
   * 
   * Retorna: Objeto de venta completo o 404 si no existe
   */
  app.get<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return reply.code(400).send({ error: "ID inválido" });
    }

    const venta = await prisma.venta.findUnique({
      where: { idVenta: id },
      include: {
        cliente: true,
        receta: {
          include: {
            ficha: {
              include: {
                cita: {
                  include: {
                    cliente: true
                  }
                }
              }
            }
          }
        },
        items: {
          include: {
            producto: true,
            garantia: true
          }
        }
      }
    });

    if (!venta) {
      return reply.code(404).send({ error: "Venta no encontrada" });
    }

    return venta;
  });

  /**
   * GET /ventas/cliente/:clienteId
   * Obtiene todas las ventas de un cliente específico
   * Incluye estadísticas: total de ventas, ingresos totales y promedio por venta
   * 
   * Params:
   * - clienteId: ID del cliente
   * 
   * Retorna: Objeto con información del cliente, array de ventas y estadísticas
   */
  app.get<{ Params: { clienteId: string } }>("/cliente/:clienteId", async (req, reply) => {
    const clienteId = Number(req.params.clienteId);

    if (isNaN(clienteId)) {
      return reply.code(400).send({ error: "ID de cliente inválido" });
    }

    // Verificar que el cliente existe
    const cliente = await prisma.cliente.findUnique({
      where: { idCliente: clienteId }
    });

    if (!cliente) {
      return reply.code(404).send({ error: "Cliente no encontrado" });
    }

    const ventas = await prisma.venta.findMany({
      where: { idCliente: clienteId },
      include: {
        receta: {
          select: {
            idReceta: true,
            fechaEmision: true
          }
        },
        items: {
          include: {
            producto: true,
            garantia: true
          }
        }
      },
      orderBy: { fechaVenta: "desc" }
    });

    return {
      cliente,
      ventas,
      estadisticas: {
        totalVentas: ventas.length,
        totalIngresos: ventas.reduce((sum, v) => sum + Number(v.total), 0),
        promedioVenta: ventas.length > 0 
          ? ventas.reduce((sum, v) => sum + Number(v.total), 0) / ventas.length 
          : 0
      }
    };
  });
}

