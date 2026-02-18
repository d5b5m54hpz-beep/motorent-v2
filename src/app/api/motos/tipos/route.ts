import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/require-permission';
import { OPERATIONS } from '@/lib/events';
import { TipoMoto } from '@prisma/client';

// GET /api/motos/tipos — return unique tipos from database
export async function GET() {
  const { error } = await requirePermission(
    OPERATIONS.fleet.moto.view,
    "view",
    ["OPERADOR"]
  );
  if (error) return error;

  try {
    const motos = await prisma.moto.findMany({
      select: { tipo: true },
      distinct: ['tipo'],
      where: { tipo: { not: null } },
      orderBy: { tipo: 'asc' },
    });

    const tipos = motos.map((m) => m.tipo).filter((t): t is TipoMoto => t !== null);

    return NextResponse.json({ tipos });
  } catch (error: unknown) {
    console.error('Error fetching tipos:', error);
    return NextResponse.json({ error: 'Error al cargar tipos' }, { status: 500 });
  }
}
