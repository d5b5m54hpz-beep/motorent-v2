import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Cron job: Sistema de notificaciones de mantenimiento
 * Se ejecuta diariamente a las 08:00 (configurado en vercel.json)
 *
 * Lógica:
 * - Busca citas programadas para los próximos 3 días sin notificar
 * - Marca citas como NOTIFICADA y crea alerta en sistema
 * - Busca citas vencidas (pasaron y no se completaron)
 */
export async function GET() {
  try {
    const now = new Date();
    const tresDiasDespues = new Date(now);
    tresDiasDespues.setDate(now.getDate() + 3);

    // 1. Notificar citas próximas (3 días)
    const citasProximas = await prisma.citaMantenimiento.findMany({
      where: {
        estado: 'PROGRAMADA',
        fechaProgramada: {
          gte: now,
          lte: tresDiasDespues,
        },
      },
      include: {
        moto: true,
        rider: true,
      },
    });

    let notificacionesCreadas = 0;

    for (const cita of citasProximas) {
      // Marcar cita como NOTIFICADA
      await prisma.citaMantenimiento.update({
        where: { id: cita.id },
        data: { estado: 'NOTIFICADA' },
      });

      // Crear alerta en sistema
      await prisma.alerta.create({
        data: {
          tipo: 'MANTENIMIENTO_PROXIMO',
          mensaje: `Mantenimiento próximo - ${cita.moto.patente}. Cita programada para ${new Date(cita.fechaProgramada).toLocaleDateString('es-AR')} - Rider: ${cita.rider?.nombre || 'N/A'}`,
          metadata: {
            citaId: cita.id,
            motoId: cita.motoId,
            riderId: cita.riderId,
            fechaProgramada: cita.fechaProgramada,
          },
          leida: false,
        },
      });

      notificacionesCreadas++;
    }

    // 2. Detectar citas vencidas (no asistieron)
    const citasVencidas = await prisma.citaMantenimiento.findMany({
      where: {
        estado: { in: ['PROGRAMADA', 'NOTIFICADA', 'CONFIRMADA'] },
        fechaProgramada: {
          lt: now,
        },
      },
      include: {
        moto: true,
        rider: true,
      },
    });

    let noAsistidos = 0;

    for (const cita of citasVencidas) {
      // Marcar como NO_ASISTIO
      await prisma.citaMantenimiento.update({
        where: { id: cita.id },
        data: { estado: 'NO_ASISTIO' },
      });

      // Descontar puntos al rider (solo si existe riderId)
      if (cita.riderId) {
        await prisma.cliente.update({
          where: { id: cita.riderId },
          data: {
            servicesNoAsistidos: { increment: 1 },
            puntajePromedio: { decrement: 5 }, // -5 puntos por no asistir
          },
        });
      }

      // Crear alerta ALTA prioridad
      await prisma.alerta.create({
        data: {
          tipo: 'MANTENIMIENTO_NO_ASISTIO',
          mensaje: `No asistió a mantenimiento - ${cita.moto.patente}. Rider ${cita.rider?.nombre || 'N/A'} no asistió a cita del ${new Date(cita.fechaProgramada).toLocaleDateString('es-AR')}. Programar nueva cita.`,
          metadata: {
            citaId: cita.id,
            motoId: cita.motoId,
            riderId: cita.riderId,
            fechaProgramada: cita.fechaProgramada,
          },
          leida: false,
        },
      });

      noAsistidos++;
    }

    // 3. Detectar motos que excedieron km sin service
    const motosActivas = await prisma.moto.findMany({
      where: {
        estado: { in: ['disponible', 'alquilada'] },
      },
    });

    let alertasKm = 0;

    for (const moto of motosActivas) {
      const kmDesdeUltimoService = moto.kmActual - moto.kmUltimoService;

      // Solo alertar si excedió 5000 km desde último service
      if (kmDesdeUltimoService < 5000) continue;

      await prisma.alerta.create({
        data: {
          tipo: 'MANTENIMIENTO_URGENTE',
          mensaje: `Mantenimiento urgente - ${moto.patente}. Moto tiene ${kmDesdeUltimoService} km desde último service. Programar mantenimiento inmediato.`,
          metadata: {
            motoId: moto.id,
            kmDesdeUltimoService,
            kmActual: moto.kmActual,
            kmUltimoService: moto.kmUltimoService,
          },
          leida: false,
        },
      });

      alertasKm++;
    }

    return NextResponse.json({
      success: true,
      notificacionesCreadas,
      noAsistidos,
      alertasKm,
    });
  } catch (error: unknown) {
    console.error('[CRON] Error en notificaciones:', error);
    return NextResponse.json(
      {
        error: 'Error al procesar notificaciones',
        details: error instanceof Error ? error.message : 'Unknown',
      },
      { status: 500 }
    );
  }
}
