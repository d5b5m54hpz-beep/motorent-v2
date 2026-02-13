import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/mantenimientos/check-in — Realizar check-in y crear OT
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'OPERADOR')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { codigoQR, kmActual, observacionesRecepcion } = body;

    if (!codigoQR || kmActual === undefined) {
      return NextResponse.json({ error: 'codigoQR y kmActual son requeridos' }, { status: 400 });
    }

    // 1. Buscar cita por código QR
    const cita = await prisma.citaMantenimiento.findUnique({
      where: { codigoQR },
      include: { moto: true },
    });

    if (!cita) {
      return NextResponse.json({ error: 'Cita no encontrada con ese código QR' }, { status: 404 });
    }

    if (cita.qrEscaneado) {
      return NextResponse.json({ error: 'QR ya fue escaneado anteriormente' }, { status: 400 });
    }

    // 2. Determinar tipo de service según km
    const kmDesdeUltimoService = kmActual - cita.moto.kmUltimoService;
    let tipoService: 'BASICO' | 'INTERMEDIO' | 'MAYOR' = 'BASICO';
    let planId: string | null = 'plan-basico';

    if (kmDesdeUltimoService >= 10000) {
      tipoService = 'MAYOR';
      planId = 'plan-mayor';
    } else if (kmDesdeUltimoService >= 5000) {
      tipoService = 'INTERMEDIO';
      planId = 'plan-intermedio';
    }

    // 3. Generar número de OT
    const lastOT = await prisma.ordenTrabajo.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { numero: true },
    });

    const year = new Date().getFullYear();
    const lastNum = lastOT?.numero.match(/OT-\d{4}-(\d{5})/)?.[1] || '00000';
    const nextNum = (parseInt(lastNum) + 1).toString().padStart(5, '0');
    const numero = `OT-${year}-${nextNum}`;

    // 4. Crear Orden de Trabajo
    const ordenTrabajo = await prisma.ordenTrabajo.create({
      data: {
        numero,
        motoId: cita.motoId,
        riderId: cita.riderId,
        tipoOT: 'PREVENTIVO',
        planId,
        tipoService,
        kmAlIngreso: kmActual,
        fechaIngreso: new Date(),
        estado: 'EN_EJECUCION',
        observacionesRecepcion,
        tallerId: cita.lugarId,
      },
    });

    // 5. Cargar tareas del plan
    const plan = await prisma.planMantenimiento.findUnique({
      where: { id: planId },
      include: { tareas: true },
    });

    if (plan) {
      for (const tarea of plan.tareas) {
        await prisma.tareaOrdenTrabajo.create({
          data: {
            ordenTrabajoId: ordenTrabajo.id,
            tareaPlanId: tarea.id,
            nombre: tarea.nombre,
            descripcion: tarea.descripcion,
            categoria: tarea.categoria,
            orden: tarea.orden,
            obligatoria: tarea.obligatoria,
          },
        });
      }
    }

    // 6. Actualizar cita
    await prisma.citaMantenimiento.update({
      where: { id: cita.id },
      data: {
        qrEscaneado: true,
        qrEscaneadoAt: new Date(),
        qrEscaneadoPor: session.user.id,
        estado: 'EN_PROCESO',
        ordenTrabajoId: ordenTrabajo.id,
      },
    });

    // 7. Actualizar estado de moto
    await prisma.moto.update({
      where: { id: cita.motoId },
      data: {
        estado: 'mantenimiento',
        kmActual,
      },
    });

    // 8. Registrar historial
    await prisma.historialOT.create({
      data: {
        ordenTrabajoId: ordenTrabajo.id,
        estadoNuevo: 'EN_EJECUCION',
        accion: 'Check-in',
        realizadoPor: session.user.id,
      },
    });

    return NextResponse.json({
      data: {
        ordenTrabajo,
        tipoService,
        mensaje: `Check-in completado. Tipo de service: ${tipoService}`,
      },
    });
  } catch (error: unknown) {
    console.error('Error en check-in:', error);
    return NextResponse.json(
      { error: 'Error al realizar check-in', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
