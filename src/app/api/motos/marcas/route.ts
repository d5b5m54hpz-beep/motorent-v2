import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/motos/marcas — return unique marcas from database
export async function GET() {
  try {
    const motos = await prisma.moto.findMany({
      select: { marca: true },
      distinct: ['marca'],
      orderBy: { marca: 'asc' },
    });

    const marcas = motos.map((m) => m.marca);

    return NextResponse.json({ marcas });
  } catch (error: unknown) {
    console.error('Error fetching marcas:', error);
    return NextResponse.json({ error: 'Error al cargar marcas' }, { status: 500 });
  }
}
