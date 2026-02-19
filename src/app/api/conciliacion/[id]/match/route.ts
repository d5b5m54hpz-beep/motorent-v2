import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/conciliacion/[id]/match — create manual match
export async function POST(request: Request, context: RouteContext) {
  const { error, userId } = await requirePermission(
    OPERATIONS.reconciliation.match.create,
    "execute",
    ["CONTADOR"]
  );
  if (error) return error;

  const { id } = await context.params;

  try {
    const body = await request.json();
    const { extractoId, pagoId, gastoId, facturaId, observaciones } = body;

    // Validate at least one match target is provided
    if (!pagoId && !gastoId && !facturaId) {
      return NextResponse.json(
        { error: "Debe proporcionar al menos uno de: pagoId, gastoId, facturaId" },
        { status: 400 }
      );
    }

    // Verify extracto exists and belongs to this conciliacion
    const extracto = await prisma.extractoBancario.findUnique({
      where: { id: extractoId },
    });

    if (!extracto) {
      return NextResponse.json(
        { error: "Extracto bancario no encontrado" },
        { status: 404 }
      );
    }

    if (extracto.conciliacionId !== id) {
      return NextResponse.json(
        { error: "El extracto no pertenece a esta conciliacion" },
        { status: 400 }
      );
    }

    // Create match and update extracto + conciliacion in a transaction
    const match = await prisma.$transaction(async (tx) => {
      // Create the manual match
      const newMatch = await tx.conciliacionMatch.create({
        data: {
          conciliacionId: id,
          extractoId,
          tipoMatch: "MANUAL",
          confianza: 100,
          pagoId: pagoId ?? null,
          gastoId: gastoId ?? null,
          facturaId: facturaId ?? null,
          observaciones: observaciones ?? null,
        },
      });

      // Update extracto estado to CONCILIADO
      await tx.extractoBancario.update({
        where: { id: extractoId },
        data: { estado: "CONCILIADO" },
      });

      // Update conciliacion counters
      await tx.conciliacion.update({
        where: { id },
        data: {
          matchManuales: { increment: 1 },
          totalConciliados: { increment: 1 },
          totalNoConciliados: { decrement: 1 },
        },
      });

      return newMatch;
    });

    eventBus
      .emit(
        OPERATIONS.reconciliation.match.create,
        "ConciliacionMatch",
        match.id,
        { extractoId, pagoId, gastoId, facturaId, conciliacionId: id },
        userId
      )
      .catch((err: unknown) =>
        console.error("[Events] reconciliation.match.create error:", err)
      );

    return NextResponse.json(match, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating manual match:", error);
    return NextResponse.json(
      { error: "Error al crear conciliacion manual" },
      { status: 500 }
    );
  }
}
