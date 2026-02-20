import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/require-permission';
import { OPERATIONS } from '@/lib/events';
import { TipoMoto } from '@prisma/client';

export async function GET() {
  const { error } = await requirePermission(
    OPERATIONS.fleet.moto.view,
    "view",
    ["OPERADOR"]
  );
  if (error) return error;

  try {
    const [marcas, modelos, colores, tipos, anos] = await Promise.all([
      prisma.moto.findMany({
        select: { marca: true },
        distinct: ['marca'],
        orderBy: { marca: 'asc' },
      }),
      prisma.moto.findMany({
        select: { modelo: true, marca: true },
        distinct: ['modelo'],
        orderBy: { modelo: 'asc' },
      }),
      prisma.moto.findMany({
        select: { color: true },
        distinct: ['color'],
        where: { color: { not: null } },
        orderBy: { color: 'asc' },
      }),
      prisma.moto.findMany({
        select: { tipo: true },
        distinct: ['tipo'],
        where: { tipo: { not: null } },
        orderBy: { tipo: 'asc' },
      }),
      prisma.moto.aggregate({
        _min: { anio: true },
        _max: { anio: true },
      }),
    ]);

    return NextResponse.json({
      marcas: marcas.map(m => m.marca),
      modelos: modelos.map(m => m.modelo), // Solo strings, no objetos
      colores: colores.map(c => c.color).filter((c): c is string => c !== null),
      tipos: tipos.map(t => t.tipo).filter((t): t is TipoMoto => t !== null),
      anioMin: anos._min.anio || 2020,
      anioMax: anos._max.anio || new Date().getFullYear(),
    });
  } catch (error: unknown) {
    console.error('Error getting filters:', error);
    return NextResponse.json(
      { error: 'Error al obtener filtros', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
