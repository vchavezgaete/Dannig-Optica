/**
 * Módulo de rutas para gestión de garantías
 * 
 * Este módulo maneja todas las operaciones relacionadas con las garantías de productos:
 * - Registro de garantías para items de venta
 * - Consulta de garantías próximas a vencer
 * - Actualización de información de garantías
 * - Filtrado por vencimiento y cliente
 */

import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db";

// Esquema de validación para crear una garantía
// Valida que la fecha de fin sea posterior o igual a la fecha de inicio
const createGarantiaSchema = z.object({
  idItem: z.number().int().positive(),
  fechaInicio: z.string().transform((v) => new Date(v)),
  fechaFin: z.string().transform((v) => new Date(v)),
  condiciones: z.string().optional(),
}).refine(
  (data) => data.fechaFin >= data.fechaInicio,
  {
    message: "La fecha de fin debe ser posterior o igual a la fecha de inicio",
    path: ["fechaFin"]
  }
);

export async function garantiaRoutes(app: FastifyInstance) {
  // Middleware de autenticación: todas las rutas requieren JWT válido
  app.addHook("preHandler", (app as any).authenticate);
  
  // Middleware de autorización: solo usuarios con rol admin pueden acceder
  // En el futuro se puede agregar el rol vendedor
  app.addHook("preHandler", (app as any).authorize(["admin"]));

  /**
   * POST /garantias
   * Crea una garantía para un item de venta específico
   * Cada item de venta solo puede tener una garantía asociada
   * 
   * Body:
   * - idItem: ID del item de venta (requerido)
   * - fechaInicio: Fecha de inicio de la garantía (requerido)
   * - fechaFin: Fecha de fin de la garantía (requerido, debe ser >= fechaInicio)
   * - condiciones: Condiciones especiales de la garantía (opcional)
   * 
   * Retorna: La garantía creada con información del producto y cliente
   */
  app.post("/", async (req, reply) => {
    const parsed = createGarantiaSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return reply.code(400).send({ 
        error: "Datos inválidos", 
        issues: parsed.error.flatten() 
      });
    }

    const { idItem, fechaInicio, fechaFin, condiciones } = parsed.data;

    try {
      // Validar que el item existe
      const item = await prisma.itemVenta.findUnique({
        where: { idItem },
        include: {
          producto: true,
          venta: {
            include: {
              cliente: true
            }
          }
        }
      });

      if (!item) {
        return reply.code(404).send({ error: "Item de venta no encontrado" });
      }

      // Verificar que el item no tenga ya una garantía
      const garantiaExistente = await prisma.garantia.findUnique({
        where: { idItem }
      });

      if (garantiaExistente) {
        return reply.code(409).send({ error: "Este item ya tiene una garantía registrada" });
      }

      // Crear garantía
      const garantia = await prisma.garantia.create({
        data: {
          idItem,
          fechaInicio,
          fechaFin,
          condiciones: condiciones || null
        },
        include: {
          item: {
            include: {
              producto: true,
              venta: {
                include: {
                  cliente: true
                }
              }
            }
          }
        }
      });

      return reply.code(201).send(garantia);
    } catch (error: any) {
      console.error("Error creando garantía:", error);
      return reply.code(500).send({ error: "Error interno del servidor" });
    }
  });

  /**
   * GET /garantias
   * Lista todas las garantías con filtros opcionales
   * 
   * Query params opcionales:
   * - clienteId: Filtrar por cliente específico
   * - vencimientoProximo: Días antes del vencimiento para filtrar garantías próximas
   * - vencidas: "true" para mostrar solo garantías vencidas
   * - desde: Fecha de inicio para filtrar por rango de fechas de inicio
   * - hasta: Fecha de fin para filtrar por rango de fechas de inicio
   * 
   * Retorna: Array de garantías ordenadas por fecha de vencimiento
   */
  app.get("/", async (req) => {
    const { 
      clienteId,
      vencimientoProximo,
      vencidas,
      desde,
      hasta
    } = (req.query || {}) as {
      clienteId?: string;
      vencimientoProximo?: string; // días antes del vencimiento
      vencidas?: string; // "true" o "false"
      desde?: string;
      hasta?: string;
    };

    const where: any = {};

    if (clienteId) {
      where.item = {
        venta: {
          idCliente: Number(clienteId)
        }
      };
    }

    // Filtrar por vencimiento próximo
    if (vencimientoProximo) {
      const dias = Number(vencimientoProximo);
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() + dias);
      
      where.fechaFin = {
        gte: new Date(),
        lte: fechaLimite
      };
    }

    // Filtrar vencidas
    if (vencidas === "true") {
      where.fechaFin = {
        lt: new Date()
      };
    }

    // Filtrar por rango de fechas
    if (desde || hasta) {
      where.fechaInicio = {};
      if (desde) where.fechaInicio.gte = new Date(desde);
      if (hasta) where.fechaInicio.lte = new Date(hasta);
    }

    const garantias = await prisma.garantia.findMany({
      where,
      include: {
        item: {
          include: {
            producto: true,
            venta: {
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
            }
          }
        }
      },
      orderBy: { fechaFin: "asc" }
    });

    return garantias;
  });

  /**
   * GET /garantias/:id
   * Obtiene una garantía específica por su ID
   * Incluye toda la información relacionada: item, producto, venta, cliente y receta
   * 
   * Params:
   * - id: ID de la garantía
   * 
   * Retorna: Objeto de garantía completo o 404 si no existe
   */
  app.get<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return reply.code(400).send({ error: "ID inválido" });
    }

    const garantia = await prisma.garantia.findUnique({
      where: { idGarantia: id },
      include: {
        item: {
          include: {
            producto: true,
            venta: {
              include: {
                cliente: true,
                receta: {
                  include: {
                    ficha: {
                      include: {
                        cita: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!garantia) {
      return reply.code(404).send({ error: "Garantía no encontrada" });
    }

    return garantia;
  });

  /**
   * PUT /garantias/:id
   * Actualiza una garantía existente
   * Solo se pueden actualizar: fechas y condiciones
   * 
   * Params:
   * - id: ID de la garantía
   * 
   * Body opcional:
   * - fechaInicio: Nueva fecha de inicio
   * - fechaFin: Nueva fecha de fin (debe ser >= fechaInicio)
   * - condiciones: Nuevas condiciones
   * 
   * Retorna: La garantía actualizada o 404 si no existe
   */
  app.put<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return reply.code(400).send({ error: "ID inválido" });
    }

    const body = req.body as {
      fechaInicio?: string;
      fechaFin?: string;
      condiciones?: string;
    };

    try {
      // Verificar que la garantía existe
      const garantiaExistente = await prisma.garantia.findUnique({
        where: { idGarantia: id }
      });

      if (!garantiaExistente) {
        return reply.code(404).send({ error: "Garantía no encontrada" });
      }

      // Preparar datos para actualizar
      const updateData: any = {};
      if (body.fechaInicio) updateData.fechaInicio = new Date(body.fechaInicio);
      if (body.fechaFin) updateData.fechaFin = new Date(body.fechaFin);
      if (body.condiciones !== undefined) updateData.condiciones = body.condiciones;

      // Validar que fechaFin >= fechaInicio si ambas se actualizan
      const fechaInicio = updateData.fechaInicio || garantiaExistente.fechaInicio;
      const fechaFin = updateData.fechaFin || garantiaExistente.fechaFin;

      if (fechaFin < fechaInicio) {
        return reply.code(400).send({ 
          error: "La fecha de fin debe ser posterior o igual a la fecha de inicio" 
        });
      }

      const garantia = await prisma.garantia.update({
        where: { idGarantia: id },
        data: updateData,
        include: {
          item: {
            include: {
              producto: true,
              venta: {
                include: {
                  cliente: true
                }
              }
            }
          }
        }
      });

      return garantia;
    } catch (error: any) {
      console.error("Error actualizando garantía:", error);
      return reply.code(500).send({ error: "Error interno del servidor" });
    }
  });

  /**
   * GET /garantias/vencimiento-proximo
   * Obtiene garantías que están próximas a vencer
   * Útil para generar alertas automáticas de vencimiento
   * 
   * Query params opcionales:
   * - dias: Cantidad de días para considerar "próximo" (default: 30)
   * 
   * Retorna: Objeto con array de garantías, total y fecha límite de búsqueda
   */
  app.get("/vencimiento-proximo", async (req) => {
    const { dias = "30" } = (req.query || {}) as { dias?: string };
    
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + Number(dias));

    const garantias = await prisma.garantia.findMany({
      where: {
        fechaFin: {
          gte: new Date(),
          lte: fechaLimite
        }
      },
      include: {
        item: {
          include: {
            producto: true,
            venta: {
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
            }
          }
        }
      },
      orderBy: { fechaFin: "asc" }
    });

    return {
      garantias,
      total: garantias.length,
      fechaLimite: fechaLimite.toISOString()
    };
  });
}

