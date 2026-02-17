import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/require-permission';
import { eventBus, OPERATIONS } from '@/lib/events';

// PUT — Actualización masiva de patentamiento
export async function PUT(req: NextRequest) {
  const { error, userId } = await requirePermission(
    OPERATIONS.fleet.moto.update_registration,
    "execute",
    ["OPERADOR"]
  );
  if (error) return error;

  try {
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

    // Emit event per affected moto
    for (const motoId of motoIds as string[]) {
      eventBus.emit(
        OPERATIONS.fleet.moto.update_registration,
        "Moto",
        motoId,
        { action: "bulk_update_patentamiento", estadoPatentamiento },
        userId
      ).catch((err) => {
        console.error("Error emitting fleet.moto.update_registration event:", err);
      });
    }

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
