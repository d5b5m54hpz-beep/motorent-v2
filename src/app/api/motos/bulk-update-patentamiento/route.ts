import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PUT — Actualización masiva de patentamiento
export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { motoIds, estadoPatentamiento, fechaInicioTramitePatente, fechaPatentamiento } = await req.json();

    if (!motoIds?.length) {
      return NextResponse.json({ error: 'No se seleccionaron motos' }, { status: 400 });
    }

    if (!estadoPatentamiento) {
      return NextResponse.json({ error: 'Estado de patentamiento requerido' }, { status: 400 });
    }

    // Preparar datos según el estado
    const updateData: Record<string, unknown> = {
      estadoPatentamiento,
    };

    if (estadoPatentamiento === "EN_TRAMITE" || estadoPatentamiento === "PATENTADA") {
      if (fechaInicioTramitePatente) {
        updateData.fechaInicioTramitePatente = new Date(fechaInicioTramitePatente);
      }
    }

    if (estadoPatentamiento === "PATENTADA") {
      if (fechaPatentamiento) {
        updateData.fechaPatentamiento = new Date(fechaPatentamiento);
      }
    }

    const result = await prisma.moto.updateMany({
      where: { id: { in: motoIds } },
      data: updateData,
    });

    return NextResponse.json({
      updated: result.count,
      message: `Se actualizó el patentamiento de ${result.count} moto(s).`
    });
  } catch (error: unknown) {
    console.error('Error bulk update patentamiento:', error);
    return NextResponse.json(
      { error: 'Error al actualizar patentamiento', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
