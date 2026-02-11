import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRole(["ADMIN", "OPERADOR", "CONTADOR"]);
  if (error) return error;

  try {
    const { id } = await params;

    const notaCredito = await prisma.notaCredito.findUnique({
      where: { id },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
      },
    });

    if (!notaCredito) {
      return NextResponse.json(
        { error: "Nota de crédito no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: notaCredito });
  } catch (err: unknown) {
    console.error("Error fetching nota de crédito:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRole(["ADMIN", "OPERADOR", "CONTADOR"]);
  if (error) return error;

  try {
    const { id } = await params;
    const body = await req.json();

    const notaCredito = await prisma.notaCredito.update({
      where: { id },
      data: body,
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ data: notaCredito });
  } catch (err: unknown) {
    console.error("Error updating nota de crédito:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  try {
    const { id } = await params;

    await prisma.notaCredito.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Error deleting nota de crédito:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
