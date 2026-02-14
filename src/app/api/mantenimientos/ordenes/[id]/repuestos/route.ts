import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/mantenimientos/ordenes/[id]/repuestos — Listar repuestos de la OT
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const repuestos = await prisma.repuestoOrdenTrabajo.findMany({
      where: { ordenTrabajoId: id },
      include: {
        repuesto: {
          select: {
            id: true,
            nombre: true,
            codigo: true,
            unidad: true,
            stock: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ data: repuestos });
  } catch (error: unknown) {
    console.error('Error fetching repuestos OT:', error);
    return NextResponse.json(
      { error: 'Error al obtener repuestos', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

// POST /api/mantenimientos/ordenes/[id]/repuestos — Agregar repuesto con pricing inteligente
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'OPERADOR')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id: ordenTrabajoId } = await params;
    const body = await req.json();
    const { repuestoId, cantidadPlanificada, cantidadUsada } = body;

    if (!repuestoId || cantidadPlanificada === undefined) {
      return NextResponse.json(
        { error: 'repuestoId y cantidadPlanificada son requeridos' },
        { status: 400 }
      );
    }

    // 1. Obtener OT con rider
    const ordenTrabajo = await prisma.ordenTrabajo.findUnique({
      where: { id: ordenTrabajoId },
      include: { rider: true },
    });

    if (!ordenTrabajo) {
      return NextResponse.json({ error: 'Orden de trabajo no encontrada' }, { status: 404 });
    }

    // 2. Obtener repuesto
    const repuesto = await prisma.repuesto.findUnique({
      where: { id: repuestoId },
    });

    if (!repuesto) {
      return NextResponse.json({ error: 'Repuesto no encontrado' }, { status: 404 });
    }

    const cantidadFinal = cantidadUsada !== undefined ? cantidadUsada : cantidadPlanificada;

    // 3. Verificar stock disponible
    if (repuesto.stock < cantidadFinal) {
      return NextResponse.json(
        { error: `Stock insuficiente. Disponible: ${repuesto.stock}, Requerido: ${cantidadFinal}` },
        { status: 400 }
      );
    }

    // 4. 🔥 INTEGRACIÓN CON MOTOR DE PRICING 🔥
    // Si hay rider, usar pricing preferencial. Si no, usar lista interna.
    let precioUnitario = 0;
    let listaId: string | null = null;
    let descuentoAplicadoPct = 0;

    if (ordenTrabajo.riderId) {
      // Consultar motor de pricing con contexto del rider
      const pricingRes = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/pricing-repuestos/resolver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repuestoId,
          clienteId: ordenTrabajo.riderId,
          cantidad: cantidadFinal,
        }),
      });

      if (pricingRes.ok) {
        const pricingData = await pricingRes.json();
        precioUnitario = pricingData.precioFinal || 0;
        listaId = pricingData.listaUsada || null;
        descuentoAplicadoPct = pricingData.descuentoPorcentaje || 0;
      } else {
        // Fallback: usar precio base del repuesto
        precioUnitario = repuesto.precioVenta || 0;
      }
    } else {
      // Sin rider: usar lista interna (costo + margen mínimo)
      // Buscar lista "Uso Interno"
      const listaInterna = await prisma.listaPrecio.findFirst({
        where: { codigo: 'INTERNO' },
      });

      if (listaInterna) {
        const itemLista = await prisma.itemListaPrecio.findFirst({
          where: {
            listaPrecioId: listaInterna.id,
            repuestoId,
            cantidadMinima: { lte: 1 },
            vigenciaDesde: { lte: new Date() },
            OR: [
              { vigenciaHasta: null },
              { vigenciaHasta: { gt: new Date() } },
            ],
          },
          orderBy: [{ cantidadMinima: 'desc' }, { vigenciaDesde: 'desc' }],
        });

        precioUnitario = itemLista?.precioArs || repuesto.costoPromedioArs * 1.05;
        listaId = listaInterna.id;
      } else {
        // Fallback: costo + 5%
        precioUnitario = repuesto.costoPromedioArs * 1.05;
      }
    }

    // 5. Calcular margen
    const costoUnitario = repuesto.costoPromedioArs;
    const margenUnitario = precioUnitario > 0 ? (precioUnitario - costoUnitario) / precioUnitario : 0;

    // 6. Crear RepuestoOrdenTrabajo
    const repuestoOT = await prisma.repuestoOrdenTrabajo.create({
      data: {
        ordenTrabajoId,
        repuestoId,
        cantidadPlanificada,
        cantidadUsada: cantidadFinal,
        costoUnitario,
        costoTotal: cantidadFinal * costoUnitario,
        precioUnitario,
        precioTotal: cantidadFinal * precioUnitario,
        listaId,
        descuentoAplicadoPct,
        margenUnitario,
      },
      include: {
        repuesto: {
          select: {
            id: true,
            nombre: true,
            codigo: true,
            unidad: true,
          },
        },
      },
    });

    // 7. Descontar stock
    await prisma.repuesto.update({
      where: { id: repuestoId },
      data: { stock: { decrement: cantidadFinal } },
    });

    // 8. Registrar movimiento de inventario
    await prisma.movimientoStock.create({
      data: {
        repuestoId,
        tipo: 'SALIDA_CONSUMO_OT',
        cantidad: cantidadFinal,
        motivo: `Consumo en OT ${ordenTrabajo.numero}`,
        referencia: ordenTrabajoId,
        stockAnterior: repuesto.stock,
        stockNuevo: repuesto.stock - cantidadFinal,
      },
    });

    return NextResponse.json({ data: repuestoOT }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error adding repuesto to OT:', error);
    return NextResponse.json(
      { error: 'Error al agregar repuesto', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
