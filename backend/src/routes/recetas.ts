import { FastifyInstance } from "fastify";
import { prisma } from "../db";

export async function recetaRoutes(app: FastifyInstance) {
  // 🔐 Requiere JWT en todas las rutas
  app.addHook("preHandler", (app as any).authenticate);

  // 🔒 Solo oftalmólogos y admin pueden acceder
  app.addHook("preHandler", (app as any).authorize(["admin", "oftalmologo"]));

  // POST /recetas - Crear receta
  app.post("/", async (req, reply) => {
    const body = req.body as {
      idFicha: number;
      odEsfera?: number;
      odCilindro?: number;
      odEje?: number;
      oiEsfera?: number;
      oiCilindro?: number;
      oiEje?: number;
      adicion?: number;
      pd?: number;
      vigenciaDias?: number;
    };

    if (!body?.idFicha) {
      return reply.code(400).send({ error: "idFicha es requerido" });
    }

    try {
      // Verificar que la ficha existe
      const ficha = await prisma.fichaClinica.findUnique({
        where: { idFicha: body.idFicha },
        include: {
          cita: {
            include: {
              cliente: true
            }
          }
        }
      });

      if (!ficha) {
        return reply.code(404).send({ error: "Ficha clínica no encontrada" });
      }

      // Crear receta (vigencia por defecto: 365 días si no se especifica)
      const receta = await prisma.receta.create({
        data: {
          idFicha: body.idFicha,
          odEsfera: body.odEsfera || null,
          odCilindro: body.odCilindro || null,
          odEje: body.odEje || null,
          oiEsfera: body.oiEsfera || null,
          oiCilindro: body.oiCilindro || null,
          oiEje: body.oiEje || null,
          adicion: body.adicion || null,
          pd: body.pd || null,
          vigenciaDias: body.vigenciaDias ?? 365, // Usar 365 días por defecto si no se especifica
        },
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
      });

      return reply.code(201).send(receta);
    } catch (error: any) {
      console.error("Error creando receta:", error);
      return reply.code(500).send({ error: "Error interno del servidor" });
    }
  });

  // GET /recetas/:id - Obtener receta por ID
  app.get("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const idReceta = Number(id);

    if (isNaN(idReceta)) {
      return reply.code(400).send({ error: "ID inválido" });
    }

    try {
      const receta = await prisma.receta.findUnique({
        where: { idReceta },
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
      });

      if (!receta) {
        return reply.code(404).send({ error: "Receta no encontrada" });
      }

      return receta;
    } catch (error: any) {
      console.error("Error obteniendo receta:", error);
      return reply.code(500).send({ error: "Error interno del servidor" });
    }
  });

  // PUT /recetas/:id - Actualizar receta
  app.put("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const idReceta = Number(id);
    const body = req.body as {
      odEsfera?: number;
      odCilindro?: number;
      odEje?: number;
      oiEsfera?: number;
      oiCilindro?: number;
      oiEje?: number;
      adicion?: number;
      pd?: number;
      vigenciaDias?: number;
    };

    if (isNaN(idReceta)) {
      return reply.code(400).send({ error: "ID inválido" });
    }

    try {
      const receta = await prisma.receta.update({
        where: { idReceta },
        data: {
          odEsfera: body.odEsfera,
          odCilindro: body.odCilindro,
          odEje: body.odEje,
          oiEsfera: body.oiEsfera,
          oiCilindro: body.oiCilindro,
          oiEje: body.oiEje,
          adicion: body.adicion,
          pd: body.pd,
          vigenciaDias: body.vigenciaDias,
        },
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
      });

      return receta;
    } catch (error: any) {
      console.error("Error actualizando receta:", error);
      return reply.code(500).send({ error: "Error interno del servidor" });
    }
  });

  // GET /recetas - Listar recetas
  app.get("/", async (req) => {
    const { clienteId, fechaDesde, fechaHasta } = (req.query || {}) as {
      clienteId?: string;
      fechaDesde?: string;
      fechaHasta?: string;
    };

    const where: any = {};

    if (clienteId) {
      where.ficha = {
        cita: {
          idCliente: Number(clienteId)
        }
      };
    }

    if (fechaDesde || fechaHasta) {
      where.fechaEmision = {};
      if (fechaDesde) where.fechaEmision.gte = new Date(fechaDesde);
      if (fechaHasta) where.fechaEmision.lte = new Date(fechaHasta);
    }

    return prisma.receta.findMany({
      where,
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
      },
      orderBy: { fechaEmision: "desc" },
      take: 100
    });
  });

  // DELETE /recetas/:id - Eliminar receta
  app.delete("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const idReceta = Number(id);

    if (isNaN(idReceta)) {
      return reply.code(400).send({ error: "ID inválido" });
    }

    try {
      await prisma.receta.delete({
        where: { idReceta }
      });

      return reply.code(204).send();
    } catch (error: any) {
      console.error("Error eliminando receta:", error);
      return reply.code(500).send({ error: "Error interno del servidor" });
    }
  });
}
