import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/mantenimientos/check-out — Realizar check-out y cerrar OT
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'OPERADOR')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const {
      ordenTrabajoId,
      kmAlEgreso,
      observacionesMecanico,
      costoRepuestos,
      costoManoObra,
      costoOtros,
      problemaDetectado,
      descripcionProblema,
      requiereReparacion,
      costoACargoDel,
    } = body;

    if (!ordenTrabajoId || kmAlEgreso === undefined) {
      return NextResponse.json({ error: 'ordenTrabajoId y kmAlEgreso son requeridos' }, { status: 400 });
    }

    // 1. Obtener OT
    const orden = await prisma.ordenTrabajo.findUnique({
      where: { id: ordenTrabajoId },
      include: { moto: true, cita: true },
    });

    if (!orden) {
      return NextResponse.json({ error: 'Orden de trabajo no encontrada' }, { status: 404 });
    }

    // 2. Calcular costo total
    const costoTotal = (costoRepuestos || 0) + (costoManoObra || 0) + (costoOtros || 0);

    // 3. Actualizar OT
    await prisma.ordenTrabajo.update({
      where: { id: ordenTrabajoId },
      data: {
        kmAlEgreso,
        fechaEgreso: new Date(),
        fechaFinTrabajo: new Date(),
        observacionesMecanico,
        costoRepuestos: costoRepuestos || 0,
        costoManoObra: costoManoObra || 0,
        costoOtros: costoOtros || 0,
        costoTotal,
        costoACargoDel: costoACargoDel || 'EMPRESA',
        problemaDetectado: problemaDetectado || false,
        descripcionProblema,
        requiereReparacion: requiereReparacion || false,
        estado: 'COMPLETADA',
      },
    });

    // 4. Actualizar cita
    if (orden.cita) {
      await prisma.citaMantenimiento.update({
        where: { id: orden.cita.id },
        data: { estado: 'COMPLETADA' },
      });
    }

    // 5. Actualizar moto
    await prisma.moto.update({
      where: { id: orden.motoId },
      data: {
        estado: 'disponible',
        kmUltimoService: kmAlEgreso,
        fechaUltimoService: new Date(),
      },
    });

    // 6. Registrar historial
    await prisma.historialOT.create({
      data: {
        ordenTrabajoId,
        estadoAnterior: 'EN_EJECUCION',
        estadoNuevo: 'COMPLETADA',
        accion: 'Check-out',
        realizadoPor: session.user.id,
      },
    });

    return NextResponse.json({
      data: {
        ordenTrabajoId,
        costoTotal,
        mensaje: 'Check-out completado exitosamente',
      },
    });
  } catch (error: unknown) {
    console.error('Error en check-out:', error);
    return NextResponse.json(
      { error: 'Error al realizar check-out', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
