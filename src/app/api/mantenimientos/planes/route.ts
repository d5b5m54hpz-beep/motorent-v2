import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { OPERATIONS } from '@/lib/events';
import { prisma } from '@/lib/prisma';

// GET /api/mantenimientos/planes — Listar planes con tareas
export async function GET(req: NextRequest) {
  try {
    const { error } = await requirePermission(OPERATIONS.maintenance.plan.view, "view", ["OPERADOR"]);
    if (error) return error;

    const planes = await prisma.planMantenimiento.findMany({
      where: { activo: true },
      include: {
        tareas: {
          orderBy: { orden: 'asc' },
          include: {
            repuestoSugerido: {
              select: {
                id: true,
                nombre: true,
                codigo: true,
                precioCompra: true,
              },
            },
          },
        },
      },
      orderBy: { kmDesde: 'asc' },
    });

    return NextResponse.json({ data: planes });
  } catch (error: unknown) {
    console.error('Error fetching planes:', error);
    return NextResponse.json(
      { error: 'Error al obtener planes de mantenimiento', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
