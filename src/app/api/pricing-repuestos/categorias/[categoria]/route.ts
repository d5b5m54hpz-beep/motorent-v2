import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ categoria: string }> }
) {
  const { error } = await requirePermission(OPERATIONS.pricing.parts.category.view, "view", ["OPERADOR"]);
  if (error) return error;

  const { categoria } = await params;

  try {
    const body = await req.json();
    const { margenObjetivo, margenMinimo, markupDefault, arancelImpo } = body;

    const updated = await prisma.categoriaRepuestoConfig.update({
      where: { categoria },
      data: {
        margenObjetivo: margenObjetivo !== undefined ? margenObjetivo : undefined,
        margenMinimo: margenMinimo !== undefined ? margenMinimo : undefined,
        markupDefault: markupDefault !== undefined ? markupDefault : undefined,
        arancelImpo: arancelImpo !== undefined ? arancelImpo : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error("Error updating categoria:", err);
    return NextResponse.json(
      { error: "Error al actualizar categoría" },
      { status: 500 }
    );
  }
}
