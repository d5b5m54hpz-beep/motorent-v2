import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(
    OPERATIONS.monitor.metrics.view,
    "view",
    ["OPERADOR", "CONTADOR"]
  );
  if (error) return error;

  try {
    const url = new URL(req.url);
    const granularidad = url.searchParams.get("granularidad") ?? "DIA";
    const periodoDesde = url.searchParams.get("periodoDesde");
    const periodoHasta = url.searchParams.get("periodoHasta");
    const operationId = url.searchParams.get("operationId");

    const where: Record<string, unknown> = {
      granularidad,
    };

    if (operationId) where.operationId = operationId;

    if (periodoDesde || periodoHasta) {
      where.periodo = {};
      if (periodoDesde)
        (where.periodo as Record<string, unknown>).gte = periodoDesde;
      if (periodoHasta)
        (where.periodo as Record<string, unknown>).lte = periodoHasta;
    }

    const metricas = await prisma.eventMetric.findMany({
      where,
      orderBy: { periodo: "desc" },
    });

    // Aggregate totals
    const agregado = metricas.reduce(
      (acc, m) => {
        acc.totalEventos += m.totalEventos;
        acc.exitosos += m.exitosos;
        acc.fallidos += m.fallidos;
        acc._tiempoCount += m.tiempoPromedioMs != null ? 1 : 0;
        acc._tiempoSum += m.tiempoPromedioMs ?? 0;
        return acc;
      },
      {
        totalEventos: 0,
        exitosos: 0,
        fallidos: 0,
        _tiempoCount: 0,
        _tiempoSum: 0,
      }
    );

    const tiempoPromedioMs =
      agregado._tiempoCount > 0
        ? Math.round(agregado._tiempoSum / agregado._tiempoCount)
        : null;

    return NextResponse.json({
      metricas,
      agregado: {
        totalEventos: agregado.totalEventos,
        exitosos: agregado.exitosos,
        fallidos: agregado.fallidos,
        tiempoPromedioMs,
      },
    });
  } catch (err: unknown) {
    console.error("Error fetching monitor metricas:", err);
    return NextResponse.json(
      { error: "Error al obtener métricas" },
      { status: 500 }
    );
  }
}
