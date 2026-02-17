import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { eventBus, OPERATIONS } from '@/lib/events';
import { prisma } from '@/lib/prisma';

// GET /api/mecanicos — Listar mecanicos
export async function GET(req: NextRequest) {
  try {
    const { error } = await requirePermission(OPERATIONS.mechanic.view, "view", ["OPERADOR"]);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const tallerId = searchParams.get('tallerId');
    const activo = searchParams.get('activo');

    const mecanicos = await prisma.mecanico.findMany({
      where: {
        ...(tallerId && { tallerId }),
        ...(activo !== null && { activo: activo === 'true' }),
      },
      include: {
        taller: {
          select: {
            id: true,
            nombre: true,
            tipo: true,
          },
        },
        _count: {
          select: {
            ordenesTrabajo: true,
          },
        },
      },
      orderBy: { nombre: 'asc' },
    });

    return NextResponse.json({ data: mecanicos });
  } catch (error: unknown) {
    console.error('Error fetching mecanicos:', error);
    return NextResponse.json(
      { error: 'Error al obtener mecanicos', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

// POST /api/mecanicos — Crear mecanico
export async function POST(req: NextRequest) {
  try {
    const { error, userId } = await requirePermission(OPERATIONS.mechanic.create, "create", ["OPERADOR"]);
    if (error) return error;

    const body = await req.json();
    const { nombre, telefono, email, especialidad, tallerId, tarifaHora } = body;

    if (!nombre || !tallerId) {
      return NextResponse.json({ error: 'Nombre y tallerId son requeridos' }, { status: 400 });
    }

    const mecanico = await prisma.mecanico.create({
      data: {
        nombre,
        telefono,
        email,
        especialidad,
        tallerId,
        tarifaHora,
        activo: true,
      },
      include: {
        taller: true,
      },
    });

    eventBus.emit(OPERATIONS.mechanic.create, "Mecanico", mecanico.id, { nombre, telefono, email, especialidad, tallerId, tarifaHora }, userId).catch(err => console.error("Error emitting mechanic.create event:", err));

    return NextResponse.json({ data: mecanico }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating mecanico:', error);
    return NextResponse.json(
      { error: 'Error al crear mecanico', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
