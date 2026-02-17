import { prisma } from "@/lib/prisma";
import { eventBus, type EventContext } from "../event-bus";

/**
 * Metrics handler — records EventMetric data for every event that passes
 * through the system. Runs at priority 999 (last, after all business logic).
 *
 * For each event:
 * 1. Upsert EventMetric for the current HOUR period
 * 2. Upsert EventMetric for the current DAY period
 * 3. Track success/failure based on the event's final status
 * 4. Calculate processing time from event creation
 */

function getHourPeriod(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}`;
}

function getDayPeriod(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export async function handleEventMetrics(ctx: EventContext): Promise<void> {
  try {
    const now = new Date();
    const hourPeriod = getHourPeriod(now);
    const dayPeriod = getDayPeriod(now);
    const operationId = ctx.operationId;

    // Determine if the event succeeded (at this point, we're the last handler,
    // so if we're running, previous handlers completed for this event)
    const isSuccess = !ctx.event.error;
    const processingMs = Math.max(0, now.getTime() - ctx.event.createdAt.getTime());

    // Upsert hourly metric
    await prisma.eventMetric.upsert({
      where: {
        periodo_granularidad_operationId: {
          periodo: hourPeriod,
          granularidad: "HORA",
          operationId,
        },
      },
      update: {
        totalEventos: { increment: 1 },
        exitosos: isSuccess ? { increment: 1 } : undefined,
        fallidos: !isSuccess ? { increment: 1 } : undefined,
        tiempoPromedioMs: processingMs,
      },
      create: {
        periodo: hourPeriod,
        granularidad: "HORA",
        operationId,
        totalEventos: 1,
        exitosos: isSuccess ? 1 : 0,
        fallidos: !isSuccess ? 1 : 0,
        tiempoPromedioMs: processingMs,
      },
    });

    // Upsert daily metric
    await prisma.eventMetric.upsert({
      where: {
        periodo_granularidad_operationId: {
          periodo: dayPeriod,
          granularidad: "DIA",
          operationId,
        },
      },
      update: {
        totalEventos: { increment: 1 },
        exitosos: isSuccess ? { increment: 1 } : undefined,
        fallidos: !isSuccess ? { increment: 1 } : undefined,
        tiempoPromedioMs: processingMs,
      },
      create: {
        periodo: dayPeriod,
        granularidad: "DIA",
        operationId,
        totalEventos: 1,
        exitosos: isSuccess ? 1 : 0,
        fallidos: !isSuccess ? 1 : 0,
        tiempoPromedioMs: processingMs,
      },
    });
  } catch (err) {
    // Metrics should never block the system — log and swallow
    console.error("[Metrics] Error recording event metric:", err);
  }
}

export function registerMetricsHandlers(): void {
  // Catch-all: every event updates metrics
  eventBus.registerHandler("*", handleEventMetrics, {
    priority: 999, // Run last — after all business logic
  });
}
