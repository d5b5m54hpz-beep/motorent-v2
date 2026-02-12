import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/motos/tipos — return unique tipos from database
export async function GET() {
  try {
    const motos = await prisma.moto.findMany({
      select: { tipo: true },
      distinct: ['tipo'],
      where: { tipo: { not: null } },
      orderBy: { tipo: 'asc' },
    });

    const tipos = motos.map((m) => m.tipo).filter((t): t is string => t !== null);

    return NextResponse.json({ tipos });
  } catch (error: unknown) {
    console.error('Error fetching tipos:', error);
    return NextResponse.json({ error: 'Error al cargar tipos' }, { status: 500 });
  }
}
