import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/require-permission';
import { OPERATIONS } from '@/lib/events';

// GET /api/motos/colores — return unique colores from database
export async function GET() {
  const { error } = await requirePermission(
    OPERATIONS.fleet.moto.view,
    "view",
    ["OPERADOR"]
  );
  if (error) return error;

  try {
    const motos = await prisma.moto.findMany({
      select: { color: true },
      distinct: ['color'],
      where: { color: { not: null } },
      orderBy: { color: 'asc' },
    });

    const colores = motos.map((m) => m.color).filter((c): c is string => c !== null);

    return NextResponse.json({ colores });
  } catch (error: unknown) {
    console.error('Error fetching colores:', error);
    return NextResponse.json({ error: 'Error al cargar colores' }, { status: 500 });
  }
}
