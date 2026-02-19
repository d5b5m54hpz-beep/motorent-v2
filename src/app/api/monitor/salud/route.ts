import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";

export async function GET() {
  const { error } = await requirePermission(
    OPERATIONS.monitor.health.view,
    "view",
    ["OPERADOR", "CONTADOR"]
  );
  if (error) return error;

  try {
    const history = await prisma.systemHealth.findMany({
      take: 24,
      orderBy: { timestamp: "desc" },
    });

    return NextResponse.json({ history });
  } catch (err: unknown) {
    console.error("Error fetching salud history:", err);
    return NextResponse.json(
      { error: "Error al obtener historial de salud" },
      { status: 500 }
    );
  }
}

export async function POST() {
  const { error } = await requirePermission(
    OPERATIONS.monitor.health.check,
    "execute",
    ["OPERADOR", "CONTADOR"]
  );
  if (error) return error;

  try {
    const unaHoraAtras = new Date(Date.now() - 60 * 60 * 1000);

    // a. DB latency
    const start = Date.now();
    await prisma.$queryRawUnsafe("SELECT 1");
    const dbLatencyMs = Date.now() - start;

    // b. Handlers activos
    const handlersActivos = eventBus.getHandlerCount();

    // c-e. Event counts (parallel)
    const [eventsPendientes, eventsUltima1h, erroresUltima1h] =
      await Promise.all([
        prisma.businessEvent.count({
          where: { status: { in: ["PENDING", "PROCESSING"] } },
        }),
        prisma.businessEvent.count({
          where: { createdAt: { gte: unaHoraAtras } },
        }),
        prisma.businessEvent.count({
          where: {
            status: "FAILED",
            createdAt: { gte: unaHoraAtras },
          },
        }),
      ]);

    // f. Memory usage
    const memoryUsageMb = Math.round(
      (process.memoryUsage().heapUsed / 1024 / 1024) * 100
    ) / 100;

    // g. EventBus status
    let eventBusStatus: "HEALTHY" | "DEGRADED" | "DOWN" = "HEALTHY";
    if (dbLatencyMs > 5000) {
      eventBusStatus = "DOWN";
    } else if (
      eventsUltima1h > 0 &&
      erroresUltima1h / eventsUltima1h > 0.1
    ) {
      eventBusStatus = "DEGRADED";
    }

    // Save SystemHealth record
    const healthRecord = await prisma.systemHealth.create({
      data: {
        eventBusStatus,
        dbLatencyMs,
        handlersActivos,
        eventsPendientes,
        eventsUltima1h,
        erroresUltima1h,
        memoryUsageMb,
        metricas: {
          registeredPatterns: eventBus.getRegisteredPatterns(),
        },
      },
    });

    return NextResponse.json(healthRecord);
  } catch (err: unknown) {
    console.error("Error running health check:", err);
    return NextResponse.json(
      { error: "Error al ejecutar health check" },
      { status: 500 }
    );
  }
}
