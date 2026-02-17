import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { eventBus, OPERATIONS } from '@/lib/events';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/mantenimientos/citas/[id] — Detalle de cita
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { error } = await requirePermission(OPERATIONS.maintenance.appointment.view, "view", ["OPERADOR"]);
    if (error) return error;

    const { id } = await context.params;

    const cita = await prisma.citaMantenimiento.findUnique({
      where: { id },
      include: {
        moto: true,
        rider: true,
        lugar: true,
        ordenTrabajo: true,
      },
    });

    if (!cita) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ data: cita });
  } catch (error: unknown) {
    console.error('Error fetching cita:', error);
    return NextResponse.json(
      { error: 'Error al obtener cita', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

// PUT /api/mantenimientos/citas/[id] — Actualizar cita (reprogramar, confirmar, etc.)
export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { error, userId } = await requirePermission(OPERATIONS.maintenance.appointment.update, "execute", ["OPERADOR"]);
    if (error) return error;

    const { id } = await context.params;
    const body = await req.json();

    const { accion, nuevaFecha, motivo } = body;

    let updateData: any = {};

    if (accion === 'reprogramar') {
      if (!nuevaFecha) {
        return NextResponse.json({ error: 'nuevaFecha es requerida para reprogramar' }, { status: 400 });
      }

      // Verificar límite de reprogramaciones
      const cita = await prisma.citaMantenimiento.findUnique({ where: { id } });
      if (!cita) {
        return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
      }

      if (cita.vecesReprogramada >= cita.maxReprogramaciones) {
        return NextResponse.json({ error: 'Límite de reprogramaciones alcanzado' }, { status: 400 });
      }

      updateData = {
        fechaProgramada: new Date(nuevaFecha),
        estado: 'REPROGRAMADA',
        vecesReprogramada: { increment: 1 },
        motivoReprogramacion: motivo || null,
      };
    } else if (accion === 'confirmar') {
      updateData = {
        estado: 'CONFIRMADA',
      };
    } else if (accion === 'no-asistio') {
      updateData = {
        estado: 'NO_ASISTIO',
        motivoInasistencia: motivo || null,
      };
    } else if (accion === 'cancelar') {
      updateData = {
        estado: 'CANCELADA',
      };
    } else {
      return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }

    const citaActualizada = await prisma.citaMantenimiento.update({
      where: { id },
      data: updateData,
      include: {
        moto: true,
        rider: true,
        lugar: true,
      },
    });

    eventBus.emit(OPERATIONS.maintenance.appointment.update, "CitaMantenimiento", id, { accion, nuevaFecha, motivo }, userId).catch(err => console.error("Error emitting maintenance.appointment.update event:", err));

    return NextResponse.json({ data: citaActualizada });
  } catch (error: unknown) {
    console.error('Error updating cita:', error);
    return NextResponse.json(
      { error: 'Error al actualizar cita', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
