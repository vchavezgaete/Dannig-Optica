/**
 * Servicio de gestión y generación de alertas automatizadas
 * 
 * Este módulo contiene la lógica de negocio para:
 * - Generar alertas automáticas de recordatorio de citas
 * - Generar alertas automáticas de vencimiento de garantías
 * - Generar alertas de nuevos operativos oftalmológicos
 * - Procesar y enviar alertas pendientes
 * 
 * Las alertas se generan automáticamente según reglas de negocio:
 * - Citas: 24 horas antes de la cita confirmada
 * - Garantías: 7 días antes del vencimiento
 * - Operativos: Inmediatamente al crear un nuevo operativo
 */

import { prisma } from "../db";
import { enviarNotificacion, plantillas } from "./notificaciones";

/**
 * Genera alertas de recordatorio de citas
 * Busca citas confirmadas que están programadas en las próximas 24 horas
 * y crea alertas para los clientes que tienen medios de contacto
 * 
 * Lógica:
 * - Solo genera alertas para citas con estado "Confirmada"
 * - Solo crea una alerta por cita (evita duplicados)
 * - Solo crea alertas si el cliente tiene correo o teléfono
 * 
 * @returns Número de alertas creadas
 */
export async function generarAlertasCitas(): Promise<number> {
  const ahora = new Date();
  const en24Horas = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);

  // Buscar citas confirmadas en las próximas 24 horas
  const citas = await prisma.cita.findMany({
    where: {
      estado: "Confirmada",
      fechaHora: {
        gte: ahora,
        lte: en24Horas,
      },
    },
    include: {
      cliente: true,
      operativo: true,
    },
  });

  let alertasCreadas = 0;

  for (const cita of citas) {
    // Verificar si ya existe una alerta para esta cita
    // Busca alertas creadas entre 23 y 25 horas antes de la cita
    const alertaExistente = await prisma.alerta.findFirst({
      where: {
        idCliente: cita.idCliente,
        tipo: "Control" as any,
        fechaProgramada: {
          gte: new Date(cita.fechaHora.getTime() - 25 * 60 * 60 * 1000),
          lte: new Date(cita.fechaHora.getTime() - 23 * 60 * 60 * 1000),
        },
      },
    });

    if (alertaExistente) continue; // Ya existe una alerta para esta cita

    // Crear alerta solo si el cliente tiene medio de contacto
    if (cita.cliente.correo || cita.cliente.telefono) {
      const fechaHora = new Date(cita.fechaHora).toLocaleString("es-CL", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const lugar = cita.operativo?.lugar || "";

      // Obtener mensaje desde plantilla
      const { asunto, mensaje } = plantillas.recordatorioCita(
        cita.cliente.nombre,
        fechaHora,
        lugar
      );

      // Crear alerta programada para 23 horas antes de la cita
      await prisma.alerta.create({
        data: {
          idCliente: cita.idCliente,
          tipo: "Control" as any,
          canal: (cita.cliente.correo ? "Correo" : "SMS") as any,
          mensaje: mensaje.substring(0, 240), // Limitar a 240 caracteres (tamaño del campo en BD)
          fechaProgramada: new Date(ahora.getTime() + 23 * 60 * 60 * 1000), // 23 horas antes
          enviado: 0,
        },
      });

      alertasCreadas++;
    }
  }

  return alertasCreadas;
}

/**
 * Genera alertas de vencimiento de garantías
 * Busca garantías que vencen en los próximos 7 días
 * y crea alertas para notificar a los clientes
 * 
 * Lógica:
 * - Solo genera alertas para garantías activas (no vencidas)
 * - Solo crea una alerta por garantía (evita duplicados)
 * - Solo crea alertas si el cliente tiene correo o teléfono
 * 
 * @returns Número de alertas creadas
 */
