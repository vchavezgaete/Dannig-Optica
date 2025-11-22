// src/routes/clientes.ts
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db";
import { sanitizeObject } from "../utils/sanitize";
import { validateRUT } from "../utils/rut";

// Schema de validación para crear cliente
const createClienteSchema = z.object({
  rut: z.string()
    .min(8, "RUT debe tener al menos 8 caracteres")
    .max(12, "RUT no puede exceder 12 caracteres")
    .refine(
      (rut) => validateRUT(rut),
      { message: "RUT inválido: el dígito verificador es incorrecto" }
    ),
  nombre: z.string()
    .min(2, "Nombre debe tener al menos 2 caracteres")
    .max(100, "Nombre no puede exceder 100 caracteres"),
  telefono: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Teléfono debe tener formato válido")
    .optional()
    .nullable(),
  correo: z.string()
    .email("Correo debe tener formato válido")
    .max(120, "Correo no puede exceder 120 caracteres")
    .optional()
    .nullable(),
  direccion: z.string()
    .max(150, "Dirección no puede exceder 150 caracteres")
    .optional()
    .nullable(),
  sector: z.string()
    .max(80, "Sector no puede exceder 80 caracteres")
    .optional()
    .nullable()
}).refine(
  (data) => data.telefono || data.correo,
  {
    message: "Al menos uno de los campos (telefono o correo) es requerido",
    path: ["telefono"]
  }
);

// Schema de validación para actualizar cliente
const updateClienteSchema = z.object({
  rut: z.string()
    .min(8, "RUT debe tener al menos 8 caracteres")
    .max(12, "RUT no puede exceder 12 caracteres")
    .refine(
      (rut) => validateRUT(rut),
      { message: "RUT inválido: el dígito verificador es incorrecto" }
    )
    .optional(),
  nombre: z.string()
    .min(2, "Nombre debe tener al menos 2 caracteres")
    .max(100, "Nombre no puede exceder 100 caracteres")
    .optional(),
  telefono: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Teléfono debe tener formato válido")
    .optional()
    .nullable(),
  correo: z.string()
    .email("Correo debe tener formato válido")
    .max(120, "Correo no puede exceder 120 caracteres")
    .optional()
    .nullable(),
  direccion: z.string()
    .max(150, "Dirección no puede exceder 150 caracteres")
    .optional()
    .nullable(),
  sector: z.string()
    .max(80, "Sector no puede exceder 80 caracteres")
    .optional()
    .nullable()
});

