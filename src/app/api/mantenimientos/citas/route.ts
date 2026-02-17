import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { eventBus, OPERATIONS } from '@/lib/events';
import { prisma } from '@/lib/prisma';

// GET /api/mantenimientos/citas — Listar citas con filtros
export async function GET(req: NextRequest) {
  try {
    const { error } = await requirePermission(OPERATIONS.maintenance.appointment.view, "view", ["OPERADOR"]);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const estado = searchParams.get('estado');
    const motoId = searchParams.get('motoId');
    const tallerId = searchParams.get('tallerId');

    const citas = await prisma.citaMantenimiento.findMany({
      where: {
        ...(estado && { estado: estado as any }),
        ...(motoId && { motoId }),
        ...(tallerId && { lugarId: tallerId }),
      },
      include: {
        moto: {
          select: {
            id: true,
            marca: true,
            modelo: true,
            patente: true,
          },
        },
        rider: {
          select: {
            id: true,
            nombre: true,
            telefono: true,
          },
        },
        lugar: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
      orderBy: { fechaProgramada: 'asc' },
    });

    return NextResponse.json({ data: citas });
  } catch (error: unknown) {
    console.error('Error fetching citas:', error);
    return NextResponse.json(
      { error: 'Error al obtener citas', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

// POST /api/mantenimientos/citas — Crear cita manual (admin)
export async function POST(req: NextRequest) {
  try {
    const { error, userId } = await requirePermission(OPERATIONS.maintenance.appointment.create, "create", ["OPERADOR"]);
    if (error) return error;

    const body = await req.json();
    const { motoId, riderId, fechaProgramada, lugarId } = body;

    if (!motoId || !fechaProgramada) {
      return NextResponse.json({ error: 'motoId y fechaProgramada son requeridos' }, { status: 400 });
    }

    const cita = await prisma.citaMantenimiento.create({
      data: {
        motoId,
        riderId,
        fechaProgramada: new Date(fechaProgramada),
        fechaOriginal: new Date(fechaProgramada),
        lugarId,
        estado: 'PROGRAMADA',
      },
      include: {
        moto: true,
        rider: true,
        lugar: true,
      },
    });

    eventBus.emit(OPERATIONS.maintenance.appointment.create, "CitaMantenimiento", cita.id, { motoId, riderId, fechaProgramada, lugarId }, userId).catch(err => console.error("Error emitting maintenance.appointment.create event:", err));

    return NextResponse.json({ data: cita }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating cita:', error);
    return NextResponse.json(
      { error: 'Error al crear cita', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
