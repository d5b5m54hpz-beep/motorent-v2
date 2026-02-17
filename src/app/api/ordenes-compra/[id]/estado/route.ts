import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const cambiarEstadoSchema = z.object({
  estado: z.enum(["PENDIENTE", "CANCELADA"]),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId } = await requirePermission(
    OPERATIONS.inventory.purchase_order.update,
    "execute",
    ["OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = cambiarEstadoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { estado } = parsed.data;

    const existing = await prisma.ordenCompra.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Orden de compra no encontrada" },
        { status: 404 }
      );
    }

    const transicionesValidas: Record<string, string[]> = {
      BORRADOR: ["PENDIENTE", "CANCELADA"],
      PENDIENTE: ["CANCELADA"],
    };

    const permitidas = transicionesValidas[existing.estado] || [];
    if (!permitidas.includes(estado)) {
      return NextResponse.json(
        {
          error: `No se puede cambiar de ${existing.estado} a ${estado}`,
        },
        { status: 400 }
      );
    }

    const oc = await prisma.ordenCompra.update({
      where: { id },
      data: {
        estado,
        aprobadoPor: estado === "PENDIENTE" ? userId : undefined,
      },
      include: {
        proveedor: { select: { id: true, nombre: true } },
        items: {
          include: {
            repuesto: { select: { id: true, nombre: true, codigo: true } },
          },
        },
      },
    });

    // Emit state change event
    eventBus.emit(
      OPERATIONS.inventory.purchase_order.update,
      "OrdenCompra",
      id,
      { estadoAnterior: existing.estado, estadoNuevo: estado },
      userId
    ).catch((err) => {
      console.error("Error emitting inventory.purchase_order.update event:", err);
    });

    return NextResponse.json(oc);
  } catch (error: unknown) {
    console.error("Error cambiando estado de orden de compra:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
