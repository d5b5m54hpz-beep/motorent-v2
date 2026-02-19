import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(
    OPERATIONS.reconciliation.statement.view,
    "view",
    ["CONTADOR"]
  );
  if (error) return error;

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") ?? "1");
    const limit = parseInt(url.searchParams.get("limit") ?? "15");
    const cuentaBancariaId = url.searchParams.get("cuentaBancariaId");
    const fechaDesde = url.searchParams.get("fechaDesde");
    const fechaHasta = url.searchParams.get("fechaHasta");
    const estado = url.searchParams.get("estado");

    const where: Record<string, unknown> = {};

    if (cuentaBancariaId) {
      where.cuentaBancariaId = cuentaBancariaId;
    }

    if (fechaDesde || fechaHasta) {
      const fechaFilter: Record<string, Date> = {};
      if (fechaDesde) {
        fechaFilter.gte = new Date(fechaDesde);
      }
      if (fechaHasta) {
        fechaFilter.lte = new Date(fechaHasta);
      }
      where.fecha = fechaFilter;
    }

    if (estado) {
      where.estado = estado;
    }

    const [data, total] = await Promise.all([
      prisma.extractoBancario.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { fecha: "desc" },
        include: {
          cuentaBancaria: {
            select: { banco: true, tipoCuenta: true },
          },
        },
      }),
      prisma.extractoBancario.count({ where }),
    ]);

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: unknown) {
    console.error("Error fetching extractos bancarios:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
