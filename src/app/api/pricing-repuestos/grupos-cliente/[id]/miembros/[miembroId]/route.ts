import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; miembroId: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { miembroId } = await params;

  try {
    await prisma.miembroGrupoCliente.delete({
      where: { id: miembroId },
    });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Error deleting miembro:", err);
    return NextResponse.json({ error: "Error al remover miembro" }, { status: 500 });
  }
}
