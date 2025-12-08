/**
 * Módulo de rutas para gestión de alertas automatizadas
 * 
 * Este módulo maneja todas las operaciones relacionadas con el sistema de alertas:
 * - Creación manual de alertas
 * - Generación automática de alertas para citas, garantías y operativos
 * - Procesamiento y envío de alertas pendientes
 * - Consulta y filtrado de alertas
 * 
 * El sistema de alertas permite notificar automáticamente a los clientes sobre:
 * - Recordatorios de citas próximas
 * - Vencimiento de garantías
 * - Nuevos operativos oftalmológicos disponibles
 */

import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db";
import {
  generarAlertasCitas,
  generarAlertasGarantias,
  generarAlertasOperativos,
  procesarAlertasPendientes,
} from "../services/alertas";

// Esquema de validación para crear una alerta manualmente
const createAlertaSchema = z.object({
  idCliente: z.number().int().positive(),
  tipo: z.enum(["Control", "Garantia", "Operativo"]),
  canal: z.enum(["SMS", "Correo"]),
  mensaje: z.string().max(240),
  fechaProgramada: z.string().transform((v) => new Date(v)),
});

export async function alertaRoutes(app: FastifyInstance) {
  // Middleware de autenticación: todas las rutas requieren JWT válido
  app.addHook("preHandler", (app as any).authenticate);
  
  // Middleware de autorización: solo usuarios con rol admin pueden acceder
  app.addHook("preHandler", (app as any).authorize(["admin"]));

  /**
   * POST /alertas
   * Crea una alerta manualmente
   * Útil para casos especiales donde se requiere notificar a un cliente específico
   * 
   * Body:
   * - idCliente: ID del cliente (requerido)
   * - tipo: Tipo de alerta - "Control", "Garantia" o "Operativo" (requerido)
   * - canal: Canal de envío - "SMS" o "Correo" (requerido)
   * - mensaje: Contenido del mensaje, máximo 240 caracteres (requerido)
   * - fechaProgramada: Fecha y hora programada para el envío (requerido)
   * 
   * Validaciones:
   * - El cliente debe existir
   * - Si el canal es "Correo", el cliente debe tener correo registrado
   * - Si el canal es "SMS", el cliente debe tener teléfono registrado
   * 
   * Retorna: La alerta creada con información del cliente
   */
  app.post("/", async (req, reply) => {
    const parsed = createAlertaSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return reply.code(400).send({ 
        error: "Datos inválidos", 
        issues: parsed.error.flatten() 
      });
    }

    const { idCliente, tipo, canal, mensaje, fechaProgramada } = parsed.data;

    try {
      // Validar que el cliente existe
      const cliente = await prisma.cliente.findUnique({
        where: { idCliente }
      });

      if (!cliente) {
        return reply.code(404).send({ error: "Cliente no encontrado" });
      }

      // Validar que el cliente tiene el canal de contacto necesario
      if (canal === "Correo" && !cliente.correo) {
        return reply.code(400).send({ error: "El cliente no tiene correo electrónico registrado" });
      }

      if (canal === "SMS" && !cliente.telefono) {
        return reply.code(400).send({ error: "El cliente no tiene teléfono registrado" });
      }

      const alerta = await prisma.alerta.create({
        data: {
          idCliente,
          tipo: tipo as any,
          canal: canal as any,
          mensaje,
          fechaProgramada,
          enviado: 0,
        },
        include: {
          cliente: {
            select: {
              idCliente: true,
              rut: true,
              nombres: true,
              apellidoPaterno: true,
              apellidoMaterno: true,
              telefono: true,
              correo: true
            }
          }
        }
      });

      return reply.code(201).send(alerta);
    } catch (error: any) {
      console.error("Error creando alerta:", error);
      return reply.code(500).send({ error: "Error interno del servidor" });
    }
  });

  /**
   * GET /alertas
   * Lista todas las alertas con filtros opcionales
   * Incluye estadísticas sobre el estado de las alertas
   * 
   * Query params opcionales:
   * - clienteId: Filtrar por cliente específico
   * - tipo: Filtrar por tipo - "Control", "Garantia" o "Operativo"
   * - canal: Filtrar por canal - "SMS" o "Correo"
   * - enviado: Filtrar por estado - "true" para enviadas, "false" para pendientes
   * - desde: Fecha de inicio para filtrar por rango de fechas programadas
   * - hasta: Fecha de fin para filtrar por rango de fechas programadas
   * 
   * Retorna: Objeto con array de alertas, total y estadísticas
   */
  app.get("/", async (req) => {
    const { 
      clienteId,
      tipo,
      canal,
      enviado,
      desde,
      hasta
    } = (req.query || {}) as {
      clienteId?: string;
      tipo?: "Control" | "Garantia" | "Operativo";
      canal?: "SMS" | "Correo";
      enviado?: string;
      desde?: string;
      hasta?: string;
    };

    const where: any = {};

    if (clienteId) {
      where.idCliente = Number(clienteId);
    }

    if (tipo) {
      where.tipo = tipo;
    }

    if (canal) {
      where.canal = canal;
    }

    if (enviado !== undefined) {
      where.enviado = enviado === "true" ? 1 : 0;
    }

    if (desde || hasta) {
      where.fechaProgramada = {};
      if (desde) where.fechaProgramada.gte = new Date(desde);
      if (hasta) where.fechaProgramada.lte = new Date(hasta);
    }

    const alertas = await prisma.alerta.findMany({
      where,
      include: {
        cliente: {
          select: {
            idCliente: true,
            rut: true,
            nombres: true,
            apellidoPaterno: true,
            apellidoMaterno: true,
            telefono: true,
            correo: true
          }
        }
      },
      orderBy: { fechaProgramada: "desc" },
      take: 200
    });

    return {
      alertas,
      total: alertas.length,
      estadisticas: {
        pendientes: alertas.filter(a => a.enviado === 0).length,
        enviadas: alertas.filter(a => a.enviado === 1).length,
        porTipo: {
          Control: alertas.filter(a => a.tipo === "Control").length,
          Garantia: alertas.filter(a => a.tipo === "Garantia").length,
          Operativo: alertas.filter(a => a.tipo === "Operativo").length,
        }
      }
    };
  });

  /**
   * GET /alertas/:id
   * Obtiene una alerta específica por su ID
   * 
   * Params:
   * - id: ID de la alerta
   * 
   * Retorna: Objeto de alerta completo con información del cliente o 404 si no existe
   */
  app.get<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return reply.code(400).send({ error: "ID inválido" });
    }

    const alerta = await prisma.alerta.findUnique({
      where: { idAlerta: id },
      include: {
        cliente: true
      }
    });

    if (!alerta) {
      return reply.code(404).send({ error: "Alerta no encontrada" });
    }

    return alerta;
  });

  /**
   * POST /alertas/generar-citas
   * Genera alertas de recordatorio de citas manualmente
   * Normalmente esta función se ejecuta automáticamente cada hora mediante cron job
   * Este endpoint permite ejecutarla manualmente si es necesario
   * 
   * Retorna: Objeto con el número de alertas creadas
   */
  app.post("/generar-citas", async (req, reply) => {
    try {
      const creadas = await generarAlertasCitas();
      return {
        ok: true,
        mensaje: `${creadas} alertas de citas generadas`,
        alertasCreadas: creadas
      };
    } catch (error: any) {
      console.error("Error generando alertas de citas:", error);
      return reply.code(500).send({ error: "Error interno del servidor" });
    }
  });

  /**
   * POST /alertas/generar-garantias
   * Genera alertas de vencimiento de garantías manualmente
   * Normalmente esta función se ejecuta automáticamente cada día a las 8 AM mediante cron job
   * Este endpoint permite ejecutarla manualmente si es necesario
   * 
   * Retorna: Objeto con el número de alertas creadas
   */
  app.post("/generar-garantias", async (req, reply) => {
    try {
      const creadas = await generarAlertasGarantias();
      return {
        ok: true,
        mensaje: `${creadas} alertas de garantías generadas`,
        alertasCreadas: creadas
      };
    } catch (error: any) {
      console.error("Error generando alertas de garantías:", error);
      return reply.code(500).send({ error: "Error interno del servidor" });
    }
  });

  /**
   * POST /alertas/generar-operativo/:operativoId
   * Genera alertas de nuevo operativo para todos los clientes
   * Se debe llamar después de crear un nuevo operativo para notificar a todos los clientes
   * 
   * Params:
   * - operativoId: ID del operativo para el cual generar alertas
   * 
   * Retorna: Objeto con el número de alertas creadas o error si el operativo no existe
   */
  app.post<{ Params: { operativoId: string } }>("/generar-operativo/:operativoId", async (req, reply) => {
    const operativoId = Number(req.params.operativoId);

    if (isNaN(operativoId)) {
      return reply.code(400).send({ error: "ID de operativo inválido" });
    }

    try {
      const creadas = await generarAlertasOperativos(operativoId);
      return {
        ok: true,
        mensaje: `${creadas} alertas de operativo generadas`,
        alertasCreadas: creadas
      };
    } catch (error: any) {
      console.error("Error generando alertas de operativo:", error);
      return reply.code(500).send({ error: error.message || "Error interno del servidor" });
    }
  });

  /**
   * POST /alertas/procesar
   * Procesa y envía alertas pendientes manualmente
   * Normalmente esta función se ejecuta automáticamente cada 15 minutos mediante cron job
   * Este endpoint permite ejecutarla manualmente si es necesario
   * 
   * Retorna: Objeto con el número de alertas procesadas y enviadas
   */
  app.post("/procesar", async (req, reply) => {
    try {
      const enviadas = await procesarAlertasPendientes();
      return {
        ok: true,
        mensaje: `${enviadas} alertas procesadas y enviadas`,
        alertasEnviadas: enviadas
      };
    } catch (error: any) {
      console.error("Error procesando alertas:", error);
      return reply.code(500).send({ error: "Error interno del servidor" });
    }
  });

  /**
   * DELETE /alertas/:id
   * Elimina una alerta específica
   * Útil para cancelar alertas que ya no son necesarias
   * 
   * Params:
   * - id: ID de la alerta a eliminar
   * 
   * Retorna: 204 No Content si se elimina correctamente o 404 si no existe
   */
  app.delete<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return reply.code(400).send({ error: "ID inválido" });
    }

    try {
      await prisma.alerta.delete({
        where: { idAlerta: id }
      });

      return reply.code(204).send();
    } catch (error: any) {
      console.error("Error eliminando alerta:", error);
      return reply.code(500).send({ error: "Error interno del servidor" });
    }
  });

  /**
   * GET /alertas/diagnostico
   * Diagnóstico del sistema de notificaciones
   * Verifica la configuración de SMTP y SMS
   * 
   * Retorna: Estado de configuración de canales de notificación
   */
  app.get("/diagnostico", async (req, reply) => {
    try {
      const diagnostico = {
        email: {
          configurado: false,
          detalles: "",
          recomendacion: ""
        },
        sms: {
          configurado: false,
          detalles: "",
          recomendacion: ""
        }
      };

      // Verificar configuración de Email/SMTP
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASSWORD;
      const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
      const smtpPort = process.env.SMTP_PORT || "587";

      if (smtpUser && smtpPass) {
        diagnostico.email.configurado = true;
        diagnostico.email.detalles = `SMTP configurado: ${smtpUser}@${smtpHost}:${smtpPort}`;
        diagnostico.email.recomendacion = "Email está listo para enviar notificaciones";
      } else {
        diagnostico.email.configurado = false;
        diagnostico.email.detalles = "SMTP no configurado";
        diagnostico.email.recomendacion = "Configura SMTP_USER y SMTP_PASSWORD en las variables de entorno";
      }

      // Verificar configuración de SMS
      const smsApiKey = process.env.SMS_API_KEY;
      const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

      if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
        diagnostico.sms.configurado = true;
        diagnostico.sms.detalles = `Twilio configurado: Account SID ${twilioAccountSid.substring(0, 10)}...`;
        diagnostico.sms.recomendacion = "SMS está listo (requiere implementación de código Twilio)";
      } else if (smsApiKey) {
        diagnostico.sms.configurado = false;
        diagnostico.sms.detalles = `SMS_API_KEY configurado pero no implementado`;
        diagnostico.sms.recomendacion = "Implementa el código de envío SMS en notificaciones.ts";
      } else {
        diagnostico.sms.configurado = false;
        diagnostico.sms.detalles = "SMS no configurado";
        diagnostico.sms.recomendacion = "En desarrollo: SMS se simula. Para producción, configura Twilio (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)";
      }

      // Estadísticas de alertas
      const totalAlertas = await prisma.alerta.count();
      const alertasPendientes = await prisma.alerta.count({
        where: { enviado: 0, fechaProgramada: { lte: new Date() } }
      });
      const alertasEnviadas = await prisma.alerta.count({
        where: { enviado: 1 }
      });

      return {
        diagnostico,
        estadisticas: {
          totalAlertas,
          alertasPendientes,
          alertasEnviadas,
          alertasPorProcesar: alertasPendientes
        },
        nota: "Usa POST /alertas/procesar para procesar alertas pendientes manualmente"
      };
    } catch (error: any) {
      req.log.error({ error }, 'Error en diagnóstico de alertas');
      return reply.code(500).send({ error: "Error interno del servidor" });
    }
  });
}

