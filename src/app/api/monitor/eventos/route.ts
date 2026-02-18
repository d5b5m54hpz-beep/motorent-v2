import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(
    OPERATIONS.monitor.events.view,
    "view",
    ["OPERADOR", "CONTADOR"]
  );
  if (error) return error;

  try {
    const url = new URL(req.url);
    const limitParam = parseInt(url.searchParams.get("limit") ?? "50");
    const limit = Math.min(Math.max(1, limitParam), 200);
    const operationId = url.searchParams.get("operationId");
    const status = url.searchParams.get("status");
    const desde = url.searchParams.get("desde");

    const where: Record<string, unknown> = {};

    if (operationId) where.operationId = operationId;
    if (status) where.status = status;
    const userId = url.searchParams.get("userId");
    if (userId) where.userId = userId;
    if (desde) {
      where.createdAt = { gte: new Date(desde) };
    }

    const [events, total] = await Promise.all([
      prisma.businessEvent.findMany({
        where,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.businessEvent.count({ where }),
    ]);

    return NextResponse.json({ events, total });
  } catch (err: unknown) {
    console.error("Error fetching monitor eventos:", err);
    return NextResponse.json(
      { error: "Error al obtener eventos" },
      { status: 500 }
    );
  }
}
