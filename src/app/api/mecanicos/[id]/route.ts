import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/mecanicos/[id] — Obtener detalle de un mecánico
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await context.params;

    const mecanico = await prisma.mecanico.findUnique({
      where: { id },
      include: {
        taller: true,
        _count: {
          select: {
            ordenesTrabajo: true,
          },
        },
      },
    });

    if (!mecanico) {
      return NextResponse.json({ error: 'Mecánico no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ data: mecanico });
  } catch (error: unknown) {
    console.error('Error fetching mecanico:', error);
    return NextResponse.json(
      { error: 'Error al obtener mecánico', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

// PUT /api/mecanicos/[id] — Actualizar mecánico
export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'OPERADOR')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json();

    const { nombre, telefono, email, especialidad, tallerId, activo, tarifaHora } = body;

    const mecanico = await prisma.mecanico.update({
      where: { id },
      data: {
        ...(nombre !== undefined && { nombre }),
        ...(telefono !== undefined && { telefono }),
        ...(email !== undefined && { email }),
        ...(especialidad !== undefined && { especialidad }),
        ...(tallerId !== undefined && { tallerId }),
        ...(activo !== undefined && { activo }),
        ...(tarifaHora !== undefined && { tarifaHora }),
      },
      include: {
        taller: true,
      },
    });

    return NextResponse.json({ data: mecanico });
  } catch (error: unknown) {
    console.error('Error updating mecanico:', error);
    return NextResponse.json(
      { error: 'Error al actualizar mecánico', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

// DELETE /api/mecanicos/[id] — Eliminar (soft delete) mecánico
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await context.params;

    // Soft delete: marcar como inactivo
    const mecanico = await prisma.mecanico.update({
      where: { id },
      data: { activo: false },
    });

    return NextResponse.json({ data: mecanico, message: 'Mecánico marcado como inactivo' });
  } catch (error: unknown) {
    console.error('Error deleting mecanico:', error);
    return NextResponse.json(
      { error: 'Error al eliminar mecánico', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
