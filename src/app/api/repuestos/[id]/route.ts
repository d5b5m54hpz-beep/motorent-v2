import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { repuestoSchema } from "@/lib/validations";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

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
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

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
            usuario: session.user.email || undefined,
          },
        });
      }

      return updated;
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
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.repuesto.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Repuesto no encontrado" },
      { status: 404 }
    );
  }

  await prisma.repuesto.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
