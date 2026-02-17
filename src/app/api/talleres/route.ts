import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { eventBus, OPERATIONS } from '@/lib/events';
import { prisma } from '@/lib/prisma';

// GET /api/talleres — Listar talleres
export async function GET(req: NextRequest) {
  try {
    const { error } = await requirePermission(OPERATIONS.workshop.view, "view", ["OPERADOR"]);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get('tipo');
    const activo = searchParams.get('activo');

    const talleres = await prisma.taller.findMany({
      where: {
        ...(tipo && { tipo: tipo as any }),
        ...(activo !== null && { activo: activo === 'true' }),
      },
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
    });

    return NextResponse.json({ data: talleres });
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
    const {
      nombre,
      direccion,
      telefono,
      email,
      tipo,
      capacidadDiaria,
      horarioApertura,
      horarioCierre,
      diasOperacion,
    } = body;

    if (!nombre || !tipo) {
      return NextResponse.json({ error: 'Nombre y tipo son requeridos' }, { status: 400 });
    }

    const taller = await prisma.taller.create({
      data: {
        nombre,
        direccion,
        telefono,
        email,
        tipo,
        capacidadDiaria: capacidadDiaria || 10,
        horarioApertura,
        horarioCierre,
        diasOperacion: diasOperacion || ['LUN', 'MAR', 'MIE', 'JUE', 'VIE'],
        activo: true,
      },
    });

    eventBus.emit(OPERATIONS.workshop.create, "Taller", taller.id, { nombre, direccion, telefono, email, tipo }, userId).catch(err => console.error("Error emitting workshop.create event:", err));

    return NextResponse.json({ data: taller }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating taller:', error);
    return NextResponse.json(
      { error: 'Error al crear taller', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
