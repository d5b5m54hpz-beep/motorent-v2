import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { eventBus, OPERATIONS } from '@/lib/events';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/mantenimientos/ordenes/[id] — Detalle completo de OT
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { error } = await requirePermission(OPERATIONS.maintenance.workorder.view, "view", ["OPERADOR"]);
    if (error) return error;

    const { id } = await context.params;

    const orden = await prisma.ordenTrabajo.findUnique({
      where: { id },
      include: {
        moto: true,
        rider: true,
        taller: true,
        mecanico: true,
        plan: {
          include: {
            tareas: true,
          },
        },
        tareas: {
          orderBy: { orden: 'asc' },
        },
        repuestosUsados: {
          include: {
            repuesto: true,
          },
        },
        fotosCheckIn: true,
        fotosCheckOut: true,
        historial: {
          orderBy: { createdAt: 'desc' },
        },
        cita: true,
      },
    });

    if (!orden) {
      return NextResponse.json({ error: 'Orden de trabajo no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ data: orden });
  } catch (error: unknown) {
    console.error('Error fetching orden:', error);
    return NextResponse.json(
      { error: 'Error al obtener orden de trabajo', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

// PUT /api/mantenimientos/ordenes/[id] — Actualizar OT
export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const {
      estado,
      tallerId,
      mecanicoId,
      observacionesMecanico,
      observacionesRecepcion,
      costoRepuestos,
      costoManoObra,
      costoOtros,
      kmAlEgreso,
    } = body;

    // Detect state transitions to choose the right permission
    const estadoLower = typeof estado === 'string' ? estado.toLowerCase() : '';
    let permResult;

    if (estadoLower === 'completado' || estadoLower === 'completada') {
      // Completing a work order
      permResult = await requirePermission(OPERATIONS.maintenance.workorder.complete, "execute", ["OPERADOR"]);
    } else if (mecanicoId !== undefined) {
      // Assigning a mechanic
      permResult = await requirePermission(OPERATIONS.maintenance.workorder.assign, "execute", ["OPERADOR"]);
    } else {
      // General update
      permResult = await requirePermission(OPERATIONS.maintenance.workorder.update, "execute", ["OPERADOR"]);
    }

    if (permResult.error) return permResult.error;
    const userId = permResult.userId;

    const updateData: any = {};

    if (estado !== undefined) updateData.estado = estado;
    if (tallerId !== undefined) updateData.tallerId = tallerId;
    if (mecanicoId !== undefined) updateData.mecanicoId = mecanicoId;
    if (observacionesMecanico !== undefined) updateData.observacionesMecanico = observacionesMecanico;
    if (observacionesRecepcion !== undefined) updateData.observacionesRecepcion = observacionesRecepcion;
    if (costoRepuestos !== undefined) updateData.costoRepuestos = costoRepuestos;
    if (costoManoObra !== undefined) updateData.costoManoObra = costoManoObra;
    if (costoOtros !== undefined) updateData.costoOtros = costoOtros;
    if (kmAlEgreso !== undefined) updateData.kmAlEgreso = kmAlEgreso;

    // Calcular costo total si algún costo cambió
    if (costoRepuestos !== undefined || costoManoObra !== undefined || costoOtros !== undefined) {
      const ordenActual = await prisma.ordenTrabajo.findUnique({ where: { id } });
      if (ordenActual) {
        updateData.costoTotal =
          (costoRepuestos !== undefined ? costoRepuestos : ordenActual.costoRepuestos) +
          (costoManoObra !== undefined ? costoManoObra : ordenActual.costoManoObra) +
          (costoOtros !== undefined ? costoOtros : ordenActual.costoOtros);
      }
    }

    const ordenActualizada = await prisma.ordenTrabajo.update({
      where: { id },
      data: updateData,
    });

    // Emit the appropriate event based on transition type
    if (estadoLower === 'completado' || estadoLower === 'completada') {
      eventBus.emit(OPERATIONS.maintenance.workorder.complete, "OrdenTrabajo", id, { costoTotal: updateData.costoTotal, estado }, userId).catch(err => console.error("Error emitting maintenance.workorder.complete event:", err));
    } else if (mecanicoId !== undefined) {
      eventBus.emit(OPERATIONS.maintenance.workorder.assign, "OrdenTrabajo", id, { mecanicoId }, userId).catch(err => console.error("Error emitting maintenance.workorder.assign event:", err));
    } else {
      eventBus.emit(OPERATIONS.maintenance.workorder.update, "OrdenTrabajo", id, body, userId).catch(err => console.error("Error emitting maintenance.workorder.update event:", err));
    }

    return NextResponse.json({ data: ordenActualizada });
  } catch (error: unknown) {
    console.error('Error updating orden:', error);
    return NextResponse.json(
      { error: 'Error al actualizar orden de trabajo', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
