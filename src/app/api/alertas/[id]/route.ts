import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PUT /api/alertas/[id]
 * Marcar una alerta como leida
 */
export async function PUT(req: NextRequest, context: RouteContext) {
  const { error, userId } = await requirePermission(OPERATIONS.alert.update, "execute", ["OPERADOR"]);
  if (error) return error;

  const { id } = await context.params;

  try {
    const alerta = await prisma.alerta.update({
      where: { id },
      data: { leida: true },
    });

    eventBus.emit(OPERATIONS.alert.update, "Alerta", id, { leida: true }, userId).catch(err => console.error("[Events] alert.update error:", err));

    return NextResponse.json(alerta);
  } catch (error: unknown) {
    console.error("Error in PUT /api/alertas/[id]:", error);

    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json({ error: "Alerta no encontrada" }, { status: 404 });
    }

    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/alertas/[id]
 * Eliminar una alerta
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  const { error, userId } = await requirePermission(OPERATIONS.alert.delete, "execute", ["OPERADOR"]);
  if (error) return error;

  const { id } = await context.params;

  try {
    await prisma.alerta.delete({
      where: { id },
    });

    eventBus.emit(OPERATIONS.alert.delete, "Alerta", id, { action: "delete" }, userId).catch(err => console.error("[Events] alert.delete error:", err));

    return NextResponse.json({ message: "Alerta eliminada correctamente" });
  } catch (error: unknown) {
    console.error("Error in DELETE /api/alertas/[id]:", error);

    if (error instanceof Error && error.message.includes("Record to delete does not exist")) {
      return NextResponse.json({ error: "Alerta no encontrada" }, { status: 404 });
    }

    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
