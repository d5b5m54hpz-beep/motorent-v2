import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { eventBus, OPERATIONS } from '@/lib/events';
import { prisma } from '@/lib/prisma';
import { citaMantenimientoSchema } from '@/lib/validations';
import { z } from 'zod';

// GET /api/mantenimientos/citas — Listar citas con filtros (paginated)
export async function GET(req: NextRequest) {
  try {
    const { error } = await requirePermission(OPERATIONS.maintenance.appointment.view, "view", ["OPERADOR"]);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;
    const estado = searchParams.get('estado');
    const motoId = searchParams.get('motoId');
    const tallerId = searchParams.get('tallerId');

    const where: Record<string, unknown> = {};
    if (estado) where.estado = estado;
    if (motoId) where.motoId = motoId;
    if (tallerId) where.lugarId = tallerId;

    const [data, total] = await Promise.all([
      prisma.citaMantenimiento.findMany({
        where,
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
        skip,
        take: limit,
      }),
      prisma.citaMantenimiento.count({ where }),
    ]);

    return NextResponse.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
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
    const parsed = citaMantenimientoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { motoId, riderId, fechaProgramada, lugarId } = parsed.data;

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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating cita:', error);
    return NextResponse.json(
      { error: 'Error al crear cita', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
