import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";

type RouteContext = { params: Promise<{ id: string; matchId: string }> };

// PUT /api/conciliacion/[id]/match/[matchId]/aprobar — approve auto-approximate match
export async function PUT(request: Request, context: RouteContext) {
  const { error, userId } = await requirePermission(
    OPERATIONS.reconciliation.match.approve,
    "approve",
    ["CONTADOR"]
  );
  if (error) return error;

  const { id, matchId } = await context.params;

  try {
    // Find the match and verify it belongs to this conciliacion
    const match = await prisma.conciliacionMatch.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      return NextResponse.json(
        { error: "Match no encontrado" },
        { status: 404 }
      );
    }

    if (match.conciliacionId !== id) {
      return NextResponse.json(
        { error: "El match no pertenece a esta conciliacion" },
        { status: 400 }
      );
    }

    // Only AUTO_APROXIMADO matches need approval
    if (match.tipoMatch !== "AUTO_APROXIMADO") {
      return NextResponse.json(
        { error: "Solo los matches AUTO_APROXIMADO requieren aprobacion" },
        { status: 400 }
      );
    }

    // Update extracto and conciliacion in a transaction
    const updatedMatch = await prisma.$transaction(async (tx) => {
      // Update extracto estado to CONCILIADO
      await tx.extractoBancario.update({
        where: { id: match.extractoId },
        data: { estado: "CONCILIADO" },
      });

      // Update conciliacion counters
      await tx.conciliacion.update({
        where: { id },
        data: {
          totalConciliados: { increment: 1 },
          totalNoConciliados: { decrement: 1 },
        },
      });

      return match;
    });

    eventBus
      .emit(
        OPERATIONS.reconciliation.match.approve,
        "ConciliacionMatch",
        matchId,
        { extractoId: match.extractoId, conciliacionId: id },
        userId
      )
      .catch((err: unknown) =>
        console.error("[Events] reconciliation.match.approve error:", err)
      );

    return NextResponse.json(updatedMatch);
  } catch (error: unknown) {
    console.error("Error approving match:", error);
    return NextResponse.json(
      { error: "Error al aprobar match" },
      { status: 500 }
    );
  }
}
