import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { repuestoSchema } from "@/lib/validations";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
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
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
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

    const { proveedorId, ...rest } = parsed.data;

    const repuesto = await prisma.repuesto.update({
      where: { id },
      data: {
        ...rest,
        proveedorId: proveedorId || null,
      },
      include: {
        proveedor: { select: { id: true, nombre: true } },
      },
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
  const { error } = await requireRole(["ADMIN"]);
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

  return NextResponse.json({ ok: true });
}
