import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(OPERATIONS.anomaly.view, "view", ["OPERADOR", "CONTADOR"]);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") ?? "1");
    const limit = parseInt(url.searchParams.get("limit") ?? "15");
    const tipo = url.searchParams.get("tipo");
    const severidad = url.searchParams.get("severidad");
    const estado = url.searchParams.get("estado");
    const fechaDesde = url.searchParams.get("fechaDesde");
    const fechaHasta = url.searchParams.get("fechaHasta");

    const where: Record<string, unknown> = {};

    if (tipo) where.tipo = tipo;
    if (severidad) where.severidad = severidad;
    if (estado) where.estado = estado;

    if (fechaDesde || fechaHasta) {
      where.createdAt = {};
      if (fechaDesde) (where.createdAt as Record<string, unknown>).gte = new Date(fechaDesde);
      if (fechaHasta) (where.createdAt as Record<string, unknown>).lte = new Date(fechaHasta + "T23:59:59Z");
    }

    const [data, total] = await Promise.all([
      prisma.anomalia.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.anomalia.count({ where }),
    ]);

    // Sort by severidad priority in JS (CRITICA > ALTA > MEDIA > BAJA), then by createdAt DESC
    const severidadOrder: Record<string, number> = { CRITICA: 0, ALTA: 1, MEDIA: 2, BAJA: 3 };
    data.sort((a, b) => {
      const sevA = severidadOrder[a.severidad] ?? 4;
      const sevB = severidadOrder[b.severidad] ?? 4;
      if (sevA !== sevB) return sevA - sevB;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: unknown) {
    console.error("Error fetching anomalias:", err);
    return NextResponse.json({ data: [], total: 0, page: 1, limit: 15, totalPages: 0 });
  }
}