export async function generarAlertasGarantias(): Promise<number> {
  const ahora = new Date();
  const en7Dias = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Buscar garantías que vencen en los próximos 7 días
  const garantias = await prisma.garantia.findMany({
    where: {
      fechaFin: {
        gte: ahora,
        lte: en7Dias,
      },
    },
    include: {
      item: {
        include: {
          producto: true,
          venta: {
            include: {
              cliente: true,
            },
          },
        },
      },
    },
  });

  let alertasCreadas = 0;

  for (const garantia of garantias) {
    const cliente = garantia.item.venta.cliente;

    // Verificar si ya existe una alerta para esta garantía
    // Busca alertas creadas entre 6 y 8 días antes del vencimiento
    const alertaExistente = await prisma.alerta.findFirst({
      where: {
        idCliente: cliente.idCliente,
        tipo: "Garantia" as any,
        fechaProgramada: {
          gte: new Date(garantia.fechaFin.getTime() - 8 * 24 * 60 * 60 * 1000),
          lte: new Date(garantia.fechaFin.getTime() - 6 * 24 * 60 * 60 * 1000),
        },
      },
    });

    if (alertaExistente) continue; // Ya existe una alerta para esta garantía

    // Crear alerta solo si el cliente tiene medio de contacto
    if (cliente.correo || cliente.telefono) {
      const fechaVencimiento = garantia.fechaFin.toLocaleDateString("es-CL", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // Obtener mensaje desde plantilla
      const { asunto, mensaje } = plantillas.vencimientoGarantia(
        cliente.nombre,
        garantia.item.producto.nombre,
        fechaVencimiento
      );

      // Crear alerta programada para 7 días antes del vencimiento
      await prisma.alerta.create({
        data: {
          idCliente: cliente.idCliente,
          tipo: "Garantia" as any,
          canal: (cliente.correo ? "Correo" : "SMS") as any,
          mensaje: mensaje.substring(0, 240),
          fechaProgramada: new Date(garantia.fechaFin.getTime() - 7 * 24 * 60 * 60 * 1000),
          enviado: 0,
        },
      });

      alertasCreadas++;
    }
  }

  return alertasCreadas;
}

/**
 * Genera alertas de nuevos operativos oftalmológicos
 * Crea alertas para todos los clientes con medios de contacto
 * cuando se crea un nuevo operativo
 * 
 * Lógica:
 * - Genera alertas para todos los clientes con correo o teléfono
 * - Solo crea una alerta por operativo por cliente (evita duplicados)
 * - Las alertas se programan para enviarse inmediatamente
 * 
 * @param operativoId - ID del operativo para el cual generar alertas
 * @returns Número de alertas creadas
 */
export async function generarAlertasOperativos(operativoId: number): Promise<number> {
  const operativo = await prisma.operativo.findUnique({
    where: { idOperativo: operativoId },
  });

  if (!operativo) {
    throw new Error("Operativo no encontrado");
  }

  // Obtener todos los clientes con medios de contacto
  const clientes = await prisma.cliente.findMany({
    where: {
      OR: [
        { correo: { not: null } },
        { telefono: { not: null } },
      ],
    },
  });

  let alertasCreadas = 0;

  for (const cliente of clientes) {
    // Verificar si ya existe una alerta para este operativo y cliente
    const alertaExistente = await prisma.alerta.findFirst({
      where: {
        idCliente: cliente.idCliente,
        tipo: "Operativo" as any,
        fechaProgramada: {
          gte: new Date(operativo.fecha.getTime() - 2 * 24 * 60 * 60 * 1000),
          lte: new Date(operativo.fecha.getTime() + 2 * 24 * 60 * 60 * 1000),
        },
      },
    });

    if (alertaExistente) continue;

    const fecha = new Date(operativo.fecha).toLocaleDateString("es-CL", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const lugar = operativo.lugar || "";

    // Obtener mensaje desde plantilla
    const { asunto, mensaje } = plantillas.nuevoOperativo(
      cliente.nombre,
      operativo.nombre,
      fecha,
      lugar
    );

    // Crear alerta programada para enviar inmediatamente
    await prisma.alerta.create({
      data: {
        idCliente: cliente.idCliente,
        tipo: "Operativo" as any,
        canal: (cliente.correo ? "Correo" : "SMS") as any,
        mensaje: mensaje.substring(0, 240),
        fechaProgramada: new Date(), // Enviar inmediatamente
        enviado: 0,
      },
    });

    alertasCreadas++;
  }

  return alertasCreadas;
}

/**
 * Procesa y envía alertas pendientes
 * Busca alertas que están programadas para enviarse y aún no han sido enviadas
 * 
 * Lógica:
 * - Solo procesa alertas cuya fecha programada ya pasó
 * - Solo procesa alertas marcadas como no enviadas (enviado = 0)
 * - Limita a 50 alertas por ejecución para evitar sobrecarga
 * - Marca como enviada solo si al menos un canal funcionó
 * 
 * @returns Número de alertas enviadas exitosamente
 */
export async function procesarAlertasPendientes(): Promise<number> {
  const ahora = new Date();

  // Buscar alertas pendientes que deben enviarse
  const alertas = await prisma.alerta.findMany({
    where: {
      enviado: 0,
      fechaProgramada: {
        lte: ahora,
      },
    },
    include: {
      cliente: true,
    },
    take: 50, // Procesar máximo 50 a la vez para evitar sobrecarga
  });

  let enviadas = 0;

  for (const alerta of alertas) {
    try {
      const cliente = alerta.cliente;
      // Determinar canales según el tipo de alerta
      const canales: Array<"Correo" | "SMS"> = alerta.canal === "Correo" ? ["Correo"] : ["SMS"];

      // Determinar asunto según tipo de alerta
      let asunto = "Notificación de Dannig Óptica";
      switch (alerta.tipo) {
        case "Control":
          asunto = "Recordatorio de Cita - Dannig Óptica";
          break;
        case "Garantia":
          asunto = "Vencimiento de Garantía - Dannig Óptica";
          break;
        case "Operativo":
          asunto = "Nuevo Operativo Oftalmológico - Dannig Óptica";
          break;
      }

      // Enviar notificación
      const resultado = await enviarNotificacion(
        cliente.correo || null,
        cliente.telefono || null,
        asunto,
        alerta.mensaje,
        canales
      );

      // Marcar como enviada si al menos un canal funcionó
      if (resultado.emailEnviado || resultado.smsEnviado) {
        await prisma.alerta.update({
          where: { idAlerta: alerta.idAlerta },
          data: { enviado: 1 },
        });
        enviadas++;
        console.log(`✅ Alerta ${alerta.idAlerta} enviada exitosamente (${resultado.emailEnviado ? 'Email' : ''}${resultado.emailEnviado && resultado.smsEnviado ? ' + ' : ''}${resultado.smsEnviado ? 'SMS' : ''})`);
      } else {
        // Log detallado de por qué no se envió
        const razones = resultado.errores || [];
        console.warn(`⚠️  Alerta ${alerta.idAlerta} no pudo ser enviada: ${razones.join('; ')}`);
      }
    } catch (error: any) {
      console.error(`❌ Error procesando alerta ${alerta.idAlerta}:`, error.message || error);
      // No se marca como enviada si hay error
    }
  }

  return enviadas;
}
