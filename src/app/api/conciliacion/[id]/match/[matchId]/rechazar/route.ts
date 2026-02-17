import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";

type RouteContext = { params: Promise<{ id: string; matchId: string }> };

// PUT /api/conciliacion/[id]/match/[matchId]/rechazar — reject match
export async function PUT(request: Request, context: RouteContext) {
  const { error, userId } = await requirePermission(
    OPERATIONS.reconciliation.match.reject,
    "execute",
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

    // Get current extracto estado before deletion
    const extracto = await prisma.extractoBancario.findUnique({
      where: { id: match.extractoId },
    });

    const wasAutoMatch =
      match.tipoMatch === "AUTO_EXACTO" ||
      match.tipoMatch === "AUTO_APROXIMADO";
    const wasConciliado = extracto?.estado === "CONCILIADO";

    // Delete match, update extracto, and update conciliacion counters in a transaction
    await prisma.$transaction(async (tx) => {
      // Update extracto estado back to PENDIENTE
      await tx.extractoBancario.update({
        where: { id: match.extractoId },
        data: { estado: "PENDIENTE" },
      });

      // Delete the match
      await tx.conciliacionMatch.delete({
        where: { id: matchId },
      });

      // Build conciliacion update data
      const updateData: Record<string, { decrement?: number; increment?: number }> = {};

      if (wasAutoMatch) {
        updateData.matchAutomaticos = { decrement: 1 };
      }

      if (wasConciliado) {
        updateData.totalConciliados = { decrement: 1 };
        updateData.totalNoConciliados = { increment: 1 };
      }

      if (Object.keys(updateData).length > 0) {
        await tx.conciliacion.update({
          where: { id },
          data: updateData,
        });
      }
    });

    eventBus
      .emit(
        OPERATIONS.reconciliation.match.reject,
        "ConciliacionMatch",
        matchId,
        { extractoId: match.extractoId, conciliacionId: id },
        userId
      )
      .catch((err: unknown) =>
        console.error("[Events] reconciliation.match.reject error:", err)
      );

    return NextResponse.json({ message: "Match rechazado y eliminado correctamente" });
  } catch (error: unknown) {
    console.error("Error rejecting match:", error);
    return NextResponse.json(
      { error: "Error al rechazar match" },
      { status: 500 }
    );
  }
}
