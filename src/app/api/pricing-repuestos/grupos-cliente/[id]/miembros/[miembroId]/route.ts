import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; miembroId: string }> }
) {
  const { error, userId } = await requirePermission(OPERATIONS.pricing.parts.customer_group.create, "execute", ["OPERADOR"]);
  if (error) return error;

  const { miembroId } = await params;

  try {
    await prisma.miembroGrupoCliente.delete({
      where: { id: miembroId },
    });

    eventBus.emit(OPERATIONS.pricing.parts.customer_group.create, "MiembroGrupoCliente", miembroId, { action: "delete" }, userId).catch(err => console.error("Error emitting pricing.parts.customer_group.create (delete) event:", err));

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Error deleting miembro:", err);
    return NextResponse.json({ error: "Error al remover miembro" }, { status: 500 });
  }
}
