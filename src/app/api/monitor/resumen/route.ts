import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";

export async function GET() {
  const { error } = await requirePermission(
    OPERATIONS.monitor.events.view,
    "view",
    ["OPERADOR", "CONTADOR"]
  );
  if (error) return error;

  try {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const unaHoraAtras = new Date(Date.now() - 60 * 60 * 1000);
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // a-c. Event counts (parallel)
    const [eventosHoy, eventosUltimaHora, erroresHoy, topOperaciones, events24h, ultimoHealthCheck] =
      await Promise.all([
        // a. eventosHoy
        prisma.businessEvent.count({
          where: { createdAt: { gte: startOfToday } },
        }),
        // b. eventosUltimaHora
        prisma.businessEvent.count({
          where: { createdAt: { gte: unaHoraAtras } },
        }),
        // c. erroresHoy
        prisma.businessEvent.count({
          where: {
            status: "FAILED",
            createdAt: { gte: startOfToday },
          },
        }),
        // e. topOperaciones
        prisma.businessEvent.groupBy({
          by: ["operationId"],
          where: { createdAt: { gte: startOfToday } },
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
          take: 10,
        }),
        // f. events last 24h for timeline
        prisma.businessEvent.findMany({
          where: { createdAt: { gte: last24h } },
          select: { createdAt: true },
        }),
        // i. ultimoHealthCheck
        prisma.systemHealth.findFirst({
          orderBy: { timestamp: "desc" },
        }),
      ]);

    // d. tasaExito
    const tasaExito =
      eventosHoy > 0
        ? Math.round(((eventosHoy - erroresHoy) / eventosHoy) * 10000) / 100
        : 100;

    // f. eventosPorHora - group by hour in JS
    const porHora: Record<string, number> = {};
    for (const e of events24h) {
      const hour = e.createdAt.toISOString().slice(0, 13); // "2026-02-18T14"
      porHora[hour] = (porHora[hour] ?? 0) + 1;
    }

    // g-h. EventBus info
    const handlersRegistrados = eventBus.getHandlerCount();
    const patronesRegistrados = eventBus.getRegisteredPatterns();

    return NextResponse.json({
      eventosHoy,
      eventosUltimaHora,
      erroresHoy,
      tasaExito,
      topOperaciones: topOperaciones.map((op) => ({
        operationId: op.operationId,
        count: op._count.id,
      })),
      eventosPorHora: porHora,
      handlersRegistrados,
      patronesRegistrados,
      ultimoHealthCheck,
    });
  } catch (err: unknown) {
    console.error("Error fetching monitor resumen:", err);
    return NextResponse.json(
      { error: "Error al obtener resumen del monitor" },
      { status: 500 }
    );
  }
}
