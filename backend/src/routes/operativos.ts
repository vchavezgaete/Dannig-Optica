import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db";
import { generarAlertasOperativos } from "../services/alertas";

export async function operativoRoutes(app: FastifyInstance) {
  // Requires JWT authentication on all routes
  app.addHook("preHandler", (app as any).authenticate);
  
  // Only admin can manage operativos
  app.addHook("preHandler", (app as any).authorize(["admin"]));

  // Schema for creating operativo
  const createOperativoSchema = z.object({
    nombre: z.string().min(1, "Nombre es requerido").max(120, "Nombre no puede exceder 120 caracteres"),
    fecha: z.string().transform((v) => new Date(v)),
    lugar: z.string().max(150, "Lugar no puede exceder 150 caracteres").optional().nullable(),
    cupos: z.number().int().positive("Cupos debe ser un número positivo").optional().nullable(),
  });

  // Schema for updating operativo
  const updateOperativoSchema = z.object({
    nombre: z.string().min(1).max(120).optional(),
    fecha: z.string().transform((v) => new Date(v)).optional(),
    lugar: z.string().max(150).optional().nullable(),
    cupos: z.number().int().positive().optional().nullable(),
  });

  // GET /operativos - List all operativos
  app.get("/", async (req) => {
    const { fechaDesde, fechaHasta } = (req.query || {}) as {
      fechaDesde?: string;
      fechaHasta?: string;
    };

    const where: any = {};

    if (fechaDesde || fechaHasta) {
      where.fecha = {};
      if (fechaDesde) where.fecha.gte = new Date(fechaDesde);
      if (fechaHasta) where.fecha.lte = new Date(fechaHasta);
    }

    const operativos = await prisma.operativo.findMany({
      where,
      include: {
        _count: {
          select: {
            citas: true,
          },
        },
      },
      orderBy: { fecha: "desc" },
    });

    // Calculate available slots
    return operativos.map((op) => ({
      ...op,
      citasAgendadas: op._count.citas,
      cuposDisponibles: op.cupos ? op.cupos - op._count.citas : null,
    }));
  });

  // GET /operativos/:id - Get operativo by ID
  app.get<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return reply.code(400).send({ error: "ID inválido" });
    }

    const operativo = await prisma.operativo.findUnique({
      where: { idOperativo: id },
      include: {
        citas: {
          include: {
            cliente: {
              select: {
                idCliente: true,
                nombre: true,
                rut: true,
              },
            },
          },
          orderBy: { fechaHora: "asc" },
        },
        _count: {
          select: {
            citas: true,
          },
        },
      },
    });

    if (!operativo) {
      return reply.code(404).send({ error: "Operativo no encontrado" });
    }

    const cuposDisponibles = operativo.cupos 
      ? operativo.cupos - operativo._count.citas 
      : null;

    return {
      ...operativo,
      citasAgendadas: operativo._count.citas,
      cuposDisponibles,
    };
  });

  // POST /operativos - Create operativo
  app.post("/", async (req, reply) => {
    const parsed = createOperativoSchema.safeParse(req.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Error de validación",
        details: parsed.error.errors,
      });
    }

    try {
      const operativo = await prisma.operativo.create({
        data: {
          nombre: parsed.data.nombre,
          fecha: parsed.data.fecha,
          lugar: parsed.data.lugar || null,
          cupos: parsed.data.cupos || null,
        },
      });

      // Generate alerts for new operativo (async, don't block response)
      generarAlertasOperativos(operativo.idOperativo).catch((error) => {
        req.log.error({ error, operativoId: operativo.idOperativo }, 'Error generating alerts for new operativo');
      });

      return reply.code(201).send(operativo);
    } catch (error: any) {
      req.log.error({ error }, 'Error creating operativo');
      return reply.code(500).send({ error: "Error al crear operativo" });
    }
  });

  // PUT /operativos/:id - Update operativo
  app.put<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return reply.code(400).send({ error: "ID inválido" });
    }

    const parsed = updateOperativoSchema.safeParse(req.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Error de validación",
        details: parsed.error.errors,
      });
    }

    // Build update data
    const updateData: any = {};
    if (parsed.data.nombre !== undefined) updateData.nombre = parsed.data.nombre;
    if (parsed.data.fecha !== undefined) updateData.fecha = parsed.data.fecha;
    if (parsed.data.lugar !== undefined) updateData.lugar = parsed.data.lugar;
    if (parsed.data.cupos !== undefined) updateData.cupos = parsed.data.cupos;

    try {
      const operativo = await prisma.operativo.update({
        where: { idOperativo: id },
        data: updateData,
        include: {
          _count: {
            select: {
              citas: true,
            },
          },
        },
      });

      const cuposDisponibles = operativo.cupos 
        ? operativo.cupos - operativo._count.citas 
        : null;

      return {
        ...operativo,
        citasAgendadas: operativo._count.citas,
        cuposDisponibles,
      };
    } catch (error: any) {
      if (error?.code === "P2025") {
        return reply.code(404).send({ error: "Operativo no encontrado" });
      }
      req.log.error({ error, idOperativo: id }, 'Error updating operativo');
      return reply.code(500).send({ error: "Error al actualizar operativo" });
    }
  });

  // DELETE /operativos/:id - Delete operativo
  app.delete<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return reply.code(400).send({ error: "ID inválido" });
    }

    try {
      // Check if operativo has appointments
      const operativo = await prisma.operativo.findUnique({
        where: { idOperativo: id },
        include: {
          _count: {
            select: {
              citas: true,
            },
          },
        },
      });

      if (!operativo) {
        return reply.code(404).send({ error: "Operativo no encontrado" });
      }

      if (operativo._count.citas > 0) {
        return reply.code(409).send({ 
          error: "No se puede eliminar el operativo porque tiene citas asociadas",
          citasAsociadas: operativo._count.citas,
        });
      }

      await prisma.operativo.delete({
        where: { idOperativo: id },
      });

      return reply.code(204).send();
    } catch (error: any) {
      req.log.error({ error, idOperativo: id }, 'Error deleting operativo');
      return reply.code(500).send({ error: "Error al eliminar operativo" });
    }
  });
}


