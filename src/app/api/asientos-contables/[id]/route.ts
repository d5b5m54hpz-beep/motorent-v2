import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  const { id } = await context.params;

  try {
    const asiento = await prisma.asientoContable.findUnique({
      where: { id },
      include: {
        lineas: {
          include: {
            cuenta: { select: { id: true, codigo: true, nombre: true } },
          },
          orderBy: { orden: "asc" },
        },
        facturaCompra: {
          select: { id: true, visibleId: true, numero: true, razonSocial: true },
        },
      },
    });

    if (!asiento) {
      return NextResponse.json({ error: "Asiento no encontrado" }, { status: 404 });
    }

    return NextResponse.json(asiento);
  } catch (err: unknown) {
    console.error("Error fetching asiento:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const { id } = await context.params;

  try {
    const asiento = await prisma.asientoContable.findUnique({
      where: { id },
    });

    if (!asiento) {
      return NextResponse.json({ error: "Asiento no encontrado" }, { status: 404 });
    }

    if (asiento.cerrado) {
      return NextResponse.json({ error: "No se puede eliminar un asiento cerrado" }, { status: 400 });
    }

    // Unlink from factura compra if linked
    if (asiento.facturaCompraId) {
      await prisma.facturaCompra.update({
        where: { id: asiento.facturaCompraId },
        data: { asientoId: null },
      });
    }

    await prisma.asientoContable.delete({ where: { id } });

    return NextResponse.json({ message: "Asiento eliminado" });
  } catch (err: unknown) {
    console.error("Error deleting asiento:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
