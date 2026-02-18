import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { error, userId } = await requirePermission(
    OPERATIONS.rental.contract.exercise_purchase,
    "execute",
    ["OPERADOR"]
  );
  if (error) return error;

  try {
    const { id } = await context.params;

    // Verificar que el contrato existe
    const contrato = await prisma.contrato.findUnique({
      where: { id },
      include: {
        moto: true,
        cliente: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
    });

    if (!contrato) {
      return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
    }

    // Validar que es opción a compra
    if (!contrato.esOpcionCompra) {
      return NextResponse.json(
        { error: "El contrato no es opción a compra" },
        { status: 400 }
      );
    }

    // Validar que no se ha ejercido ya
    if (contrato.opcionEjercida) {
      return NextResponse.json(
        { error: "La opción ya fue ejercida anteriormente" },
        { status: 400 }
      );
    }

    // Validar que han pasado los meses mínimos
    const fechaInicio = new Date(contrato.fechaInicio);
    const ahora = new Date();
    const mesesTranscurridos = Math.floor(
      (ahora.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );

    if (mesesTranscurridos < (contrato.mesesParaCompra ?? 24)) {
      return NextResponse.json(
        {
          error: `Debe esperar ${contrato.mesesParaCompra ?? 24} meses para ejercer la opción. Han transcurrido ${mesesTranscurridos} meses.`,
        },
        { status: 400 }
      );
    }

    // Ejercer opción
    const contratoActualizado = await prisma.contrato.update({
      where: { id },
      data: {
        opcionEjercida: true,
        fechaEjercicio: ahora,
        estado: "FINALIZADO_COMPRA",
      },
    });

    // Actualizar estado de la moto
    await prisma.moto.update({
      where: { id: contrato.motoId },
      data: {
        estado: "BAJA",
        estadoLegal: "BAJA_DEFINITIVA",
      },
    });

    // Registrar en historial
    await prisma.historialEstadoMoto.create({
      data: {
        motoId: contrato.motoId,
        estadoAnterior: contrato.moto.estado,
        estadoNuevo: "BAJA",
        motivo: `VENTA POR OPCIÓN A COMPRA - Contrato ${id} - Cliente: ${contrato.cliente.user.name}`,
        usuarioId: userId || undefined,
      },
    });

    // Emit exercise purchase event
    eventBus.emit(
      OPERATIONS.rental.contract.exercise_purchase,
      "Contrato",
      id,
      { motoId: contrato.motoId, clienteId: contrato.clienteId, estadoAnterior: contrato.estado },
      userId
    ).catch((err) => {
      console.error("Error emitting rental.contract.exercise_purchase event:", err);
    });

    return NextResponse.json({
      data: contratoActualizado,
      mensaje: "Opción de compra ejercida exitosamente",
    });
  } catch (err: unknown) {
    console.error("Error ejerciendo opción de compra:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
