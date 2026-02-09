import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PUT /api/alertas/[id]
 * Marcar una alerta como leída
 * Accesible para ADMIN y OPERADOR
 */
export async function PUT(req: NextRequest, context: RouteContext) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  const { id } = await context.params;

  try {
    const alerta = await prisma.alerta.update({
      where: { id },
      data: { leida: true },
    });

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
 * Accesible para ADMIN y OPERADOR
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  const { id } = await context.params;

  try {
    await prisma.alerta.delete({
      where: { id },
    });

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
