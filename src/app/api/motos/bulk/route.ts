import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/require-permission';
import { eventBus, OPERATIONS } from '@/lib/events';

// PATCH — Actualización masiva (estado, imagen, etc.)
export async function PATCH(req: NextRequest) {
  const { error, userId } = await requirePermission(
    OPERATIONS.fleet.moto.bulk_update,
    "execute",
    ["OPERADOR"]
  );
  if (error) return error;

  try {
    const { ids, updates } = await req.json();

    if (!ids?.length) {
      return NextResponse.json({ error: 'No se seleccionaron motos' }, { status: 400 });
    }

    const result = await prisma.moto.updateMany({
      where: { id: { in: ids } },
      data: updates,
    });

    // Emit event per affected moto
    for (const motoId of ids as string[]) {
      eventBus.emit(
        OPERATIONS.fleet.moto.bulk_update,
        "Moto",
        motoId,
        { action: "bulk_update", updates },
        userId
      ).catch((err) => {
        console.error("Error emitting fleet.moto.bulk_update event:", err);
      });
    }

    return NextResponse.json({
      updated: result.count,
      message: `Se actualizaron ${result.count} motos.`
    });
  } catch (error: unknown) {
    console.error('Error bulk update motos:', error);
    return NextResponse.json(
      { error: 'Error al actualizar motos', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

// DELETE — Eliminación masiva
export async function DELETE(req: NextRequest) {
  const { error, userId } = await requirePermission(
    OPERATIONS.fleet.moto.decommission,
    "execute"
  );
  if (error) return error;

  try {
    const { ids } = await req.json();

    if (!ids?.length) {
      return NextResponse.json({ error: 'No se seleccionaron motos' }, { status: 400 });
    }

    // Verificar cuáles tienen contratos
    const motosConContratos = await prisma.contrato.findMany({
      where: { motoId: { in: ids } },
      select: { motoId: true },
      distinct: ['motoId'],
    });

    const idsConContratos = motosConContratos.map(c => c.motoId);
    const idsSinContratos = ids.filter((id: string) => !idsConContratos.includes(id));

    // Eliminar las que no tienen contratos
    let deleted = 0;
    if (idsSinContratos.length > 0) {
      // Eliminar órdenes de trabajo asociadas primero
      await prisma.ordenTrabajo.deleteMany({
        where: { motoId: { in: idsSinContratos } },
      }).catch(() => {}); // Ignorar si no existe la tabla

      const result = await prisma.moto.deleteMany({
        where: { id: { in: idsSinContratos } },
      });
      deleted = result.count;

      // Emit event per deleted moto
      for (const motoId of idsSinContratos as string[]) {
        eventBus.emit(
          OPERATIONS.fleet.moto.decommission,
          "Moto",
          motoId,
          { action: "bulk_delete" },
          userId
        ).catch((err) => {
          console.error("Error emitting fleet.moto.decommission event:", err);
        });
      }
    }

    return NextResponse.json({
      deleted,
      skipped: idsConContratos.length,
      skippedIds: idsConContratos,
      message: idsConContratos.length > 0
        ? `Se eliminaron ${deleted} motos. ${idsConContratos.length} no se pudieron eliminar por tener contratos asociados.`
        : `Se eliminaron ${deleted} motos.`,
    });
  } catch (error: unknown) {
    console.error('Error bulk delete motos:', error);
    return NextResponse.json(
      { error: 'Error al eliminar motos', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
