import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ubicacionDepositoSchema } from "@/lib/validations";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

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
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

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

  return NextResponse.json({ ok: true });
}
