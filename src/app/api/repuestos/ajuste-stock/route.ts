import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { ajusteStockSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  const { error, userId } = await requirePermission(
    OPERATIONS.inventory.part.adjust_stock,
    "execute",
    ["OPERADOR"]
  );
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = ajusteStockSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { repuestoId, tipo, cantidad, motivo } = parsed.data;

    const repuesto = await prisma.repuesto.findUnique({
      where: { id: repuestoId },
    });

    if (!repuesto) {
      return NextResponse.json(
        { error: "Repuesto no encontrado" },
        { status: 404 }
      );
    }

    const isEntrada = tipo === "ENTRADA_AJUSTE";
    const isSalida = tipo === "SALIDA_AJUSTE" || tipo === "SALIDA_ROTURA";

    const stockAnterior = repuesto.stock;
    const diff = isEntrada ? cantidad : -cantidad;
    const stockNuevo = stockAnterior + diff;

    if (isSalida && stockNuevo < 0) {
      return NextResponse.json(
        { error: "Stock insuficiente para realizar la salida" },
        { status: 400 }
      );
    }

    const repuestoActualizado = await prisma.$transaction(async (tx) => {
      const updated = await tx.repuesto.update({
        where: { id: repuestoId },
        data: { stock: stockNuevo },
        include: {
          proveedor: { select: { id: true, nombre: true } },
        },
      });

      await tx.movimientoStock.create({
        data: {
          repuestoId,
          tipo,
          cantidad: diff,
          stockAnterior,
          stockNuevo,
          motivo,
          usuario: userId || undefined,
        },
      });

      return updated;
    });

    // Emit stock adjustment event
    eventBus.emit(
      OPERATIONS.inventory.part.adjust_stock,
      "Repuesto",
      repuestoId,
      { repuestoId, cantidadAnterior: stockAnterior, cantidadNueva: stockNuevo, motivo },
      userId
    ).catch((err) => {
      console.error("Error emitting inventory.part.adjust_stock event:", err);
    });

    return NextResponse.json(repuestoActualizado);
  } catch (error: unknown) {
    console.error("Error ajustando stock:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
