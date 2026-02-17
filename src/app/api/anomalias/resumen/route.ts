import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";

export async function GET() {
  const { error } = await requirePermission(OPERATIONS.anomaly.view, "view", ["OPERADOR", "CONTADOR"]);
  if (error) return error;

  try {
    // Group by severidad, tipo, estado
    const [totalPorSeveridad, totalPorTipo, totalPorEstado] = await Promise.all([
      prisma.anomalia.groupBy({ by: ["severidad"], _count: { id: true } }),
      prisma.anomalia.groupBy({ by: ["tipo"], _count: { id: true } }),
      prisma.anomalia.groupBy({ by: ["estado"], _count: { id: true } }),
    ]);

    // Tendencia: anomalias per day for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const anomaliasLast7Days = await prisma.anomalia.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    });

    // Build per-day counts
    const tendencia7dias: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      tendencia7dias[key] = 0;
    }

    for (const a of anomaliasLast7Days) {
      const key = a.createdAt.toISOString().slice(0, 10);
      if (key in tendencia7dias) {
        tendencia7dias[key]++;
      }
    }

    return NextResponse.json({
      totalPorSeveridad: totalPorSeveridad.map((g) => ({ severidad: g.severidad, total: g._count.id })),
      totalPorTipo: totalPorTipo.map((g) => ({ tipo: g.tipo, total: g._count.id })),
      totalPorEstado: totalPorEstado.map((g) => ({ estado: g.estado, total: g._count.id })),
      tendencia7dias,
    });
  } catch (err: unknown) {
    console.error("Error fetching anomalias resumen:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
