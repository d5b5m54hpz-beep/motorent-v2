import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { eventBus, OPERATIONS } from '@/lib/events';
import { prisma } from '@/lib/prisma';
import { mecanicoSchema } from '@/lib/validations';
import { z } from 'zod';

// GET /api/mecanicos — Listar mecanicos (paginated)
export async function GET(req: NextRequest) {
  try {
    const { error } = await requirePermission(OPERATIONS.mechanic.view, "view", ["OPERADOR"]);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;
    const tallerId = searchParams.get('tallerId');
    const activo = searchParams.get('activo');

    const where: Record<string, unknown> = {};
    if (tallerId) where.tallerId = tallerId;
    if (activo !== null) where.activo = activo === 'true';

    const [data, total] = await Promise.all([
      prisma.mecanico.findMany({
        where,
        include: {
          taller: {
            select: {
              id: true,
              nombre: true,
              tipo: true,
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
      prisma.mecanico.count({ where }),
    ]);

    return NextResponse.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error: unknown) {
    console.error('Error fetching mecanicos:', error);
    return NextResponse.json(
      { error: 'Error al obtener mecanicos', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

// POST /api/mecanicos — Crear mecanico
export async function POST(req: NextRequest) {
  try {
    const { error, userId } = await requirePermission(OPERATIONS.mechanic.create, "create", ["OPERADOR"]);
    if (error) return error;

    const body = await req.json();
    const parsed = mecanicoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { nombre, telefono, email, especialidad, tallerId, tarifaHora } = parsed.data;

    const mecanico = await prisma.mecanico.create({
      data: {
        nombre,
        telefono,
        email,
        especialidad,
        tallerId,
        tarifaHora,
        activo: true,
      },
      include: {
        taller: true,
      },
    });

    eventBus.emit(OPERATIONS.mechanic.create, "Mecanico", mecanico.id, { nombre, telefono, email, especialidad, tallerId, tarifaHora }, userId).catch(err => console.error("Error emitting mechanic.create event:", err));

    return NextResponse.json({ data: mecanico }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating mecanico:', error);
    return NextResponse.json(
      { error: 'Error al crear mecanico', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
