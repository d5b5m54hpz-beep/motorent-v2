import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/mecanicos — Listar mecánicos
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

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
      { error: 'Error al obtener mecánicos', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

// POST /api/mecanicos — Crear mecánico
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'OPERADOR')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

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

    return NextResponse.json({ data: mecanico }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating mecanico:', error);
    return NextResponse.json(
      { error: 'Error al crear mecánico', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
