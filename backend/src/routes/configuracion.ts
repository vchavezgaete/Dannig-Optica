import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db";

/**
 * Configuration routes - System parameters management
 * Allows admins to configure system settings like alert frequency, message templates, etc.
 */
export async function configuracionRoutes(app: FastifyInstance) {
  // Requires JWT authentication on all routes
  app.addHook("preHandler", (app as any).authenticate);
  
  // Only admin can access configuration
  app.addHook("preHandler", (app as any).authorize(["admin"]));

  // Schema for creating/updating configuration
  const configSchema = z.object({
    clave: z.string().min(1).max(100),
    valor: z.string(),
    descripcion: z.string().max(255).optional().nullable(),
    tipo: z.enum(["string", "number", "boolean", "json"]).optional().default("string"),
  });

  // GET /configuracion - List all configurations
  app.get("/", async (req) => {
    const configuraciones = await prisma.configuracion.findMany({
      orderBy: { clave: "asc" },
    });
    return configuraciones;
  });

  // GET /configuracion/:clave - Get configuration by key
  app.get<{ Params: { clave: string } }>("/:clave", async (req, reply) => {
    const { clave } = req.params;

    const config = await prisma.configuracion.findUnique({
      where: { clave },
    });

    if (!config) {
      return reply.code(404).send({ error: "Configuración no encontrada" });
    }

    // Parse value according to type
    let valorParsed: any = config.valor;
    try {
      switch (config.tipo) {
        case "number":
          valorParsed = Number(config.valor);
          break;
        case "boolean":
          valorParsed = config.valor === "true" || config.valor === "1";
          break;
        case "json":
          valorParsed = JSON.parse(config.valor);
          break;
      }
    } catch {
      // If parsing fails, return raw string value
    }

    return {
      ...config,
      valorParsed,
    };
  });

  // POST /configuracion - Create or update configuration (upsert)
  app.post("/", async (req, reply) => {
    const parsed = configSchema.safeParse(req.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Error de validación",
        details: parsed.error.errors,
      });
    }

    // Convert value to string if needed
    let valorString = parsed.data.valor;
    if (parsed.data.tipo === "json" && typeof parsed.data.valor !== "string") {
      valorString = JSON.stringify(parsed.data.valor);
    } else if (parsed.data.tipo === "boolean") {
      valorString = String(parsed.data.valor);
    } else if (parsed.data.tipo === "number") {
      valorString = String(parsed.data.valor);
    }

    try {
      const config = await prisma.configuracion.upsert({
        where: { clave: parsed.data.clave },
        update: {
          valor: valorString,
          descripcion: parsed.data.descripcion || null,
          tipo: parsed.data.tipo,
        },
        create: {
          clave: parsed.data.clave,
          valor: valorString,
          descripcion: parsed.data.descripcion || null,
          tipo: parsed.data.tipo,
        },
      });

      return reply.code(201).send(config);
    } catch (error: any) {
      req.log.error({ error }, "Error saving configuration");
      return reply.code(500).send({ error: "Error al guardar configuración" });
    }
  });

  // DELETE /configuracion/:clave - Delete configuration
  app.delete<{ Params: { clave: string } }>("/:clave", async (req, reply) => {
    const { clave } = req.params;

    try {
      await prisma.configuracion.delete({
        where: { clave },
      });

      return reply.code(204).send();
    } catch (error: any) {
      if (error?.code === "P2025") {
        return reply.code(404).send({ error: "Configuración no encontrada" });
      }
      req.log.error({ error }, "Error deleting configuration");
      return reply.code(500).send({ error: "Error al eliminar configuración" });
    }
  });
}









