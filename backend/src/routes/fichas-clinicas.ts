import { FastifyInstance } from "fastify";
import { prisma } from "../db";

export async function fichaClinicaRoutes(app: FastifyInstance) {
  // Requires JWT authentication on all routes
  app.addHook("preHandler", (app as any).authenticate);

  // Only ophthalmologists and admin can access
  app.addHook("preHandler", (app as any).authorize(["admin", "oftalmologo"]));

  // POST /fichas-clinicas - Crear ficha clínica
  app.post("/", async (req, reply) => {
    const body = req.body as {
      idCita: number;
      antecedentesGenerales?: string;
      antecedentesOftalmologicos?: string;
      observaciones?: string;
    };

    if (!body?.idCita) {
      return reply.code(400).send({ error: "idCita es requerido" });
    }

    try {
      // Verificar que la cita existe
      const cita = await prisma.cita.findUnique({
        where: { idCita: body.idCita },
        include: { cliente: true }
      });

      if (!cita) {
        return reply.code(404).send({ error: "Cita no encontrada" });
      }

      // Verificar que no existe ya una ficha para esta cita
      const fichaExistente = await prisma.fichaClinica.findUnique({
        where: { idCita: body.idCita }
      });

      if (fichaExistente) {
        return reply.code(409).send({ error: "Ya existe una ficha clínica para esta cita" });
      }

      // Crear ficha clínica
      const ficha = await prisma.fichaClinica.create({
        data: {
          idCita: body.idCita,
          observaciones: body.observaciones || null,
        },
        include: {
          cita: {
            include: {
              cliente: true
            }
          }
        }
      });

      return reply.code(201).send(ficha);
    } catch (error: any) {
      console.error("Error creando ficha clínica:", error);
      return reply.code(500).send({ error: "Error interno del servidor" });
    }
  });

  // GET /fichas-clinicas/:id - Obtener ficha clínica por ID
  app.get("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const idFicha = Number(id);

    if (isNaN(idFicha)) {
      return reply.code(400).send({ error: "ID inválido" });
    }

    try {
      const ficha = await prisma.fichaClinica.findUnique({
        where: { idFicha },
        include: {
          cita: {
            include: {
              cliente: true
            }
          },
          recetas: true
        }
      });

      if (!ficha) {
        return reply.code(404).send({ error: "Ficha clínica no encontrada" });
      }

      return ficha;
    } catch (error: any) {
      console.error("Error obteniendo ficha clínica:", error);
      return reply.code(500).send({ error: "Error interno del servidor" });
    }
  });

  // PUT /fichas-clinicas/:id - Actualizar ficha clínica
  app.put("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const idFicha = Number(id);
    const body = req.body as {
      antecedentesGenerales?: string;
      antecedentesOftalmologicos?: string;
      observaciones?: string;
    };

    if (isNaN(idFicha)) {
      return reply.code(400).send({ error: "ID inválido" });
    }

    try {
      const ficha = await prisma.fichaClinica.update({
        where: { idFicha },
        data: {
          observaciones: body.observaciones,
        },
        include: {
          cita: {
            include: {
              cliente: true
            }
          },
          recetas: true
        }
      });

      return ficha;
    } catch (error: any) {
      console.error("Error actualizando ficha clínica:", error);
      return reply.code(500).send({ error: "Error interno del servidor" });
    }
  });

  // GET /fichas-clinicas - Listar fichas clínicas
  app.get("/", async (req) => {
    const { clienteId, fechaDesde, fechaHasta } = (req.query || {}) as {
      clienteId?: string;
      fechaDesde?: string;
      fechaHasta?: string;
    };

    const where: any = {};

    if (clienteId) {
      where.cita = {
        idCliente: Number(clienteId)
      };
    }

    if (fechaDesde || fechaHasta) {
      where.fechaRegistro = {};
      if (fechaDesde) where.fechaRegistro.gte = new Date(fechaDesde);
      if (fechaHasta) where.fechaRegistro.lte = new Date(fechaHasta);
    }

    return prisma.fichaClinica.findMany({
      where,
      include: {
        cita: {
          include: {
            cliente: true
          }
        },
        recetas: true
      },
      orderBy: { fechaRegistro: "desc" },
      take: 100
    });
  });
}
