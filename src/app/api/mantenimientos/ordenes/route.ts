import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/mantenimientos/ordenes — Listar OTs con filtros
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const estado = searchParams.get('estado');
    const tipoOT = searchParams.get('tipo');
    const motoId = searchParams.get('motoId');
    const tallerId = searchParams.get('tallerId');

    const ordenes = await prisma.ordenTrabajo.findMany({
      where: {
        ...(estado && { estado: estado as any }),
        ...(tipoOT && { tipoOT: tipoOT as any }),
        ...(motoId && { motoId }),
        ...(tallerId && { tallerId }),
      },
      include: {
        moto: {
          select: {
            id: true,
            marca: true,
            modelo: true,
            patente: true,
          },
        },
        rider: {
          select: {
            id: true,
            nombre: true,
          },
        },
        taller: {
          select: {
            id: true,
            nombre: true,
          },
        },
        mecanico: {
          select: {
            id: true,
            nombre: true,
          },
        },
        plan: {
          select: {
            id: true,
            nombre: true,
            tipo: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ data: ordenes });
  } catch (error: unknown) {
    console.error('Error fetching ordenes:', error);
    return NextResponse.json(
      { error: 'Error al obtener órdenes de trabajo', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

// POST /api/mantenimientos/ordenes — Crear OT manual
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'OPERADOR')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { motoId, tipoOT, descripcion, kmAlIngreso } = body;

    if (!motoId || !tipoOT || kmAlIngreso === undefined) {
      return NextResponse.json({ error: 'motoId, tipoOT y kmAlIngreso son requeridos' }, { status: 400 });
    }

    // Generar número de OT
    const lastOT = await prisma.ordenTrabajo.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { numero: true },
    });

    const year = new Date().getFullYear();
    const lastNum = lastOT?.numero.match(/OT-\d{4}-(\d{5})/)?.[1] || '00000';
    const nextNum = (parseInt(lastNum) + 1).toString().padStart(5, '0');
    const numero = `OT-${year}-${nextNum}`;

    const orden = await prisma.ordenTrabajo.create({
      data: {
        numero,
        motoId,
        tipoOT,
        kmAlIngreso,
        descripcion,
        estado: 'SOLICITADA',
      },
      include: {
        moto: true,
      },
    });

    return NextResponse.json({ data: orden }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating orden:', error);
    return NextResponse.json(
      { error: 'Error al crear orden de trabajo', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
