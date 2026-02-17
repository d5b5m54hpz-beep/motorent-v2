import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(OPERATIONS.anomaly.analysis.view, "view", ["CONTADOR", "OPERADOR"]);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") ?? "1");
    const limit = parseInt(url.searchParams.get("limit") ?? "15");
    const tipo = url.searchParams.get("tipo");

    const where: Record<string, unknown> = {};
    if (tipo) where.tipo = tipo;

    const [data, total] = await Promise.all([
      prisma.analisisFinanciero.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { fechaAnalisis: "desc" },
      }),
      prisma.analisisFinanciero.count({ where }),
    ]);

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: unknown) {
    console.error("Error fetching analisis financiero:", err);
    return NextResponse.json({ data: [], total: 0, page: 1, limit: 15, totalPages: 0 });
  }
}
