import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { OPERATIONS } from '@/lib/events';
import { prisma } from '@/lib/prisma';

// GET /api/mantenimientos/planes/[planId]/repuestos — Resumen consolidado de repuestos del plan
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { error } = await requirePermission(OPERATIONS.maintenance.plan.view, "view", ["OPERADOR"]);
    if (error) return error;

    const { planId } = await params;

    const plan = await prisma.planMantenimiento.findUnique({
      where: { id: planId },
      include: {
        tareas: {
          orderBy: { orden: 'asc' },
          include: {
            repuestosTareaPlan: {
              include: {
                repuesto: {
                  select: {
                    id: true,
                    nombre: true,
                    codigo: true,
                    precioCompra: true,
                    stock: true,
                    stockMinimo: true,
                    unidad: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 });
    }

    // Consolidate repuestos across all tasks
    const consolidado: Record<string, {
      repuestoId: string;
      codigo: string;
      nombre: string;
      unidad: string | null;
      cantidadObligatoria: number;
      cantidadCondicional: number;
      cantidadTotal: number;
      costoUnitario: number;
      costoObligatorio: number;
      costoCondicional: number;
      stockActual: number;
      stockMinimo: number;
      tareas: Array<{ nombre: string; cantidad: number; obligatorio: boolean; observaciones: string | null }>;
    }> = {};

    for (const tarea of plan.tareas) {
      for (const rtp of tarea.repuestosTareaPlan) {
        const key = rtp.repuesto.id;
        if (!consolidado[key]) {
          consolidado[key] = {
            repuestoId: rtp.repuesto.id,
            codigo: rtp.repuesto.codigo || '',
            nombre: rtp.repuesto.nombre,
            unidad: rtp.repuesto.unidad || null,
            cantidadObligatoria: 0,
            cantidadCondicional: 0,
            cantidadTotal: 0,
            costoUnitario: Number(rtp.repuesto.precioCompra),
            costoObligatorio: 0,
            costoCondicional: 0,
            stockActual: rtp.repuesto.stock,
            stockMinimo: rtp.repuesto.stockMinimo,
            tareas: [],
          };
        }

        // Use tipoConsumo to determine if it's obligatorio (PLANIFICADO vs EMERGENCIA)
        const esObligatorio = rtp.tipoConsumo === 'PLANIFICADO';
        if (esObligatorio) {
          consolidado[key].cantidadObligatoria += rtp.cantidad;
        } else {
          consolidado[key].cantidadCondicional += rtp.cantidad;
        }
        consolidado[key].cantidadTotal += rtp.cantidad;

        consolidado[key].tareas.push({
          nombre: tarea.nombre,
          cantidad: rtp.cantidad,
          obligatorio: esObligatorio,
          observaciones: null, // Not available in RepuestoTareaPlan model
        });
      }
    }

    // Calculate costs
    const repuestos = Object.values(consolidado).map((r) => ({
      ...r,
      costoObligatorio: r.cantidadObligatoria * r.costoUnitario,
      costoCondicional: r.cantidadCondicional * r.costoUnitario,
    }));

    const costoObligatorioTotal = repuestos.reduce((sum, r) => sum + r.costoObligatorio, 0);
    const costoCondicionalTotal = repuestos.reduce((sum, r) => sum + r.costoCondicional, 0);

    return NextResponse.json({
      data: {
        planId: plan.id,
        planNombre: plan.nombre,
        tipo: plan.tipo,
        obligatorios: repuestos.filter((r) => r.cantidadObligatoria > 0),
        condicionales: repuestos.filter((r) => r.cantidadCondicional > 0 && r.cantidadObligatoria === 0),
        mixtos: repuestos.filter((r) => r.cantidadObligatoria > 0 && r.cantidadCondicional > 0),
        costoObligatorioTotal,
        costoCondicionalTotal,
        costoEstimadoTotal: costoObligatorioTotal + costoCondicionalTotal,
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching plan repuestos:', error);
    return NextResponse.json(
      { error: 'Error al obtener repuestos del plan', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
