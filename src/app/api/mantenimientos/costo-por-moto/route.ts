import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { OPERATIONS } from '@/lib/events';
import { prisma } from '@/lib/prisma';

// GET /api/mantenimientos/costo-por-moto — Cost per motorcycle analysis
export async function GET(req: NextRequest) {
  try {
    const { error } = await requirePermission(OPERATIONS.maintenance.workorder.view, "view", ["OPERADOR", "CONTADOR"]);
    if (error) return error;

    const searchParams = req.nextUrl.searchParams;
    const motoId = searchParams.get('motoId');

    const whereClause = motoId ? { id: motoId } : { estado: { not: 'baja' } };

    const motos = await prisma.moto.findMany({
      where: whereClause,
      select: {
        id: true,
        patente: true,
        marca: true,
        modelo: true,
        kmActual: true,
        estado: true,
        precioMensual: true,
        createdAt: true,
        ordenesTrabajoMoto: {
          where: { estado: 'COMPLETADA' },
          select: {
            costoRepuestos: true,
            costoManoObra: true,
            costoOtros: true,
            costoTotal: true,
            tipoService: true,
            fechaEgreso: true,
          },
        },
        contratos: {
          where: { estado: { in: ['activo', 'completado'] } },
          select: {
            montoPeriodo: true,
            fechaInicio: true,
            fechaFin: true,
          },
        },
      },
      orderBy: { patente: 'asc' },
    });

    const resultado = motos.map((moto) => {
      const ots = moto.ordenesTrabajoMoto;
      const totalOTs = ots.length;
      const costoTotalRepuestos = ots.reduce((s, ot) => s + Number(ot.costoRepuestos), 0);
      const costoTotalManoObra = ots.reduce((s, ot) => s + Number(ot.costoManoObra), 0);
      const costoTotalOtros = ots.reduce((s, ot) => s + Number(ot.costoOtros), 0);
      const costoTotal = ots.reduce((s, ot) => s + Number(ot.costoTotal), 0);

      // Cost per km
      const kmActual = moto.kmActual || 0;
      const costoPorKm = kmActual > 0 ? Math.round((costoTotal / kmActual) * 100) / 100 : 0;

      // Monthly rental income: prefer contract montoPeriodo, fallback to moto.precioMensual
      const ingresosMensuales = moto.contratos.length > 0
        ? moto.contratos.reduce((s, c) => s + (Number(c.montoPeriodo) || 0), 0) / moto.contratos.length
        : Number(moto.precioMensual) || 0;
      const ingresoAlquilerMensual = Math.round(ingresosMensuales);

      // Monthly maintenance cost (spread over months since creation)
      const mesesOperacion = Math.max(
        1,
        Math.round(
          (Date.now() - new Date(moto.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
        )
      );
      const costoMantenimientoMensual = Math.round(costoTotal / mesesOperacion);

      // Profitability
      const porcentajeCostoVsIngreso = ingresoAlquilerMensual > 0
        ? Math.round((costoMantenimientoMensual / ingresoAlquilerMensual) * 100 * 10) / 10
        : 0;
      const rentabilidadNeta = ingresoAlquilerMensual - costoMantenimientoMensual;

      // Breakdown by service type
      const porTipo: Record<string, { count: number; costo: number }> = {};
      for (const ot of ots) {
        const tipo = ot.tipoService || 'OTRO';
        if (!porTipo[tipo]) porTipo[tipo] = { count: 0, costo: 0 };
        porTipo[tipo].count++;
        porTipo[tipo].costo += Number(ot.costoTotal);
      }

      return {
        motoId: moto.id,
        patente: moto.patente,
        marca: moto.marca,
        modelo: moto.modelo,
        estado: moto.estado,
        kmActual,
        totalOTs,
        costoTotalRepuestos,
        costoTotalManoObra,
        costoTotalOtros,
        costoTotal,
        costoPorKm,
        ingresoAlquilerMensual,
        costoMantenimientoMensual,
        porcentajeCostoVsIngreso,
        rentabilidadNeta,
        mesesOperacion,
        desglosePorTipo: porTipo,
      };
    });

    // Fleet summary
    const resumenFlota = {
      totalMotos: resultado.length,
      costoTotalFlota: resultado.reduce((s, r) => s + r.costoTotal, 0),
      costoPromedioMensual: Math.round(
        resultado.reduce((s, r) => s + r.costoMantenimientoMensual, 0) / Math.max(1, resultado.length)
      ),
      costoPorKmPromedio: resultado.length > 0
        ? Math.round(
            (resultado.reduce((s, r) => s + r.costoPorKm, 0) / resultado.length) * 100
          ) / 100
        : 0,
    };

    return NextResponse.json({
      data: {
        resumenFlota,
        motos: resultado,
      },
    });
  } catch (error: unknown) {
    console.error('Error calculating cost per moto:', error);
    return NextResponse.json(
      { error: 'Error al calcular costo por moto', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
