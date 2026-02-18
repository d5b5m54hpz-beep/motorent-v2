import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { eventBus, OPERATIONS } from '@/lib/events';
import { prisma } from '@/lib/prisma';
import { ordenMantenimientoSchema } from '@/lib/validations';
import { z } from 'zod';

// GET /api/mantenimientos/ordenes — Listar OTs con filtros (paginated)
export async function GET(req: NextRequest) {
  try {
    const { error } = await requirePermission(OPERATIONS.maintenance.workorder.view, "view", ["OPERADOR"]);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;
    const estado = searchParams.get('estado');
    const tipoOT = searchParams.get('tipo');
    const motoId = searchParams.get('motoId');
    const tallerId = searchParams.get('tallerId');

    const where: Record<string, unknown> = {};
    if (estado) where.estado = estado;
    if (tipoOT) where.tipoOT = tipoOT;
    if (motoId) where.motoId = motoId;
    if (tallerId) where.tallerId = tallerId;

    const [data, total] = await Promise.all([
      prisma.ordenTrabajo.findMany({
        where,
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
        skip,
        take: limit,
      }),
      prisma.ordenTrabajo.count({ where }),
    ]);

    return NextResponse.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
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
    const { error, userId } = await requirePermission(OPERATIONS.maintenance.workorder.create, "create", ["OPERADOR"]);
    if (error) return error;

    const body = await req.json();
    const parsed = ordenMantenimientoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { motoId, tipoOT, descripcion, kmAlIngreso } = parsed.data;

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

    eventBus.emit(OPERATIONS.maintenance.workorder.create, "OrdenTrabajo", orden.id, { motoId, tipoOT, descripcion, kmAlIngreso }, userId).catch(err => console.error("Error emitting maintenance.workorder.create event:", err));

    return NextResponse.json({ data: orden }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating orden:', error);
    return NextResponse.json(
      { error: 'Error al crear orden de trabajo', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
