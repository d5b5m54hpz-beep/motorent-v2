import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/require-permission';
import { OPERATIONS } from '@/lib/events';

// GET /api/motos/marcas — return unique marcas from database
export async function GET() {
  const { error } = await requirePermission(
    OPERATIONS.fleet.moto.view,
    "view",
    ["OPERADOR"]
  );
  if (error) return error;

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
