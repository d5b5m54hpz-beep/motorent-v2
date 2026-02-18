import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';

/**
 * Cron job: Generador automático de citas mensuales de mantenimiento
 * Se ejecuta el día 1 de cada mes a las 00:00 (configurado en vercel.json)
 *
 * Lógica:
 * - Busca todas las motos activas con fechaInicioOperaciones
 * - Calcula si cumple un mes desde la última cita o inicio de operaciones
 * - Crea cita para el día 15 del mes con estado PROGRAMADA
 */
export async function GET() {
  try {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Día 15 del mes actual
    const fechaProgramada = new Date(currentYear, currentMonth, 15);

    // Buscar motos activas con fecha de inicio
    const motos = await prisma.moto.findMany({
      where: {
        estado: { in: ['disponible', 'alquilada'] },
        fechaInicioOperaciones: { not: null },
      },
      include: {
        citasMantenimiento: {
          orderBy: { fechaProgramada: 'desc' },
          take: 1,
        },
        contratos: {
          where: { estado: { in: ['ACTIVO', 'EN_PROCESO'] } },
          take: 1,
          select: {
            clienteId: true,
          },
        },
      },
    });

    let citasCreadas = 0;

    for (const moto of motos) {
      // Si ya tiene cita para este mes, skip
      const ultimaCita = moto.citasMantenimiento[0];
      if (ultimaCita) {
        const ultimaCitaMonth = new Date(ultimaCita.fechaProgramada).getMonth();
        const ultimaCitaYear = new Date(ultimaCita.fechaProgramada).getFullYear();
        if (ultimaCitaMonth === currentMonth && ultimaCitaYear === currentYear) {
          continue;
        }
      }

      // Determinar rider (cliente activo o null)
      const riderId = moto.contratos[0]?.clienteId || null;

      if (!riderId) {
        // No crear cita si no hay rider asignado
        continue;
      }

      // Generar código QR único
      const codigoQR = `CITA-${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${nanoid(8)}`;

      // Crear cita
      await prisma.citaMantenimiento.create({
        data: {
          motoId: moto.id,
          riderId,
          fechaProgramada,
          fechaOriginal: fechaProgramada,
          codigoQR,
          estado: 'PROGRAMADA',
          lugarId: 'taller-central', // Default taller (ajustar según necesidad)
        },
      });

      // Actualizar proximoServiceFecha en moto
      await prisma.moto.update({
        where: { id: moto.id },
        data: { proximoServiceFecha: fechaProgramada },
      });

      citasCreadas++;
    }

    return NextResponse.json({
      success: true,
      citasCreadas,
      mes: `${currentMonth + 1}/${currentYear}`,
    });
  } catch (error: unknown) {
    console.error('[CRON] Error generando citas:', error);
    return NextResponse.json(
      {
        error: 'Error al generar citas',
        details: error instanceof Error ? error.message : 'Unknown',
      },
      { status: 500 }
    );
  }
}
