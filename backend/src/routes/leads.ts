import { FastifyInstance } from "fastify";
import { prisma } from "../db";

export async function leadRoutes(app: FastifyInstance) {
  // 🔐 Todas las rutas requieren token
  app.addHook("preHandler", (app as any).authenticate);

  // GET /leads  → lista clientes (opcional: ?q=texto&limit=100)
  app.get(
    "/",
    { preHandler: (app as any).authorize(["admin", "captador"]) },
    async (req) => {
      const { q, limit } = (req.query ?? {}) as { q?: string; limit?: string };
      const user = (req as any).user;

      const take = Math.min(Math.max(Number(limit) || 100, 1), 500);

      const where: any = {};
      
      // Si es captador, solo ver sus propios leads captados
      if (user.roles.includes("captador") && !user.roles.includes("admin")) {
        where.idVendedor = user.sub;
      }

      if (q && q.trim()) {
        where.OR = [
          { nombre: { contains: q } },
          { rut: { contains: q } },
          { telefono: { contains: q } },
          { correo: { contains: q } },
          { sector: { contains: q } },
        ];
      }

      return prisma.cliente.findMany({
        where,
        orderBy: { fechaCreacion: "desc" },
        take,
      });
    }
  );

  // POST /leads  → crea cliente
  app.post(
    "/",
    { preHandler: (app as any).authorize(["admin", "captador"]) },
    async (req, reply) => {
      const {
        nombre,
        documento,
        contacto,
        direccion,
        sector,
        // observaciones se ignora porque no existe en la tabla 'cliente'
      } = (req.body ?? {}) as {
        nombre?: string;
        documento?: string; // RUT (UNIQUE, NOT NULL)
        contacto?: string;  // si trae '@' → correo; si no → telefono
        direccion?: string;
        sector?: string;
        observaciones?: string;
      };

      const user = (req as any).user;

      if (!nombre) {
        return reply.code(400).send({ error: "nombre es requerido" });
      }
      if (!documento) {
        return reply.code(400).send({ error: "documento (RUT) es requerido" });
      }

      let telefono: string | null = null;
      let correo: string | null = null;
      if (contacto) {
        const c = contacto.trim();
        if (c.includes("@")) correo = c;
        else telefono = c;
      }

      try {
        const nuevo = await prisma.cliente.create({
          data: {
            rut: documento,
            nombre,
            telefono,
            correo,
            direccion: direccion ?? null,
            sector: sector ?? null,
            idVendedor: user.sub, // Asignar automáticamente el usuario que crea el lead
          },
        });
        return reply.code(201).send(nuevo);
      } catch (e: any) {
        // Violación de UNIQUE (RUT duplicado)
        if (e?.code === "P2002") {
          return reply.code(409).send({ error: "RUT ya existe" });
        }
        return reply
          .code(500)
          .send({ error: e?.message || "Error al crear lead" });
      }
    }
  );
}
