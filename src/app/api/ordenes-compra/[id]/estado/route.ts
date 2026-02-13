import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const cambiarEstadoSchema = z.object({
  estado: z.enum(["PENDIENTE", "CANCELADA"]),
});

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
    const parsed = cambiarEstadoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { estado } = parsed.data;

    const existing = await prisma.ordenCompra.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Orden de compra no encontrada" },
        { status: 404 }
      );
    }

    const transicionesValidas: Record<string, string[]> = {
      BORRADOR: ["PENDIENTE", "CANCELADA"],
      PENDIENTE: ["CANCELADA"],
    };

    const permitidas = transicionesValidas[existing.estado] || [];
    if (!permitidas.includes(estado)) {
      return NextResponse.json(
        {
          error: `No se puede cambiar de ${existing.estado} a ${estado}`,
        },
        { status: 400 }
      );
    }

    const oc = await prisma.ordenCompra.update({
      where: { id },
      data: {
        estado,
        aprobadoPor: estado === "PENDIENTE" ? session.user.email : undefined,
      },
      include: {
        proveedor: { select: { id: true, nombre: true } },
        items: {
          include: {
            repuesto: { select: { id: true, nombre: true, codigo: true } },
          },
        },
      },
    });

    return NextResponse.json(oc);
  } catch (error: unknown) {
    console.error("Error cambiando estado de orden de compra:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
