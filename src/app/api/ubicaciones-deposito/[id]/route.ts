import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { ubicacionDepositoSchema } from "@/lib/validations";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId } = await requirePermission(
    OPERATIONS.inventory.location.update,
    "execute",
    ["OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = ubicacionDepositoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { estante, fila, posicion, nombre, notas } = parsed.data;
    const codigo = `${estante}-${fila}-${posicion}`;

    const existing = await prisma.ubicacionDeposito.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Ubicación no encontrada" },
        { status: 404 }
      );
    }

    if (codigo !== existing.codigo) {
      const duplicado = await prisma.ubicacionDeposito.findUnique({
        where: { codigo },
      });

      if (duplicado) {
        return NextResponse.json(
          { error: "Ya existe una ubicación con ese código" },
          { status: 400 }
        );
      }
    }

    const ubicacion = await prisma.ubicacionDeposito.update({
      where: { id },
      data: {
        codigo,
        estante,
        fila,
        posicion,
        nombre,
        notas,
      },
    });

    // Emit location update event
    eventBus.emit(
      OPERATIONS.inventory.location.update,
      "UbicacionDeposito",
      id,
      { codigo, estante, fila, posicion, nombre },
      userId
    ).catch((err) => {
      console.error("Error emitting inventory.location.update event:", err);
    });

    return NextResponse.json(ubicacion);
  } catch (error: unknown) {
    console.error("Error updating ubicacion:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId } = await requirePermission(
    OPERATIONS.inventory.location.delete,
    "execute",
    ["OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;

  const ubicacion = await prisma.ubicacionDeposito.findUnique({
    where: { id },
  });

  if (!ubicacion) {
    return NextResponse.json(
      { error: "Ubicación no encontrada" },
      { status: 404 }
    );
  }

  const repuestosAsignados = await prisma.repuesto.count({
    where: { ubicacion: ubicacion.codigo },
  });

  if (repuestosAsignados > 0) {
    return NextResponse.json(
      {
        error: `No se puede eliminar. Hay ${repuestosAsignados} repuesto(s) asignado(s) a esta ubicación`,
      },
      { status: 400 }
    );
  }

  await prisma.ubicacionDeposito.delete({ where: { id } });

  // Emit location delete event
  eventBus.emit(
    OPERATIONS.inventory.location.delete,
    "UbicacionDeposito",
    id,
    { codigo: ubicacion.codigo },
    userId
  ).catch((err) => {
    console.error("Error emitting inventory.location.delete event:", err);
  });

  return NextResponse.json({ ok: true });
}
