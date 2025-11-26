/**
 * Utility for logging audit operations
 * Records critical operations (CREATE, UPDATE, DELETE) for compliance and traceability
 */

import { prisma } from "../db";

export type OperacionAuditoria = "CREATE" | "UPDATE" | "DELETE";

interface DatosAuditoria {
  idUsuario?: number;
  tabla: string;
  operacion: OperacionAuditoria;
  registroId?: string | number;
  datosAnteriores?: any;
  datosNuevos?: any;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Registra una operación en la bitácora de auditoría
 * 
 * @param datos - Datos de la operación a auditar
 * @returns Promise que resuelve cuando se registra la auditoría
 */
export async function registrarAuditoria(datos: DatosAuditoria): Promise<void> {
  try {
    await prisma.auditoria.create({
      data: {
        idUsuario: datos.idUsuario || null,
        tabla: datos.tabla,
        operacion: datos.operacion,
        registroId: datos.registroId ? String(datos.registroId) : null,
        datosAnteriores: datos.datosAnteriores ? JSON.stringify(datos.datosAnteriores) : null,
        datosNuevos: datos.datosNuevos ? JSON.stringify(datos.datosNuevos) : null,
        ipAddress: datos.ipAddress || null,
        userAgent: datos.userAgent || null,
      },
    });
  } catch (error) {
    // Log error but don't fail the operation
    console.error("[ERROR] Failed to record audit log:", error);
  }
}

/**
 * Registra una operación de auditoría desde un request de Fastify
 * Extrae automáticamente IP y User-Agent del request
 */
export async function registrarAuditoriaDesdeRequest(
  req: any,
  datos: Omit<DatosAuditoria, "ipAddress" | "userAgent">
): Promise<void> {
  const ipAddress = req.ip || req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || null;
  const userAgent = req.headers["user-agent"] || null;
  const idUsuario = req.user?.sub || null;

  await registrarAuditoria({
    ...datos,
    idUsuario: datos.idUsuario || idUsuario || undefined,
    ipAddress: ipAddress || undefined,
    userAgent: userAgent || undefined,
  });
}








