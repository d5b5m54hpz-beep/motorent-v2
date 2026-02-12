import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PUT — Actualización masiva de seguro
export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const {
      motoIds,
      estadoSeguro,
      aseguradora,
      numeroPoliza,
      fechaInicioSeguro,
      fechaVencimientoSeguro
    } = await req.json();

    if (!motoIds?.length) {
      return NextResponse.json({ error: 'No se seleccionaron motos' }, { status: 400 });
    }

    if (!estadoSeguro) {
      return NextResponse.json({ error: 'Estado de seguro requerido' }, { status: 400 });
    }

    // Preparar datos según el estado
    const updateData: Record<string, unknown> = {
      estadoSeguro,
    };

    if (estadoSeguro === "EN_TRAMITE" || estadoSeguro === "ASEGURADA") {
      if (aseguradora) {
        updateData.aseguradora = aseguradora;
      }
    }

    if (estadoSeguro === "ASEGURADA") {
      if (numeroPoliza) {
        updateData.numeroPoliza = numeroPoliza;
      }
      if (fechaInicioSeguro) {
        updateData.fechaInicioSeguro = new Date(fechaInicioSeguro);
      }
      if (fechaVencimientoSeguro) {
        updateData.fechaVencimientoSeguro = new Date(fechaVencimientoSeguro);
      }
    }

    const result = await prisma.moto.updateMany({
      where: { id: { in: motoIds } },
      data: updateData,
    });

    return NextResponse.json({
      updated: result.count,
      message: `Se actualizó el seguro de ${result.count} moto(s).`
    });
  } catch (error: unknown) {
    console.error('Error bulk update seguro:', error);
    return NextResponse.json(
      { error: 'Error al actualizar seguro', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
