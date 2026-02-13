import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { loteId } = body;

    if (!loteId) {
      return NextResponse.json(
        { error: "loteId es requerido" },
        { status: 400 }
      );
    }

    const lote = await prisma.loteCambioPrecio.findUnique({
      where: { id: loteId },
    });

    if (!lote) {
      return NextResponse.json(
        { error: "Lote no encontrado" },
        { status: 404 }
      );
    }

    if (!lote.aplicado) {
      return NextResponse.json(
        { error: "Este lote no ha sido aplicado aún" },
        { status: 400 }
      );
    }

    if (lote.revertido) {
      return NextResponse.json(
        { error: "Este lote ya fue revertido" },
        { status: 400 }
      );
    }

    // Obtener todos los cambios de este lote
    const historial = await prisma.historialPrecioRepuesto.findMany({
      where: { loteId },
    });

    if (historial.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron cambios para este lote" },
        { status: 404 }
      );
    }

    // Ejecutar rollback en transacción
    const resultado = await prisma.$transaction(async (tx) => {
      const rollbackLoteId = randomUUID();

      for (const hist of historial) {
        // Restaurar precio anterior en repuesto (solo si era lista B2C)
        if (!hist.listaPrecioId || hist.listaPrecioId === await getB2CListaId()) {
          await tx.repuesto.update({
            where: { id: hist.repuestoId },
            data: { precioVenta: hist.precioAnterior || 0 },
          });
        }

        // Crear registro de historial del rollback
        await tx.historialPrecioRepuesto.create({
          data: {
            repuestoId: hist.repuestoId,
            listaPrecioId: hist.listaPrecioId,
            precioAnterior: hist.precioNuevo,
            precioNuevo: hist.precioAnterior || 0,
            tipoCambio: "ROLLBACK",
            motivo: `Rollback de lote: ${lote.descripcion}`,
            loteId: rollbackLoteId,
            costoAlMomento: hist.costoAlMomento,
            usuario: session.user?.email || "sistema",
          },
        });
      }

      // Marcar lote original como revertido
      await tx.loteCambioPrecio.update({
        where: { id: loteId },
        data: {
          revertido: true,
          revertidoPor: rollbackLoteId,
        },
      });

      // Crear lote de rollback
      await tx.loteCambioPrecio.create({
        data: {
          id: rollbackLoteId,
          descripcion: `Rollback: ${lote.descripcion}`,
          tipo: "ROLLBACK",
          cantidadItems: historial.length,
          parametros: { loteOriginal: loteId },
          aplicado: true,
          usuario: session.user?.email || "sistema",
        },
      });

      return { rollbackLoteId, cantidadItems: historial.length };
    });

    return NextResponse.json({
      success: true,
      message: `Rollback completado: ${resultado.cantidadItems} precios restaurados`,
      rollbackLoteId: resultado.rollbackLoteId,
    });
  } catch (err: unknown) {
    console.error("Error en rollback:", err);
    return NextResponse.json(
      { error: "Error al hacer rollback" },
      { status: 500 }
    );
  }
}

async function getB2CListaId(): Promise<string | null> {
  const lista = await prisma.listaPrecio.findUnique({
    where: { codigo: "B2C" },
  });
  return lista?.id || null;
}
