import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { repuestoSchema } from "@/lib/validations";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission(
    OPERATIONS.inventory.part.view,
    "view",
    ["OPERADOR", "CONTADOR"]
  );
  if (error) return error;

  const { id } = await params;

  const repuesto = await prisma.repuesto.findUnique({
    where: { id },
    include: {
      proveedor: { select: { id: true, nombre: true } },
    },
  });

  if (!repuesto) {
    return NextResponse.json(
      { error: "Repuesto no encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json(repuesto);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId } = await requirePermission(
    OPERATIONS.inventory.part.update,
    "execute",
    ["OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = repuestoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await prisma.repuesto.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Repuesto no encontrado" },
        { status: 404 }
      );
    }

    const { proveedorId, stock, ...rest } = parsed.data;
    const newStock = stock ?? existing.stock;

    const repuesto = await prisma.$transaction(async (tx) => {
      const updated = await tx.repuesto.update({
        where: { id },
        data: {
          ...rest,
          stock: newStock,
          proveedorId: proveedorId || null,
        },
        include: {
          proveedor: { select: { id: true, nombre: true } },
        },
      });

      if (newStock !== existing.stock) {
        const diff = newStock - existing.stock;
        await tx.movimientoStock.create({
          data: {
            repuestoId: id,
            tipo: diff > 0 ? "ENTRADA_AJUSTE" : "SALIDA_AJUSTE",
            cantidad: diff,
            stockAnterior: existing.stock,
            stockNuevo: newStock,
            motivo: "Ajuste manual desde edición",
            usuario: userId || undefined,
          },
        });
      }

      return updated;
    });

    // Emit update event
    eventBus.emit(
      OPERATIONS.inventory.part.update,
      "Repuesto",
      id,
      { nombre: rest.nombre, codigo: rest.codigo },
      userId
    ).catch((err) => {
      console.error("Error emitting inventory.part.update event:", err);
    });

    return NextResponse.json(repuesto);
  } catch (error: unknown) {
    console.error("Error updating repuesto:", error);
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
  const { error, userId } = await requirePermission(
    OPERATIONS.inventory.part.delete,
    "execute",
    ["OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;

  const existing = await prisma.repuesto.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Repuesto no encontrado" },
      { status: 404 }
    );
  }

  await prisma.repuesto.delete({ where: { id } });

  // Emit delete event
  eventBus.emit(
    OPERATIONS.inventory.part.delete,
    "Repuesto",
    id,
    { nombre: existing.nombre, codigo: existing.codigo },
    userId
  ).catch((err) => {
    console.error("Error emitting inventory.part.delete event:", err);
  });

  return NextResponse.json({ ok: true });
}
