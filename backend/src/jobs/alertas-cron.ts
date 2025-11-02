/**
 * Sistema de tareas programadas (cron jobs) para alertas automatizadas
 * 
 * Este módulo inicializa todas las tareas programadas que ejecutan
 * automáticamente las funciones de generación y procesamiento de alertas.
 * 
 * Tareas programadas:
 * 1. Procesamiento de alertas pendientes: cada 15 minutos
 *    - Envía las alertas que ya están programadas para enviarse
 * 
 * 2. Generación de alertas de citas: cada hora
 *    - Busca citas confirmadas en las próximas 24 horas
 *    - Crea alertas de recordatorio automáticamente
 * 
 * 3. Generación de alertas de garantías: diario a las 8:00 AM
 *    - Busca garantías que vencen en los próximos 7 días
 *    - Crea alertas de vencimiento automáticamente
 * 
 * Nota: Los cron jobs se inicializan automáticamente al iniciar el servidor
 */

import cron from "node-cron";
import {
  generarAlertasCitas,
  generarAlertasGarantias,
  procesarAlertasPendientes,
} from "../services/alertas";

/**
 * Inicializa todos los cron jobs del sistema de alertas
 * Esta función debe ser llamada una vez al iniciar el servidor
 */
export function iniciarCronJobs() {
  console.log("Starting automated alerts system...");

  // Task 1: Process pending alerts every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    console.log("[Cron] Processing pending alerts...");
    try {
      const enviadas = await procesarAlertasPendientes();
      if (enviadas > 0) {
        console.log(`[Cron] ${enviadas} alerts sent`);
      }
    } catch (error: any) {
      console.error("[Cron] Error processing alerts:", error.message);
    }
  });

  // Task 2: Generate appointment alerts every hour
  cron.schedule("0 * * * *", async () => {
    console.log("[Cron] Generating appointment reminder alerts...");
    try {
      const creadas = await generarAlertasCitas();
      if (creadas > 0) {
        console.log(`[Cron] ${creadas} appointment alerts generated`);
      }
    } catch (error: any) {
      console.error("[Cron] Error generating appointment alerts:", error.message);
    }
  });

  // Task 3: Generate warranty alerts daily at 8:00 AM
  cron.schedule("0 8 * * *", async () => {
    console.log("[Cron] Generating warranty expiration alerts...");
    try {
      const creadas = await generarAlertasGarantias();
      if (creadas > 0) {
        console.log(`[Cron] ${creadas} warranty alerts generated`);
      }
    } catch (error: any) {
      console.error("[Cron] Error generating warranty alerts:", error.message);
    }
  });

  console.log("Automated alerts system started successfully");
  console.log("   - Alert processing: every 15 minutes");
  console.log("   - Appointment alerts: every hour");
  console.log("   - Warranty alerts: daily at 8:00 AM");
}
