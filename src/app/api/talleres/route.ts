import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { eventBus, OPERATIONS } from '@/lib/events';
import { prisma } from '@/lib/prisma';
import { tallerSchema } from '@/lib/validations';
import { z } from 'zod';

// GET /api/talleres — Listar talleres (paginated)
export async function GET(req: NextRequest) {
  try {
    const { error } = await requirePermission(OPERATIONS.workshop.view, "view", ["OPERADOR"]);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;
    const tipo = searchParams.get('tipo');
    const activo = searchParams.get('activo');

    const where: Record<string, unknown> = {};
    if (tipo) where.tipo = tipo;
    if (activo !== null) where.activo = activo === 'true';

    const [data, total] = await Promise.all([
      prisma.taller.findMany({
        where,
        include: {
          mecanicos: {
            where: { activo: true },
            select: {
              id: true,
              nombre: true,
              especialidad: true,
            },
          },
          _count: {
            select: {
              ordenesTrabajo: true,
            },
          },
        },
        orderBy: { nombre: 'asc' },
        skip,
        take: limit,
      }),
      prisma.taller.count({ where }),
    ]);

    return NextResponse.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error: unknown) {
    console.error('Error fetching talleres:', error);
    return NextResponse.json(
      { error: 'Error al obtener talleres', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

// POST /api/talleres — Crear taller
export async function POST(req: NextRequest) {
  try {
    const { error, userId } = await requirePermission(OPERATIONS.workshop.create, "create", ["OPERADOR"]);
    if (error) return error;

    const body = await req.json();
    const parsed = tallerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { nombre, direccion, telefono, email, tipo, capacidadDiaria, horarioApertura, horarioCierre, diasOperacion } = parsed.data;

    const taller = await prisma.taller.create({
      data: {
        nombre,
        direccion,
        telefono,
        email,
        tipo,
        capacidadDiaria,
        horarioApertura,
        horarioCierre,
        diasOperacion: diasOperacion || ['LUN', 'MAR', 'MIE', 'JUE', 'VIE'],
        activo: true,
      },
    });

    eventBus.emit(OPERATIONS.workshop.create, "Taller", taller.id, { nombre, direccion, telefono, email, tipo }, userId).catch(err => console.error("Error emitting workshop.create event:", err));

    return NextResponse.json({ data: taller }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating taller:', error);
    return NextResponse.json(
      { error: 'Error al crear taller', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
