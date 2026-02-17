import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission(OPERATIONS.anomaly.view, "view", ["OPERADOR", "CONTADOR"]);
  if (error) return error;

  const { id } = await params;

  const anomalia = await prisma.anomalia.findUnique({ where: { id } });

  if (!anomalia) {
    return NextResponse.json({ error: "Anomalia no encontrada" }, { status: 404 });
  }

  return NextResponse.json(anomalia);
}

export async function PUT(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId } = await requirePermission(OPERATIONS.anomaly.update, "execute", ["OPERADOR", "CONTADOR"]);
  if (error) return error;

  const { id } = await params;

  try {
    const existing = await prisma.anomalia.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Anomalia no encontrada" }, { status: 404 });
    }

    const anomalia = await prisma.anomalia.update({
      where: { id },
      data: { estado: "EN_REVISION" },
    });

    eventBus.emit(OPERATIONS.anomaly.update, "Anomalia", id, { estado: "EN_REVISION", tipo: existing.tipo }, userId).catch(err => console.error("Error emitting anomaly.update event:", err));

    return NextResponse.json(anomalia);
  } catch (err: unknown) {
    console.error("Error updating anomalia:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
