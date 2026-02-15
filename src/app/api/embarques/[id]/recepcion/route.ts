import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

// ─── GET: Obtener estado de recepción de un embarque ─────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const recepcion = await prisma.recepcionMercaderiaEmbarque.findUnique({
      where: { embarqueId: id },
      include: {
        items: {
          include: {
            repuesto: {
              select: {
                id: true,
                nombre: true,
                codigo: true,
                codigoFabricante: true,
                ubicacion: true,
              },
            },
            itemEmbarque: {
              select: {
                cantidad: true,
                precioFobUnitarioUsd: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        usuario: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!recepcion) {
      return NextResponse.json(
        { error: "No existe recepción para este embarque" },
        { status: 404 }
      );
    }

    return NextResponse.json(recepcion);
  } catch (error: unknown) {
    console.error("Error fetching recepcion:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// ─── POST: Iniciar recepción de un embarque ──────────────────────────
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

    // Verificar que el embarque existe y está en estado RECIBIDO o COSTO_FINALIZADO
    const embarque = await prisma.embarqueImportacion.findUnique({
      where: { id },
      include: {
        items: {
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
        },
      },
    });

    if (!embarque) {
      return NextResponse.json({ error: "Embarque no encontrado" }, { status: 404 });
    }

    if (embarque.estado !== "RECIBIDO" && embarque.estado !== "COSTO_FINALIZADO") {
      return NextResponse.json(
        {
          error: `Solo se puede iniciar recepción de embarques en estado RECIBIDO o COSTO_FINALIZADO. Estado actual: ${embarque.estado}`,
        },
        { status: 400 }
      );
    }

    // Verificar si ya existe una recepción
    const recepcionExistente = await prisma.recepcionMercaderiaEmbarque.findUnique({
      where: { embarqueId: id },
    });

    if (recepcionExistente) {
      return NextResponse.json(
        { error: "Ya existe una recepción para este embarque" },
        { status: 400 }
      );
    }

    // Crear recepción en una transacción
    const recepcion = await prisma.$transaction(async (tx) => {
      // Crear header de recepción
      const nuevaRecepcion = await tx.recepcionMercaderiaEmbarque.create({
        data: {
          embarqueId: id,
          usuarioId: session.user.id,
          totalItemsEsperados: embarque.items.length,
          totalItemsRecibidos: 0,
          totalItemsRechazados: 0,
        },
      });

      // Crear items de recepción automáticamente (PENDIENTE por defecto)
      const itemsRecepcion = embarque.items.map((item) => ({
        recepcionId: nuevaRecepcion.id,
        itemEmbarqueId: item.id,
        repuestoId: item.repuestoId!,
        cantidadEsperada: item.cantidad,
        cantidadRecibida: 0,
        cantidadRechazada: 0,
        cantidadFaltante: 0,
        estadoItem: "PENDIENTE" as const,
      }));

      await tx.recepcionItemEmbarque.createMany({
        data: itemsRecepcion,
      });

      // Actualizar estado del embarque
      await tx.embarqueImportacion.update({
        where: { id },
        data: { estado: "EN_RECEPCION" },
      });

      return nuevaRecepcion;
    });

    // Obtener recepción completa con items
    const recepcionCompleta = await prisma.recepcionMercaderiaEmbarque.findUnique({
      where: { id: recepcion.id },
      include: {
        items: {
          include: {
            repuesto: {
              select: {
                id: true,
                nombre: true,
                codigo: true,
                codigoFabricante: true,
                ubicacion: true,
              },
            },
            itemEmbarque: {
              select: {
                cantidad: true,
                precioFobUnitarioUsd: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(recepcionCompleta, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating recepcion:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