export async function clienteRoutes(app: FastifyInstance) {
  // Requires JWT authentication on all routes
  app.addHook("preHandler", (app as any).authenticate);

  app.get("/", 
    { preHandler: (app as any).authorize(["admin", "captador", "oftalmologo"]) },
    async (req) => {
      const { rut, q } = (req.query ?? {}) as { rut?: string; q?: string };
      const user = (req as any).user;
      
      const where: any = {};
      
      // Si es captador, solo ver sus propios clientes
      if (user.roles.includes("captador") && !user.roles.includes("admin")) {
        where.idVendedor = user.sub;
      }
      // Si es oftalmólogo, puede ver todos los clientes (acceso clínico completo)
      
      // Búsqueda por RUT o parámetro q (para compatibilidad)
      const searchTerm = (rut || q || "").trim();
      if (searchTerm) {
        // Buscar por RUT exacto o parcial, o por nombre
        const rutLimpio = searchTerm.replace(/[.-]/g, "");
        where.OR = [
          { rut: searchTerm },
          { rut: { contains: rutLimpio } },
          { nombre: { contains: searchTerm } }
        ];
      }
      
      // Si hay búsqueda y se quiere un resultado único, retornar el primero
      if (searchTerm) {
        const cliente = await prisma.cliente.findFirst({
          where,
          orderBy: { fechaCreacion: "desc" }
        });
        return cliente ? [cliente] : [];
      }
      
      // Si no hay búsqueda, listar clientes según permisos
      return prisma.cliente.findMany({
        where,
        take: 200,
        orderBy: { fechaCreacion: "desc" },
      });
    }
  );

  app.post("/", 
    { preHandler: (app as any).authorize(["admin", "captador"]) },
    async (req, reply) => {
      // Validar input con Zod
      const parsed = createClienteSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return reply.status(400).send({ 
          error: "Datos inválidos", 
          issues: parsed.error.flatten() 
        });
      }

      try {
        // Capture the authenticated user as the salesperson
        const user = (req as any).user;
        
        // Sanitize input data to prevent XSS
        const sanitizedData = sanitizeObject(parsed.data);
        
        const nuevo = await prisma.cliente.create({ 
          data: { 
            ...sanitizedData, 
            idVendedor: user?.sub || null 
          } 
        });
        return nuevo;
      } catch (e: any) {
        // Manejar error de RUT duplicado
        if (e?.code === "P2002" && e?.meta?.target?.includes("rut")) {
          return reply.status(409).send({ error: "RUT ya existe" });
        }
        req.log.error({ error: e }, 'Error creating cliente');
        return reply.status(500).send({ error: "Error interno del servidor" });
      }
    }
  );

  // PUT /clientes/:id - Actualizar cliente (solo admin)
  app.put("/:id", 
    { preHandler: (app as any).authorize(["admin"]) },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      
      // Validar ID
      const idCliente = Number(id);
      if (isNaN(idCliente) || idCliente <= 0) {
        return reply.status(400).send({ error: "ID inválido" });
      }

      // Validar input con Zod
      const parsed = updateClienteSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return reply.status(400).send({ 
          error: "Datos inválidos", 
          issues: parsed.error.flatten() 
        });
      }

      try {
        // Verificar que el cliente existe
        const existe = await prisma.cliente.findUnique({ where: { idCliente } });
        if (!existe) {
          return reply.status(404).send({ error: "Cliente no encontrado" });
        }

        // Actualizar solo los campos proporcionados (excluir undefined)
        const updateData = Object.fromEntries(
          Object.entries(parsed.data).filter(([_, v]) => v !== undefined)
        );

        // Sanitize input data to prevent XSS
        const sanitizedData = sanitizeObject(updateData);

        const actualizado = await prisma.cliente.update({
          where: { idCliente },
          data: sanitizedData
        });
        
        return actualizado;
      } catch (e: any) {
        // Manejar error de RUT duplicado
        if (e?.code === "P2002" && e?.meta?.target?.includes("rut")) {
          return reply.status(409).send({ error: "RUT ya existe" });
        }
        req.log.error({ error: e }, 'Error updating cliente');
        return reply.status(500).send({ error: "Error interno del servidor" });
      }
    }
  );

  // GET /clientes/:id/historial - Obtener historial del cliente
  app.get("/:id/historial", 
    { preHandler: (app as any).authorize(["admin", "captador", "oftalmologo"]) },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const idCliente = Number(id);
      const user = (req as any).user;
      
      if (isNaN(idCliente)) {
        return reply.status(400).send({ error: "ID inválido" });
      }

      try {
        // Obtener información del cliente
        const cliente = await prisma.cliente.findUnique({ 
          where: { idCliente } 
        });
        
        if (!cliente) {
          return reply.status(404).send({ error: "Cliente no encontrado" });
        }

        // Si es captador, verificar que el cliente le pertenece
        if (user.roles.includes("captador") && !user.roles.includes("admin") && !user.roles.includes("oftalmologo")) {
          if (cliente.idVendedor !== user.sub) {
            return reply.status(403).send({ error: "No tienes acceso a este cliente" });
          }
        }
        // Si es oftalmólogo, puede ver historial de todos los clientes (acceso clínico completo)

        // Obtener citas del cliente
        const citas = await prisma.cita.findMany({
          where: { idCliente },
          orderBy: { fechaHora: "desc" },
          include: {
            operativo: {
              select: {
                idOperativo: true,
                nombre: true
              }
            }
          }
        });

        return {
          cliente,
          citas,
          estadisticas: {
            totalCitas: citas.length,
            citasConfirmadas: citas.filter((c: any) => c.estado === 'Confirmada').length,
            citasCanceladas: citas.filter((c: any) => c.estado === 'Cancelada').length,
            citasNoShow: citas.filter((c: any) => c.estado === 'NoShow').length,
            ultimaCita: citas[0] || null
          }
        };
      } catch (e: any) {
        return reply.status(500).send({ error: e.message });
      }
    }
  );
}
