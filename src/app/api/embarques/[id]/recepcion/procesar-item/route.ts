import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const procesarItemSchema = z.object({
  itemRecepcionId: z.string(),
  cantidadRecibida: z.number().int().min(0),
  cantidadRechazada: z.number().int().min(0).default(0),
  cantidadFaltante: z.number().int().min(0).default(0),
  ubicacionAsignada: z.string().optional(),
  motivoRechazo: z.string().optional(),
  observaciones: z.string().optional(),
});

// ─── POST: Procesar un item individual de la recepción ───────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = procesarItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      itemRecepcionId,
      cantidadRecibida,
      cantidadRechazada,
      cantidadFaltante,
      ubicacionAsignada,
      motivoRechazo,
      observaciones,
    } = parsed.data;

    // Verificar que el item pertenece a este embarque
    const itemRecepcion = await prisma.recepcionItemEmbarque.findUnique({
      where: { id: itemRecepcionId },
      include: {
        recepcion: true,
        itemEmbarque: true,
      },
    });

    if (!itemRecepcion) {
      return NextResponse.json(
        { error: "Item de recepción no encontrado" },
        { status: 404 }
      );
    }

    if (itemRecepcion.recepcion.embarqueId !== id) {
      return NextResponse.json(
        { error: "El item no pertenece a este embarque" },
        { status: 400 }
      );
    }

    // Validar cantidades
    const cantidadEsperada = itemRecepcion.cantidadEsperada;
    const totalProcesado = cantidadRecibida + cantidadRechazada + cantidadFaltante;

    if (totalProcesado !== cantidadEsperada) {
      return NextResponse.json(
        {
          error: `Las cantidades no cuadran: esperado=${cantidadEsperada}, recibido+rechazado+faltante=${totalProcesado}`,
        },
        { status: 400 }
      );
    }

    // Determinar estado del item
    let estadoItem: "RECIBIDO_OK" | "RECIBIDO_PARCIAL" | "RECHAZADO_TOTAL" | "FALTANTE";
    if (cantidadFaltante === cantidadEsperada) {
      estadoItem = "FALTANTE";
    } else if (cantidadRechazada === cantidadEsperada) {
      estadoItem = "RECHAZADO_TOTAL";
    } else if (cantidadRecibida === cantidadEsperada) {
      estadoItem = "RECIBIDO_OK";
    } else {
      estadoItem = "RECIBIDO_PARCIAL";
    }

    // Actualizar item en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // Actualizar el item de recepción
      const itemActualizado = await tx.recepcionItemEmbarque.update({
        where: { id: itemRecepcionId },
        data: {
          cantidadRecibida,
          cantidadRechazada,
          cantidadFaltante,
          estadoItem,
          ubicacionAsignada,
          motivoRechazo,
          observaciones,
          procesadoPor: session.user.email,
          fechaProcesado: new Date(),
        },
        include: {
          repuesto: {
            select: {
              id: true,
              nombre: true,
              codigo: true,
              codigoFabricante: true,
            },
          },
        },
      });

      // Actualizar ubicación en Repuesto si se asignó
      if (ubicacionAsignada && cantidadRecibida > 0) {
        await tx.repuesto.update({
          where: { id: itemRecepcion.repuestoId },
          data: { ubicacion: ubicacionAsignada },
        });
      }

      // Actualizar contadores en el header de recepción
      const todosItems = await tx.recepcionItemEmbarque.findMany({
        where: { recepcionId: itemRecepcion.recepcionId },
      });

      const itemsRecibidos = todosItems.filter(
        (i) => i.estadoItem !== "PENDIENTE"
      ).length;

      const itemsRechazados = todosItems.filter(
        (i) => i.estadoItem === "RECHAZADO_TOTAL"
      ).length;

      await tx.recepcionMercaderiaEmbarque.update({
        where: { id: itemRecepcion.recepcionId },
        data: {
          totalItemsRecibidos: itemsRecibidos,
          totalItemsRechazados: itemsRechazados,
        },
      });

      return itemActualizado;
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Error processing item:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
