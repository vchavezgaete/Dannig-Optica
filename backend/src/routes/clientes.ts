// src/routes/clientes.ts
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db";
import { registrarAuditoriaDesdeRequest } from "../utils/auditoria";
import { sanitizeObject } from "../utils/sanitize";
import { validateRUT } from "../utils/rut";

// Función auxiliar para convertir string vacío a null/undefined
const emptyToNull = (val: unknown) => {
  if (typeof val === "string" && val.trim() === "") return null;
  return val;
};

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
  telefono: z.preprocess(emptyToNull, z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Teléfono debe tener formato válido")
    .nullable()
    .optional()),
  correo: z.preprocess(emptyToNull, z.string()
    .email("Correo debe tener formato válido")
    .max(120, "Correo no puede exceder 120 caracteres")
    .nullable()
    .optional()),
  direccion: z.preprocess(emptyToNull, z.string()
    .max(150, "Dirección no puede exceder 150 caracteres")
    .nullable()
    .optional()),
  sector: z.preprocess(emptyToNull, z.string()
    .max(80, "Sector no puede exceder 80 caracteres")
    .nullable()
    .optional())
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
  telefono: z.preprocess(emptyToNull, z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Teléfono debe tener formato válido")
    .nullable()
    .optional()),
  correo: z.preprocess(emptyToNull, z.string()
    .email("Correo debe tener formato válido")
    .max(120, "Correo no puede exceder 120 caracteres")
    .nullable()
    .optional()),
  direccion: z.preprocess(emptyToNull, z.string()
    .max(150, "Dirección no puede exceder 150 caracteres")
    .nullable()
    .optional()),
  sector: z.preprocess(emptyToNull, z.string()
    .max(80, "Sector no puede exceder 80 caracteres")
    .nullable()
    .optional())
});

