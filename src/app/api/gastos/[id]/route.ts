import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { gastoSchema } from "@/lib/validations";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
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
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
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
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const { id } = await params;

  const existing = await prisma.gasto.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 });
  }

  await prisma.gasto.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
