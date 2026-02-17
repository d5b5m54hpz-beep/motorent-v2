import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { eventBus, OPERATIONS } from '@/lib/events';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/mecanicos/[id] — Obtener detalle de un mecanico
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { error } = await requirePermission(OPERATIONS.mechanic.view, "view", ["OPERADOR"]);
    if (error) return error;

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
      return NextResponse.json({ error: 'Mecanico no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ data: mecanico });
  } catch (error: unknown) {
    console.error('Error fetching mecanico:', error);
    return NextResponse.json(
      { error: 'Error al obtener mecanico', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

// PUT /api/mecanicos/[id] — Actualizar mecanico
export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { error, userId } = await requirePermission(OPERATIONS.mechanic.update, "execute", ["OPERADOR"]);
    if (error) return error;

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

    eventBus.emit(OPERATIONS.mechanic.update, "Mecanico", id, { nombre, telefono, email, especialidad, tallerId, activo, tarifaHora }, userId).catch(err => console.error("Error emitting mechanic.update event:", err));

    return NextResponse.json({ data: mecanico });
  } catch (error: unknown) {
    console.error('Error updating mecanico:', error);
    return NextResponse.json(
      { error: 'Error al actualizar mecanico', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

// DELETE /api/mecanicos/[id] — Eliminar (soft delete) mecanico
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { error, userId } = await requirePermission(OPERATIONS.mechanic.update, "execute", ["OPERADOR"]);
    if (error) return error;

    const { id } = await context.params;

    // Soft delete: marcar como inactivo
    const mecanico = await prisma.mecanico.update({
      where: { id },
      data: { activo: false },
    });

    eventBus.emit(OPERATIONS.mechanic.update, "Mecanico", id, { activo: false, action: "soft_delete" }, userId).catch(err => console.error("Error emitting mechanic.update event:", err));

    return NextResponse.json({ data: mecanico, message: 'Mecanico marcado como inactivo' });
  } catch (error: unknown) {
    console.error('Error deleting mecanico:', error);
    return NextResponse.json(
      { error: 'Error al eliminar mecanico', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