export async function clienteRoutes(app: FastifyInstance) {
  // Autenticación requerida para todas las rutas
  app.addHook("preHandler", (app as any).authenticate);

  app.get("/", 
    { preHandler: (app as any).authorize(["admin", "captador", "oftalmologo"]) },
    async (req) => {
      const { rut, q } = (req.query ?? {}) as { rut?: string; q?: string };
      const user = (req as any).user;
      
      const where: any = {};
      
      // Captadores solo ven sus clientes, excepto si tienen rol admin
      if (user.roles.includes("captador") && !user.roles.includes("admin")) {
        where.idVendedor = user.sub;
      }
      
      // Búsqueda por RUT o texto general
      const searchTerm = (rut || q || "").trim();
      if (searchTerm) {
        // Normalizar RUT eliminando puntos y guión
        const rutLimpio = searchTerm.replace(/[.-]/g, "");
        where.OR = [
          { rut: searchTerm },
          { rut: { contains: rutLimpio } },
          { nombre: { contains: searchTerm } }
        ];
      }
      
      // Retornar resultado único si hay búsqueda específica
      if (searchTerm) {
        const cliente = await prisma.cliente.findFirst({
          where,
          orderBy: { fechaCreacion: "desc" }
        });
        return cliente ? [cliente] : [];
      }
      
      // Listado general paginado
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
      // Validar datos de entrada
      const parsed = createClienteSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return reply.status(400).send({ 
          error: "Datos inválidos", 
          issues: parsed.error.flatten() 
        });
      }

      try {
        const user = (req as any).user;
        
        // Sanitizar datos para prevenir XSS
        const sanitizedData = sanitizeObject(parsed.data);
        
        const nuevo = await prisma.cliente.create({ 
          data: { 
            ...sanitizedData, 
            idVendedor: user?.sub || null 
          } 
        });

        // Registrar auditoría
        registrarAuditoriaDesdeRequest(req, {
          tabla: "cliente",
          operacion: "CREATE",
          registroId: nuevo.idCliente,
          datosNuevos: nuevo,
        }).catch((err) => {
          req.log.warn({ error: err }, "Error registrando auditoría de creación");
        });

        return nuevo;
      } catch (e: any) {
        // Error de duplicidad (RUT único)
        if (e?.code === "P2002" && e?.meta?.target?.includes("rut")) {
          return reply.status(409).send({ error: "RUT ya existe" });
        }
        req.log.error({ error: e }, 'Error creando cliente');
        return reply.status(500).send({ error: "Error interno del servidor" });
      }
    }
  );

  // PUT /clientes/:id - Actualizar cliente
  app.put("/:id", 
    { preHandler: (app as any).authorize(["admin", "captador"]) },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const user = (req as any).user;
      
      // Validar ID numérico
      const idCliente = Number(id);
      if (isNaN(idCliente) || idCliente <= 0) {
        return reply.status(400).send({ error: "ID inválido" });
      }

      // Validar esquema de datos
      const parsed = updateClienteSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return reply.status(400).send({ 
          error: "Datos inválidos", 
          issues: parsed.error.flatten() 
        });
      }

      try {
        // Verificar existencia del cliente
        const existe = await prisma.cliente.findUnique({ where: { idCliente } });
        if (!existe) {
          return reply.status(404).send({ error: "Cliente no encontrado" });
        }

        // Verificar permisos de edición para captadores
        if (user.roles.includes("captador") && !user.roles.includes("admin")) {
          // Asegurar comparación numérica
          if (Number(existe.idVendedor) !== Number(user.sub)) {
            return reply.status(403).send({ error: "No tienes permiso para editar este cliente" });
          }
        }

        // Filtrar campos undefined y sanitizar
        const updateData = Object.fromEntries(
          Object.entries(parsed.data).filter(([_, v]) => v !== undefined)
        );

        // Si el RUT es igual al actual, no lo actualizamos para evitar problemas de unicidad
        if (updateData.rut === existe.rut) {
          delete updateData.rut;
        }

        const sanitizedData = sanitizeObject(updateData);

        const actualizado = await prisma.cliente.update({
          where: { idCliente },
          data: sanitizedData
        });

        // Registrar auditoría
        registrarAuditoriaDesdeRequest(req, {
          tabla: "cliente",
          operacion: "UPDATE",
          registroId: actualizado.idCliente,
          datosAnteriores: existe,
          datosNuevos: actualizado,
        }).catch((err) => {
          req.log.warn({ error: err }, "Error registrando auditoría de actualización");
        });
        
        return actualizado;
      } catch (e: any) {
        if (e?.code === "P2002" && e?.meta?.target?.includes("rut")) {
          return reply.status(409).send({ error: "RUT ya existe" });
        }
        req.log.error({ error: e }, 'Error actualizando cliente');
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

  // DELETE /clientes/:id - Eliminar cliente (Solo admin)
  app.delete("/:id", 
    { preHandler: (app as any).authorize(["admin"]) },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const idCliente = Number(id);

      if (isNaN(idCliente)) {
        return reply.status(400).send({ error: "ID inválido" });
      }

      try {
        // Verificar dependencias antes de eliminar
        const cliente = await prisma.cliente.findUnique({
          where: { idCliente },
          include: {
            _count: {
              select: {
                citas: true,
                ventas: true
              }
            }
          }
        });

        if (!cliente) {
          return reply.status(404).send({ error: "Cliente no encontrado" });
        }

        // Si tiene citas o ventas, no permitir eliminar
        if (cliente._count.citas > 0 || cliente._count.ventas > 0) {
          return reply.status(409).send({ 
            error: "No se puede eliminar el cliente porque tiene registros asociados (citas o ventas).",
            detalles: {
              citas: cliente._count.citas,
              ventas: cliente._count.ventas
            }
          });
        }

        const eliminado = await prisma.cliente.delete({
          where: { idCliente }
        });

        // Registrar auditoría
        registrarAuditoriaDesdeRequest(req, {
          tabla: "cliente",
          operacion: "DELETE",
          registroId: idCliente,
          datosAnteriores: cliente,
        }).catch((err) => {
          req.log.warn({ error: err }, "Error registrando auditoría de eliminación");
        });

        return reply.code(204).send();

      } catch (e: any) {
        req.log.error({ error: e }, 'Error eliminando cliente');
        return reply.status(500).send({ error: "Error interno del servidor" });
      }
    }
  );
}
