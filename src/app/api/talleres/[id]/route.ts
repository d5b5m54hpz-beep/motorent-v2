import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { eventBus, OPERATIONS } from '@/lib/events';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/talleres/[id] — Obtener detalle de un taller
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { error } = await requirePermission(OPERATIONS.workshop.view, "view", ["OPERADOR"]);
    if (error) return error;

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
    const { error, userId } = await requirePermission(OPERATIONS.workshop.update, "execute", ["OPERADOR"]);
    if (error) return error;

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

    eventBus.emit(OPERATIONS.workshop.update, "Taller", id, { nombre, direccion, telefono, email, tipo, activo }, userId).catch(err => console.error("Error emitting workshop.update event:", err));

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
    const { error, userId } = await requirePermission(OPERATIONS.workshop.update, "execute", ["OPERADOR"]);
    if (error) return error;

    const { id } = await context.params;

    // Soft delete: marcar como inactivo
    const taller = await prisma.taller.update({
      where: { id },
      data: { activo: false },
    });

    eventBus.emit(OPERATIONS.workshop.update, "Taller", id, { activo: false, action: "soft_delete" }, userId).catch(err => console.error("Error emitting workshop.update event:", err));

    return NextResponse.json({ data: taller, message: 'Taller marcado como inactivo' });
  } catch (error: unknown) {
    console.error('Error deleting taller:', error);
    return NextResponse.json(
      { error: 'Error al eliminar taller', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
