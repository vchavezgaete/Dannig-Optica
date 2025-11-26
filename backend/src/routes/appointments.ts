import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db";
import { enviarNotificacion, plantillas } from "../services/notificaciones";

// Aceptamos los "nombres viejos" y los mapeamos a los de la BD
const estadoInputEnum = z.enum([
  "pendiente",
  "confirmada",
  "cancelada",
  "no-show",
  "atendida",
]);

function mapEstado(input?: z.infer<typeof estadoInputEnum>) {
  switch (input) {
    case "pendiente":  return "Programada";
    case "confirmada": return "Confirmada";
    case "cancelada":  return "Cancelada";
    case "no-show":    return "NoShow";  
    case "atendida":   return "Atendida";
    default:           return "Programada";
  }
}

export async function appointmentRoutes(app: FastifyInstance) {
  // Requires JWT authentication on all routes of this module
  app.addHook("preHandler", (app as any).authenticate);
  
  // Admin and ophthalmologist can access appointments
  app.addHook("preHandler", (app as any).authorize(["admin", "oftalmologo"]));

  // ── Schemas (compat: aceptamos leadId o clienteId)
  const createSchema = z.object({
    // compat viejo:
    leadId: z.number().int().optional(),
    // nuevo recomendado:
    clienteId: z.number().int().optional(),
    idOperativo: z.number().int().optional().nullable(),
    idMedico: z.number().int().optional().nullable(), // Campo para asignar oftalmólogo
    // string ISO -> Date
    fechaHora: z.string().transform((v) => new Date(v)),
    estado: estadoInputEnum.optional(),
  });

  const estadoSchema = z.object({
    estado: estadoInputEnum,
  });

  // ── Crear cita
  app.post("/", async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Datos inválidos", issues: parsed.error.flatten() });
    }
    const { leadId, clienteId, idOperativo, idMedico, fechaHora, estado } = parsed.data;
    if (isNaN(+fechaHora)) return reply.code(400).send({ error: "fechaHora inválida" });

    // compat: si viene leadId, lo usamos como clienteId
    const idCliente =
      typeof clienteId === "number" ? clienteId :
      typeof leadId === "number" ? leadId : undefined;

    if (!idCliente) return reply.code(400).send({ error: "clienteId (o leadId) es requerido" });

    // Validar que el cliente exista
    const existe = await prisma.cliente.findUnique({ where: { idCliente } });
    if (!existe) return reply.code(404).send({ error: "Cliente no existe" });

    // Validar que idOperativo exista si se proporciona
    let idOperativoValidado: number | null = null;
    if (idOperativo !== null && idOperativo !== undefined) {
      const operativoExiste = await prisma.operativo.findUnique({ 
        where: { idOperativo } 
      });
      if (operativoExiste) {
        idOperativoValidado = idOperativo;
      } else {
        req.log.warn({ idOperativo }, 'idOperativo no encontrado en tabla Operativo');
      }
    }

    // Validar que idMedico exista si se proporciona
    let idMedicoValidado: number | null = null;
    if (idMedico !== null && idMedico !== undefined) {
      const medicoExiste = await prisma.usuario.findUnique({ 
        where: { idUsuario: idMedico } 
      });
      if (medicoExiste) {
        idMedicoValidado = idMedico;
      } else {
        req.log.warn({ idMedico }, 'idMedico no encontrado en tabla Usuario');
      }
    }

    const cita = await prisma.cita.create({
      data: {
        idCliente,
        idOperativo: idOperativoValidado,
        idMedico: idMedicoValidado,
        fechaHora,
        estado: mapEstado(estado) as any,
      },
      include: { 
        cliente: true,
        operativo: true,
        medico: { // Incluir datos del médico en la respuesta
          select: {
            idUsuario: true,
            nombre: true,
            correo: true
          }
        },
        ficha: {
          select: {
            idFicha: true,
            fechaRegistro: true
          }
        }
      },
    });

    // Send immediate confirmation notification if client has contact info
    try {
      if (cita.cliente && (cita.cliente.correo || cita.cliente.telefono)) {
        const fechaHoraFormateada = new Date(cita.fechaHora).toLocaleString("es-CL", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        const lugar = cita.operativo?.lugar || "Sede Dannig Óptica";

        // Get appropriate template based on appointment state
        let asunto = "Confirmación de Cita - Dannig Óptica";
        let mensaje = "";

        if (cita.estado === "Confirmada") {
          const template = plantillas.confirmacionCita(
            cita.cliente.nombre,
            fechaHoraFormateada,
            lugar
          );
          asunto = template.asunto;
          mensaje = template.mensaje;
        } else {
          // For Programada state, send scheduling confirmation
          const template = plantillas.recordatorioCita(
            cita.cliente.nombre,
            fechaHoraFormateada,
            lugar
          );
          asunto = "Cita Agendada - Dannig Óptica";
          mensaje = `Hola ${cita.cliente.nombre},\n\nTu cita ha sido agendada para:\nFecha y Hora: ${fechaHoraFormateada}\nLugar: ${lugar}\n\nTe esperamos.\n\nSaludos,\nEquipo Dannig Óptica`;
        }

        // Determine notification channels
        const canales: Array<"Correo" | "SMS"> = [];
        if (cita.cliente.correo) canales.push("Correo");
        if (cita.cliente.telefono) canales.push("SMS");

        if (canales.length > 0) {
          // Send notification asynchronously to avoid blocking the response
          enviarNotificacion(
            cita.cliente.correo || null,
            cita.cliente.telefono || null,
            asunto,
            mensaje,
            canales
          ).catch((error) => {
            req.log.error({ error, citaId: cita.idCita }, 'Error sending appointment confirmation');
          });
        }
      }
    } catch (error) {
      // Log error but don't fail the appointment creation
      req.log.error({ error, citaId: cita.idCita }, 'Error preparing appointment confirmation');
    }

    return reply.code(201).send(cita);
  });

  // ── Cambiar estado
  app.patch("/:id/estado", async (req, reply) => {
    const id = Number((req.params as any).id);
    
    if (!Number.isInteger(id)) {
      return reply.code(400).send({ error: "ID inválido" });
    }

    const parsed = estadoSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Estado inválido", issues: parsed.error.flatten() });
    }

    const nuevoEstado = mapEstado(parsed.data.estado);
    
    try {
      const updated = await prisma.cita.update({
        where: { idCita: id },
        data: { estado: nuevoEstado as any },
        include: { 
          cliente: true,
          operativo: true,
          ficha: {
            select: {
              idFicha: true,
              fechaRegistro: true
            }
          }
        },
      });
      return reply.code(200).send(updated);
    } catch (error: any) {
      if (error?.code === 'P2025') {
        return reply.code(404).send({ error: "Cita no encontrada" });
      }
      req.log.error({ error, idCita: id }, 'Error al actualizar estado de cita');
      return reply.code(500).send({ error: "Error interno del servidor" });
    }
  });

  // ── Reprogramar (cambiar fecha/hora)
  app.patch("/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    if (!Number.isInteger(id)) {
      return reply.code(400).send({ error: "ID inválido" });
    }

    const schema = z.object({ fechaHora: z.string() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Datos inválidos", issues: parsed.error.flatten() });
    }

    const fechaHora = new Date(parsed.data.fechaHora);
    if (isNaN(+fechaHora)) {
      return reply.code(400).send({ error: "fechaHora inválida" });
    }

    const updated = await prisma.cita
      .update({
        where: { idCita: id },
        data: { fechaHora },
        include: { 
          cliente: true,
          operativo: true,
          ficha: {
            select: {
              idFicha: true,
              fechaRegistro: true
            }
          }
        },
      })
      .catch(() => null);

    if (!updated) return reply.code(404).send({ error: "Cita no encontrada" });
    return updated;
  });

  // ── Listar (?from=ISO&to=ISO&clienteId=1&estado=confirmada)
  app.get("/", async (req) => {
    const { from, to, leadId, clienteId, estado } = (req.query || {}) as {
      from?: string;
      to?: string;
      leadId?: string;     // compat
      clienteId?: string;  // preferido
      estado?: "pendiente" | "confirmada" | "cancelada" | "no-show" | "atendida";
    };

    const where: any = {};
    if (from || to) {
      where.fechaHora = {};
      if (from) where.fechaHora.gte = new Date(from);
      if (to) where.fechaHora.lte = new Date(to);
    }

    const idCliente = clienteId ? Number(clienteId) : leadId ? Number(leadId) : undefined;
    if (idCliente) where.idCliente = idCliente;

    if (estado) where.estado = mapEstado(estado);

    return prisma.cita.findMany({
      where,
      include: { 
        cliente: true,
        operativo: true,
        ficha: {
          select: {
            idFicha: true,
            fechaRegistro: true
          }
        }
      },
      orderBy: { fechaHora: "desc" },
      take: 200,
    });
  });
}
