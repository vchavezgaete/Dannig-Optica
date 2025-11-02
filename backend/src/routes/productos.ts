import { FastifyInstance } from "fastify";
import { prisma } from "../db";

export async function productoRoutes(app: FastifyInstance) {
  // 🔐 Requiere JWT en todas las rutas
  app.addHook("preHandler", (app as any).authenticate);
  
  // 🔒 Solo admin puede acceder a productos
  app.addHook("preHandler", (app as any).authorize(["admin"]));
  
  // GET /productos
  app.get("/", async () => {
    const productos = await prisma.producto.findMany({
      orderBy: { idProducto: "asc" },
    });
    return productos;
  });

  // (Opcional) GET /productos/:id
  app.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const id = Number(request.params.id);
    const prod = await prisma.producto.findUnique({ where: { idProducto: id } });
    if (!prod) return reply.code(404).send({ error: "Producto no encontrado" });
    return prod;
  });
}
