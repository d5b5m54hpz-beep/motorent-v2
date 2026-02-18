import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(OPERATIONS.dashboard.accounting.view, "view", ["CONTADOR", "OPERADOR"]);
  if (error) return error;

  try {
    const facturasPendientes = await prisma.facturaCompra.aggregate({
      where: { estado: { in: ["PENDIENTE", "PAGADA_PARCIAL"] } },
      _count: { id: true },
      _sum: { total: true },
    });

    return NextResponse.json({
      facturasPendientes: {
        cantidad: facturasPendientes._count.id,
        monto: Math.round(Number(facturasPendientes._sum.total) || 0),
      },
    });
  } catch (err: unknown) {
    console.error("Error fetching dashboard contabilidad:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
