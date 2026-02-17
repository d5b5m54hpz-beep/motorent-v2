import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission(
    OPERATIONS.reconciliation.process.view,
    "view",
    ["CONTADOR"]
  );
  if (error) return error;

  try {
    const { id } = await params;

    const conciliacion = await prisma.conciliacion.findUnique({
      where: { id },
      include: {
        cuentaBancaria: {
          select: {
            id: true,
            banco: true,
            tipoCuenta: true,
          },
        },
        extractos: {
          orderBy: { fecha: "asc" },
        },
        matches: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!conciliacion) {
      return NextResponse.json(
        { error: "Conciliacion no encontrada" },
        { status: 404 }
      );
    }

    // Enrich matches with extracto info (no direct Prisma relation)
    const extractoMap = new Map(
      conciliacion.extractos.map((e) => [e.id, e])
    );
    const matchesWithExtracto = conciliacion.matches.map((match) => ({
      ...match,
      extracto: extractoMap.get(match.extractoId) ?? null,
    }));

    return NextResponse.json({
      ...conciliacion,
      matches: matchesWithExtracto,
    });
  } catch (error: unknown) {
    console.error("[conciliacion/[id]] Error:", error);
    const message =
      error instanceof Error ? error.message : "Error interno del servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
