import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId } = await requirePermission(OPERATIONS.anomaly.discard, "execute", ["OPERADOR", "CONTADOR"]);
  if (error) return error;

  const { id } = await params;

  try {
    const existing = await prisma.anomalia.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Anomalia no encontrada" }, { status: 404 });
    }

    const body = await req.json();
    const motivo = body?.motivo;

    if (!motivo || typeof motivo !== "string") {
      return NextResponse.json({ error: "El campo 'motivo' es requerido" }, { status: 400 });
    }

    const anomalia = await prisma.anomalia.update({
      where: { id },
      data: {
        estado: "DESCARTADA",
        resolucion: motivo,
      },
    });

    eventBus.emit(OPERATIONS.anomaly.discard, "Anomalia", id, { motivo, tipo: existing.tipo }, userId).catch(err => console.error("Error emitting anomaly.discard event:", err));

    return NextResponse.json(anomalia);
  } catch (err: unknown) {
    console.error("Error discarding anomalia:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
