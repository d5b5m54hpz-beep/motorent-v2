import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { gastoSchema } from "@/lib/validations";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission(OPERATIONS.expense.view, "view", ["OPERADOR", "CONTADOR"]);
  if (error) return error;

  const { id } = await params;

  const gasto = await prisma.gasto.findUnique({
    where: { id },
    include: {
      moto: { select: { id: true, marca: true, modelo: true, patente: true } },
      proveedor: { select: { id: true, nombre: true } },
    },
  });

  if (!gasto) {
    return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 });
  }

  return NextResponse.json(gasto);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId } = await requirePermission(OPERATIONS.expense.update, "execute", ["OPERADOR", "CONTADOR"]);
  if (error) return error;

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = gastoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await prisma.gasto.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 });
    }

    const { motoId, proveedorId, fecha, ...rest } = parsed.data;

    const gasto = await prisma.gasto.update({
      where: { id },
      data: {
        ...rest,
        motoId: motoId || null,
        proveedorId: proveedorId || null,
        fecha: fecha ? new Date(fecha) : undefined,
      },
      include: {
        moto: { select: { id: true, marca: true, modelo: true, patente: true } },
        proveedor: { select: { id: true, nombre: true } },
      },
    });

    eventBus.emit(OPERATIONS.expense.update, "Gasto", id, { categoria: rest.categoria, monto: rest.monto }, userId).catch(err => console.error("Error emitting expense.update event:", err));

    return NextResponse.json(gasto);
  } catch (err: unknown) {
    console.error("Error updating gasto:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId } = await requirePermission(OPERATIONS.expense.update, "execute");
  if (error) return error;

  const { id } = await params;

  const existing = await prisma.gasto.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 });
  }

  await prisma.gasto.delete({ where: { id } });

  eventBus.emit(OPERATIONS.expense.update, "Gasto", id, { action: "delete", concepto: existing.concepto }, userId).catch(err => console.error("Error emitting expense.update (delete) event:", err));

  return NextResponse.json({ ok: true });
}
