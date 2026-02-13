import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/talleres/[id] — Obtener detalle de un taller
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await context.params;

    const taller = await prisma.taller.findUnique({
      where: { id },
      include: {
        mecanicos: {
          orderBy: { nombre: 'asc' },
        },
        _count: {
          select: {
            citas: true,
            ordenesTrabajo: true,
          },
        },
      },
    });

    if (!taller) {
      return NextResponse.json({ error: 'Taller no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ data: taller });
  } catch (error: unknown) {
    console.error('Error fetching taller:', error);
    return NextResponse.json(
      { error: 'Error al obtener taller', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

// PUT /api/talleres/[id] — Actualizar taller
export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'OPERADOR')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json();

    const {
      nombre,
      direccion,
      telefono,
      email,
      tipo,
      activo,
      capacidadDiaria,
      horarioApertura,
      horarioCierre,
      diasOperacion,
    } = body;

    const taller = await prisma.taller.update({
      where: { id },
      data: {
        ...(nombre !== undefined && { nombre }),
        ...(direccion !== undefined && { direccion }),
        ...(telefono !== undefined && { telefono }),
        ...(email !== undefined && { email }),
        ...(tipo !== undefined && { tipo }),
        ...(activo !== undefined && { activo }),
        ...(capacidadDiaria !== undefined && { capacidadDiaria }),
        ...(horarioApertura !== undefined && { horarioApertura }),
        ...(horarioCierre !== undefined && { horarioCierre }),
        ...(diasOperacion !== undefined && { diasOperacion }),
      },
    });

    return NextResponse.json({ data: taller });
  } catch (error: unknown) {
    console.error('Error updating taller:', error);
    return NextResponse.json(
      { error: 'Error al actualizar taller', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

// DELETE /api/talleres/[id] — Eliminar (soft delete) taller
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await context.params;

    // Soft delete: marcar como inactivo
    const taller = await prisma.taller.update({
      where: { id },
      data: { activo: false },
    });

    return NextResponse.json({ data: taller, message: 'Taller marcado como inactivo' });
  } catch (error: unknown) {
    console.error('Error deleting taller:', error);
    return NextResponse.json(
      { error: 'Error al eliminar taller', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
