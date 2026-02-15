import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// ─── POST: Finalizar recepción y actualizar stock ────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Verificar que existe la recepción
    const recepcion = await prisma.recepcionMercaderiaEmbarque.findUnique({
      where: { embarqueId: id },
      include: {
        items: {
          include: {
            repuesto: true,
          },
        },
        embarque: true,
      },
    });

    if (!recepcion) {
      return NextResponse.json(
        { error: "No existe recepción para este embarque" },
        { status: 404 }
      );
    }

    if (recepcion.fechaFinalizada) {
      return NextResponse.json(
        { error: "La recepción ya fue finalizada" },
        { status: 400 }
      );
    }

    // Verificar que todos los items fueron procesados
    const itemsPendientes = recepcion.items.filter(
      (i) => i.estadoItem === "PENDIENTE"
    );

    if (itemsPendientes.length > 0) {
      return NextResponse.json(
        {
          error: `Faltan procesar ${itemsPendientes.length} items. Todos los items deben ser procesados antes de finalizar.`,
          itemsPendientes: itemsPendientes.map((i) => ({
            id: i.id,
            repuesto: i.repuesto.nombre,
          })),
        },
        { status: 400 }
      );
    }

    // Finalizar recepción en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // 1. Actualizar stock de cada repuesto y crear movimientos
      for (const item of recepcion.items) {
        if (item.cantidadRecibida > 0) {
          // Obtener stock actual
          const repuesto = await tx.repuesto.findUnique({
            where: { id: item.repuestoId },
            select: { stock: true },
          });

          const stockAnterior = repuesto?.stock || 0;
          const stockNuevo = stockAnterior + item.cantidadRecibida;

          // Actualizar stock
          await tx.repuesto.update({
            where: { id: item.repuestoId },
            data: { stock: stockNuevo },
          });

          // Crear movimiento de stock
          await tx.movimientoStock.create({
            data: {
              repuestoId: item.repuestoId,
              tipo: "IMPORTACION",
              cantidad: item.cantidadRecibida,
              stockAnterior,
              stockNuevo,
              motivo: `Recepción embarque ${recepcion.embarque.referencia}`,
              usuario: session.user.email || "sistema",
              referencia: id,
            },
          });
        }

        // Si hay items rechazados, crear movimiento negativo (opcional)
        if (item.cantidadRechazada > 0) {
          await tx.movimientoStock.create({
            data: {
              repuestoId: item.repuestoId,
              tipo: "SALIDA_ROTURA",
              cantidad: -item.cantidadRechazada,
              stockAnterior: 0,
              stockNuevo: 0,
              motivo: `Items rechazados embarque ${recepcion.embarque.referencia}: ${item.motivoRechazo || "Sin especificar"}`,
              usuario: session.user.email || "sistema",
              referencia: id,
            },
          });
        }
      }

      // 2. Marcar recepción como finalizada
      const recepcionFinalizada = await tx.recepcionMercaderiaEmbarque.update({
        where: { id: recepcion.id },
        data: {
          fechaFinalizada: new Date(),
        },
      });

      // 3. Actualizar estado del embarque a ALMACENADO
      await tx.embarqueImportacion.update({
        where: { id },
        data: { estado: "ALMACENADO" },
      });

      return recepcionFinalizada;
    });

    // Obtener recepción completa con items actualizados
    const recepcionCompleta = await prisma.recepcionMercaderiaEmbarque.findUnique({
      where: { id: result.id },
      include: {
        items: {
          include: {
            repuesto: {
              select: {
                id: true,
                nombre: true,
                codigo: true,
                stock: true,
                ubicacion: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Recepción finalizada y stock actualizado correctamente",
      recepcion: recepcionCompleta,
      itemsProcesados: recepcion.items.length,
      stockActualizado: recepcion.items.reduce((sum, i) => sum + i.cantidadRecibida, 0),
    });
  } catch (error: unknown) {
    console.error("Error finalizando recepcion:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
