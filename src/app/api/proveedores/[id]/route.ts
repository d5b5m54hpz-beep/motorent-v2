import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { proveedorSchema } from "@/lib/validations";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission(OPERATIONS.supplier.view, "view", ["OPERADOR", "CONTADOR"]);
  if (error) return error;

  const { id } = await params;

  const proveedor = await prisma.proveedor.findUnique({
    where: { id },
    include: {
      _count: { select: { repuestos: true } },
    },
  });

  if (!proveedor) {
    return NextResponse.json(
      { error: "Proveedor no encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json(proveedor);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId } = await requirePermission(OPERATIONS.supplier.update, "execute", ["OPERADOR"]);
  if (error) return error;

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = proveedorSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await prisma.proveedor.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Proveedor no encontrado" },
        { status: 404 }
      );
    }

    const proveedor = await prisma.proveedor.update({
      where: { id },
      data: parsed.data,
    });

    eventBus.emit(OPERATIONS.supplier.update, "Proveedor", id, { nombre: parsed.data.nombre, cuit: parsed.data.cuit }, userId).catch(err => console.error("Error emitting supplier.update event:", err));

    return NextResponse.json(proveedor);
  } catch (error: unknown) {
    console.error("Error updating proveedor:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId } = await requirePermission(OPERATIONS.supplier.update, "execute");
  if (error) return error;

  const { id } = await params;

  const existing = await prisma.proveedor.findUnique({
    where: { id },
    include: { _count: { select: { repuestos: true } } },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Proveedor no encontrado" },
      { status: 404 }
    );
  }

  if (existing._count.repuestos > 0) {
    return NextResponse.json(
      {
        error:
          "No se puede eliminar: tiene repuestos asociados. Desactívelo en su lugar.",
      },
      { status: 400 }
    );
  }

  await prisma.proveedor.delete({ where: { id } });

  eventBus.emit(OPERATIONS.supplier.update, "Proveedor", id, { action: "delete", nombre: existing.nombre }, userId).catch(err => console.error("Error emitting supplier.update (delete) event:", err));

  return NextResponse.json({ ok: true });
}
