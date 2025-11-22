import { FastifyInstance } from "fastify";
import { prisma } from "../db";

export async function productoRoutes(app: FastifyInstance) {
  // Requires JWT authentication on all routes
  app.addHook("preHandler", (app as any).authenticate);
  
  // Only admin can access products
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
