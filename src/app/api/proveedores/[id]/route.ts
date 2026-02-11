import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { proveedorSchema } from "@/lib/validations";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  const { id } = await params;

  const proveedor = await prisma.proveedor.findUnique({
    where: { id },
    include: {
      _count: { select: { mantenimientos: true, repuestos: true } },
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
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
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
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const { id } = await params;

  const existing = await prisma.proveedor.findUnique({
    where: { id },
    include: { _count: { select: { mantenimientos: true, repuestos: true } } },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Proveedor no encontrado" },
      { status: 404 }
    );
  }

  if (existing._count.mantenimientos > 0 || existing._count.repuestos > 0) {
    return NextResponse.json(
      {
        error:
          "No se puede eliminar: tiene mantenimientos o repuestos asociados. Desactívelo en su lugar.",
      },
      { status: 400 }
    );
  }

  await prisma.proveedor.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
