import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/mantenimientos/planes — Listar planes con tareas
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

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
