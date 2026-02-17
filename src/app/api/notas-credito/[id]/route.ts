import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission(OPERATIONS.credit_note.view, "view", ["OPERADOR", "CONTADOR"]);
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
  const { error, userId } = await requirePermission(OPERATIONS.credit_note.update, "execute", ["CONTADOR"]);
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

    eventBus.emit(OPERATIONS.credit_note.update, "NotaCredito", id, { action: "update" }, userId).catch(err => console.error("[Events] credit_note.update error:", err));

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
  const { error: deleteError, userId: deleteUserId } = await requirePermission(OPERATIONS.credit_note.update, "execute", ["CONTADOR"]);
  if (deleteError) return deleteError;

  try {
    const { id } = await params;

    await prisma.notaCredito.delete({
      where: { id },
    });

    eventBus.emit(OPERATIONS.credit_note.update, "NotaCredito", id, { action: "delete" }, deleteUserId).catch(err => console.error("[Events] credit_note.update error:", err));

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Error deleting nota de crédito:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
