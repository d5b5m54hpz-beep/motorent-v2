import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH — Actualización masiva (estado, imagen, etc.)
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { ids, updates } = await req.json();

    if (!ids?.length) {
      return NextResponse.json({ error: 'No se seleccionaron motos' }, { status: 400 });
    }

    const result = await prisma.moto.updateMany({
      where: { id: { in: ids } },
      data: updates,
    });

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
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

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
