import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// PATCH /api/mantenimientos/ordenes/[id]/tareas — Toggle tarea completada
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'OPERADOR')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

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

    return NextResponse.json({ data: tarea });
  } catch (error: unknown) {
    console.error('Error updating tarea:', error);
    return NextResponse.json(
      { error: 'Error al actualizar tarea', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
