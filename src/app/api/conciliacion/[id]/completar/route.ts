import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/conciliacion/[id]/completar — complete reconciliation process
export async function POST(request: Request, context: RouteContext) {
  const { error, userId } = await requirePermission(
    OPERATIONS.reconciliation.process.complete,
    "execute",
    ["CONTADOR"]
  );
  if (error) return error;

  const { id } = await context.params;

  try {
    const body = await request.json();
    const crearAsienteAjuste = body.crearAsienteAjuste ?? false;

    // Find the conciliacion
    const conciliacion = await prisma.conciliacion.findUnique({
      where: { id },
    });

    if (!conciliacion) {
      return NextResponse.json(
        { error: "Conciliacion no encontrada" },
        { status: 404 }
      );
    }

    // Count actual pending and conciliado extractos for this conciliacion
    const pendientes = await prisma.extractoBancario.count({
      where: {
        conciliacionId: id,
        estado: "PENDIENTE",
      },
    });

    const conciliados = await prisma.extractoBancario.count({
      where: {
        conciliacionId: id,
        estado: "CONCILIADO",
      },
    });

    // Determine final estado based on pending extractos
    const nuevoEstado = pendientes > 0 ? "REVISION" : "COMPLETADA";

    // Update the conciliacion
    const updated = await prisma.conciliacion.update({
      where: { id },
      data: {
        estado: nuevoEstado,
        completedAt: new Date(),
        totalConciliados: conciliados,
        totalNoConciliados: pendientes,
      },
    });

    eventBus
      .emit(
        OPERATIONS.reconciliation.process.complete,
        "Conciliacion",
        id,
        {
          totalConciliados: conciliados,
          totalPendientes: pendientes,
          crearAsienteAjuste,
          cuentaBancariaId: conciliacion.cuentaBancariaId,
        },
        userId
      )
      .catch((err: unknown) =>
        console.error("[Events] reconciliation.process.complete error:", err)
      );

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error("Error completing conciliacion:", error);
    return NextResponse.json(
      { error: "Error al completar conciliacion" },
      { status: 500 }
    );
  }
}
