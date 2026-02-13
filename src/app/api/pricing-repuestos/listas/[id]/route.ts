import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const lista = await prisma.listaPrecio.update({
      where: { id },
      data: body,
    });
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
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await prisma.listaPrecio.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Error deleting lista:", err);
    return NextResponse.json({ error: "Error al eliminar lista" }, { status: 500 });
  }
}
