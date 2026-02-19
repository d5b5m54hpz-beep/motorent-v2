import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { eventBus, OPERATIONS } from '@/lib/events';
import { prisma } from '@/lib/prisma';

// PUT /api/mantenimientos/ordenes/[id]/repuestos/[repuestoOTId] — Actualizar cantidad usada
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; repuestoOTId: string }> }
) {
  try {
    const { error, userId } = await requirePermission(OPERATIONS.maintenance.workorder.update, "execute", ["OPERADOR"]);
    if (error) return error;

    const { id, repuestoOTId } = await params;
    const body = await req.json();
    const { cantidadUsada } = body;

    if (cantidadUsada === undefined || cantidadUsada < 0) {
      return NextResponse.json({ error: 'cantidadUsada inválida' }, { status: 400 });
    }

    // 1. Obtener el repuesto actual
    const repuestoOT = await prisma.repuestoOrdenTrabajo.findUnique({
      where: { id: repuestoOTId },
      include: { repuesto: true },
    });

    if (!repuestoOT) {
      return NextResponse.json({ error: 'Repuesto no encontrado en la OT' }, { status: 404 });
    }

    // 2. Calcular diferencia de stock
    const diferenciaStock = cantidadUsada - Number(repuestoOT.cantidadUsada);

    // 3. Verificar stock si la cantidad aumenta
    if (diferenciaStock > 0 && repuestoOT.repuesto.stock < diferenciaStock) {
      return NextResponse.json(
        { error: `Stock insuficiente. Disponible: ${repuestoOT.repuesto.stock}` },
        { status: 400 }
      );
    }

    // 4. Actualizar repuesto OT con nuevos totales
    const updated = await prisma.repuestoOrdenTrabajo.update({
      where: { id: repuestoOTId },
      data: {
        cantidadUsada,
        costoTotal: cantidadUsada * Number(repuestoOT.costoUnitario),
        precioTotal: cantidadUsada * Number(repuestoOT.precioUnitario),
      },
      include: {
        repuesto: {
          select: {
            id: true,
            nombre: true,
            codigo: true,
            unidad: true,
          },
        },
      },
    });

    // 5. Ajustar stock del repuesto
    if (diferenciaStock !== 0) {
      await prisma.repuesto.update({
        where: { id: repuestoOT.repuestoId },
        data: { stock: { increment: -diferenciaStock } },
      });

      // 6. Registrar movimiento si hay cambio
      await prisma.movimientoStock.create({
        data: {
          repuestoId: repuestoOT.repuestoId,
          tipo: diferenciaStock > 0 ? 'SALIDA_CONSUMO_OT' : 'ENTRADA_DEVOLUCION',
          cantidad: Math.abs(diferenciaStock),
          motivo: `Ajuste cantidad en OT`,
          referencia: repuestoOT.ordenTrabajoId,
          stockAnterior: repuestoOT.repuesto.stock,
          stockNuevo: repuestoOT.repuesto.stock - diferenciaStock,
        },
      });
    }

    eventBus.emit(OPERATIONS.maintenance.workorder.update, "OrdenTrabajo", id, { repuestoOTId, cantidadUsada, diferenciaStock }, userId).catch(err => console.error("Error emitting maintenance.workorder.update event:", err));

    return NextResponse.json({ data: updated });
  } catch (error: unknown) {
    console.error('Error updating repuesto OT:', error);
    return NextResponse.json(
      { error: 'Error al actualizar repuesto', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

// DELETE /api/mantenimientos/ordenes/[id]/repuestos/[repuestoOTId] — Remover repuesto de OT
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; repuestoOTId: string }> }
) {
  try {
    const { error, userId } = await requirePermission(OPERATIONS.maintenance.workorder.update, "execute", ["OPERADOR"]);
    if (error) return error;

    const { id, repuestoOTId } = await params;

    // 1. Obtener el repuesto
    const repuestoOT = await prisma.repuestoOrdenTrabajo.findUnique({
      where: { id: repuestoOTId },
      include: { repuesto: true, ordenTrabajo: true },
    });

    if (!repuestoOT) {
      return NextResponse.json({ error: 'Repuesto no encontrado en la OT' }, { status: 404 });
    }

    // 2. Devolver stock
    await prisma.repuesto.update({
      where: { id: repuestoOT.repuestoId },
      data: { stock: { increment: Number(repuestoOT.cantidadUsada) } },
    });

    // 3. Registrar movimiento
    await prisma.movimientoStock.create({
      data: {
        repuestoId: repuestoOT.repuestoId,
        tipo: 'ENTRADA_DEVOLUCION',
        cantidad: Number(repuestoOT.cantidadUsada),
        motivo: `Devolución por eliminación de OT ${repuestoOT.ordenTrabajo.numero}`,
        referencia: repuestoOT.ordenTrabajoId,
        stockAnterior: repuestoOT.repuesto.stock,
        stockNuevo: repuestoOT.repuesto.stock + Number(repuestoOT.cantidadUsada),
      },
    });

    // 4. Eliminar repuesto de la OT
    await prisma.repuestoOrdenTrabajo.delete({
      where: { id: repuestoOTId },
    });

    eventBus.emit(OPERATIONS.maintenance.workorder.update, "OrdenTrabajo", id, { repuestoOTId, action: "delete", repuestoId: repuestoOT.repuestoId }, userId).catch(err => console.error("Error emitting maintenance.workorder.update event:", err));

    return NextResponse.json({ ok: true, mensaje: 'Repuesto eliminado y stock devuelto' });
  } catch (error: unknown) {
    console.error('Error deleting repuesto OT:', error);
    return NextResponse.json(
      { error: 'Error al eliminar repuesto', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
