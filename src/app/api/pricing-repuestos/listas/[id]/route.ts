import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId } = await requirePermission(OPERATIONS.pricing.parts.list.update, "execute", ["OPERADOR"]);
  if (error) return error;

  const { id } = await params;

  try {
    const body = await req.json();
    const lista = await prisma.listaPrecio.update({
      where: { id },
      data: body,
    });

    eventBus.emit(OPERATIONS.pricing.parts.list.update, "ListaPrecio", id, { nombre: body.nombre }, userId).catch(err => console.error("Error emitting pricing.parts.list.update event:", err));

    return NextResponse.json(lista);
  } catch (err: unknown) {
    console.error("Error updating lista:", err);
    return NextResponse.json({ error: "Error al actualizar lista" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId } = await requirePermission(OPERATIONS.pricing.parts.list.update, "execute", ["OPERADOR"]);
  if (error) return error;

  const { id } = await params;

  try {
    await prisma.listaPrecio.delete({ where: { id } });

    eventBus.emit(OPERATIONS.pricing.parts.list.update, "ListaPrecio", id, { action: "delete" }, userId).catch(err => console.error("Error emitting pricing.parts.list.update (delete) event:", err));

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Error deleting lista:", err);
    return NextResponse.json({ error: "Error al eliminar lista" }, { status: 500 });
  }
}
