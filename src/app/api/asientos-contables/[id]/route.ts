import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
  const { error } = await requirePermission(OPERATIONS.accounting.entry.view, "view", ["CONTADOR", "OPERADOR"]);
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
  const { error, userId } = await requirePermission(OPERATIONS.accounting.entry.update, "execute", ["CONTADOR"]);
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

    eventBus.emit(OPERATIONS.accounting.entry.update, "AsientoContable", id, { action: "delete" }, userId).catch(err => console.error("[Events] accounting.entry.update error:", err));

    return NextResponse.json({ message: "Asiento eliminado" });
  } catch (err: unknown) {
    console.error("Error deleting asiento:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
