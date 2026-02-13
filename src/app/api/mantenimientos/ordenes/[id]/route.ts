import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/mantenimientos/ordenes/[id] — Detalle completo de OT
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

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
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'OPERADOR')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

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

    return NextResponse.json({ data: ordenActualizada });
  } catch (error: unknown) {
    console.error('Error updating orden:', error);
    return NextResponse.json(
      { error: 'Error al actualizar orden de trabajo', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
