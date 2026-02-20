import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// POST /api/mantenimientos/[id]/cerrar
// Cierra la OT, descuenta stock de inventario, actualiza estado de moto
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { error, userId } = await requirePermission(
      OPERATIONS.maintenance.workorder.close,
      "execute",
      ["OPERADOR"]
    );
    if (error) return error;

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const kmAlEgreso = body.kmAlEgreso as number | undefined;

    const ot = await prisma.ordenTrabajo.findUnique({
      where: { id },
      include: {
        items: { include: { repuesto: true } },
        moto: { include: { contratos: { where: { estado: "ACTIVO" } } } },
      },
    });

    if (!ot) {
      return NextResponse.json({ error: "OT no encontrada" }, { status: 404 });
    }
    if (ot.estado === "COMPLETADA" || ot.estado === "CANCELADA") {
      return NextResponse.json({ error: "OT ya está cerrada" }, { status: 400 });
    }

    // ── Verificar stock suficiente antes de descontar ──
    const repuestosADescontar = ot.items.filter(
      (item) => item.tipo === "REPUESTO" && item.repuestoId
    );

    for (const item of repuestosADescontar) {
      const repuesto = await prisma.repuesto.findUnique({
        where: { id: item.repuestoId! },
      });
      if (!repuesto) continue;
      if (Number(repuesto.stock) < Number(item.cantidad)) {
        return NextResponse.json(
          {
            error: `Stock insuficiente para "${repuesto.nombre}". Stock disponible: ${repuesto.stock}, requerido: ${item.cantidad}`,
          },
          { status: 400 }
        );
      }
    }

    // ── Ejecutar en transacción ──
    await prisma.$transaction(async (tx) => {
      // 1. Descontar stock de cada repuesto usado
      for (const item of repuestosADescontar) {
        await tx.repuesto.update({
          where: { id: item.repuestoId! },
          data: {
            stock: {
              decrement: Number(item.cantidad),
            },
          },
        });
      }

      // 2. Calcular costo total final
      const costoTotal = ot.items.reduce(
        (acc, item) => acc + Number(item.subtotal),
        0
      );

      // 3. Cerrar la OT
      await tx.ordenTrabajo.update({
        where: { id },
        data: {
          estado: "COMPLETADA",
          fechaFinTrabajo: new Date(),
          costoTotal,
          ...(kmAlEgreso && typeof kmAlEgreso === "number" && kmAlEgreso > 0
            ? { kmAlEgreso }
            : {}),
        },
      });

      // 4. Actualizar km de la moto si se registró kmAlEgreso
      if (kmAlEgreso && typeof kmAlEgreso === "number" && kmAlEgreso > 0) {
        await tx.moto.update({
          where: { id: ot.motoId },
          data: { kilometraje: kmAlEgreso },
        });
      }

      // 5. Actualizar estado de la moto
      // Si tiene contrato activo → vuelve a ALQUILADA
      // Si no tiene contrato activo → vuelve a DISPONIBLE
      const tieneContratoActivo = ot.moto.contratos.length > 0;
      const nuevoEstadoMoto = tieneContratoActivo ? "ALQUILADA" : "DISPONIBLE";

      await tx.moto.update({
        where: { id: ot.motoId },
        data: { estado: nuevoEstadoMoto },
      });
    });

    eventBus
      .emit(OPERATIONS.maintenance.workorder.close, "OrdenTrabajo", id, { motoId: ot.motoId }, userId)
      .catch((err) => console.error("Error emitting workorder.close event:", err));

    return NextResponse.json({ ok: true, mensaje: "OT cerrada correctamente" });
  } catch (error: unknown) {
    console.error("Error cerrando OT:", error);
    return NextResponse.json(
      { error: "Error al cerrar orden de trabajo", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
