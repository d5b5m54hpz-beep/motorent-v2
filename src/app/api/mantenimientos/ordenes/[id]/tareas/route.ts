import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { eventBus, OPERATIONS } from '@/lib/events';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// PATCH /api/mantenimientos/ordenes/[id]/tareas — Toggle tarea completada
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { error, userId } = await requirePermission(OPERATIONS.maintenance.workorder.update, "execute", ["OPERADOR"]);
    if (error) return error;

    const { id } = await context.params;
    const body = await req.json();
    const { tareaId, completada } = body;

    if (!tareaId || completada === undefined) {
      return NextResponse.json({ error: 'tareaId y completada son requeridos' }, { status: 400 });
    }

    // Verify orden exists
    const orden = await prisma.ordenTrabajo.findUnique({
      where: { id },
    });

    if (!orden) {
      return NextResponse.json({ error: 'Orden de trabajo no encontrada' }, { status: 404 });
    }

    // Update tarea
    const tarea = await prisma.tareaOrdenTrabajo.update({
      where: { id: tareaId },
      data: {
        completada,
        completadaAt: completada ? new Date() : null,
      },
    });

    eventBus.emit(OPERATIONS.maintenance.workorder.update, "OrdenTrabajo", id, { tareaId, completada }, userId).catch(err => console.error("Error emitting maintenance.workorder.update event:", err));

    return NextResponse.json({ data: tarea });
  } catch (error: unknown) {
    console.error('Error updating tarea:', error);
    return NextResponse.json(
      { error: 'Error al actualizar tarea', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
